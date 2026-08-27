import { useState, useCallback } from 'react';
import { Draft, AuthType } from '../types';
import { TranslationKey } from '../locales';
import { SecurityService } from '../services/securityService';
import { getClient } from '../lib/steem';

export interface UsePublishingManagerOptions {
  syncWysiwygToContentIfVisual: () => string;
  t: (key: TranslationKey) => string;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  drafts: Draft[];
  setDrafts: React.Dispatch<React.SetStateAction<Draft[]>>;
  splitWords: number;
  pubTags: string;
  pubTitle: string;
  removeTitleLine: boolean;
  authType: AuthType;
  selectedVaultUser: string;
  username: string;
  rewardType: 'SP' | '50' | '0';
  beneficiaries: any[];
  performBroadcast: (
    activeUser: string,
    title: string,
    content: string,
    tags: string,
    authType: AuthType,
    rewardType?: 'SP' | '50' | '0',
    beneficiaries?: { account: string; weight: number }[]
  ) => Promise<any>;
  processContentForSteem: (content: string) => string;
  addToQueue: (content: string) => void;
  saveDraftHook: (content: string, status: 'working' | 'ready', notify: any, t: any) => void;
  setActiveModal: (modal: string | null) => void;
  setPubLog: (log: { msg: string; type: 'success' | 'error' | 'loading' | null }) => void;
}

export function usePublishingManager(options: UsePublishingManagerOptions) {
  const {
    syncWysiwygToContentIfVisual,
    t,
    notify,
    drafts,
    setDrafts,
    splitWords,
    pubTags,
    pubTitle,
    removeTitleLine,
    authType,
    selectedVaultUser,
    username,
    rewardType,
    beneficiaries,
    performBroadcast,
    processContentForSteem,
    addToQueue,
    saveDraftHook,
    setActiveModal,
    setPubLog,
  } = options;

  const extractMentions = (text: string) => {
    const cleanText = text
      .replace(/\[.*?\]\(.*?\)/g, ' ')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/[a-z0-9.-]+\/[a-z0-9.-]+/gi, ' ');
      
    const matches = cleanText.match(/@([a-z0-9.-]+)/gi);
    if (!matches) return [];
    
    return Array.from(new Set(matches.map(m => m.substring(1).toLowerCase())))
      .filter(m => /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(m))
      .filter(m => !m.includes('.') || m.split('.').every(p => p.length >= 1));
  };

  const sanitizeFilename = (name: string): string => {
    const ukrToLatin: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
      'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
      'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ь': '', 'ю': 'yu', 'я': 'ya', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E',
      'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
      'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
    };
    
    const parts = name.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';
    const base = parts.join('.');
    const result = base.split('').map(char => ukrToLatin[char] || char).join('');
    
    return result
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_.-]/g, '')
      .substring(0, 40) + (ext ? '.' + ext : '');
  };

  const handleSplitPost = useCallback(() => {
    const currentMarkdown = syncWysiwygToContentIfVisual();
    if (!currentMarkdown.trim()) return;
    
    const lines = currentMarkdown.split('\n');
    const originalTitle = lines[0].replace(/[#*`]/g, '').trim() || t('untitled');
    const bodyLines = lines.slice(1);
    const bodyText = bodyLines.join('\n').trim();
    
    if (!bodyText) {
      notify(t('fillRequired'), 'error');
      return;
    }

    const tokens = bodyText.match(/\S+|\s+/g) || [];
    const targetWordsPerPart = splitWords || 300;
    const parts: string[] = [];
    
    let currentPartStr = '';
    let currentPartWordCount = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      currentPartStr += token;
      if (/\S+/.test(token)) {
        currentPartWordCount++;
      }
      
      let isBreak = false;
      if (currentPartWordCount >= targetWordsPerPart) {
         if (token.includes('\n\n') || token.includes('\n') || currentPartWordCount >= targetWordsPerPart + 50) {
            isBreak = true;
         }
      }
      
      if (isBreak) {
         parts.push(currentPartStr.trim());
         currentPartStr = '';
         currentPartWordCount = 0;
      }
    }
    
    if (currentPartStr.trim().length > 0) {
      if (parts.length > 0 && currentPartWordCount < 50) {
        parts[parts.length - 1] += '\n\n' + currentPartStr.trim();
      } else {
        parts.push(currentPartStr.trim());
      }
    }

    const STORAGE_KEY_DRAFTS = 'steem_drafts_v1';
    const newDrafts: Draft[] = parts.map((partContent, index) => ({
      id: (Date.now() + index).toString(),
      title: `${originalTitle} №${index + 1}`,
      body: `# ${originalTitle} №${index + 1}\n\n${partContent}`,
      date: new Date().toLocaleString(),
      status: 'working',
      tags: pubTags
    }));

    const updatedDrafts = [...newDrafts, ...drafts];
    setDrafts(updatedDrafts);
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(updatedDrafts));
    notify(t('splitSuccess').replace('{count}', parts.length.toString()), 'success');
    setActiveModal(null);
  }, [syncWysiwygToContentIfVisual, t, notify, splitWords, pubTags, drafts, setDrafts, setActiveModal]);

  const handlePublish = useCallback(async () => {
    const currentMarkdown = syncWysiwygToContentIfVisual();
    const lines = currentMarkdown.split('\n');
    const firstLine = lines[0].trim();
    let finalTitle = pubTitle;
    let actualContent = currentMarkdown;

    if (!finalTitle) {
      finalTitle = firstLine.replace(/[#*`]/g, '').trim().substring(0, 100);
    }
    
    if (removeTitleLine) {
      actualContent = lines.slice(1).join('\n').trim();
    }

    const processedContent = processContentForSteem(actualContent);
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;

    if (!activeUser || !finalTitle || !pubTags) {
      setPubLog({ msg: t('fillRequired'), type: 'error' });
      return;
    }

    setPubLog({ msg: t('publishing'), type: 'loading' });
    
    try {
      await performBroadcast(activeUser, finalTitle, processedContent, pubTags, authType, rewardType, beneficiaries);
      setPubLog({ msg: t('publishedSuccess'), type: 'success' });
      setTimeout(() => setActiveModal(null), 2000);
    } catch (err: any) {
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
    }
  }, [
    syncWysiwygToContentIfVisual,
    pubTitle,
    removeTitleLine,
    processContentForSteem,
    authType,
    selectedVaultUser,
    username,
    pubTags,
    setPubLog,
    t,
    performBroadcast,
    rewardType,
    beneficiaries,
    setActiveModal,
  ]);

  const handleAddToQueue = useCallback(() => {
    const currentMarkdown = syncWysiwygToContentIfVisual();
    addToQueue(currentMarkdown);
  }, [syncWysiwygToContentIfVisual, addToQueue]);

  return {
    extractMentions,
    sanitizeFilename,
    handleSplitPost,
    handlePublish,
    handleAddToQueue,
  };
}
