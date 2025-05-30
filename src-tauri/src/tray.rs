use tauri::{
    App, AppHandle,
    menu::MenuBuilder,
    tray::{TrayIcon, TrayIconBuilder},
    Manager,
};

#[cfg(target_os = "macos")]
use crate::system;

pub fn create_tray_menu(app: &App) -> Result<TrayIcon, tauri::Error> {
    println!("Creating tray menu...");

    let menu = MenuBuilder::new(app)
        .text("transform", "Transform")
        .text("settings", "Settings")
        .separator()
        .text("quit", "Quit")
        .build()?;

    let tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(handle_menu_event)
        .build(app)?;

    Ok(tray)
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    println!("Menu event received: {:?}", event.id());
    match event.id().as_ref() {
        "quit" => {
            app.exit(0);
        }
        "settings" => {
            println!("Settings menu item clicked");
            if let Some(window) = app.get_webview_window("main") {
                // Show window first
                let _ = window.show();
                
                #[cfg(target_os = "macos")]
                {
                    use tauri::UserAttentionType;
                    let _ = system::move_window_to_active_space(&window);
                    
                    // Request user attention to draw focus
                    let _ = window.request_user_attention(Some(UserAttentionType::Critical));
                }
                
                // Multiple focus attempts with increasing delays for desktop switching
                std::thread::sleep(std::time::Duration::from_millis(200));
                let _ = window.set_focus();
                
                std::thread::sleep(std::time::Duration::from_millis(100));
                let _ = window.set_focus();
                
                // Final attempt with even longer delay
                std::thread::sleep(std::time::Duration::from_millis(100));
                let _ = window.set_focus();
            }
        }
        "transform" => {
            let state = app.state::<crate::state::AppState>();
            let is_transforming = *state.is_transforming.lock().unwrap();
            if !is_transforming {
                println!("Starting transformation...");
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = crate::transform::transform_clip_with_setting(app_handle, false).await {
                        println!("Transform error: {}", e);
                    }
                });
            } else {
                println!("Transformation already in progress");
            }
        }
        _ => {
            println!("Unknown menu item clicked: {:?}", event.id());
        }
    }
}
