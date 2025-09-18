use anyhow::Result;
use dirs::config_dir;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub openai_model: String,
    pub custom_prompts: HashMap<String, String>,
    #[serde(default)]
    pub prompt_order: Vec<String>,
    pub selected_tone: Option<String>,
    pub first_visit_complete: Option<bool>,
    pub shortcut_enabled: Option<bool>,
    pub shortcut_keys: Option<String>,
    pub theme: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        let mut custom_prompts = HashMap::new();
        custom_prompts.insert(
            "Improve Writing".to_string(),
            "Improve this text while maintaining its meaning:".to_string(),
        );
        Self {
            openai_model: crate::config::CONFIG.default_model.clone(),
            custom_prompts,
            prompt_order: vec!["Improve Writing".to_string()],
            selected_tone: Some("Improve Writing".to_string()),
            first_visit_complete: Some(false),
            shortcut_enabled: Some(true),
            shortcut_keys: Some("meta+KeyM".to_string()),
            theme: Some("light".to_string()),
        }
    }
}

impl Settings {
    pub fn load() -> Self {
        let mut settings: Settings = fs::read_to_string(settings_file_path())
            .ok()
            .and_then(|contents| serde_json::from_str(&contents).ok())
            .unwrap_or_default();

        // Ensure backward compatibility: populate prompt_order if missing or empty
        if settings.prompt_order.is_empty() && !settings.custom_prompts.is_empty() {
            let mut prompt_names: Vec<String> = settings.custom_prompts.keys().cloned().collect();
            // Ensure "Improve Writing" comes first if it exists
            if let Some(pos) = prompt_names.iter().position(|x| x == "Improve Writing") {
                let improve_writing = prompt_names.remove(pos);
                prompt_names.insert(0, improve_writing);
            }
            settings.prompt_order = prompt_names;

            // Save the updated settings immediately to persist the migration
            let _ = settings.save();
        }

        settings
    }

    pub fn save(&self) -> Result<(), String> {
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(settings_file_path(), json).map_err(|e| e.to_string())
    }

    pub fn is_shortcut_enabled(&self) -> bool {
        self.shortcut_enabled.unwrap_or(true)
    }

    pub fn get_shortcut_keys(&self) -> String {
        self.shortcut_keys
            .clone()
            .unwrap_or_else(|| "meta+KeyM".to_string())
    }

    pub fn get_theme(&self) -> String {
        self.theme.clone().unwrap_or_else(|| "light".to_string())
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

pub fn litellm_api_key_file_path() -> PathBuf {
    let mut path = config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("milo");
    fs::create_dir_all(&path).unwrap();
    path.push("litellm_api_key.txt");
    path
}
