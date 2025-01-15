// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod transform;

use anyhow::Result;
use dirs::config_dir;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, sync::Mutex, collections::HashMap};
use tauri::{
    Manager, 
    menu::{MenuBuilder}, 
    tray::{TrayIconBuilder},
    Emitter
};
use tokio::sync::Mutex as TokioMutex;


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    openai_model: String,
    custom_prompts: HashMap<String, String>,
    selected_tone: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        let mut custom_prompts = HashMap::new();
        custom_prompts.insert(
            "Improve Writing".to_string(),
            "Improve this text while maintaining its meaning:".to_string(),
        );
        Self {
            openai_model: "gpt-3.5-turbo".to_string(),
            custom_prompts,
            selected_tone: Some("Improve Writing".to_string()),
        }
    }
}

impl Settings {
    fn load() -> Self {
        fs::read_to_string(settings_file_path())
            .ok()
            .and_then(|contents| serde_json::from_str(&contents).ok())
            .unwrap_or_default()
    }

    fn save(&self) -> Result<(), String> {
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(settings_file_path(), json).map_err(|e| e.to_string())
    }
}

pub struct AppState {
    settings: TokioMutex<Settings>,
    is_transforming: std::sync::Mutex<bool>,
}

fn api_key_file_path() -> PathBuf {
    let mut path = config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("milo");
    fs::create_dir_all(&path).unwrap();
    path.push("api_key.txt");
    path
}

fn settings_file_path() -> PathBuf {
    let mut path = config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("milo");
    fs::create_dir_all(&path).unwrap();
    path.push("settings.json");
    path
}

#[tauri::command]
async fn save_api_key(key: String) -> Result<(), String> {
    fs::write(api_key_file_path(), key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_api_key() -> Result<String, String> {
    fs::read_to_string(api_key_file_path()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_settings(state: tauri::State<'_, AppState>, settings: Settings) -> Result<(), String> {
    settings.save()?;
    *state.settings.lock().await = settings;
    Ok(())
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, AppState>) -> Result<Settings, String> {
    Ok(state.settings.lock().await.clone())
}

#[tauri::command]
async fn show_settings(window: tauri::Window) -> Result<(), String> {
    let app = window.app_handle();
    if let Some(settings_window) = app.get_webview_window("main") {
        settings_window.show().map_err(|e| e.to_string())?;
        settings_window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}


fn create_tray_menu(app: &tauri::App) -> Result<tauri::tray::TrayIcon, tauri::Error> {
    println!("Creating tray menu... 22");

    println!("Creating menu...");
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
        .on_menu_event(|app, event| {
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
                    println!("Transform menu item clicked");
                    let state = app.state::<AppState>();
                    let is_transforming = *state.is_transforming.lock().unwrap();
                    if !is_transforming {
                        println!("Starting transformation...");
                        app.emit("transform_clipboard", ()).unwrap();
                    } else {
                        println!("Transformation already in progress");
                    }
                }
                _ => {
                    println!("Unknown menu item clicked: {:?}", event.id());
                }
            }
        })
        .build(app)?;

    Ok(tray)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = Settings::load();
    let app_state = AppState {
        settings: TokioMutex::new(settings),
        is_transforming: Mutex::new(false),
    };

    tauri::Builder::default()
        .setup(|app| {
            println!("Starting Milo app...");
            let _tray = create_tray_menu(app)?;
            Ok(())
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            save_api_key,
            get_api_key,
            save_settings,
            get_settings,
            show_settings,
            transform::transform_clipboard,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
