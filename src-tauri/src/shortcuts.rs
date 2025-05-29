use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use std::sync::Mutex;

use crate::state::AppState;

// Global state to track the currently registered shortcut
static CURRENT_SHORTCUT: Mutex<Option<Shortcut>> = Mutex::new(None);

pub fn register_shortcuts(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔧 Starting shortcut registration...");
    register_transform_shortcut_from_settings(app_handle)?;
    println!("✅ Shortcut registration completed");
    Ok(())
}

fn register_transform_shortcut_from_settings(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(desktop)]
    {
        println!("📱 Getting shortcut from settings...");
        // Get settings and shortcut
        let state = app_handle.state::<AppState>();
        let settings = tauri::async_runtime::block_on(state.settings.lock());
        let shortcut_str = settings.get_shortcut_keys();
        println!("🔑 Retrieved shortcut from settings: '{}'", shortcut_str);
        drop(settings);

        // Parse shortcut
        println!("🔍 Parsing shortcut string: '{}'", shortcut_str);
        let shortcut = parse_shortcut(&shortcut_str)?;
        println!("✅ Successfully parsed shortcut: {:?}", shortcut);
        
        register_transform_shortcut(app_handle, shortcut)?;
        
        // Store current shortcut
        *CURRENT_SHORTCUT.lock().unwrap() = Some(shortcut);
        println!("💾 Stored current shortcut in memory");
        
        Ok(())
    }
    #[cfg(not(desktop))]
    {
        println!("⚠️  Not on desktop platform, skipping shortcut registration");
        Ok(())
    }
}

fn register_transform_shortcut(app_handle: &AppHandle, shortcut: Shortcut) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(desktop)]
    {
        println!("🔄 Registering transform shortcut: {:?}", shortcut);
        
        // Register the shortcut with the system
        app_handle.global_shortcut().register(shortcut).map_err(|e| {
            let error_msg = format!("Failed to register shortcut {:?}: {}. This shortcut may already be in use by another application.", shortcut, e);
            println!("❌ {}", error_msg);
            error_msg
        })?;
        println!("✅ Shortcut registered with system: {:?}", shortcut);
        
        Ok(())
    }
    #[cfg(not(desktop))]
    {
        println!("⚠️  Not on desktop platform, skipping shortcut registration");
        Ok(())
    }
}

fn parse_shortcut(shortcut_str: &str) -> Result<Shortcut, Box<dyn std::error::Error>> {
    println!("🔍 Parsing shortcut: '{}'", shortcut_str);
    let parts: Vec<&str> = shortcut_str.split('+').collect();
    println!("📝 Split into parts: {:?}", parts);
    
    let mut modifiers = Modifiers::empty();
    let mut code = None;
    
    for part in parts {
        println!("   Processing part: '{}'", part);
        match part.to_lowercase().as_str() {
            "meta" | "cmd" | "command" => {
                modifiers |= Modifiers::META;
                println!("     → Added META modifier");
            },
            "ctrl" | "control" => {
                modifiers |= Modifiers::CONTROL;
                println!("     → Added CONTROL modifier");
            },
            "alt" | "option" => {
                modifiers |= Modifiers::ALT;
                println!("     → Added ALT modifier");
            },
            "shift" => {
                modifiers |= Modifiers::SHIFT;
                println!("     → Added SHIFT modifier");
            },
            key => {
                println!("     → Processing key code: '{}'", key);
                // Try to parse as a key code
                code = match key {
                    "keya" => Some(Code::KeyA),
                    "keyb" => Some(Code::KeyB),
                    "keyc" => Some(Code::KeyC),
                    "keyd" => Some(Code::KeyD),
                    "keye" => Some(Code::KeyE),
                    "keyf" => Some(Code::KeyF),
                    "keyg" => Some(Code::KeyG),
                    "keyh" => Some(Code::KeyH),
                    "keyi" => Some(Code::KeyI),
                    "keyj" => Some(Code::KeyJ),
                    "keyk" => Some(Code::KeyK),
                    "keyl" => Some(Code::KeyL),
                    "keym" => Some(Code::KeyM),
                    "keyn" => Some(Code::KeyN),
                    "keyo" => Some(Code::KeyO),
                    "keyp" => Some(Code::KeyP),
                    "keyq" => Some(Code::KeyQ),
                    "keyr" => Some(Code::KeyR),
                    "keys" => Some(Code::KeyS),
                    "keyt" => Some(Code::KeyT),
                    "keyu" => Some(Code::KeyU),
                    "keyv" => Some(Code::KeyV),
                    "keyw" => Some(Code::KeyW),
                    "keyx" => Some(Code::KeyX),
                    "keyy" => Some(Code::KeyY),
                    "keyz" => Some(Code::KeyZ),
                    "digit1" => Some(Code::Digit1),
                    "digit2" => Some(Code::Digit2),
                    "digit3" => Some(Code::Digit3),
                    "digit4" => Some(Code::Digit4),
                    "digit5" => Some(Code::Digit5),
                    "digit6" => Some(Code::Digit6),
                    "digit7" => Some(Code::Digit7),
                    "digit8" => Some(Code::Digit8),
                    "digit9" => Some(Code::Digit9),
                    "digit0" => Some(Code::Digit0),
                    "space" => Some(Code::Space),
                    _ => {
                        println!("     ❌ Unknown key code: '{}'", key);
                        None
                    },
                };
                if let Some(parsed_code) = code {
                    println!("     ✅ Parsed key code: {:?}", parsed_code);
                }
                break;
            }
        }
    }
    
    let code = code.ok_or("Invalid key code")?;
    let modifier_option = if modifiers.is_empty() { 
        println!("📝 No modifiers found");
        None 
    } else { 
        println!("📝 Final modifiers: {:?}", modifiers);
        Some(modifiers) 
    };
    
    let shortcut = Shortcut::new(modifier_option, code);
    println!("✅ Created shortcut: {:?}", shortcut);
    Ok(shortcut)
}

#[tauri::command]
pub async fn get_current_shortcut(state: tauri::State<'_, AppState>) -> Result<String, String> {
    println!("🔍 Getting current shortcut from settings...");
    let settings = state.settings.lock().await;
    let shortcut_str = settings.get_shortcut_keys();
    println!("📤 Returning shortcut: '{}'", shortcut_str);
    Ok(shortcut_str)
}

#[tauri::command]
pub async fn update_shortcut(
    app_handle: AppHandle,
    state: tauri::State<'_, AppState>,
    shortcut_keys: String,
) -> Result<(), String> {
    println!("🔄 Update shortcut request received: '{}'", shortcut_keys);
    
    // Validate shortcut format
    println!("🔍 Validating shortcut format...");
    parse_shortcut(&shortcut_keys).map_err(|e| {
        let error_msg = format!("Invalid shortcut format: {}", e);
        println!("❌ Validation failed: {}", error_msg);
        error_msg
    })?;
    println!("✅ Shortcut format validated");
    
    // Unregister current shortcut
    println!("🔄 Unregistering current shortcut...");
    unregister_current_shortcut(&app_handle)?;
    println!("✅ Current shortcut unregistered");
    
    // Update settings
    {
        println!("💾 Updating settings...");
        let mut settings = state.settings.lock().await;
        settings.shortcut_keys = Some(shortcut_keys.clone());
        settings.save().map_err(|e| {
            let error_msg = format!("Failed to save settings: {}", e);
            println!("❌ Settings save failed: {}", error_msg);
            error_msg
        })?;
        println!("✅ Settings updated and saved");
    }
    
    // Register new shortcut
    println!("🔄 Registering new shortcut...");
    let shortcut = parse_shortcut(&shortcut_keys).map_err(|e| {
        let error_msg = format!("Failed to parse shortcut: {}", e);
        println!("❌ Shortcut parsing failed: {}", error_msg);
        error_msg
    })?;
    
    register_transform_shortcut(&app_handle, shortcut).map_err(|e| {
        let error_msg = format!("Failed to register shortcut: {}", e);
        println!("❌ Shortcut registration failed: {}", error_msg);
        error_msg
    })?;
    
    // Update current shortcut
    *CURRENT_SHORTCUT.lock().unwrap() = Some(shortcut);
    println!("✅ Shortcut update completed successfully");
    
    Ok(())
}

#[tauri::command]
pub async fn unregister_shortcut(app_handle: AppHandle) -> Result<(), String> {
    println!("🔄 Unregister shortcut request received");
    let result = unregister_current_shortcut(&app_handle);
    if result.is_ok() {
        println!("✅ Shortcut unregistered successfully");
    }
    result
}

fn unregister_current_shortcut(app_handle: &AppHandle) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let current = *CURRENT_SHORTCUT.lock().unwrap();
        if let Some(shortcut) = current {
            println!("🔄 Unregistering shortcut: {:?}", shortcut);
            app_handle.global_shortcut()
                .unregister(shortcut)
                .map_err(|e| {
                    let error_msg = format!("Failed to unregister shortcut: {}", e);
                    println!("❌ Unregister failed: {}", error_msg);
                    error_msg
                })?;
            println!("✅ Shortcut unregistered: {:?}", shortcut);
        } else {
            println!("⚠️  No current shortcut to unregister");
        }
    }
    Ok(())
}
