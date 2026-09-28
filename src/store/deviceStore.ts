import { create } from 'zustand';
import {
  detectPlatformInfo,
  determineFormFactor,
  computeMobileLayoutState,
  computeBottomBarVisibility,
  computeHeaderCompactState,
  PlatformInfo,
  FormFactor,
  LayoutMode,
  DevicePlatform,
} from '../services/device/deviceService';

export interface DeviceStoreState {
  // Platform & Environment
  isTauri: boolean;
  isNeutralino: boolean;
  isNativeApp: boolean;
  isNativeMobile: boolean;
  isNativeDesktop: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
  isTouchDevice: boolean;
  hasCoarsePointer: boolean;
  hasFinePointer: boolean;
  hasHoverCapability: boolean;
  isClientHintMobile: boolean;
  isMobileBrowser: boolean;
  isWaterfox: boolean;
  isFirefox: boolean;
  platform: DevicePlatform;

  // Screen & Viewport Metrics
  viewportWidth: number;
  viewportHeight: number;
  windowInnerWidth: number;
  windowInnerHeight: number;
  offsetTop: number;
  pageTop: number;
  screenOrientation: 'portrait' | 'landscape';
  formFactor: FormFactor;

  // Universal Virtual Keyboard Detection (Phones, 1600x720, Full HD Tablets 1920x1080/1200)
  isKeyboardOpen: boolean;
  keyboardOffset: number;
  browserBottomInset: number;

  // Layout & Bar Decisions (Single Source of Truth)
  layoutPreference: LayoutMode;
  isMobileLayout: boolean;
  isSplitEditorSupported: boolean;
  showMobileBottomBar: boolean;
  isHeaderCompact: boolean;

  // Actions
  setLayoutPreference: (pref: LayoutMode) => void;
  updateMetrics: () => void;
}

const getStoredLayoutPreference = (): LayoutMode => {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = localStorage.getItem('steem_layout_preference') as LayoutMode | null;
    if (saved === 'auto' || saved === 'desktop' || saved === 'mobile') return saved;
  } catch {
    // Ignore storage errors
  }
  return 'auto';
};

export const useDeviceStore = create<DeviceStoreState>((set, get) => {
  const isClient = typeof window !== 'undefined';
  const platformInfo = detectPlatformInfo();
  const initW = isClient ? window.innerWidth : 1024;
  const initH = isClient ? (window.visualViewport?.height ?? window.innerHeight) : 768;
  const initInnerH = isClient ? window.innerHeight : 768;
  const formFactor = determineFormFactor(
    initW,
    initInnerH,
    platformInfo.isTouchDevice,
    platformInfo.isAndroid,
    platformInfo.isIOS,
    platformInfo.isNativeDesktop
  );
  const layoutPref = getStoredLayoutPreference();
  const initOrientation = initW >= initInnerH ? 'landscape' : 'portrait';
  const isMobileLayout = computeMobileLayoutState({
    layoutPreference: layoutPref,
    viewportWidth: initW,
    viewportHeight: initH,
    platformInfo,
    formFactor,
  });
  const showMobileBottomBar = computeBottomBarVisibility({
    isNativeDesktop: platformInfo.isNativeDesktop,
    isMobileLayout,
    isKeyboardOpen: false,
    screenOrientation: initOrientation,
    viewportHeight: initH,
    viewportWidth: initW,
    formFactor,
    isTouchDevice: platformInfo.isTouchDevice,
    layoutPreference: layoutPref,
  });
  const isHeaderCompact = computeHeaderCompactState({
    isMobileLayout,
    viewportWidth: initW,
  });

  return {
    ...platformInfo,
    viewportWidth: initW,
    viewportHeight: initH,
    windowInnerWidth: initW,
    windowInnerHeight: initInnerH,
    offsetTop: 0,
    pageTop: 0,
    screenOrientation: initOrientation,
    formFactor,
    isKeyboardOpen: false,
    keyboardOffset: 0,
    browserBottomInset: 0,
    layoutPreference: layoutPref,
    isMobileLayout,
    isSplitEditorSupported: initW >= 850 && !isMobileLayout,
    showMobileBottomBar,
    isHeaderCompact,

    setLayoutPreference: (pref: LayoutMode) => {
      try {
        localStorage.setItem('steem_layout_preference', pref);
      } catch {
        // Ignore
      }
      set({ layoutPreference: pref });
      get().updateMetrics();
    },

    updateMetrics: () => {
      if (typeof window === 'undefined') return;

      const vv = window.visualViewport;
      const currentInnerH = window.innerHeight;
      const currentInnerW = window.innerWidth;
      const visualH = vv ? vv.height : currentInnerH;
      const visualW = vv ? vv.width : currentInnerW;
      const offsetTop = vv ? vv.offsetTop : 0;
      const pageTop = vv ? vv.pageTop : 0;

      const state = get();
      const platformInfo = detectPlatformInfo();

      const formFactor = determineFormFactor(
        currentInnerW,
        currentInnerH,
        platformInfo.isTouchDevice,
        platformInfo.isAndroid,
        platformInfo.isIOS,
        platformInfo.isNativeDesktop
      );

      const isMobileLayout = computeMobileLayoutState({
        layoutPreference: state.layoutPreference,
        viewportWidth: currentInnerW,
        viewportHeight: visualH,
        platformInfo,
        formFactor,
      });

      // Keyboard detection: checks if an editable element is focused AND viewport shrank
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

      // Baseline height estimation
      const baselineH = Math.max(currentInnerH, visualH);
      const rawOverlayDiff = Math.max(0, currentInnerH - visualH - offsetTop);
      const heightShrinkDiff = baselineH - visualH;

      // Virtual keyboard presence detection:
      // Note: We DO NOT check width < 1024! Virtual keyboard can open on ANY screen (Full HD tablets, 1600x720, etc.)
      const isKeyboardOpen = isInputFocused && (
        heightShrinkDiff > 120 ||
        rawOverlayDiff > 120 ||
        visualH < baselineH * 0.85
      );

      const effectiveKeyboardOffset = isKeyboardOpen ? Math.max(rawOverlayDiff, heightShrinkDiff) : 0;
      const browserBottomInset = !isKeyboardOpen ? Math.max(0, currentInnerH - (visualH + offsetTop)) : 0;
      const orientation: 'portrait' | 'landscape' = currentInnerW >= currentInnerH ? 'landscape' : 'portrait';

      const showMobileBottomBar = computeBottomBarVisibility({
        isNativeDesktop: platformInfo.isNativeDesktop,
        isMobileLayout,
        isKeyboardOpen,
        screenOrientation: orientation,
        viewportHeight: visualH,
        viewportWidth: currentInnerW,
        formFactor,
        isTouchDevice: platformInfo.isTouchDevice,
        isMobileBrowser: platformInfo.isMobileBrowser,
        layoutPreference: state.layoutPreference,
      });

      const isHeaderCompact = computeHeaderCompactState({
        isMobileLayout,
        viewportWidth: currentInnerW,
      });

      // Sync CSS custom properties for hardware-accelerated layouts
      if (document.documentElement) {
        const bottomBarHeight = showMobileBottomBar ? '4rem' : '0px';
        const bottomBarHeightNum = showMobileBottomBar ? 64 : 0;
        // When MobileBottomBar is hidden, DesktopStatsFooter (height: 2rem / 32px) is rendered instead
        const activeFooterHeight = showMobileBottomBar ? '4rem' : '2rem';
        const activeFooterHeightNum = showMobileBottomBar ? 64 : 32;

        document.documentElement.style.setProperty('--vv-height', `${visualH}px`);
        document.documentElement.style.setProperty('--keyboard-offset', `${effectiveKeyboardOffset}px`);
        document.documentElement.style.setProperty('--browser-bottom-inset', `${browserBottomInset}px`);
        document.documentElement.style.setProperty('--viewport-bottom-offset', `${isKeyboardOpen ? effectiveKeyboardOffset : browserBottomInset}px`);
        document.documentElement.style.setProperty('--safe-bottom-total', `calc(env(safe-area-inset-bottom, 0px) + ${browserBottomInset}px)`);
        document.documentElement.style.setProperty('--bottom-bar-height', bottomBarHeight);
        document.documentElement.style.setProperty('--bottom-bar-height-px', `${bottomBarHeightNum}px`);
        document.documentElement.style.setProperty('--active-footer-height', activeFooterHeight);
        document.documentElement.style.setProperty('--active-footer-height-px', `${activeFooterHeightNum}px`);
        document.documentElement.style.setProperty('--has-bottom-bar', showMobileBottomBar ? '1' : '0');

        // Global total bottom inset for floating elements / galleries / toolbars
        document.documentElement.style.setProperty(
          '--app-bottom-total',
          `calc(${activeFooterHeight} + env(safe-area-inset-bottom, 0px) + ${browserBottomInset}px)`
        );

        // Content area bottom padding: only needed for MobileBottomBar (DesktopStatsFooter sits in DOM flow)
        document.documentElement.style.setProperty(
          '--app-content-bottom-padding',
          showMobileBottomBar && !isKeyboardOpen ? `calc(4rem + env(safe-area-inset-bottom, 0px))` : '0px'
        );

        // Floating widget position: sits 0.5rem (8px) cleanly above whichever bottom bar/footer is active
        document.documentElement.style.setProperty(
          '--app-floating-widget-bottom',
          `calc(${activeFooterHeight} + env(safe-area-inset-bottom, 0px) + ${browserBottomInset}px + 0.5rem)`
        );

        // Dataset attributes for styling hooks
        document.documentElement.dataset.layout = isMobileLayout ? 'mobile' : 'desktop';
        document.documentElement.dataset.platform = platformInfo.isNativeMobile ? 'native-mobile' : (platformInfo.isNativeDesktop ? 'native-desktop' : 'web');
        document.documentElement.dataset.keyboard = isKeyboardOpen ? 'open' : 'closed';
        document.documentElement.dataset.formfactor = formFactor;
        document.documentElement.dataset.bottombar = showMobileBottomBar ? 'show' : 'hidden';
      }

      set({
        ...platformInfo,
        viewportWidth: visualW,
        viewportHeight: visualH,
        windowInnerWidth: currentInnerW,
        windowInnerHeight: currentInnerH,
        offsetTop,
        pageTop,
        screenOrientation: orientation,
        formFactor,
        isKeyboardOpen,
        keyboardOffset: effectiveKeyboardOffset,
        browserBottomInset,
        isMobileLayout,
        isSplitEditorSupported: currentInnerW >= 850 && !isMobileLayout,
        showMobileBottomBar,
        isHeaderCompact,
      });
    },
  };
});
