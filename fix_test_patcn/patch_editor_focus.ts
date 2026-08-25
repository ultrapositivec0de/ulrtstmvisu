import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Patch Markdown editor onFocus
content = content.replace(
  /onFocus=\{\(\) => \{\s*setIsEditorFocused\(true\);\s*saveCursorPosition\(\);/g,
  `onFocus={() => {
                    setIsEditorFocused(true);
                    saveCursorPosition();
                    if (widgetPos !== 'hidden') setIsWidgetVisible(true);`
);

// Patch WYSIWYG editor onFocus
content = content.replace(
  /onFocus=\{\(\) => \{\s*setIsEditorFocused\(true\);\s*saveVisualSelection\(\);/g,
  `onFocus={() => {
                    setIsEditorFocused(true);
                    saveVisualSelection();
                    if (widgetPos !== 'hidden') setIsWidgetVisible(true);`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully updated editor onFocus in src/App.tsx');
