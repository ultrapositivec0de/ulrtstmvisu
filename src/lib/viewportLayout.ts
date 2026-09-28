import React from 'react';

export interface EditorBottomReservedOptions {
  isMobile: boolean;
  isKeyboardOpen: boolean;
  keyboardOffset?: number;
  widgetPos?: string;
  toolbarIconSize?: number;
  showMobileBottomBar?: boolean;
}

/**
 * Calculates reserved bottom space in the editor to prevent toolbar/keyboard overlap.
 * Universally handles smartphones, 1600x720 screens, and Full HD tablets (1920x1080/1200).
 */
export function calculateEditorBottomReserved({
  isMobile,
  isKeyboardOpen,
  keyboardOffset = 0,
  widgetPos = 'bottom',
  toolbarIconSize = 18,
  showMobileBottomBar = false,
}: EditorBottomReservedOptions): number {
  const dynamicWidgetHeight = toolbarIconSize + 24; // dynamically scales with icon size (12-32px -> 36-56px + padding)
  
  // If virtual keyboard is open or has offset on ANY device (phone, tablet, touch):
  if (isKeyboardOpen || keyboardOffset > 0) {
    return keyboardOffset + dynamicWidgetHeight + 12;
  }

  // Mobile layout: include bottom bar only if it is actually visible
  if (isMobile) {
    return showMobileBottomBar ? dynamicWidgetHeight + 72 : dynamicWidgetHeight + 24;
  }

  // Desktop mode: toolbar widget bottom-4 (16px) + dynamicWidgetHeight (36-56px) + comfortable clearance
  return widgetPos === 'bottom' ? dynamicWidgetHeight + 76 : (widgetPos === 'floating' ? 56 : 32);
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

let mirrorDiv: HTMLDivElement | null = null;

/**
 * Calculates exact vertical position (in pixels) of the caret inside a textarea,
 * accounting for word wrapping, fonts, and line heights without causing layout thrashing.
 */
export function getExactCaretYInTextarea(ta: HTMLTextAreaElement, pos?: number): number {
  if (typeof document === 'undefined' || !ta) return 0;

  const caretPos = typeof pos === 'number' ? pos : ta.selectionStart;

  if (!mirrorDiv) {
    mirrorDiv = document.createElement('div');
    mirrorDiv.setAttribute('aria-hidden', 'true');
    mirrorDiv.style.position = 'fixed';
    mirrorDiv.style.visibility = 'hidden';
    mirrorDiv.style.top = '-9999px';
    mirrorDiv.style.left = '-9999px';
    mirrorDiv.style.pointerEvents = 'none';
    mirrorDiv.style.whiteSpace = 'pre-wrap';
    mirrorDiv.style.wordWrap = 'break-word';
    mirrorDiv.style.overflowWrap = 'break-word';
    document.body.appendChild(mirrorDiv);
  }

  const style = window.getComputedStyle(ta);
  mirrorDiv.style.font = style.font;
  mirrorDiv.style.fontFamily = style.fontFamily;
  mirrorDiv.style.fontSize = style.fontSize;
  mirrorDiv.style.fontWeight = style.fontWeight;
  mirrorDiv.style.lineHeight = style.lineHeight;
  mirrorDiv.style.letterSpacing = style.letterSpacing;
  mirrorDiv.style.paddingTop = style.paddingTop;
  mirrorDiv.style.paddingLeft = style.paddingLeft;
  mirrorDiv.style.paddingRight = style.paddingRight;
  mirrorDiv.style.border = style.border;
  mirrorDiv.style.boxSizing = style.boxSizing;
  mirrorDiv.style.width = `${ta.clientWidth}px`;

  mirrorDiv.textContent = ta.value.substring(0, caretPos);

  const span = document.createElement('span');
  span.textContent = '\u200B';
  mirrorDiv.appendChild(span);

  const caretY = span.offsetTop + (parseFloat(style.lineHeight) || 24);
  return caretY;
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
 * Computes dynamic styles for floating / docked toolbar widget across all screen sizes
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

  const actualWidgetHeight = widgetEl?.offsetHeight || (toolbarIconSize + 28);
  const visualBottom = offsetTop + viewportHeight;

  // 1. Virtual Keyboard Open: Position directly above keyboard top edge on ANY device
  if (isKeyboardOpen) {
    style.position = 'fixed';
    style.left = '0.5rem';
    style.right = '0.5rem';
    style.margin = '0 auto';
    style.zIndex = 150;
    style.transition = 'top 0.15s cubic-bezier(0.2, 0, 0.2, 1)';
    const targetTop = Math.max(offsetTop + 8, visualBottom - actualWidgetHeight - 8);
    style.top = `${targetTop}px`;
    style.bottom = 'auto';
    return style;
  }

  // 2. Desktop Floating Mode
  if (widgetPos === 'floating' && !isMobile && floatingPos && editorPaneEl) {
    const rect = editorPaneEl.getBoundingClientRect();
    style.position = 'fixed';
    const widgetWidth = 400; // Width estimation for tools + navigation + settings + paddings (~420px)
    const leftBound = rect.left + 10;
    const rightBound = rect.right - widgetWidth - 10;
    style.left = Math.min(rightBound, Math.max(leftBound, floatingPos.x));
    style.top = floatingPos.y < 150 ? floatingPos.y + 40 : floatingPos.y - 80;
    return style;
  }

  // 3. Mobile Docked Layout (docked above bottom navigation bar or screen bottom)
  if (isMobile) {
    style.position = 'fixed';
    style.left = '0.5rem';
    style.right = '0.5rem';
    style.margin = '0 auto';
    style.zIndex = 150;
    style.top = 'auto';
    // When in fullscreen, sit just above safe-area + browser bottom inset + 8px gap
    // Otherwise use auto-calculated global variable that accounts for active bottom bar / stats footer
    style.bottom = (isEditorFullScreen || isFullScreen)
      ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-bottom-inset, 0px) + 0.5rem)'
      : 'var(--app-floating-widget-bottom, calc(var(--active-footer-height, 2rem) + env(safe-area-inset-bottom, 0px) + var(--browser-bottom-inset, 0px) + 0.5rem))';
    return style;
  }

  // 4. Desktop Docked Layout
  if (isEditorFullScreen || isFullScreen) {
    style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-bottom-inset, 0px) + 0.5rem)';
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
 * Calculates bottom style for Mini Gallery strip across all screen sizes
 */
export function getMiniGalleryBottomStyle({
  isMobile,
  isKeyboardOpen,
  keyboardOffset,
  isFullScreen,
  isEditorFullScreen,
  widgetPos,
}: MiniGalleryBottomOptions): string | undefined {
  if (isKeyboardOpen && keyboardOffset > 0) {
    return `calc(${keyboardOffset}px + var(--toolbar-btn-size, 3rem) + 0.5rem)`;
  }
  if (isMobile) {
    if (isEditorFullScreen || isFullScreen) {
      return 'calc(env(safe-area-inset-bottom, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)';
    }
    return 'calc(var(--app-bottom-total, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)';
  }
  return widgetPos === 'bottom' ? 'calc(4.5rem)' : undefined;
}
