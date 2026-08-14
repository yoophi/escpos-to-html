use std::fmt;

/// 도메인 오류. 외부 크레이트(`thiserror` 등) 의존을 피하기 위해 수동 구현.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DomainError {
    ServerStartFailed(String),
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ServerStartFailed(msg) => write!(f, "TCP server start failed: {msg}"),
        }
    }
}

impl std::error::Error for DomainError {}
