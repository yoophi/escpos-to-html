use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{oneshot, Mutex};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpServerConfig {
    pub host: String,
    pub port: u16,
    pub receipt_idle_timeout_ms: u64,
    pub max_receipts: usize,
}

impl Default for TcpServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".into(),
            port: 9100,
            receipt_idle_timeout_ms: 800,
            max_receipts: 200,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum TcpServerStatus {
    Stopped,
    Starting,
    Listening { host: String, port: u16 },
    Failed { message: String },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceivedReceipt {
    pub id: String,
    pub received_at: DateTime<Utc>,
    pub client: TcpClientInfo,
    pub bytes: Vec<u8>,
    pub reason: ReceiptCompleteReason,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpClientInfo {
    pub peer_addr: String,
    pub connected_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ReceiptCompleteReason {
    Cut,
    IdleTimeout,
    ConnectionClosed,
}

pub struct TcpReceiptServerState {
    inner: Mutex<TcpReceiptServerInner>,
}

struct TcpReceiptServerInner {
    status: TcpServerStatus,
    stop_tx: Option<oneshot::Sender<()>>,
}

impl Default for TcpReceiptServerState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(TcpReceiptServerInner {
                status: TcpServerStatus::Stopped,
                stop_tx: None,
            }),
        }
    }
}

impl TcpReceiptServerState {
    pub async fn status(&self) -> TcpServerStatus {
        self.inner.lock().await.status.clone()
    }

    pub async fn start(
        &self,
        app: AppHandle,
        config: TcpServerConfig,
    ) -> Result<TcpServerStatus, String> {
        self.stop().await;

        {
            let mut inner = self.inner.lock().await;
            inner.status = TcpServerStatus::Starting;
        }
        emit_status(&app, TcpServerStatus::Starting);

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
                emit_status(&app, status);
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
        let app_for_task = app.clone();

        {
            let mut inner = self.inner.lock().await;
            inner.status = status.clone();
            inner.stop_tx = Some(stop_tx);
        }
        emit_status(&app, status.clone());

        tauri::async_runtime::spawn(async move {
            run_server(listener, app_for_task.clone(), shared_config, stop_rx).await;
            let state = app_for_task.state::<TcpReceiptServerState>();
            let mut inner = state.inner.lock().await;
            inner.status = TcpServerStatus::Stopped;
            inner.stop_tx = None;
            drop(inner);
            emit_status(&app_for_task, TcpServerStatus::Stopped);
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
    app: AppHandle,
    config: Arc<TcpServerConfig>,
    mut stop_rx: oneshot::Receiver<()>,
) {
    loop {
        tokio::select! {
            _ = &mut stop_rx => break,
            accepted = listener.accept() => {
                match accepted {
                    Ok((stream, peer_addr)) => {
                        let app = app.clone();
                        let config = Arc::clone(&config);
                        tauri::async_runtime::spawn(async move {
                            handle_client(stream, peer_addr, app, config).await;
                        });
                    }
                    Err(error) => {
                        let _ = app.emit("tcp://error", format!("TCP accept 실패: {error}"));
                    }
                }
            }
        }
    }
}

async fn handle_client(
    mut stream: TcpStream,
    peer_addr: SocketAddr,
    app: AppHandle,
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
                emit_receipt_if_needed(
                    &app,
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
                    emit_receipt(
                        &app,
                        client.clone(),
                        receipt_bytes,
                        ReceiptCompleteReason::Cut,
                    );
                }
            }
            Ok(Err(error)) => {
                let _ = app.emit("tcp://error", format!("TCP read 실패: {error}"));
                emit_receipt_if_needed(
                    &app,
                    &client,
                    &mut buffer,
                    ReceiptCompleteReason::ConnectionClosed,
                );
                break;
            }
            Err(_) => {
                emit_receipt_if_needed(
                    &app,
                    &client,
                    &mut buffer,
                    ReceiptCompleteReason::IdleTimeout,
                );
            }
        }
    }

    let _ = stream.shutdown().await;
}

fn emit_receipt_if_needed(
    app: &AppHandle,
    client: &TcpClientInfo,
    buffer: &mut Vec<u8>,
    reason: ReceiptCompleteReason,
) {
    if buffer.is_empty() {
        return;
    }
    let bytes = std::mem::take(buffer);
    emit_receipt(app, client.clone(), bytes, reason);
}

fn emit_receipt(
    app: &AppHandle,
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
    let _ = app.emit("receipt://received", receipt);
}

fn emit_status(app: &AppHandle, status: TcpServerStatus) {
    let _ = app.emit("tcp://status-changed", status);
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
