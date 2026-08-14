use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use chrono::Utc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{oneshot, Mutex};
use uuid::Uuid;

use crate::application::ports::{ReceiptEventPublisher, ReceiptServerControl};
use crate::domain::{
    DomainError, ReceiptCompleteReason, ReceivedReceipt, TcpClientInfo, TcpServerConfig,
    TcpServerStatus,
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
    ) -> Result<TcpServerStatus, DomainError> {
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
                return Err(DomainError::ServerStartFailed(message));
            }
        };
        let local_addr = listener.local_addr().map_err(|error| {
            DomainError::ServerStartFailed(format!("로컬 주소 확인 실패: {error}"))
        })?;
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

impl ReceiptServerControl for TcpReceiptServerState {
    async fn start(
        &self,
        config: TcpServerConfig,
        publisher: Arc<dyn ReceiptEventPublisher>,
    ) -> Result<TcpServerStatus, DomainError> {
        TcpReceiptServerState::start(self, config, publisher).await
    }

    async fn stop(&self) -> TcpServerStatus {
        TcpReceiptServerState::stop(self).await
    }

    async fn status(&self) -> TcpServerStatus {
        TcpReceiptServerState::status(self).await
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
                    false,
                );
                break;
            }
            Ok(Ok(size)) => {
                let remaining = config.max_receipt_bytes.saturating_sub(buffer.len());
                if size > remaining {
                    buffer.extend_from_slice(&chunk[..remaining]);
                    publisher.publish_error(format!(
                        "TCP 영수증 크기 제한 초과: peer={}, max_receipt_bytes={}, 초과 데이터는 폐기되고 영수증이 절단되었습니다",
                        client.peer_addr, config.max_receipt_bytes
                    ));
                    publish_receipt_if_needed(
                        &publisher,
                        &client,
                        &mut buffer,
                        ReceiptCompleteReason::ConnectionClosed,
                        true,
                    );
                    break;
                }

                buffer.extend_from_slice(&chunk[..size]);
                while let Some(cut_end) = find_cut_command_end(&buffer) {
                    let receipt_bytes = buffer.drain(..cut_end).collect::<Vec<_>>();
                    publish_receipt(
                        &publisher,
                        client.clone(),
                        receipt_bytes,
                        ReceiptCompleteReason::Cut,
                        false,
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
                    false,
                );
                break;
            }
            Err(_) => {
                publish_receipt_if_needed(
                    &publisher,
                    &client,
                    &mut buffer,
                    ReceiptCompleteReason::IdleTimeout,
                    false,
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
    truncated: bool,
) {
    if buffer.is_empty() && !truncated {
        return;
    }
    let bytes = std::mem::take(buffer);
    publish_receipt(publisher, client.clone(), bytes, reason, truncated);
}

fn publish_receipt(
    publisher: &Arc<dyn ReceiptEventPublisher>,
    client: TcpClientInfo,
    bytes: Vec<u8>,
    reason: ReceiptCompleteReason,
    truncated: bool,
) {
    let receipt = ReceivedReceipt {
        id: format!("receipt_{}", Uuid::new_v4().simple()),
        received_at: Utc::now(),
        client,
        bytes,
        reason,
        truncated,
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
    use std::sync::{Arc, Mutex};

    use tokio::io::AsyncWriteExt;
    use tokio::net::{TcpListener, TcpStream};

    use crate::application::ports::ReceiptEventPublisher;
    use crate::domain::{ReceivedReceipt, TcpServerConfig, TcpServerStatus};

    use super::{find_cut_command_end, handle_client};

    #[derive(Default)]
    struct RecordingPublisher {
        receipts: Mutex<Vec<ReceivedReceipt>>,
        errors: Mutex<Vec<String>>,
    }

    impl ReceiptEventPublisher for RecordingPublisher {
        fn publish_status(&self, _status: TcpServerStatus) {}

        fn publish_receipt(&self, receipt: ReceivedReceipt) {
            self.receipts.lock().unwrap().push(receipt);
        }

        fn publish_error(&self, message: String) {
            self.errors.lock().unwrap().push(message);
        }
    }

    #[test]
    fn finds_cut_command_end() {
        assert_eq!(
            find_cut_command_end(&[0x41, 0x1d, 0x56, 0x00, 0x42]),
            Some(4)
        );
        assert_eq!(find_cut_command_end(&[0x1d, 0x56, 0x41, 0x10]), Some(4));
        assert_eq!(find_cut_command_end(&[0x1d, 0x56]), None);
    }

    #[tokio::test]
    async fn truncates_receipt_and_publishes_error_when_size_limit_is_exceeded() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let publisher = Arc::new(RecordingPublisher::default());
        let config = Arc::new(TcpServerConfig {
            max_receipt_bytes: 4,
            ..TcpServerConfig::default()
        });

        let client_task = tokio::spawn(async move {
            let mut stream = TcpStream::connect(address).await.unwrap();
            stream.write_all(b"123456").await.unwrap();
            stream.shutdown().await.unwrap();
        });
        let (stream, peer_addr) = listener.accept().await.unwrap();

        handle_client(stream, peer_addr, publisher.clone(), config).await;
        client_task.await.unwrap();

        let receipts = publisher.receipts.lock().unwrap();
        assert_eq!(receipts.len(), 1);
        assert_eq!(receipts[0].bytes, b"1234");
        assert!(receipts[0].truncated);

        let errors = publisher.errors.lock().unwrap();
        assert_eq!(errors.len(), 1);
        assert!(errors[0].contains("max_receipt_bytes=4"));
        assert!(errors[0].contains("절단되었습니다"));
    }
}
