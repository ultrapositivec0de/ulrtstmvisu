const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const startIdx = lines.findIndex(line => line.includes('<AnimatePresence>') && lines[lines.indexOf(line) + 1]?.includes('{showInbox && ('));
const endIdx = lines.findIndex((line, idx) => idx > startIdx && line.includes('</AnimatePresence>') && lines[idx + 2]?.includes('ref={mainScrollRef}'));

console.log('startIdx:', startIdx + 1, lines[startIdx]);
console.log('endIdx:', endIdx + 1, lines[endIdx]);
console.log('Surrounding before start:', lines[startIdx - 2], lines[startIdx - 1]);
console.log('Surrounding after end:', lines[endIdx + 1], lines[endIdx + 2]);
