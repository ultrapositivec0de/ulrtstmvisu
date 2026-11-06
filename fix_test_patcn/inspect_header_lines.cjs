const fs = require('fs');
const content = fs.readFileSync('src/components/header/Header.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 558; i <= 570; i++) {
  console.log(i + ': ' + JSON.stringify(lines[i]));
}
