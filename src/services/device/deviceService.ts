/**
 * Universal Device & Platform Detection Service
 * Provides precise detection for Desktop (Windows, macOS, Linux), Mobile (Android, iOS),
 * Native App wrappers (Tauri, Neutralino, Capacitor, Cordova), and touch capabilities.
 */

export type DevicePlatform = 
  | 'tauri-desktop' 
  | 'tauri-mobile' 
  | 'neutralino' 
  | 'android-web' 
  | 'ios-web' 
  | 'desktop-web';

export type FormFactor = 'phone' | 'tablet' | 'desktop';
export type LayoutMode = 'auto' | 'desktop' | 'mobile';

export interface PlatformInfo {
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
}

export function detectPlatformInfo(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      isTauri: false,
      isNeutralino: false,
      isNativeApp: false,
      isNativeMobile: false,
      isNativeDesktop: false,
      isAndroid: false,
      isIOS: false,
      isWindows: false,
      isMac: false,
      isLinux: false,
      isTouchDevice: false,
      hasCoarsePointer: false,
      hasFinePointer: true,
      hasHoverCapability: true,
      isClientHintMobile: false,
      isMobileBrowser: false,
      isWaterfox: false,
      isFirefox: false,
      platform: 'desktop-web'
    };
  }

  const win = window as any;
  const nav = window.navigator as any;
  const ua = nav.userAgent || '';

  // Native environments
  const isTauri = Boolean(win.__TAURI_INTERNALS__ || win.__TAURI__);
  const isNeutralino = Boolean(win.Neutralino && win.NL_MODE !== undefined);
  const isCapacitor = Boolean(win.Capacitor);
  const isCordova = Boolean(win.cordova);

  // Operating Systems
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const isWindows = /Windows|Win32|Win64|WOW64/i.test(ua) || nav.userAgentData?.platform === 'Windows' || (nav.platform && nav.platform.startsWith('Win'));
  const isMac = !isIOS && (/Macintosh|Mac OS X/i.test(ua) || nav.userAgentData?.platform === 'macOS' || nav.platform?.startsWith('Mac'));
  const isLinux = !isAndroid && (/Linux/i.test(ua) || nav.userAgentData?.platform === 'Linux' || nav.platform?.startsWith('Linux'));

  // Browsers
  const isWaterfox = /Waterfox/i.test(ua);
  const isFirefox = /Firefox/i.test(ua) || isWaterfox;

  // Touch, Pointer & Interaction Capabilities (W3C Interaction Media Queries)
  const isTouchDevice = (nav.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const hasCoarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
  const hasFinePointer = window.matchMedia ? window.matchMedia('(pointer: fine)').matches : !isTouchDevice;
  const hasHoverCapability = window.matchMedia ? window.matchMedia('(hover: hover)').matches : !isTouchDevice;
  const isClientHintMobile = Boolean(nav.userAgentData?.mobile);
  const isMobileBrowser = isClientHintMobile || isAndroid || isIOS;

  // Native classification
  const isNativeMobile = (isTauri && (isAndroid || isIOS)) || isCapacitor || isCordova;
  const isNativeDesktop = (isTauri && !isAndroid && !isIOS) || isNeutralino;
  const isNativeApp = isTauri || isNeutralino || isCapacitor || isCordova;

  // Granular platform label
  let platform: DevicePlatform = 'desktop-web';
  if (isTauri) {
    platform = isNativeMobile ? 'tauri-mobile' : 'tauri-desktop';
  } else if (isNeutralino) {
    platform = 'neutralino';
  } else if (isAndroid) {
    platform = 'android-web';
  } else if (isIOS) {
    platform = 'ios-web';
  }

  return {
    isTauri,
    isNeutralino,
    isNativeApp,
    isNativeMobile,
    isNativeDesktop,
    isAndroid,
    isIOS,
    isWindows,
    isMac,
    isLinux,
    isTouchDevice,
    hasCoarsePointer,
    hasFinePointer,
    hasHoverCapability,
    isClientHintMobile,
    isMobileBrowser,
    isWaterfox,
    isFirefox,
    platform
  };
}

/**
 * Determine form factor (phone, tablet, desktop) based on actual dimensions and hardware
 */
export function determineFormFactor(
  width: number,
  height: number,
  isTouch: boolean,
  isAndroid: boolean,
  isIOS: boolean,
  isNativeDesktop: boolean
): FormFactor {
  // If running in a native desktop shell (Tauri/Neutralino on Windows/Mac/Linux),
  // default to desktop unless the window is resized to a phone-like vertical slit.
  if (isNativeDesktop && width >= 600) {
    return 'desktop';
  }

  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  // Typical smartphone: smallest dimension is < 600px
  if (minDim < 600) {
    return 'phone';
  }

  // Tablets: touch screen with min dimension >= 600px (e.g. 1600x720 in landscape or 1920x1080/1200)
  if ((isAndroid || isIOS || isTouch) && (minDim >= 600 || maxDim >= 960)) {
    return 'tablet';
  }

  // Desktop / laptop
  return width < 960 ? 'tablet' : 'desktop';
}

/**
 * Evaluates whether Mobile Layout (bottom bar, compact header tools, tab navigation)
 * should be rendered vs Desktop Layout (full header toolbar, split editor/preview, no bottom bar).
 */
export function computeMobileLayoutState(options: {
  layoutPreference: LayoutMode;
  viewportWidth: number;
  viewportHeight: number;
  platformInfo: PlatformInfo;
  formFactor: FormFactor;
}): boolean {
  const { layoutPreference, viewportWidth, viewportHeight, platformInfo, formFactor } = options;

  // 1. Explicit user override
  if (layoutPreference === 'desktop') return false;
  if (layoutPreference === 'mobile') return true;

  // 2. Native Desktop Wrappers (Windows, Linux, macOS via Tauri or Neutralino)
  // These should ALWAYS use desktop layout as long as window width is at least 600px!
  if (platformInfo.isNativeDesktop) {
    return viewportWidth < 600;
  }

  // 3. Desktop Operating Systems (Windows, macOS, Linux) in browsers
  // Do NOT force mobile layout just because user has a touchscreen laptop (Yoga, Surface, etc.)
  if (platformInfo.isWindows || platformInfo.isMac || platformInfo.isLinux) {
    return viewportWidth < 640;
  }

  // 4. Smartphone form factor (smallest physical dimension < 600px)
  // Even if rotated to landscape, a smartphone requires touch-optimized mobile controls
  if (formFactor === 'phone') {
    return true;
  }

  // 5. Mobile Browsers & Native Mobile Wrappers (Android, iOS)
  if (platformInfo.isMobileBrowser || platformInfo.isNativeMobile) {
    // Large tablets in landscape (e.g. 1024px+ wide with >= 650px height) can comfortably use desktop layout
    if (viewportWidth >= 1024 && formFactor === 'tablet' && viewportHeight >= 650) {
      return false;
    }
    return true;
  }

  // 6. Generic Fallback based on interaction media query (touch pointer without hover)
  if (platformInfo.hasCoarsePointer && !platformInfo.hasHoverCapability) {
    return viewportWidth < 960;
  }

  return viewportWidth < 768;
}

/**
 * Evaluates whether the Mobile Bottom Navigation Bar should be rendered.
 * On Native Desktop apps (Tauri/Neutralino on Windows/macOS/Linux), it is NEVER rendered,
 * even when the window is scaled down to 1/3 screen for comfortable typing.
 * In landscape mode on any device, it is hidden to preserve scarce vertical space.
 */
export function computeBottomBarVisibility(options: {
  isNativeDesktop: boolean;
  isMobileLayout: boolean;
  isKeyboardOpen: boolean;
  screenOrientation: 'portrait' | 'landscape';
  viewportHeight: number;
  viewportWidth: number;
  formFactor: FormFactor;
  isTouchDevice: boolean;
  isMobileBrowser?: boolean;
  layoutPreference: LayoutMode;
}): boolean {
  const {
    isNativeDesktop,
    isMobileLayout,
    isKeyboardOpen,
    screenOrientation,
    viewportHeight,
    viewportWidth,
    formFactor,
    isTouchDevice,
    isMobileBrowser = false,
    layoutPreference,
  } = options;

  // 1. Explicit user override
  if (layoutPreference === 'desktop') return false;

  // 2. Native Desktop Wrappers (Tauri / Neutralino on Windows, macOS, Linux)
  // NEVER show mobile bottom bar, even when scaled down to 1/3 screen!
  if (isNativeDesktop) return false;

  // 3. Virtual keyboard open -> hide bottom bar
  if (isKeyboardOpen) return false;

  // 4. Landscape orientation or low height (< 520px) -> hide bottom bar to preserve height
  if (screenOrientation === 'landscape' || viewportHeight < 520) return false;

  // 5. Desktop browser without touch (e.g. mouse/keyboard on PC/Mac) narrowed to 1/3 screen:
  // No mobile bottom bar needed for comfortable desktop typing
  if (!isTouchDevice && !isMobileBrowser && layoutPreference !== 'mobile') return false;

  // 6. Explicit mobile preference -> show in portrait
  if (layoutPreference === 'mobile') return true;

  // 7. On phones, touch devices, and mobile browsers in portrait mode with mobile layout active:
  // Allows smartphones (any matrix resolution), foldables (700-840px), and portrait tablets (up to 880px)
  const isPortraitMobile = isMobileLayout && (
    formFactor === 'phone' ||
    ((isTouchDevice || isMobileBrowser) && viewportWidth <= 880)
  );

  return isPortraitMobile;
}

/**
 * Determines if header format/action tool groups should collapse into compact dropdown buttons
 * instead of spilling horizontally across the top bar.
 */
export function computeHeaderCompactState(options: {
  isMobileLayout: boolean;
  viewportWidth: number;
}): boolean {
  return options.isMobileLayout || options.viewportWidth < 1080;
}
