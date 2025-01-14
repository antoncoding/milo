import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';

interface Settings {
  openai_model: string;
  custom_prompts: {
    [key: string]: string;
  };
}

function App() {
  const [apiKey, setApiKey] = useState("");
  const [settings, setSettings] = useState<Settings>({ openai_model: "", custom_prompts: {} });
  const [prompt, setPrompt] = useState("");
  const [promptName, setPromptName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

    invoke<string>("get_api_key")
      .then((key) => setApiKey(key))
      .catch(console.error);

    invoke("get_settings")
      .then((savedSettings) => setSettings(savedSettings))
      .catch(console.error);

    const unlisten = listen("transform_clipboard", async () => {
      try {
        console.log("Starting clipboard transformation...");
        setIsLoading(true);
        await invoke("set_transforming_state", { isTransforming: true });

        await invoke("transform_clipboard", {
          promptKey: "Improve Writing",
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
        // Only show context menu if text is selected
        e.preventDefault();
        try {
          const transformed = await invoke('transform_selected_text', {
            selectedText: selection,
            promptKey: 'Improve Writing' // You might want to make this configurable
          });
          
          // If we're in an input field, replace the selected text
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

  const handleSaveApiKey = async () => {
    try {
      console.log("Saving API key...");
      await invoke("save_api_key", { key: apiKey });
      console.log("API key saved successfully");
      
      setApiKeyStatus({ message: "API key saved successfully!", type: 'success' });
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setApiKeyStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to save API key:", error);
      setApiKeyStatus({ 
        message: "Failed to save API key. Please try again.", 
        type: 'error' 
      });
      
      // Clear the error message after 3 seconds
      setTimeout(() => {
        setApiKeyStatus(null);
      }, 3000);
    }
  };

  const handleSavePrompt = async () => {
    if (!promptName || !prompt) {
      console.error("Prompt name and content are required");
      return;
    }

    try {
      console.log("Saving prompt...");
      const updatedSettings = {
        ...settings,
        custom_prompts: {
          ...settings.custom_prompts,
          [promptName]: prompt,
        },
      };

      await invoke("save_settings", { settings: updatedSettings });
      setSettings(updatedSettings);
      setPrompt("");
      setPromptName("");
      console.log("Prompt saved successfully");
    } catch (error) {
      console.error("Failed to save prompt:", error);
    }
  };

  return (
    <div className="container">
      <h1>Milo Settings</h1>
      <div className="settings-section">
        <h2>OpenAI API Key</h2>
        <div className="row">
          <input
            type="password"
            placeholder="Enter your OpenAI API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button onClick={handleSaveApiKey}>Save API Key</button>
        </div>
        {apiKeyStatus && (
          <div className={`status-message status-${apiKeyStatus.type}`}>
            {apiKeyStatus.message}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>Custom Prompts</h2>
        <div className="prompts-list">
          {Object.entries(settings.custom_prompts).map(([name, content]) => (
            <div key={name} className="prompt-item">
              <div className="prompt-header">
                <h3>{name}</h3>
                <button
                  className="delete-btn"
                  onClick={async () => {
                    const { [name]: _, ...rest } = settings.custom_prompts;
                    const updatedSettings = {
                      ...settings,
                      custom_prompts: rest,
                    };
                    await invoke("save_settings", { settings: updatedSettings });
                    setSettings(updatedSettings);
                  }}
                >
                  Delete
                </button>
              </div>
              <p>{content}</p>
            </div>
          ))}
        </div>

        <div className="add-prompt">
          <input
            type="text"
            placeholder="Prompt Name"
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
          />
          <textarea
            placeholder="Prompt Content"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button onClick={handleSavePrompt}>Add Prompt</button>
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <p>Transforming text...</p>
        </div>
      )}
    </div>
  );
}

export default App;
