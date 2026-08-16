import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const fn = code.match(/const restoreMarkdownCursorAndScroll = useCallback\(\(\) => \{[\s\S]*?\}, \[.*?\]\);/);
console.log(fn ? fn[0] : "Not found");
