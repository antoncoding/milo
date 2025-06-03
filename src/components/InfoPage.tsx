import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { backendFormatToShortcut, Shortcut } from "../utils/keyboardUtils";
import miloLogo from "../assets/icon.png";

export function InfoPage() {
  const [shortcut, setShortcut] = useState<Shortcut>([]);
  const [shortcutEnabled, setShortcutEnabled] = useState(true);

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        console.log("🔄 Frontend: Loading initial settings...");
        const settings = await invoke<any>("get_settings");
        console.log("📥 Frontend: Loaded settings:", settings);
        setShortcutEnabled(settings.shortcut_enabled ?? true);
        
        // Get current shortcut
        console.log("🔄 Frontend: Getting current shortcut...");
        const currentShortcut = await invoke<string>("get_current_shortcut");
        console.log("📥 Frontend: Received shortcut string:", currentShortcut);
        const parsedShortcut = backendFormatToShortcut(currentShortcut);
        console.log("🔄 Frontend: Parsed shortcut array:", parsedShortcut);
        setShortcut(parsedShortcut);
        console.log("✅ Frontend: Initial settings loaded successfully");
      } catch (error) {
        console.error("❌ Frontend: Failed to load settings:", error);
      }
    };
    
    loadSettings();
  }, []);

  const renderShortcutKeys = (keys: Shortcut) => {
    if (keys.length === 0) return "No shortcut set";
    
    return keys.map((key, index) => (
      <span key={index}>
        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
          {key}
        </kbd>
        {index < keys.length - 1 && <span className="mx-1">+</span>}
      </span>
    ));
  };

  return (
    <div className="max-w-3xl mx-auto p-8 text-center flex flex-col items-center justify-center min-h-[80vh]">
      <img src={miloLogo} className="w-24 mb-4" alt="Milo logo" />
      <p className="text-2xl">Welcome to Milo</p>
      
      <div className="mt-8 text-center max-w-md">
        <p className="text-slate-600 leading-relaxed mb-8 text-sm">
          Milo helps you improve your writing by transforming text in your <span className="">clipboard</span>. 
          Simply copy any text and use the shortcut to transform it!
        </p>

        {shortcut.length > 0 && (
          <div className="mx-auto w-full max-w-80 p-4 bg-white/80 border border-gray-200 rounded-lg shadow-sm my-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Current Transform Shortcut:</p>
              <div className="flex justify-center items-center gap-1 mb-2">
                {renderShortcutKeys(shortcut)}
              </div>
              <p className="text-xs text-slate-500">
                Status: <span className={shortcutEnabled ? "text-green-600" : "text-red-600"}>
                  {shortcutEnabled ? "Enabled" : "Disabled"}
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Configure shortcuts in Settings
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
