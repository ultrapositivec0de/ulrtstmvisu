const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showTableSelector, isWidgetMenuOpen, activeModal, isEditorFullScreen, isFullScreen]);`;

const replacement = `  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Intercept WebKitGTK 'f' key fullscreen exit
      if ((e.key === 'f' || e.key === 'F') && document.fullscreenElement) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        
        e.preventDefault(); // Stop WebKitGTK from exiting fullscreen natively
        
        if (isInput) {
          document.execCommand('insertText', false, e.key);
        }
      }

      if (e.key === 'Escape') {
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
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [showTableSelector, isWidgetMenuOpen, activeModal, isEditorFullScreen, isFullScreen]);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Successfully updated handleGlobalKeyDown");
} else {
    console.log("Target not found!");
}
