import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');

// Let's search for occurrences of "reply" or "my" or similar inside active feed rendering
lines.forEach((line, i) => {
  if (line.includes('reply') || line.includes('Reply') || line.includes('comment') || line.includes('Comment') || line.includes('feed') || line.includes('Feed')) {
    if (line.includes('author') || line.includes('username') || line.includes('==') || line.includes('===')) {
      if (i > 5000 && i < 11000) {
        console.log(`Line ${i+1}: ${line.trim()}`);
      }
    }
  }
});
