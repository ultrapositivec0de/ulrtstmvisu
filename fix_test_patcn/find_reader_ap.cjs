const fs = require('fs');

const content = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('<AnimatePresence')) {
    console.log(`AnimatePresence at line ${idx + 1}`);
    for (let j = 1; j <= 12; j++) {
      if (lines[idx + j]) {
        console.log(`  +${j} (${idx + 1 + j}): ${lines[idx + j]}`);
      }
    }
    console.log('---');
  }
});
