import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';
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
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("api");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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
      .then((savedSettings) => setSettings(savedSettings))
      .catch(console.error);

    const unlisten = listen("transform_clipboard", async () => {
      try {
        console.log("Starting clipboard transformation...");
        setIsLoading(true);
        await invoke("set_transforming_state", { isTransforming: true });

        // Get latest settings before transforming
        const currentSettings = await invoke<Settings>("get_settings");
        console.log("Using tone:", currentSettings.selected_tone);

        await invoke("transform_clipboard", {
          promptKey: currentSettings.selected_tone || "Improve Writing",
        });
        
        console.log("Clipboard transformation complete");
      } catch (error) {
        console.error("Failed to transform clipboard:", error);
      } finally {
        setIsLoading(false);
        await invoke("set_transforming_state", { isTransforming: false });
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

  // Add context menu handler
  useEffect(() => {
    const handleContextMenu = async (e: MouseEvent) => {
      const selection = window.getSelection()?.toString();
      if (selection) {
        e.preventDefault();
        try {
          // Get latest settings before transforming
          const currentSettings = await invoke<Settings>("get_settings");
          console.log("Using tone for selection:", currentSettings.selected_tone);

          const transformed = await invoke('transform_selected_text', {
            selectedText: selection,
            promptKey: currentSettings.selected_tone || 'Improve Writing'
          });
          
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            const input = target as HTMLInputElement | HTMLTextAreaElement;
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            input.value = input.value.substring(0, start) + transformed + input.value.substring(end);
          }
        } catch (error) {
          console.error('Failed to transform text:', error);
          sendNotification({
            title: 'Milo',
            body: 'Failed to transform text',
            icon: '/icon.png'
          });
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
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
