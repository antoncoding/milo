// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod transform;
mod settings;
mod state;
mod tray;
mod api;
mod shortcuts;
mod system;

use settings::Settings;
use state::AppState;
use tauri::Manager;
use tauri_plugin_notification::NotificationExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = Settings::load();
    let app_state = AppState::new(settings);

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, shortcut, event| {
                println!("🎯 Shortcut handler triggered!");
                println!("   Received shortcut: {:?}", shortcut);
                println!("   Event state: {:?}", event.state());
                
                match event.state() {
                    tauri_plugin_global_shortcut::ShortcutState::Pressed => {
                        println!("⬇️  Shortcut PRESSED - triggering transform");
                        let app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(e) = transform::transform_clip_with_setting(app_handle.clone(), true).await {
                                println!("❌ Transform error: {}", e);
                                let _ = app_handle.notification()
                                    .builder()
                                    .title("Transform Error")
                                    .body(format!("Failed to transform: {}", e))
                                    .show();
                            } else {
                                println!("✅ Transform completed successfully");
                            }
                        });
                    }
                    tauri_plugin_global_shortcut::ShortcutState::Released => {
                        println!("⬆️  Shortcut RELEASED");
                    }
                }
            })
            .build())
        .setup(|app| {
            println!("Starting Milo app...");
            let _tray = tray::create_tray_menu(app)?;
            
            // Register global shortcuts
            #[cfg(desktop)]
            shortcuts::register_shortcuts(&app.handle())?;

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
            shortcuts::get_current_shortcut,
            shortcuts::update_shortcut,
            shortcuts::unregister_shortcut,
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
