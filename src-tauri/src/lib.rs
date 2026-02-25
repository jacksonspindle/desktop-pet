mod active_window;
mod dialogue;
mod memory;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Build tray menu
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let mute_item = MenuItem::with_id(app, "mute", "Mute Dialogue", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&mute_item, &quit_item])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "mute" => {
                        // Toggle mute - handled via frontend event
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("toggle-mute", ());
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                // Maximize to fill the screen without true fullscreen
                // (true fullscreen breaks transparency on macOS)
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let size = monitor.size();
                        let pos = monitor.position();
                        let _ = window.set_position(tauri::Position::Physical(
                            tauri::PhysicalPosition::new(pos.x, pos.y),
                        ));
                        let _ = window.set_size(tauri::Size::Physical(
                            tauri::PhysicalSize::new(size.width, size.height),
                        ));
                    }
                }
                // Make the window ignore cursor events by default
                let _ = window.set_ignore_cursor_events(true);
                // Show window after positioning
                let _ = window.show();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            active_window::get_active_window_info,
            dialogue::generate_pet_dialogue,
            memory::clear_chat_memory,
            memory::get_memory_stats,
            set_ignore_cursor_events,
            get_mouse_position,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn set_ignore_cursor_events(
    window: tauri::WebviewWindow,
    ignore: bool,
) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
struct MousePosition {
    x: f64,
    y: f64,
}

#[tauri::command]
fn get_mouse_position() -> Result<MousePosition, String> {
    use core_graphics::event::CGEvent;
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
        .map_err(|_| "Failed to create event source".to_string())?;
    let event = CGEvent::new(source)
        .map_err(|_| "Failed to create event".to_string())?;
    let point = event.location();

    Ok(MousePosition {
        x: point.x,
        y: point.y,
    })
}
