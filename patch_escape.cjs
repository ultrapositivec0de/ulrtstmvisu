const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `      if (e.key === 'Escape') {
        if (showTableSelector) {
          setShowTableSelector(false);
          return;
        }
        if (isWidgetMenuOpen) {
          setIsWidgetMenuOpen(false);
          return;
        }
        if (activeModal) {
          setActiveModal(null);
          return;
        }
        if (isEditorFullScreen) {
          setIsEditorFullScreen(false);
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          return;
        }
        if (isFullScreen) {
          setIsFullScreen(false);
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          return;
        }
      }`;

const replacementStr = `      if (e.key === 'Escape') {
        if (showTableSelector) {
          setShowTableSelector(false);
          return;
        }
        if (isWidgetMenuOpen) {
          setIsWidgetMenuOpen(false);
          return;
        }
        if (activeModal) {
          setActiveModal(null);
          return;
        }
        
        const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
        
        if (isEditorFullScreen) {
          setIsEditorFullScreen(false);
          if (isTauri) {
             import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().setFullscreen(false).catch(() => {}));
          } else if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          return;
        }
        if (isFullScreen) {
          setIsFullScreen(false);
          if (isTauri) {
             import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().setFullscreen(false).catch(() => {}));
          } else if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          return;
        }
      }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', content);
console.log('Patched escape key handler.');
