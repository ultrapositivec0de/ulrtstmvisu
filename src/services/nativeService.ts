// src/services/nativeService.ts
export const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;
export const isNeutralino = () => typeof window !== 'undefined' && 'Neutralino' in window;

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
          const blob = new Blob([new Uint8Array(rawData)], { type: 'image/jpeg' });
          const file = new File([blob], entries[0].split(/[/\\]/).pop() || 'image.jpg', { type: 'image/jpeg' });
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
      const { window: tauriWindow } = await import('@tauri-apps/api');
      tauriWindow.appWindow.close();
    } else {
      window.close();
    }
  }
};
