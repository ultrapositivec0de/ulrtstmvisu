import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add import for useWidgetViewportLayout and getEditorBottomPadding, getMiniGalleryStyle
if (!content.includes('useWidgetViewportLayout')) {
  content = content.replace(
    /import { useVisualViewport } from '\.\/hooks\/useVisualViewport';/,
    `import { useVisualViewport } from './hooks/useVisualViewport';\nimport { useWidgetViewportLayout, getEditorBottomPadding, getMiniGalleryStyle } from './hooks/useWidgetViewportLayout';`
  );
}

// 2. Clean up redundant lastKeyboardToggleTimeRef and handleWidgetAction from App.tsx (now inside hook)
content = content.replace(
  /const lastKeyboardToggleTimeRef = useRef<number>\(0\);[\s\S]*?actionFn\(\);\s*\}, \[\]\);/m,
  ''
);

// 3. Add useWidgetViewportLayout hook invocation right after widgetRef declaration
if (!content.includes('const { widgetStyle, handleWidgetAction } = useWidgetViewportLayout')) {
  content = content.replace(
    /const widgetRef = useRef<HTMLDivElement>\(null\);/,
    `const widgetRef = useRef<HTMLDivElement>(null);
  const { widgetStyle, handleWidgetAction } = useWidgetViewportLayout({
    widgetPos,
    floatingPos,
    editorPaneRef,
    widgetRef,
    toolbarIconSize,
    offsetTop,
    viewportHeight,
    isKeyboardOpen,
    isEditorFullScreen,
    isFullScreen,
  });`
  );
}

// 4. Simplify padding calculations in editor scroll & tab change callbacks
content = content.replace(
  /const dynamicPaddingBottom = isMobileScreen \? \(isKeyboardOpen \? \(dynamicWidgetHeight \+ 45\) : \(dynamicWidgetHeight \+ 90\)\) : 80;/g,
  `const dynamicPaddingBottom = getEditorBottomPadding(isMobileScreen, isKeyboardOpen, widgetPos, dynamicWidgetHeight);`
);
content = content.replace(
  /\(isKeyboardOpen \? \(dynamicWidgetHeight \+ 45\) : \(dynamicWidgetHeight \+ 90\)\)/g,
  `getEditorBottomPadding(isMobileScreen, isKeyboardOpen, widgetPos, dynamicWidgetHeight)`
);

// 5. Replace inline mini gallery style calculation with getMiniGalleryStyle
const miniGalleryRegex = /style=\{\{\s*bottom: window\.innerWidth < 1024[\s\S]*?right: '0\.5rem'\s*\}\}/m;
if (miniGalleryRegex.test(content)) {
  content = content.replace(
    miniGalleryRegex,
    `style={getMiniGalleryStyle({ isKeyboardOpen, isEditorFullScreen, isFullScreen })}`
  );
}

// 6. Replace inline widget style calculation with widgetStyle
const widgetStyleInlineRegex = /style=\{\(\(\) => \{[\s\S]*?return style;\s*\}\)\(\)\}/m;
if (widgetStyleInlineRegex.test(content)) {
  content = content.replace(
    widgetStyleInlineRegex,
    `style={widgetStyle}`
  );
}

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx successfully refactored');
