import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add lastKeyboardToggleTimeRef and handleWidgetAction
if (!content.includes('lastKeyboardToggleTimeRef = useRef')) {
  content = content.replace(
    /const widgetRef = useRef<HTMLDivElement>\(null\);/g,
    `const widgetRef = useRef<HTMLDivElement>(null);
  const lastKeyboardToggleTimeRef = useRef<number>(0);

  useEffect(() => {
    lastKeyboardToggleTimeRef.current = Date.now();
  }, [isKeyboardOpen]);

  const handleWidgetAction = useCallback((actionFn: () => void) => {
    if (Date.now() - lastKeyboardToggleTimeRef.current < 250) {
      return;
    }
    actionFn();
  }, []);`
  );
}

// 2. Update widget positioning logic inside App.tsx
const oldPositioningTarget = /\/\/ Use exact visual viewport metrics if available[\s\S]*?return style;/m;
const newPositioning = `// Position relative to dynamic visual viewport metrics
                        style.transition = 'top 0.15s cubic-bezier(0.2, 0, 0.2, 1)';
                        const actualWidgetHeight = widgetRef.current?.offsetHeight || (toolbarIconSize + 28);
                        const visualBottom = offsetTop + viewportHeight;

                        if (isKeyboardOpen) {
                          // Place exactly 8px above virtual keyboard top edge
                          const targetTop = visualBottom - actualWidgetHeight - 8;
                          style.top = \`\${targetTop}px\`;
                          style.bottom = 'auto';
                        } else {
                          // Place above bottom navigation bar or screen bottom
                          const bottomNavOffset = (isEditorFullScreen || isFullScreen) ? 12 : 72;
                          const targetTop = visualBottom - actualWidgetHeight - bottomNavOffset;
                          style.top = \`\${targetTop}px\`;
                          style.bottom = 'auto';
                        }
                      }
                      
                      return style;`;

content = content.replace(oldPositioningTarget, newPositioning);

// 3. Wrap tool.action with handleWidgetAction
content = content.replace(
  /onClick=\{tool\.action\}/g,
  'onClick={() => handleWidgetAction(tool.action)}'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully patched src/App.tsx');
