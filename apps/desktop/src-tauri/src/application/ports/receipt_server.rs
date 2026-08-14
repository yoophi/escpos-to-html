use std::sync::Arc;

use crate::domain::{DomainError, TcpServerConfig, TcpServerStatus};

use super::ReceiptEventPublisher;

pub trait ReceiptServerControl: Send + Sync {
    async fn start(
        &self,
        config: TcpServerConfig,
        publisher: Arc<dyn ReceiptEventPublisher>,
    ) -> Result<TcpServerStatus, DomainError>;

    async fn stop(&self) -> TcpServerStatus;

    async fn status(&self) -> TcpServerStatus;
}
