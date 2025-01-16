use arboard::Clipboard;
use tauri::{Manager};
use async_openai::{
    config::OpenAIConfig,
    types::CreateCompletionRequestArgs,
    Client,
};
use tauri_plugin_notification::NotificationExt;
use crate::api::get_api_key;

// Core transformation function that only handles API interaction
pub async fn transform_text(text: &str, prompt: &str, api_key: &str) -> Result<String, String> {
    let config = OpenAIConfig::new().with_api_key(api_key);
    let client = Client::with_config(config);

    let request = CreateCompletionRequestArgs::default()
        .model("gpt-3.5-turbo-instruct")
        .prompt(format!("{}\n\nText: {}", prompt, text))
        .max_tokens(2000u16)
        .temperature(0.7)
        .build()
        .map_err(|e| format!("Failed to build completion request: {}", e))?;

    match client.completions().create(request).await {
        Ok(response) => {
            response.choices.first()
                .map(|choice| choice.text.clone())
                .ok_or_else(|| "No completion choices returned from OpenAI".to_string())
        }
        Err(e) => Err(format!("OpenAI API error: {}", e))
    }
}

// Helper function to clean text
fn clean_text(text: &str) -> String {
    text.lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

// Function that handles clipboard transformation without updating settings
#[tauri::command]
pub async fn transform_clipboard(
    handle: tauri::AppHandle,
    prompt_key: String,
) -> Result<(), String> {
    // Get and clean clipboard content
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let text = clipboard
        .get_text()
        .map_err(|e| format!("Failed to get clipboard text: {}", e))?;
    let cleaned_text = clean_text(&text);

    // Get the state and prompt
    let state = handle.state::<crate::AppState>();
    let settings = state.settings.lock().await;
    let prompt = settings.custom_prompts.get(&prompt_key)
        .ok_or_else(|| format!("Prompt not found for key: {}", prompt_key))?;
    
    // Get API key and transform
    let api_key = get_api_key().await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    let transformed_text = transform_text(&cleaned_text, prompt, &api_key).await?;
    
    // Set transformed text back to clipboard
    clipboard.set_text(clean_text(&transformed_text))
        .map_err(|e| format!("Failed to set clipboard text: {}", e))?;

    // Send notification
    handle.notification()
        .builder()
        .title("Milo")
        .body(format!("Text transformed with {} tone!", prompt_key))
        .show()
        .unwrap();

    Ok(())
}

// Function that reads tone from settings and performs transform
#[tauri::command]
pub async fn transform_clip_with_setting(handle: tauri::AppHandle) -> Result<(), String> {
    // Get the state and selected tone
    let state = handle.state::<crate::AppState>();
    let settings = state.settings.lock().await;
    
    let tone_key = settings.selected_tone.clone()
        .ok_or_else(|| "No tone selected".to_string())?;
    
    // Update selected tone in settings
    settings.save()?;
    
    // Drop the lock before transformation
    drop(settings);
    
    // Perform transformation
    transform_clipboard(handle.clone(), tone_key).await
}
