const fs = require('fs');
const path = require('path');

function searchAnimatePresence(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'fix_test_patcn') {
        searchAnimatePresence(full);
      }
    } else if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('AnimatePresence')) {
        console.log(`Checking ${full}:`);
        const lines = content.split('\n');
        let inAP = false;
        lines.forEach((l, idx) => {
          if (l.includes('<AnimatePresence')) {
            inAP = true;
            console.log(`  Line ${idx+1}: ${l.trim()}`);
          }
          if (inAP) {
            if (l.includes('<motion.') || l.includes('<div') || l.includes('<button') || /<[A-Z][a-zA-Z0-9]+/.test(l)) {
              console.log(`    Child at Line ${idx+1}: ${l.trim().slice(0, 80)}`);
            }
          }
          if (l.includes('</AnimatePresence>')) {
            inAP = false;
          }
        });
      }
    }
  }
}

searchAnimatePresence('./src');
