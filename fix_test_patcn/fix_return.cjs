const fs = require('fs');
let file = 'src/hooks/useSteemGallery.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace('isUploading,\n    imageUploadAccount,', 'isUploading,\n    setIsUploading,\n    imageUploadAccount,');
content = content.replace('isSearchingPexels,\n    pexelsResults,', 'isSearchingPexels,\n    setIsSearchingPexels,\n    pexelsResults,');

fs.writeFileSync(file, content);
