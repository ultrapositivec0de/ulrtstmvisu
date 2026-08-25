import fs from 'fs';

let content = fs.readFileSync('src/hooks/useVisualViewport.ts', 'utf8');

// Ensure resetScrollOffsets is called on all viewport changes
content = content.replace(/browserBottomInset = !isKeyboardOpen && rawOverlayDiff > 0 \? rawOverlayDiff : 0;/g, 'browserBottomInset = 0;');

fs.writeFileSync('src/hooks/useVisualViewport.ts', content);
console.log('Updated src/hooks/useVisualViewport.ts');
