import fs from 'fs';
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes('exportMd') || line.includes('download') || line.includes('Blob') || line.includes('showSaveFilePicker')) {
    if (!line.includes('translations') && !line.includes('translations[') && !line.includes('downloadMd:')) {
      console.log(`${i+1}: ${line.trim()}`);
    }
  }
});
