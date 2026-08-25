import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = /const bottomNavOffset = \(isEditorFullScreen \|\| isFullScreen\) \? 12 : 72;/;
const replacement = `const mobileNavEl = typeof document !== 'undefined' ? document.querySelector('nav.lg\\\\:hidden') as HTMLElement : null;
                          const mobileNavHeight = (mobileNavEl && mobileNavEl.offsetHeight > 0) ? mobileNavEl.offsetHeight : 64;
                          const bottomNavOffset = (isEditorFullScreen || isFullScreen) ? 12 : (mobileNavHeight + 8);`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
console.log('Patched bottomNavOffset in App.tsx');
