const fs = require('fs');
const path = require('path');

function checkAllJSXMaps(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'fix_test_patcn') {
        checkAllJSXMaps(full);
      }
    } else if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('.map(') && !line.includes('//')) {
          // Look forward up to 8 lines for the opening JSX tag
          let foundTag = false;
          let foundKey = false;
          for (let j = i; j < Math.min(lines.length, i + 8); j++) {
            const l = lines[j];
            if (l.includes('<') && !l.includes('</') && !l.includes('<?') && !l.includes('<=') && !l.includes('<!--')) {
              foundTag = true;
            }
            if (foundTag && l.includes('key=')) {
              foundKey = true;
              break;
            }
            if (l.includes(');') || l.includes('})') || l.includes('} )')) {
              break;
            }
          }
          if (foundTag && !foundKey) {
            console.log(`POTENTIAL UNKEYED JSX MAP in ${full}:${i + 1}`);
            console.log(lines.slice(i, Math.min(lines.length, i + 5)).join('\n'));
            console.log('---');
          }
        }
      }
    }
  }
}

checkAllJSXMaps('./src');
