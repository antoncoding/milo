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
  const [usageKey, setUsageKey] = useState("");
  const [usageKeyPreview, setUsageKeyPreview] = useState("");
  const [hasKey, setHasKey] = useState(false);
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Load usage key
      const savedUsageKey = await invoke<string>('get_litellm_api_key');
      setUsageKey(savedUsageKey || '');

      const keyPreview = await invoke<string>('get_usage_key_preview');
      setUsageKeyPreview(keyPreview || '');
      setHasKey(!!keyPreview);

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

  const saveUsageKey = async () => {
    try {
      setSaving(true);
      await invoke('save_litellm_api_key', { key: usageKey });

      // Update the preview after saving
      const keyPreview = await invoke<string>('get_usage_key_preview');
      setUsageKeyPreview(keyPreview || '');
      setHasKey(!!keyPreview);

      await message('Usage key saved successfully!', { title: 'Success', kind: 'info' });
    } catch (error) {
      console.error('Failed to save usage key:', error);
      await message('Failed to save usage key. Please try again.', { title: 'Error', kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const copyKeyToClipboard = async () => {
    if (usageKey) {
      try {
        await navigator.clipboard.writeText(usageKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
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

  const deleteUsageKey = async () => {
    const userConfirmed = await ask('Are you sure you want to delete your usage key? You will need to enter a new one to use Milo.', {
      title: 'Delete Usage Key',
      kind: 'warning'
    });

    if (userConfirmed) {
      try {
        setSaving(true);
        await invoke('save_litellm_api_key', { key: '' });
        setUsageKey('');
        setUsageKeyPreview('');
        setHasKey(false);
        await message('Usage key deleted successfully!', { title: 'Success', kind: 'info' });
      } catch (error) {
        console.error('Failed to delete usage key:', error);
        await message('Failed to delete usage key. Please try again.', { title: 'Error', kind: 'error' });
      } finally {
        setSaving(false);
      }
    }
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

      {/* Usage Key Section */}
      <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
        <div className="mb-4">
          <h2 className="text-lg text-text-primary">Usage Key</h2>
          <p className="text-sm text-text-secondary">
            {!hasKey ? "You need a usage key to transform text with Milo" : "Your key for accessing text transformations"}
          </p>
        </div>

        <div className="space-y-4">
          {!hasKey ? (
            /* No Key State */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  Not Ready
                </div>
                <button
                  onClick={openWebsite}
                  className="inline-flex items-center px-3 py-2 bg-accent-primary text-white text-sm rounded-lg hover:bg-accent-secondary transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Get Usage Key
                </button>
              </div>

              <div>
                <label htmlFor="usageKey" className="block text-sm text-text-primary mb-2">
                  Enter your usage key
                </label>
                <input
                  id="usageKey"
                  type="password"
                  value={usageKey}
                  onChange={(e) => setUsageKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-accent-primary bg-background-primary text-text-primary"
                />
                <button
                  onClick={saveUsageKey}
                  disabled={saving || !usageKey.trim()}
                  className="mt-2 px-3 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Key'}
                </button>
              </div>
            </div>
          ) : (
            /* Has Key State */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Ready
                </div>
                <button
                  onClick={deleteUsageKey}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Delete
                </button>
              </div>

              <div className="bg-background-tertiary p-3 rounded-lg border border-border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Usage Key:</p>
                    <p className="text-sm font-mono text-text-primary">{usageKeyPreview}</p>
                  </div>
                  <button
                    onClick={copyKeyToClipboard}
                    className="ml-3 px-3 py-1.5 text-xs bg-background-secondary border border-border-primary rounded hover:bg-background-tertiary transition-colors"
                  >
                    {copied ? (
                      <span className="flex items-center text-green-600">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Copied
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
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
