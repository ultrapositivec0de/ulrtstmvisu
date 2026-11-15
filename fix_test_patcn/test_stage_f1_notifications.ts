import { useAppNotifications } from '../src/hooks/useAppNotifications';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Step F.1: useAppNotifications...\n');

assert(typeof useAppNotifications === 'function', 'useAppNotifications is an exported function');

console.log('\nStep F.1 test passed successfully!');
