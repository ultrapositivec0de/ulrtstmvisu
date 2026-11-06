const fs = require('fs');
const path = require('path');

function searchForToolbars(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') searchForToolbars(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const code = fs.readFileSync(full, 'utf8');
      if (code.includes('separator') || code.includes('divider') || code.includes("'|'")) {
        // check if in same file with .map
        if (code.includes('.map(')) {
          console.log(`Candidate file: ${full}`);
          const lines = code.split('\n');
          lines.forEach((l, idx) => {
            if (l.includes('separator') || l.includes('divider') || l.includes("'|'")) {
              console.log(`  Line ${idx+1}: ${l.trim()}`);
            }
          });
        }
      }
    }
  }
}

searchForToolbars(path.join(__dirname, '../src'));
