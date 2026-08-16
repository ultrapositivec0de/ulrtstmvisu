const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `      // Intercept WebKitGTK 'f' key fullscreen exit
      if ((e.key === 'f' || e.key === 'F') && document.fullscreenElement) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        e.preventDefault(); // Stop WebKitGTK from exiting fullscreen natively
        if (isInput) {
          document.execCommand('insertText', false, e.key);
        }
      }`;

content = content.replace(targetStr, "");
fs.writeFileSync('src/App.tsx', content);
console.log('Removed f key intercept.');
