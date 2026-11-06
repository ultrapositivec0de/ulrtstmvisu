const fs = require('fs');

const content = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 4020; i < lines.length; i++) {
  if (lines[i].includes('</AnimatePresence>')) {
    console.log(`AnimatePresence close at line ${i + 1}: ${lines[i].trim()}`);
  }
}
