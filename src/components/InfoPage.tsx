import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import { backendFormatToShortcut, Shortcut } from "../utils/keyboardUtils";
import { updateManager, UpdateInfo } from "../utils/updater";
import miloLogo from "../assets/icon.png";

export function InfoPage() {
  const [shortcut, setShortcut] = useState<Shortcut>([]);
  const [shortcutEnabled, setShortcutEnabled] = useState(true);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>("");

  // Load initial settings and check for updates
  useEffect(() => {
    const loadSettings = async () => {
      try {
        console.log("🔄 Frontend: Loading initial settings...");
        const settings = await invoke<any>("get_settings");
        console.log("📥 Frontend: Loaded settings:", settings);
        setShortcutEnabled(settings.shortcut_enabled ?? true);

        // Get current shortcut
        console.log("🔄 Frontend: Getting current shortcut...");
        const currentShortcut = await invoke<string>("get_current_shortcut");
        console.log("📥 Frontend: Received shortcut string:", currentShortcut);
        const parsedShortcut = backendFormatToShortcut(currentShortcut);
        console.log("🔄 Frontend: Parsed shortcut array:", parsedShortcut);
        setShortcut(parsedShortcut);
        console.log("✅ Frontend: Initial settings loaded successfully");
      } catch (error) {
        console.error("❌ Frontend: Failed to load settings:", error);
      }
    };

    const checkForUpdatesOnLaunch = async () => {
      try {
        console.log("🔄 Checking for updates on app launch...");
        const update = await updateManager.checkForUpdates();
        if (update) {
          console.log("📦 Update available:", update);
          setUpdateInfo(update);
        } else {
          console.log("✅ App is up to date");
        }
      } catch (error) {
        console.error("❌ Failed to check for updates on launch:", error);
      }
    };

    loadSettings();
    getVersion().then(setCurrentVersion).catch((error) => {
      console.error("❌ Failed to get app version:", error);
    });
    // Check for updates 2 seconds after loading to avoid blocking UI
    setTimeout(checkForUpdatesOnLaunch, 2000);
  }, []);

  const checkForUpdates = async () => {
    try {
      setIsCheckingUpdate(true);
      const update = await updateManager.checkForUpdates();
      setUpdateInfo(update);
      if (!update) {
        // Show a message that no updates are available
        console.log('No updates available');
        setStatusMessage(currentVersion ? `Your Milo version v${currentVersion} is up to date!` : 'Milo is up to date!');
      } else {
        setStatusMessage(null);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setStatusMessage('Failed to check for updates. Please try again.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const downloadUpdate = async () => {
    if (!updateInfo) return;

    try {
      setIsDownloading(true);
      updateManager.setProgressCallback((event) => {
        if (event.event === 'Started') {
          setDownloadProgress(0);
        } else if (event.event === 'Progress') {
          const progress = Math.round((event.data.chunkLength / event.data.contentLength) * 100);
          setDownloadProgress(progress);
        }
      });

      await updateManager.downloadAndInstall();
    } catch (error) {
      console.error('Failed to download update:', error);
      setIsDownloading(false);
    }
  };

  const renderShortcutKeys = (keys: Shortcut) => {
    if (keys.length === 0) return "No shortcut set";
    
    return keys.map((key, index) => (
      <span key={index}>
        <kbd className="px-2 py-1 text-xs font-semibold text-text-primary bg-background-tertiary border border-border-primary rounded-lg">
          {key}
        </kbd>
        {index < keys.length - 1 && <span className="mx-1">+</span>}
      </span>
    ));
  };

  return (
    <div className="max-w-3xl mx-auto p-8 text-center flex flex-col items-center justify-center min-h-[80vh]">
      <img src={miloLogo} className="w-24 mb-4" alt="Milo logo" />
      <h1 className="text-3xl text-text-primary mb-2">Welcome to Milo</h1>
      <p className="text-text-secondary text-base">Clean, efficient AI assistance for everyday text work</p>

      {/* Update Available Banner */}
      {updateInfo && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              🎉 Update available: <span className="font-medium">v{updateInfo.version}</span>
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 text-center max-w-md">
        <p className="text-text-secondary leading-relaxed mb-8 text-sm">
          Milo gives you instant transformations, consistent tone, and effortless editing.
          Simply copy any text and use the shortcut to transform it!
        </p>

        {shortcut.length > 0 && (
          <div className="mx-auto w-full max-w-80 p-5 bg-background-secondary/80 border border-border-primary rounded-2xl shadow-sm backdrop-blur my-6">
            <div className="text-center">
              <p className="text-sm text-text-secondary mb-2">Current Transform Shortcut:</p>
              <div className="flex justify-center items-center gap-1 mb-2">
                {renderShortcutKeys(shortcut)}
              </div>
              <p className="text-xs text-text-tertiary">
                Status: <span className={shortcutEnabled ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {shortcutEnabled ? "Enabled" : "Disabled"}
                </span>
              </p>
              <p className="text-xs text-text-tertiary mt-2">
                Configure shortcuts in Settings
              </p>
            </div>
          </div>
        )}

        {/* Update Section */}
        <div className="mt-8 space-y-4">
          {!updateInfo && !isCheckingUpdate && (
            <button
              onClick={checkForUpdates}
              className="px-4 py-2 text-sm bg-background-secondary text-text-primary border border-border-primary rounded-lg hover:bg-background-tertiary transition-colors"
            >
              Check for Updates
            </button>
          )}

          {isCheckingUpdate && (
            <div className="text-sm text-text-secondary">
              Checking for updates...
            </div>
          )}

          {updateInfo && !isDownloading && (
            <div className="p-4 bg-background-secondary/80 border border-border-primary rounded-2xl shadow-sm backdrop-blur">
              <h3 className="text-sm text-text-primary mb-2">Update Available</h3>
              <p className="text-xs text-text-secondary mb-2">
                Version {updateInfo.version} is available (current: {updateInfo.currentVersion})
              </p>
              {updateInfo.body && (
                <p className="text-xs text-text-tertiary mb-3">{updateInfo.body}</p>
              )}
              <button
                onClick={downloadUpdate}
                className="px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-primary/90 transition-colors"
              >
                Download & Install
              </button>
            </div>
          )}

          {isDownloading && (
            <div className="p-4 bg-background-secondary/80 border border-border-primary rounded-2xl shadow-sm backdrop-blur">
              <h3 className="text-sm text-text-primary mb-2">Downloading Update</h3>
              <div className="w-full bg-background-tertiary rounded-full h-2 mb-2">
                <div
                  className="bg-accent-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-text-secondary">
                {downloadProgress}% - The app will restart automatically when complete
              </p>
            </div>
          )}

          {statusMessage && !updateInfo && !isDownloading && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-800 dark:text-green-200">
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
