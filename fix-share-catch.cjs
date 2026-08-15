const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `    } catch (err: any) {
      console.error("All save operations failed, using fallback:", err);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }`;

const replStr = `    } catch (err: any) {
      console.error("All save operations failed, using fallback:", err);
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
            console.warn("Share API failed in catch:", shareErr);
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }`;

content = content.replace(targetStr, replStr);
fs.writeFileSync('src/App.tsx', content);
console.log('Fixed catch block');
