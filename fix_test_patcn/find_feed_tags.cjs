const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const feedText = lines.slice(1767, 2356).join('\n');
const tagMatches = feedText.match(/<([A-Z][A-Za-z0-9]+)/g);
const uniqueTags = Array.from(new Set((tagMatches || []).map(t => t.slice(1))));
console.log('JSX tags in feed view:', uniqueTags);
