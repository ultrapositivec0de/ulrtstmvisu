import { useWindowInteractions } from '../src/hooks/useWindowInteractions';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Step F.2: useWindowInteractions...\n');

assert(typeof useWindowInteractions === 'function', 'useWindowInteractions is an exported function');

console.log('\nStep F.2 test passed successfully!');
