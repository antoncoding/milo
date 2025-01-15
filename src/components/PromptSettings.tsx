import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AddToneForm } from "./AddToneForm";
import "../styles/SharedStyles.css";

interface Settings {
  openai_model: string;
  custom_prompts: {
    [key: string]: string;
  };
  selected_tone?: string;
}

interface PromptSettingsProps {
  settings: Settings;
  setSettings: (settings: Settings) => void;
}

export function PromptSettings({ settings, setSettings }: PromptSettingsProps) {
  const [isAddingTone, setIsAddingTone] = useState(false);

  const handleSelectTone = async (toneName: string) => {
    try {
      const updatedSettings = {
        ...settings,
        selected_tone: toneName,
      };
      await invoke("save_settings", { settings: updatedSettings });
      setSettings(updatedSettings);
    } catch (error) {
      console.error("Failed to save selected tone:", error);
    }
  };

  const handleSaveTone = async (name: string, prompt: string) => {
    try {
      const updatedSettings = {
        ...settings,
        custom_prompts: {
          ...settings.custom_prompts,
          [name]: prompt,
        },
        selected_tone: name, // Auto-select the new tone
      };
      await invoke("save_settings", { settings: updatedSettings });
      setSettings(updatedSettings);
      setIsAddingTone(false);
    } catch (error) {
      console.error("Failed to save tone:", error);
    }
  };

  const handleDeleteTone = async (toneName: string) => {
    // Prevent deletion of default "Improve Writing" tone
    if (toneName === "Improve Writing") return;

    try {
      const { [toneName]: _, ...remainingPrompts } = settings.custom_prompts;
      const updatedSettings = {
        ...settings,
        custom_prompts: remainingPrompts,
        selected_tone: settings.selected_tone === toneName ? "Improve Writing" : settings.selected_tone,
      };
      await invoke("save_settings", { settings: updatedSettings });
      setSettings(updatedSettings);
    } catch (error) {
      console.error("Failed to delete tone:", error);
    }
  };

  if (isAddingTone) {
    return (
      <AddToneForm
        onSave={handleSaveTone}
        onCancel={() => setIsAddingTone(false)}
      />
    );
  }

  return (
    <div className="tone-settings">
      <div className="tones-list">
        {Object.entries(settings.custom_prompts).map(([name, prompt]) => (
          <button
            key={name}
            className={`tone-item ${settings.selected_tone === name ? 'selected' : ''}`}
            onClick={() => handleSelectTone(name)}
          >
            <div className="tone-item-content">
              <span className="tone-name">{name}</span>
              <div className="tone-actions">
                {settings.selected_tone === name && (
                  <svg className="check-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {name !== "Improve Writing" && (
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTone(name);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <p className="tone-prompt">{prompt}</p>
          </button>
        ))}
        
        <button className="add-tone-button" onClick={() => setIsAddingTone(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add New Tone
        </button>
      </div>
    </div>
  );
}
