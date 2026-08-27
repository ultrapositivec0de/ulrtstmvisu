import { useState, useEffect, useCallback } from 'react';

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

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'editor' | 'reader'>('editor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditorFullScreen, setIsEditorFullScreen] = useState(false);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => {
      const next = !prev;
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
      return next;
    });
  }, [isTauriEnv, isNeutralinoEnv]);

  const toggleEditorFullScreen = useCallback(() => {
    setIsEditorFullScreen((prev) => !prev);
  }, []);

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
  }, [isTauriEnv, isNeutralinoEnv]);

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
    isEditorFullScreen,
    isFullScreen,
    isTauriEnv,
    isNeutralinoEnv,
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
