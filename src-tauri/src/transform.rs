use crate::config::CONFIG;
use async_openai::{
    config::OpenAIConfig,
    types::{
        ChatCompletionRequestSystemMessageArgs, ChatCompletionRequestUserMessageArgs,
        CreateChatCompletionRequestArgs,
    },
    Client,
};

// Core transformation function that connects to LiteLLM proxy server
pub async fn transform_text(
    text: &str,
    prompt: &str,
    litellm_api_key: &str,
) -> Result<String, String> {
    let config = OpenAIConfig::new()
        .with_api_key(litellm_api_key)
        .with_api_base(&CONFIG.litellm_base_url);
    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model(&CONFIG.default_model)
        .messages([
            ChatCompletionRequestSystemMessageArgs::default()
                .content(prompt)
                .build()
                .map_err(|e| format!("Failed to build system message: {}", e))?
                .into(),
            ChatCompletionRequestUserMessageArgs::default()
                .content(text)
                .build()
                .map_err(|e| format!("Failed to build user message: {}", e))?
                .into(),
        ])
        .build()
        .map_err(|e| format!("Failed to build chat completion request: {}", e))?;

    match client.chat().create(request).await {
        Ok(response) => response
            .choices
            .first()
            .and_then(|choice| choice.message.content.clone())
            .ok_or_else(|| "No completion choices returned from API".to_string()),
        Err(e) => {
            let error_msg = e.to_string();
            if error_msg.contains("429")
                || error_msg.contains("rate limit")
                || error_msg.contains("Rate limit")
            {
                Err("Rate limit exceeded - please top up your account balance".to_string())
            } else if error_msg.contains("401") || error_msg.contains("unauthorized") {
                Err("Invalid API key - please check your credentials".to_string())
            } else if error_msg.contains("403") || error_msg.contains("forbidden") {
                Err("API access forbidden - please check your account status".to_string())
            } else if error_msg.contains("insufficient")
                || error_msg.contains("quota")
                || error_msg.contains("billing")
            {
                Err("Rate limit exceeded - please top up your account balance".to_string())
            } else {
                Err(format!("API error: {}", e))
            }
        }
    }
}
