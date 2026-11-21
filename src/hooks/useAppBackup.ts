import { useCallback } from 'react';
import { saveFileNatively } from '../utils/fileSaver';
import { Draft, Language } from '../types';

import {
  type CacheClearSelection,
  DEFAULT_CACHE_CLEAR_SELECTION,
  clearSelectedCacheCategories,
} from '../services/cacheManagerService';

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
  const handleClearCache = useCallback(async (
    selection?: CacheClearSelection,
    selectedNativePaths?: string[]
  ): Promise<boolean> => {
    const activeSelection = selection || DEFAULT_CACHE_CLEAR_SELECTION;
    const hasAny =
      activeSelection.feedCache ||
      activeSelection.curationAndInbox ||
      activeSelection.pinnedPosts ||
      activeSelection.imageBlobs ||
      activeSelection.stockAndSw ||
      activeSelection.nativeAndLinux;

    if (!hasAny) {
      notify(t('cacheNothingSelected'), 'error');
      return false;
    }

    const confirmed = await confirmDialog(t('confirmClearCachePrompt'));
    if (!confirmed) return false;

    try {
      const result = await clearSelectedCacheCategories(activeSelection, selectedNativePaths);
      if (result.errors.length > 0 && result.clearedCategories.length === 0) {
        notify(`${t('nativeCacheError')}: ${result.errors[0]}`, 'error');
        return false;
      }
      notify(t('cacheClearedSuccess'), 'success');
      return true;
    } catch (err: any) {
      console.error(err);
      notify(t('nativeCacheError') + ': ' + (err?.message || String(err)), 'error');
      return false;
    }
  }, [confirmDialog, notify, t]);

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
    
    let exportContent = processContentForSteem(currentMarkdown);
    
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
