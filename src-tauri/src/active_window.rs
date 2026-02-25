use serde::Serialize;

#[derive(Serialize)]
pub struct WindowInfo {
    pub app_name: String,
    pub window_title: String,
}

#[tauri::command]
pub fn get_active_window_info() -> Result<WindowInfo, String> {
    match active_win_pos_rs::get_active_window() {
        Ok(window) => Ok(WindowInfo {
            app_name: window.app_name,
            window_title: window.title,
        }),
        Err(()) => Err("Failed to get active window info".to_string()),
    }
}
