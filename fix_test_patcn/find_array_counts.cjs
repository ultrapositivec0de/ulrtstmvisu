const fs = require('fs');
const path = require('path');

function analyzeArrays(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'fix_test_patcn') {
        analyzeArrays(full);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      
      // Look for arrays defined like [...], or array constants
      const matches = content.match(/const\s+([a-zA-Z0-9_]+)\s*(?::\s*[^=]+)?\s*=\s*\[([\s\S]*?)\];/g) || [];
      matches.forEach(m => {
        // approximate item count
        const items = m.split(',').length;
        if (items >= 10 && items <= 35) {
          const varName = m.match(/const\s+([a-zA-Z0-9_]+)/)?.[1];
          console.log(`Found array '${varName}' (~${items} items) in ${full}`);
        }
      });
    }
  }
}

analyzeArrays('./src');
