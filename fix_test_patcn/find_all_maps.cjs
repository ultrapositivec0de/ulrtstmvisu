const fs = require('fs');
const path = require('path');

function findEveryMap(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') findEveryMap(full);
    } else if (f.endsWith('.tsx')) {
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('.map(')) {
          // Extract the mapped expression and key in the next 15 lines
          let slice = lines.slice(i, Math.min(lines.length, i + 15)).join('\n');
          console.log(`FILE: ${path.relative(path.join(__dirname, '..'), full)}:${i+1}`);
          console.log(`  EXPR: ${lines[i].trim()}`);
          const keyMatch = slice.match(/key=\{([^}]+)\}/);
          if (keyMatch) {
            console.log(`  KEY: ${keyMatch[1]}`);
          } else {
            const keyStrMatch = slice.match(/key="([^"]+)"/);
            if (keyStrMatch) {
              console.log(`  KEY: "${keyStrMatch[1]}"`);
            } else {
              console.log(`  NO KEY FOUND IN NEXT 15 LINES!`);
            }
          }
        }
      }
    }
  }
}

findEveryMap(path.join(__dirname, '../src'));
