import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import "../styles/InfoPage.css";
import { ShortcutItem } from "./ShortcutItem";
import { useShortcutEditor } from "../hooks/useShortcutEditor";
import { backendFormatToShortcut, shortcutToBackendFormat, Shortcut } from "../utils/keyboardUtils";
import miloLogo from "../assets/icon.png";

interface InfoPageProps {
  onComplete?: () => void;
}

export function InfoPage({ onComplete }: InfoPageProps) {
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

  const changeShortcut = async (newShortcut: Shortcut) => {
    console.log("🔄 Frontend: Changing shortcut to:", newShortcut);
    setShortcut(newShortcut);
    try {
      const backendFormat = shortcutToBackendFormat(newShortcut);
      console.log("📤 Frontend: Sending to backend:", backendFormat);
      await invoke("update_shortcut", { shortcutKeys: backendFormat });
      console.log("✅ Frontend: Shortcut update successful");
    } catch (error) {
      console.error("❌ Frontend: Failed to update shortcut:", error);
    }
  };

  const {
    isEnabled,
    isModalOpen,
    currentKeys,
    toggleEnabled,
    openEditModal,
    closeEditModal,
    saveShortcut
  } = useShortcutEditor(shortcut, shortcutEnabled, changeShortcut, setShortcutEnabled);

  const onEditShortcut = async () => {
    console.log("🔄 Frontend: Starting shortcut edit");
    openEditModal();
    try {
      await invoke("unregister_shortcut");
      console.log("✅ Frontend: Shortcut unregistered for editing");
    } catch (error) {
      console.error("❌ Frontend: Failed to unregister shortcut:", error);
    }
  };

  const onCancelShortcut = async () => {
    console.log("🔄 Frontend: Canceling shortcut edit");
    closeEditModal();
    try {
      const backendFormat = shortcutToBackendFormat(shortcut);
      console.log("📤 Frontend: Restoring shortcut:", backendFormat);
      await invoke("update_shortcut", { shortcutKeys: backendFormat });
      console.log("✅ Frontend: Shortcut restored");
    } catch (error) {
      console.error("❌ Frontend: Failed to restore shortcut:", error);
    }
  };

  const onSaveShortcut = async () => {
    console.log("🔄 Frontend: Saving shortcut");
    saveShortcut();
  };

  const onToggleEnabled = async () => {
    const newEnabled = !isEnabled;
    await handleShortcutToggle(newEnabled);
    toggleEnabled();
  };

  return (
    <div className="info-page">
      <img src={miloLogo} className="logo" alt="Milo logo" />
      <p className="text-2xl text-red">Welcome to Milo</p>
      
      <div className="info-content">
        <p>
          Milo helps you improve your writing by transforming text in your <span style={{ fontWeight: "bold" }}>clipboard</span>. 
          Simply copy any text and use the shortcut to transform it!
        </p>

        {shortcut.length > 0 && (
          <div className="shortcut-settings">
            <ShortcutItem
              shortcut={shortcut}
              isEnabled={isEnabled}
              isModalOpen={isModalOpen}
              currentKeys={currentKeys}
              onToggleEnabled={onToggleEnabled}
              onEdit={onEditShortcut}
              onSave={onSaveShortcut}
              onCancel={onCancelShortcut}
            />
          </div>
        )}
      </div>
    </div>
  );
}
