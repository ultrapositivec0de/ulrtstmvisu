const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

console.log('=== APP.TSX SECTIONS ANALYSIS ===');
lines.forEach((line, idx) => {
  if (line.match(/^\s*\/\/\s*([0-9]+[\.\w\s-]+|[A-Z][\w\s-]+)\s*$/)) {
    console.log(`Line ${(idx + 1).toString().padStart(4)}: ${line.trim()}`);
  }
});

// Also find the return statement in App.tsx
const returnIdx = lines.findIndex(l => l.includes('return (') || l.includes('return <'));
console.log(`\nJSX Return starts at line: ${returnIdx + 1}`);

// Analyze what is inside return ()
const jsxContent = lines.slice(returnIdx).join('\n');
const renderedTags = [];
const tagRegex = /<([A-Z][a-zA-Z0-9]+)/g;
let m;
while ((m = tagRegex.exec(jsxContent)) !== null) {
  renderedTags.push(m[1]);
}
const tagCounts = {};
renderedTags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
console.log('\n=== RENDERED COMPONENTS IN APP.TSX JSX ===');
Object.entries(tagCounts).sort((a,b) => b[1] - a[1]).forEach(([tag, count]) => {
  console.log(`  <${tag}>: ${count} times`);
});
