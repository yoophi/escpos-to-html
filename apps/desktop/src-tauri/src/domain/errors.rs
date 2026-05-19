use std::fmt;

/// 도메인 오류. 외부 크레이트(`thiserror` 등) 의존을 피하기 위해 수동 구현.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DomainError {
    InvalidInput(String),
    UnsupportedCommand(u8),
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput(msg) => write!(f, "invalid escpos input: {msg}"),
            Self::UnsupportedCommand(byte) => write!(f, "unsupported command: {byte:#x}"),
        }
    }
}

impl std::error::Error for DomainError {}
