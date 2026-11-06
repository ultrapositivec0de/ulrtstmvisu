const fs = require('fs');
const path = require('path');

const files = [
  'src/components/docReader/DocReaderToolbar.tsx',
  'src/components/docReader/DocReaderSettingsMenu.tsx',
  'src/components/common/MobileBottomBar.tsx',
  'src/components/reader/ReaderMobileBottomBar.tsx',
  'src/components/editor/EditorTopBar.tsx',
  'src/components/editor/TableSelectorPopup.tsx'
];

files.forEach(f => {
  const p = path.join(__dirname, '..', f);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf8');
  console.log(`\n=== ${f} ===`);
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('.map(') || l.includes('key=') || l.includes('TOOL') || l.includes('items') || l.includes('action')) {
      console.log(`  ${idx+1}: ${l}`);
    }
  });
});
