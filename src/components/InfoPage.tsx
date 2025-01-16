import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import miloLogo from "../assets/icon.png";
import "../styles/InfoPage.css";

interface InfoPageProps {
  onComplete?: () => void;
}

export function InfoPage({ onComplete }: InfoPageProps) {
  const [shortcutEnabled, setShortcutEnabled] = useState(true);

  // Load initial shortcut state
  useEffect(() => {
    invoke<any>("get_settings")
      .then((settings) => {
        setShortcutEnabled(settings.shortcut_enabled ?? true);
      })
      .catch(console.error);
  }, []);

  const handleShortcutToggle = async (enabled: boolean) => {
    try {
      // Get current settings first
      const currentSettings = await invoke<any>("get_settings");
      
      // Merge with new shortcut setting
      const updatedSettings = {
        ...currentSettings,
        shortcut_enabled: enabled
      };

      // Save merged settings
      await invoke("save_settings", {
        settings: updatedSettings
      });
      
      setShortcutEnabled(enabled);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  return (
    <div className="info-page">
      <img src={miloLogo} className="logo" alt="Milo logo" />
      <h1>Welcome to Milo</h1>
      
      <div className="info-content">
        <p>
          Milo helps you improve your writing by transforming text in your <span style={{ fontWeight: "bold" }}>clipboard</span>. 
          Simply copy any text and use the shortcut to transform it!
        </p>

        <div className="shortcut-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={shortcutEnabled}
              onChange={(e) => handleShortcutToggle(e.target.checked)}
            />
            Enable keyboard shortcut (⌘ + M)
          </label>
        </div>
      </div>
    </div>
  );
}
