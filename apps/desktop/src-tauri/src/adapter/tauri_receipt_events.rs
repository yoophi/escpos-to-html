use tauri::{AppHandle, Emitter};

use crate::application::ports::ReceiptEventPublisher;
use crate::domain::{ReceivedReceipt, TcpServerStatus};

pub struct TauriReceiptEventPublisher {
    app: AppHandle,
}

impl TauriReceiptEventPublisher {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}

impl ReceiptEventPublisher for TauriReceiptEventPublisher {
    fn publish_status(&self, status: TcpServerStatus) {
        let _ = self.app.emit("tcp://status-changed", status);
    }

    fn publish_receipt(&self, receipt: ReceivedReceipt) {
        let _ = self.app.emit("receipt://received", receipt);
    }

    fn publish_error(&self, message: String) {
        let _ = self.app.emit("tcp://error", message);
    }
}
