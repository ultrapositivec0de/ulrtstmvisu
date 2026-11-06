const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '../src/components/Reader.tsx'), 'utf8');
const lines = code.split('\n');

// Find sections in Reader where actions or buttons or toolbars are rendered
lines.forEach((line, idx) => {
  if (line.includes('ReaderMobileBottomBar') || line.includes('sticky top') || line.includes('flex items-center gap') || line.includes('actions') || line.includes('tools')) {
    if (idx > 1500 && idx < 2000) {
      console.log(`${idx+1}: ${line.trim()}`);
    }
  }
});
