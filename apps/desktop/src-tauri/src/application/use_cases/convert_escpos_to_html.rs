use crate::application::ports::{EscPosParser, HtmlRenderer};
use crate::domain::{DomainError, RenderedHtml};

/// 바이트 → 문서 → HTML 변환 유스케이스.
pub struct ConvertEscPosToHtml<P: EscPosParser, R: HtmlRenderer> {
    parser: P,
    renderer: R,
}

impl<P: EscPosParser, R: HtmlRenderer> ConvertEscPosToHtml<P, R> {
    pub fn new(parser: P, renderer: R) -> Self {
        Self { parser, renderer }
    }

    pub fn execute(&self, bytes: &[u8]) -> Result<RenderedHtml, DomainError> {
        let doc = self.parser.parse(bytes)?;
        self.renderer.render(&doc)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{Block, EscPosDocument};

    struct StubParser;
    impl EscPosParser for StubParser {
        fn parse(&self, _bytes: &[u8]) -> Result<EscPosDocument, DomainError> {
            Ok(EscPosDocument {
                blocks: vec![Block::Text {
                    content: "hello".into(),
                }],
            })
        }
    }

    struct StubRenderer;
    impl HtmlRenderer for StubRenderer {
        fn render(&self, _doc: &EscPosDocument) -> Result<RenderedHtml, DomainError> {
            Ok(RenderedHtml::new("<p>hello</p>"))
        }
    }

    #[test]
    fn pipes_parser_into_renderer() {
        let uc = ConvertEscPosToHtml::new(StubParser, StubRenderer);
        let out = uc.execute(&[]).unwrap();
        assert_eq!(out.as_str(), "<p>hello</p>");
    }
}
