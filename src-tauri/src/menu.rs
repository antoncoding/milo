use arboard::Clipboard;
use tauri::{Manager, menu::MenuBuilder, Emitter};

pub fn create_app_menu(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let menu = MenuBuilder::new(app)
        .text("Transform", "transform")
        .text("Settings", "settings")
        .separator()
        .text("Quit", "quit")
        .build()?;

    app.set_menu(menu)?;
    Ok(())
}

#[tauri::command]
pub async fn transform_clipboard(
    handle: tauri::AppHandle,
    prompt_key: String,
) -> Result<(), String> {
    // Get clipboard content
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let text = clipboard
        .get_text()
        .map_err(|e| format!("Failed to get clipboard text: {}", e))?;

    // Clean up the text - remove excessive whitespace and normalize line breaks
    let cleaned_text = text
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ");

    // Get the state
    let state = handle.state::<crate::AppState>();
    let mut settings = state.settings.lock().await;
    
    // Update selected tone
    settings.selected_tone = Some(prompt_key.clone());
    settings.save()?;
    
    // Get the prompt
    let prompt = settings.custom_prompts.get(&prompt_key)
        .ok_or_else(|| format!("Prompt not found for key: {}", prompt_key))?;

    println!("Starting text transformation with prompt: {}", prompt);
    println!("Clipboard text: {}", cleaned_text);
    
    // Get API key
    let api_key = crate::get_api_key().await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    
    // Transform the text
    let transformed_text = crate::transform_text(&cleaned_text, prompt, &api_key).await
        .map_err(|e| format!("Failed to transform text: {}", e))?;

    // Clean up transformed text before setting to clipboard
    let final_text = transformed_text
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ");

    // Set transformed text back to clipboard
    clipboard
        .set_text(final_text)
        .map_err(|e| format!("Failed to set clipboard text: {}", e))?;

    // Send a notification
    handle.app_handle().emit("transformation_complete", format!("Text transformed with {} tone!", prompt_key))
        .map_err(|e| format!("Failed to send notification: {}", e))?;

    println!("Transformed text set to clipboard successfully");
    Ok(())
}
