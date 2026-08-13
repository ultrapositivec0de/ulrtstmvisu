import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
if (code.includes('visualViewport')) {
  console.log('visualViewport found');
} else {
  console.log('no visualViewport');
}
