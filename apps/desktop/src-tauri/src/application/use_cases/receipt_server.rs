use std::sync::Arc;

use crate::application::ports::{ReceiptEventPublisher, ReceiptServerControl};
use crate::domain::{DomainError, TcpServerConfig, TcpServerStatus};

pub struct StartReceiptServer;

impl StartReceiptServer {
    pub async fn execute<S: ReceiptServerControl>(
        server: &S,
        config: TcpServerConfig,
        publisher: Arc<dyn ReceiptEventPublisher>,
    ) -> Result<TcpServerStatus, DomainError> {
        server.start(config, publisher).await
    }
}

pub struct StopReceiptServer;

impl StopReceiptServer {
    pub async fn execute<S: ReceiptServerControl>(server: &S) -> TcpServerStatus {
        server.stop().await
    }
}

pub struct GetReceiptServerStatus;

impl GetReceiptServerStatus {
    pub async fn execute<S: ReceiptServerControl>(server: &S) -> TcpServerStatus {
        server.status().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::ReceivedReceipt;
    struct StubPublisher;

    impl ReceiptEventPublisher for StubPublisher {
        fn publish_status(&self, _status: TcpServerStatus) {}
        fn publish_receipt(&self, _receipt: ReceivedReceipt) {}
        fn publish_error(&self, _message: String) {}
    }

    struct StubServer;

    impl ReceiptServerControl for StubServer {
        async fn start(
            &self,
            _config: TcpServerConfig,
            _publisher: Arc<dyn ReceiptEventPublisher>,
        ) -> Result<TcpServerStatus, DomainError> {
            Ok(TcpServerStatus::Listening {
                host: "127.0.0.1".into(),
                port: 9100,
            })
        }

        async fn stop(&self) -> TcpServerStatus {
            TcpServerStatus::Stopped
        }

        async fn status(&self) -> TcpServerStatus {
            TcpServerStatus::Stopped
        }
    }

    #[tokio::test]
    async fn delegates_server_control_to_port() {
        let server = StubServer;
        let publisher = Arc::new(StubPublisher);
        let status = StartReceiptServer::execute(&server, TcpServerConfig::default(), publisher)
            .await
            .unwrap();

        assert!(matches!(status, TcpServerStatus::Listening { .. }));
        assert!(matches!(
            StopReceiptServer::execute(&server).await,
            TcpServerStatus::Stopped
        ));
        assert!(matches!(
            GetReceiptServerStatus::execute(&server).await,
            TcpServerStatus::Stopped
        ));
    }
}
