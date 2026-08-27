import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace mini gallery style
const targetGalleryStyle = `style={{
                      bottom: window.innerWidth < 1024
                        ? (isKeyboardOpen 
                            ? \`calc(\${keyboardOffset > 0 ? keyboardOffset : 0}px + var(--toolbar-btn-size, 3rem) + 0.35rem)\` 
                            : (isEditorFullScreen || isFullScreen 
                                ? 'calc(env(safe-area-inset-bottom, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)' 
                                : 'calc(4rem + env(safe-area-inset-bottom, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)'))
                        : (widgetPos === 'bottom' ? 'calc(4.5rem)' : undefined)
                    }}`;

const replacementGalleryStyle = `style={getMiniGalleryStyle({ isKeyboardOpen, isEditorFullScreen, isFullScreen, widgetPos, keyboardOffset })}`;

content = content.replace(targetGalleryStyle, replacementGalleryStyle);
fs.writeFileSync('src/App.tsx', content);
console.log('Updated mini gallery style');
