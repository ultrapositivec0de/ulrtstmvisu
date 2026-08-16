const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `    const handleGlobalKeyDown = (e: KeyboardEvent) => {`;
const newStr = `    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
        
        if (isEditorFullScreen || isFullScreen) {
          setIsEditorFullScreen(false);
          setIsFullScreen(false);
          if (isTauri) {
             import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().setFullscreen(false).catch(() => {}));
          } else if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } else {
          setIsFullScreen(true);
          if (isTauri) {
             import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().setFullscreen(true).catch(() => {}));
          } else if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }
        return;
      }`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('src/App.tsx', content);
console.log('Added F11 toggle.');
