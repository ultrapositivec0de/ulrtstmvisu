import fs from 'fs';
const code = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes('fetchInbox(')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
