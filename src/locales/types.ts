export interface LocaleMeta {
  code: string;
  label: string;
  nativeName: string;
  flag?: string;
}

export type TranslationDictionary = Record<string, string>;

export interface LocaleModule {
  meta: LocaleMeta;
  translations: Record<string, string>;
  default?: {
    meta: LocaleMeta;
    translations: Record<string, string>;
  };
}
