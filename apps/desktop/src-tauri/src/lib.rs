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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            tauri_commands::ping,
            tauri_commands::convert_escpos_to_html,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
