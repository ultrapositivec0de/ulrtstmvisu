const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') search(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const code = fs.readFileSync(full, 'utf8');
      if (code.includes('enabledTools')) {
        console.log(`Found enabledTools in ${full}`);
        const lines = code.split('\n');
        lines.forEach((l, i) => {
          if (l.includes('enabledTools') && (l.includes('=') || l.includes('useState') || l.includes('DEFAULT_'))) {
            console.log(`  ${i+1}: ${l}`);
          }
        });
      }
    }
  }
}
search(path.join(__dirname, '../src'));
