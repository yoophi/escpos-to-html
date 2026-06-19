use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use chrono::Utc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{oneshot, Mutex};
use uuid::Uuid;

use crate::application::ports::ReceiptEventPublisher;
use crate::domain::{
    ReceiptCompleteReason, ReceivedReceipt, TcpClientInfo, TcpServerConfig, TcpServerStatus,
};

#[derive(Clone)]
pub struct TcpReceiptServerState {
    inner: Arc<Mutex<TcpReceiptServerInner>>,
}

struct TcpReceiptServerInner {
    status: TcpServerStatus,
    stop_tx: Option<oneshot::Sender<()>>,
}

impl Default for TcpReceiptServerState {
    fn default() -> Self {
        Self {
            inner: Arc::new(Mutex::new(TcpReceiptServerInner {
                status: TcpServerStatus::Stopped,
                stop_tx: None,
            })),
        }
    }
}

impl TcpReceiptServerState {
    pub async fn status(&self) -> TcpServerStatus {
        self.inner.lock().await.status.clone()
    }

    pub async fn start(
        &self,
        config: TcpServerConfig,
        publisher: Arc<dyn ReceiptEventPublisher>,
    ) -> Result<TcpServerStatus, String> {
        self.stop().await;

        {
            let mut inner = self.inner.lock().await;
            inner.status = TcpServerStatus::Starting;
        }
        publisher.publish_status(TcpServerStatus::Starting);

        let bind_addr = format!("{}:{}", config.host, config.port);
        let listener = match TcpListener::bind(&bind_addr).await {
            Ok(listener) => listener,
            Err(error) => {
                let message = format!("{bind_addr} 바인딩 실패: {error}");
                let status = TcpServerStatus::Failed {
                    message: message.clone(),
                };
                let mut inner = self.inner.lock().await;
                inner.status = status.clone();
                drop(inner);
                publisher.publish_status(status);
                return Err(message);
            }
        };
        let local_addr = listener
            .local_addr()
            .map_err(|error| format!("로컬 주소 확인 실패: {error}"))?;
        let status = TcpServerStatus::Listening {
            host: config.host.clone(),
            port: local_addr.port(),
        };
        let (stop_tx, stop_rx) = oneshot::channel();
        let shared_config = Arc::new(config);
        let inner = Arc::clone(&self.inner);
        let publisher_for_task = Arc::clone(&publisher);

        {
            let mut inner = self.inner.lock().await;
            inner.status = status.clone();
            inner.stop_tx = Some(stop_tx);
        }
        publisher.publish_status(status.clone());

        tokio::spawn(async move {
            run_server(
                listener,
                Arc::clone(&publisher_for_task),
                shared_config,
                stop_rx,
            )
            .await;
            let mut inner = inner.lock().await;
            inner.status = TcpServerStatus::Stopped;
            inner.stop_tx = None;
            drop(inner);
            publisher_for_task.publish_status(TcpServerStatus::Stopped);
        });

        Ok(status)
    }

    pub async fn stop(&self) -> TcpServerStatus {
        let mut inner = self.inner.lock().await;
        if let Some(stop_tx) = inner.stop_tx.take() {
            let _ = stop_tx.send(());
        }
        inner.status = TcpServerStatus::Stopped;
        inner.status.clone()
    }
}

async fn run_server(
    listener: TcpListener,
    publisher: Arc<dyn ReceiptEventPublisher>,
    config: Arc<TcpServerConfig>,
    mut stop_rx: oneshot::Receiver<()>,
) {
    loop {
        tokio::select! {
            _ = &mut stop_rx => break,
            accepted = listener.accept() => {
                match accepted {
                    Ok((stream, peer_addr)) => {
                        let publisher = Arc::clone(&publisher);
                        let config = Arc::clone(&config);
                        tokio::spawn(async move {
                            handle_client(stream, peer_addr, publisher, config).await;
                        });
                    }
                    Err(error) => {
                        publisher.publish_error(format!("TCP accept 실패: {error}"));
                    }
                }
            }
        }
    }
}

async fn handle_client(
    mut stream: TcpStream,
    peer_addr: SocketAddr,
    publisher: Arc<dyn ReceiptEventPublisher>,
    config: Arc<TcpServerConfig>,
) {
    let connected_at = Utc::now();
    let client = TcpClientInfo {
        peer_addr: peer_addr.to_string(),
        connected_at,
    };
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 4096];
    let idle_timeout = Duration::from_millis(config.receipt_idle_timeout_ms);

    loop {
        match tokio::time::timeout(idle_timeout, stream.read(&mut chunk)).await {
            Ok(Ok(0)) => {
                publish_receipt_if_needed(
                    &publisher,
                    &client,
                    &mut buffer,
                    ReceiptCompleteReason::ConnectionClosed,
                );
                break;
            }
            Ok(Ok(size)) => {
                buffer.extend_from_slice(&chunk[..size]);
                while let Some(cut_end) = find_cut_command_end(&buffer) {
                    let receipt_bytes = buffer.drain(..cut_end).collect::<Vec<_>>();
                    publish_receipt(
                        &publisher,
                        client.clone(),
                        receipt_bytes,
                        ReceiptCompleteReason::Cut,
                    );
                }
            }
            Ok(Err(error)) => {
                publisher.publish_error(format!("TCP read 실패: {error}"));
                publish_receipt_if_needed(
                    &publisher,
                    &client,
                    &mut buffer,
                    ReceiptCompleteReason::ConnectionClosed,
                );
                break;
            }
            Err(_) => {
                publish_receipt_if_needed(
                    &publisher,
                    &client,
                    &mut buffer,
                    ReceiptCompleteReason::IdleTimeout,
                );
            }
        }
    }

    let _ = stream.shutdown().await;
}

fn publish_receipt_if_needed(
    publisher: &Arc<dyn ReceiptEventPublisher>,
    client: &TcpClientInfo,
    buffer: &mut Vec<u8>,
    reason: ReceiptCompleteReason,
) {
    if buffer.is_empty() {
        return;
    }
    let bytes = std::mem::take(buffer);
    publish_receipt(publisher, client.clone(), bytes, reason);
}

fn publish_receipt(
    publisher: &Arc<dyn ReceiptEventPublisher>,
    client: TcpClientInfo,
    bytes: Vec<u8>,
    reason: ReceiptCompleteReason,
) {
    let receipt = ReceivedReceipt {
        id: format!("receipt_{}", Uuid::new_v4().simple()),
        received_at: Utc::now(),
        client,
        bytes,
        reason,
    };
    publisher.publish_receipt(receipt);
}

fn find_cut_command_end(bytes: &[u8]) -> Option<usize> {
    let mut index = 0;
    while index + 2 < bytes.len() {
        if bytes[index] == 0x1d && bytes[index + 1] == 0x56 {
            let mode = bytes[index + 2];
            let command_len = if mode == 0x41 || mode == 0x42 { 4 } else { 3 };
            if index + command_len <= bytes.len() {
                return Some(index + command_len);
            }
            return None;
        }
        index += 1;
    }
    None
}

#[cfg(test)]
mod tests {
    use super::find_cut_command_end;

    #[test]
    fn finds_cut_command_end() {
        assert_eq!(
            find_cut_command_end(&[0x41, 0x1d, 0x56, 0x00, 0x42]),
            Some(4)
        );
        assert_eq!(find_cut_command_end(&[0x1d, 0x56, 0x41, 0x10]), Some(4));
        assert_eq!(find_cut_command_end(&[0x1d, 0x56]), None);
    }
}
