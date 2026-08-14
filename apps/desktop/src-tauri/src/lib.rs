//! Tauri 앱 엔트리.

mod adapter;
mod application;
mod domain;
mod infrastructure;

use adapter::tauri_commands;
use infrastructure::TcpReceiptServerState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(TcpReceiptServerState::default())
        .invoke_handler(tauri::generate_handler![
            tauri_commands::start_tcp_server,
            tauri_commands::stop_tcp_server,
            tauri_commands::get_tcp_server_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
