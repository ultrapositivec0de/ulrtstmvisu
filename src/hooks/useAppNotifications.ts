import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseAppNotificationsProps {
  t: (key: any) => string;
}

export interface PubLogState {
  msg: string;
  type: 'success' | 'error' | 'loading' | null;
}

export function useAppNotifications({ t }: UseAppNotificationsProps) {
  // 1. Auto-Inbox Configuration
  const [autoInbox, setAutoInbox] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('steem_reader_config_v1');
      if (saved) {
        return Boolean(JSON.parse(saved).autoShowInbox);
      }
    } catch (e) {
      void e;
    }
    return false;
  });

  const handleSetAutoInbox = useCallback((enabled: boolean) => {
    setAutoInbox(enabled);
    try {
      const saved = localStorage.getItem('steem_reader_config_v1');
      const cfg = saved ? JSON.parse(saved) : {};
      cfg.autoShowInbox = enabled;
      localStorage.setItem('steem_reader_config_v1', JSON.stringify(cfg));
    } catch (e) {
      void e;
    }
  }, []);

  // 2. Publication Operation Log & Toast Notifications
  const [pubLog, setPubLogState] = useState<PubLogState>({ msg: '', type: null });
  const pubLogTimerRef = useRef<any>(null);

  const clearPubLogTimer = useCallback(() => {
    if (pubLogTimerRef.current) {
      clearTimeout(pubLogTimerRef.current);
      pubLogTimerRef.current = null;
    }
  }, []);

  const setPubLog = useCallback((logOrFn: any) => {
    clearPubLogTimer();
    setPubLogState(prev => {
      const next = typeof logOrFn === 'function' ? logOrFn(prev) : logOrFn;
      if (!next || !next.msg) {
        return { msg: '', type: null };
      }
      const timeout = next.type === 'loading' ? 25000 : 3800;
      pubLogTimerRef.current = setTimeout(() => {
        setPubLogState(current => (current.msg === next.msg ? { msg: '', type: null } : current));
      }, timeout);
      return next;
    });
  }, [clearPubLogTimer]);

  const notify = useCallback((msg: string, type: 'success' | 'error' | 'loading' = 'success') => {
    if (!msg) {
      clearPubLogTimer();
      setPubLogState({ msg: '', type: null });
      return;
    }
    // Deduplication: refresh timer if identical message is already showing
    setPubLogState(current => {
      if (current.msg === msg && current.type === type) {
        clearPubLogTimer();
        const timeout = type === 'loading' ? 25000 : 3800;
        pubLogTimerRef.current = setTimeout(() => {
          setPubLogState(c => (c.msg === msg ? { msg: '', type: null } : c));
        }, timeout);
        return current;
      }
      clearPubLogTimer();
      const timeout = type === 'loading' ? 25000 : 3800;
      pubLogTimerRef.current = setTimeout(() => {
        setPubLogState(c => (c.msg === msg ? { msg: '', type: null } : c));
      }, timeout);
      return { msg, type };
    });
  }, [clearPubLogTimer]);

  useEffect(() => {
    return () => {
      if (pubLogTimerRef.current) clearTimeout(pubLogTimerRef.current);
    };
  }, []);

  // 3. Quick Tags Management & Pinning
  const [quickTags, setQuickTags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('steem_quick_tags_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.debug(e);
    }
    return ['steem', 'steemit', 'blog', 'ukraine', 'steemexclusive', 'writing', 'life', 'art'];
  });

  const pinTag = useCallback((tag: string) => {
    const cleanTag = tag.toLowerCase().replace(/[^a-z0-9-]/g, '').trim();
    if (!cleanTag) return;
    setQuickTags(prev => {
      if (prev.includes(cleanTag)) {
        notify(t('tagAlreadyPinnedNotify').replace('{tag}', cleanTag), 'error');
        return prev;
      }
      const updated = [...prev, cleanTag];
      localStorage.setItem('steem_quick_tags_v1', JSON.stringify(updated));
      notify(t('tagPinnedSuccessNotify').replace('{tag}', cleanTag), 'success');
      return updated;
    });
  }, [t, notify]);

  return {
    pubLog,
    setPubLog,
    clearPubLogTimer,
    notify,
    quickTags,
    setQuickTags,
    pinTag,
    autoInbox,
    setAutoInbox,
    handleSetAutoInbox,
  };
}
