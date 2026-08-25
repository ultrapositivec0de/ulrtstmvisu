import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/\} else if \(window\.innerWidth < 1024\) \{[\s\S]*?return style;/m, `} else if (window.innerWidth < 1024) {
                        style.position = 'fixed';
                        style.left = '0.5rem';
                        style.right = '0.5rem';
                        style.margin = '0 auto';
                        style.zIndex = 150;
                        
                        // Use exact visual viewport metrics if available
                        if (offsetTop > 0 || viewportHeight < window.innerHeight) {
                          // Place exactly at the bottom of the visual viewport
                          const toolbarHeight = 56; // approximate toolbar height
                          // If full screen, rest above the safe area
                          const bottomSafe = (isEditorFullScreen || isFullScreen) && !isKeyboardOpen ? 20 : 8;
                          style.top = (offsetTop + viewportHeight - toolbarHeight - bottomSafe) + 'px';
                          style.bottom = 'auto';
                        } else {
                          style.top = 'auto';
                          if (isKeyboardOpen) {
                            style.bottom = \`calc(\${keyboardOffset > 0 ? keyboardOffset : 0}px + var(--browser-bottom-inset, 0px) + 0.5rem)\`;
                          } else if (isEditorFullScreen || isFullScreen) {
                            style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-bottom-inset, 0px) + 0.5rem)';
                          } else {
                            style.bottom = 'calc(4rem + env(safe-area-inset-bottom, 0px) + var(--browser-bottom-inset, 0px) + 0.5rem)';
                          }
                        }
                      }
                      
                      return style;`);

fs.writeFileSync('src/App.tsx', content);
