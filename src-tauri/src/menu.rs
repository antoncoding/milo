use arboard::Clipboard;
use tauri::{Manager};

#[tauri::command]
pub async fn transform_clipboard(
    handle: tauri::AppHandle,
    prompt_key: String,
) -> Result<(), String> {
    // Get the state
    let state = handle.state::<crate::AppState>();
    let mut settings = state.settings.lock().await;
    
    // Update selected tone
    settings.selected_tone = Some(prompt_key.clone());
    settings.save()?;

    println!("Starting text key: {}", prompt_key);
    
    // Get the prompt based on selected tone
    let prompt = settings.custom_prompts.get(&prompt_key)
        .ok_or_else(|| format!("Prompt not found for key: {}", prompt_key))?;

    // Get the clipboard content
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to initialize clipboard: {}", e))?;
    
    let text = clipboard.get_text()
        .map_err(|e| format!("Failed to get text from clipboard: {}", e))?;

    println!("Starting text transformation with prompt: {}", prompt);
    println!("Clipboard text: {}", text);
    
    // Get API key
    let api_key = crate::get_api_key().await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    
    // Transform the text
    let transformed = crate::transform_text(&text, prompt, &api_key).await
        .map_err(|e| format!("Text transformation failed: {}", e))?;
    
    println!("Transformation complete. Setting to clipboard...");
    
    // Set the transformed text back to clipboard
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to initialize clipboard for writing: {}", e))?;
    
    clipboard.set_text(transformed.clone())
        .map_err(|e| format!("Failed to set transformed text to clipboard: {}", e))?;
    
    // Send notification
    handle.emit_all("notification", format!("Text transformed with {} tone!", prompt_key))
        .map_err(|e| format!("Failed to send notification: {}", e))?;

    println!("Transformed text set to clipboard successfully");
    Ok(())
}
