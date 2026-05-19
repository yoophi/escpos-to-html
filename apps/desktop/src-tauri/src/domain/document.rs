//! ESC/POS 해석 후 표현되는 문서 모델 (스캐폴딩 단계 — 최소 정의).

use serde::{Deserialize, Serialize};

/// 해석된 영수증 문서.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct EscPosDocument {
    pub blocks: Vec<Block>,
}

/// 영수증을 구성하는 블록 단위 (이후 텍스트/이미지/바코드 등으로 확장).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Block {
    Text { content: String },
}

/// 렌더링 결과.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RenderedHtml(pub String);

impl RenderedHtml {
    pub fn new(html: impl Into<String>) -> Self {
        Self(html.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}
