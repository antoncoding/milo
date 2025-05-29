import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { ApiSettings } from "./components/ApiSettings";
import { PromptSettings } from "./components/PromptSettings";
import { Sidebar } from "./components/Sidebar";
import { InfoPage } from "./components/InfoPage";
  
interface Settings {
  openai_model: string;
  custom_prompts: {
    [key: string]: string;
  };
  selected_tone?: string;
  firstVisitComplete?: boolean;
  shortcutEnabled?: boolean;
}

function App() {
  const [settings, setSettings] = useState<Settings>({ 
    openai_model: "", 
    custom_prompts: {},
    firstVisitComplete: false,
    shortcutEnabled: true
  });
  const [activeSection, setActiveSection] = useState("info");
  const [loading, setLoading] = useState(true);

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

    // Load settings
    invoke("get_settings")
      .then((savedSettings: any) => {
        setSettings(savedSettings as any as Settings);
        // Set initial section based on whether it's first visit
        if (!savedSettings.firstVisitComplete) {
          setActiveSection('info');
        } else {
          setActiveSection('prompts');
        }
        setLoading(false);
      })
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

  const handleFirstVisitComplete = async () => {
    const updatedSettings = { ...settings, firstVisitComplete: true };
    await invoke("save_settings", { settings: updatedSettings });
    setSettings(updatedSettings);
    setActiveSection('prompts');
  };

  const renderContent = () => {
    if (loading) {
      return <div className="flex items-center justify-center min-h-screen text-slate-600">Loading...</div>;
    }

    switch (activeSection) {
      case 'info':
        return <InfoPage onComplete={!settings.firstVisitComplete ? handleFirstVisitComplete : undefined} />;
      case 'prompts':
        return <PromptSettings settings={settings} setSettings={setSettings} />;
      case 'api':
        return <ApiSettings />;
      default:
        return <PromptSettings settings={settings} setSettings={setSettings} />;
    }
  };

  return (
    <>
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
      />
      <div className="ml-14 min-h-screen">
        <div className="mx-auto px-8 py-8 max-w-3xl">
          {renderContent()}
        </div>
      </div>
    </>
  );
}

export default App;
