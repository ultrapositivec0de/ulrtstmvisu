const fs = require('fs');
const content = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = content.split('\n');
console.log('Total lines in Reader.tsx:', lines.length);

let currentFn = '';
lines.forEach((l, idx) => {
  if (l.match(/^(export\s+)?(function|const)\s+([A-Za-z0-9_]+)/)) {
    console.log(`${idx + 1}: ${l.slice(0, 80)}`);
  }
  if (l.includes('return (') && idx > 1500) {
    console.log(`Render return at line ${idx + 1}`);
  }
});
