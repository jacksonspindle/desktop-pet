#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Load .env from project root (parent of src-tauri)
    let _ = dotenvy::from_filename("../.env");
    let _ = dotenvy::dotenv();
    desktop_pet_lib::run()
}
