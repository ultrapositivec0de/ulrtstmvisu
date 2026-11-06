const fs = require('fs');
const path = require('path');

// Let's search for sample image URLs in the repository
function searchPatterns(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) {
      searchPatterns(full);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.json'))) {
      const txt = fs.readFileSync(full, 'utf8');
      const matches = txt.match(/https?:\/\/(?:cdn\.)?steemitimages\.com\/[^\s"')]+/g);
      if (matches) {
        console.log(`In ${entry.name}:`, matches.slice(0, 3));
      }
    }
  }
}

searchPatterns(path.resolve(__dirname, '../src'));
