const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `          if (saveFn && writeFn) {
            const ext = defaultFilename.split('.').pop() || '*';
            const filePath = await saveFn({
              defaultPath: defaultFilename,
              filters: [{
                name: 'Files',
                extensions: [ext]
              }]
            });
            
            if (filePath) {
              const buffer = await blob.arrayBuffer();
              await writeFn(filePath, new Uint8Array(buffer));
              return true;
            }
            return false;
          }`;

const replStr = `          if (saveFn && writeFn) {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // On mobile Tauri, dialog.save might not be supported and returns null.
            // Let's attempt it, but if it returns null, we'll fall through to standard web download.
            // Actually, if it's explicitly mobile, let's just fall through to the Web Blob download
            // because Tauri WebView on Android typically intercepts download attributes perfectly if configured,
            // or we at least want to fire the <a> tag fallback.
            let filePath = null;
            if (!isMobile) {
              filePath = await saveFn({
                defaultPath: defaultFilename,
                filters: [{
                  name: 'Files',
                  extensions: [ext]
                }]
              });
              
              if (filePath) {
                const buffer = await blob.arrayBuffer();
                await writeFn(filePath, new Uint8Array(buffer));
                return true;
              }
              // User cancelled desktop dialog, don't fall through
              return false;
            }
          }`;

const extTarget = `const ext = defaultFilename.split('.').pop() || '*';`;
const newTarget = targetStr.replace("const ext", "const ext");

content = content.replace(targetStr, replStr);
fs.writeFileSync('src/App.tsx', content);
console.log('Fixed Tauri save fallback');
