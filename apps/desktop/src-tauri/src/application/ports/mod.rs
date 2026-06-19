//! Ports — application이 외부 세계와 소통할 때 사용하는 추상 인터페이스.

pub mod escpos_parser;
pub mod html_renderer;
pub mod receipt_events;

pub use escpos_parser::EscPosParser;
pub use html_renderer::HtmlRenderer;
pub use receipt_events::ReceiptEventPublisher;
