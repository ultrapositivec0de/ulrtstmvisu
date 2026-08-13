import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const fn = code.match(/const syncCursorVisualToMarkdown = useCallback\(\(\) => \{[\s\S]*?\}\);/);
console.log(fn ? fn[0].substring(0, 1000) : "Not found");
