import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes('onComment')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
