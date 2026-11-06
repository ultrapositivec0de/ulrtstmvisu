const fs = require('fs');
const path = require('path');

function searchArrays(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') searchArrays(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const code = fs.readFileSync(full, 'utf8');
      
      // Look for arrays defined with [ ... ]
      const arrayRegex = /\[([^\[\]]{10,2000})\]/gs;
      let m;
      while ((m = arrayRegex.exec(code)) !== null) {
        const inner = m[1];
        // Split by comma at top level
        const items = inner.split(',').map(s => s.trim()).filter(Boolean);
        if (items.length === 26 || items.length === 13 || items.length === 11 || items.length === 25 || items.length === 27) {
          console.log(`Found array of length ${items.length} in ${path.relative(path.join(__dirname, '..'), full)}`);
          console.log(`  Items preview: ${items.slice(0, 5).join(', ')}...`);
        }
      }
    }
  }
}

searchArrays(path.join(__dirname, '../src'));
