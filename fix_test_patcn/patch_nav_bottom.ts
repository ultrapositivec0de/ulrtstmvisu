import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace bottom: 'var(--browser-bottom-inset, 0px)' with bottom: 0 in the mobile navigation
content = content.replace(/bottom:\s*'var\(--browser-bottom-inset, 0px\)',\s*paddingBottom:\s*'env\(safe-area-inset-bottom, 0px\)',/g, `bottom: 0,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',`);

fs.writeFileSync('src/App.tsx', content);
