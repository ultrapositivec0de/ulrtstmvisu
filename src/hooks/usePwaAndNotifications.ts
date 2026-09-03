import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SteemNotification, AuthType } from '../types';
import { callWithFallback } from '../lib/steem';

interface UsePwaAndNotificationsProps {
  t: (key: any) => string;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  currentUser: string;
}

export function usePwaAndNotifications({
  t,
  notify,
  currentUser,
}: UsePwaAndNotificationsProps) {
  // --- Notifications State ---
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('steem_notif_enabled') !== 'false');
  const [notifications, setNotifications] = useState<SteemNotification[]>([]);
  const [rawNotifications, setRawNotifications] = useState<any[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState<SteemNotification | null>(null);
  const [showNotificationList, setShowNotificationList] = useState(false);

  const [mutedUsers, setMutedUsers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('steem_muted_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const visibleNotifications = useMemo(() => {
    return notifications.filter(
      n => !mutedUsers.includes(n.author) && (!n.parent_author || !mutedUsers.includes(n.parent_author))
    );
  }, [notifications, mutedUsers]);

  const lastFetchedNotificationTime = useRef<string | null>(localStorage.getItem('steem_last_notif_time'));

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    
    try {
      const saved = localStorage.getItem('steem_hidden_replies');
      const hiddenSet = new Set<string>(saved ? JSON.parse(saved) : []);
      rawNotifications.forEach(r => hiddenSet.add(r.permlink));
      localStorage.setItem('steem_hidden_replies', JSON.stringify(Array.from(hiddenSet).slice(-200)));
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }

    window.dispatchEvent(new Event('steem_mark_all_read'));
  }, [rawNotifications]);

  useEffect(() => {
    localStorage.setItem('steem_notif_enabled', String(notifEnabled));
  }, [notifEnabled]);

  // Fetch muted users globally
  useEffect(() => {
    if (!currentUser) {
      setMutedUsers([]);
      return;
    }

    const fetchMuted = async () => {
      try {
        const result = await callWithFallback('condenser_api.get_following', [currentUser, '', 'ignore', 1000]);
        if (result && Array.isArray(result)) {
          const fetched = result.map((f: any) => f.following);
          setMutedUsers(fetched);
          localStorage.setItem('steem_muted_users', JSON.stringify(fetched));
        }
      } catch (err) {
        console.warn("Failed to fetch muted users globally:", err);
      }
    };

    fetchMuted();
    const interval = setInterval(fetchMuted, 300000); // 5 mins
    return () => clearInterval(interval);
  }, [currentUser]);

  // Poll for notifications
  useEffect(() => {
    if (!currentUser || !notifEnabled) return;

    const fetchNotifs = async () => {
      try {
        let readerConfig: any = null;
        try {
          const saved = localStorage.getItem('steem_reader_config_v1');
          if (saved) readerConfig = JSON.parse(saved);
        } catch {
          // ignore
        }
        
        if (readerConfig && readerConfig.autoShowInbox === false) {
          return;
        }

        let results: any[] = await callWithFallback('bridge.get_account_posts', {
          sort: 'replies',
          account: currentUser,
          limit: 50
        }).catch(() => null);

        if (results && Array.isArray(results)) {
          results = results.filter(p => p.author !== currentUser && p.parent_author === currentUser);
        }

        if (!results) {
          // Fallback if bridge is not available
          const state: any = await callWithFallback('condenser_api.get_state', [`/@${currentUser}/recent-replies`]).catch(() => null);
          if (state && state.content) {
            results = Object.values(state.content);
            results = results.filter((p: any) => p.author !== currentUser && p.parent_author === currentUser);
            results.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
            results = results.slice(0, 50);
          }
        }

        if (results && Array.isArray(results) && results.length > 0) {
          let filteredResults = results.filter(r => !mutedUsers.includes(r.author));
          
          if (readerConfig) {
            if (readerConfig.onlyWhitelist && readerConfig.whiteList && readerConfig.whiteList.length > 0) {
              filteredResults = filteredResults.filter((r: any) => readerConfig.whiteList.includes(r.author));
            } else if (readerConfig.blackList && readerConfig.blackList.length > 0) {
              filteredResults = filteredResults.filter((r: any) => !readerConfig.blackList.includes(r.author));
            }
            if (readerConfig.excludeMuted && readerConfig.mutedUsers) {
              filteredResults = filteredResults.filter((r: any) => !readerConfig.mutedUsers.includes(r.author));
            }
          }
          
          setRawNotifications(filteredResults);
          
          if (filteredResults.length === 0) return;

          const newNotifs: SteemNotification[] = filteredResults.map(r => ({
            id: r.permlink,
            type: 'reply',
            author: r.author,
            permlink: r.permlink,
            parent_author: r.parent_author,
            parent_permlink: r.parent_permlink,
            body: r.body,
            timestamp: r.created,
            isRead: false
          }));

          const newest = newNotifs[0];
          if (lastFetchedNotificationTime.current && newest.timestamp > lastFetchedNotificationTime.current) {
            // Save state for persistence across reloads
            localStorage.setItem('steem_last_notif_time', newest.timestamp);
            setShowNotificationPopup(newest);
            setTimeout(() => setShowNotificationPopup(null), 10000);
          }
          lastFetchedNotificationTime.current = newest.timestamp;
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const batch = [...prev];
            newNotifs.forEach(n => {
              if (!existingIds.has(n.id)) batch.unshift(n);
            });
            return batch.slice(0, 50);
          });
        }
      } catch (err) {
        console.warn("Notification poll failed:", err);
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000); // 60s
    return () => clearInterval(interval);
  }, [currentUser, notifEnabled, mutedUsers]);

  // --- PWA States & Logic ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    }
    return false;
  });
  const [showPwaBanner, setShowPwaBanner] = useState(() => {
    try {
      return localStorage.getItem('steem_pwa_banner_dismissed') !== 'true';
    } catch {
      return true;
    }
  });
  const [showPwaInstructionsModal, setShowPwaInstructionsModal] = useState(false);

  useEffect(() => {
    // Check standalone mode dynamically
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      if (isStandalone) {
        setIsPwaInstalled(true);
      }
    };
    checkStandalone();

    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Resolve sw.js relative to current page base so it works on GitHub Pages subdirectories, root domains, and previews
      const baseHref = document.baseURI || window.location.href;
      const baseDir = baseHref.split('?')[0].split('#')[0].replace(/\/[^/]*$/, '/');
      const swUrl = new URL('sw.js', baseDir).href;

      navigator.serviceWorker.register(swUrl, { scope: baseDir })
        .then((reg) => {
          console.log('PWA Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('PWA Service Worker registration failed:', err);
        });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      setShowPwaBanner(false);
      notify(t('pwaInstalled'), 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [t, notify]);

  const handleInstallPwa = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA installation user outcome: ${outcome}`);
        if (outcome === 'accepted') {
          setIsPwaInstalled(true);
          setDeferredPrompt(null);
          setShowPwaBanner(false);
          notify(t('pwaInstalled'), 'success');
        }
        return;
      } catch (err) {
        console.error('Failed to trigger PWA installation:', err);
      }
    }

    if (isPwaInstalled) {
      notify(t('pwaAlreadyInstalled'), 'success');
    } else {
      setShowPwaInstructionsModal(true);
    }
  }, [deferredPrompt, isPwaInstalled, notify, t]);

  return {
    // PWA
    deferredPrompt,
    setDeferredPrompt,
    isPwaInstalled,
    setIsPwaInstalled,
    showPwaBanner,
    setShowPwaBanner,
    showPwaInstructionsModal,
    setShowPwaInstructionsModal,
    handleInstallPwa,

    // Notifications
    notifEnabled,
    setNotifEnabled,
    notifications,
    setNotifications,
    rawNotifications,
    setRawNotifications,
    showNotificationPopup,
    setShowNotificationPopup,
    showNotificationList,
    setShowNotificationList,
    mutedUsers,
    setMutedUsers,
    visibleNotifications,
    markAllAsRead,
  };
}
