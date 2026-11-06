const fs = require('fs');
const path = require('path');

function searchMaps(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'fix_test_patcn') {
        searchMaps(full);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('.map(')) {
          // Print surrounding 10 lines
          const snippet = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 8)).join('\n');
          // Check if key is used
          if (!snippet.includes('key=')) {
            console.log(`POTENTIAL MISSING KEY in ${full}:${i + 1}`);
            console.log(snippet);
            console.log('--------------------------------------------------');
          }
        }
      });
    }
  }
}

searchMaps('./src');
