import { useEffect, useCallback } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { useModalStore } from '../stores/useModalStore';
import { useAppUIStore } from '../stores/useAppUIStore';

export const isTauriEnv = () =>
  typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);

export const isNeutralinoEnv = () =>
  typeof window !== 'undefined' && ('Neutralino' in window || !!(window as any).Neutralino);

export interface UseAppUIOptions {
  showTableSelector?: boolean;
  setShowTableSelector?: (show: boolean) => void;
  isWidgetMenuOpen?: boolean;
  setIsWidgetMenuOpen?: (open: boolean) => void;
}

export function useAppUI(options: UseAppUIOptions = {}) {
  const {
    showTableSelector = false,
    setShowTableSelector,
    isWidgetMenuOpen = false,
    setIsWidgetMenuOpen,
  } = options;

  const isMobileLayout = useDeviceStore((s) => s.isMobileLayout);
  
  // Zustand stores as single source of truth
  const activeModal = useModalStore((s) => s.activeModal);
  const setActiveModal = useModalStore((s) => s.setActiveModal);
  const activeView = useAppUIStore((s) => s.activeView);
  const setActiveView = useAppUIStore((s) => s.setActiveView);
  const isSidebarOpen = useAppUIStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useAppUIStore((s) => s.setIsSidebarOpen);
  const isFullScreen = useAppUIStore((s) => s.isFullScreen);
  const setIsFullScreen = useAppUIStore((s) => s.setIsFullScreen);
  const isEditorFullScreen = useAppUIStore((s) => s.isEditorFullScreen);
  const setIsEditorFullScreen = useAppUIStore((s) => s.setIsEditorFullScreen);
  const toggleEditorFullScreen = useAppUIStore((s) => s.toggleEditorFullScreen);

  // Sync sidebar open state with desktop layout so it is never lost on PC
  useEffect(() => {
    if (!isMobileLayout) {
      setIsSidebarOpen(true);
    }
  }, [isMobileLayout, setIsSidebarOpen]);

  useEffect(() => {
    if (isTauriEnv()) {
      document.documentElement.classList.add('is-tauri');
    }
  }, []);

  const toggleFullScreen = useCallback(() => {
    const next = !isFullScreen;
    setIsFullScreen(next);
    if (isTauriEnv()) {
      import('@tauri-apps/api/window')
        .then(({ getCurrentWindow }) => {
          getCurrentWindow().setFullscreen(next).catch(() => {});
        })
        .catch(() => {});
    } else if (isNeutralinoEnv()) {
      try {
        const neu = (window as any).Neutralino;
        if (neu?.window) {
          if (next) {
            neu.window.setFullScreen().catch(() => {});
          } else {
            neu.window.exitFullScreen().catch(() => {});
          }
        }
      } catch (e) {
        console.warn('[Neutralino Fullscreen error]', e);
      }
    } else {
      if (next) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }
  }, [isFullScreen, setIsFullScreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (isTauriEnv() || isNeutralinoEnv()) return;
      const isNativeFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (!isNativeFs) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [setIsFullScreen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        const isTauri = isTauriEnv();
        const isNeu = isNeutralinoEnv();

        if (isFullScreen) {
          setIsFullScreen(false);
          if (isTauri) {
            import('@tauri-apps/api/window').then(({ getCurrentWindow }) =>
              getCurrentWindow().setFullscreen(false).catch(() => {})
            );
          } else if (isNeu) {
            try {
              (window as any).Neutralino?.window?.exitFullScreen().catch(() => {});
            } catch {
              /* ignore neutralino error */
            }
          } else if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } else {
          setIsFullScreen(true);
          if (isTauri) {
            import('@tauri-apps/api/window').then(({ getCurrentWindow }) =>
              getCurrentWindow().setFullscreen(true).catch(() => {})
            );
          } else if (isNeu) {
            try {
              (window as any).Neutralino?.window?.setFullScreen().catch(() => {});
            } catch {
              /* ignore neutralino error */
            }
          } else if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        if (showTableSelector && setShowTableSelector) {
          setShowTableSelector(false);
          return;
        }
        if (isWidgetMenuOpen && setIsWidgetMenuOpen) {
          setIsWidgetMenuOpen(false);
          return;
        }
        if (activeModal) {
          setActiveModal(null);
          return;
        }

        if (isEditorFullScreen) {
          setIsEditorFullScreen(false);
          return;
        }
        if (isFullScreen) {
          setIsFullScreen(false);
          if (isTauriEnv()) {
            import('@tauri-apps/api/window').then(({ getCurrentWindow }) =>
              getCurrentWindow().setFullscreen(false).catch(() => {})
            );
          } else if (isNeutralinoEnv()) {
            try {
              (window as any).Neutralino?.window?.exitFullScreen().catch(() => {});
            } catch {
              /* ignore neutralino error */
            }
          } else if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          return;
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    showTableSelector,
    setShowTableSelector,
    isWidgetMenuOpen,
    setIsWidgetMenuOpen,
    activeModal,
    setActiveModal,
    isEditorFullScreen,
    setIsEditorFullScreen,
    isFullScreen,
    setIsFullScreen,
  ]);

  return {
    activeModal,
    setActiveModal,
    activeView,
    setActiveView,
    isSidebarOpen,
    setIsSidebarOpen,
    isFullScreen,
    setIsFullScreen,
    isEditorFullScreen,
    setIsEditorFullScreen,
    toggleFullScreen,
    toggleEditorFullScreen,
    isTauriEnv,
    isNeutralinoEnv,
  };
}
