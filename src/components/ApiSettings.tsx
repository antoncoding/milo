import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ask, message } from '@tauri-apps/plugin-dialog';
import { open } from '@tauri-apps/plugin-shell';
import { ShortcutItem } from "./ShortcutItem";
import { ThemeSelector } from "./ThemeSelector";
import { useShortcutEditor } from "../hooks/useShortcutEditor";
import { backendFormatToShortcut, shortcutToBackendFormat, Shortcut } from "../utils/keyboardUtils";
import { CONFIG } from "../config";

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
  const [litellmApiKey, setLitellmApiKey] = useState("");
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

      // Load API keys
      const savedApiKey = await invoke<string>('get_api_key');
      setApiKey(savedApiKey || '');

      const savedLitellmApiKey = await invoke<string>('get_litellm_api_key');
      setLitellmApiKey(savedLitellmApiKey || '');
      
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

  const saveLitellmApiKey = async () => {
    try {
      setSaving(true);
      await invoke('save_litellm_api_key', { key: litellmApiKey });
      await message('LiteLLM API key saved successfully!', { title: 'Success', kind: 'info' });
    } catch (error) {
      console.error('Failed to save LiteLLM API key:', error);
      await message('Failed to save API key. Please try again.', { title: 'Error', kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openWebsite = async () => {
    try {
      const url = CONFIG?.website_url ?? '';
      await open(url);
    } catch (error) {
      console.error('Failed to open website:', error);
      const fallbackUrl = CONFIG?.website_url ?? '';
      await message(`Failed to open website. Please visit: ${fallbackUrl}`, { title: 'Error', kind: 'error' });
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
          <div className="h-8 bg-border-primary rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-border-primary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Configure your Milo preferences</p>
      </div>

      {/* API Key Section */}
      <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
        <div className="mb-4">
          <h2 className="text-lg text-text-primary">Milo API Configuration</h2>
          <p className="text-sm text-text-secondary">Configure your Milo API key for text transformations</p>
        </div>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-accent-primary/10 border border-accent-primary/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                <svg className="w-5 h-5 text-accent-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-text-primary mb-1">
                  Get your API key from our website
                </h3>
                <p className="text-xs text-text-secondary mb-3">
                  You need a Milo API key from our website to use text transformations. This connects to our LiteLLM proxy server.
                </p>
                <button
                  onClick={openWebsite}
                  className="inline-flex items-center px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-primary/90 transition-colors"
                >
                  <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Get API Key
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="litellmApiKey" className="block text-sm text-text-primary mb-2">
              Milo API Key
            </label>
            <input
              id="litellmApiKey"
              type="password"
              value={litellmApiKey}
              onChange={(e) => setLitellmApiKey(e.target.value)}
              placeholder="milo-..."
              className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary bg-background-primary text-text-primary"
            />
            <p className="text-xs text-text-tertiary mt-1">
              Your API key is stored securely on your device and never shared.
            </p>
          </div>

          <button
            onClick={saveLitellmApiKey}
            disabled={saving || !litellmApiKey.trim()}
            className="px-3 py-2 text-sm bg-background-tertiary text-text-secondary hover:bg-border-primary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save API Key'}
          </button>
        </div>
      </div>

      {/* Theme Selection Section */}
      <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
        <div className="mb-4">
          <h2 className="text-lg text-text-primary">Appearance</h2>
          <p className="text-sm text-text-secondary">Choose your preferred theme</p>
        </div>
        
        <ThemeSelector />
      </div>

      {/* Shortcut Configuration Section */}
      <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
        <div className="mb-4">
          <h2 className="text-lg text-text-primary">Keyboard Shortcut</h2>
          <p className="text-sm text-text-secondary">Configure the global shortcut to transform clipboard text</p>
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
      <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
        <div className="mb-4">
          <h2 className="text-lg text-text-primary">Data Management</h2>
          <p className="text-sm text-text-secondary">Manage your transformation history and data</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-text-primary">Clear History</h3>
              <p className="text-xs text-text-secondary">Remove all transformation history permanently</p>
            </div>
            <button
              onClick={clearHistory}
              className="px-3 py-2 text-sm bg-background-tertiary text-text-secondary hover:bg-border-primary rounded transition-colors"
            >
              Clear All History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
