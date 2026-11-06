import { useState } from 'react';
import { Buffer } from 'buffer';
import { getClient, verifyPostOnChain, probeNodes, getActiveNode } from '../lib/steem';
import { SecurityService } from '../services/securityService';
import { AuthType } from '../types';
import { findWorkingPredictedImageUrl } from '../utils/steemImagePrediction';
import { NativeHttpService } from '../services/nativeHttpService';

interface UseReaderBlockchainActionsProps {
  authType: AuthType;
  selectedVaultUser: string;
  username: string;
  imageUploadAccount: string;
  vaultAccounts: string[];
  vaultPin?: string;
  appAgent: string;
  mutedUsers: string[];
  setMutedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  initVault: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  setPubLog: React.Dispatch<React.SetStateAction<{ msg: string; type: 'success' | 'error' | 'loading' | null }>>;
  promptDialog: (message: string, defaultValue?: string, title?: string, inputType?: 'text' | 'password') => Promise<string | null>;
  sanitizeFilename: (name: string) => string;
  setUsername: (name: string) => void;
  t: (key: any) => string;
}

export function useReaderBlockchainActions({
  authType,
  selectedVaultUser,
  username,
  imageUploadAccount,
  vaultAccounts,
  vaultPin,
  appAgent,
  mutedUsers,
  setMutedUsers,
  initVault,
  notify,
  setPubLog,
  promptDialog,
  sanitizeFilename,
  setUsername,
  t,
}: UseReaderBlockchainActionsProps) {
  const [loadingContext, setLoadingContext] = useState<Set<string>>(new Set());

  const ensureVaultUnlocked = async () => {
    if (authType === 'VAULT' && SecurityService.isLocked()) {
      let pin = vaultPin?.trim() || '';
      if (!pin && promptDialog) {
        pin = (await promptDialog(t('enterPin'), '', undefined, 'password')) || '';
      }
      if (!pin) {
        let unlocked = false;
        let pinErrorMsg = '';
        while (!unlocked) {
          const pass = await promptDialog(
            pinErrorMsg ? `${t('pinError')} (${pinErrorMsg}). ${t('enterPin')}` : t('enterPin'),
            '',
            undefined,
            'password'
          );
          if (!pass) throw new Error(t('pinRequired'));
          try {
            await SecurityService.unlock(pass);
            initVault();
            unlocked = true;
          } catch (e: any) {
            pinErrorMsg = e.message || 'Incorrect PIN';
            notify(`❌ ${pinErrorMsg}`, 'error');
          }
        }
      } else {
        try {
          await SecurityService.unlock(pin);
          initVault();
        } catch (e: any) {
          let unlocked = false;
          let pinErrorMsg = e.message || 'Incorrect PIN';
          while (!unlocked) {
            const pass = await promptDialog(
              `${t('pinError')} (${pinErrorMsg}). ${t('enterPin')}`,
              '',
              undefined,
              'password'
            );
            if (!pass) throw new Error(t('pinRequired'), { cause: e });
            try {
              await SecurityService.unlock(pass);
              initVault();
              unlocked = true;
            } catch (err: any) {
              pinErrorMsg = err.message || 'Incorrect PIN';
              notify(`❌ ${pinErrorMsg}`, 'error');
            }
          }
        }
      }
    }
    SecurityService.touchSession();
  };

  const handleDeleteComment = async (author: string, permlink: string) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }
    
    try {
      await ensureVaultUnlocked();
      setPubLog({ msg: t('deletingStatus'), type: 'loading' });
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      
      if (authType === 'VAULT') {
        await SecurityService.broadcastDeleteComment(client, activeUser, permlink);
      } else {
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestBroadcast(activeUser, [['delete_comment', { author: activeUser, permlink }]], 'Posting', (response: any) => {
            if (response.success) resolve(response);
            else reject(new Error(response.message));
          });
        });
      }
      setPubLog({ msg: t('deletedSuccess'), type: 'success' });
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    } catch (err: any) {
      console.error(err);
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
      throw err;
    }
  };

  const handleUploadImageForReader = async (file: File): Promise<string> => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const uploadAuthType = imageUploadAccount ? 'VAULT' : (hasKeychain ? 'KEYCHAIN' : 'VAULT');
    let activeUser = imageUploadAccount || username || selectedVaultUser || (vaultAccounts.length > 0 ? vaultAccounts[0] : '');

    if (!activeUser) {
      if (uploadAuthType !== 'VAULT') {
        const inputUser = await promptDialog(t('username'));
        if (!inputUser) throw new Error("No username");
        activeUser = inputUser.replace('@', '');
        setUsername(activeUser);
        localStorage.setItem('steem_username', activeUser);
      } else {
         throw new Error("No Vault user selected.");
      }
    }
    
    if (uploadAuthType === 'VAULT') {
      await ensureVaultUnlocked();
    }

    setPubLog({ msg: t('uploadingStatus').replace('{name}', file.name), type: 'loading' });
    try {
      const sanitizedName = sanitizeFilename(file.name);
      const safeFile = new File([file], sanitizedName, { type: file.type });
      let signature = '';
      if (uploadAuthType === 'VAULT') {
        const arrayBuffer = await safeFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
        const dataToSign = Buffer.concat([prefix, fileBuffer]);
        signature = await SecurityService.signBuffer(dataToSign, activeUser);
      } else {
        signature = await SecurityService.signImageChallengeWithKeychain(safeFile, activeUser);
      }

      const formData = new FormData();
      formData.append("file", safeFile);
      const uploadEndpoint = `https://steemitimages.com/${activeUser}/${signature}`;
      let url = '';

      // 1. Try Native HTTP if in Tauri, Neutralino, or Android
      if (NativeHttpService.isNativeEnvironment()) {
        const nativeRes = await NativeHttpService.tryUpload(safeFile, uploadEndpoint, safeFile.name);
        if (nativeRes.handled && nativeRes.success && nativeRes.url) {
          url = nativeRes.url;
        }
      }

      if (!url) {
        try {
          const res = await fetch(uploadEndpoint, { method: "POST", body: formData });
          if (res.ok) {
            try {
              const data = await res.json();
              url = data.url || data.link || data.data?.url || '';
            } catch {
              // CORS blocked JSON response reading
            }
          }
        } catch {
          // Direct CORS fetch failed; issue no-cors POST so browser transmits file payload to server
          try {
            await fetch(uploadEndpoint, { method: "POST", body: formData, mode: "no-cors" });
          } catch {
            // Ignore no-cors transport errors
          }
        }
      }

      if (!url) {
        const predicted = await findWorkingPredictedImageUrl(safeFile, safeFile.name);
        if (predicted) {
          url = predicted;
        }
      }

      if (url) {
        return url;
      }
      throw new Error("Image upload could not be verified on server.");
    } finally {
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    }
  };

  const handleReaderComment = async (parentAuthor: string, parentPermlink: string, body: string, editPermlink?: string) => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const effectiveAuth = authType;
    const activeUser = effectiveAuth === 'VAULT' ? (selectedVaultUser || username) : (username || selectedVaultUser);

    if (!activeUser) {
      notify(t('noAccount'), 'error');
      throw new Error(t('noAccount'));
    }

    if (effectiveAuth === 'VAULT' && SecurityService.isLocked()) {
      await ensureVaultUnlocked();
    }

    const maxAttempts = 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setPubLog({ msg: t('publishing'), type: 'loading' });
        const permlink = editPermlink || `re-${parentAuthor.replace(/\./g, '')}-${Date.now()}`;
        const meta = JSON.stringify({ tags: [], app: appAgent, format: 'markdown' });
        
        const client = getClient();
        if (!client) throw new Error("Steem client failed to initialize.");
        const comment = {
          author: activeUser,
          title: '',
          body,
          parent_author: parentAuthor,
          parent_permlink: parentPermlink,
          permlink,
          json_metadata: meta
        };

        if (effectiveAuth === 'KEYCHAIN') {
          if (!(window as any).steem_keychain) {
            throw new Error("Steem Keychain extension not found! Please install it.");
          }
          const currentRpc = getActiveNode();
          await new Promise((resolve, reject) => {
            (window as any).steem_keychain.requestPost(
              activeUser,
              '',
              body,
              parentPermlink,
              parentAuthor,
              meta,
              permlink,
              '',
              async (res: any) => {
                if (res.success) resolve(res);
                else {
                  const isPublished = await verifyPostOnChain(activeUser, permlink, 3, 1200, body);
                  if (isPublished) resolve(res);
                  else reject(new Error(res.message || "Keychain request failed"));
                }
              },
              currentRpc
            );
          });
        } else {
          await SecurityService.broadcastPost(client, comment, activeUser);
        }
        
        notify(t('publishedSuccess'), 'success');
        return;
      } catch (err: any) {
        lastError = err;
        const errMsg = (err?.message || String(err)).toLowerCase();
        const isExpirationOrTimeout = errMsg.includes('expiration') || errMsg.includes('timeout') || errMsg.includes('expired');

        if (attempt < maxAttempts && isExpirationOrTimeout) {
          console.warn(`[handleReaderComment] Attempt ${attempt} failed with expiration/timeout (${err.message}). Probing nodes and retrying...`);
          setPubLog({ msg: `${t('publishing')} (Retry ${attempt + 1})...`, type: 'loading' });
          await probeNodes(true);
          await new Promise(r => setTimeout(r, 1200));
          continue;
        }

        if (isExpirationOrTimeout) {
          const guidance = t('txExpirationGuidance');
          const formattedErr = new Error(`${err.message || 'Transaction expiration exception'}. ${guidance}`);
          notify(formattedErr.message, 'error');
          throw formattedErr;
        }

        notify(err.message || String(err), 'error');
        throw err;
      } finally {
        setPubLog({ msg: '', type: null });
      }
    }

    if (lastError) throw lastError;
  };

  const handleMuteUser = async (targetUser: string, mute: boolean = true) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }

    try {
      await ensureVaultUnlocked();
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      
      const json = JSON.stringify(['follow', { follower: activeUser, following: targetUser, what: mute ? ['ignore'] : [''] }]);
      
      if (authType === 'KEYCHAIN') {
        if (!(window as any).steem_keychain) {
          throw new Error("Steem Keychain extension not found! Please install it.");
        }
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestCustomJson(activeUser, 'follow', 'Posting', json, 'mute', (res: any) => {
            if (res.success) resolve(res);
            else reject(new Error(res.message || "Keychain request failed"));
          });
        });
      } else {
        await SecurityService.broadcastCustomJson(client, {
          required_auths: [],
          required_posting_auths: [activeUser],
          id: 'follow',
          json: json
        }, activeUser);
      }
      notify(mute ? t('userMutedSuccess').replace('{user}', targetUser) : t('userUnmutedSuccess').replace('{user}', targetUser), 'success');
      setMutedUsers(prev => {
        let next;
        if (mute) next = Array.from(new Set([...prev, targetUser]));
        else next = prev.filter(u => u !== targetUser);
        localStorage.setItem('steem_muted_users', JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      notify(err.message || String(err), 'error');
      throw err;
    }
  };

  const handleReaderVote = async (author: string, permlink: string, weight: number) => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const effectiveAuth = authType;
    const activeUser = effectiveAuth === 'VAULT' ? (selectedVaultUser || username) : (username || selectedVaultUser);

    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }

    const key = `${author}/${permlink}`;
    if (loadingContext.has(key)) return;
    setLoadingContext(prev => new Set(prev).add(key));

    try {
      if (effectiveAuth === 'VAULT' && SecurityService.isLocked()) {
        await ensureVaultUnlocked();
      }

      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      const vote = { voter: activeUser, author, permlink, weight };

      if (effectiveAuth === 'KEYCHAIN') {
        if (!(window as any).steem_keychain) {
          throw new Error("Steem Keychain extension not found! Please install it.");
        }
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestVote(activeUser, permlink, author, weight, (res: any) => {
            if (res.success) resolve(res);
            else reject(new Error(res.message || "Keychain request failed"));
          });
        });
      } else {
        await SecurityService.broadcastVote(client, vote, activeUser);
      }
      notify(t('saveSuccess'), 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoadingContext(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return {
    handleDeleteComment,
    handleUploadImageForReader,
    handleReaderComment,
    handleMuteUser,
    handleReaderVote,
  };
}
