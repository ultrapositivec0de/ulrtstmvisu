const fs = require('fs');
const content = fs.readFileSync('src/components/Reader.tsx', 'utf8');
const lines = content.split('\n');

const stats = [];
let stateCount = 0;
let effectCount = 0;
let handlerCount = 0;

for (let i = 260; i < 1625; i++) {
  const l = lines[i];
  if (l.includes('useState(')) stateCount++;
  if (l.includes('useEffect(')) effectCount++;
  if (l.match(/^\s*(const|async function|function)\s+(handle|fetch|process|toggle|load)/)) {
    stats.push(`${i+1}: ${l.trim()}`);
  }
}

console.log('State count:', stateCount);
console.log('Effect count:', effectCount);
console.log('Handlers/Fetchers found:', stats.length);
console.log(stats.slice(0, 30));
