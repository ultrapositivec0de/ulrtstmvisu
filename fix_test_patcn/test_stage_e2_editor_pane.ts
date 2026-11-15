import { buildEditorPaneProps } from '../src/hooks/useEditorPaneProps';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Step E.2: Composite useEditorPaneProps Input...\n');

const mockModeManager: any = {
  editorMode: 'visual',
  handleSetEditorMode: () => {},
  saveCursorPosition: () => {},
};

const mockWysiwygSync: any = {
  updateContentFromWysiwyg: () => {},
  saveVisualSelection: () => {},
  updateWysiwygEmptyStatus: () => {},
};

const mockEditorFormat: any = {
  activeFormats: { bold: true },
  insertHtmlAtCursor: () => {},
  insertAtCursor: () => {},
  fmt: () => {},
  fmtLine: () => {},
  handleIndent: () => {},
  handleLink: () => {},
};

const mockEditorEvents: any = {
  handleEditorKeyDown: () => {},
  handleEditorScroll: () => {},
  handleWysiwygBeforeInput: () => {},
  handleWysiwygKeyDown: () => {},
  scrollCaretIntoView: () => {},
};

const mockTableOps: any = {
  activeTable: null,
  tableRect: null,
  isTableMenuExpanded: false,
  isTableMenuPinned: false,
  setIsTableMenuExpanded: () => {},
  setIsTableMenuPinned: () => {},
  deleteActiveTableRow: () => {},
  deleteActiveTableCol: () => {},
  deleteActiveTable: () => {},
  importTable: () => {},
};

const mockFloatingWidget: any = {
  widgetPos: 'bottom',
  isWidgetVisible: true,
  isWidgetMenuOpen: false,
  widgetNoBorder: false,
  floatingPos: { x: 0, y: 0 },
  widgetRef: { current: null },
  lockedToolsWidth: null,
  enabledTools: [],
  menuDirection: 'up',
  widgetOpacity: 1,
  setWidgetPos: () => {},
  setIsWidgetVisible: () => {},
  setIsWidgetMenuOpen: () => {},
  setLockedToolsWidth: () => {},
  setEnabledTools: () => {},
  setWidgetOpacity: () => {},
  setWidgetNoBorder: () => {},
  showWidget: () => {},
  handleWidgetAction: () => {},
  moveTool: () => {},
  toggleTool: () => {},
};

const mockGallery: any = {
  isGalleryCollapsed: false,
  images: [{ id: '1' }],
  insertImage: () => {},
};

const compositeInput = {
  modeManager: mockModeManager,
  wysiwygSync: mockWysiwygSync,
  editorFormat: mockEditorFormat,
  editorEvents: mockEditorEvents,
  tableOps: mockTableOps,
  floatingWidget: mockFloatingWidget,
  gallery: mockGallery,

  editorPaneRef: { current: null },
  editorRef: { current: null },
  wysiwygRef: { current: null },
  isSyncingRef: { current: false },
  wysiwygLocalBackupTimeoutRef: { current: null },
  wysiwygSyncTimeoutRef: { current: null },
  lastSyncContentRef: { current: '' },
  fileInputRef: { current: null },
  scrollRef: { current: null },

  isEditorFullScreen: false,
  isFullScreen: false,
  vvHeight: 800,
  viewportHeight: 800,
  offsetTop: 0,
  activeMobileTab: 'editor',
  visualStyle: 'neon',
  isDarkMode: true,
  onDemandSyncEnabled: false,
  neonTextColored: true,
  isSpacingMenuOpen: false,
  wysiwygSpacing: 1.5,
  editorFontSize: 16,
  toolbarIconSize: 20,
  keyboardOffset: null,
  performanceMode: false,
  isKeyboardOpen: false,
  isSidebarOpen: true,
  isWidgetMenuOpen: false,
  setIsWidgetMenuOpen: () => {},
  lang: 'uk',
  toggleEditorFullScreen: () => {},
  setOnDemandSyncEnabled: () => {},
  notify: () => {},
  setNeonTextColored: () => {},
  setIsSpacingMenuOpen: () => {},
  setWysiwygSpacing: () => {},
  setEditorFontSize: () => {},
  setToolbarIconSize: () => {},
  setIsMiniGalleryOpen: () => {},
  setJustInsertedUrl: () => {},
  justInsertedUrl: null,
  showMobileTools1: false,
  showMobileTools2: false,
  showMobileToolsOpen: false,
  setShowMobileTools1: () => {},
  setShowMobileTools2: () => {},
  setShowMobileToolsOpen: () => {},
  activeModal: null,
  setActiveModal: () => {},
  setSettingsTab: () => {},
  setIsEditorFocused: () => {},
  confirmDialog: async () => true,
  TOOLS_MAP: {},
  t: (k: any) => String(k),
};

const result = buildEditorPaneProps(compositeInput as any);

assert(result.editorMode === 'visual', 'modeManager.editorMode mapped correctly');
assert(result.activeFormats.bold === true, 'editorFormat.activeFormats mapped correctly');
assert(result.widgetPos === 'bottom', 'floatingWidget.widgetPos mapped correctly');
assert(result.images.length === 1, 'gallery.images mapped correctly');
assert(typeof result.handleEditorKeyDown === 'function', 'editorEvents handler mapped correctly');

console.log('\nStep E.2 test passed successfully!');
