const fs = require('fs');
const path = require('path');

function search(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules', '.git'].includes(f.name)) search(full);
    else if (f.isFile() && f.name.endsWith('.ts')) {
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes('signImageChallengeWithKeychain')) {
        console.log(full);
      }
    }
  }
}
search(path.resolve(__dirname, '../src'));
