use std::{
    panic::{catch_unwind, AssertUnwindSafe},
    process::Command,
};

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Attempts to show a system notification while shielding the dev runtime from
/// macOS-specific panics. In development on macOS we fall back to `osascript`
/// so the Tokio worker doesn't abort when the native bridge returns null.
pub fn show_notification(handle: &AppHandle, title: impl Into<String>, body: impl Into<String>) {
    let title: String = title.into();
    let body: String = body.into();

    if tauri::is_dev() {
        match show_dev_notification(&title, &body) {
            Ok(()) => return,
            Err(err) => {
                println!("⚠️ Dev notification fallback failed: {}", err);
            }
        }
    }

    let context = format!("title='{}', body='{}'", title, body);

    let title_for_closure = title.clone();
    let body_for_closure = body.clone();
    let app_handle = handle.clone();

    let result = catch_unwind(AssertUnwindSafe(move || {
        app_handle
            .notification()
            .builder()
            .title(title_for_closure)
            .body(body_for_closure)
            .show()
    }));

    match result {
        Ok(Ok(())) => {}
        Ok(Err(err)) => {
            println!("⚠️ Failed to show notification ({}): {}", context, err);
        }
        Err(_) => {
            println!(
                "⚠️ Notification panicked while showing ({}); continuing without crash.",
                context
            );
        }
    }
}

fn show_dev_notification(title: &str, body: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "display notification \"{}\" with title \"{}\"",
            escape_osascript(body),
            escape_osascript(title)
        );

        let status = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .status()
            .map_err(|e| format!("failed to spawn osascript: {}", e))?;

        if status.success() {
            Ok(())
        } else {
            Err(format!("osascript exited with status {}", status))
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (title, body);
        Err("dev notification fallback not supported on this platform".to_string())
    }
}

#[cfg(target_os = "macos")]
fn escape_osascript(input: &str) -> String {
    input.replace('"', "\\\"")
}
