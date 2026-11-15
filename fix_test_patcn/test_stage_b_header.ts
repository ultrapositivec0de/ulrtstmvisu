import { HeaderProps } from '../src/components/header/Header';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Stage B: Header Props Decoupling & Optional Facades...\n');

// 1. Verify HeaderProps typing permits omission of store-backed props
const minimalProps: HeaderProps = {
  visualStyle: 'neon',
  editorMode: 'visual',
  fmt: () => {},
  fmtLine: () => {},
  handleIndent: () => {},
  handleLink: () => {},
  importTable: () => {},
  saveDraft: () => {},
  downloadFile: () => {},
  insertAtCursor: () => {},
  templates: [],
  mentions: [],
  queue: [],
  setPubTitle: () => {},
  setPubTags: () => {},
  setCurrentDraftId: () => {},
  notifEnabled: false,
  setNotifEnabled: () => {},
  visibleNotifications: [],
  showNotificationList: false,
  setShowNotificationList: () => {},
  markAllAsRead: () => {},
  setTargetReaderPost: () => {},
  lang: 'uk',
  setLang: () => {},
  showLangMenu: false,
  setShowLangMenu: () => {},
  isDarkMode: true,
  setIsDarkMode: () => {},
  performanceMode: false,
  showMobileToolsOpen: false,
  setShowMobileToolsOpen: () => {},
  showMobileTools1: false,
  setShowMobileTools1: () => {},
  showMobileTools2: false,
  setShowMobileTools2: () => {},
  isPwaInstalled: false,
  handleInstallPwa: () => {},
  getMotionConfig: () => ({}),
  editorRef: { current: null },
  wysiwygRef: { current: null },
  isSyncingRef: { current: false },
  getMarked: () => null,
  confirmDialog: async () => true,
  updateWysiwygEmptyStatus: () => {},
  isTauriEnv: () => false,
  isNeutralinoEnv: () => false,
  t: (k: any) => String(k),
  // Note: setIsSMenuOpen, activeFormats, setActiveModal, setSettingsTab, setContent, activeView, setActiveView are omitted
};

assert(minimalProps.visualStyle === 'neon', 'visualStyle is valid');
assert(minimalProps.setIsSMenuOpen === undefined, 'setIsSMenuOpen is optional');
assert(minimalProps.setActiveModal === undefined, 'setActiveModal is optional');
assert(minimalProps.setSettingsTab === undefined, 'setSettingsTab is optional');

console.log('\nStage B test validation passed successfully!');
