import fs from 'fs';
const code = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = code.split('\n');
let start = -1;
lines.forEach((line, i) => {
  if (line.includes('const fetchComments =')) {
    start = i;
  }
});
if (start !== -1) {
  console.log(lines.slice(start, start + 60).join('\n'));
}
