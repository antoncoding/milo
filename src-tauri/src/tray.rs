use tauri::{
    App, AppHandle,
    menu::MenuBuilder,
    tray::{TrayIcon, TrayIconBuilder},
    Manager,
};

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
            println!("Quit menu item clicked");
            app.exit(0);
        }
        "settings" => {
            println!("Settings menu item clicked");
            if let Some(window) = app.get_webview_window("main") {
                window.show().unwrap();
                window.set_focus().unwrap();
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
