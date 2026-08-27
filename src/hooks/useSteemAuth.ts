import { useState, useEffect, useCallback } from 'react';
import { SecurityService } from '../services/securityService';
import { AuthType } from '../types';

export function useSteemAuth() {
  const [authType, setAuthType] = useState<AuthType | 'VAULT'>(() => {
    if (typeof window !== 'undefined' && !(window as any).steem_keychain) {
      return 'VAULT';
    }
    return 'KEYCHAIN';
  });

  const [username, setUsername] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('steem_username') || '';
    }
    return '';
  });

  const [selectedVaultUser, setSelectedVaultUser] = useState('');
  const [showAccountPrompt, setShowAccountPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('steem_username');
    }
    return true;
  });

  const [vaultPin, setVaultPin] = useState('');
  const [isVaultInitialized, setIsVaultInitialized] = useState(false);
  const [vaultAccounts, setVaultAccounts] = useState<string[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(!SecurityService.isLocked());

  const [pexelsApiKey, setPexelsApiKey] = useState<string | null>(null);
  const [pixabayApiKey, setPixabayApiKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('steem_pixabay_key');
    }
    return null;
  });
  const [unsplashAccessKey, setUnsplashAccessKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('steem_unsplash_access_key');
    }
    return null;
  });

  const activeUser = authType === 'VAULT' ? selectedVaultUser : username;

  const initVault = useCallback(async () => {
    const initialized = await SecurityService.isInitialized();
    setIsVaultInitialized(initialized);
    
    const accounts = await SecurityService.getAccounts();
    const usernames = Array.from(new Set(accounts.map(a => a.username)));
    setVaultAccounts(usernames);
    
    if (usernames.length > 0) {
      const firstUser = usernames[0];
      setSelectedVaultUser(prev => prev || firstUser);
      setUsername(prev => prev || firstUser);
    }
    
    const rawPxKey = localStorage.getItem('steem_pexels_key_raw');
    if (rawPxKey) {
      setPexelsApiKey(rawPxKey);
    } else {
      const pxKey = await SecurityService.getPexelsKey();
      if (pxKey) setPexelsApiKey(pxKey);
    }
    const encryptedPixabay = await SecurityService.getApiKey('pixabay');
    if (encryptedPixabay) setPixabayApiKey(encryptedPixabay);
    const encryptedUnsplashAccess = await SecurityService.getApiKey('unsplashAccess');
    if (encryptedUnsplashAccess) setUnsplashAccessKey(encryptedUnsplashAccess);
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      initVault();
    });

    SecurityService.setStatusCallback((unlocked) => {
      setIsUnlocked(unlocked);
    });

    return () => {
      SecurityService.setStatusCallback(() => {});
    };
  }, [initVault]);

  return {
    authType,
    setAuthType,
    username,
    setUsername,
    selectedVaultUser,
    setSelectedVaultUser,
    showAccountPrompt,
    setShowAccountPrompt,
    vaultPin,
    setVaultPin,
    isVaultInitialized,
    setIsVaultInitialized,
    vaultAccounts,
    setVaultAccounts,
    isUnlocked,
    setIsUnlocked,
    pexelsApiKey,
    setPexelsApiKey,
    pixabayApiKey,
    setPixabayApiKey,
    unsplashAccessKey,
    setUnsplashAccessKey,
    activeUser,
    initVault,
  };
}
export type UseSteemAuthReturn = ReturnType<typeof useSteemAuth>;
