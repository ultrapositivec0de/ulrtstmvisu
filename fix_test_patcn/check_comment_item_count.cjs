const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const count = lines.filter(l => l.includes('CommentItem')).length;
console.log('CommentItem count in Reader.tsx:', count);
