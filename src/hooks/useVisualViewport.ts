import { useEffect, useRef } from 'react';
import { useDeviceStore, DeviceStoreState } from '../store/deviceStore';
import { LayoutMode, FormFactor } from '../services/device/deviceService';

export interface VisualViewportState {
  viewportHeight: number;
  viewportWidth: number;
  windowInnerWidth: number;
  windowInnerHeight: number;
  offsetTop: number;
  pageTop: number;
  keyboardOffset: number;
  browserBottomInset: number;
  isKeyboardOpen: boolean;
  isMobile: boolean;
  isMobileLayout: boolean;
  isTouchDevice: boolean;
  isNativeApp: boolean;
  isNativeMobile: boolean;
  isNativeDesktop: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  formFactor: FormFactor;
  layoutPreference: LayoutMode;
  setLayoutPreference: (pref: LayoutMode) => void;
  updateMetrics: () => void;
}

/**
 * Universal Mobile Viewport, Virtual Keyboard & Device Detection Hook.
 * Works seamlessly across Web, PWA, Android WebView, iOS Safari, and Desktop apps (Windows, Linux, macOS).
 */
export function useVisualViewport(): VisualViewportState {
  const store = useDeviceStore();
  const wasKeyboardOpenRef = useRef<boolean>(false);
  const resetScrollTimerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    store.updateMetrics();

    // When virtual keyboard is open or collapsing, prevent layout viewport displacement anomalies (header shifting)
    const resetScrollOffsets = () => {
      if (typeof window === 'undefined') return;
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
      if (document.documentElement && (document.documentElement.scrollTop !== 0 || document.documentElement.scrollLeft !== 0)) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      if (document.body && (document.body.scrollTop !== 0 || document.body.scrollLeft !== 0)) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
    };

    const handleMetricsUpdate = () => {
      store.updateMetrics();
      const currentKeyboardOpen = useDeviceStore.getState().isKeyboardOpen;
      
      const activeEl = document.activeElement;
      const isInputFocused = Boolean(
        activeEl &&
        (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable ||
          activeEl.classList.contains('wysiwyg-editor')
        )
      );

      if (isInputFocused || currentKeyboardOpen) {
        resetScrollOffsets();
      } else if (wasKeyboardOpenRef.current && !currentKeyboardOpen) {
        if (resetScrollTimerRef.current) clearTimeout(resetScrollTimerRef.current);
        resetScrollOffsets();
        resetScrollTimerRef.current = setTimeout(resetScrollOffsets, 120);
      }

      wasKeyboardOpenRef.current = currentKeyboardOpen;
    };

    const onWindowScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
      if (document.documentElement && document.documentElement.scrollTop !== 0) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body && document.body.scrollTop !== 0) {
        document.body.scrollTop = 0;
      }
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleMetricsUpdate);
      vv.addEventListener('scroll', handleMetricsUpdate);
    }

    window.addEventListener('scroll', onWindowScroll, { passive: true });
    window.addEventListener('resize', handleMetricsUpdate);
    window.addEventListener('orientationchange', handleMetricsUpdate);
    window.addEventListener('focusin', handleMetricsUpdate);
    window.addEventListener('focusout', () => {
      setTimeout(handleMetricsUpdate, 50);
      setTimeout(handleMetricsUpdate, 200);
    });

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleMetricsUpdate);
        vv.removeEventListener('scroll', handleMetricsUpdate);
      }
      window.removeEventListener('scroll', onWindowScroll);
      window.removeEventListener('resize', handleMetricsUpdate);
      window.removeEventListener('orientationchange', handleMetricsUpdate);
      window.removeEventListener('focusin', handleMetricsUpdate);
      if (resetScrollTimerRef.current) clearTimeout(resetScrollTimerRef.current);
    };
  }, [store.updateMetrics]);

  return {
    viewportHeight: store.viewportHeight,
    viewportWidth: store.viewportWidth,
    windowInnerWidth: store.windowInnerWidth,
    windowInnerHeight: store.windowInnerHeight,
    offsetTop: store.offsetTop,
    pageTop: store.pageTop,
    keyboardOffset: store.keyboardOffset,
    browserBottomInset: store.browserBottomInset,
    isKeyboardOpen: store.isKeyboardOpen,
    isMobile: store.isMobileLayout, // backward-compatible alias
    isMobileLayout: store.isMobileLayout,
    isTouchDevice: store.isTouchDevice,
    isNativeApp: store.isNativeApp,
    isNativeMobile: store.isNativeMobile,
    isNativeDesktop: store.isNativeDesktop,
    isAndroid: store.isAndroid,
    isWindows: store.isWindows,
    formFactor: store.formFactor,
    layoutPreference: store.layoutPreference,
    setLayoutPreference: store.setLayoutPreference,
    updateMetrics: store.updateMetrics,
  };
}
