import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const effect = code.match(/useEffect\(\(\) => \{[^}]*editorMode[^}]*\}, \[.*?\]\);/gs);
console.log(effect);
