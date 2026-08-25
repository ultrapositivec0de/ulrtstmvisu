import fs from 'fs';

let content = fs.readFileSync('src/index.css', 'utf8');

// Replace html, body, #root rule block
const target = /html,\s*body,\s*#root\s*\{[^}]*\}/m;
const replacement = `html, body, #root {
  height: 100% !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  overscroll-behavior: none !important;
  touch-action: manipulation;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/index.css', content);
console.log('Updated src/index.css successfully');
