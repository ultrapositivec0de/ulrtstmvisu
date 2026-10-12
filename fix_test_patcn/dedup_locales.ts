import fs from 'fs';
import { meta as ukMeta, translations as ukRaw } from '../src/locales/uk';
import { meta as enMeta, translations as enRaw } from '../src/locales/en';
import { meta as esMeta, translations as esRaw } from '../src/locales/es';
import { meta as koMeta, translations as koRaw } from '../src/locales/ko';

function writeCleanLocaleFile(filePath: string, meta: any, transObj: Record<string, string>) {
  const keys = Object.keys(transObj);
  let content = `import type { LocaleMeta } from './types';\n\n`;
  content += `export const meta: LocaleMeta = ${JSON.stringify(meta, null, 2)};\n\n`;
  content += `export const translations = {\n`;
  for (const k of keys) {
    content += `  ${JSON.stringify(k)}: ${JSON.stringify(transObj[k])},\n`;
  }
  content += `} as const;\n\nexport default { meta, translations };\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Wrote clean deduplicated ${filePath} with ${keys.length} keys.`);
}

writeCleanLocaleFile('src/locales/uk.ts', ukMeta, ukRaw);
writeCleanLocaleFile('src/locales/en.ts', enMeta, enRaw);
writeCleanLocaleFile('src/locales/es.ts', esMeta, esRaw);
writeCleanLocaleFile('src/locales/ko.ts', koMeta, koRaw);
