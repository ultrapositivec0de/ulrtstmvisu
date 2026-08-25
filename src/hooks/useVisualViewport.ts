import { useState, useEffect, useRef, useCallback } from 'react';

export interface VisualViewportState {
  viewportHeight: number;
  viewportWidth: number;
  offsetTop: number;
  pageTop: number;
  keyboardOffset: number;
  browserBottomInset: number;
  isKeyboardOpen: boolean;
  isMobile: boolean;
}

/**
 * Universal Mobile Viewport & Virtual Keyboard Detection Hook.
 * Works seamlessly across Web, PWA, Android WebView, iOS Safari, and Desktop apps.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => {
    const isClient = typeof window !== 'undefined';
    const initW = isClient ? window.innerWidth : 1024;
    const initH = isClient ? (window.visualViewport?.height ?? window.innerHeight) : 768;
    return {
      viewportHeight: initH,
      viewportWidth: initW,
      offsetTop: 0,
      pageTop: 0,
      keyboardOffset: 0,
      browserBottomInset: 0,
      isKeyboardOpen: false,
      isMobile: isClient ? initW < 1024 : false,
    };
  });

  const maxSeenHeightRef = useRef<number>(typeof window !== 'undefined' ? window.innerHeight : 0);
  const wasKeyboardOpenRef = useRef<boolean>(false);
  const resetScrollTimerRef = useRef<any>(null);

  const updateMetrics = useCallback(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    const currentInnerH = window.innerHeight;
    const currentInnerW = window.innerWidth;
    const visualH = vv ? vv.height : currentInnerH;
    const visualW = vv ? vv.width : currentInnerW;
    const offsetTop = vv ? vv.offsetTop : 0;
    const isMobile = currentInnerW < 1024;

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

    // Update baseline maximum seen viewport height when keyboard is not up
    if (!isInputFocused && visualH > maxSeenHeightRef.current) {
      maxSeenHeightRef.current = visualH;
    }

    const baselineH = Math.max(maxSeenHeightRef.current, currentInnerH);

    // Difference between layout window height and visual viewport height
    const rawOverlayDiff = Math.max(0, currentInnerH - visualH - offsetTop);
    const heightShrinkDiff = baselineH - visualH;

    // Detect virtual keyboard presence
    const isKeyboardOpen = isMobile && (
      (isInputFocused && heightShrinkDiff > 130) ||
      rawOverlayDiff > 130 ||
      (isInputFocused && visualH < baselineH * 0.82)
    );

    // Calculate effective offset to lift fixed elements above overlaid virtual keyboards
    const effectiveKeyboardOffset = isKeyboardOpen ? Math.max(rawOverlayDiff, heightShrinkDiff) : 0;

    // Browser bottom address bar / navigation bar inset (when keyboard is closed)
    const browserBottomInset = !isKeyboardOpen && rawOverlayDiff > 0 ? rawOverlayDiff : 0;

    // Synchronize global CSS custom properties for hardware-accelerated layouts
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.style.setProperty('--vv-height', `${visualH}px`);
      document.documentElement.style.setProperty('--keyboard-offset', `${effectiveKeyboardOffset}px`);
      document.documentElement.style.setProperty('--browser-bottom-inset', `${browserBottomInset}px`);
      document.documentElement.style.setProperty('--viewport-bottom-offset', `${isKeyboardOpen ? effectiveKeyboardOffset : browserBottomInset}px`);
      document.documentElement.style.setProperty('--safe-bottom-total', `calc(env(safe-area-inset-bottom, 0px) + ${browserBottomInset}px)`);
    }

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

    if (isInputFocused || isKeyboardOpen) {
      resetScrollOffsets();
    } else if (wasKeyboardOpenRef.current && !isKeyboardOpen) {
      if (resetScrollTimerRef.current) clearTimeout(resetScrollTimerRef.current);
      resetScrollOffsets();
      resetScrollTimerRef.current = setTimeout(resetScrollOffsets, 120);
    }

    wasKeyboardOpenRef.current = isKeyboardOpen;

    setState((prev) => {
      if (
        prev.viewportHeight === visualH &&
        prev.viewportWidth === visualW &&
        prev.offsetTop === offsetTop &&
        prev.pageTop === (vv ? vv.pageTop : 0) &&
        prev.keyboardOffset === effectiveKeyboardOffset &&
        prev.browserBottomInset === browserBottomInset &&
        prev.isKeyboardOpen === isKeyboardOpen &&
        prev.isMobile === isMobile
      ) {
        return prev;
      }
      return {
        viewportHeight: visualH,
        viewportWidth: visualW,
        offsetTop: offsetTop,
        pageTop: vv ? vv.pageTop : 0,
        keyboardOffset: effectiveKeyboardOffset,
        browserBottomInset,
        isKeyboardOpen,
        isMobile,
      };
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateMetrics();

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
      vv.addEventListener('resize', updateMetrics);
      vv.addEventListener('scroll', updateMetrics);
    }

    window.addEventListener('scroll', onWindowScroll, { passive: true });
    window.addEventListener('resize', updateMetrics);
    window.addEventListener('orientationchange', updateMetrics);
    window.addEventListener('focusin', updateMetrics);
    window.addEventListener('focusout', () => {
      setTimeout(updateMetrics, 50);
      setTimeout(updateMetrics, 200);
    });

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateMetrics);
        vv.removeEventListener('scroll', updateMetrics);
      }
      window.removeEventListener('scroll', onWindowScroll);
      window.removeEventListener('resize', updateMetrics);
      window.removeEventListener('orientationchange', updateMetrics);
      window.removeEventListener('focusin', updateMetrics);
      if (resetScrollTimerRef.current) clearTimeout(resetScrollTimerRef.current);
    };
  }, [updateMetrics]);

  return state;
}
