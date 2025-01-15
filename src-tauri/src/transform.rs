use arboard::Clipboard;
use tauri::{Manager};
use async_openai::{
    config::OpenAIConfig,
    types::CreateCompletionRequestArgs,
    Client,
};
use tauri_plugin_notification::NotificationExt;
use crate::api::get_api_key;

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
    let api_key = get_api_key().await
        .map_err(|e| format!("Failed to get API key: {}", e))?;
    
    // Transform the text
    let transformed_text = transform_text(&cleaned_text, prompt, &api_key).await
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
    handle.notification()
            .builder()
            .title("Milo")
            .body(format!("Text transformed with {} tone!", prompt_key))
            .show()
            .unwrap();

    println!("Transformed text set to clipboard successfully");
    Ok(())
}
