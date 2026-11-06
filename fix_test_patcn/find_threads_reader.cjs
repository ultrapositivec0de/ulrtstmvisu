const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('fetchThread') || l.includes('const [threads') || l.includes('editingReply')) {
    console.log(`${i+1}: ${l}`);
  }
});
