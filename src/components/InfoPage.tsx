import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import miloLogo from "../assets/icon.png";
import "../styles/InfoPage.css";

interface InfoPageProps {
  onComplete?: () => void;
}

export function InfoPage({ onComplete }: InfoPageProps) {
  const [shortcutEnabled, setShortcutEnabled] = useState(true);

  const handleShortcutToggle = async (enabled: boolean) => {
    try {
      setShortcutEnabled(enabled);
      await invoke("save_settings", {
        settings: {
          shortcutEnabled: enabled,
        }
      });
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
