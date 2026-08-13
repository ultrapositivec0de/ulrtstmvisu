import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');

const updatedCode = code.replace(
  /performanceMode && "perf-mode"\n\s*\)\}>/,
  'performanceMode && "perf-mode"\n    )} style={{ height: viewportHeight > 0 ? `${viewportHeight}px` : "100dvh" }}>'
);

fs.writeFileSync('src/App.tsx', updatedCode);
console.log("Updated root style");
