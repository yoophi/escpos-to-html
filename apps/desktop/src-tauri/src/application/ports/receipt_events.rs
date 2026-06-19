use crate::domain::{ReceivedReceipt, TcpServerStatus};

pub trait ReceiptEventPublisher: Send + Sync {
    fn publish_status(&self, status: TcpServerStatus);
    fn publish_receipt(&self, receipt: ReceivedReceipt);
    fn publish_error(&self, message: String);
}
