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
        settings_window.show().map_err(|e| e.to_string())?;
        settings_window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
