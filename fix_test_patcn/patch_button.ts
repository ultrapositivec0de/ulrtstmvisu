import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/<button\s+key=\{pos\.id\}\s+onClick=\{\(\) => \{\s+setWidgetPos\(pos\.id as any\);/g, `<button
                              key={pos.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setWidgetPos(pos.id as any);`);

fs.writeFileSync('src/App.tsx', content);
