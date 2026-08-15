const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/style=\{\{ height: isEditorFullScreen \? \(vvHeight \? `\$\{vvHeight\}px` : '100dvh'\) : 'auto' \}\}\n              className=\{cn\(/g, 'className={cn(');
fs.writeFileSync('src/App.tsx', content);
