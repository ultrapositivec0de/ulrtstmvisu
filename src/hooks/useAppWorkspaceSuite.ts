import React from 'react';
import { type HeaderProps } from '../components/header/Header';
import { type ReaderScreenProps } from '../components/screens/ReaderScreen';
import { type EditorScreenProps } from '../components/screens/EditorScreen';
import { type AppModalsHostProps } from '../components/modals/AppModalsHost';
import { useSidebarProps } from './useSidebarProps';
import { useEditorPaneProps } from './useEditorPaneProps';
import { useModalsProps } from './useModalsProps';
import { APP_CHANGELOG, getChangelogText } from '../data/changelog';

import { WorkspaceDOMRefs } from './useWorkspaceDOMRefs';
import { WorkspaceEditorState } from './useWorkspaceEditorState';
import { useModalStore } from '../stores/useModalStore';

export interface UseAppWorkspaceSuiteParams {
  // Domain Suites
  auth: any;
  publishingSuite?: any;
  postSettings: any;
  draftsManager: any;
  publishingQueue: any;
  publishingManager: any;
  editorCore: any;
  gallery: any;
  pwa: any;
  themeAndStyles: any;
  appUI: any;
  floatingWidget: any;
  appPublishing: any;
  appBackup: any;
  readerBlockchainActions: any;
  typingSound: any;

  // Bundled refs and editor state
  domRefs?: WorkspaceDOMRefs;
  editorState?: WorkspaceEditorState;

  // DOM Refs (optional when domRefs is provided)
  editorPaneRef?: React.RefObject<HTMLDivElement | null>;
  editorRef?: React.RefObject<HTMLTextAreaElement | null>;
  wysiwygRef?: React.RefObject<HTMLDivElement | null>;
  previewRef?: React.RefObject<HTMLDivElement | null>;
  previewPaneRef?: React.RefObject<HTMLDivElement | null>;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  isSyncingRef?: React.MutableRefObject<boolean>;
  wysiwygLocalBackupTimeoutRef?: React.MutableRefObject<number | null>;
  wysiwygSyncTimeoutRef?: React.MutableRefObject<number | null>;
  lastSyncContentRef?: React.MutableRefObject<string>;

  // Viewport & Layout
  vvHeight: number;
  viewportHeight: number;
  offsetTop: number;
  keyboardOffset: number | null;
  isKeyboardOpen: boolean;
  performanceMode?: boolean;
  setPerformanceMode?: (val: boolean) => void;
  getMotionConfig: () => any;
  getSidebarMotionConfig: () => any;

  // State variables (optional when editorState is provided)
  lang: any;
  setLang: (lang: any) => void;
  t: (key: any) => string;
  pubTitle: string;
  setPubTitle: (t: string) => void;
  pubTags: string;
  setPubTags: (t: string) => void;
  splitWords?: number;
  setSplitWords?: (w: number) => void;
  activeMobileTab?: 'editor' | 'preview';
  setActiveMobileTab?: (tab: 'editor' | 'preview') => void;
  isEditorFocused?: boolean;
  setIsEditorFocused?: (focused: boolean) => void;
  isMiniGalleryOpen?: boolean;
  setIsMiniGalleryOpen?: (open: boolean) => void;
  justInsertedUrl?: string | null;
  setJustInsertedUrl?: (url: string | null) => void;
  onDemandSyncEnabled?: boolean;
  setOnDemandSyncEnabled?: any;
  syncScrollEnabled?: boolean;
  setSyncScrollEnabled?: any;
  isLivePreviewEnabled?: boolean;
  toggleLivePreview?: () => void;
  settingsTab?: any;
  setSettingsTab?: (tab: any) => void;
  beautifyEnabled?: boolean;
  setBeautifyEnabled?: any;
  isAudioPresetsModalOpen: boolean;
  setIsAudioPresetsModalOpen: (open: boolean) => void;
  isWidgetMenuOpen: boolean;
  setIsWidgetMenuOpen: (open: boolean) => void;
  isSMenuOpen?: boolean;
  setIsSMenuOpen?: (open: boolean) => void;
  targetReaderPost?: any;
  setTargetReaderPost?: (post: any) => void;
  showAccountPrompt: boolean;
  setShowAccountPrompt: (show: boolean) => void;
  autoInbox: boolean;
  handleSetAutoInbox: (auto: boolean) => void;
  pubLog: any;
  setPubLog: (log: any) => void;
  clearPubLogTimer: () => void;
  systemDialog: any;
  setSystemDialog: (d: any) => void;
  confirmDialog: any;
  promptDialog: any;
  notify: any;
  quickTags: any[];
  setQuickTags: any;
  pinTag: any;
  mentions?: any[];
  setMentions?: any;
  newMention?: string;
  setNewMention?: any;
  currentUser?: string;
  contentForPublish: string;
  setContent: (c: string) => void;
  getMarked: () => any;
  TOOLS_MAP: any;

  // Header & Mobile Tools State
  showLangMenu: boolean;
  setShowLangMenu: (show: boolean) => void;
  showMobileToolsOpen: boolean;
  setShowMobileToolsOpen: (open: boolean) => void;
  showMobileTools1: boolean;
  setShowMobileTools1: (open: boolean) => void;
  showMobileTools2: boolean;
  setShowMobileTools2: (open: boolean) => void;
}

export function useAppWorkspaceSuite(params: UseAppWorkspaceSuiteParams) {
  const {
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
  } = params;

  const editorPaneRef = (domRefs?.editorPaneRef ?? params.editorPaneRef)!;
  const editorRef = (domRefs?.editorRef ?? params.editorRef)!;
  const wysiwygRef = (domRefs?.wysiwygRef ?? params.wysiwygRef)!;
  const previewRef = (domRefs?.previewRef ?? params.previewRef)!;
  const previewPaneRef = (domRefs?.previewPaneRef ?? params.previewPaneRef)!;
  const fileInputRef = (domRefs?.fileInputRef ?? params.fileInputRef)!;
  const scrollRef = (domRefs?.scrollRef ?? params.scrollRef)!;
  const isSyncingRef = (domRefs?.isSyncingRef ?? params.isSyncingRef)!;
  const wysiwygLocalBackupTimeoutRef = (domRefs?.wysiwygLocalBackupTimeoutRef ?? params.wysiwygLocalBackupTimeoutRef)!;
  const wysiwygSyncTimeoutRef = (domRefs?.wysiwygSyncTimeoutRef ?? params.wysiwygSyncTimeoutRef)!;
  const lastSyncContentRef = (domRefs?.lastSyncContentRef ?? params.lastSyncContentRef)!;

  const performanceMode = editorState?.performanceMode ?? params.performanceMode ?? true;
  const setPerformanceMode = (editorState?.setPerformanceMode ?? params.setPerformanceMode)!;
  const splitWords = editorState?.splitWords ?? params.splitWords ?? 300;
  const setSplitWords = (editorState?.setSplitWords ?? params.setSplitWords)!;
  const activeMobileTab = (editorState?.activeMobileTab ?? params.activeMobileTab)!;
  const setActiveMobileTab = (editorState?.setActiveMobileTab ?? params.setActiveMobileTab)!;
  const isEditorFocused = editorState?.isEditorFocused ?? params.isEditorFocused ?? false;
  const setIsEditorFocused = (editorState?.setIsEditorFocused ?? params.setIsEditorFocused)!;
  const isMiniGalleryOpen = editorState?.isMiniGalleryOpen ?? params.isMiniGalleryOpen ?? false;
  const setIsMiniGalleryOpen = (editorState?.setIsMiniGalleryOpen ?? params.setIsMiniGalleryOpen)!;
  const justInsertedUrl = editorState?.justInsertedUrl ?? params.justInsertedUrl ?? null;
  const setJustInsertedUrl = (editorState?.setJustInsertedUrl ?? params.setJustInsertedUrl)!;
  const onDemandSyncEnabled = editorState?.onDemandSyncEnabled ?? params.onDemandSyncEnabled ?? false;
  const setOnDemandSyncEnabled = (editorState?.setOnDemandSyncEnabled ?? params.setOnDemandSyncEnabled)!;
  const syncScrollEnabled = editorState?.syncScrollEnabled ?? params.syncScrollEnabled ?? true;
  const setSyncScrollEnabled = (editorState?.setSyncScrollEnabled ?? params.setSyncScrollEnabled)!;
  const isLivePreviewEnabled = editorState?.isLivePreviewEnabled ?? params.isLivePreviewEnabled ?? false;
  const toggleLivePreview = (editorState?.toggleLivePreview ?? params.toggleLivePreview)!;
  const settingsTab = (editorState?.settingsTab ?? params.settingsTab)!;
  const setSettingsTab = (editorState?.setSettingsTab ?? params.setSettingsTab)!;
  const beautifyEnabled = editorState?.beautifyEnabled ?? params.beautifyEnabled ?? true;
  const setBeautifyEnabled = (editorState?.setBeautifyEnabled ?? params.setBeautifyEnabled)!;
  const isSMenuOpen = editorState?.isSMenuOpen ?? params.isSMenuOpen ?? false;
  const setIsSMenuOpen = (editorState?.setIsSMenuOpen ?? params.setIsSMenuOpen)!;
  const targetReaderPost = editorState?.targetReaderPost ?? params.targetReaderPost ?? null;
  const setTargetReaderPost = (editorState?.setTargetReaderPost ?? params.setTargetReaderPost)!;
  const mentions = editorState?.mentions ?? params.mentions ?? [];
  const setMentions = (editorState?.setMentions ?? params.setMentions)!;
  const newMention = editorState?.newMention ?? params.newMention ?? '';
  const setNewMention = (editorState?.setNewMention ?? params.setNewMention)!;
  const currentUser = editorState?.currentUser ?? params.currentUser ?? '';
  const editingPermlink = editorState?.editingPermlink ?? null;
  const setEditingPermlink = editorState?.setEditingPermlink;
  const editingOriginalTitle = editorState?.editingOriginalTitle ?? null;
  const setEditingOriginalTitle = editorState?.setEditingOriginalTitle;
  const showTableSelector = useModalStore((s) => s.isTableSelectorOpen);
  const setShowTableSelector = useModalStore((s) => s.setIsTableSelectorOpen);

  const {
    isDarkMode,
    setIsDarkMode,
    visualStyle,
    neonTextColored,
    setNeonTextColored,
    editorFontSize,
    setEditorFontSize,
    toolbarIconSize,
    setToolbarIconSize,
    wysiwygSpacing,
    setWysiwygSpacing,
    isSpacingMenuOpen,
    setIsSpacingMenuOpen,
  } = themeAndStyles;

  const {
    activeModal,
    setActiveModal,
    activeView,
    setActiveView,
    isSidebarOpen,
    setIsSidebarOpen,
    isFullScreen,
    isEditorFullScreen,
    toggleFullScreen,
    toggleEditorFullScreen,
    isTauriEnv,
    isNeutralinoEnv,
  } = appUI;

  const {
    drafts,
    templates,
    currentDraftId,
    setCurrentDraftId,
  } = draftsManager;

  const {
    saveDraft,
    handleEditPost,
  } = appPublishing;

  const {
    modeManager,
    wysiwygSync,
    editorFormat,
    editorEvents,
    tableOps,
    editorMode,
    fmt,
    fmtLine,
    handleIndent,
    handleLink,
    importTable,
    insertAtCursor,
    updateWysiwygEmptyStatus,
    tableSelectorPos,
    tableImportFormat,
    setTableImportFormat,
  } = editorCore;

  const {
    queue,
  } = publishingQueue;

  const {
    notifEnabled,
    setNotifEnabled,
    visibleNotifications,
    showNotificationList,
    setShowNotificationList,
    markAllAsRead,
    rawNotifications,
    mutedUsers,
    showNotificationPopup,
    setShowNotificationPopup,
    setNotifications,
    isPwaInstalled,
    handleInstallPwa,
  } = pwa;

  const {
    handleReaderVote,
    handleReaderComment,
    handleDeleteComment,
    handleUploadImageForReader,
    handleMuteUser,
  } = params.readerBlockchainActions;

  const {
    downloadFile,
  } = appBackup;

  const {
    imageUploadAccount,
    setImageUploadAccount,
    handleFileUpload,
  } = gallery;

  const {
    authType,
    username,
    setUsername,
    keychainAccounts,
    vaultAccounts,
    switchIdentity,
    addKeychainAccount,
    selectedVaultUser,
  } = auth;

  const {
    widgetPos,
  } = floatingWidget;

  const sidebarProps = useSidebarProps({
    gallery,
    auth,
    isSidebarOpen,
    setIsSidebarOpen,
    getSidebarMotionConfig,
    fileInputRef,
    performanceMode,
    setPerformanceMode,
    setActiveModal,
    notify,
    t,
  });

  const editorPaneProps = useEditorPaneProps({
    modeManager,
    wysiwygSync,
    editorFormat,
    editorEvents,
    tableOps,
    floatingWidget,
    gallery,
    editorPaneRef,
    editorRef,
    wysiwygRef,
    isSyncingRef,
    wysiwygLocalBackupTimeoutRef,
    wysiwygSyncTimeoutRef,
    lastSyncContentRef,
    fileInputRef,
    scrollRef,
    isEditorFullScreen,
    isFullScreen,
    vvHeight,
    viewportHeight,
    offsetTop,
    activeMobileTab,
    visualStyle,
    isDarkMode,
    typingSound,
    onOpenAudioPresetsModal: () => setIsAudioPresetsModalOpen(true),
    isLivePreviewEnabled,
    onDemandSyncEnabled,
    beautifyEnabled,
    neonTextColored,
    isSpacingMenuOpen,
    wysiwygSpacing,
    editorFontSize,
    toolbarIconSize,
    keyboardOffset,
    performanceMode,
    isKeyboardOpen,
    isSidebarOpen,
    isWidgetMenuOpen,
    setIsWidgetMenuOpen,
    lang,
    pubTitle,
    setPubTitle,
    pubTags,
    setPubTags,
    drafts,
    saveDraft,
    toggleEditorFullScreen,
    setOnDemandSyncEnabled,
    notify,
    toggleLivePreview,
    setBeautifyEnabled,
    setNeonTextColored,
    setIsSpacingMenuOpen,
    setWysiwygSpacing,
    setEditorFontSize,
    setToolbarIconSize,
    isMiniGalleryOpen,
    setIsMiniGalleryOpen,
    setJustInsertedUrl,
    justInsertedUrl,
    showMobileTools1,
    showMobileTools2,
    showMobileToolsOpen,
    setShowMobileTools1,
    setShowMobileTools2,
    setShowMobileToolsOpen,
    activeModal,
    setActiveModal,
    setSettingsTab,
    setIsEditorFocused,
    confirmDialog,
    TOOLS_MAP,
    t,
  });

  const modalsProps = useModalsProps({
    auth,
    postSettings,
    draftsManager,
    publishingQueue,
    publishingManager,
    tableOps,
    appBackup,
    gallery,
    pwa,
    themeAndStyles,
    appUI,
    floatingWidget,
    appPublishing,
    performanceMode,
    setPerformanceMode,
    notify,
    confirmDialog,
    promptDialog,
    lang,
    pubTitle,
    setPubTitle,
    pubTags,
    setPubTags,
    contentForPublish,
    mentions,
    pubLog,
    setPubLog,
    setContent,
    insertAtCursor,
    splitWords,
    setSplitWords,
    editorMode,
    wysiwygRef,
    isSyncingRef,
    getMarked,
    setMentions,
    newMention,
    setNewMention,
    isSMenuOpen,
    setIsSMenuOpen,
    beautifyEnabled,
    setBeautifyEnabled,
    settingsTab,
    setSettingsTab,
    setLang,
    syncScrollEnabled,
    setSyncScrollEnabled,
    appChangelog: APP_CHANGELOG,
    getChangelogText,
    quickTags,
    setQuickTags,
    pinTag,
    editingPermlink,
    setEditingPermlink,
    editingOriginalTitle,
    setEditingOriginalTitle,
    isPubTitleManuallyEdited: publishingSuite?.isPubTitleManuallyEdited ?? false,
    setIsPubTitleManuallyEdited: publishingSuite?.setIsPubTitleManuallyEdited,
    allowTitleChangeInEdit: publishingSuite?.allowTitleChangeInEdit ?? false,
    setAllowTitleChangeInEdit: publishingSuite?.setAllowTitleChangeInEdit,
    t,
  });

  const headerProps: HeaderProps = {
    setIsSMenuOpen,
    visualStyle,
    activeView,
    setActiveView,
    editorMode,
    toolsMap: TOOLS_MAP,
    activeFormats: editorCore.activeFormats,
    fmt,
    fmtLine,
    handleIndent,
    handleLink,
    importTable,
    saveDraft,
    downloadFile,
    insertAtCursor,
    templates,
    mentions,
    queue,
    setPubTitle,
    setPubTags,
    setCurrentDraftId,
    notifEnabled,
    setNotifEnabled,
    visibleNotifications,
    showNotificationList,
    setShowNotificationList,
    markAllAsRead,
    setTargetReaderPost,
    lang,
    setLang,
    showLangMenu,
    setShowLangMenu,
    isDarkMode,
    setIsDarkMode,
    performanceMode,
    showMobileToolsOpen,
    setShowMobileToolsOpen,
    showMobileTools1,
    setShowMobileTools1,
    showMobileTools2,
    setShowMobileTools2,
    isPwaInstalled,
    handleInstallPwa,
    getMotionConfig,
    editorRef,
    wysiwygRef,
    isSyncingRef,
    getMarked,
    confirmDialog,
    updateWysiwygEmptyStatus,
    setSettingsTab,
    isTauriEnv,
    isNeutralinoEnv,
    editingPermlink,
    setEditingPermlink,
    setEditingOriginalTitle,
    setIsPubTitleManuallyEdited: publishingSuite?.setIsPubTitleManuallyEdited,
    setAllowTitleChangeInEdit: publishingSuite?.setAllowTitleChangeInEdit,
    notify,
    t,
  };

  const readerProps: Omit<ReaderScreenProps, 'isVisible'> = {
    lang,
    t,
    editorFontSize,
    setEditorFontSize,
    onEditPost: handleEditPost,
    onVote: handleReaderVote,
    onComment: handleReaderComment,
    onDeleteComment: handleDeleteComment,
    onUploadImage: handleUploadImageForReader,
    onUserUpdate: (u) => setUsername(u),
    currentUser,
    onMuteUser: handleMuteUser,
    mutedUsers: mutedUsers || [],
    targetReaderPost,
    rawInboxData: rawNotifications,
    authType,
    keychainAccounts,
    vaultAccounts,
    onSelectAccount: (user, type) => {
      switchIdentity(user, type);
      if (type === 'VAULT') {
        setImageUploadAccount(user);
      } else {
        setImageUploadAccount('');
      }
    },
    onAddKeychainAccount: addKeychainAccount,
    onOpenVaultManager: () => setActiveModal('keys'),
    selectedVaultUser,
  };

  const editorProps: Omit<EditorScreenProps, 'isVisible'> = {
    sidebarProps,
    editorPaneProps,
    isEditorFullScreen,
    isFullScreen,
    visualStyle,
    isDarkMode,
    editorMode,
    previewRef,
    previewPaneRef,
    activeMobileTab,
    setActiveMobileTab,
    isLivePreviewEnabled,
    toggleLivePreview,
    syncScrollEnabled,
    setSyncScrollEnabled,
    toggleFullScreen,
    widgetPos,
    lang,
    pubTitle,
    setPubTitle,
    activeModal,
    setActiveModal,
    isSidebarOpen,
    setIsSidebarOpen,
    setSettingsTab,
    isKeyboardOpen,
    fileInputRef,
    handleFileUpload,
    t,
  };

  const modalsHostProps: AppModalsHostProps = {
    modalsProps,
    showAccountPrompt,
    setShowAccountPrompt,
    username,
    setUsername,
    autoInbox,
    setAutoInbox: handleSetAutoInbox,
    pubLog,
    setPubLog,
    clearPubLogTimer,
    showNotificationPopup,
    setShowNotificationPopup,
    setActiveView,
    setNotifications,
    setTargetReaderPost,
    showTableSelector,
    setShowTableSelector,
    tableSelectorPos,
    tableImportFormat,
    setTableImportFormat,
    insertAtCursor,
    isAudioPresetsModalOpen,
    setIsAudioPresetsModalOpen,
    typingSound,
    systemDialog,
    setSystemDialog,
    t,
  };

  return {
    headerProps,
    readerProps,
    editorProps,
    modalsHostProps,
    visualStyle,
    neonTextColored,
    isDarkMode,
  };
}
