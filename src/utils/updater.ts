import { invoke } from '@tauri-apps/api/core';
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export class UpdateManager {
  private onProgressCallback?: (event: DownloadEvent) => void;
  private currentUpdate: Update | null = null;

  setProgressCallback(callback: (event: DownloadEvent) => void) {
    this.onProgressCallback = callback;
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const update = await check();
      if (update?.available) {
        this.currentUpdate = update;
        return {
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body,
          date: update.date
        };
      }
      this.currentUpdate = null;
      return null;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      throw new Error('Failed to check for updates');
    }
  }

  private async ensureUpdate(): Promise<Update | null> {
    if (this.currentUpdate) {
      return this.currentUpdate;
    }

    const update = await check();
    if (update?.available) {
      this.currentUpdate = update;
      return update;
    }

    this.currentUpdate = null;
    return null;
  }

  async downloadAndInstall(): Promise<void> {
    let update: Update | null = null;
    try {
      update = await this.ensureUpdate();

      if (!update) {
        throw new Error('No updates available');
      }

      await update.download((event) => {
        console.debug('[Updater] download event', event);
        this.onProgressCallback?.(event);
      });

      // Ensure UI reaches 100% even if the plugin's Finished event is skipped.
      this.onProgressCallback?.({ event: 'Finished' } as DownloadEvent);

      await update.install();

      await update.close();
      update = null;
      this.currentUpdate = null;

      await invoke('relaunch_app');
    } catch (error) {
      console.error('Failed to download and install update:', error);
      throw error;
    } finally {
      if (update) {
        try {
          await update.close();
        } catch (closeError) {
          console.warn('Failed to close update resource:', closeError);
        }
      }
    }
  }
}

export const updateManager = new UpdateManager();
