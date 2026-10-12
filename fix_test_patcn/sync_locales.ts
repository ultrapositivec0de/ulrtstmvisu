import fs from 'fs';
import { translations as ukTranslations } from '../src/locales/uk';
import { translations as enTranslations } from '../src/locales/en';
import { translations as esTranslations } from '../src/locales/es';
import { translations as koTranslations } from '../src/locales/ko';

const ukKeys = Object.keys(ukTranslations);

function syncLocale(lang: 'es' | 'ko', existing: Record<string, string>, filePath: string) {
  const missing = ukKeys.filter(k => !(k in existing));
  console.log(`${lang} missing keys count: ${missing.length}`);
  if (missing.length === 0) return;

  // Read file and insert missing keys before the closing object bracket
  const content = fs.readFileSync(filePath, 'utf8');
  const insertIndex = content.lastIndexOf('} as const;');
  if (insertIndex === -1) {
    console.error(`Could not find '} as const;' in ${filePath}`);
    return;
  }

  const newLines = missing.map(key => {
    // Prefer English translation as base for ES/KO fallback
    const val = (enTranslations as any)[key] || (ukTranslations as any)[key] || key;
    return `  ${JSON.stringify(key)}: ${JSON.stringify(val)},`;
  }).join('\n');

  const updated = content.slice(0, insertIndex) + newLines + '\n' + content.slice(insertIndex);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`Updated ${filePath} with ${missing.length} keys.`);
}

syncLocale('es', esTranslations, 'src/locales/es.ts');
syncLocale('ko', koTranslations, 'src/locales/ko.ts');
