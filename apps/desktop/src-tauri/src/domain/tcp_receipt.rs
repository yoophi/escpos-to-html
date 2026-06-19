use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

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
