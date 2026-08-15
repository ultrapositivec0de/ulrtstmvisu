const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const tauriFsLogic = `
    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().setFullscreen(next).catch(() => {});
      }).catch(() => {});
    } else {
`;

// Patch toggleFullScreen
const oldToggleFS = `  const toggleFullScreen = () => {
    setIsFullScreen(prev => {
      const next = !prev;
      if (next) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };`;

const newToggleFS = `  const toggleFullScreen = () => {
    setIsFullScreen(prev => {
      const next = !prev;
      const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          getCurrentWindow().setFullscreen(next).catch(() => {});
        }).catch(() => {});
      } else {
        if (next) {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        }
      }
      return next;
    });
  };`;

content = content.replace(oldToggleFS, newToggleFS);

// Patch toggleEditorFullScreen
const oldToggleEditorFS = `  const toggleEditorFullScreen = () => {
    setIsEditorFullScreen(prev => {
      const next = !prev;
      if (next) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };`;

const newToggleEditorFS = `  const toggleEditorFullScreen = () => {
    setIsEditorFullScreen(prev => {
      const next = !prev;
      const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
      if (isTauri) {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          getCurrentWindow().setFullscreen(next).catch(() => {});
        }).catch(() => {});
      } else {
        if (next) {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        }
      }
      return next;
    });
  };`;

content = content.replace(oldToggleEditorFS, newToggleEditorFS);

fs.writeFileSync('src/App.tsx', content);
console.log('Patched fullscreen toggles.');
