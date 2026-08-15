const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/promptDialog\(t\('enterPin'\)\)/g, "promptDialog(t('enterPin'), '', undefined, 'password')");
fs.writeFileSync('src/App.tsx', content);
