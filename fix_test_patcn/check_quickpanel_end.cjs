const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

for (let i = 4055; i < 4085 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
