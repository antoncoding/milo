use crate::settings::Settings;
use std::sync::Mutex;
use tokio::sync::Mutex as TokioMutex;

pub struct AppState {
    pub settings: TokioMutex<Settings>,
    pub is_transforming: Mutex<bool>,
}

impl AppState {
    pub fn new(settings: Settings) -> Self {
        Self {
            settings: TokioMutex::new(settings),
            is_transforming: Mutex::new(false),
        }
    }
}
