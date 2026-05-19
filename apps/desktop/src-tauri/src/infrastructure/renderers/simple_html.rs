use crate::application::ports::HtmlRenderer;
use crate::domain::{Block, DomainError, EscPosDocument, RenderedHtml};

/// 스캐폴딩용 단순 HTML 렌더러. Block::Text만 <p>로 감싼다.
pub struct SimpleHtmlRenderer;

impl HtmlRenderer for SimpleHtmlRenderer {
    fn render(&self, doc: &EscPosDocument) -> Result<RenderedHtml, DomainError> {
        let body = doc
            .blocks
            .iter()
            .map(|b| match b {
                Block::Text { content } => format!("<p>{}</p>", escape(content)),
            })
            .collect::<String>();

        Ok(RenderedHtml::new(format!(
            "<article class=\"receipt\">{body}</article>"
        )))
    }
}

fn escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
