const fs = require('fs');
const path = require('path');

function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Count hooks
  const useStateMatches = (content.match(/useState\s*(<[^>]+>)?\s*\(/g) || []).length;
  const useEffectMatches = (content.match(/useEffect\s*\(/g) || []).length;
  const useCallbackMatches = (content.match(/useCallback\s*\(/g) || []).length;
  const useMemoMatches = (content.match(/useMemo\s*\(/g) || []).length;
  const useRefMatches = (content.match(/useRef\s*(<[^>]+>)?\s*\(/g) || []).length;
  
  // Custom hooks
  const customHookMatches = (content.match(/use[A-Z][a-zA-Z0-9]+\s*\(/g) || []).length;
  
  // Sub-components declared in file (const Comp = ... => or function Comp)
  const inlineComponents = [];
  const compRegex = /(?:const|function)\s+([A-Z][a-zA-Z0-9]+)\s*(?:=|:|\()/g;
  let match;
  while ((match = compRegex.exec(content)) !== null) {
    if (match[1] !== 'App' && match[1] !== 'Reader') {
      inlineComponents.push(match[1]);
    }
  }

  // Find JSX blocks, modals, and conditional renders
  const modalMatches = (content.match(/<[A-Z][a-zA-Z0-9]*Modal/g) || []).map(m => m.replace('<', ''));
  const conditionalRenderMatches = (content.match(/\{[a-zA-Z0-9_$.]+\s*(&&|\?)/g) || []).length;

  return {
    filePath,
    totalLines: lines.length,
    sizeBytes: Buffer.byteLength(content, 'utf8'),
    useStateMatches,
    useEffectMatches,
    useCallbackMatches,
    useMemoMatches,
    useRefMatches,
    customHookMatches,
    inlineComponents: [...new Set(inlineComponents)],
    modals: [...new Set(modalMatches)],
    conditionalRenderMatches
  };
}

const targetFiles = [
  'src/App.tsx',
  'src/components/Reader.tsx',
  'src/hooks/useSteemGallery.ts',
  'src/hooks/useReaderBlockchainActions.ts',
  'src/components/sidebar/Sidebar.tsx',
  'src/components/editor/EditorScreen.tsx',
  'src/components/screens/EditorScreen.tsx',
  'src/components/reader/ReaderFeedView.tsx',
  'src/components/reader/ReaderCurationView.tsx',
  'src/components/reader/ReaderSettingsView.tsx',
  'src/components/reader/ReaderInboxModal.tsx',
  'src/components/reader/PostDetailModal.tsx',
  'src/components/editor/TamedWidget.tsx'
];

console.log('=== DEEP ANALYSIS OF LARGE & KEY COMPONENTS ===\n');
const results = targetFiles.map(analyzeFile).filter(Boolean);

results.forEach(r => {
  console.log(`FILE: ${r.filePath}`);
  console.log(`  Lines: ${r.totalLines} | Size: ${(r.sizeBytes / 1024).toFixed(1)} KB`);
  console.log(`  Hooks: useState: ${r.useStateMatches}, useEffect: ${r.useEffectMatches}, useCallback: ${r.useCallbackMatches}, useRef: ${r.useRefMatches}, Custom: ${r.customHookMatches}`);
  console.log(`  Conditional Renders: ${r.conditionalRenderMatches}`);
  console.log(`  Embedded Components/Functions: ${r.inlineComponents.join(', ') || 'none'}`);
  console.log(`  Rendered Modals: ${r.modals.join(', ') || 'none'}`);
  console.log('--------------------------------------------------');
});
