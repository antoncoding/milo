// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod transform;
mod settings;
mod state;
mod tray;
mod api;
mod shortcuts;
mod system;
mod history;
mod core;
mod config;

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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
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
                            if let Err(e) = core::transform_clip_with_setting(app_handle.clone(), true).await {
                                println!("❌ Transform error: {}", e);

                                // Show notification for rate limit errors - users need to know!
                                if e.contains("rate limit") || e.contains("Rate limit") {
                                    // Use a simple spawn to avoid blocking and potential crashes
                                    let notification_handle = app_handle.clone();
                                    tokio::spawn(async move {
                                        let _ = notification_handle.notification()
                                            .builder()
                                            .title("Milo - Rate Limited")
                                            .body("Not enough API balance! Please top up your account and try again.")
                                            .show();
                                    });
                                }
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

            #[cfg(target_os = "macos")]#[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            
            Ok(())
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            api::save_api_key,
            api::get_api_key,
            api::save_litellm_api_key,
            api::get_litellm_api_key,
            api::save_settings,
            api::get_settings,
            api::show_settings,
            core::transform_clipboard,
            core::transform_clip_with_setting,
            shortcuts::get_current_shortcut,
            shortcuts::update_shortcut,
            shortcuts::unregister_shortcut,
            history::add_transformation_to_history,
            history::get_transformation_history,
            history::clear_transformation_history,
            history::delete_transformation_entry,
            history::get_usage_stats,
            history::get_daily_stats,
        ])
        .on_window_event(|_app, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let window = _app.get_webview_window("main").unwrap();
                window.hide().unwrap();
                api.prevent_close();
            }
            tauri::WindowEvent::Focused(is_focused) => {
                if *is_focused {
                    println!("Window focused - ensuring proper z-order and app activation");
                    #[cfg(target_os = "macos")]
                    if let Some(window) = _app.get_webview_window("main") {
                        let _ = crate::system::move_window_to_active_space(&window);
                        
                        // Small delay then re-focus to ensure it sticks
                        std::thread::sleep(std::time::Duration::from_millis(50));
                        let _ = window.set_focus();
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
