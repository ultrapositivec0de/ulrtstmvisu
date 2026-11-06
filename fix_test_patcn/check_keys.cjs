const fs = require('fs');
const path = require('path');

function checkJSXKeys(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'fix_test_patcn') {
        checkJSXKeys(full);
      }
    } else if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      
      // Check 1: find <React.Fragment> or <> inside .map
      const mapRegex = /\.map\s*\(\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*(?:\{|\()/g;
      
      // Check 2: find duplicate literal keys in file
      const literalKeyMatches = content.match(/key=["'][^"']+["']/g) || [];
      const keyCounts = {};
      literalKeyMatches.forEach(k => {
        keyCounts[k] = (keyCounts[k] || 0) + 1;
      });
      for (const [k, count] of Object.entries(keyCounts)) {
        if (count > 1) {
          console.log(`DUPLICATE LITERAL KEY in ${full}: ${k} appeared ${count} times!`);
        }
      }

      // Check 3: Check if <> is the immediate return of .map
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('.map(') || (i > 0 && lines[i-1].includes('.map('))) {
          if (line.includes('<>') || (lines[i+1] && lines[i+1].trim().startsWith('<>'))) {
            console.log(`EMPTY FRAGMENT IN MAP in ${full}:${i+1}`);
          }
        }
      });
    }
  }
}

checkJSXKeys('./src');
