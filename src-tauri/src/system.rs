#[cfg(target_os = "macos")]
pub fn move_window_to_active_space(webview_window: &tauri::WebviewWindow) -> Result<(), String> {
    extern crate cocoa;
    extern crate objc;
    use cocoa::appkit::{NSWindow, NSWindowCollectionBehavior};
    use cocoa::base::nil;
    use objc::runtime::Object;
    
    let ns_window_ptr = webview_window.ns_window()
        .map_err(|e| format!("Failed to get NSWindow: {}", e))?;
        
    let ns_window = ns_window_ptr as *mut Object;
    unsafe {
        // Set collection behavior for proper desktop switching
        ns_window.setCollectionBehavior_(
            NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace,
        );
        
        // Multiple attempts to ensure focus is maintained
        ns_window.makeKeyAndOrderFront_(nil);
        
        // Small delay and try again to ensure focus sticks
        std::thread::sleep(std::time::Duration::from_millis(10));
        ns_window.makeKeyAndOrderFront_(nil);
    }
    Ok(())
}
