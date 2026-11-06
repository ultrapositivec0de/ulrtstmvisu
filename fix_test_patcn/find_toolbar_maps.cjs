const fs = require('fs');
const path = require('path');

function searchForToolbars(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'fix_test_patcn') {
        searchForToolbars(full);
      }
    } else if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('tools') || content.includes('toolbar') || content.includes('Toolbar') || content.includes('TamedWidget') || content.includes('Mobile') || content.includes('Reader')) {
        console.log(`Checking ${full}:`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('.map(') && (l.includes('tool') || l.includes('item') || l.includes('action') || l.includes('btn') || l.includes('button'))) {
            console.log(`  Line ${idx+1}: ${l.trim()}`);
          }
        });
      }
    }
  }
}

searchForToolbars('./src');
