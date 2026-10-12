import fs from 'fs';

const targetFiles = [
  'src/components/header/Header.tsx',
  'src/hooks/usePublishingManager.ts',
  'src/hooks/useSteemQueue.ts',
  'src/components/docReader/useDocReader.ts',
  'src/components/editor/TamedWidget.tsx',
  'src/components/editor/EditorPane.tsx',
  'src/components/docReader/DocReaderContent.tsx'
];

for (const f of targetFiles) {
  if (!fs.existsSync(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== FILE: ${f} ===`);
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    const codePart = line.replace(/\/\/.*$/, '');
    if (!codePart.trim()) return;

    const hasLangTernary = /(?:lang|language)\s*===\s*['"]uk['"]/.test(codePart);
    const hasTFallback = /\bt\([^)]+\)\s*\|\|\s*['"`]/.test(codePart);
    const hasCyrillic = /[А-Яа-яІіЇїЄєҐґ]/.test(codePart);
    const hasEnglishAttr = /(?:title|placeholder|aria-label|label)=\s*["'][A-Za-z][^"'{]*["']/.test(codePart);

    if (hasLangTernary || hasTFallback || hasCyrillic || hasEnglishAttr) {
      console.log(`L${idx + 1}: ${trimmed}`);
    }
  });
}
