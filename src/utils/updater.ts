import { check } from '@tauri-apps/plugin-updater';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export class UpdateManager {
  private onProgressCallback?: (event: any) => void;

  setProgressCallback(callback: (event: any) => void) {
    this.onProgressCallback = callback;
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const update = await check();
      if (update?.available) {
        return {
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body,
          date: update.date
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      throw new Error('Failed to check for updates');
    }
  }

  async downloadAndInstall(): Promise<void> {
    try {
      const update = await check();
      if (update?.available) {
        await update.downloadAndInstall((event) => {
          if (this.onProgressCallback) {
            this.onProgressCallback(event);
          }
        });

        // The updater will handle the restart automatically
        // No need to manually call relaunch() in Tauri 2.0
      } else {
        throw new Error('No updates available');
      }
    } catch (error) {
      console.error('Failed to download and install update:', error);
      throw error;
    }
  }
}

export const updateManager = new UpdateManager();