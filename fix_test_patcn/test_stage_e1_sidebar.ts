import { buildSidebarProps, useSidebarProps } from '../src/hooks/useSidebarProps';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Step E.1: Composite useSidebarProps Input...\n');

const mockAuth: any = {
  username: 'steemuser',
  vaultAccounts: ['steemuser'],
  selectedVaultUser: 'steemuser',
  authType: 'VAULT',
  keychainAccounts: [],
  switchIdentity: () => {},
  addKeychainAccount: () => {},
  pexelsApiKey: 'key1',
  pixabayApiKey: null,
  unsplashAccessKey: null,
};

const mockGallery: any = {
  isGalleryCollapsed: true,
  setIsGalleryCollapsed: () => {},
  imageUploadAccount: 'steemuser',
  setImageUploadAccount: () => {},
  galleryMode: 'local',
  toggleGalleryMode: () => {},
  galleryView: 'grid',
  setGalleryView: () => {},
  gallerySearch: '',
  setGallerySearch: () => {},
  filteredLocalImages: [],
  images: [{ id: '1', name: 'img1.png', url: 'https://test.com/img1.png' }],
  setImages: () => {},
  toggleImageSelection: () => {},
  moveImageLocal: () => {},
  insertImage: () => {},
  insertExternalImage: () => {},
  uploadExternalImage: async () => {},
  insertGrid: () => {},
  isSearchingPexels: false,
  pexelsResults: [],
  setPexelsResults: () => {},
  pexelsPage: 1,
  handleExternalSearch: () => {},
  isTrafficOptimized: true,
  setIsTrafficOptimized: () => {},
  pexelsSettings: {},
  setPexelsSettings: () => {},
  isGallerySettingsCollapsed: true,
  setIsGallerySettingsCollapsed: () => {},
  gridLayout: 'col',
  setGridLayout: () => {},
  gridWithCaptions: false,
  setGridWithCaptions: () => {},
  singleCaptionAlign: 'center',
  setSingleCaptionAlign: () => {},
  isTextWrapEnabled: false,
  setIsTextWrapEnabled: () => {},
  isExifEnabled: false,
  setIsExifEnabled: () => {},
  imageInsertFormat: 'markdown',
  setImageInsertFormat: () => {},
  isUploading: false,
  sourceInput: '',
  setSourceInput: () => {},
  parseImages: () => {},
};

const compositeInput = {
  gallery: mockGallery,
  auth: mockAuth,
  isSidebarOpen: true,
  setIsSidebarOpen: () => {},
  getSidebarMotionConfig: () => ({}),
  fileInputRef: { current: null },
  performanceMode: false,
  setActiveModal: () => {},
  notify: () => {},
  t: (k: any) => String(k),
};

const sidebarProps = buildSidebarProps(compositeInput as any);

assert(sidebarProps.username === 'steemuser', 'auth.username mapped correctly');
assert(sidebarProps.images.length === 1, 'gallery.images mapped correctly');
assert(sidebarProps.isSidebarOpen === true, 'isSidebarOpen mapped correctly');
assert(sidebarProps.galleryMode === 'local', 'galleryMode mapped correctly');
assert(typeof sidebarProps.onSelectAccount === 'function', 'onSelectAccount handler created');

console.log('\nStep E.1 test passed successfully!');
