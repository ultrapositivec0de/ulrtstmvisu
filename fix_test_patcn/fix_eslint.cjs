const fs = require('fs');
const file = 'src/hooks/useSteemGallery.ts';
let text = fs.readFileSync(file, 'utf-8');

text = text.replace(/setImageUploadAccount\(config.selectedVaultUser/g, '// eslint-disable-next-line\n        setImageUploadAccount(config.selectedVaultUser');
text = text.replace(/parseImages\(savedLinks\);/g, '// eslint-disable-next-line\n      parseImages(savedLinks);');

fs.writeFileSync(file, text);
