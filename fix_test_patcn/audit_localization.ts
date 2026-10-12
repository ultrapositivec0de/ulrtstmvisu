import fs from 'fs';
import path from 'path';
import { translations } from '../src/locales';

function walk(dir: string, fileList: string[] = []): string[] {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'locales', 'chunks'].includes(file)) {
        walk(full, fileList);
      }
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.bak')) {
      fileList.push(full);
    }
  }
  return fileList;
}

const files = walk('src');

interface Finding {
  line: number;
  type: 'cyrillic_hardcoded' | 'lang_ternary' | 't_fallback' | 'english_ui_attr';
  snippet: string;
}

const fileReports: { file: string; findings: Finding[] }[] = [];

// Files where Cyrillic is part of core non-UI logic (transliteration table, physical keyboard layout map, cursor sync regex)
const nonUiRegexFiles = new Set([
  'src/lib/editorSync.ts',
  'src/lib/cursorSync.ts',
]);

for (const f of files) {
  if (nonUiRegexFiles.has(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  const findings: Finding[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    const codePart = line.replace(/\/\/.*$/, '');
    if (!codePart.trim()) return;

    // Skip transliteration map lines or keyboard char array lines
    if (f === 'src/hooks/useSteemGallery.ts' && idx < 25) return;
    if (f === 'src/services/audio/SoundSynthEngine.ts' && idx >= 140 && idx <= 150) return;
    if (f === 'src/services/audio/keyboardMap.ts') return;

    const hasLangTernary = /(?:lang|language)\s*===\s*['"]uk['"]/.test(codePart);
    const hasTFallback = /\bt\([^)]+\)\s*\|\|\s*['"`]/.test(codePart);
    const hasCyrillic = /[А-Яа-яІіЇїЄєҐґ]/.test(codePart);
    const hasEnglishAttr = /(?:title|placeholder|aria-label|label)=\s*["'][A-Za-z][^"'{]*["']/.test(codePart);

    if (hasLangTernary) {
      findings.push({ line: idx + 1, type: 'lang_ternary', snippet: trimmed.slice(0, 140) });
    } else if (hasTFallback) {
      findings.push({ line: idx + 1, type: 't_fallback', snippet: trimmed.slice(0, 140) });
    } else if (hasCyrillic) {
      findings.push({ line: idx + 1, type: 'cyrillic_hardcoded', snippet: trimmed.slice(0, 140) });
    } else if (hasEnglishAttr) {
      findings.push({ line: idx + 1, type: 'english_ui_attr', snippet: trimmed.slice(0, 140) });
    }
  });

  if (findings.length > 0) {
    fileReports.push({ file: f, findings });
  }
}

fileReports.sort((a, b) => b.findings.length - a.findings.length);

// Check locale key synchronization across uk, en, es, ko
const ukKeys = Object.keys(translations.uk);
const langs = ['en', 'es', 'ko'];
console.log('=== LOCALE DICTIONARY SYNC CHECK ===');
console.log(`uk keys: ${ukKeys.length}`);
for (const l of langs) {
  const dict = translations[l] || {};
  const lKeys = Object.keys(dict);
  const missing = ukKeys.filter(k => !(k in dict));
  const extra = lKeys.filter(k => !(k in translations.uk));
  console.log(`${l} keys: ${lKeys.length} | missing vs uk: ${missing.length} | extra vs uk: ${extra.length}`);
  if (missing.length > 0) console.log(`  Missing in ${l}: ${missing.join(', ')}`);
}

// Check for t('key') calls in codebase that are missing from translations.uk
const missingTKeys = new Set<string>();
const tKeyUsageFiles: Record<string, string[]> = {};
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /\bt\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const key = m[1];
    if (!(key in translations.uk)) {
      missingTKeys.add(key);
      if (!tKeyUsageFiles[key]) tKeyUsageFiles[key] = [];
      if (!tKeyUsageFiles[key].includes(f)) tKeyUsageFiles[key].push(f);
    }
  }
}

console.log(`\n=== MISSING t('...') KEYS IN uk.ts (${missingTKeys.size}) ===`);
for (const k of missingTKeys) {
  console.log(`  ${k} (used in: ${tKeyUsageFiles[k].join(', ')})`);
}

console.log(`\n=== SUMMARY OF UNLOCALIZED FILES (${fileReports.length} files) ===`);
let totalCyrillic = 0, totalTernary = 0, totalFallback = 0, totalEngAttr = 0;
for (const r of fileReports) {
  const c = r.findings.filter(x => x.type === 'cyrillic_hardcoded').length;
  const lt = r.findings.filter(x => x.type === 'lang_ternary').length;
  const tf = r.findings.filter(x => x.type === 't_fallback').length;
  const ea = r.findings.filter(x => x.type === 'english_ui_attr').length;
  totalCyrillic += c;
  totalTernary += lt;
  totalFallback += tf;
  totalEngAttr += ea;
  console.log(`${r.file.padEnd(48)} | Total: ${String(r.findings.length).padStart(2)} (HardcodedUK: ${c}, LangTernary: ${lt}, tFallback: ${tf}, EngAttr: ${ea})`);
}
console.log(`\nGRAND TOTAL: ${totalCyrillic + totalTernary + totalFallback + totalEngAttr} findings across ${fileReports.length} files`);
console.log(`  - Pure Hardcoded Ukrainian strings: ${totalCyrillic}`);
console.log(`  - Inline binary ternaries (lang === 'uk' ? ... : ...): ${totalTernary}`);
console.log(`  - Inline fallbacks (t('...') || '...'): ${totalFallback}`);
console.log(`  - Hardcoded English UI attributes (title/placeholder/aria-label): ${totalEngAttr}`);
