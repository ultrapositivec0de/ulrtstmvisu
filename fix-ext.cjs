const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `            let filePath = null;
            if (!isMobile) {
              filePath = await saveFn({
                defaultPath: defaultFilename,
                filters: [{
                  name: 'Files',
                  extensions: [ext]
                }]
              });`;

const repl = `            let filePath = null;
            if (!isMobile) {
              const ext = defaultFilename.split('.').pop() || '*';
              filePath = await saveFn({
                defaultPath: defaultFilename,
                filters: [{
                  name: 'Files',
                  extensions: [ext]
                }]
              });`;

content = content.replace(target, repl);
fs.writeFileSync('src/App.tsx', content);
