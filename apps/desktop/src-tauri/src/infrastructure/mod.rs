//! Infrastructure — application 포트의 구체 구현(driven adapters).
//!
//! 외부 라이브러리, 파일 시스템, HTTP 등 IO에 의존하는 구현은 모두 이 레이어에 둔다.

pub mod parsers;
pub mod renderers;
pub mod tcp;

pub use parsers::NoopEscPosParser;
pub use renderers::SimpleHtmlRenderer;
pub use tcp::TcpReceiptServerState;
