use std::sync::Mutex;
use arboard::Clipboard;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn transform_clipboard(
    handle: tauri::AppHandle,
    prompt_key: String,
) -> Result<(), String> {
    // Get the state
    let state = handle.state::<crate::AppState>();
    let settings = state.settings.lock().await;
    
    // Get the prompt based on tone
    let prompt = match prompt_key.as_str() {
        "improve" => "Improve this text while maintaining its original tone and meaning",
        "formal" => "Make this text more formal and professional while maintaining its meaning",
        "casual" => "Make this text more casual and friendly while maintaining its meaning",
        _ => settings.custom_prompts.get(&prompt_key)
            .ok_or_else(|| format!("Prompt not found for key: {}", prompt_key))?
    };

    // Get the clipboard content
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to initialize clipboard: {}", e))?;
    
    let text = clipboard.get_text()
        .map_err(|e| format!("Failed to get text from clipboard: {}", e))?;

    println!("Starting text transformation for clipboard text: {}", text);
    
    // Get API key
    let api_key = crate::get_api_key().await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    
    // Transform the text
    let transformed = crate::transform_text(&text, prompt, &api_key).await
        .map_err(|e| format!("Text transformation failed: {}", e))?;
    
    println!("Transformation complete. Transformed text: {}", transformed);
    
    // Set the transformed text back to clipboard
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to initialize clipboard for writing: {}", e))?;
    
    clipboard.set_text(transformed.clone())
        .map_err(|e| format!("Failed to set transformed text to clipboard: {}", e))?;
    
    // Send notification with icon
    handle.emit_all("notification", format!("Text transformed to {} style!", 
        match prompt_key.as_str() {
            "improve" => "improved",
            "formal" => "formal",
            "casual" => "casual",
            _ => "custom"
        }))
        .map_err(|e| format!("Failed to send notification: {}", e))?;

    println!("Transformed text set to clipboard successfully");
    Ok(())
}

#[tauri::command]
pub async fn transform_selected_text(
    handle: tauri::AppHandle,
    selected_text: String,
    prompt_key: String,
) -> Result<String, String> {
    // Get the state
    let state = handle.state::<crate::AppState>();
    let settings = state.settings.lock().await;
    
    // Find the prompt
    let prompt = settings.custom_prompts.get(&prompt_key)
        .ok_or_else(|| format!("Prompt not found for key: {}", prompt_key))?;

    println!("Starting text transformation for selected text: {}", selected_text);
    
    // Get API key
    let api_key = crate::get_api_key().await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    
    // Transform the text (using your existing transformation logic)
    let transformed_text = crate::transform_text(&selected_text, prompt, &api_key).await
        .map_err(|e| format!("Failed to transform text: {}", e))?;

    // Send a notification
    handle.emit_all("transformation_complete", "Text transformed successfully!")
        .map_err(|e| format!("Failed to send notification: {}", e))?;

    Ok(transformed_text)
}
