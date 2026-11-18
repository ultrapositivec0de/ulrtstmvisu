import React, { useState, useEffect, useCallback } from 'react';
import { Language } from './types';
import { Buffer } from 'buffer';
import { useEditorStore } from './store';

import { translations, AVAILABLE_LANGUAGES, getTranslation, type TranslationKey } from './locales';
import { getMarked } from './utils/markdownParser';
import { saveFileNatively } from './utils/fileSaver';

// Custom Hooks
import { useVisualViewport } from './hooks/useVisualViewport';
import { useDrafts } from './hooks/useDrafts';
import { useImportExport } from './hooks/useImportExport';
import { useSteemAuth } from './hooks/useSteemAuth';
import { useEditorCore } from './hooks/useEditorCore';
import { useAppUI } from './hooks/useAppUI';
import { useDialogs } from './hooks/useDialogs';
import { useThemeAndStyles } from './hooks/useThemeAndStyles';
import { usePwaAndNotifications } from './hooks/usePwaAndNotifications';
import { useFloatingWidgetState } from './hooks/useFloatingWidgetState';
import { useAppNotifications } from './hooks/useAppNotifications';
import { useWindowInteractions } from './hooks/useWindowInteractions';
import { useWorkspaceDOMRefs } from './hooks/useWorkspaceDOMRefs';
import { useWorkspaceEditorState } from './hooks/useWorkspaceEditorState';
import { useWorkspaceServices } from './hooks/useWorkspaceServices';
import { useAppWorkspaceSuite } from './hooks/useAppWorkspaceSuite';

// Components
import { useTypingSound } from './services/audio/useTypingSound';
import { AppWorkspaceHost } from './components/screens';

// Global environment setups
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

const STORAGE_KEY_AUTOSAVE = 'steem_autosave_temp';
const STORAGE_KEY_USERS = 'steem_users_v2';

function App() {
  // 1. Authentication & Security
  const auth = useSteemAuth();
  const {
    authType,
    username,
    selectedVaultUser,
    showAccountPrompt,
    setShowAccountPrompt,
  } = auth;

  // 2. Localization
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('steem_lang') || localStorage.getItem('steem_language');
    if (saved && (translations[saved] || AVAILABLE_LANGUAGES.some(l => l.code === saved))) return saved;
    const browserLang = navigator?.language?.slice(0, 2);
    if (browserLang && (translations[browserLang] || AVAILABLE_LANGUAGES.some(l => l.code === browserLang))) return browserLang;
    return 'uk';
  });

  useEffect(() => {
    useEditorStore.getState().setCurrentLang(lang);
    localStorage.setItem('steem_language', lang);
    localStorage.setItem('steem_lang', lang);
  }, [lang]);

  const t = useCallback((key: TranslationKey) => getTranslation(lang, key), [lang]);

  // 3. System Notifications & Log State
  const {
    pubLog,
    setPubLog,
    clearPubLogTimer,
    notify,
    quickTags,
    setQuickTags,
    pinTag,
    autoInbox,
    handleSetAutoInbox,
  } = useAppNotifications({ t });

  // 4. System Dialogs (Confirm & Prompt)
  const { systemDialog, setSystemDialog, confirmDialog, promptDialog } = useDialogs({ t });

  // 5. Editor Store State
  const setContent = useEditorStore(state => state.setContent);

  // 6. Post Metadata & Menu State
  const [pubTitle, setPubTitle] = useState('');
  const [pubTags, setPubTags] = useState('');
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);

  // 7. Audio Typing Synth Hook & Modal State
  const typingSound = useTypingSound();
  const [isAudioPresetsModalOpen, setIsAudioPresetsModalOpen] = useState(false);

  // 8. Theme, Styling & Custom CSS Variables
  const themeAndStyles = useThemeAndStyles();
  const { toolbarIconSize } = themeAndStyles;

  // 9. Navigation & Modals UI
  const appUI = useAppUI({
    isWidgetMenuOpen,
    setIsWidgetMenuOpen,
  });
  const {
    activeModal,
    setActiveModal,
    activeView,
    setActiveView,
  } = appUI;

  const contentForPublish = useEditorStore(state => activeModal === 'publish' ? state.content : '');

  // 10. Drafts & Templates
  const draftsManager = useDrafts(saveFileNatively);

  // 11. Import / Export
  const { exportBackup, importBackup } = useImportExport({
    t,
    setContent,
    setPubTitle,
    setPubTags,
    setSystemDialog,
  });

  // 12. Viewport, DOM Refs & Editor State
  const { viewportHeight: vvHeight, keyboardOffset, isKeyboardOpen, offsetTop, viewportHeight } = useVisualViewport();
  const domRefs = useWorkspaceDOMRefs();
  const editorState = useWorkspaceEditorState({
    authType,
    selectedVaultUser,
    username,
    storageKeyUsers: STORAGE_KEY_USERS,
  });

  // 13. Floating Toolbar State
  const floatingWidget = useFloatingWidgetState({
    isKeyboardOpen,
    isWidgetMenuOpen,
  });
  const {
    widgetPos,
    isWidgetVisible,
    setIsWidgetVisible,
  } = floatingWidget;

  // 14. PWA & Notifications
  const pwa = usePwaAndNotifications({
    t,
    notify,
    currentUser: editorState.currentUser,
  });

  // 15. Window Interactions & Motion
  const {
    showMobileToolsOpen,
    setShowMobileToolsOpen,
    showLangMenu,
    setShowLangMenu,
    showMobileTools1,
    setShowMobileTools1,
    showMobileTools2,
    setShowMobileTools2,
    saveLargeStorage,
    getMotionConfig,
    getSidebarMotionConfig,
  } = useWindowInteractions({
    performanceMode: editorState.performanceMode,
    hasLoadedRef: domRefs.hasLoadedRef,
    setShowNotificationList: pwa.setShowNotificationList,
  });

  // 16. Editor Core Suite (Unified Mode, Sync, Formatting, Events & Tables)
  const editorCore = useEditorCore({
    ...domRefs,
    activeView,
    activeMobileTab: editorState.activeMobileTab,
    isKeyboardOpen,
    keyboardOffset,
    widgetPos,
    toolbarIconSize,
    isWidgetVisible,
    isWidgetMenuOpen,
    setIsWidgetVisible,
    onDemandSyncEnabled: editorState.onDemandSyncEnabled,
    isEditorFocused: editorState.isEditorFocused,
    syncScrollEnabled: editorState.syncScrollEnabled,
    setActiveModal,
    promptDialog,
    notify,
    setContent,
    t,
  });

  // 17. Unified Workspace Services Suite
  const {
    publishingSuite,
    postSettings,
    publishingQueue,
    publishingManager,
    gallery,
    appBackup,
    readerBlockchainActions,
    appPublishing,
    TOOLS_MAP,
  } = useWorkspaceServices({
    t,
    notify,
    confirmDialog,
    promptDialog,
    setPubLog,
    lang,
    pubTitle,
    setPubTitle,
    pubTags,
    setPubTags,
    activeModal,
    setActiveModal,
    activeView,
    setActiveView,
    saveLargeStorage,
    STORAGE_KEY_AUTOSAVE,
    STORAGE_KEY_USERS,
    getMarked,
    auth,
    draftsManager,
    editorCore,
    pwa,
    contentForPublish,
    exportBackup,
    importBackup,
    domRefs,
    editorState,
  });

  // 18. Workspace Props Composite Suite
  const {
    headerProps,
    readerProps,
    editorProps,
    modalsHostProps,
    visualStyle,
    neonTextColored,
    isDarkMode,
  } = useAppWorkspaceSuite({
    auth,
    publishingSuite,
    postSettings,
    draftsManager,
    publishingQueue,
    publishingManager,
    editorCore,
    gallery,
    pwa,
    themeAndStyles,
    appUI,
    floatingWidget,
    appPublishing,
    appBackup,
    readerBlockchainActions,
    typingSound,
    vvHeight,
    viewportHeight,
    offsetTop,
    keyboardOffset,
    isKeyboardOpen,
    getMotionConfig,
    getSidebarMotionConfig,
    lang,
    setLang,
    t,
    pubTitle,
    setPubTitle,
    pubTags,
    setPubTags,
    isAudioPresetsModalOpen,
    setIsAudioPresetsModalOpen,
    isWidgetMenuOpen,
    setIsWidgetMenuOpen,
    showAccountPrompt,
    setShowAccountPrompt,
    autoInbox,
    handleSetAutoInbox,
    pubLog,
    setPubLog,
    clearPubLogTimer,
    systemDialog,
    setSystemDialog,
    confirmDialog,
    promptDialog,
    notify,
    quickTags,
    setQuickTags,
    pinTag,
    contentForPublish,
    setContent,
    getMarked,
    TOOLS_MAP,
    showLangMenu,
    setShowLangMenu,
    showMobileToolsOpen,
    setShowMobileToolsOpen,
    showMobileTools1,
    setShowMobileTools1,
    showMobileTools2,
    setShowMobileTools2,
    domRefs,
    editorState,
  });

  return (
    <AppWorkspaceHost
      visualStyle={visualStyle}
      neonTextColored={neonTextColored}
      isDarkMode={isDarkMode}
      performanceMode={editorState.performanceMode}
      isKeyboardOpen={isKeyboardOpen}
      vvHeight={vvHeight}
      headerProps={headerProps}
      activeView={activeView}
      readerProps={readerProps}
      editorProps={editorProps}
      modalsHostProps={modalsHostProps}
    />
  );
}

export default App;
