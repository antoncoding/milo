// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod transform;
mod settings;
mod state;
mod tray;
mod api;

use tauri::{Manager};

use settings::Settings;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = Settings::load();
    let app_state = AppState::new(settings);

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            println!("Starting Milo app...");
            let _tray = tray::create_tray_menu(app)?;
            Ok(())
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            api::save_api_key,
            api::get_api_key,
            api::save_settings,
            api::get_settings,
            api::show_settings,
            transform::transform_clipboard,
        ])
        .on_window_event(|_app, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let window = _app.get_webview_window("main").unwrap();
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
