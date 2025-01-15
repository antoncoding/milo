import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { ApiSettings } from "./components/ApiSettings";
import { PromptSettings } from "./components/PromptSettings";
import { Sidebar } from "./components/Sidebar";
import "./styles/SharedStyles.css";

interface Settings {
  openai_model: string;
  custom_prompts: {
    [key: string]: string;
  };
  selected_tone?: string;
}

function App() {
  const [settings, setSettings] = useState<Settings>({ openai_model: "", custom_prompts: {} });
  const [activeSection, setActiveSection] = useState("api");

  useEffect(() => {
    console.log("App mounted, loading settings...");

    // Initialize notifications
    async function initNotifications() {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
    }
    initNotifications();

    // Listen for notifications
    const unlistenNotification = listen('notification', (event) => {
      sendNotification({
        title: 'Milo',
        body: event.payload as string,
        icon: '/icon.png'
      });
    });

    invoke("get_settings")
      .then((savedSettings) => setSettings(savedSettings as any as Settings))
      .catch(console.error);

    const unlisten = listen("transform_clipboard", async () => {
      try {
        console.log("Starting clipboard transformation...");

        // Get latest settings before transforming
        const currentSettings = await invoke<Settings>("get_settings");
        console.log("Using tone:", currentSettings.selected_tone);

        await invoke("transform_clipboard", {
          promptKey: currentSettings.selected_tone || "Improve Writing",
        });
        
        console.log("Clipboard transformation complete");
      } catch (error) {
        console.error("Failed to transform clipboard:", error);
      }
    });

    // Listen for transformation complete events
    const unlistenTransform = listen('transformation_complete', (event) => {
      sendNotification({
        title: 'Milo',
        body: event.payload as string,
        icon: '/icon.png'
      });
    });

    return () => {
      unlisten.then((fn) => fn());
      unlistenNotification.then(fn => fn());
      unlistenTransform.then(fn => fn());
    };
  }, []);

  return (
    <>
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
      />
      <div className="main-content">
        <div className="container">
          <h1>Milo Settings</h1>
          {activeSection === 'api' ? (
            <ApiSettings />
          ) : (
            <PromptSettings settings={settings} setSettings={setSettings} />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
