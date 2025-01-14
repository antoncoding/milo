use std::process::Command;

#[cfg(target_os = "macos")]
pub fn get_selected_text() -> Result<String, String> {
    let script = r#"
        tell application "System Events"
            set selectedText to ""
            keystroke "c" using {command down}
            delay 0.1
            set selectedText to the clipboard
            return selectedText
        end tell
    "#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .map_err(|e| format!("Failed to parse selected text: {}", e))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[cfg(target_os = "macos")]
pub fn set_text(text: String) -> Result<(), String> {
    let script = format!(
        r#"
        set the clipboard to "{}"
        tell application "System Events"
            keystroke "v" using {{command down}}
        end tell
    "#,
        text.replace("\"", "\\\"")
    );

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
