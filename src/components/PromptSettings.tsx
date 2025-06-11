import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ToneForm } from "./AddToneForm";

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTone, setEditingTone] = useState<{ name: string; prompt: string } | null>(null);

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
        selected_tone: settings.selected_tone || name, // Only set if none selected
      };
      await invoke("save_settings", { settings: updatedSettings });
      setSettings(updatedSettings);
      setIsFormOpen(false);
      setEditingTone(null);
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

  const handleEdit = (name: string) => {
    setEditingTone({
      name,
      prompt: settings.custom_prompts[name]
    });
    setIsFormOpen(true);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Dynamic header based on current view */}
      <div>
        <div className="mb-2">
          <h1 className="text-2xl text-text-primary">
            {isFormOpen 
              ? (editingTone ? `Edit ${editingTone.name}` : 'Add New Tone')
              : 'Custom Prompts'
            }
          </h1>
        </div>
        <p className="text-sm text-text-secondary mt-1 leading-5">
          {isFormOpen 
            ? (editingTone 
                ? 'Modify the prompt description for this tone' 
                : 'Create a new custom prompt to transform your text in a specific style')
            : 'Create and manage custom prompts to transform your text in different styles. Select a prompt as your default tone or create new ones for different purposes.'
          }
        </p>
      </div>

      {/* Content Section */}
      <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
        {isFormOpen ? (
          <div className="transform transition-all duration-300 ease-in-out animate-in slide-in-from-left-4">
            <ToneForm
              initialName={editingTone?.name}
              initialPrompt={editingTone?.prompt}
              onSave={handleSaveTone}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingTone(null);
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Always show Improve Writing first */}
            {settings.custom_prompts["Improve Writing"] && (
              <div
                key="Improve Writing"
                className={`flex flex-col p-4 mb-4 border rounded-lg cursor-pointer transition-all duration-200 hover:border-border-secondary hover:shadow-sm ${
                  settings.selected_tone === "Improve Writing" 
                    ? 'border-accent-primary bg-accent-primary/5 shadow-sm' 
                    : 'border-border-primary bg-background-secondary'
                }`}
                onClick={() => handleSelectTone("Improve Writing")}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-base ${
                    settings.selected_tone === "Improve Writing" ? 'text-accent-primary' : 'text-text-primary'
                  }`}>Improve Writing</span>
                  <div className="flex gap-2 items-center">
                    {settings.selected_tone === "Improve Writing" && (
                      <svg className="w-5 h-5 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className={`text-sm whitespace-pre-wrap mt-2 ${
                  settings.selected_tone === "Improve Writing" ? 'text-accent-primary' : 'text-text-secondary'
                }`}>{settings.custom_prompts["Improve Writing"]}</div>
              </div>
            )}
            
            {/* Show all other tones */}
            {Object.entries(settings.custom_prompts)
              .filter(([name]) => name !== "Improve Writing")
              .map(([name, prompt]) => (
                <div
                  key={name}
                  className={`flex flex-col p-4 mb-4 border rounded-lg cursor-pointer transition-all duration-200 hover:border-border-secondary hover:shadow-sm ${
                    settings.selected_tone === name 
                      ? 'border-accent-primary bg-accent-primary/5 shadow-sm' 
                      : 'border-border-primary bg-background-secondary'
                  }`}
                  onClick={() => handleSelectTone(name)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-base ${
                      settings.selected_tone === name ? 'text-accent-primary' : 'text-text-primary'
                    }`}>{name}</span>
                    <div className="flex gap-2 items-center">
                      {settings.selected_tone === name && (
                        <svg className="w-5 h-5 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                      <button
                        className="p-1 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-background-tertiary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(name);
                        }}
                      >
                        <svg className="w-5 h-5 text-text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-red-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTone(name);
                        }}
                      >
                        <svg className="w-5 h-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className={`text-sm whitespace-pre-wrap mt-2 ${
                    settings.selected_tone === name ? 'text-accent-primary' : 'text-text-secondary'
                  }`}>{prompt}</div>
                </div>
              ))}
          </div>
        )}
        
        {!isFormOpen && (
          <button 
            className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-border-primary rounded-lg bg-transparent text-text-secondary cursor-pointer transition-all duration-200 hover:border-border-secondary hover:text-text-primary mt-4"
            onClick={() => setIsFormOpen(true)}
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add New Tone
          </button>
        )}
      </div>
    </div>
  );
}
