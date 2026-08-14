import fs from 'fs';
const code = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = code.split('\n');

console.log("Searching in Reader.tsx:");
lines.forEach((line, i) => {
  if (line.includes('comment') || line.includes('Comment') || line.includes('reply') || line.includes('Reply') || line.includes('green') || line.includes('emerald') || line.includes('feed') || line.includes('Feed')) {
    if (line.includes('bg-') || line.includes('text-') || line.includes('border-') || line.includes('green') || line.includes('emerald') || line.includes('author') || line.includes('username') || line.includes('reply') || line.includes('add') || line.includes('post')) {
      console.log(`Line ${i+1}: ${line.trim()}`);
    }
  }
});
