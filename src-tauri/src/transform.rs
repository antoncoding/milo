use async_openai::{
    config::OpenAIConfig,
    types::{
        ChatCompletionRequestSystemMessageArgs,
        ChatCompletionRequestUserMessageArgs,
        CreateChatCompletionRequestArgs,
    },
    Client,
};

// Core transformation function that only handles API interaction
pub async fn transform_text(text: &str, prompt: &str, api_key: &str) -> Result<String, String> {
    let config = OpenAIConfig::new().with_api_key(api_key);
    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model("gpt-4o-mini")
        .max_tokens(2000u32)
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
        Ok(response) => {
            response.choices.first()
                .and_then(|choice| choice.message.content.clone())
                .ok_or_else(|| "No completion choices returned from OpenAI".to_string())
        }
        Err(e) => Err(format!("OpenAI API error: {}", e))
    }
}
