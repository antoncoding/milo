// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod menu;

use anyhow::Result;
use async_openai::{
    config::OpenAIConfig,
    types::CreateCompletionRequestArgs,
    Client,
};
use dirs::config_dir;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, sync::Mutex, collections::HashMap};
use tauri::{Manager, menu::{MenuBuilder, MenuItemBuilder}, tray::{TrayIconBuilder}, Emitter};
use tokio::sync::Mutex as TokioMutex;

mod core;
use crate::core::setup;

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

async fn transform_text(text: &str, prompt: &str, api_key: &str) -> Result<String, String> {
    println!("Starting text transformation with prompt: {}", prompt);

    let config = OpenAIConfig::new().with_api_key(api_key);
    let client = Client::with_config(config);
    println!("OpenAI client created successfully");

    let request = CreateCompletionRequestArgs::default()
        .model("gpt-3.5-turbo-instruct")
        .prompt(format!("{}\n\nText: {}", prompt, text))
        .max_tokens(2000u16)
        .temperature(0.7)
        .build();

    let request = match request {
        Ok(req) => req,
        Err(e) => {
            let error = format!("Failed to build completion request: {}", e);
            println!("{}", error);
            return Err(error);
        }
    };

    println!("Sending request to OpenAI...");
    match client.completions().create(request).await {
        Ok(response) => {
            println!("Received response from OpenAI");
            if let Some(choice) = response.choices.first() {
                println!("Successfully transformed text");
                Ok(choice.text.clone())
            } else {
                let error = "No completion choices returned from OpenAI".to_string();
                println!("{}", error);
                Err(error)
            }
        }
        Err(e) => {
            let error = format!("OpenAI API error: {}", e);
            println!("{}", error);
            Err(error)
        }
    }
}

#[tauri::command]
async fn process_selected_text(
    text: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let settings = state.settings.lock().await;

    let prompt_key = settings.selected_tone.clone().unwrap_or_else(|| "Improve Writing".to_string());

    let prompt = settings
        .custom_prompts
        .get(&prompt_key)
        .ok_or_else(|| format!("Prompt '{}' not found", prompt_key))?;
    let api_key = get_api_key().await?;
    transform_text(&text, prompt, &api_key).await
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

    let handle = app.handle();
    
    let menu = MenuBuilder::new(handle)
        .text("transform", "Transform")
        .text("settings", "Settings")
        .separator()
        .text("quit", "Quit")
        .build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(move |app_handle, event| {
            match event.id().as_ref() {
                "quit" => {
                    println!("Quitting Milo app...");
                    app_handle.exit(0);
                }
                "settings" => {
                    println!("Opening settings window...");
                    if let Some(window) = app_handle.get_webview_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                "transform" => {
                    let state = app_handle.state::<AppState>();
                    let is_transforming = *state.is_transforming.lock().unwrap();
                    if !is_transforming {
                        println!("Starting text transformation...");
                        app_handle.emit("transform_clipboard", ()).unwrap();
                    } else {
                        println!("Text transformation already in progress...");
                    }
                }
                _ => {}
            }
        })
        .build(app)
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
            
            // Get the main window and handle focus events
            let main_window = app.get_webview_window("main").unwrap();
            
            // // Hide window when it loses focus (clicked outside)
            // main_window.on_window_event(move |event| {
            //     if let tauri::WindowEvent::Focused(focused) = event {
            //         if !focused {
            //             if let Some(window) = app.get_webview_window("main") {
            //                 window.hide().unwrap();
            //             }
            //         }
            //     }
            // });
            
            // Create tray icon
            create_tray_menu(app)?;

            setup::default(app, main_window.clone());

            Ok(())
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            save_api_key,
            get_api_key,
            save_settings,
            get_settings,
            process_selected_text,
            show_settings,
            menu::transform_clipboard,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
