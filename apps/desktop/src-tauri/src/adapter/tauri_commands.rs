use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::adapter::tauri_receipt_events::TauriReceiptEventPublisher;
use crate::application::use_cases::{
    GetReceiptServerStatus, StartReceiptServer, StopReceiptServer,
};
use crate::domain::{TcpServerConfig, TcpServerStatus};
use crate::infrastructure::TcpReceiptServerState;

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
pub async fn start_tcp_server(
    app: AppHandle,
    config: TcpServerConfig,
) -> Result<TcpServerStatus, CommandError> {
    let state = app.state::<TcpReceiptServerState>();
    let publisher = Arc::new(TauriReceiptEventPublisher::new(app.clone()));
    StartReceiptServer::execute(state.inner(), config, publisher)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn stop_tcp_server(app: AppHandle) -> Result<TcpServerStatus, CommandError> {
    let state = app.state::<TcpReceiptServerState>();
    Ok(StopReceiptServer::execute(state.inner()).await)
}

#[tauri::command]
pub async fn get_tcp_server_status(app: AppHandle) -> Result<TcpServerStatus, CommandError> {
    let state = app.state::<TcpReceiptServerState>();
    Ok(GetReceiptServerStatus::execute(state.inner()).await)
}
