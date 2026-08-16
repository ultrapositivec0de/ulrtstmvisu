import fs from 'fs';
const code = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = code.split('\n');

console.log("Searching comment posting functions:");
lines.forEach((line, i) => {
  if (line.includes('onComment') || line.includes('Comment') || line.includes('postComment') || line.includes('handleLocalComment') || line.includes('broadcast')) {
    if (line.includes('const ') || line.includes('function ') || line.includes('async ')) {
      console.log(`Line ${i+1}: ${line.trim()}`);
    }
  }
});
