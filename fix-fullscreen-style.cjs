const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// For the Editor Fullscreen
const targetEditor = `<div 
              ref={editorPaneRef}
              className={cn(
                "flex-1 flex flex-col min-w-0 border-r border-slate-800 transition-all relative",
                activeMobileTab !== 'editor' && "hidden lg:flex",
                isEditorFullScreen && "bg-slate-950 p-0 fixed top-0 left-0 right-0 z-[250]"
              )}`;

const replEditor = `<div 
              ref={editorPaneRef}
              style={isEditorFullScreen ? { height: vvHeight ? \`\${vvHeight}px\` : '100dvh' } : {}}
              className={cn(
                "flex-1 flex flex-col min-w-0 border-r border-slate-800 transition-all relative",
                activeMobileTab !== 'editor' && "hidden lg:flex",
                isEditorFullScreen && "bg-slate-950 p-0 fixed top-0 left-0 right-0 z-[250]"
              )}`;

content = content.replace(targetEditor, replEditor);

// For the Preview Fullscreen
const targetPreview = `<div 
              className={cn(
                "flex-1 flex flex-col min-w-0 overflow-hidden relative",
                activeMobileTab !== 'preview' && "hidden lg:flex"
              )}
            >
              {/* Preview Container */}
              <div 
                ref={previewRef}
                className={cn(
                "flex-1 overflow-y-auto bg-white dark:bg-slate-900 transition-all preview-container rounded-none lg:rounded-tl-2xl lg:rounded-bl-2xl shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]",
                isFullScreen && "bg-slate-950 p-4 lg:p-12 overflow-y-auto fixed top-0 left-0 right-0 z-[250]"
              )}`;

const replPreview = `<div 
              className={cn(
                "flex-1 flex flex-col min-w-0 overflow-hidden relative",
                activeMobileTab !== 'preview' && "hidden lg:flex"
              )}
            >
              {/* Preview Container */}
              <div 
                ref={previewRef}
                style={isFullScreen ? { height: vvHeight ? \`\${vvHeight}px\` : '100dvh' } : {}}
                className={cn(
                "flex-1 overflow-y-auto bg-white dark:bg-slate-900 transition-all preview-container rounded-none lg:rounded-tl-2xl lg:rounded-bl-2xl shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]",
                isFullScreen && "bg-slate-950 p-4 lg:p-12 overflow-y-auto fixed top-0 left-0 right-0 z-[250]"
              )}`;

content = content.replace(targetPreview, replPreview);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed fullscreen heights.');
