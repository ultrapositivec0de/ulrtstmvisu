import { useState, useCallback } from 'react';
import { Draft, Template } from '../types';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

export const STORAGE_KEY_DRAFTS = 'steem_drafts_v2';
export const STORAGE_KEY_TEMPLATES = 'steem_templates_v2';

export function useDrafts(saveFileNatively: (blob: Blob, defaultFilename: string, mimeType?: string) => Promise<boolean>) {
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Lazy state initialization to satisfy ESLint rule on setState in useEffect
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    try {
      const savedDrafts = localStorage.getItem(STORAGE_KEY_DRAFTS);
      return savedDrafts ? JSON.parse(savedDrafts) : [];
    } catch {
      return [];
    }
  });

  const [templates, setTemplates] = useState<Template[]>(() => {
    try {
      const savedTpls = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      return savedTpls ? JSON.parse(savedTpls) : [];
    } catch {
      return [];
    }
  });

  // Save draft
  const saveDraft = useCallback((currentMarkdown: string, status: 'working' | 'ready' = 'working', notify: any, t: any) => {
    const title = currentMarkdown.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 50) || t('untitled');
    const existingDrafts = [...drafts];
    
    let updatedDrafts: Draft[];
    let targetDraftId = currentDraftId;

    if (currentDraftId) {
      updatedDrafts = existingDrafts.map((d: Draft) => {
        if (d.id === currentDraftId) {
          return { ...d, title, body: currentMarkdown, date: new Date().toLocaleString(), status };
        }
        return d;
      });
    } else {
      const newId = Date.now().toString();
      const newDraft: Draft = {
        id: newId,
        title,
        body: currentMarkdown,
        date: new Date().toLocaleString(),
        status
      };
      updatedDrafts = [newDraft, ...existingDrafts];
      targetDraftId = newId;
      setCurrentDraftId(newId);
    }

    setDrafts(updatedDrafts);
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(updatedDrafts));
    notify(t('saveSuccess'));
    return targetDraftId;
  }, [currentDraftId, drafts]);

  // Delete draft
  const deleteDraft = useCallback((id: string) => {
    const updated = drafts.filter(d => d.id !== id);
    setDrafts(updated);
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(updated));
  }, [drafts]);

  // Toggle draft status (working / ready)
  const toggleDraftStatus = useCallback((id: string) => {
    const updated = drafts.map(d => {
      if (d.id === id) {
        return { ...d, status: d.status === 'ready' ? ('working' as const) : ('ready' as const) };
      }
      return d;
    });
    setDrafts(updated);
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(updated));
  }, [drafts]);


  // Update templates list and persist
  const updateTemplates = useCallback((updated: Template[]) => {
    setTemplates(updated);
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
  }, []);

  return {
    currentDraftId,
    setCurrentDraftId,
    drafts,
    setDrafts,
    templates,
    setTemplates: updateTemplates,
    saveDraft,
    deleteDraft,
    toggleDraftStatus
  };
}
