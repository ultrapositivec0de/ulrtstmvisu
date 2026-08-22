import type { LocaleMeta } from './types';
import { meta as ukMeta, translations as ukTranslations } from './uk';
import { meta as enMeta, translations as enTranslations } from './en';
import { meta as esMeta, translations as esTranslations } from './es';
import { meta as koMeta, translations as koTranslations } from './ko';

export const translations: Record<string, Record<string, string>> = {
  uk: ukTranslations as Record<string, string>,
  en: enTranslations as Record<string, string>,
  es: esTranslations as Record<string, string>,
  ko: koTranslations as Record<string, string>,
};

export const AVAILABLE_LANGUAGES: LocaleMeta[] = [
  ukMeta,
  enMeta,
  esMeta,
  koMeta,
];

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
