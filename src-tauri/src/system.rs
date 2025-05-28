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
        ns_window.makeKeyAndOrderFront_(nil);
        ns_window.setCollectionBehavior_(
            NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace,
        );
    }
    Ok(())
}
