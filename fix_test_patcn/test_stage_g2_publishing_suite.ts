import { useSteemPublishingSuite } from '../src/hooks/useSteemPublishingSuite';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Step G.2: useSteemPublishingSuite...\n');

assert(typeof useSteemPublishingSuite === 'function', 'useSteemPublishingSuite is an exported function');

console.log('\nStep G.2 test passed successfully!');
