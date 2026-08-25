import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/\+var\(--browser-bottom-inset,0px\)/g, '');
content = content.replace(/\+ var\(--browser-bottom-inset, 0px\)/g, '');

fs.writeFileSync('src/App.tsx', content);
