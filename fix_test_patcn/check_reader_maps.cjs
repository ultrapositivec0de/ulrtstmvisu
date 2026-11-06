const fs = require('fs');

const content = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('.map(')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
    // print next 4 lines
    for (let j = 1; j <= 4; j++) {
      if (lines[idx + j]) console.log(`   +${j}: ${lines[idx + j].trim()}`);
    }
  }
});
