//! Tauri 앱 엔트리. 헥사고날 계층을 조립해 Tauri Runtime에 주입한다.
//!
//! 의존성 방향: adapter → application → domain
//!                       ↑
//!             infrastructure (ports 구현)

mod adapter;
mod application;
mod domain;
mod infrastructure;

use adapter::tauri_commands;
use adapter::tcp_receipt_server::TcpReceiptServerState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(TcpReceiptServerState::default())
        .invoke_handler(tauri::generate_handler![
            tauri_commands::ping,
            tauri_commands::convert_escpos_to_html,
            tauri_commands::start_tcp_server,
            tauri_commands::stop_tcp_server,
            tauri_commands::get_tcp_server_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
