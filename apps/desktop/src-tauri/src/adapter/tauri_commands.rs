use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::adapter::tcp_receipt_server::{TcpReceiptServerState, TcpServerConfig, TcpServerStatus};
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

#[tauri::command]
pub async fn start_tcp_server(
    app: AppHandle,
    config: TcpServerConfig,
) -> Result<TcpServerStatus, CommandError> {
    let state = app.state::<TcpReceiptServerState>();
    state
        .start(app.clone(), config)
        .await
        .map_err(CommandError::from_message)
}

#[tauri::command]
pub async fn stop_tcp_server(app: AppHandle) -> Result<TcpServerStatus, CommandError> {
    let state = app.state::<TcpReceiptServerState>();
    Ok(state.stop().await)
}

#[tauri::command]
pub async fn get_tcp_server_status(app: AppHandle) -> Result<TcpServerStatus, CommandError> {
    let state = app.state::<TcpReceiptServerState>();
    Ok(state.status().await)
}

impl CommandError {
    fn from_message(message: String) -> Self {
        Self {
            code: "command_error".into(),
            message,
        }
    }
}
