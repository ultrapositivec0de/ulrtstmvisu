import { buildModalsProps, type CompositeModalsPropsInput } from '../src/hooks/useModalsProps';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Step E.3: Composite useModalsProps Input...\n');

const mockAuth: any = {
  vaultPin: '1234',
  setVaultPin: () => {},
  initVault: () => {},
  username: 'alice',
  setUsername: () => {},
  isVaultInitialized: true,
  isUnlocked: true,
  vaultAccounts: ['alice'],
  pexelsApiKey: 'pexels123',
  setPexelsApiKey: () => {},
  pixabayApiKey: 'pixabay123',
  setPixabayApiKey: () => {},
  unsplashAccessKey: 'unsplash123',
  setUnsplashAccessKey: () => {},
  authType: 'VAULT',
  setAuthType: () => {},
  selectedVaultUser: 'alice',
  setSelectedVaultUser: () => {},
  keychainAccounts: ['alice_kc'],
  addKeychainAccount: () => {},
  removeKeychainAccount: () => {},
  switchIdentity: () => {},
};

const mockPostSettings: any = {
  rewardType: '50',
  setRewardType: () => {},
  removeTitleLine: false,
  setRemoveTitleLine: () => {},
  beneficiaries: [],
  setBeneficiaries: () => {},
  benName: '',
  setBenName: () => {},
  benWeight: 0,
  setBenWeight: () => {},
  showAdvancedPublish: true,
  setShowAdvancedPublish: () => {},
  showAdvancedSettings: false,
  setShowAdvancedSettings: () => {},
  tagGroups: [{ id: '1', name: 'crypto', tags: ['steem', 'crypto'] }],
  setTagGroups: () => {},
  appAgent: 'steem-pro/1.0',
  setAppAgent: () => {},
};

const mockDraftsManager: any = {
  currentDraftId: 'draft-99',
  setCurrentDraftId: () => {},
  drafts: [{ id: 'draft-99', title: 'Hello World' }],
  deleteDraft: () => {},
  toggleDraftStatus: () => {},
  templates: [{ id: 'tmpl-1', name: 'Daily' }],
  setTemplates: () => {},
};

const mockPublishingQueue: any = {
  queue: [{ id: 'q1' }],
  setQueue: () => {},
  scheduledTime: '2026-11-10T12:00:00Z',
  setScheduledTime: () => {},
  publishFromQueue: () => {},
  addToQueue: () => {},
};

const mockTableOps: any = {
  tableImportText: '| a | b |',
  setTableImportText: () => {},
  tableImportFormat: 'markdown',
  setTableImportFormat: () => {},
  processTableImport: () => {},
};

const mockAppBackup: any = {
  handleClearCache: () => {},
  handleExportBackup: () => {},
  handleImportBackup: () => {},
};

const mockGallery: any = {
  images: [{ id: 'img-1' }],
  pexelsSettings: { orientation: 'all' },
  setPexelsSettings: () => {},
  imageInsertFormat: 'markdown',
  setImageInsertFormat: () => {},
  isTrafficOptimized: true,
  setIsTrafficOptimized: () => {},
};

const mockPwa: any = {
  deferredPrompt: null,
  isPwaInstalled: true,
  showPwaBanner: false,
  setShowPwaBanner: () => {},
  showPwaInstructionsModal: false,
  setShowPwaInstructionsModal: () => {},
  handleInstallPwa: () => {},
};

const mockThemeAndStyles: any = {
  themeColor: 'emerald',
  setThemeColor: () => {},
  activeAssortment: ['theme-1'],
  editorFont: 'mono',
  setEditorFont: () => {},
  fontOptions: ['sans', 'mono'],
  isDarkMode: true,
  setIsDarkMode: () => {},
  visualStyle: 'cyber',
  setVisualStyle: () => {},
  neonTextColored: true,
  setNeonTextColored: () => {},
  editorFontSize: 18,
  setEditorFontSize: () => {},
  toolbarIconSize: 22,
  setToolbarIconSize: () => {},
  wysiwygSpacing: 1.75,
  setWysiwygSpacing: () => {},
};

const mockAppUI: any = {
  activeModal: 'publish',
  setActiveModal: () => {},
  isEditorFullScreen: false,
  isFullScreen: true,
  isTauriEnv: () => false,
  isNeutralinoEnv: () => false,
};

const mockFloatingWidget: any = {
  widgetPos: 'floating',
  setWidgetPos: () => {},
};

const mockPublishingManager: any = {
  extractMentions: () => ['alice'],
  handleSplitPost: () => {},
  handlePublish: () => {},
  handleAddToQueue: () => {},
};

const mockAppPublishing: any = {
  toggleTag: () => {},
  addMention: () => {},
};

const compositeInput: CompositeModalsPropsInput = {
  auth: mockAuth,
  postSettings: mockPostSettings,
  draftsManager: mockDraftsManager,
  publishingQueue: mockPublishingQueue,
  publishingManager: mockPublishingManager,
  tableOps: mockTableOps,
  appBackup: mockAppBackup,
  gallery: mockGallery,
  pwa: mockPwa,
  themeAndStyles: mockThemeAndStyles,
  appUI: mockAppUI,
  floatingWidget: mockFloatingWidget,
  appPublishing: mockAppPublishing,

  performanceMode: false,
  setPerformanceMode: () => {},
  notify: () => {},
  confirmDialog: async () => true,
  promptDialog: async () => 'test',
  lang: 'uk',
  pubTitle: 'My Title',
  setPubTitle: () => {},
  pubTags: 'steem test',
  setPubTags: () => {},
  contentForPublish: 'Post Body',
  mentions: [],
  pubLog: { msg: '', type: 'info' },
  setPubLog: () => {},
  setContent: () => {},
  insertAtCursor: () => {},
  splitWords: 300,
  setSplitWords: () => {},
  editorMode: 'visual',
  wysiwygRef: { current: null },
  isSyncingRef: { current: false },
  getMarked: () => ({}),
  setMentions: () => {},
  newMention: '',
  setNewMention: () => {},
  isSMenuOpen: false,
  setIsSMenuOpen: () => {},
  beautifyEnabled: true,
  setBeautifyEnabled: () => {},
  settingsTab: 'general',
  setSettingsTab: () => {},
  setLang: () => {},
  syncScrollEnabled: true,
  setSyncScrollEnabled: () => {},
  appChangelog: [],
  getChangelogText: () => '',
  quickTags: ['tag1'],
  setQuickTags: () => {},
  pinTag: () => {},
  t: (k: any) => String(k),
};

const result = buildModalsProps(compositeInput);

assert(result.username === 'alice', 'auth.username mapped correctly');
assert(result.vaultPin === '1234', 'auth.vaultPin mapped correctly');
assert(result.rewardType === '50', 'postSettings.rewardType mapped correctly');
assert(result.appAgent === 'steem-pro/1.0', 'postSettings.appAgent mapped correctly');
assert(result.currentDraftId === 'draft-99', 'draftsManager.currentDraftId mapped correctly');
assert(result.tableImportText === '| a | b |', 'tableOps.tableImportText mapped correctly');
assert(result.themeColor === 'emerald', 'themeAndStyles.themeColor mapped correctly');
assert(result.widgetPos === 'floating', 'floatingWidget.widgetPos mapped correctly');
assert(result.isPwaInstalled === true, 'pwa.isPwaInstalled mapped correctly');
assert(result.activeModal === 'publish', 'appUI.activeModal mapped correctly');
assert(result.images.length === 1, 'gallery.images mapped correctly');
assert(typeof result.handlePublish === 'function', 'handlePublish mapped correctly');
assert(typeof result.exportBackup === 'function', 'exportBackup mapped correctly');

console.log('\nStep E.3 test passed successfully!');
