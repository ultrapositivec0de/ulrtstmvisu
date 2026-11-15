import { useWorkspaceDOMRefs } from '../src/hooks/useWorkspaceDOMRefs';
import { useWorkspaceEditorState } from '../src/hooks/useWorkspaceEditorState';

console.log('Testing useWorkspaceDOMRefs and useWorkspaceEditorState signatures...');

// Verify types and exports
if (typeof useWorkspaceDOMRefs !== 'function') {
  throw new Error('useWorkspaceDOMRefs is not a function');
}

if (typeof useWorkspaceEditorState !== 'function') {
  throw new Error('useWorkspaceEditorState is not a function');
}

console.log('✅ Stage H.2 Sub-Hooks validation passed successfully.');
