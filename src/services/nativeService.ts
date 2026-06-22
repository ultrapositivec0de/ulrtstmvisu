// src/services/nativeService.ts
export const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;
export const isNeutralino = () => typeof window !== 'undefined' && 'Neutralino' in window;

// Initialize Neutralino client safely
export function initNeutralino() {
  if (isNeutralino()) {
    try {
      const { Neutralino } = window as any;
      Neutralino.init();
      console.log('[Neutralino] Core client successfully initialized.');
    } catch (e) {
      console.error('[Neutralino] Failed to execute Neutralino.init():', e);
    }
  }
}

// Helper to get backup file path in the host filesystem (user's home directory)
async function getBackupPath(): Promise<string | null> {
  if (isNeutralino()) {
    try {
      const { Neutralino } = window as any;
      const homeDir = await Neutralino.os.getPath('home');
      return `${homeDir}/.steem_writer_backup.json`;
    } catch (e) {
      console.error('Failed to resolve Neutralino home path', e);
    }
  }
  return null;
}

// Helper to wrap promise with a safety timeout
function withTimeout<T>(promise: Promise<T>, ms: number, defaultValue: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Native Storage] Operation timed out after ${ms}ms. Proceeding with defaults.`);
      resolve(defaultValue);
    }, ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

// RESTORE: Synchronously (before rendering React) reads backup file and populates localStorage
export async function initStorageRestore() {
  if (!isNeutralino()) return;
  
  const path = await getBackupPath();
  if (!path) return;

  try {
    const { Neutralino } = window as any;
    
    // Check if the backup file actually exists using Neutralino filesystem
    let fileExists = false;
    try {
      const stats = await Neutralino.filesystem.getStats(path);
      if (stats) fileExists = true;
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      console.log('[Neutralino Backup] No backup file found on disk yet. Starting fresh.');
      return;
    }

    // Wrap reading with timeout to prevent hanging the React mounting phase
    const fileData = await withTimeout(
      Neutralino.filesystem.readFile(path),
      150, // 150ms maximum wait time for local disk I/O
      ''
    );

    if (fileData) {
      const parsed = JSON.parse(fileData);
      let restoredCount = 0;
      Object.keys(parsed).forEach(key => {
        if (key.startsWith('steem_') || key.startsWith('widget_')) {
          localStorage.setItem(key, parsed[key]);
          restoredCount++;
        }
      });
      console.log(`[Neutralino Backup] Successfully restored ${restoredCount} keys from disk backup.`);
    }
  } catch (err) {
    console.log('[Neutralino Backup] No previous backup config restored or error occurred:', err);
  }
}

// SAVE: Periodically checks localStorage for updates and saves them physically to the disk
export function startStorageAutosave() {
  if (!isNeutralino()) return;

  let lastSavedJson = '';
  setInterval(async () => {
    const path = await getBackupPath();
    if (!path) return;

    try {
      const { Neutralino } = window as any;
      const dataToSave: Record<string, string> = {};
      let hasKeys = false;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('steem_') || key.startsWith('widget_'))) {
          const val = localStorage.getItem(key);
          if (val !== null) {
            dataToSave[key] = val;
            hasKeys = true;
          }
        }
      }

      if (hasKeys) {
        const jsonStr = JSON.stringify(dataToSave, null, 2);
        if (jsonStr !== lastSavedJson) {
          await Neutralino.filesystem.writeFile(path, jsonStr);
          lastSavedJson = jsonStr;
          console.log(`[Neutralino Backup] Settings, keys, and drafts autosaved to ${path}`);
        }
      }
    } catch (saveError) {
      console.error('[Neutralino Backup] Autosave to filesystem failed:', saveError);
    }
  }, 4000); // Check for modifications every 4 seconds
}

export const NativeService = {
  getPlatform: () => {
    if (isTauri()) return 'tauri';
    if (isNeutralino()) return 'neutralino';
    return 'web';
  },

  async selectLocalImage(): Promise<File | null> {
    if (isNeutralino()) {
      try {
        const { Neutralino } = window as any;
        const entries = await Neutralino.os.showOpenDialog('Select Image', {
          filters: [
            { name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp'] }
          ]
        });
        
        if (entries && entries.length > 0) {
          // Read the file natively
          const rawData = await Neutralino.filesystem.readBinaryFile(entries[0]);
          const arrayBuffer = (rawData && typeof rawData === 'object' && 'data' in rawData) ? rawData.data : rawData;
          const ext = entries[0].split('.').pop()?.toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          const blob = new Blob([arrayBuffer], { type: mimeType });
          const file = new File([blob], entries[0].split(/[/\\]/).pop() || 'image.jpg', { type: mimeType });
          return file;
        }
      } catch (err) {
        console.error('Neutralino open dialog error:', err);
      }
    }
    
    // Fallback or Tauri which handles `<input type="file">` mostly well on its own
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        resolve(e.target.files?.[0] || null);
      };
      input.click();
    });
  },

  async quitApp() {
    if (isNeutralino()) {
      const { Neutralino } = window as any;
      Neutralino.app.exit();
    } else if (isTauri()) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().close();
    } else {
      window.close();
    }
  },

  /**
   * Tries to trigger permission dialogs on mobile (Tauri).
   * Note: On modern Android (13+), standard file pickers don't require manifest permissions.
   * This is mainly for Camera or fine-grained storage access if needed.
   */
  async requestCameraPermission() {
    if (!isTauri()) return true;
    try {
      // Triggering Camera dialog via standard web API
      // Most Tauri Android WebViews will show the system dialog here
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately, we just wanted the dialog
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.warn('Camera permission denied or failed:', err);
      return false;
    }
  }
};

