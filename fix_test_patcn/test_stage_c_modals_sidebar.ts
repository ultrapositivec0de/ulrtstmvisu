import { buildSidebarProps, useSidebarProps } from '../src/hooks/useSidebarProps';
import { buildModalsProps, useModalsProps } from '../src/hooks/useModalsProps';
import { type SidebarProps } from '../src/components/sidebar/Sidebar';
import { type AppModalsProps } from '../src/components/modals/AppModals';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Stage C: Modals and Sidebar Props Facades & Encapsulation...\n');

// 1. Verify function exports
assert(typeof useSidebarProps === 'function', 'useSidebarProps is exported as a function');
assert(typeof buildSidebarProps === 'function', 'buildSidebarProps is exported as a function');
assert(typeof useModalsProps === 'function', 'useModalsProps is exported as a function');
assert(typeof buildModalsProps === 'function', 'buildModalsProps is exported as a function');

// 2. Validate Sidebar props pass-through
const dummySidebar: Partial<SidebarProps> = {
  isSidebarOpen: true,
  isGalleryCollapsed: false,
  username: 'testuser',
  vaultAccounts: ['testuser'],
  galleryMode: 'local',
  galleryView: 'grid',
  images: [],
};

const builtSidebar = buildSidebarProps(dummySidebar as any);
assert(builtSidebar.isSidebarOpen === true, 'Sidebar isSidebarOpen preserved');
assert(builtSidebar.username === 'testuser', 'Sidebar username preserved');
assert(builtSidebar.galleryMode === 'local', 'Sidebar galleryMode preserved');

// 3. Validate Modals props pass-through
const dummyModals: Partial<AppModalsProps> = {
  activeModal: 'publish',
  username: 'testuser',
  vaultPin: '1234',
  isUnlocked: true,
  isVaultInitialized: true,
  performanceMode: false,
  themeColor: 'cyan',
};

const builtModals = buildModalsProps(dummyModals as any);
assert(builtModals.activeModal === 'publish', 'Modals activeModal preserved');
assert(builtModals.vaultPin === '1234', 'Modals vaultPin preserved');
assert(builtModals.isUnlocked === true, 'Modals isUnlocked preserved');
assert(builtModals.themeColor === 'cyan', 'Modals themeColor preserved');

console.log('\nStage C test validation passed successfully!');
