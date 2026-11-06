const fs = require('fs');
const path = require('path');

function findInFiles(dir, filter, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        findInFiles(full, filter, pattern);
      }
    } else if (filter.test(file)) {
      const content = fs.readFileSync(full, 'utf8');
      if (pattern.test(content)) {
        console.log(`Matched in: ${full}`);
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (pattern.test(line)) {
            console.log(`  Line ${i + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log('--- Searching for state.stats or stats subscription ---');
findInFiles('./src', /\.(tsx|ts)$/, /state\.stats|\.stats\b/);
