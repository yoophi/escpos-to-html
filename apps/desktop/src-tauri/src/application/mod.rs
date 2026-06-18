//! Application 레이어 — 유스케이스와 포트(인터페이스) 정의.
//!
//! - domain만 사용한다.
//! - 외부 의존성은 ports로 추상화하며, 구체 구현은 infrastructure가 제공한다.

pub mod ports;
pub mod use_cases;

pub use use_cases::*;
