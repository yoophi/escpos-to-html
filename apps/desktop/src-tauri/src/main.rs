// 모바일 타깃에서 콘솔 창이 뜨지 않도록 보호 (Tauri 표준 템플릿)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    escpos_desktop_lib::run();
}
