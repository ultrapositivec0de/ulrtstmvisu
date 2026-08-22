import type { LocaleMeta, LocaleModule } from './types';
import { translations as ukTranslations, meta as ukMeta } from './uk';

// Vite eager glob imports all language files in the folder (excluding index and types)
const modules = ((import.meta as any).glob?.(['./*.ts', '!./index.ts', '!./types.ts'], { eager: true }) || {}) as Record<string, LocaleModule>;

export const translations: Record<string, Record<string, string>> = {};
export const AVAILABLE_LANGUAGES: LocaleMeta[] = [];

for (const path in modules) {
  const mod = modules[path];
  const meta = mod.meta || mod.default?.meta;
  const trans = mod.translations || mod.default?.translations;
  if (meta && trans) {
    translations[meta.code] = trans;
    AVAILABLE_LANGUAGES.push(meta);
  }
}

// Fallback to uk if glob is empty
if (AVAILABLE_LANGUAGES.length === 0) {
  translations['uk'] = ukTranslations;
  AVAILABLE_LANGUAGES.push(ukMeta);
}

// Sort languages: Ukrainian (uk) first, then alphabetical by label
AVAILABLE_LANGUAGES.sort((a, b) => {
  if (a.code === 'uk') return -1;
  if (b.code === 'uk') return 1;
  return a.label.localeCompare(b.label);
});

export type TranslationKey = keyof typeof ukTranslations;
export type Language = string;

export function getTranslation(lang: string, key: TranslationKey): string {
  const dict = translations[lang] || translations['uk'];
  return dict?.[key] || (translations['uk'] as any)?.[key] || key;
}

export * from './types';
