use crate::domain::{DomainError, EscPosDocument, RenderedHtml};

/// EscPosDocument를 HTML로 직렬화하는 포트.
pub trait HtmlRenderer: Send + Sync {
    fn render(&self, doc: &EscPosDocument) -> Result<RenderedHtml, DomainError>;
}
