import React, { useRef, useEffect, useCallback, useMemo } from 'react';

export interface WidgetPositionParams {
  widgetPos: 'top' | 'bottom' | 'floating' | 'hidden';
  floatingPos: { x: number; y: number } | null;
  editorPaneRef: React.RefObject<HTMLDivElement | null>;
  widgetRef: React.RefObject<HTMLDivElement | null>;
  toolbarIconSize: number;
  offsetTop: number;
  viewportHeight: number;
  isKeyboardOpen: boolean;
  isEditorFullScreen: boolean;
  isFullScreen: boolean;
}

export interface MiniGalleryPositionParams {
  isKeyboardOpen: boolean;
  isEditorFullScreen: boolean;
  isFullScreen: boolean;
  widgetPos?: string;
  keyboardOffset?: number;
}

/**
 * Calculates bottom padding for editor content areas so text never sits
 * underneath the floating/fixed tools widget or virtual keyboard.
 */
export function getEditorBottomPadding(
  isMobile: boolean,
  isKeyboardOpen: boolean,
  widgetPos: string,
  dynamicWidgetHeight: number
): number {
  if (!isMobile) return 80;
  if (widgetPos === 'hidden') return 40;
  return isKeyboardOpen ? dynamicWidgetHeight + 45 : dynamicWidgetHeight + 90;
}

/**
 * Computes responsive styles for the mini-gallery container above bottom widgets.
 */
export function getMiniGalleryStyle(params: MiniGalleryPositionParams): React.CSSProperties {
  const { isKeyboardOpen, isEditorFullScreen, isFullScreen, widgetPos, keyboardOffset = 0 } = params;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (!isMobile) {
    return widgetPos === 'bottom' ? { bottom: '4.5rem' } : {};
  }

  const isFullscreenActive = isEditorFullScreen || isFullScreen;
  return {
    bottom: isKeyboardOpen
      ? `calc(${keyboardOffset > 0 ? keyboardOffset : 0}px + var(--toolbar-btn-size, 3rem) + 0.35rem)`
      : isFullscreenActive
        ? 'calc(env(safe-area-inset-bottom, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)'
        : 'calc(4rem + env(safe-area-inset-bottom, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)',
  };
}

/**
 * Custom hook that manages visual viewport positioning for the Steem tools widget,
 * including dynamic offset calculations and tap-guard debouncing during keyboard transitions.
 */
export function useWidgetViewportLayout(params: WidgetPositionParams) {
  const {
    widgetPos,
    floatingPos,
    editorPaneRef,
    widgetRef,
    toolbarIconSize,
    offsetTop,
    viewportHeight,
    isKeyboardOpen,
    isEditorFullScreen,
    isFullScreen,
  } = params;

  const lastKeyboardToggleTimeRef = useRef<number>(0);

  useEffect(() => {
    lastKeyboardToggleTimeRef.current = Date.now();
  }, [isKeyboardOpen]);

  /**
   * Prevents accidental taps when the virtual keyboard pops up or dismisses
   * and the widget translates dynamically under the user's touch.
   */
  const handleWidgetAction = useCallback((actionFn: () => void) => {
    if (Date.now() - lastKeyboardToggleTimeRef.current < 250) {
      return;
    }
    actionFn();
  }, []);

  const widgetStyle = useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {
      opacity: 1.0,
    };

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

    if (widgetPos === 'floating' && isDesktop && floatingPos && editorPaneRef.current) {
      const rect = editorPaneRef.current.getBoundingClientRect();
      style.position = 'fixed';

      // Width estimation for 8 tools + navigation + settings + paddings (~420px)
      const widgetWidth = 400;
      const leftBound = rect.left + 10;
      const rightBound = rect.right - widgetWidth - 10;
      style.left = Math.min(rightBound, Math.max(leftBound, floatingPos.x));
      style.top = floatingPos.y < 150 ? floatingPos.y + 40 : floatingPos.y - 80;
    } else if (!isDesktop) {
      style.position = 'fixed';
      style.left = '0.5rem';
      style.right = '0.5rem';
      style.margin = '0 auto';
      style.zIndex = 150;
      style.transition = 'top 0.15s cubic-bezier(0.2, 0, 0.2, 1)';

      const actualWidgetHeight = widgetRef.current?.offsetHeight || toolbarIconSize + 28;
      const visualBottom = offsetTop + viewportHeight;

      if (isKeyboardOpen) {
        // Place exactly 8px above virtual keyboard top edge
        const targetTop = visualBottom - actualWidgetHeight - 8;
        style.top = `${targetTop}px`;
        style.bottom = 'auto';
      } else {
        // Place above bottom navigation bar or screen bottom
        const bottomNavOffset = isEditorFullScreen || isFullScreen ? 12 : 72;
        const targetTop = visualBottom - actualWidgetHeight - bottomNavOffset;
        style.top = `${targetTop}px`;
        style.bottom = 'auto';
      }
    }

    return style;
  }, [
    widgetPos,
    floatingPos,
    editorPaneRef,
    widgetRef,
    toolbarIconSize,
    offsetTop,
    viewportHeight,
    isKeyboardOpen,
    isEditorFullScreen,
    isFullScreen,
  ]);

  return {
    widgetStyle,
    handleWidgetAction,
  };
}
