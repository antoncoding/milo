use tauri::{Manager, Emitter};
use arboard::Clipboard;

use crate::transform::transform_text;
use crate::history::add_transformation_to_history;
use crate::api::get_litellm_api_key;

// Helper function to clean text while preserving formatting
fn clean_text(text: &str) -> String {
    text.lines()
        .map(|line| line.trim())
        .collect::<Vec<_>>()
        .join("\n")
}

// High-level function that handles clipboard transformation AND history tracking
#[tauri::command]
pub async fn transform_clipboard(
    handle: tauri::AppHandle,
    prompt_key: String,
) -> Result<(), String> {
    // Get and clean clipboard content
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let original_text = clipboard
        .get_text()
        .map_err(|e| format!("Failed to get clipboard text: {}", e))?;
    let cleaned_original = clean_text(&original_text);

    // Get the state and prompt
    let state = handle.state::<crate::AppState>();
    let settings = state.settings.lock().await;
    let prompt = settings.custom_prompts.get(&prompt_key)
        .ok_or_else(|| format!("Prompt not found for key: {}", prompt_key))?
        .clone();

    // Get LiteLLM API key and transform
    let litellm_api_key = get_litellm_api_key().await
        .map_err(|e| format!("Failed to get LiteLLM API key: {}", e))?;

    // Drop the lock before async operation
    drop(settings);

    let transformed_text = transform_text(&cleaned_original, &prompt, &litellm_api_key).await?;
    let cleaned_transformed = clean_text(&transformed_text);

    // Set transformed text back to clipboard
    clipboard.set_text(&cleaned_transformed)
        .map_err(|e| format!("Failed to set clipboard text: {}", e))?;

    // Store in history (this is the key addition!)
    add_transformation_to_history(
        prompt_key.clone(),
        cleaned_original,
        cleaned_transformed,
    )?;

    // Emit success notification
    let notification_message = format!("Successfully transformed with \"{}\" tone", prompt_key);
    let _ = handle.emit("transformation_complete", notification_message);

    Ok(())
}

// Function that reads tone from settings and performs transform with history
#[tauri::command]
pub async fn transform_clip_with_setting(handle: tauri::AppHandle, is_shortcut: bool) -> Result<(), String> {
    // Get the state and selected tone
    let state = handle.state::<crate::AppState>();
    let settings = state.settings.lock().await;

    // If is_shortcut, check if shortcut is enabled
    if is_shortcut && !settings.is_shortcut_enabled() {
        return Ok(());
    }

    let tone_key = settings.selected_tone.clone()
        .ok_or_else(|| "No tone selected".to_string())?;

    // Update selected tone in settings
    settings.save()?;

    // Drop the lock before transformation
    drop(settings);

    // Perform transformation (which now includes history tracking)
    transform_clipboard(handle.clone(), tone_key).await
} 