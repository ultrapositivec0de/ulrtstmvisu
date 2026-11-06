const fs = require('fs');
const path = require('path');

function inspectDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') inspectDir(full);
    } else if (f.endsWith('.tsx')) {
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('.map(')) {
          console.log(`\n=== MAP IN ${path.relative(path.join(__dirname, '..'), full)}:${i+1} ===`);
          for (let j = Math.max(0, i - 1); j < Math.min(lines.length, i + 8); j++) {
            console.log(`${j+1}: ${lines[j]}`);
          }
        }
      }
    }
  }
}

inspectDir(path.join(__dirname, '../src/components'));
