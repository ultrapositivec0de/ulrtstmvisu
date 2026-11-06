import { useState, useEffect, useCallback } from 'react';
import { SecurityService } from '../services/securityService';
import { AuthType } from '../types';

export function useSteemAuth() {
  const [authType, setAuthTypeState] = useState<AuthType | 'VAULT'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('steem_auth_type');
      if (saved === 'VAULT' || saved === 'KEYCHAIN') {
        return saved;
      }
      if (!(window as any).steem_keychain) {
        return 'VAULT';
      }
      return 'KEYCHAIN';
    }
    return 'KEYCHAIN';
  });

  const setAuthType = useCallback((typeOrFn: (AuthType | 'VAULT') | ((prev: AuthType | 'VAULT') => AuthType | 'VAULT')) => {
    setAuthTypeState(prev => {
      const next = typeof typeOrFn === 'function' ? typeOrFn(prev) : typeOrFn;
      if (typeof window !== 'undefined') {
        localStorage.setItem('steem_auth_type', next);
      }
      return next;
    });
  }, []);

  const [keychainAccounts, setKeychainAccounts] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('steem_keychain_accounts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return Array.from(new Set(parsed.map((a: string) => (a || '').trim().replace(/^@/, '').toLowerCase()).filter(Boolean)));
          }
        }
      } catch {
        // ignore JSON parse error
      }
      const cur = (localStorage.getItem('steem_username') || '').trim().replace(/^@/, '').toLowerCase();
      return cur ? [cur] : [];
    }
    return [];
  });

  const addKeychainAccount = useCallback((newAcc: string) => {
    const clean = newAcc.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return;
    setKeychainAccounts(prev => {
      if (prev.includes(clean)) return prev;
      const next = [...prev, clean];
      if (typeof window !== 'undefined') {
        localStorage.setItem('steem_keychain_accounts', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const removeKeychainAccount = useCallback((accToRemove: string) => {
    const clean = accToRemove.trim().replace(/^@/, '').toLowerCase();
    setKeychainAccounts(prev => {
      const next = prev.filter(a => a !== clean);
      if (typeof window !== 'undefined') {
        localStorage.setItem('steem_keychain_accounts', JSON.stringify(next));
      }
      return next;
    });
    setUsernameState(prev => {
      if (prev === clean) {
        let nextUser = '';
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('steem_keychain_accounts');
            if (saved) {
              const parsed = JSON.parse(saved);
              const remaining = parsed.filter((a: string) => a !== clean);
              nextUser = remaining[0] || '';
            }
          } catch {
            // ignore JSON parse error
          }
          localStorage.setItem('steem_username', nextUser);
        }
        return nextUser;
      }
      return prev;
    });
  }, []);

  const [username, setUsernameState] = useState(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('steem_username') || '').trim().replace(/^@/, '').toLowerCase();
    }
    return '';
  });

  const setUsername = useCallback((name: string | ((prev: string) => string)) => {
    setUsernameState(prev => {
      const nextVal = typeof name === 'function' ? name(prev) : name;
      const cleanVal = (nextVal || '').trim().replace(/^@/, '').toLowerCase();
      if (typeof window !== 'undefined') {
        if (cleanVal) {
          localStorage.setItem('steem_username', cleanVal);
        }
      }
      if (cleanVal) {
        addKeychainAccount(cleanVal);
      }
      return cleanVal;
    });
  }, [addKeychainAccount]);

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

  const switchIdentity = useCallback((user: string, type: 'KEYCHAIN' | 'VAULT') => {
    const clean = user.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return;
    if (type === 'KEYCHAIN') {
      setAuthType('KEYCHAIN');
      setUsername(clean);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('steem_prefer_vault');
        localStorage.setItem('steem_auth_type', 'KEYCHAIN');
        localStorage.setItem('steem_username', clean);
      }
      addKeychainAccount(clean);
    } else {
      setAuthType('VAULT');
      setSelectedVaultUser(clean);
      if (typeof window !== 'undefined') {
        localStorage.setItem('steem_prefer_vault', 'true');
        localStorage.setItem('steem_auth_type', 'VAULT');
      }
    }
  }, [setAuthType, setUsername, addKeychainAccount]);
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

    const handleKeychainReady = () => {
      if ((window as any).steem_keychain) {
        setAuthType(prev => (prev === 'VAULT' && !localStorage.getItem('steem_prefer_vault') ? 'KEYCHAIN' : prev));
      }
    };

    let checkAttempts = 0;
    const keychainInterval = setInterval(() => {
      checkAttempts++;
      if (typeof window !== 'undefined' && (window as any).steem_keychain) {
        handleKeychainReady();
        clearInterval(keychainInterval);
      }
      if (checkAttempts > 25) {
        clearInterval(keychainInterval);
      }
    }, 100);

    SecurityService.setStatusCallback((unlocked) => {
      setIsUnlocked(unlocked);
    });

    return () => {
      clearInterval(keychainInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('steem_keychain_ready', handleKeychainReady);
        window.removeEventListener('load', handleKeychainReady);
      }
      SecurityService.setStatusCallback(() => {});
    };
  }, [initVault, setAuthType]);

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
    keychainAccounts,
    addKeychainAccount,
    removeKeychainAccount,
    switchIdentity,
  };
}
export type UseSteemAuthReturn = ReturnType<typeof useSteemAuth>;
