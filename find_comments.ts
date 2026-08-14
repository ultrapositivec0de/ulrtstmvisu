import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes('comment') || line.includes('Comment') || line.includes('reply') || line.includes('Reply')) {
    if (line.includes('green') || line.includes('bg-green') || line.includes('border-green') || line.includes('text-green') || line.includes('emerald')) {
      console.log(`Green comment line ${i+1}: ${line.trim()}`);
    }
  }
});
