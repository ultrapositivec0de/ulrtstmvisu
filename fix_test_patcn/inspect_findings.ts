import fs from 'fs';

const targetFiles = [
  'src/components/modals/PublishModal.tsx',
  'src/components/modals/SettingsModal.tsx',
  'src/components/modals/BaseModal.tsx',
  'src/components/modals/QuickStyleMenu.tsx',
  'src/components/modals/TagGroupsModal.tsx',
  'src/components/modals/TagPresetsModal.tsx',
  'src/components/modals/DraftsModal.tsx',
  'src/components/modals/MentionsModal.tsx',
  'src/components/modals/SystemDialogModal.tsx',
  'src/components/modals/SplitPostModal.tsx',
  'src/components/modals/AccountPromptModal.tsx',
  'src/hooks/useSteemGallery.ts',
  'src/hooks/useAppBackup.ts',
  'src/hooks/useEditorFormat.ts',
  'src/components/common/NotificationToast.tsx',
  'src/components/common/ErrorBoundary.tsx',
  'src/App.tsx'
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

    if (f === 'src/hooks/useSteemGallery.ts' && idx < 25) return;

    const hasLangTernary = /(?:lang|language)\s*===\s*['"]uk['"]/.test(codePart);
    const hasTFallback = /\bt\([^)]+\)\s*\|\|\s*['"`]/.test(codePart);
    const hasCyrillic = /[А-Яа-яІіЇїЄєҐґ]/.test(codePart);
    const hasEnglishAttr = /(?:title|placeholder|aria-label|label)=\s*["'][A-Za-z][^"'{]*["']/.test(codePart);

    if (hasLangTernary || hasTFallback || hasCyrillic || hasEnglishAttr) {
      console.log(`L${idx + 1}: ${trimmed}`);
    }
  });
}
