//! Domain 레이어 — 비즈니스 규칙의 핵심.
//!
//! - 외부(프레임워크/IO)에 의존하지 않는다.
//! - 엔티티, 값 객체, 도메인 오류만 둔다.

pub mod document;
pub mod errors;

pub use document::*;
pub use errors::DomainError;
