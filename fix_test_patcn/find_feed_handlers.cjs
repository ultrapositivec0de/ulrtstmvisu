const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const feedText = lines.slice(1767, 2356).join('\n');

// Check mentions of handle, toggle, on, set
const matches = feedText.match(/\b(handle[A-Z]\w+|on[A-Z]\w+|toggle[A-Z]\w+|set[A-Z]\w+)\b/g);
const unique = Array.from(new Set(matches || []));
console.log('Action handlers in feed view:', unique);
