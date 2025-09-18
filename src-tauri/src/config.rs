use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub litellm_base_url: String,
    pub website_url: String,
    pub default_model: String,
}

impl AppConfig {
    pub fn load() -> Self {
        // Load from embedded config file
        let config_str = include_str!("../config.json");
        serde_json::from_str(config_str).unwrap_or_else(|_| Self::default())
    }

    fn default() -> Self {
        Self {
            litellm_base_url: "https://milo-litellm.up.railway.app".to_string(),
            website_url: "https://milomilo.work".to_string(),
            default_model: "gpt-4o-mini".to_string(),
        }
    }
}

// Global config instance
lazy_static::lazy_static! {
    pub static ref CONFIG: AppConfig = AppConfig::load();
}