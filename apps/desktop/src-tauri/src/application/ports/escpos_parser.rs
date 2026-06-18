use crate::domain::{DomainError, EscPosDocument};

/// 바이트 스트림을 EscPosDocument로 해석하는 포트.
pub trait EscPosParser: Send + Sync {
    fn parse(&self, bytes: &[u8]) -> Result<EscPosDocument, DomainError>;
}
