use tauri::Manager;

use std::fs;
use crate::{settings::{api_key_file_path, Settings}, state::AppState};

#[tauri::command]
pub async fn save_api_key(key: String) -> Result<(), String> {
    fs::write(api_key_file_path(), key).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_api_key() -> Result<String, String> {
    fs::read_to_string(api_key_file_path()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_settings(state: tauri::State<'_, AppState>, settings: Settings) -> Result<(), String> {
    settings.save()?;
    *state.settings.lock().await = settings;
    Ok(())
}

#[tauri::command]
pub async fn get_settings(state: tauri::State<'_, AppState>) -> Result<Settings, String> {
    Ok(state.settings.lock().await.clone())
}

#[tauri::command]
pub async fn show_settings(window: tauri::Window) -> Result<(), String> {
    let app = window.app_handle();
    if let Some(settings_window) = app.get_webview_window("main") {
        // Show window first
        settings_window.show().map_err(|e| e.to_string())?;
        
        #[cfg(target_os = "macos")]
        {
            use tauri::UserAttentionType;
            let _ = crate::system::move_window_to_active_space(&settings_window);
            
            // Request user attention to draw focus
            let _ = settings_window.request_user_attention(Some(UserAttentionType::Critical));
        }
        
        // Multiple focus attempts with increasing delays for desktop switching
        std::thread::sleep(std::time::Duration::from_millis(200));
        settings_window.set_focus().map_err(|e| e.to_string())?;
        
        std::thread::sleep(std::time::Duration::from_millis(100));
        settings_window.set_focus().map_err(|e| e.to_string())?;
        
        // Final attempt with even longer delay
        std::thread::sleep(std::time::Duration::from_millis(100));
        settings_window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
