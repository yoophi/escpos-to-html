use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

const DEFAULT_MAX_RECEIPT_BYTES: usize = 1_048_576;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpServerConfig {
    pub host: String,
    pub port: u16,
    pub receipt_idle_timeout_ms: u64,
    #[serde(default = "default_max_receipt_bytes")]
    pub max_receipt_bytes: usize,
}

impl Default for TcpServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".into(),
            port: 9100,
            receipt_idle_timeout_ms: 800,
            max_receipt_bytes: DEFAULT_MAX_RECEIPT_BYTES,
        }
    }
}

fn default_max_receipt_bytes() -> usize {
    DEFAULT_MAX_RECEIPT_BYTES
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
    pub truncated: bool,
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

#[cfg(test)]
mod tests {
    use super::{TcpServerConfig, DEFAULT_MAX_RECEIPT_BYTES};

    #[test]
    fn defaults_max_receipt_bytes_to_one_megabyte() {
        assert_eq!(
            TcpServerConfig::default().max_receipt_bytes,
            DEFAULT_MAX_RECEIPT_BYTES
        );
    }

    #[test]
    fn accepts_legacy_config_without_max_receipt_bytes() {
        let config: TcpServerConfig = serde_json::from_str(
            r#"{
                "host": "127.0.0.1",
                "port": 9100,
                "receiptIdleTimeoutMs": 800,
                "maxReceipts": 200
            }"#,
        )
        .expect("legacy TCP config should remain deserializable");

        assert_eq!(config.max_receipt_bytes, DEFAULT_MAX_RECEIPT_BYTES);
    }
}
