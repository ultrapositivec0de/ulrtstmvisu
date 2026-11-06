const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
let content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const commentItemIdx = lines.findIndex(l => l.trim().startsWith('function CommentItem('));
if (commentItemIdx === -1) {
  console.error('CommentItem function not found!');
  process.exit(1);
}

console.log('Found CommentItem at line:', commentItemIdx + 1);
// Keep everything before commentItemIdx, up to the end of Reader component
const newLines = lines.slice(0, commentItemIdx);
fs.writeFileSync(readerPath, newLines.join('\n') + '\n', 'utf8');
console.log('Successfully trimmed CommentItem. New total lines:', newLines.length);
