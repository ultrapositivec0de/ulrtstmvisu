import { buildEditorPaneProps, useEditorPaneProps } from '../src/hooks/useEditorPaneProps';
import { type EditorPaneProps } from '../src/components/editor/EditorPane';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Stage A: EditorPaneProps Facade & Encapsulation...\n');

// 1. Verify function existence
assert(typeof useEditorPaneProps === 'function', 'useEditorPaneProps is exported as a function');
assert(typeof buildEditorPaneProps === 'function', 'buildEditorPaneProps is exported as a pure function');

// 2. Validate props structure
const mockProps: Partial<EditorPaneProps> = {
  editorMode: 'visual',
  visualStyle: 'neon',
  isDarkMode: true,
  isEditorFullScreen: false,
  vvHeight: null,
  activeMobileTab: 'editor',
  lang: 'uk',
};

const processed = buildEditorPaneProps(mockProps as any);
assert(processed !== null && typeof processed === 'object', 'buildEditorPaneProps returns a valid object');
assert(processed.editorMode === 'visual', 'editorMode preserved');
assert(processed.visualStyle === 'neon', 'visualStyle preserved');
assert(processed.isDarkMode === true, 'isDarkMode preserved');
assert(processed.lang === 'uk', 'lang preserved');

console.log('\nStage A validation successful!');
