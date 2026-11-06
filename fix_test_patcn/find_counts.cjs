const fs = require('fs');
const path = require('path');

// Let's inspect src/components/editor/EditorPane.tsx around table operations and floating widget
const ep = fs.readFileSync(path.join(__dirname, '../src/components/editor/EditorPane.tsx'), 'utf8');
const epLines = ep.split('\n');

console.log('=== EditorPane lines around 650-760 ===');
for (let i = 650; i < Math.min(epLines.length, 760); i++) {
  console.log(`${i+1}: ${epLines[i]}`);
}
