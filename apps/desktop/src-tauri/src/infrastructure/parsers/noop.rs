use crate::application::ports::EscPosParser;
use crate::domain::{DomainError, EscPosDocument};

/// 스캐폴딩용 noop 파서. 입력을 그대로 무시하고 빈 문서를 반환한다.
pub struct NoopEscPosParser;

impl EscPosParser for NoopEscPosParser {
    fn parse(&self, _bytes: &[u8]) -> Result<EscPosDocument, DomainError> {
        Ok(EscPosDocument::default())
    }
}
