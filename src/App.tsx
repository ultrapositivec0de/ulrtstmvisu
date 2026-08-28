import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
// @ts-ignore
import { Idiomorph } from 'idiomorph';
import { cn } from './lib/utils';
import { probeNodes } from './lib/steem';
import { Language, SteemPost } from './types';
import { Buffer } from 'buffer';
import { useEditorStore } from './store';
import Reader from './components/Reader';
import { htmlToMarkdown, convertBareImageUrlsToMarkdown, isImageAndProxyUrl } from './lib/editorSync';
import { getMiniGalleryBottomStyle } from './lib/viewportLayout';
import { translations, AVAILABLE_LANGUAGES, getTranslation, type TranslationKey } from './locales';
import { getMarked, DOM_PURIFY_CONFIG } from './utils/markdownParser';
import { saveFileNatively } from './utils/fileSaver';
import { APP_CHANGELOG, getChangelogText } from './data/changelog';

// Custom Hooks
import { useEditorWorker } from './hooks/useEditorWorker';
import { useVisualViewport } from './hooks/useVisualViewport';
import { useDrafts } from './hooks/useDrafts';
import { useImportExport } from './hooks/useImportExport';
import { useSteemAuth } from './hooks/useSteemAuth';
import { useSteemQueue, processContentForSteem } from './hooks/useSteemQueue';
import { useSteemGallery } from './hooks/useSteemGallery';
import { useEditorFormat } from './hooks/useEditorFormat';
import { useWysiwygSync } from './hooks/useWysiwygSync';
import { useEditorEvents } from './hooks/useEditorEvents';
import { useAppUI } from './hooks/useAppUI';
import { useDialogs } from './hooks/useDialogs';
import { usePublishingManager } from './hooks/usePublishingManager';
import { useThemeAndStyles } from './hooks/useThemeAndStyles';
import { usePwaAndNotifications } from './hooks/usePwaAndNotifications';
import { usePostSettings } from './hooks/usePostSettings';
import { useReaderBlockchainActions } from './hooks/useReaderBlockchainActions';
import { useTableOperations } from './hooks/useTableOperations';
import { useAppBackup } from './hooks/useAppBackup';
import { useEditorModeManager } from './hooks/useEditorModeManager';

// Components
import { Header } from './components/header/Header';
import { Sidebar } from './components/sidebar/Sidebar';
import { EditorPane } from './components/editor/EditorPane';
import { PreviewPane } from './components/editor/PreviewPane';
import { DesktopStatsFooter } from './components/editor/StatusBar';
import { AppModals } from './components/modals/AppModals';
import { MobileBottomBar } from './components/common/MobileBottomBar';
import { AccountPromptModal } from './components/modals/AccountPromptModal';
import { GlobalEditorStyles } from './components/common/GlobalEditorStyles';
import { TableSelectorPopup } from './components/editor/TableSelectorPopup';
import { NotificationToast } from './components/common/NotificationToast';
import { SystemDialogModal } from './components/modals';
import { createToolsMap } from './components/editor/toolsMap';

// Global environment setups
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

const STORAGE_KEY_AUTOSAVE = 'steem_autosave_temp';
const STORAGE_KEY_FLOAT_CONFIG = 'steem_float_config';
const STORAGE_KEY_USERS = 'steem_users_v2';
const DEFAULT_FLOAT_TOOLS = ['B', 'I', 'sub', 'sup', 'Img', 'Gallery', 'Caption', 'Mentions', 'Table', 'Separator', 'Grid', 'HR'];

function App() {
  // 1. Authentication & Security
  const {
    authType,
    setAuthType,
    username,
    setUsername,
    selectedVaultUser,
    setSelectedVaultUser,
    showAccountPrompt,
    setShowAccountPrompt,
    vaultPin,
    setVaultPin,
    isVaultInitialized,
    setIsVaultInitialized,
    vaultAccounts,
    setVaultAccounts,
    isUnlocked,
    setIsUnlocked,
    pexelsApiKey,
    setPexelsApiKey,
    pixabayApiKey,
    setPixabayApiKey,
    unsplashAccessKey,
    setUnsplashAccessKey,
    initVault,
  } = useSteemAuth();

  // 2. Localization
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('steem_lang');
    if (saved && (translations[saved] || AVAILABLE_LANGUAGES.some(l => l.code === saved))) return saved;
    const browserLang = navigator?.language?.slice(0, 2);
    if (browserLang && (translations[browserLang] || AVAILABLE_LANGUAGES.some(l => l.code === browserLang))) return browserLang;
    return 'uk';
  });

  const t = useCallback((key: TranslationKey) => getTranslation(lang, key), [lang]);

  // 3. System Dialogs (Confirm & Prompt)
  const { systemDialog, setSystemDialog, confirmDialog, promptDialog } = useDialogs({ t });

  // 4. Editor Store State
  const setContent = useEditorStore(state => state.setContent);
  // stats is now handled internally by components to prevent root re-renders
  // const stats = useEditorStore(state => state.stats);

  // 5. Post Metadata State
  const [pubTitle, setPubTitle] = useState('');
  const [pubTags, setPubTags] = useState('');
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [showTableSelector, setShowTableSelector] = useState(false);

  // 6. Theme, Styling & Custom CSS Variables
  const {
    isDarkMode,
    setIsDarkMode,
    visualStyle,
    setVisualStyle,
    neonTextColored,
    setNeonTextColored,
    themeColor,
    setThemeColor,
    editorFont,
    setEditorFont,
    editorFontSize,
    setEditorFontSize,
    toolbarIconSize,
    setToolbarIconSize,
    wysiwygSpacing,
    setWysiwygSpacing,
    isSpacingMenuOpen,
    setIsSpacingMenuOpen,
    activeAssortment,
    fontOptions,
  } = useThemeAndStyles();

  // 7. Navigation & Modals UI
  const {
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
  } = useAppUI({
    showTableSelector,
    setShowTableSelector,
    isWidgetMenuOpen,
    setIsWidgetMenuOpen,
  });

  const hasLoadedRef = useRef(false);

  const contentForPublish = useEditorStore(state => activeModal === 'publish' ? state.content : '');

  // 8. Drafts & Templates
  const {
    currentDraftId,
    setCurrentDraftId,
    drafts,
    setDrafts,
    templates,
    setTemplates,
    saveDraft: saveDraftHook,
    deleteDraft,
    toggleDraftStatus
  } = useDrafts(saveFileNatively);

  // 9. Import / Export
  const { exportBackup, importBackup } = useImportExport({
    t,
    setContent,
    setPubTitle,
    setPubTags,
    setSystemDialog
  });

  // 10. Viewport & Layout
  const [splitWords, setSplitWords] = useState(300);
  const [widgetOpacity, setWidgetOpacity] = useState(() => {
    const saved = localStorage.getItem('widget_opacity');
    return saved !== null ? Number(saved) : 1.0;
  });
  const [widgetNoBorder, setWidgetNoBorder] = useState(() => {
    const saved = localStorage.getItem('widget_no_border');
    return saved === null ? true : saved === 'true';
  });
  const [tableSelectorPos, setTableSelectorPos] = useState<{x: number, y: number, direction: 'up' | 'down'} | null>(null);
  const { viewportHeight: vvHeight, keyboardOffset, isKeyboardOpen, offsetTop, viewportHeight } = useVisualViewport();
  
  const [floatingPos, setFloatingPos] = useState<{ x: number, y: number } | null>(null);
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(() => localStorage.getItem('steem_performance_mode') !== 'false');

  // DOM Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const wysiwygRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef<boolean>(false);
  const lastSyncContentRef = useRef<string>(useEditorStore.getState().content);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const wysiwygSyncTimeoutRef = useRef<number | null>(null);
  const wysiwygLocalBackupTimeoutRef = useRef<number | null>(null);
  const lastKeyboardToggleTimeRef = useRef<number>(0);

  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isMiniGalleryOpen, setIsMiniGalleryOpen] = useState(false);
  const [justInsertedUrl, setJustInsertedUrl] = useState<string | null>(null);
  const [onDemandSyncEnabled, setOnDemandSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('steem_ondemand_sync') === 'true';
  });

  const saveLargeStorage = useCallback((key: string, val: string) => {
    // Safety: Prevent clearing storage during the initial loading window
    if (!val && !hasLoadedRef.current) {
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
  }, []);

  const getMotionConfig = useCallback((custom?: { initial?: any; animate?: any; exit?: any }) => {
    if (performanceMode) {
      return {
        initial: false,
        animate: custom?.animate || { opacity: 1, scale: 1, y: 0, x: 0 },
        exit: false as any,
        transition: { duration: 0 }
      };
    }
    return {
      initial: custom?.initial || { opacity: 0, y: 10, scale: 0.95 },
      animate: custom?.animate || { opacity: 1, y: 0, scale: 1 },
      exit: custom?.exit || { opacity: 0, y: 10, scale: 0.95 },
      transition: { duration: 0.15 }
    };
  }, [performanceMode]);

  const getSidebarMotionConfig = useCallback(() => {
    if (performanceMode) {
      return {
        initial: false,
        animate: { x: 0, opacity: 1 },
        exit: false as any,
        transition: { duration: 0 }
      };
    }
    return {
      initial: { x: -300, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -300, opacity: 0 },
      transition: { duration: 0.3 }
    };
  }, [performanceMode]);

  const [widgetPos, setWidgetPos] = useState<'floating' | 'bottom' | 'hidden'>(() => {
    const saved = localStorage.getItem('steem_widget_pos');
    if (saved === 'bottom' || saved === 'hidden' || saved === 'floating') return saved;
    return 'bottom';
  });

  const [enabledTools, setEnabledTools] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FLOAT_CONFIG);
    try {
      const initial = saved ? JSON.parse(saved) : DEFAULT_FLOAT_TOOLS;
      return Array.isArray(initial) ? Array.from(new Set(initial)) : DEFAULT_FLOAT_TOOLS;
    } catch {
      return DEFAULT_FLOAT_TOOLS;
    }
  });

  const [syncScrollEnabled, setSyncScrollEnabled] = useState(() => localStorage.getItem('steem_sync_scroll') !== 'false');
  const [isLivePreviewEnabled, setIsLivePreviewEnabled] = useState(() => localStorage.getItem('steem_live_preview_enabled') === 'true');
  const [settingsTab, setSettingsTab] = useState<'general' | 'gallery' | 'vault' | 'keys' | 'about' | 'pwa'>('general');

  useEffect(() => {
    localStorage.setItem('steem_live_preview_enabled', String(isLivePreviewEnabled));
  }, [isLivePreviewEnabled]);

  const toggleLivePreview = useCallback(() => {
    setIsLivePreviewEnabled(prev => !prev);
  }, []);

  const [tableImportText, setTableImportText] = useState('');
  const [tableImportFormat, setTableImportFormat] = useState<'markdown' | 'html'>('markdown');

  const [mentions, setMentions] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newMention, setNewMention] = useState('');
  
  const currentUser = authType === 'VAULT' ? selectedVaultUser : username;

  useEffect(() => {
    localStorage.setItem('steem_username', username);
  }, [username]);

  const [pubLog, setPubLog] = useState<{ msg: string, type: 'success' | 'error' | 'loading' | null }>({ msg: '', type: null });

  const notify = useCallback((msg: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setPubLog({ msg, type });
    if (type !== 'loading') {
      const timeout = type === 'success' ? 3000 : 5000;
      setTimeout(() => {
        setPubLog(prev => prev.msg === msg ? { msg: '', type: null } : prev);
      }, timeout);
    } else {
      setTimeout(() => {
        setPubLog(prev => prev.type === 'loading' && prev.msg === msg ? { msg: '', type: null } : prev);
      }, 15000);
    }
  }, []);

  // 11. PWA & Notifications
  const {
    deferredPrompt,
    setDeferredPrompt,
    isPwaInstalled,
    setIsPwaInstalled,
    showPwaBanner,
    setShowPwaBanner,
    showPwaInstructionsModal,
    setShowPwaInstructionsModal,
    handleInstallPwa,
    notifEnabled,
    setNotifEnabled,
    notifications,
    setNotifications,
    rawNotifications,
    setRawNotifications,
    showNotificationPopup,
    setShowNotificationPopup,
    showNotificationList,
    setShowNotificationList,
    mutedUsers,
    setMutedUsers,
    visibleNotifications,
    markAllAsRead,
  } = usePwaAndNotifications({
    t,
    notify,
    currentUser,
  });

  const [showMobileToolsOpen, setShowMobileToolsOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileTools1, setShowMobileTools1] = useState(false);
  const [showMobileTools2, setShowMobileTools2] = useState(false);

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
        setShowNotificationList(false);
        setShowLangMenu(false);
      }
    };
    if (showMobileTools1 || showMobileTools2 || showMobileToolsOpen || showNotificationList || showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileTools1, showMobileTools2, showMobileToolsOpen, showNotificationList, showLangMenu, setShowNotificationList]);

  const [targetReaderPost, setTargetReaderPost] = useState<{ author: string, permlink: string, commentAuthor?: string, commentPermlink?: string } | null>(null);
  const [isSMenuOpen, setIsSMenuOpen] = useState(false);
  const [beautifyEnabled, setBeautifyEnabled] = useState(() => localStorage.getItem('steem_beautify') !== 'false');

  // 12. Post & Publishing Settings
  const {
    rewardType,
    setRewardType,
    removeTitleLine,
    setRemoveTitleLine,
    appAgent,
    setAppAgent,
    beneficiaries,
    setBeneficiaries,
    benName,
    setBenName,
    benWeight,
    setBenWeight,
    showAdvancedSettings,
    setShowAdvancedSettings,
    showAdvancedPublish,
    setShowAdvancedPublish,
    tagGroups,
    setTagGroups,
  } = usePostSettings();

  useEffect(() => {
    if (activeModal === 'publish') {
      if (typeof window !== 'undefined' && !(window as any).steem_keychain) {
        setAuthType('VAULT');
      }
      if (!pubTitle) {
        const content = useEditorStore.getState().content;
        const firstLine = content.split('\n')[0].replace(/[#*`]/g, '').trim();
        if (firstLine) setPubTitle(firstLine.substring(0, 70));
      }
    }
  }, [activeModal, pubTitle, setAuthType]);

  // 13. Publishing Queue
  const {
    queue,
    setQueue,
    scheduledTime,
    setScheduledTime,
    performBroadcast,
    publishFromQueue,
    addToQueue
  } = useSteemQueue({
    appAgent,
    t,
    promptDialog,
    notify,
    vaultPin,
    initVault,
    setActiveModal,
    setPubLog,
    removeTitleLine,
    pubTitle,
    pubTags,
    authType,
    username,
    selectedVaultUser
  });

  // 14. Editor Mode & Cursor/Scroll Manager
  const [activeFormatsState, setActiveFormatsState] = useState({
    bold: false,
    italic: false,
    code: false,
    strikethrough: false,
    sub: false,
    sup: false,
    phishy: false
  });

  const scrollCaretIntoViewRef = useRef<(block?: ScrollLogicalPosition) => void>(() => {});
  const scrollCaretIntoView = useCallback((block?: ScrollLogicalPosition) => {
    scrollCaretIntoViewRef.current(block);
  }, []);

  const setActiveFormatsRef = useRef<any>(null);

  // Forward declarations for WYSIWYG sync
  const saveVisualSelectionRef = useRef<() => void>(() => {});
  const restoreVisualSelectionRef = useRef<() => void>(() => {});
  const syncCursorMarkdownToVisualRef = useRef<() => Promise<void>>(async () => {});
  const syncCursorVisualToMarkdownRef = useRef<() => { md: string } | null>(() => null);

  const {
    editorMode,
    setEditorMode,
    cursorPositionRef,
    isTransitioningModeRef,
    saveCursorPosition,
    restoreMarkdownCursorAndScroll,
    handleSetEditorMode,
  } = useEditorModeManager({
    editorRef,
    wysiwygRef,
    isSyncingRef,
    lastSyncContentRef,
    activeView,
    activeMobileTab,
    isKeyboardOpen,
    widgetPos,
    toolbarIconSize,
    setActiveFormats: setActiveFormatsState,
    saveVisualSelection: () => saveVisualSelectionRef.current(),
    restoreVisualSelection: () => restoreVisualSelectionRef.current(),
    syncCursorMarkdownToVisual: () => syncCursorMarkdownToVisualRef.current(),
    syncCursorVisualToMarkdown: () => syncCursorVisualToMarkdownRef.current(),
    htmlToMarkdown,
    setContent,
  });

  // 15. WYSIWYG Bi-directional Sync
  const wysiwygSync = useWysiwygSync({
    wysiwygRef,
    editorMode,
    isEditorFocused,
    onDemandSyncEnabled,
    scrollCaretIntoView,
    cursorPositionRef,
    isSyncingRef,
    wysiwygLocalBackupTimeoutRef,
    wysiwygSyncTimeoutRef,
    setActiveFormatsRef,
    t,
  });

  const {
    savedVisualRangeRef,
    saveVisualSelection,
    restoreVisualSelection,
    getVisualSelectionHtml,
    focusVisualEditorEnd,
    updateContentFromWysiwyg,
    syncWysiwygToContentIfVisual,
    syncCursorMarkdownToVisual,
    syncCursorVisualToMarkdown,
    updateWysiwygEmptyStatus,
  } = wysiwygSync;

  saveVisualSelectionRef.current = saveVisualSelection;
  restoreVisualSelectionRef.current = restoreVisualSelection;
  syncCursorMarkdownToVisualRef.current = syncCursorMarkdownToVisual;
  syncCursorVisualToMarkdownRef.current = syncCursorVisualToMarkdown;

  // 16. Publishing Manager
  const {
    extractMentions,
    sanitizeFilename,
    handleSplitPost,
    handlePublish,
    handleAddToQueue,
  } = usePublishingManager({
    syncWysiwygToContentIfVisual,
    t,
    notify,
    drafts,
    setDrafts,
    splitWords,
    pubTags,
    pubTitle,
    removeTitleLine,
    authType,
    selectedVaultUser,
    username,
    rewardType,
    beneficiaries,
    performBroadcast,
    processContentForSteem,
    addToQueue,
    saveDraftHook,
    setActiveModal,
    setPubLog,
  });

  // 17. Editor Web Worker (Stats & Cleanup)
  const handleWorkerStats = useCallback((rawStats: any, cleanStatsResult: any) => {
    useEditorStore.getState().setStats(rawStats, cleanStatsResult);
  }, []);

  useEditorWorker(handleWorkerStats);

  const getSelectionOrWord = useCallback(() => {
    const content = useEditorStore.getState().content;
    const start = editorRef.current?.selectionStart ?? 0;
    const end = editorRef.current?.selectionEnd ?? 0;
    if (start !== end) {
      return { text: content.slice(start, end), s: start, e: end };
    }
    const match = content.slice(0, start).match(/[a-zA-Z0-9_\u0400-\u04FF]+$/);
    const afterMatch = content.slice(start).match(/^[a-zA-Z0-9_\u0400-\u04FF]+/);
    const wordStart = match ? start - match[0].length : start;
    const wordEnd = afterMatch ? start + afterMatch[0].length : start;
    return { text: content.slice(wordStart, wordEnd), s: wordStart, e: wordEnd };
  }, []);

  // 18. Formatting Engine
  const editorFormat = useEditorFormat({
    editorRef,
    wysiwygRef,
    editorMode,
    getSelectionOrWord,
    getVisualSelectionHtml,
    restoreVisualSelection,
    updateContentFromWysiwyg,
    promptDialog,
    t,
    savedVisualRangeRef,
    focusVisualEditorEnd,
    saveCursorPosition
  });

  const {
    activeFormats, setActiveFormats,
    insertHtmlAtCursor, insertAtCursor,
    handleMarkdownFormat, fmt, fmtLine,
    handleLink, handleIndent
  } = editorFormat;

  setActiveFormatsRef.current = setActiveFormats;

  const updateContentFromWysiwygRef = useRef(updateContentFromWysiwyg);
  updateContentFromWysiwygRef.current = updateContentFromWysiwyg;

  // 19. Editor Events
  const editorEvents = useEditorEvents({
    editorRef,
    wysiwygRef,
    previewPaneRef,
    savedVisualRangeRef,
    syncScrollEnabled,
    isKeyboardOpen,
    widgetPos,
    toolbarIconSize,
    isWidgetVisible,
    isWidgetMenuOpen,
    setIsWidgetVisible,
    activeFormats,
    setActiveFormats,
    saveCursorPosition,
    updateContentFromWysiwygRef,
    fmt,
    handleLink,
    insertHtmlAtCursor,
    handleIndent,
  });

  const {
    handleEditorScroll,
    handleEditorKeyDown,
    handleWysiwygBeforeInput,
    handleWysiwygKeyDown,
  } = editorEvents;

  scrollCaretIntoViewRef.current = editorEvents.scrollCaretIntoView;

  // 20. Gallery & Media Manager
  const gallery = useSteemGallery({
    t, notify, promptDialog, insertAtCursor, setActiveModal, initVault,
    isUnlocked, isVaultInitialized, setVaultPin, setPubLog,
    username, setUsername, selectedVaultUser, vaultAccounts,
    pexelsApiKey, pixabayApiKey, unsplashAccessKey, performanceMode,
    setIsMiniGalleryOpen
  });

  const {
    images, setImages, sourceInput, setSourceInput,
    isGalleryCollapsed, setIsGalleryCollapsed, isGallerySettingsCollapsed, setIsGallerySettingsCollapsed,
    isUploading, setIsUploading, imageUploadAccount, setImageUploadAccount,
    gallerySearch, setGallerySearch, galleryView, setGalleryView,
    galleryMode, setGalleryMode, pexelsPage, setPexelsPage,
    pexelsResults, setPexelsResults, isSearchingPexels, setIsSearchingPexels,
    gridLayout, setGridLayout, gridWithCaptions, setGridWithCaptions,
    singleCaptionAlign, setSingleCaptionAlign, pexelsSettings, setPexelsSettings,
    isTextWrapEnabled, setIsTextWrapEnabled, isExifEnabled, setIsExifEnabled,
    imageInsertFormat, setImageInsertFormat, isTrafficOptimized, setIsTrafficOptimized,
    filteredLocalImages, parseImages, toggleImageSelection, moveImageLocal,
    toggleGalleryMode, handleExternalSearch, insertExternalImage, insertImage,
    insertGrid, uploadExternalImage, handleFileUpload
  } = gallery;

  // 21. Table Operations
  const tableOps = useTableOperations({
    wysiwygRef,
    updateContentFromWysiwyg,
    setIsWidgetVisible,
    setActiveModal,
    tableImportText,
    setTableImportText,
    tableImportFormat,
    insertAtCursor,
    notify,
    t,
  });

  const {
    activeTable,
    setActiveTable,
    activeTableRow,
    setActiveTableRow,
    activeTableCell,
    setActiveTableCell,
    activeTableRef,
    activeTableRowRef,
    activeTableCellRef,
    tableRect,
    isTableMenuExpanded,
    setIsTableMenuExpanded,
    isTableMenuPinned,
    setIsTableMenuPinned,
    deleteActiveTableRow,
    deleteActiveTableCol,
    deleteActiveTable,
    importTable,
    processTableImport,
  } = tableOps;

  // 22. Backup & Export
  const {
    handleClearCache,
    handleExportBackup,
    handleImportBackup,
    downloadFile,
  } = useAppBackup({
    lang,
    drafts,
    setDrafts,
    pubTitle,
    pubTags,
    exportBackup,
    importBackup,
    syncWysiwygToContentIfVisual,
    processContentForSteem,
    notify,
    confirmDialog,
    t,
  });

  // 23. Reader Actions
  const {
    handleDeleteComment,
    handleUploadImageForReader,
    handleReaderComment,
    handleMuteUser,
    handleReaderVote,
  } = useReaderBlockchainActions({
    authType,
    selectedVaultUser,
    username,
    imageUploadAccount,
    vaultAccounts,
    appAgent,
    mutedUsers,
    setMutedUsers,
    initVault,
    notify,
    setPubLog,
    promptDialog,
    sanitizeFilename,
    setUsername,
    t,
  });

  // 24. Floating Toolbar & Actions
  useEffect(() => {
    lastKeyboardToggleTimeRef.current = Date.now();
  }, [isKeyboardOpen]);

  const handleWidgetAction = useCallback((actionFn: (e?: React.MouseEvent) => void, e?: React.MouseEvent) => {
    if (Date.now() - lastKeyboardToggleTimeRef.current < 250) {
      return;
    }
    actionFn(e);
  }, []);

  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');
  const [lockedToolsWidth, setLockedToolsWidth] = useState<number | null>(null);

  useEffect(() => {
    if (isWidgetMenuOpen && widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setMenuDirection(rect.top < 350 ? 'down' : 'up');
    }
  }, [isWidgetMenuOpen]);

  const showWidget = useCallback((x: number, y: number) => {
    if (widgetPos === 'hidden') return;
    if (widgetPos !== 'floating') {
      if (!isWidgetVisible) setIsWidgetVisible(true);
      return;
    }
    setFloatingPos({ x, y });
    if (!isWidgetVisible) setIsWidgetVisible(true);
  }, [widgetPos, isWidgetVisible]);

  // Selection change listener for visual / markdown active element detection
  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorMode === 'visual') {
        saveVisualSelection();
        if (wysiwygRef.current) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            try {
              const range = sel.getRangeAt(0);
              if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
                savedVisualRangeRef.current = range.cloneRange();
                
                let node: Node | null = range.commonAncestorContainer;
                if (node.nodeType === 3) node = node.parentNode;
                const table = ((node as Element)?.closest?.('table') as HTMLTableElement) || null;
                const row = ((node as Element)?.closest?.('tr') as HTMLTableRowElement) || null;
                const cell = ((node as Element)?.closest?.('td, th') as HTMLTableCellElement) || null;

                if (activeTableRef.current !== table) {
                  activeTableRef.current = table;
                  setActiveTable(table);
                }
                if (activeTableRowRef.current !== row) {
                  activeTableRowRef.current = row;
                  setActiveTableRow(row);
                }
                if (activeTableCellRef.current !== cell) {
                  activeTableCellRef.current = cell;
                  setActiveTableCell(cell);
                }
              } else {
                if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
                if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
                if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
              }
            } catch {
              if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
              if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
              if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
            }
          } else {
            if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
            if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
            if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
          }
        }
      } else if (editorMode === 'markdown') {
        saveCursorPosition();
        if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
        if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
        if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editorMode, saveVisualSelection, saveCursorPosition, activeTableRef, activeTableRowRef, activeTableCellRef, setActiveTable, setActiveTableRow, setActiveTableCell, savedVisualRangeRef]);

  // Debounced persistence for auto-save
  useEffect(() => {
    let timer: any;
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      if (state.content !== prevState.content) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          // Only save if we have finished initial loading to prevent overwriting with default empty state
          if (hasLoadedRef.current) {
            saveLargeStorage(STORAGE_KEY_AUTOSAVE, state.content);
            if (cursorPositionRef.current) {
              try {
                localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorPositionRef.current));
              } catch (err) {
                console.debug(err);
              }
            }
          }
        }, 350);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [saveLargeStorage, cursorPositionRef]);

  // Synchronous flush on page reload / unload / visibility hidden
  useEffect(() => {
    const flushSave = () => {
      if (!hasLoadedRef.current) return;

      try {
        if (editorMode === 'markdown' && editorRef.current) {
          const val = editorRef.current.value;
          if (val !== undefined && val !== null) {
            useEditorStore.setState({ content: val });
            saveLargeStorage(STORAGE_KEY_AUTOSAVE, val);
          }
        } else if (editorMode === 'visual' && wysiwygRef.current) {
          const md = htmlToMarkdown(wysiwygRef.current.innerHTML);
          if (md !== undefined && md !== null) {
            useEditorStore.setState({ content: md });
            saveLargeStorage(STORAGE_KEY_AUTOSAVE, md);
          }
        }
      } catch (err) {
        console.debug('Autosave flush on unload failed:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    };

    window.addEventListener('beforeunload', flushSave);
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushSave);
      window.removeEventListener('pagehide', flushSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [editorMode, saveLargeStorage]);

  // Restore initial document content from storage on startup
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY_AUTOSAVE) || sessionStorage.getItem(STORAGE_KEY_AUTOSAVE);
    } catch (err) {
      console.debug(err);
    }
    if (saved && saved !== useEditorStore.getState().content) {
      setContent(saved);
    }
    hasLoadedRef.current = true;
  }, [setContent]);

  // Initial Steem Node probing & marked parser config
  useEffect(() => {
    probeNodes();
    if (marked && (marked as any).use) {
      (marked as any).use({ breaks: true, gfm: true });
    }
  }, []);

  // Update live preview pane HTML morphing
  useEffect(() => {
    const preview = previewPaneRef.current;
    if (!isLivePreviewEnabled) {
      if (preview && !preview.querySelector('svg.opacity-40')) {
        preview.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2 py-12 text-center select-none">
          <svg class="w-8 h-8 opacity-40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <p>${lang === 'uk' ? "Прев'ю вимкнено для економії ресурсів.<br>Натисніть кнопку з оком, щоб увімкнути знову." : "Live Preview disabled to save resources.<br>Click the eye icon to enable again."}</p>
        </div>`;
      }
      return;
    }

    const updatePreview = async () => {
      const m = getMarked();
      if (!m) {
        if (preview) {
          Idiomorph.morph(preview, `<p class="text-slate-500 italic">${t('loadingParser')}</p>`, { morphStyle: 'innerHTML' });
        }
        return;
      }
      try {
        const mdContent = useEditorStore.getState().content;
        const processed = processContentForSteem(mdContent);
        let finalHtml = (await m.parse(processed)) as string;
        finalHtml = finalHtml.replace(/<img /g, '<img referrerpolicy="no-referrer" loading="lazy" ');
        
        let isAtBottom = false;
        if (preview) {
          isAtBottom = preview.scrollHeight > 0 && preview.scrollHeight - preview.scrollTop - preview.clientHeight <= 20;
        }
        
        const purifiedHtml = DOMPurify ? (DOMPurify.sanitize(finalHtml, DOM_PURIFY_CONFIG as any) as unknown as string) : (finalHtml as unknown as string);
        
        if (preview) {
          Idiomorph.morph(preview, purifiedHtml, { morphStyle: 'innerHTML' });
          if (syncScrollEnabled && isAtBottom) {
            requestAnimationFrame(() => {
              preview.scrollTop = preview.scrollHeight;
            });
          }
        }
      } catch (e) {
        console.error("Marked parse error", e);
        if (preview) {
          Idiomorph.morph(preview, `<p class="text-red-500">${t('previewError')}</p>`, { morphStyle: 'innerHTML' });
        }
      }
    };

    if (isFirstRender.current) {
      isFirstRender.current = false;
      updatePreview();
      return;
    }

    let timer: any;
    if (!isLivePreviewEnabled) updatePreview(); 
    else {
      timer = setTimeout(updatePreview, 300);
    }
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      if (state.content !== prevState.content) {
        if (editorMode === 'visual') return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(updatePreview, 300);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [t, syncScrollEnabled, isLivePreviewEnabled, lang, editorMode]);

  // Tags & Drafts Helpers
  const toggleTag = (tag: string) => {
    setPubTags(prev => {
      const tags = prev.split(' ').filter(t => t.trim());
      if (tags.includes(tag)) {
        return tags.filter(t => t !== tag).join(' ');
      }
      return [...tags, tag].join(' ');
    });
  };

  const saveDraft = (status: 'working' | 'ready' = 'working') => {
    const currentMarkdown = syncWysiwygToContentIfVisual();
    saveDraftHook(currentMarkdown, status, notify, t);
  };

  const handleEditPost = (post: SteemPost) => {
    setPubTitle(post.title);
    setContent(post.body);
    setPubTags(JSON.parse(post.json_metadata || '{}').tags?.join(' ') || post.category);
    setActiveView('editor');
    notify(t('editor'), 'success');
  };

  const addMention = () => {
    const name = newMention.trim().replace('@', '');
    if (!name || mentions.includes(name)) return;
    const updated = [name, ...mentions];
    setMentions(updated);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
    setNewMention('');
  };

  const toggleTool = (key: string) => {
    const newTools = enabledTools.includes(key)
      ? enabledTools.filter(t => t !== key)
      : [...enabledTools, key];
    setEnabledTools(newTools);
    localStorage.setItem(STORAGE_KEY_FLOAT_CONFIG, JSON.stringify(newTools));
  };

  const moveTool = (key: string, dir: 'up' | 'down') => {
    const idx = enabledTools.indexOf(key);
    if (idx === -1) return;
    const newTools = [...enabledTools];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newTools.length) return;
    [newTools[idx], newTools[targetIdx]] = [newTools[targetIdx], newTools[idx]];
    setEnabledTools(newTools);
    localStorage.setItem(STORAGE_KEY_FLOAT_CONFIG, JSON.stringify(newTools));
  };

  // 25. Tools Dictionary Mapping
  const TOOLS_MAP = createToolsMap({
    fmt,
    fmtLine,
    handleLink,
    insertAtCursor,
    importTable,
    setTableSelectorPos,
    setShowTableSelector,
    editorRef,
    setContent,
    promptDialog,
    setActiveModal,
    extractMentions,
    contentForPublish,
    fileInputRef,
    setIsMiniGalleryOpen,
    t,
  });

  return (
    <div className={cn(
      "flex flex-col w-full h-full relative font-sans overflow-hidden transition-colors duration-500 selection:bg-[rgb(var(--accent-color)/0.3)]",
      visualStyle === 'neon' ? "theme-neon bg-slate-950 text-cyan-400" : (isDarkMode ? "bg-slate-950 text-slate-100" : "theme-light bg-white text-slate-900 border-slate-200"),
      performanceMode && "perf-mode"
    )}>
      {/* Dynamic Theme & Editor Styles */}
      <GlobalEditorStyles visualStyle={visualStyle} neonTextColored={neonTextColored} />
      
      {/* Header / Main Toolbar */}
      <Header
        setIsSMenuOpen={setIsSMenuOpen}
        visualStyle={visualStyle}
        activeView={activeView}
        setActiveView={setActiveView}
        editorMode={editorMode}
        toolsMap={TOOLS_MAP}
        fmt={fmt}
        fmtLine={fmtLine}
        handleIndent={handleIndent}
        handleLink={handleLink}
        importTable={importTable}
        saveDraft={saveDraft}
        downloadFile={downloadFile}
        insertAtCursor={insertAtCursor}
        activeFormats={activeFormats}
        templates={templates}
        mentions={mentions}
        queue={queue}
        setPubTitle={setPubTitle}
        setPubTags={setPubTags}
        setCurrentDraftId={setCurrentDraftId}
        notifEnabled={notifEnabled}
        setNotifEnabled={setNotifEnabled}
        visibleNotifications={visibleNotifications}
        showNotificationList={showNotificationList}
        setShowNotificationList={setShowNotificationList}
        markAllAsRead={markAllAsRead}
        setTargetReaderPost={setTargetReaderPost}
        lang={lang}
        setLang={setLang}
        showLangMenu={showLangMenu}
        setShowLangMenu={setShowLangMenu}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        performanceMode={performanceMode}
        showMobileToolsOpen={showMobileToolsOpen}
        setShowMobileToolsOpen={setShowMobileToolsOpen}
        showMobileTools1={showMobileTools1}
        setShowMobileTools1={setShowMobileTools1}
        showMobileTools2={showMobileTools2}
        setShowMobileTools2={setShowMobileTools2}
        setActiveModal={setActiveModal}
        setSettingsTab={setSettingsTab}
        isPwaInstalled={isPwaInstalled}
        handleInstallPwa={handleInstallPwa}
        getMotionConfig={getMotionConfig}
        editorRef={editorRef}
        wysiwygRef={wysiwygRef}
        isSyncingRef={isSyncingRef}
        getMarked={getMarked}
        setContent={setContent}
        confirmDialog={confirmDialog}
        updateWysiwygEmptyStatus={updateWysiwygEmptyStatus}
        isTauriEnv={isTauriEnv}
        isNeutralinoEnv={isNeutralinoEnv}
        t={t}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Reader View */}
        <div className={cn("flex-1 overflow-hidden bg-slate-900 flex flex-col", activeView !== 'reader' && "hidden")}>
          <Reader 
            lang={lang}
            t={t}
            onEditPost={handleEditPost}
            onVote={handleReaderVote}
            onComment={handleReaderComment}
            onDeleteComment={handleDeleteComment}
            onUploadImage={handleUploadImageForReader}
            onUserUpdate={(u) => setUsername(u)}
            currentUser={currentUser}
            onMuteUser={handleMuteUser}
            mutedUsers={mutedUsers || []}
            targetReaderPost={targetReaderPost}
            rawInboxData={rawNotifications}
          />
        </div>

        {/* Editor Workspace View */}
        <div className={cn("flex-1 overflow-hidden flex", activeView !== 'editor' && "hidden")}>
          {/* Sidebar */}
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            isGalleryCollapsed={isGalleryCollapsed}
            setIsGalleryCollapsed={setIsGalleryCollapsed}
            getSidebarMotionConfig={getSidebarMotionConfig}
            username={username}
            vaultAccounts={vaultAccounts}
            selectedVaultUser={selectedVaultUser}
            imageUploadAccount={imageUploadAccount}
            setImageUploadAccount={setImageUploadAccount}
            galleryMode={galleryMode}
            toggleGalleryMode={toggleGalleryMode}
            galleryView={galleryView}
            setGalleryView={setGalleryView}
            gallerySearch={gallerySearch}
            setGallerySearch={setGallerySearch}
            filteredLocalImages={filteredLocalImages}
            images={images}
            setImages={setImages}
            toggleImageSelection={toggleImageSelection}
            moveImageLocal={moveImageLocal}
            insertImage={insertImage}
            insertExternalImage={insertExternalImage}
            uploadExternalImage={uploadExternalImage}
            insertGrid={insertGrid}
            isSearchingPexels={isSearchingPexels}
            pexelsResults={pexelsResults}
            setPexelsResults={setPexelsResults}
            pexelsPage={pexelsPage}
            handleExternalSearch={handleExternalSearch}
            pexelsApiKey={pexelsApiKey}
            pixabayApiKey={pixabayApiKey}
            unsplashAccessKey={unsplashAccessKey}
            isTrafficOptimized={isTrafficOptimized}
            setIsTrafficOptimized={setIsTrafficOptimized}
            performanceMode={performanceMode}
            setPerformanceMode={setPerformanceMode}
            pexelsSettings={pexelsSettings}
            setPexelsSettings={setPexelsSettings}
            isGallerySettingsCollapsed={isGallerySettingsCollapsed}
            setIsGallerySettingsCollapsed={setIsGallerySettingsCollapsed}
            gridLayout={gridLayout}
            setGridLayout={setGridLayout}
            gridWithCaptions={gridWithCaptions}
            setGridWithCaptions={setGridWithCaptions}
            singleCaptionAlign={singleCaptionAlign}
            setSingleCaptionAlign={setSingleCaptionAlign}
            isTextWrapEnabled={isTextWrapEnabled}
            setIsTextWrapEnabled={setIsTextWrapEnabled}
            isExifEnabled={isExifEnabled}
            setIsExifEnabled={setIsExifEnabled}
            imageInsertFormat={imageInsertFormat}
            setImageInsertFormat={setImageInsertFormat}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            sourceInput={sourceInput}
            setSourceInput={setSourceInput}
            parseImages={parseImages}
            setActiveModal={setActiveModal}
            notify={notify}
            t={t}
          />

          {/* Main Pane Container */}
          <main className={cn(
            "flex-1 flex flex-col min-w-0 bg-slate-950 relative transition-all",
            (isEditorFullScreen || isFullScreen || isKeyboardOpen) ? "pb-0 lg:pb-0" : "pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
          )}>
            <div className="flex-1 flex overflow-hidden">
              {/* Markdown / Visual Editor Pane */}
              <EditorPane
                editorPaneRef={editorPaneRef}
                editorRef={editorRef}
                wysiwygRef={wysiwygRef}
                isSyncingRef={isSyncingRef}
                wysiwygLocalBackupTimeoutRef={wysiwygLocalBackupTimeoutRef}
                wysiwygSyncTimeoutRef={wysiwygSyncTimeoutRef}
                lastSyncContentRef={lastSyncContentRef}
                fileInputRef={fileInputRef}
                isEditorFullScreen={isEditorFullScreen}
                vvHeight={vvHeight}
                activeMobileTab={activeMobileTab}
                visualStyle={visualStyle}
                isDarkMode={isDarkMode}
                t={t}
                editorMode={editorMode}
                isLivePreviewEnabled={isLivePreviewEnabled}
                onDemandSyncEnabled={onDemandSyncEnabled}
                beautifyEnabled={beautifyEnabled}
                neonTextColored={neonTextColored}
                isSpacingMenuOpen={isSpacingMenuOpen}
                wysiwygSpacing={wysiwygSpacing}
                editorFontSize={editorFontSize}
                toolbarIconSize={toolbarIconSize}
                activeTable={activeTable}
                tableRect={tableRect}
                isTableMenuExpanded={isTableMenuExpanded}
                isTableMenuPinned={isTableMenuPinned}
                isMiniGalleryOpen={isMiniGalleryOpen}
                images={images}
                justInsertedUrl={justInsertedUrl}
                keyboardOffset={keyboardOffset}
                isFullScreen={isFullScreen}
                widgetPos={widgetPos}
                isWidgetVisible={isWidgetVisible}
                isWidgetMenuOpen={isWidgetMenuOpen}
                activeFormats={activeFormats}
                showMobileTools1={showMobileTools1}
                showMobileTools2={showMobileTools2}
                showMobileToolsOpen={showMobileToolsOpen}
                activeModal={activeModal}
                widgetNoBorder={widgetNoBorder}
                performanceMode={performanceMode}
                floatingPos={floatingPos}
                widgetRef={widgetRef}
                offsetTop={offsetTop}
                viewportHeight={viewportHeight}
                isKeyboardOpen={isKeyboardOpen}
                isSidebarOpen={isSidebarOpen}
                scrollRef={scrollRef}
                lockedToolsWidth={lockedToolsWidth}
                enabledTools={enabledTools}
                menuDirection={menuDirection}
                widgetOpacity={widgetOpacity}
                lang={lang}
                handleSetEditorMode={handleSetEditorMode}
                toggleEditorFullScreen={toggleEditorFullScreen}
                setOnDemandSyncEnabled={setOnDemandSyncEnabled}
                notify={notify}
                toggleLivePreview={toggleLivePreview}
                setBeautifyEnabled={setBeautifyEnabled}
                setNeonTextColored={setNeonTextColored}
                setIsSpacingMenuOpen={setIsSpacingMenuOpen}
                setWysiwygSpacing={setWysiwygSpacing}
                setEditorFontSize={setEditorFontSize}
                setToolbarIconSize={setToolbarIconSize}
                setIsTableMenuExpanded={setIsTableMenuExpanded}
                setIsTableMenuPinned={setIsTableMenuPinned}
                setIsMiniGalleryOpen={setIsMiniGalleryOpen}
                setJustInsertedUrl={setJustInsertedUrl}
                setWidgetPos={setWidgetPos}
                setIsWidgetVisible={setIsWidgetVisible}
                setIsWidgetMenuOpen={setIsWidgetMenuOpen}
                setShowMobileTools1={setShowMobileTools1}
                setShowMobileTools2={setShowMobileTools2}
                setShowMobileToolsOpen={setShowMobileToolsOpen}
                setActiveModal={setActiveModal}
                setSettingsTab={setSettingsTab}
                setLockedToolsWidth={setLockedToolsWidth}
                setEnabledTools={setEnabledTools}
                setWidgetOpacity={setWidgetOpacity}
                setWidgetNoBorder={setWidgetNoBorder}
                saveCursorPosition={saveCursorPosition}
                setIsEditorFocused={setIsEditorFocused}
                handleEditorKeyDown={handleEditorKeyDown}
                handleEditorScroll={handleEditorScroll}
                showWidget={showWidget}
                handleWysiwygBeforeInput={handleWysiwygBeforeInput}
                handleWysiwygKeyDown={handleWysiwygKeyDown}
                isImageAndProxyUrl={isImageAndProxyUrl}
                insertHtmlAtCursor={insertHtmlAtCursor}
                updateContentFromWysiwyg={updateContentFromWysiwyg}
                htmlToMarkdown={htmlToMarkdown}
                convertBareImageUrlsToMarkdown={convertBareImageUrlsToMarkdown}
                getMarked={getMarked}
                setContent={setContent}
                saveVisualSelection={saveVisualSelection}
                updateWysiwygEmptyStatus={updateWysiwygEmptyStatus}
                deleteActiveTableRow={deleteActiveTableRow}
                deleteActiveTableCol={deleteActiveTableCol}
                deleteActiveTable={deleteActiveTable}
                getMiniGalleryBottomStyle={getMiniGalleryBottomStyle}
                insertImage={insertImage}
                insertAtCursor={insertAtCursor}
                confirmDialog={confirmDialog}
                handleWidgetAction={handleWidgetAction}
                moveTool={moveTool}
                toggleTool={toggleTool}
                fmt={fmt}
                fmtLine={fmtLine}
                handleIndent={handleIndent}
                handleLink={handleLink}
                importTable={importTable}
                TOOLS_MAP={TOOLS_MAP}
              />

              {/* Preview Pane */}
              <PreviewPane
                previewRef={previewRef}
                previewPaneRef={previewPaneRef}
                activeMobileTab={activeMobileTab}
                isLivePreviewEnabled={isLivePreviewEnabled}
                isFullScreen={isFullScreen}
                toggleLivePreview={toggleLivePreview}
                syncScrollEnabled={syncScrollEnabled}
                setSyncScrollEnabled={setSyncScrollEnabled}
                toggleFullScreen={toggleFullScreen}
                widgetPos={widgetPos}
                lang={lang}
                t={t}
              />
            </div>

            {/* Desktop Status Bar Footer */}
            <DesktopStatsFooter t={t} />
          </main>
        </div>
      </div>

      {/* Application Modals Suite */}
      <AppModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        vaultPin={vaultPin}
        setVaultPin={setVaultPin}
        initVault={initVault}
        username={username}
        setUsername={setUsername}
        isVaultInitialized={isVaultInitialized}
        isUnlocked={isUnlocked}
        vaultAccounts={vaultAccounts}
        pexelsApiKey={pexelsApiKey}
        setPexelsApiKey={setPexelsApiKey}
        pixabayApiKey={pixabayApiKey}
        setPixabayApiKey={setPixabayApiKey}
        unsplashAccessKey={unsplashAccessKey}
        setUnsplashAccessKey={setUnsplashAccessKey}
        performanceMode={performanceMode}
        setPerformanceMode={setPerformanceMode}
        notify={notify}
        confirmDialog={confirmDialog}
        promptDialog={promptDialog}
        lang={lang}
        authType={authType}
        setAuthType={setAuthType}
        selectedVaultUser={selectedVaultUser}
        setSelectedVaultUser={setSelectedVaultUser}
        pubTitle={pubTitle}
        setPubTitle={setPubTitle}
        pubTags={pubTags}
        setPubTags={setPubTags}
        rewardType={rewardType}
        setRewardType={setRewardType}
        removeTitleLine={removeTitleLine}
        setRemoveTitleLine={setRemoveTitleLine}
        beneficiaries={beneficiaries}
        setBeneficiaries={setBeneficiaries}
        benName={benName}
        setBenName={setBenName}
        benWeight={benWeight}
        setBenWeight={setBenWeight}
        showAdvancedPublish={showAdvancedPublish}
        setShowAdvancedPublish={setShowAdvancedPublish}
        scheduledTime={scheduledTime}
        setScheduledTime={setScheduledTime}
        contentForPublish={contentForPublish}
        mentions={mentions}
        extractMentions={extractMentions}
        addToQueue={handleAddToQueue}
        pubLog={pubLog}
        setPubLog={setPubLog}
        handlePublish={handlePublish}
        tagGroups={tagGroups}
        templates={templates}
        setTemplates={setTemplates}
        setContent={setContent}
        insertAtCursor={insertAtCursor}
        toggleTag={toggleTag}
        splitWords={splitWords}
        setSplitWords={setSplitWords}
        handleSplitPost={handleSplitPost}
        currentDraftId={currentDraftId}
        setCurrentDraftId={setCurrentDraftId}
        drafts={drafts}
        deleteDraft={deleteDraft}
        toggleDraftStatus={toggleDraftStatus}
        editorMode={editorMode}
        wysiwygRef={wysiwygRef}
        isSyncingRef={isSyncingRef}
        getMarked={getMarked}
        exportBackup={handleExportBackup}
        importBackup={handleImportBackup}
        setMentions={setMentions}
        newMention={newMention}
        setNewMention={setNewMention}
        addMention={addMention}
        isSMenuOpen={isSMenuOpen}
        setIsSMenuOpen={setIsSMenuOpen}
        themeColor={themeColor}
        setThemeColor={setThemeColor}
        activeAssortment={activeAssortment}
        editorFont={editorFont}
        setEditorFont={setEditorFont}
        fontOptions={fontOptions}
        beautifyEnabled={beautifyEnabled}
        setBeautifyEnabled={setBeautifyEnabled}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        visualStyle={visualStyle}
        setVisualStyle={setVisualStyle}
        isPwaInstalled={isPwaInstalled}
        isTauriEnv={isTauriEnv}
        isNeutralinoEnv={isNeutralinoEnv}
        handleInstallPwa={handleInstallPwa}
        setSettingsTab={setSettingsTab}
        appAgent={appAgent}
        setAppAgent={setAppAgent}
        appChangelog={APP_CHANGELOG}
        getChangelogText={getChangelogText}
        setTagGroups={setTagGroups}
        queue={queue}
        setQueue={setQueue}
        publishFromQueue={publishFromQueue}
        tableImportText={tableImportText}
        setTableImportText={setTableImportText}
        tableImportFormat={tableImportFormat}
        setTableImportFormat={setTableImportFormat}
        processTableImport={processTableImport}
        settingsTab={settingsTab}
        setLang={setLang}
        neonTextColored={neonTextColored}
        setNeonTextColored={setNeonTextColored}
        editorFontSize={editorFontSize}
        setEditorFontSize={setEditorFontSize}
        toolbarIconSize={toolbarIconSize}
        setToolbarIconSize={setToolbarIconSize}
        wysiwygSpacing={wysiwygSpacing}
        setWysiwygSpacing={setWysiwygSpacing}
        widgetPos={widgetPos}
        setWidgetPos={setWidgetPos}
        isTrafficOptimized={isTrafficOptimized}
        setIsTrafficOptimized={setIsTrafficOptimized}
        syncScrollEnabled={syncScrollEnabled}
        setSyncScrollEnabled={setSyncScrollEnabled}
        showAdvancedSettings={showAdvancedSettings}
        setShowAdvancedSettings={setShowAdvancedSettings}
        imageInsertFormat={imageInsertFormat}
        setImageInsertFormat={setImageInsertFormat}
        pexelsSettings={pexelsSettings}
        setPexelsSettings={setPexelsSettings}
        images={images}
        handleClearCache={handleClearCache}
        showPwaBanner={showPwaBanner}
        setShowPwaBanner={setShowPwaBanner}
        isEditorFullScreen={isEditorFullScreen}
        isFullScreen={isFullScreen}
        showPwaInstructionsModal={showPwaInstructionsModal}
        setShowPwaInstructionsModal={setShowPwaInstructionsModal}
        deferredPrompt={deferredPrompt}
        t={t}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomBar
        isEditorFullScreen={isEditorFullScreen}
        isFullScreen={isFullScreen}
        isKeyboardOpen={isKeyboardOpen}
        activeMobileTab={activeMobileTab}
        setActiveMobileTab={setActiveMobileTab}
        visualStyle={visualStyle}
        pubTitle={pubTitle}
        setPubTitle={setPubTitle}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setSettingsTab={setSettingsTab}
        t={t}
      />

      {/* Hidden File Input for local image uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        multiple 
        onChange={handleFileUpload} 
      />

      {/* Account Prompt Overlay */}
      <AccountPromptModal
        showAccountPrompt={showAccountPrompt}
        setShowAccountPrompt={setShowAccountPrompt}
        username={username}
        setUsername={setUsername}
        t={t}
      />

      {/* Toast Notifications */}
      <NotificationToast
        showNotificationPopup={showNotificationPopup}
        setShowNotificationPopup={setShowNotificationPopup}
        setActiveView={setActiveView}
        setNotifications={setNotifications}
        setTargetReaderPost={setTargetReaderPost}
      />

      {/* Table Dimension Selector Popup */}
      <TableSelectorPopup
        showTableSelector={showTableSelector}
        setShowTableSelector={setShowTableSelector}
        tableSelectorPos={tableSelectorPos}
        tableImportFormat={tableImportFormat}
        setTableImportFormat={setTableImportFormat}
        insertAtCursor={insertAtCursor}
      />

      {/* System Dialog Confirmation / Input */}
      <AnimatePresence>
        {systemDialog && (
          <SystemDialogModal
            systemDialog={systemDialog}
            setSystemDialog={setSystemDialog}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
