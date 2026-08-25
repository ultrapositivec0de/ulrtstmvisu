import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/\/\/ Use exact visual viewport metrics if available[\s\S]*?return style;/m, `// Use exact visual viewport metrics if available
                        if (isKeyboardOpen) {
                          // Place exactly at the bottom of the visual viewport (above keyboard)
                          // This works perfectly across old iOS (visual viewport shrinks) and modern Android (layout viewport shrinks)
                          const toolbarHeight = widgetPos === 'bottom' ? 56 : 48; 
                          style.top = (offsetTop + viewportHeight - toolbarHeight - 8) + 'px';
                          style.bottom = 'auto';
                        } else {
                          style.top = 'auto';
                          if (isEditorFullScreen || isFullScreen) {
                            // Bottom nav is hidden in full screen, sit near the bottom
                            style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-bottom-inset, 0px) + 0.5rem)';
                          } else {
                            // Bottom nav is visible, sit above it (4rem height + safe area)
                            style.bottom = 'calc(4rem + env(safe-area-inset-bottom, 0px) + var(--browser-bottom-inset, 0px) + 0.5rem)';
                          }
                        }
                      }
                      
                      return style;`);

fs.writeFileSync('src/App.tsx', content);
