use tauri::{App, Window, webview::WebviewWindow};

pub fn default(app: &App, window: WebviewWindow) {
    #[cfg(target_os = "macos")]
    macos::default(app, window);
}

#[cfg(target_os = "macos")]
mod macos {
    use tauri::{App, Window, webview::WebviewWindow};

    pub fn default(_app: &App, window: WebviewWindow) {
        // Set the window to be visible on all workspaces
        window.set_always_on_top(true).unwrap();
    }
}