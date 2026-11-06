const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const feedLines = lines.slice(1767, 2356);
console.log('feedLines count:', feedLines.length);
console.log('first 5 lines:', feedLines.slice(0, 5));
console.log('last 5 lines:', feedLines.slice(-5));
