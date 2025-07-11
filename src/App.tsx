import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { ThemeProvider } from "./context/ThemeContext";
import { Settings } from "./components/ApiSettings";
import { PromptSettings } from "./components/PromptSettings";
import { Sidebar } from "./components/Sidebar";
import { InfoPage } from "./components/InfoPage";
import { History } from "./components/History";
import { Dashboard } from "./components/Dashboard";
  
interface Settings {
  openai_model: string;
  custom_prompts: {
    [key: string]: string;
  };
  prompt_order: string[];
  selected_tone?: string;
  first_visit_complete?: boolean;
  shortcut_enabled?: boolean;
  shortcut_keys?: string;
  theme?: string;
}

function App() {
  const [settings, setSettings] = useState<Settings>({ 
    openai_model: "", 
    custom_prompts: {},
    prompt_order: [],
    first_visit_complete: false,
    shortcut_enabled: true
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
        if (!savedSettings.first_visit_complete) {
          setActiveSection('info');
        } else {
          setActiveSection('dashboard');
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

    // Listen for navigation events from tray
    const unlistenNavigate = listen('navigate-to-section', (event) => {
      const section = event.payload as string;
      console.log('Navigation event received:', section);
      setActiveSection(section);
    });

    return () => {
      unlisten.then((fn) => fn());
      unlistenNotification.then(fn => fn());
      unlistenTransform.then(fn => fn());
      unlistenNavigate.then(fn => fn());
    };
  }, []);

  const renderContent = () => {
    if (loading) {
      return <div className="flex items-center justify-center min-h-screen text-text-secondary">Loading...</div>;
    }

    switch (activeSection) {
      case 'info':
        return <InfoPage />;
      case 'prompts':
        return <PromptSettings settings={settings} setSettings={setSettings} />;
      case 'api':
        return <Settings />;
      case 'history':
        return <History />;
      case 'dashboard':
        return <Dashboard />;
      default:
        return <PromptSettings settings={settings} setSettings={setSettings} />;
    }
  };

  return (
    <ThemeProvider>
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
      />
      <div className="ml-14 min-h-screen">
        <div className="mx-auto px-8 py-8 max-w-3xl">
          {renderContent()}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
