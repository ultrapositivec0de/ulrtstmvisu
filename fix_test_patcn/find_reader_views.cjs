const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('viewMode === "curation"') || l.includes('viewMode === "settings"') || l.includes('viewMode === "config"') || l.includes('key="reader-view-')) {
    console.log(`${idx+1}: ${l}`);
  }
});
