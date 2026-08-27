// Universal file saver utility supporting Tauri, Neutralino, Android, File System Access API, and browser fallbacks
export const saveFileNatively = async (blob: Blob, defaultFilename: string, mimeType: string = 'text/plain') => {
  try {
    // 0. UNIVERSAL NATIVE HOOKS FOR TAURI / NEUTRALINO / ANDROID / LINUX WEBVIEW INTERCEPTION
    if (typeof window !== 'undefined') {
      const isText = mimeType.startsWith('text/') || mimeType.includes('json');
      let textData = '';
      let base64Data = '';
      
      if (isText) {
        textData = await blob.text();
      } else {
        const reader = new FileReader();
        base64Data = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || '');
          };
          reader.readAsDataURL(blob);
        });
      }

      // Dispatch CustomEvent for native webview listeners (Tauri, Neutralino, etc.)
      const nativeSaveEvent = new CustomEvent('nativeSaveFile', {
        detail: {
          filename: defaultFilename,
          mimeType,
          text: textData,
          base64: base64Data,
        }
      });
      window.dispatchEvent(nativeSaveEvent);

      // Also post message to window so webview container postMessage listeners can intercept it
      window.postMessage({
        type: 'nativeSaveFile',
        filename: defaultFilename,
        mimeType,
        text: textData,
        base64: base64Data,
      }, '*');

      // Check for specific NeuroLino custom bridge
      if ((window as any).NeuroLinoBridge?.saveFile) {
        (window as any).NeuroLinoBridge.saveFile(base64Data || btoa(textData), defaultFilename, mimeType);
      }
      
      // Check for webkit message handlers (iOS / macOS native WebView)
      if ((window as any).webkit?.messageHandlers?.saveFile?.postMessage) {
        (window as any).webkit.messageHandlers.saveFile.postMessage({
          filename: defaultFilename,
          mimeType,
          text: textData,
          base64: base64Data
        });
      }
    }

    // 1. NEUTRALINO.JS (Native desktop app runner)
    if (typeof window !== 'undefined' && (window as any).Neutralino) {
      const neu = (window as any).Neutralino;
      const ext = defaultFilename.split('.').pop() || '*';
      const filePath = await neu.os.showSaveDialog('Save File', {
        defaultPath: defaultFilename,
        filters: [{
          name: `${ext.toUpperCase()} Files`,
          extensions: [ext]
        }]
      });
      if (filePath) {
        if (mimeType.startsWith('text/')) {
          const text = await blob.text();
          await neu.filesystem.writeFile(filePath, text);
        } else {
          const buffer = await blob.arrayBuffer();
          await neu.filesystem.writeBinaryFile(filePath, buffer);
        }
        return true;
      }
      return false;
    }

    // 2. TAURI (Native desktop app runner)
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        let saveFn: any = null;
        let writeFn: any = null;

        try {
          const { save } = await import('@tauri-apps/plugin-dialog');
          const { writeFile } = await import('@tauri-apps/plugin-fs');
          saveFn = save;
          writeFn = writeFile;
        } catch {
          try {
            // @ts-ignore
            const { save } = await import(String('@tauri-apps/api/dialog'));
            // @ts-ignore
            const { writeFile } = await import(String('@tauri-apps/api/fs'));
            saveFn = save;
            writeFn = writeFile;
          } catch {
            const tauri = (window as any).__TAURI__;
            if (tauri.dialog?.save) saveFn = tauri.dialog.save;
            if (tauri.fs?.writeFile) writeFn = tauri.fs.writeFile;
          }
        }

        if (saveFn && writeFn) {
          const ext = defaultFilename.split('.').pop() || '*';
          try {
            const filePath = await saveFn({
              defaultPath: defaultFilename,
              filters: [{
                name: 'Files',
                extensions: [ext]
              }]
            });
            
            if (filePath) {
              const buffer = await blob.arrayBuffer();
              await writeFn(filePath, new Uint8Array(buffer));
              return true;
            } else if (typeof filePath === 'string') {
              // User explicitly cancelled dialog
              return false;
            }
          } catch (dialogErr) {
            console.debug("Tauri dialog.save not fully available on this platform, trying fallbacks:", dialogErr);
          }
        }
      } catch (tauriErr) {
        console.error("Tauri native save failed, trying fallback:", tauriErr);
      }
    }

    // 3. ANDROID NATIVE BRIDGE / Custom App Bridges
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.saveFile) {
      return new Promise<boolean>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          (window as any).AndroidBridge.saveFile(base64, defaultFilename, mimeType);
          resolve(true);
        };
        reader.readAsDataURL(blob);
      });
    }

    // 4. MODERN WEB FILE SYSTEM ACCESS API (showSaveFilePicker)
    // Works on modern desktop Chromium, allows direct file writing
    if (typeof window !== 'undefined' && typeof (window as any).showSaveFilePicker === 'function') {
      try {
        const ext = defaultFilename.split('.').pop() || 'md';
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [{
            description: `${ext.toUpperCase()} Documents`,
            accept: {
              [mimeType]: ['.' + ext]
            }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') {
          return false;
        }
        console.warn("showSaveFilePicker failed or unsupported on this platform, falling back to download:", pickerErr);
      }
    }

    // 5. NATIVE SHARE FALLBACK FOR MOBILE (Android/iOS)
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        const file = new File([blob], defaultFilename, { type: mimeType });
        if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
          try {
            await (navigator as any).share({
              files: [file],
              title: defaultFilename
            });
            return true;
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') return false; // User cancelled
            console.warn("Share API failed, falling back to direct download:", shareErr);
          }
        }
      } catch (canShareErr) {
        console.debug("canShare error:", canShareErr);
      }
    }

    // 6. STANDARD WEB / MOBILE DOWNLOAD FALLBACK (Anchor element tag with deferred revoke)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    a.rel = 'noopener noreferrer';
    a.target = '_self';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        if (a.parentNode) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        /* ignore cleanup error */
      }
    }, 60000);
    return true;
  } catch (err: any) {
    console.error("All save operations failed, using fallback:", err);
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          if (a.parentNode) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {
          /* ignore cleanup error */
        }
      }, 60000);
      return true;
    } catch (finalErr) {
      console.error("Critical download error:", finalErr);
      return false;
    }
  }
};
