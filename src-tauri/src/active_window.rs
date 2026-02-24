use core_foundation::base::{CFTypeRef, TCFType};
use core_foundation::number::CFNumber;
use core_foundation::string::CFString;
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

// --- Window enumeration for perching ---

extern "C" {
    fn CGWindowListCopyWindowInfo(option: u32, relativeToWindow: u32) -> CFTypeRef;
    fn CFArrayGetCount(theArray: CFTypeRef) -> isize;
    fn CFArrayGetValueAtIndex(theArray: CFTypeRef, idx: isize) -> CFTypeRef;
    fn CFDictionaryGetValue(theDict: CFTypeRef, key: CFTypeRef) -> CFTypeRef;
    fn CFRelease(cf: CFTypeRef);
}

#[derive(Serialize, Clone)]
pub struct VisibleWindow {
    pub app_name: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

unsafe fn dict_get_i32(dict: CFTypeRef, key_str: &str) -> Option<i32> {
    let key = CFString::new(key_str);
    let val = CFDictionaryGetValue(dict, key.as_concrete_TypeRef() as CFTypeRef);
    if val.is_null() {
        return None;
    }
    let num = CFNumber::wrap_under_get_rule(val as _);
    num.to_i32()
}

unsafe fn dict_get_f64(dict: CFTypeRef, key_str: &str) -> Option<f64> {
    let key = CFString::new(key_str);
    let val = CFDictionaryGetValue(dict, key.as_concrete_TypeRef() as CFTypeRef);
    if val.is_null() {
        return None;
    }
    let num = CFNumber::wrap_under_get_rule(val as _);
    num.to_f64()
}

unsafe fn dict_get_string(dict: CFTypeRef, key_str: &str) -> Option<String> {
    let key = CFString::new(key_str);
    let val = CFDictionaryGetValue(dict, key.as_concrete_TypeRef() as CFTypeRef);
    if val.is_null() {
        return None;
    }
    let s = CFString::wrap_under_get_rule(val as _);
    Some(s.to_string())
}

unsafe fn enumerate_windows() -> Vec<VisibleWindow> {
    let mut result = Vec::new();

    // kCGWindowListOptionOnScreenOnly (1) | kCGWindowListExcludeDesktopElements (1 << 4)
    let options: u32 = 1 | (1 << 4);
    let array = CGWindowListCopyWindowInfo(options, 0);
    if array.is_null() {
        return result;
    }

    let count = CFArrayGetCount(array);

    for i in 0..count {
        let dict = CFArrayGetValueAtIndex(array, i);
        if dict.is_null() {
            continue;
        }

        // Only layer 0 (normal windows)
        match dict_get_i32(dict, "kCGWindowLayer") {
            Some(0) => {}
            _ => continue,
        }

        // Get app name
        let app_name = match dict_get_string(dict, "kCGWindowOwnerName") {
            Some(name) => name,
            None => continue,
        };

        // Skip our own window
        let lower = app_name.to_lowercase();
        if lower.contains("desktop-pet") || lower.contains("desktop_pet") {
            continue;
        }

        // Get bounds dictionary
        let bounds_key = CFString::new("kCGWindowBounds");
        let bounds_dict =
            CFDictionaryGetValue(dict, bounds_key.as_concrete_TypeRef() as CFTypeRef);
        if bounds_dict.is_null() {
            continue;
        }

        let x = dict_get_f64(bounds_dict, "X").unwrap_or(0.0);
        let y = dict_get_f64(bounds_dict, "Y").unwrap_or(0.0);
        let width = dict_get_f64(bounds_dict, "Width").unwrap_or(0.0);
        let height = dict_get_f64(bounds_dict, "Height").unwrap_or(0.0);

        // Filter by minimum size
        if width >= 200.0 && height >= 100.0 {
            result.push(VisibleWindow {
                app_name,
                x,
                y,
                width,
                height,
            });
        }
    }

    CFRelease(array);
    result
}

#[tauri::command]
pub fn get_visible_windows() -> Vec<VisibleWindow> {
    unsafe { enumerate_windows() }
}
