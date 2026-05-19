use serde::Serialize;

use crate::application::use_cases::ConvertEscPosToHtml;
use crate::infrastructure::{NoopEscPosParser, SimpleHtmlRenderer};

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl From<crate::domain::DomainError> for CommandError {
    fn from(value: crate::domain::DomainError) -> Self {
        Self {
            code: "domain_error".into(),
            message: value.to_string(),
        }
    }
}

#[tauri::command]
pub fn ping() -> &'static str {
    "pong"
}

/// ESC/POS 바이트 → HTML 변환. 스캐폴딩 단계에서는 stub 구현을 조립해 호출한다.
#[tauri::command]
pub fn convert_escpos_to_html(bytes: Vec<u8>) -> Result<String, CommandError> {
    let uc = ConvertEscPosToHtml::new(NoopEscPosParser, SimpleHtmlRenderer);
    let html = uc.execute(&bytes)?;
    Ok(html.as_str().to_owned())
}
