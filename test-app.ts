import fs from 'fs';

const code = fs.readFileSync('src/App.tsx', 'utf8');
const match = code.match(/updateContentFromWysiwyg\s*=\s*useCallback\(\(forceImmediate = false\).*?\}, \[.*?\]\);/s);
if (match) {
  console.log("Found updateContentFromWysiwyg:\n", match[0]);
}
