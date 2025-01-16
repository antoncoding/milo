// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod transform;
mod settings;
mod state;
mod tray;
mod api;

use tauri::{Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_notification::NotificationExt;
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
            
            // Register global shortcut (Cmd+M)
            #[cfg(desktop)]
            {
                let app_handle = app.handle();
                let shortcut = Shortcut::new(Some(Modifiers::META), Code::KeyM);
                let handler_app_handle = app_handle.clone();
                
                app_handle.plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |_app, shortcut_ref, event| {
                            if shortcut_ref != &shortcut {
                                return;
                            } 
                            match event.state() {
                                ShortcutState::Pressed => {
                                    let app_handle = handler_app_handle.clone();
                                    tauri::async_runtime::spawn(async move {
                                        if let Err(e) = transform::transform_clip_with_setting(app_handle.clone()).await {
                                            let _ = app_handle.notification()
                                                .builder()
                                                .title("Transform Error")
                                                .body(format!("Failed to transform: {}", e))
                                                .show();
                                        }
                                    });
                                }
                                ShortcutState::Released => {
                                    println!("Transform shortcut released");
                                }
                            }
                            
                        })
                        .build(),
                )?;

                app.global_shortcut().register(shortcut)?;
            }
            
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
