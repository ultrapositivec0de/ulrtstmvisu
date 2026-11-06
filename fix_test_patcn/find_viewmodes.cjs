const fs = require('fs');

const content = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 2620; i < 4600; i++) {
  if (lines[i].includes('viewMode ===') || lines[i].includes('</AnimatePresence>')) {
    console.log(`Line ${i + 1}: ${lines[i].trim()}`);
  }
}
