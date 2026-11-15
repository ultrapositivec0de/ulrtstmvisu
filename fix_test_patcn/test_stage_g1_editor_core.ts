import { useEditorCore } from '../src/hooks/useEditorCore';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Step G.1: useEditorCore...\n');

assert(typeof useEditorCore === 'function', 'useEditorCore is an exported function');

console.log('\nStep G.1 test passed successfully!');
