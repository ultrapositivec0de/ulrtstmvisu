const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const countComm = lines.filter(l => l.includes('POPULAR_COMMUNITIES')).length;
const countTags = lines.filter(l => l.includes('POPULAR_TAGS')).length;
console.log('POPULAR_COMMUNITIES count:', countComm, 'POPULAR_TAGS count:', countTags);
