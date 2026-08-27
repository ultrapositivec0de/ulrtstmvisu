import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { QueueItem, AuthType } from '../types';
import { SecurityService } from '../services/securityService';
import { getClient } from '../lib/steem';

export const STORAGE_KEY_QUEUE = 'steem_queue_v2';

export const processContentForSteem = (raw: string) => {
  return raw;
};

export const createPermlinkUA = (title: string): string => {
  let text = title.toLowerCase().trim();
  text = text.replace(/зг/g, 'zgh'); // Правило "зг"
  const specialStart: Record<string, string> = { 'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya' };
  const specialMid: Record<string, string> = { 'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya' };
  const standardMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'y', 'і': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', '’': '', "'": '', 'ʼ': ''
  };
  const result = text.split(/([\s-]+)/).map(part => {
    if (/[\s-]+/.test(part)) return part;
    let word = "";
    for (let i = 0; i < part.length; i++) {
      const char = part[i];
      if (i === 0 && specialStart[char]) word += specialStart[char];
      else if (i > 0 && specialMid[char]) word += specialMid[char];
      else if (standardMap[char] !== undefined) word += standardMap[char];
      else word += char;
    }
    return word;
  }).join('');
  
  return result
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 150) || 'post-' + Math.random().toString(36).substring(2, 7);
};

export interface SteemQueueConfig {
  appAgent: string;
  t: (key: any) => string;
  promptDialog: (message: string, defaultValue?: string, title?: string, inputType?: 'text' | 'password') => Promise<string | null>;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  vaultPin: string;
  initVault: () => Promise<void>;
  setActiveModal: (modal: string | null) => void;
  setPubLog: Dispatch<SetStateAction<{ msg: string; type: 'success' | 'error' | 'loading' | null }>>;
  removeTitleLine: boolean;
  pubTitle: string;
  pubTags: string;
  authType: AuthType | 'VAULT';
  username: string;
  selectedVaultUser: string;
}

export function useSteemQueue(config: SteemQueueConfig) {
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUEUE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [scheduledTime, setScheduledTime] = useState('');

  const performBroadcast = useCallback(async (
    author: string, 
    title: string, 
    body: string, 
    tags: string, 
    auth: AuthType,
    rewardType: 'SP' | '50' | '0' = '50',
    beneficiaries: {account: string, weight: number}[] = []
  ) => {
    const finalBody = processContentForSteem(body);
    const tagsArray = tags.split(' ').map(t => t.trim()).filter(t => t);
    const parentPermlink = tagsArray[0] || 'blog';
    const permlink = createPermlinkUA(title);
    
    const meta = JSON.stringify({ 
      tags: tagsArray, 
      app: config.appAgent, 
      format: 'markdown' 
    });

    const options = {
      allow_curation_rewards: true,
      allow_votes: true,
      author: author,
      permlink: permlink,
      max_accepted_payout: rewardType === '0' ? '0.000 SBD' : '1000000.000 SBD',
      percent_steem_dollars: rewardType === 'SP' ? 0 : 10000,
      extensions: beneficiaries.length > 0 ? [[0, {
        beneficiaries: beneficiaries.sort((a, b) => a.account.localeCompare(b.account)).map(b => ({
          account: b.account,
          weight: Math.floor(b.weight * 100) // Steem weight is in percent * 100
        }))
      }]] : []
    };

    const client = getClient();
    if (!client) throw new Error("Steem client failed to initialize.");

    if (auth === 'KEYCHAIN') {
      return new Promise((resolve, reject) => {
        // @ts-ignore
        if (!window.steem_keychain) return reject(new Error(config.t('noKeychain')));
        // @ts-ignore
        window.steem_keychain.requestPost(author, title, finalBody, parentPermlink, '', meta, permlink, JSON.stringify(options), (res: any) => {
          if (res.success) resolve(res);
          else reject(new Error(res.message));
        });
      });
    } else {
      if (SecurityService.isLocked()) {
        let unlocked = false;
        let pinErrorMsg = '';
        let pinToTry = config.vaultPin;
        while (!unlocked) {
          const pin = pinToTry || await config.promptDialog(
            pinErrorMsg ? `${config.t('pinError')} (${pinErrorMsg}). ${config.t('enterPin')}` : config.t('enterPin'),
            '',
            undefined,
            'password'
          );
          pinToTry = '';
          if (!pin) throw new Error(config.t('pinRequired'));
          try {
            await SecurityService.unlock(pin);
            await config.initVault();
            unlocked = true;
          } catch (e: any) {
            pinErrorMsg = e.message || 'Incorrect PIN';
            config.notify(`❌ ${pinErrorMsg}`, 'error');
          }
        }
      }
      const comment = {
        author,
        title,
        body: finalBody,
        parent_author: '',
        parent_permlink: parentPermlink,
        permlink,
        json_metadata: meta
      };
      return SecurityService.broadcastPost(client, comment, author, options);
    }
  }, [config]);

  const publishFromQueue = useCallback(async (id: string) => {
    const item = queue.find(i => i.id === id);
    if (!item) return;

    config.setPubLog({ msg: `${config.t('publishing')} ${item.title}...`, type: 'loading' });
    
    try {
      const author = item.authType === 'VAULT' ? item.selectedVaultUser : item.username;
      await performBroadcast(author, item.title, item.body, item.tags, item.authType);
      
      const updated = queue.map(i => i.id === id ? { ...i, status: 'published' as const } : i);
      setQueue(updated);
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
      config.setPubLog({ msg: config.t('publishedSuccess'), type: 'success' });
    } catch (err: any) {
      const updated = queue.map(i => i.id === id ? { ...i, status: 'error' as const, error: err.message } : i);
      setQueue(updated);
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
      config.setPubLog({ msg: `❌ ${config.t('error')}: ${err.message}`, type: 'error' });
    }
  }, [queue, performBroadcast, config]);

  const addToQueue = useCallback((currentMarkdown: string) => {
    const activeUser = config.authType === 'VAULT' ? config.selectedVaultUser : config.username;
    if (!activeUser || !config.pubTitle || !config.pubTags) {
      config.setPubLog({ msg: config.t('error'), type: 'error' });
      return;
    }
    
    let actualContent = currentMarkdown;
    if (config.removeTitleLine) {
      const lines = currentMarkdown.split('\n');
      actualContent = lines.slice(1).join('\n').trim();
    }
    const processedContent = processContentForSteem(actualContent);

    const newItem: QueueItem = {
      id: Date.now().toString(),
      title: config.pubTitle,
      body: processedContent,
      tags: config.pubTags,
      authType: config.authType === 'VAULT' ? 'VAULT' : 'KEYCHAIN',
      username: config.username,
      selectedVaultUser: config.selectedVaultUser,
      scheduledTime: scheduledTime,
      status: 'pending'
    };

    const updated = [...queue, newItem];
    setQueue(updated);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
    config.setPubLog({ msg: config.t('published'), type: 'success' });
    setTimeout(() => config.setActiveModal(null), 1000);
  }, [queue, scheduledTime, config]);

  return {
    queue,
    setQueue,
    scheduledTime,
    setScheduledTime,
    performBroadcast,
    publishFromQueue,
    addToQueue,
  };
}
