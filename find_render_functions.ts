import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.match(/const render[A-Za-z0-9]+/)) {
    console.log(`${i+1}: ${line.trim()}`);
  } else if (line.match(/function [A-Za-z0-9]+/)) {
    if (i > 1000) {
      // only print some
      console.log(`${i+1} fn: ${line.trim()}`);
    }
  }
});
