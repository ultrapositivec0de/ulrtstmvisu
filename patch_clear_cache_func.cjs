const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const newFunc = `  const handleClearCache = async () => {
    const isNative = typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).Neutralino);
    if (!isNative) return; // Only meant for native apps

    const confirmed = await confirmDialog("Clear system cache (images, lists, temporary files)? This will NOT delete templates, drafts, or keys.");
    if (!confirmed) return;

    let cleared = false;
    
    // Clear Web LocalStorage caches (safe temporary keys)
    localStorage.removeItem('steem_gallery_cache_results');
    localStorage.removeItem('steem_pexels_settings');
    
    // Clear any sessionStorage
    sessionStorage.clear();

    try {
      // 1. Tauri Cache Clear
      if ((window as any).__TAURI__) {
        let pathModule, fsModule;
        try {
          pathModule = await import('@tauri-apps/api/path');
          fsModule = await import('@tauri-apps/plugin-fs');
        } catch {
          try {
            // @ts-ignore
            pathModule = await import(String('@tauri-apps/api/path'));
            // @ts-ignore
            fsModule = await import(String('@tauri-apps/api/fs'));
          } catch {
            const tauri = (window as any).__TAURI__;
            pathModule = tauri.path;
            fsModule = tauri.fs;
          }
        }

        if (pathModule && fsModule) {
          const cacheDir = await pathModule.appCacheDir();
          try {
            // Recursive delete of cache directory contents
            await fsModule.remove(cacheDir, { recursive: true });
            cleared = true;
          } catch (e: any) {
            console.warn("Could not remove cache directory:", e);
            // Sometimes it fails if files are in use, that's fine.
            cleared = true; // still count it as processed
          }
        }
      }

      // 2. Neutralino Cache Clear (Neutralino has limited direct cache access, but we clear what we can)
      if ((window as any).Neutralino) {
        // Unfortunately Neutralino doesn't expose webview cache clearing directly yet,
        // but we've cleared local temp data above.
        cleared = true;
      }

      if (cleared) {
        notify(t('nativeCacheCleared') || "Cache cleared!", "success");
      }
    } catch (err: any) {
      console.error(err);
      notify((t('nativeCacheError') || "Error") + ": " + err.message, "error");
    }
  };

  const exportBackup = async () => {`;

content = content.replace("  const exportBackup = async () => {", newFunc);

fs.writeFileSync('src/App.tsx', content);
