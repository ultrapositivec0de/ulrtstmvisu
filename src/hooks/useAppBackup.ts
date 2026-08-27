import { useCallback } from 'react';
import { saveFileNatively } from '../utils/fileSaver';
import { Draft, Language } from '../types';

interface UseAppBackupProps {
  lang: Language;
  drafts: Draft[];
  setDrafts: React.Dispatch<React.SetStateAction<Draft[]>>;
  pubTitle: string;
  pubTags: string;
  exportBackup: (drafts: Draft[], notify: (msg: string, type?: 'success' | 'error' | 'loading') => void) => Promise<void>;
  importBackup: (file: File, notify: any, setDrafts: any) => Promise<any>;
  syncWysiwygToContentIfVisual: () => string;
  processContentForSteem: (md: string) => string;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  confirmDialog: (message: string, title?: string) => Promise<boolean>;
  t: (key: any) => string;
}

export function useAppBackup({
  lang,
  drafts,
  setDrafts,
  pubTitle,
  pubTags,
  exportBackup,
  importBackup,
  syncWysiwygToContentIfVisual,
  processContentForSteem,
  notify,
  confirmDialog,
  t,
}: UseAppBackupProps) {
  const handleClearCache = async () => {
    const confirmed = await confirmDialog(
      lang === 'uk' 
        ? "Очистити кеш переглянутих дописів, тимчасових списків та завантажених зображень? Ваші чернетки, шаблони та збережені ключі НЕ будуть видалені." 
        : "Clear cached posts, loaded lists, and temporary images? Your drafts, templates, and keys will NOT be deleted."
    );
    if (!confirmed) return;

    const cleared = true;
    
    // Clear Web LocalStorage caches (safe temporary keys only)
    localStorage.removeItem('steem_gallery_cache_results');
    localStorage.removeItem('steem_pexels_settings');
    localStorage.removeItem('steem_hidden_replies');
    
    // Clear session storage
    sessionStorage.clear();

    // Clear Service Worker / CacheStorage API caches if present (Web & PWA & WebView)
    if (typeof caches !== 'undefined') {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      } catch (cErr) {
        console.debug("CacheStorage clear skipped:", cErr);
      }
    }

    try {
      // Tauri Native Cache Clear
      const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__);
      if (isTauri) {
        let pathModule: any, fsModule: any;
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
            if (tauri) {
              pathModule = tauri.path;
              fsModule = tauri.fs;
            }
          }
        }

        if (pathModule && fsModule) {
          try {
            const cacheDir = await pathModule.appCacheDir();
            const localDataDir = await pathModule.appLocalDataDir();

            const clearCachesInDir = async (dirToScan: string, isStrictlyCacheDir: boolean) => {
              try {
                const entries = await fsModule.readDir(dirToScan);
                for (const entry of entries) {
                  if (!entry.name) continue;
                  const lowerName = entry.name.toLowerCase();
                  
                  if (entry.isDirectory && (lowerName.includes('cache') || lowerName === 'fscacheddata')) {
                    const targetPath = await pathModule.join(dirToScan, entry.name);
                    try {
                      await fsModule.remove(targetPath, { recursive: true });
                    } catch (err: any) {
                      console.debug("Failed to remove cache path:", err);
                    }
                  } else if (entry.isDirectory && entry.name === 'EBWebView') {
                    const defaultPath = await pathModule.join(dirToScan, 'EBWebView', 'Default');
                    try {
                      const defEntries = await fsModule.readDir(defaultPath);
                      for (const defEntry of defEntries) {
                        if (defEntry.isDirectory && defEntry.name && defEntry.name.toLowerCase().includes('cache')) {
                          const targetPath = await pathModule.join(defaultPath, defEntry.name);
                          try {
                            await fsModule.remove(targetPath, { recursive: true });
                          } catch (err: any) {
                            console.debug("Failed to remove webview cache path:", err);
                          }
                        }
                      }
                    } catch (err: any) {
                      console.debug("Failed to read EBWebView path:", err);
                    }
                  } else if (isStrictlyCacheDir && entry.isDirectory && lowerName === 'webkit') {
                    const targetPath = await pathModule.join(dirToScan, entry.name);
                    try {
                      await fsModule.remove(targetPath, { recursive: true });
                    } catch (err: any) {
                      console.debug("Failed to remove webkit dir:", err);
                    }
                  }
                }
              } catch (err: any) {
                console.debug("Failed to scan cache directory:", err);
              }
            };

            await clearCachesInDir(cacheDir, cacheDir !== localDataDir);
            if (cacheDir !== localDataDir) {
              await clearCachesInDir(localDataDir, false);
            }
          } catch (pathErr) {
            console.debug("Tauri path resolution error:", pathErr);
          }
        }
      }

      if (cleared) {
        notify(lang === 'uk' ? "Кеш перегляду та зображень успішно очищено!" : "Cache cleared successfully!", "success");
      }
    } catch (err: any) {
      console.error(err);
      notify((t('nativeCacheError') || "Error") + ": " + err.message, "error");
    }
  };

  const handleExportBackup = useCallback(async () => {
    await exportBackup(drafts, notify);
  }, [exportBackup, drafts, notify]);

  const handleImportBackup = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importBackup(file, notify, setDrafts);
  }, [importBackup, notify, setDrafts]);

  const downloadFile = async () => {
    const currentMarkdown = syncWysiwygToContentIfVisual();
    const lines = currentMarkdown.split('\n');
    const firstLine = lines[0]?.trim() || "";
    
    let derivedTitle = pubTitle;
    if (!derivedTitle) {
      derivedTitle = firstLine.replace(/[#*`]/g, '').trim().substring(0, 150);
    }
    
    let exportContent = "";
    const hasH1 = firstLine.startsWith('# ');
    if (derivedTitle && !hasH1) {
      if (firstLine.replace(/[#*`]/g, '').trim() !== derivedTitle) {
        exportContent += `# ${derivedTitle}\n\n`;
      }
    }
    
    exportContent += processContentForSteem(currentMarkdown);
    
    if (pubTags) {
      exportContent += `\n\n---\n- **Tags**: ${pubTags}\n`;
    }

    const fileBlob = new Blob([exportContent], {type: 'text/markdown'});
    
    const safeFilename = (derivedTitle || `steem-post-${Date.now()}`)
      .replace(/[/\\?%*:|"<>]/g, '-')
      .substring(0, 80)
      .trim();
      
    const fullFilename = `${safeFilename || 'steem-post'}.md`;
    
    const saved = await saveFileNatively(fileBlob, fullFilename, 'text/markdown');
    if (saved) {
      notify(`${t('fileExportSuccess')} (${fullFilename})`, 'success');
    }
  };

  return {
    handleClearCache,
    handleExportBackup,
    handleImportBackup,
    downloadFile,
  };
}
