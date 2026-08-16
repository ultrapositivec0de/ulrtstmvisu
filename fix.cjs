const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const botchedSection = `  else if (ope  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Prevent WebKitGTK from exiting fullscreen when pressing 'f' or 'F'
      if ((e.key === 'f' || e.key === 'F') && document.fullscreenElement) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        
        // Prevent default to stop WebKit from exiting fullscreen
        e.preventDefault();
        
        if (isInput) {
          // Manually insert the character since preventDefault stops it
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
  }, [showTableSelector, isWidgetMenuOpen, activeModal, isEditorFullScreen, isFullScreen]);root.childNodes.length; i++) {`;

const correctSection = `  else if (openTag === '<sub>' || openTag === 'sub') key = 'sub';
  else if (openTag === '<sup>' || openTag === 'sup') key = 'sup';
  else if (openTag === '<div class="phishy">' || openTag === 'phishy') key = 'phishy';

  const ranges = getAllFormatRangesInLine(line).filter(r => r.formatKey === key);
  if (caretPosInLine === selEndInLine) {
    return ranges.some(r => caretPosInLine >= r.contentStart && caretPosInLine <= r.contentEnd);
  }
  return ranges.some(r => caretPosInLine >= r.contentStart && selEndInLine <= r.contentEnd);
}

function getActiveFormatRangeInLine(line: string, caretInLine: number): FormatRange | null {
  const ranges = getAllFormatRangesInLine(line);
  const matching = ranges.filter(r => caretInLine >= r.contentStart && caretInLine <= r.contentEnd);
  if (matching.length === 0) return null;
  matching.sort((a, b) => (a.contentEnd - a.contentStart) - (b.contentEnd - b.contentStart));
  return matching[0];
}

// Helper functions for path-based DOM node tracking
function getNodePath(root: Node, target: Node): number[] | null {
  if (root === target) return [];
  for (let i = 0; i < root.childNodes.length; i++) {`;

content = content.replace(botchedSection, correctSection);
fs.writeFileSync('src/App.tsx', content);
console.log('Fixed botched section');
