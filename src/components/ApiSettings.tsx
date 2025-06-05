import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ask, message } from '@tauri-apps/plugin-dialog';
import { ShortcutItem } from "./ShortcutItem";
import { useShortcutEditor } from "../hooks/useShortcutEditor";
import { backendFormatToShortcut, shortcutToBackendFormat, Shortcut } from "../utils/keyboardUtils";

interface Settings {
  openai_model: string;
  custom_prompts: {
    [key: string]: string;
  };
  selected_tone?: string;
  firstVisitComplete?: boolean;
  shortcutEnabled?: boolean;
}

export function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [settings, setSettings] = useState<Settings>({ 
    openai_model: "", 
    custom_prompts: {},
    firstVisitComplete: false,
    shortcutEnabled: true
  });
  const [shortcut, setShortcut] = useState<Shortcut>([]);
  const [shortcutEnabled, setShortcutEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load API key
      const savedApiKey = await invoke<string>('get_api_key');
      setApiKey(savedApiKey || '');
      
      // Load general settings
      const savedSettings = await invoke<Settings>("get_settings");
      setSettings(savedSettings);
      setShortcutEnabled(savedSettings.shortcutEnabled ?? true);
      
      // Load current shortcut
      const currentShortcut = await invoke<string>("get_current_shortcut");
      const parsedShortcut = backendFormatToShortcut(currentShortcut);
      setShortcut(parsedShortcut);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    try {
      setSaving(true);
      await invoke('save_api_key', { apiKey });
      await message('API key saved successfully!', { title: 'Success', kind: 'info' });
    } catch (error) {
      console.error('Failed to save API key:', error);
      await message('Failed to save API key. Please try again.', { title: 'Error', kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleShortcutToggle = async (enabled: boolean) => {
    try {
      const updatedSettings = {
        ...settings,
        shortcutEnabled: enabled
      };

      await invoke("save_settings", {
        settings: updatedSettings
      });
      
      setSettings(updatedSettings);
      setShortcutEnabled(enabled);
    } catch (error) {
      console.error("Failed to save shortcut settings:", error);
    }
  };

  const changeShortcut = async (newShortcut: Shortcut) => {
    setShortcut(newShortcut);
    try {
      const backendFormat = shortcutToBackendFormat(newShortcut);
      await invoke("update_shortcut", { shortcutKeys: backendFormat });
    } catch (error) {
      console.error("Failed to update shortcut:", error);
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
  } = useShortcutEditor(shortcutEnabled, changeShortcut, setShortcutEnabled);

  const onEditShortcut = async () => {
    openEditModal();
    try {
      await invoke("unregister_shortcut");
    } catch (error) {
      console.error("Failed to unregister shortcut:", error);
    }
  };

  const onCancelShortcut = async () => {
    closeEditModal();
    try {
      const backendFormat = shortcutToBackendFormat(shortcut);
      await invoke("update_shortcut", { shortcutKeys: backendFormat });
    } catch (error) {
      console.error("Failed to restore shortcut:", error);
    }
  };

  const onSaveShortcut = async () => {
    saveShortcut();
  };

  const onToggleEnabled = async () => {
    const newEnabled = !isEnabled;
    await handleShortcutToggle(newEnabled);
    toggleEnabled();
  };

  const clearHistory = async () => {
    const userConfirmed = await ask('Are you sure you want to clear all transformation history? This action cannot be undone.', {
      title: 'Clear History',
      kind: 'warning'
    });
    
    if (userConfirmed) {
      try {
        await invoke('clear_transformation_history');
        await message('History cleared successfully!', { title: 'Success', kind: 'info' });
      } catch (error) {
        console.error('Failed to clear history:', error);
        await message(`Failed to clear history: ${error}. Please try again.`, { title: 'Error', kind: 'error' });
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl text-slate-800">Settings</h1>
        <p className="text-slate-600 mt-1">Configure your Milo preferences</p>
      </div>

      {/* API Key Section */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="mb-4">
          <h2 className="text-lg text-slate-800">OpenAI API Configuration</h2>
          <p className="text-sm text-slate-600">Configure your OpenAI API key for text transformations</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm text-slate-700 mb-2">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Your API key is stored securely on your device and never shared.
            </p>
          </div>
          
          <button
            onClick={saveApiKey}
            disabled={saving || !apiKey.trim()}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save API Key'}
          </button>
        </div>
      </div>

      {/* Shortcut Configuration Section */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="mb-4">
          <h2 className="text-lg text-slate-800">Keyboard Shortcut</h2>
          <p className="text-sm text-slate-600">Configure the global shortcut to transform clipboard text</p>
        </div>
        
        {shortcut.length > 0 && (
          <div className="w-full">
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

      {/* Data Management Section */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="mb-4">
          <h2 className="text-lg text-slate-800">Data Management</h2>
          <p className="text-sm text-slate-600">Manage your transformation history and data</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-slate-800">Clear History</h3>
              <p className="text-xs text-slate-600">Remove all transformation history permanently</p>
            </div>
            <button
              onClick={clearHistory}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            >
              Clear All History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
