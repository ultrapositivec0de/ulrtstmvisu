import { useMemo } from 'react';
import { type AppModalsProps } from '../components/modals/AppModals';

export type BuildModalsPropsInput = AppModalsProps;

export interface CompositeModalsPropsInput {
  // Domain Packages
  auth: {
    vaultPin: string;
    setVaultPin: (pin: string) => void;
    initVault: (pin?: string) => any;
    username: string;
    setUsername: (u: string) => void;
    isVaultInitialized: boolean;
    isUnlocked: boolean;
    vaultAccounts: any[];
    pexelsApiKey: string | null;
    setPexelsApiKey: (k: string | null) => void;
    pixabayApiKey: string | null;
    setPixabayApiKey: (k: string | null) => void;
    unsplashAccessKey: string | null;
    setUnsplashAccessKey: (k: string | null) => void;
    authType: any;
    setAuthType: (a: any) => void;
    selectedVaultUser: string;
    setSelectedVaultUser: (u: string) => void;
    keychainAccounts?: string[];
    addKeychainAccount?: (acc: string) => void;
    removeKeychainAccount?: (acc: string) => void;
    switchIdentity?: (user: string, type: 'KEYCHAIN' | 'VAULT') => void;
  };
  postSettings: {
    rewardType: any;
    setRewardType: (r: any) => void;
    removeTitleLine: boolean;
    setRemoveTitleLine: (r: boolean) => void;
    beneficiaries: any[];
    setBeneficiaries: (b: any[]) => void;
    benName: any;
    setBenName: (n: any) => void;
    benWeight: any;
    setBenWeight: (w: any) => void;
    showAdvancedPublish: boolean;
    setShowAdvancedPublish: (s: boolean) => void;
    showAdvancedSettings: boolean;
    setShowAdvancedSettings: (s: boolean) => void;
    tagGroups: any[];
    setTagGroups: (tg: any) => void;
    appAgent: string;
    setAppAgent: (agent: string) => void;
  };
  draftsManager: {
    currentDraftId: string | null;
    setCurrentDraftId: (id: string | null) => void;
    drafts: any[];
    deleteDraft: (id: string) => void;
    toggleDraftStatus: (id: string) => void;
    templates: any[];
    setTemplates: (t: any) => void;
  };
  publishingQueue: {
    queue: any[];
    setQueue: (q: any) => void;
    scheduledTime: string;
    setScheduledTime: (t: string) => void;
    publishFromQueue: (item: any) => void;
    addToQueue?: (currentMarkdown?: any) => void;
  };
  publishingManager?: {
    extractMentions?: (text: string) => string[];
    handleSplitPost?: () => void;
    handlePublish?: () => void;
    handleAddToQueue?: () => void;
  };
  tableOps: {
    tableImportText: string;
    setTableImportText: (t: string) => void;
    tableImportFormat: any;
    setTableImportFormat: (f: any) => void;
    processTableImport: () => void;
  };
  appBackup?: {
    handleClearCache?: () => void;
    handleExportBackup?: () => void;
    handleImportBackup?: (e: any) => void;
  };
  gallery: {
    images: any[];
    pexelsSettings?: any;
    setPexelsSettings?: (s: any) => void;
    imageInsertFormat?: any;
    setImageInsertFormat?: (f: any) => void;
    isTrafficOptimized?: boolean;
    setIsTrafficOptimized?: (opt: boolean) => void;
  };
  pwa?: {
    deferredPrompt?: any;
    isPwaInstalled?: boolean;
    showPwaBanner?: boolean;
    setShowPwaBanner?: (show: boolean) => void;
    showPwaInstructionsModal?: boolean;
    setShowPwaInstructionsModal?: (show: boolean) => void;
    handleInstallPwa?: () => void;
  };
  themeAndStyles?: {
    themeColor?: string;
    setThemeColor?: (color: string) => void;
    activeAssortment?: any[];
    editorFont?: string;
    setEditorFont?: (font: string) => void;
    fontOptions?: any[];
    isDarkMode?: boolean;
    setIsDarkMode?: (dark: boolean) => void;
    visualStyle?: any;
    setVisualStyle?: any;
    neonTextColored?: boolean;
    setNeonTextColored?: (n: boolean) => void;
    editorFontSize?: number;
    setEditorFontSize?: (s: number) => void;
    toolbarIconSize?: number;
    setToolbarIconSize?: (s: number) => void;
    uiScalePreset?: any;
    setUiScalePreset?: (preset: any) => void;
    applyUiScalePreset?: (preset: any) => void;
    headerIconSize?: number;
    setHeaderIconSize?: (size: number) => void;
    headerHeight?: number;
    setHeaderHeight?: (height: number) => void;
    headerHeightAuto?: boolean;
    setHeaderHeightAuto?: (auto: boolean) => void;
    galleryIconSize?: number;
    setGalleryIconSize?: (size: number) => void;
    wysiwygSpacing?: number;
    setWysiwygSpacing?: (s: number) => void;
  };
  appUI?: {
    activeModal?: string | null;
    setActiveModal?: (m: string | null) => void;
    isEditorFullScreen?: boolean;
    isFullScreen?: boolean;
    isTauriEnv?: () => boolean;
    isNeutralinoEnv?: () => boolean;
  };
  floatingWidget?: {
    widgetPos?: 'bottom' | 'floating' | 'hidden';
    setWidgetPos?: (pos: 'bottom' | 'floating' | 'hidden') => void;
  };
  appPublishing?: {
    toggleTag?: (tag: string) => void;
    addMention?: () => void;
  };

  // Additional application-level states or overrides
  activeModal?: string | null;
  setActiveModal?: (m: string | null) => void;
  performanceMode: boolean;
  setPerformanceMode: (p: boolean) => void;
  notify: (msg: string, type?: any) => void;
  confirmDialog: (opts: any) => Promise<boolean>;
  promptDialog: (opts: any) => Promise<string | null>;
  lang: string;
  pubTitle: string;
  setPubTitle: (t: string) => void;
  pubTags: string;
  setPubTags: any;
  contentForPublish: string;
  mentions: any[];
  extractMentions?: (text: string) => string[];
  addToQueue?: () => void;
  pubLog: { msg: string; type: any };
  setPubLog: (log: { msg: string; type: any }) => void;
  handlePublish?: () => void;
  setContent: (c: string) => void;
  insertAtCursor: (text: string, selectionMode?: 'end' | 'select') => void;
  toggleTag?: (tag: string) => void;
  splitWords: number;
  setSplitWords: (w: number) => void;
  handleSplitPost?: () => void;
  editorMode: string;
  wysiwygRef: React.RefObject<any>;
  isSyncingRef: React.MutableRefObject<boolean>;
  getMarked: () => any;
  exportBackup?: () => void;
  importBackup?: (e: any) => void;
  setMentions: (m: any) => void;
  newMention: string;
  setNewMention: (n: string) => void;
  addMention?: () => void;
  isSMenuOpen: boolean;
  setIsSMenuOpen: (open: boolean) => void;
  themeColor?: string;
  setThemeColor?: (color: string) => void;
  activeAssortment?: any[];
  editorFont?: string;
  setEditorFont?: (font: string) => void;
  fontOptions?: any[];
  beautifyEnabled: boolean;
  setBeautifyEnabled: (b: boolean) => void;
  isDarkMode?: boolean;
  setIsDarkMode?: (dark: boolean) => void;
  visualStyle?: any;
  setVisualStyle?: any;
  isPwaInstalled?: boolean;
  isTauriEnv?: () => boolean;
  isNeutralinoEnv?: () => boolean;
  handleInstallPwa?: () => void;
  setSettingsTab: (tab: any) => void;
  appAgent?: string;
  setAppAgent?: (agent: string) => void;
  appChangelog: any[];
  getChangelogText: () => string;
  settingsTab: any;
  setLang: (l: string) => void;
  neonTextColored?: boolean;
  setNeonTextColored?: (n: boolean) => void;
  editorFontSize?: number;
  setEditorFontSize?: (s: number) => void;
  toolbarIconSize?: number;
  setToolbarIconSize?: (s: number) => void;
  uiScalePreset?: any;
  setUiScalePreset?: (preset: any) => void;
  applyUiScalePreset?: (preset: any) => void;
  headerIconSize?: number;
  setHeaderIconSize?: (size: number) => void;
  headerHeight?: number;
  setHeaderHeight?: (height: number) => void;
  headerHeightAuto?: boolean;
  setHeaderHeightAuto?: (auto: boolean) => void;
  galleryIconSize?: number;
  setGalleryIconSize?: (size: number) => void;
  wysiwygSpacing?: number;
  setWysiwygSpacing?: (s: number) => void;
  widgetPos?: 'bottom' | 'floating' | 'hidden';
  setWidgetPos?: (pos: 'bottom' | 'floating' | 'hidden') => void;
  isTrafficOptimized?: boolean;
  setIsTrafficOptimized?: (opt: boolean) => void;
  syncScrollEnabled: boolean;
  setSyncScrollEnabled: (s: boolean) => void;
  showAdvancedSettings?: boolean;
  setShowAdvancedSettings?: (s: boolean) => void;
  imageInsertFormat?: any;
  setImageInsertFormat?: (f: any) => void;
  pexelsSettings?: any;
  setPexelsSettings?: (s: any) => void;
  images?: any[];
  handleClearCache?: () => void;
  showPwaBanner?: boolean;
  setShowPwaBanner?: (show: boolean) => void;
  isEditorFullScreen?: boolean;
  isFullScreen?: boolean;
  showPwaInstructionsModal?: boolean;
  setShowPwaInstructionsModal?: (show: boolean) => void;
  deferredPrompt?: any;
  quickTags: string[];
  setQuickTags: (tags: string[]) => void;
  pinTag: (tag: string) => void;
  editingPermlink?: string | null;
  setEditingPermlink?: (p: string | null) => void;
  editingOriginalTitle?: string | null;
  setEditingOriginalTitle?: (t: string | null) => void;
  isPubTitleManuallyEdited?: boolean;
  setIsPubTitleManuallyEdited?: (v: boolean) => void;
  allowTitleChangeInEdit?: boolean;
  setAllowTitleChangeInEdit?: (v: boolean) => void;
  t: (key: any) => string;
}

export function isCompositeModalsPropsInput(
  input: BuildModalsPropsInput | CompositeModalsPropsInput
): input is CompositeModalsPropsInput {
  return 'postSettings' in input && 'draftsManager' in input;
}

/**
 * buildModalsProps:
 * Pure utility function to assemble and validate AppModalsProps without hook requirements.
 * Accepts either traditional flat props or structured domain packages.
 */
export function buildModalsProps(props: BuildModalsPropsInput | CompositeModalsPropsInput): AppModalsProps {
  if (isCompositeModalsPropsInput(props)) {
    const {
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
      ...rest
    } = props;

    return {
      activeModal: rest.activeModal ?? appUI?.activeModal ?? null,
      setActiveModal: rest.setActiveModal ?? appUI?.setActiveModal ?? (() => {}),
      vaultPin: auth.vaultPin,
      setVaultPin: auth.setVaultPin,
      initVault: auth.initVault,
      username: auth.username,
      setUsername: auth.setUsername,
      isVaultInitialized: auth.isVaultInitialized,
      isUnlocked: auth.isUnlocked,
      vaultAccounts: auth.vaultAccounts,
      pexelsApiKey: auth.pexelsApiKey,
      setPexelsApiKey: auth.setPexelsApiKey,
      pixabayApiKey: auth.pixabayApiKey,
      setPixabayApiKey: auth.setPixabayApiKey,
      unsplashAccessKey: auth.unsplashAccessKey,
      setUnsplashAccessKey: auth.setUnsplashAccessKey,
      performanceMode: rest.performanceMode,
      setPerformanceMode: rest.setPerformanceMode,
      notify: rest.notify,
      confirmDialog: rest.confirmDialog,
      promptDialog: rest.promptDialog,
      lang: rest.lang,
      authType: auth.authType,
      setAuthType: auth.setAuthType,
      selectedVaultUser: auth.selectedVaultUser,
      setSelectedVaultUser: auth.setSelectedVaultUser,
      keychainAccounts: auth.keychainAccounts,
      addKeychainAccount: auth.addKeychainAccount,
      removeKeychainAccount: auth.removeKeychainAccount,
      switchIdentity: auth.switchIdentity,
      pubTitle: rest.pubTitle,
      setPubTitle: rest.setPubTitle,
      pubTags: rest.pubTags,
      setPubTags: rest.setPubTags,
      rewardType: postSettings.rewardType,
      setRewardType: postSettings.setRewardType,
      removeTitleLine: postSettings.removeTitleLine,
      setRemoveTitleLine: postSettings.setRemoveTitleLine,
      beneficiaries: postSettings.beneficiaries,
      setBeneficiaries: postSettings.setBeneficiaries,
      benName: postSettings.benName,
      setBenName: postSettings.setBenName,
      benWeight: postSettings.benWeight,
      setBenWeight: postSettings.setBenWeight,
      showAdvancedPublish: postSettings.showAdvancedPublish,
      setShowAdvancedPublish: postSettings.setShowAdvancedPublish,
      scheduledTime: publishingQueue.scheduledTime,
      setScheduledTime: publishingQueue.setScheduledTime,
      contentForPublish: rest.contentForPublish,
      mentions: rest.mentions,
      extractMentions: rest.extractMentions ?? publishingManager?.extractMentions ?? ((t: string) => []),
      addToQueue: rest.addToQueue ?? publishingManager?.handleAddToQueue ?? publishingQueue.addToQueue ?? (() => {}),
      pubLog: rest.pubLog,
      setPubLog: rest.setPubLog,
      handlePublish: rest.handlePublish ?? publishingManager?.handlePublish ?? (() => {}),
      tagGroups: postSettings.tagGroups,
      templates: draftsManager.templates,
      setTemplates: draftsManager.setTemplates,
      setContent: rest.setContent,
      insertAtCursor: rest.insertAtCursor,
      toggleTag: rest.toggleTag ?? appPublishing?.toggleTag ?? (() => {}),
      splitWords: rest.splitWords,
      setSplitWords: rest.setSplitWords,
      handleSplitPost: rest.handleSplitPost ?? publishingManager?.handleSplitPost ?? (() => {}),
      currentDraftId: draftsManager.currentDraftId,
      setCurrentDraftId: draftsManager.setCurrentDraftId,
      editorMode: rest.editorMode,
      wysiwygRef: rest.wysiwygRef,
      isSyncingRef: rest.isSyncingRef,
      getMarked: rest.getMarked,
      exportBackup: rest.exportBackup ?? appBackup?.handleExportBackup ?? (() => {}),
      importBackup: rest.importBackup ?? appBackup?.handleImportBackup ?? (() => {}),
      drafts: draftsManager.drafts,
      deleteDraft: draftsManager.deleteDraft,
      toggleDraftStatus: draftsManager.toggleDraftStatus,
      setMentions: rest.setMentions,
      newMention: rest.newMention,
      setNewMention: rest.setNewMention,
      addMention: rest.addMention ?? appPublishing?.addMention ?? (() => {}),
      isSMenuOpen: rest.isSMenuOpen,
      setIsSMenuOpen: rest.setIsSMenuOpen,
      themeColor: rest.themeColor ?? themeAndStyles?.themeColor ?? 'steem',
      setThemeColor: rest.setThemeColor ?? themeAndStyles?.setThemeColor ?? (() => {}),
      activeAssortment: rest.activeAssortment ?? themeAndStyles?.activeAssortment ?? [],
      editorFont: rest.editorFont ?? themeAndStyles?.editorFont ?? 'sans',
      setEditorFont: rest.setEditorFont ?? themeAndStyles?.setEditorFont ?? (() => {}),
      fontOptions: rest.fontOptions ?? themeAndStyles?.fontOptions ?? [],
      beautifyEnabled: rest.beautifyEnabled,
      setBeautifyEnabled: rest.setBeautifyEnabled,
      isDarkMode: rest.isDarkMode ?? themeAndStyles?.isDarkMode ?? true,
      setIsDarkMode: rest.setIsDarkMode ?? themeAndStyles?.setIsDarkMode ?? (() => {}),
      visualStyle: rest.visualStyle ?? themeAndStyles?.visualStyle ?? 'neon',
      setVisualStyle: rest.setVisualStyle ?? themeAndStyles?.setVisualStyle ?? (() => {}),
      isPwaInstalled: rest.isPwaInstalled ?? pwa?.isPwaInstalled ?? false,
      isTauriEnv: rest.isTauriEnv ?? appUI?.isTauriEnv ?? (() => false),
      isNeutralinoEnv: rest.isNeutralinoEnv ?? appUI?.isNeutralinoEnv ?? (() => false),
      handleInstallPwa: rest.handleInstallPwa ?? pwa?.handleInstallPwa ?? (() => {}),
      setSettingsTab: rest.setSettingsTab,
      appAgent: rest.appAgent ?? postSettings.appAgent,
      setAppAgent: rest.setAppAgent ?? postSettings.setAppAgent,
      appChangelog: rest.appChangelog,
      getChangelogText: rest.getChangelogText,
      setTagGroups: postSettings.setTagGroups,
      queue: publishingQueue.queue,
      setQueue: publishingQueue.setQueue,
      publishFromQueue: publishingQueue.publishFromQueue,
      tableImportText: tableOps.tableImportText,
      setTableImportText: tableOps.setTableImportText,
      tableImportFormat: tableOps.tableImportFormat,
      setTableImportFormat: tableOps.setTableImportFormat,
      processTableImport: tableOps.processTableImport,
      settingsTab: rest.settingsTab,
      setLang: rest.setLang,
      neonTextColored: rest.neonTextColored ?? themeAndStyles?.neonTextColored ?? true,
      setNeonTextColored: rest.setNeonTextColored ?? themeAndStyles?.setNeonTextColored ?? (() => {}),
      editorFontSize: rest.editorFontSize ?? themeAndStyles?.editorFontSize ?? 16,
      setEditorFontSize: rest.setEditorFontSize ?? themeAndStyles?.setEditorFontSize ?? (() => {}),
      toolbarIconSize: rest.toolbarIconSize ?? themeAndStyles?.toolbarIconSize ?? 20,
      setToolbarIconSize: rest.setToolbarIconSize ?? themeAndStyles?.setToolbarIconSize ?? (() => {}),
      uiScalePreset: rest.uiScalePreset ?? themeAndStyles?.uiScalePreset,
      setUiScalePreset: rest.setUiScalePreset ?? themeAndStyles?.setUiScalePreset,
      applyUiScalePreset: rest.applyUiScalePreset ?? themeAndStyles?.applyUiScalePreset,
      headerIconSize: rest.headerIconSize ?? themeAndStyles?.headerIconSize,
      setHeaderIconSize: rest.setHeaderIconSize ?? themeAndStyles?.setHeaderIconSize,
      headerHeight: rest.headerHeight ?? themeAndStyles?.headerHeight,
      setHeaderHeight: rest.setHeaderHeight ?? themeAndStyles?.setHeaderHeight,
      headerHeightAuto: rest.headerHeightAuto ?? themeAndStyles?.headerHeightAuto,
      setHeaderHeightAuto: rest.setHeaderHeightAuto ?? themeAndStyles?.setHeaderHeightAuto,
      galleryIconSize: rest.galleryIconSize ?? themeAndStyles?.galleryIconSize,
      setGalleryIconSize: rest.setGalleryIconSize ?? themeAndStyles?.setGalleryIconSize,
      wysiwygSpacing: rest.wysiwygSpacing ?? themeAndStyles?.wysiwygSpacing ?? 1.5,
      setWysiwygSpacing: rest.setWysiwygSpacing ?? themeAndStyles?.setWysiwygSpacing ?? (() => {}),
      widgetPos: rest.widgetPos ?? floatingWidget?.widgetPos ?? 'bottom',
      setWidgetPos: rest.setWidgetPos ?? floatingWidget?.setWidgetPos ?? (() => {}),
      isTrafficOptimized: rest.isTrafficOptimized ?? gallery.isTrafficOptimized ?? false,
      setIsTrafficOptimized: rest.setIsTrafficOptimized ?? gallery.setIsTrafficOptimized ?? (() => {}),
      syncScrollEnabled: rest.syncScrollEnabled,
      setSyncScrollEnabled: rest.setSyncScrollEnabled,
      showAdvancedSettings: rest.showAdvancedSettings ?? postSettings.showAdvancedSettings,
      setShowAdvancedSettings: rest.setShowAdvancedSettings ?? postSettings.setShowAdvancedSettings,
      imageInsertFormat: rest.imageInsertFormat ?? gallery.imageInsertFormat,
      setImageInsertFormat: rest.setImageInsertFormat ?? gallery.setImageInsertFormat ?? (() => {}),
      pexelsSettings: rest.pexelsSettings ?? gallery.pexelsSettings,
      setPexelsSettings: rest.setPexelsSettings ?? gallery.setPexelsSettings ?? (() => {}),
      images: rest.images ?? gallery.images,
      handleClearCache: rest.handleClearCache ?? appBackup?.handleClearCache ?? (() => {}),
      showPwaBanner: rest.showPwaBanner ?? pwa?.showPwaBanner ?? false,
      setShowPwaBanner: rest.setShowPwaBanner ?? pwa?.setShowPwaBanner ?? (() => {}),
      isEditorFullScreen: rest.isEditorFullScreen ?? appUI?.isEditorFullScreen ?? false,
      isFullScreen: rest.isFullScreen ?? appUI?.isFullScreen ?? false,
      showPwaInstructionsModal: rest.showPwaInstructionsModal ?? pwa?.showPwaInstructionsModal ?? false,
      setShowPwaInstructionsModal: rest.setShowPwaInstructionsModal ?? pwa?.setShowPwaInstructionsModal ?? (() => {}),
      deferredPrompt: rest.deferredPrompt ?? pwa?.deferredPrompt ?? null,
      quickTags: rest.quickTags,
      setQuickTags: rest.setQuickTags,
      pinTag: rest.pinTag,
      editingPermlink: rest.editingPermlink ?? null,
      setEditingPermlink: rest.setEditingPermlink,
      editingOriginalTitle: rest.editingOriginalTitle ?? null,
      setEditingOriginalTitle: rest.setEditingOriginalTitle,
      isPubTitleManuallyEdited: rest.isPubTitleManuallyEdited ?? false,
      setIsPubTitleManuallyEdited: rest.setIsPubTitleManuallyEdited,
      allowTitleChangeInEdit: rest.allowTitleChangeInEdit ?? false,
      setAllowTitleChangeInEdit: rest.setAllowTitleChangeInEdit,
      t: rest.t,
    };
  }

  return props;
}

/**
 * useModalsProps:
 * Encapsulates the aggregation and memoization of AppModalsProps outside of App.tsx,
 * safely removing 160+ lines of monolithic prop definitions from the root application component.
 */
export function useModalsProps(props: BuildModalsPropsInput | CompositeModalsPropsInput): AppModalsProps {
  return useMemo(() => buildModalsProps(props), [props]);
}
