const fs = require('fs');
const path = require('path');

function checkHeader() {
  const code = fs.readFileSync(path.join(__dirname, '../src/components/header/Header.tsx'), 'utf8');
  const lines = code.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('.map(') || l.includes('TOOL_GROUPS') || l.includes('MOBILE_TOOL_GROUPS') || l.includes('toolsMap') || l.includes('activeTools') || l.includes('key=')) {
      console.log(`${idx+1}: ${l}`);
    }
  });
}
checkHeader();
