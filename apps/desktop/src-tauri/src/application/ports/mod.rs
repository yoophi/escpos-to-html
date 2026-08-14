//! Ports — application이 외부 세계와 소통할 때 사용하는 추상 인터페이스.

pub mod receipt_events;
pub mod receipt_server;

pub use receipt_events::ReceiptEventPublisher;
pub use receipt_server::ReceiptServerControl;
