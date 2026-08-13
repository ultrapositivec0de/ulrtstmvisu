import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');
const editorLines = lines.filter(l => l.includes('CodeEditor') || l.includes('wysiwyg') || l.includes('main-editor'));
console.log(editorLines.slice(0, 20).join('\n'));
