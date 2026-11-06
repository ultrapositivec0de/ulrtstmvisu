const fs = require('fs');
const path = require('path');

function getFiles(dir, exts = ['.ts', '.tsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(getFiles(fullPath, exts));
      }
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = getFiles('./src');
const fileStats = files.map(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf8');
  return { file, lines, bytes };
}).sort((a, b) => b.lines - a.lines);

console.log('=== TOP 25 LARGEST SOURCE FILES ===');
fileStats.slice(0, 25).forEach((f, i) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${f.file.padEnd(50)} : ${f.lines.toString().padStart(5)} lines (${Math.round(f.bytes / 1024)} KB)`);
});

console.log('\n=== FILE DISTRIBUTION BY DIRECTORY ===');
const dirStats = {};
fileStats.forEach(f => {
  const dir = path.dirname(f.file);
  if (!dirStats[dir]) dirStats[dir] = { count: 0, lines: 0 };
  dirStats[dir].count++;
  dirStats[dir].lines += f.lines;
});
Object.entries(dirStats).sort((a, b) => b[1].lines - a[1].lines).forEach(([dir, stat]) => {
  console.log(`${dir.padEnd(40)} : ${stat.count.toString().padStart(3)} files, ${stat.lines.toString().padStart(6)} lines`);
});
