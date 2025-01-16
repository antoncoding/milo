use anyhow::Result;
use dirs::config_dir;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub openai_model: String,
    pub custom_prompts: HashMap<String, String>,
    pub selected_tone: Option<String>,
    pub first_visit_complete: Option<bool>,
    pub shortcut_enabled: Option<bool>,
}

impl Default for Settings {
    fn default() -> Self {
        let mut custom_prompts = HashMap::new();
        custom_prompts.insert(
            "Improve Writing".to_string(),
            "Improve this text while maintaining its meaning:".to_string(),
        );
        Self {
            openai_model: "gpt-4o-mini".to_string(),
            custom_prompts,
            selected_tone: Some("Improve Writing".to_string()),
            first_visit_complete: Some(false),
            shortcut_enabled: Some(true),
        }
    }
}

impl Settings {
    pub fn load() -> Self {
        fs::read_to_string(settings_file_path())
            .ok()
            .and_then(|contents| serde_json::from_str(&contents).ok())
            .unwrap_or_default()
    }

    pub fn save(&self) -> Result<(), String> {
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(settings_file_path(), json).map_err(|e| e.to_string())
    }

    pub fn is_shortcut_enabled(&self) -> bool {
        self.shortcut_enabled.unwrap_or(true)
    }
}

pub fn settings_file_path() -> PathBuf {
    let mut path = config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("milo");
    fs::create_dir_all(&path).unwrap();
    path.push("settings.json");
    path
}

pub fn api_key_file_path() -> PathBuf {
    let mut path = config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("milo");
    fs::create_dir_all(&path).unwrap();
    path.push("api_key.txt");
    path
}
