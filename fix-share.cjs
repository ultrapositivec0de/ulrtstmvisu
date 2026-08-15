const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `      // 5. STANDARD WEB DOWNLOAD FALLBACK (Anchor element tag)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;`;

const replStr = `      // 5. NATIVE SHARE FALLBACK FOR MOBILE (Android/iOS)
      // This allows the user to choose where to save the file using the OS Share sheet
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        const file = new File([blob], defaultFilename, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: defaultFilename
            });
            return true;
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') return false; // User cancelled
            console.warn("Share API failed, falling back to download:", shareErr);
          }
        }
      }

      // 6. STANDARD WEB DOWNLOAD FALLBACK (Anchor element tag)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;`;

content = content.replace(targetStr, replStr);
fs.writeFileSync('src/App.tsx', content);
console.log('Added navigator.share fallback');
