const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('ReaderMobileBottomBar')) {
    console.log(`ReaderMobileBottomBar at line ${idx+1}`);
    for (let j = idx - 10; j <= idx + 5; j++) {
      if (lines[j]) console.log(`  ${j+1}: ${lines[j]}`);
    }
  }
});
