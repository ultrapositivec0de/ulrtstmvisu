const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '../src/components/Reader.tsx'), 'utf8');
const lines = code.split('\n');

// Search for any .map in Reader.tsx and print length of arrays or literal arrays
lines.forEach((line, idx) => {
  if (line.includes('.map(')) {
    console.log(`Line ${idx+1}: ${line.trim()}`);
    // Check preceding lines for array declaration
    for (let j = Math.max(0, idx - 10); j < idx; j++) {
      if (lines[j].includes('[') || lines[j].includes('const ') || lines[j].includes('let ')) {
        console.log(`   prev ${j+1}: ${lines[j].trim()}`);
      }
    }
  }
});
