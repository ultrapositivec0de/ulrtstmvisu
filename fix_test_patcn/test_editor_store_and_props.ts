import { useEditorStore } from '../src/store';
import { useEditorPaneProps, buildEditorPaneProps } from '../src/hooks/useEditorPaneProps';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Editor Store and Prop Decomposition...\n');

// 1. Initial State
const state = useEditorStore.getState();
console.log('1. Checking initial store properties:');
assert(typeof state.isLivePreviewEnabled === 'boolean', 'isLivePreviewEnabled is boolean');
assert(typeof state.syncScrollEnabled === 'boolean', 'syncScrollEnabled is boolean');
assert(typeof state.beautifyEnabled === 'boolean', 'beautifyEnabled is boolean');
assert(typeof state.activeFormats === 'object', 'activeFormats is object');

// 2. Toggling Live Preview
console.log('\n2. Testing toggleLivePreview:');
const prevLive = useEditorStore.getState().isLivePreviewEnabled;
useEditorStore.getState().toggleLivePreview();
assert(useEditorStore.getState().isLivePreviewEnabled === !prevLive, 'toggleLivePreview flipped the state');
useEditorStore.getState().setIsLivePreviewEnabled(true);
assert(useEditorStore.getState().isLivePreviewEnabled === true, 'setIsLivePreviewEnabled(true) works');

// 3. Toggling Sync Scroll & Beautify
console.log('\n3. Testing sync scroll and beautify:');
useEditorStore.getState().setSyncScrollEnabled(false);
assert(useEditorStore.getState().syncScrollEnabled === false, 'setSyncScrollEnabled(false) works');
useEditorStore.getState().setSyncScrollEnabled(true);
assert(useEditorStore.getState().syncScrollEnabled === true, 'setSyncScrollEnabled(true) works');

useEditorStore.getState().setBeautifyEnabled(false);
assert(useEditorStore.getState().beautifyEnabled === false, 'setBeautifyEnabled(false) works');
useEditorStore.getState().setBeautifyEnabled(true);
assert(useEditorStore.getState().beautifyEnabled === true, 'setBeautifyEnabled(true) works');

// 4. Updating Active Formats
console.log('\n4. Testing active formats:');
useEditorStore.getState().setActiveFormats({ bold: true, italic: false });
assert(useEditorStore.getState().activeFormats.bold === true, 'bold is true in activeFormats');
assert(useEditorStore.getState().activeFormats.italic === false, 'italic is false in activeFormats');

// 5. useEditorPaneProps & buildEditorPaneProps
console.log('\n5. Testing useEditorPaneProps & buildEditorPaneProps:');
assert(typeof useEditorPaneProps === 'function', 'useEditorPaneProps is a function');
const dummyProps: any = { isDarkMode: true, editorMode: 'markdown' };
const returnedProps = buildEditorPaneProps(dummyProps);
assert(returnedProps.isDarkMode === true, 'buildEditorPaneProps returns input props accurately');

console.log('\nAll Editor Store & Prop Decomposition tests passed successfully!');
