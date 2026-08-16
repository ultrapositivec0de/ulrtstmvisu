const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldCode = `        if (pathModule && fsModule) {
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
        }`;

const newCode = `        if (pathModule && fsModule) {
          const cacheDir = await pathModule.appCacheDir();
          const localDataDir = await pathModule.appLocalDataDir();

          // Safe surgical deletion: only targets folders explicitly known to be cache
          const clearCachesInDir = async (dirToScan: string, isStrictlyCacheDir: boolean) => {
            try {
              const entries = await fsModule.readDir(dirToScan);
              for (const entry of entries) {
                if (!entry.name) continue;
                const lowerName = entry.name.toLowerCase();
                
                // If it's a known cache folder (WebKitCache, GPUCache, Cache, Code Cache)
                if (entry.isDirectory && (lowerName.includes('cache') || lowerName === 'fscacheddata')) {
                  const targetPath = await pathModule.join(dirToScan, entry.name);
                  try {
                    await fsModule.remove(targetPath, { recursive: true });
                    cleared = true;
                  } catch (e) {}
                } 
                // Windows WebView2 specific structure: EBWebView/Default/Cache
                else if (entry.isDirectory && entry.name === 'EBWebView') {
                  const defaultPath = await pathModule.join(dirToScan, 'EBWebView', 'Default');
                  try {
                    const defEntries = await fsModule.readDir(defaultPath);
                    for (const defEntry of defEntries) {
                      if (defEntry.isDirectory && defEntry.name && defEntry.name.toLowerCase().includes('cache')) {
                        const targetPath = await pathModule.join(defaultPath, defEntry.name);
                        try {
                          await fsModule.remove(targetPath, { recursive: true });
                          cleared = true;
                        } catch (e) {}
                      }
                    }
                  } catch (e) {}
                }
                // If we are in a directory strictly dedicated to cache (like ~/.cache/com.ultraeditor.desktop), 
                // it is safe to delete other temp folders like 'WebKit' which macOS uses
                else if (isStrictlyCacheDir && entry.isDirectory && lowerName === 'webkit') {
                  const targetPath = await pathModule.join(dirToScan, entry.name);
                  try {
                    await fsModule.remove(targetPath, { recursive: true });
                    cleared = true;
                  } catch (e) {}
                }
              }
            } catch (e) {}
          };

          // 1. Scan the dedicated Cache directory (e.g. ~/.cache/... or ~/Library/Caches/...)
          // We pass true because we know this dir is strictly for cache, UNLESS it's the exact same as data dir (Windows)
          await clearCachesInDir(cacheDir, cacheDir !== localDataDir);
          
          // 2. Scan the Local Data directory (e.g. ~/.local/share/...)
          // WebKitGTK sometimes puts 'WebKitCache' here right next to 'local-storage'.
          // We pass false to ensure we ONLY delete folders with 'cache' in the name and NEVER touch local-storage.
          if (cacheDir !== localDataDir) {
            await clearCachesInDir(localDataDir, false);
          }
        }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/App.tsx', content);
