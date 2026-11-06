const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (idx < 2356 && (l.includes('curation') || l.includes('Curation'))) {
    console.log(`${idx+1}: ${l}`);
  }
});
