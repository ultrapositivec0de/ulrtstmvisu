import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/\{isWidgetVisible && widgetPos !== 'hidden'/g, "{(isWidgetVisible || widgetPos === 'bottom') && widgetPos !== 'hidden'");

fs.writeFileSync('src/App.tsx', content);
