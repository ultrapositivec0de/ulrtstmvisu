const fs = require('fs');
const path = require('path');

function scanJsx(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') scanJsx(full);
    } else if (f.endsWith('.tsx')) {
      const code = fs.readFileSync(full, 'utf8');
      
      // Look for any JSX containing curly braces with arrays: {[ ... ]}
      const arrayInJsx = /\{(\s*\[[^\]]+\]\s*)\}/gs;
      let m;
      while ((m = arrayInJsx.exec(code)) !== null) {
        console.log(`Array in JSX in ${path.relative(path.join(__dirname, '..'), full)}:`);
        console.log(m[1].slice(0, 100).trim());
      }
    }
  }
}

scanJsx(path.join(__dirname, '../src'));
