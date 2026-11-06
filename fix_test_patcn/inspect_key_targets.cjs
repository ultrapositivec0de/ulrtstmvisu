const fs = require('fs');
const path = require('path');

const files = [
  'src/components/header/Header.tsx',
  'src/components/editor/TamedWidget.tsx',
  'src/components/editor/EditorPane.tsx',
  'src/components/Reader.tsx',
  'src/components/header/UniversalToolbar.tsx' // let's see if this exists
];

files.forEach(f => {
  const p = path.join(__dirname, '..', f);
  if (!fs.existsSync(p)) {
    console.log(`File not found: ${f}`);
    return;
  }
  const code = fs.readFileSync(p, 'utf8');
  const lines = code.split('\n');
  console.log(`\n================== ${f} ==================`);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('.map(')) {
      console.log(`--- Line ${i + 1} ---`);
      for (let j = Math.max(0, i - 1); j < Math.min(lines.length, i + 12); j++) {
        console.log(`${j + 1}: ${lines[j]}`);
      }
    }
  }
});
