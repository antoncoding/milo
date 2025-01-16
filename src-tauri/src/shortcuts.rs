use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_notification::NotificationExt;

use crate::transform;

pub fn register_shortcuts(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    register_transform_shortcut(app_handle)?;
    // Add more shortcut registrations here as needed
    Ok(())
}

pub fn register_transform_shortcut(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(desktop)]
    {
        // CMD + M => Transform Copied Text
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

        app_handle.global_shortcut().register(shortcut)?;

        Ok(())
    }
    #[cfg(not(desktop))]
    Ok(())
}
