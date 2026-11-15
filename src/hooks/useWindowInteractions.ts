import { useState, useCallback, useEffect } from 'react';

export interface UseWindowInteractionsProps {
  performanceMode: boolean;
  hasLoadedRef?: React.MutableRefObject<boolean>;
  setShowNotificationList?: (show: boolean) => void;
}

export function useWindowInteractions({
  performanceMode,
  hasLoadedRef,
  setShowNotificationList,
}: UseWindowInteractionsProps) {
  // 1. Mobile & Header Dropdown States
  const [showMobileToolsOpen, setShowMobileToolsOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileTools1, setShowMobileTools1] = useState(false);
  const [showMobileTools2, setShowMobileTools2] = useState(false);

  // 2. Click Outside Listener for Popovers and Dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('.mobile-tools-container') &&
        !target.closest('.font-size-popover-container') &&
        !target.closest('.notification-container') &&
        !target.closest('.lang-menu-container') &&
        !target.closest('.widget-settings-container') &&
        !target.closest('.steem-widget-container')
      ) {
        setShowMobileTools1(false);
        setShowMobileTools2(false);
        setShowMobileToolsOpen(false);
        if (setShowNotificationList) {
          setShowNotificationList(false);
        }
        setShowLangMenu(false);
      }
    };

    if (showMobileTools1 || showMobileTools2 || showMobileToolsOpen || showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileTools1, showMobileTools2, showMobileToolsOpen, showLangMenu, setShowNotificationList]);

  // 3. Storage Safety & Fallback Pipeline
  const saveLargeStorage = useCallback((key: string, val: string) => {
    // Safety: Prevent clearing storage during the initial loading window
    if (!val && hasLoadedRef && !hasLoadedRef.current) {
      console.warn(`Prevented clearing ${key} during initial load window.`);
      return;
    }
    try {
      localStorage.setItem(key, val);
    } catch (e) {
      console.warn(`LocalStorage quota exceeded for ${key} (large document):`, e);
      try {
        sessionStorage.setItem(key, val);
      } catch (err) {
        console.warn('SessionStorage quota exceeded as well:', err);
      }
    }
  }, [hasLoadedRef]);

  // 4. Performance-Adaptive Motion Animation Configurations
  const getMotionConfig = useCallback((custom?: { initial?: any; animate?: any; exit?: any }) => {
    if (performanceMode) {
      return {
        initial: false,
        animate: custom?.animate || { opacity: 1, scale: 1, y: 0, x: 0 },
        exit: false as any,
        transition: { duration: 0 },
      };
    }
    return {
      initial: custom?.initial || { opacity: 0, y: 10, scale: 0.95 },
      animate: custom?.animate || { opacity: 1, y: 0, scale: 1 },
      exit: custom?.exit || { opacity: 0, y: 10, scale: 0.95 },
      transition: { duration: 0.15 },
    };
  }, [performanceMode]);

  const getSidebarMotionConfig = useCallback(() => {
    if (performanceMode) {
      return {
        initial: false,
        animate: { x: 0, opacity: 1 },
        exit: false as any,
        transition: { duration: 0 },
      };
    }
    return {
      initial: { x: -300, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -300, opacity: 0 },
      transition: { duration: 0.3 },
    };
  }, [performanceMode]);

  return {
    showMobileToolsOpen,
    setShowMobileToolsOpen,
    showLangMenu,
    setShowLangMenu,
    showMobileTools1,
    setShowMobileTools1,
    showMobileTools2,
    setShowMobileTools2,
    saveLargeStorage,
    getMotionConfig,
    getSidebarMotionConfig,
  };
}
