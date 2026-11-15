import { AppWorkspaceHost } from '../src/components/screens/AppWorkspaceHost';

console.log('Testing Step H.1: AppWorkspaceHost...');

if (typeof AppWorkspaceHost !== 'function') {
  console.error('FAIL: AppWorkspaceHost is not a function/component');
  process.exit(1);
}

console.log('✅ PASSED: AppWorkspaceHost is properly exported as a React component');
console.log('Step H.1 test passed successfully!');
