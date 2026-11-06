const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('expandedReplies') || l.includes('threadHistory') || l.includes('parentHistory')) {
    console.log(`${i+1}: ${l}`);
  }
});
