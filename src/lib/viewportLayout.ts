import React from 'react';

export interface EditorBottomReservedOptions {
  isMobile: boolean;
  isKeyboardOpen: boolean;
  widgetPos?: string;
  toolbarIconSize?: number;
}

/**
 * Calculates reserved bottom space in the editor to prevent toolbar/keyboard overlap
 */
export function calculateEditorBottomReserved({
  isMobile,
  isKeyboardOpen,
  widgetPos = 'bottom',
  toolbarIconSize = 18,
}: EditorBottomReservedOptions): number {
  const dynamicWidgetHeight = toolbarIconSize + 24; // dynamically scales with icon size (12-32px -> 36-56px + padding)
  if (isMobile) {
    return isKeyboardOpen ? dynamicWidgetHeight + 45 : dynamicWidgetHeight + 90;
  }
  return widgetPos === 'bottom' ? dynamicWidgetHeight + 60 : 40;
}

/**
 * Calculates visible height of editor area considering bottom reserved space
 */
export function calculateVisibleEditorHeight(
  containerHeight: number,
  options: EditorBottomReservedOptions
): number {
  const bottomReserved = calculateEditorBottomReserved(options);
  return Math.max(100, containerHeight - bottomReserved);
}

/**
 * Calculates target scrollTop to center or position caret nicely above widget/keyboard
 */
export function calculateCaretScrollTop(
  caretY: number,
  containerHeight: number,
  options: EditorBottomReservedOptions
): number {
  const visibleHeight = calculateVisibleEditorHeight(containerHeight, options);
  return Math.max(0, caretY - visibleHeight / 2);
}

export interface FloatingWidgetStyleOptions {
  widgetPos: string;
  isMobile: boolean;
  floatingPos: { x: number; y: number } | null;
  editorPaneEl: HTMLElement | null;
  widgetEl: HTMLElement | null;
  toolbarIconSize: number;
  offsetTop: number;
  viewportHeight: number;
  isKeyboardOpen: boolean;
  isFullScreen: boolean;
  isEditorFullScreen: boolean;
}

/**
 * Computes dynamic styles for floating / mobile docked toolbar widget
 */
export function getFloatingWidgetStyles({
  widgetPos,
  isMobile,
  floatingPos,
  editorPaneEl,
  widgetEl,
  toolbarIconSize,
  offsetTop,
  viewportHeight,
  isKeyboardOpen,
  isFullScreen,
  isEditorFullScreen,
}: FloatingWidgetStyleOptions): React.CSSProperties {
  const style: React.CSSProperties = {
    opacity: 1.0,
  };

  if (widgetPos === 'floating' && !isMobile && floatingPos && editorPaneEl) {
    const rect = editorPaneEl.getBoundingClientRect();
    style.position = 'fixed';
    const widgetWidth = 400; // Width estimation for 8 tools + navigation + settings + paddings (~420px)
    const leftBound = rect.left + 10;
    const rightBound = rect.right - widgetWidth - 10;
    style.left = Math.min(rightBound, Math.max(leftBound, floatingPos.x));
    style.top = floatingPos.y < 150 ? floatingPos.y + 40 : floatingPos.y - 80;
  } else if (isMobile) {
    style.position = 'fixed';
    style.left = '0.5rem';
    style.right = '0.5rem';
    style.margin = '0 auto';
    style.zIndex = 150;
    style.transition = 'top 0.15s cubic-bezier(0.2, 0, 0.2, 1)';

    const actualWidgetHeight = widgetEl?.offsetHeight || (toolbarIconSize + 28);
    const visualBottom = offsetTop + viewportHeight;

    if (isKeyboardOpen) {
      // Place exactly 8px above virtual keyboard top edge
      const targetTop = visualBottom - actualWidgetHeight - 8;
      style.top = `${targetTop}px`;
      style.bottom = 'auto';
    } else {
      // Place above bottom navigation bar or screen bottom
      const bottomNavOffset = (isEditorFullScreen || isFullScreen) ? 12 : 72;
      const targetTop = visualBottom - actualWidgetHeight - bottomNavOffset;
      style.top = `${targetTop}px`;
      style.bottom = 'auto';
    }
  }

  return style;
}

export interface MiniGalleryBottomOptions {
  isMobile: boolean;
  isKeyboardOpen: boolean;
  keyboardOffset: number;
  isFullScreen: boolean;
  isEditorFullScreen: boolean;
  widgetPos: string;
}

/**
 * Calculates bottom style for Mini Gallery strip
 */
export function getMiniGalleryBottomStyle({
  isMobile,
  isKeyboardOpen,
  keyboardOffset,
  isFullScreen,
  isEditorFullScreen,
  widgetPos,
}: MiniGalleryBottomOptions): string | undefined {
  if (isMobile) {
    if (isKeyboardOpen) {
      return `calc(${keyboardOffset > 0 ? keyboardOffset : 0}px + var(--toolbar-btn-size, 3rem) + 0.35rem)`;
    }
    if (isEditorFullScreen || isFullScreen) {
      return 'calc(env(safe-area-inset-bottom, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)';
    }
    return 'calc(4rem + env(safe-area-inset-bottom, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)';
  }
  return widgetPos === 'bottom' ? 'calc(4.5rem)' : undefined;
}
