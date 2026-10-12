import { translations } from '../src/locales';

const ukKeys = Object.keys(translations.uk);
const enKeys = Object.keys(translations.en);
const esKeys = Object.keys(translations.es);
const koKeys = Object.keys(translations.ko);

console.log(`Checking translation key counts:`);
console.log(`uk: ${ukKeys.length}`);
console.log(`en: ${enKeys.length}`);
console.log(`es: ${esKeys.length}`);
console.log(`ko: ${koKeys.length}`);

const missingInEn = ukKeys.filter(k => !(k in translations.en));
const missingInEs = ukKeys.filter(k => !(k in translations.es));
const missingInKo = ukKeys.filter(k => !(k in translations.ko));

if (missingInEn.length > 0) console.error('Missing in en:', missingInEn);
if (missingInEs.length > 0) console.error('Missing in es:', missingInEs);
if (missingInKo.length > 0) console.error('Missing in ko:', missingInKo);

if (missingInEn.length === 0 && missingInEs.length === 0 && missingInKo.length === 0) {
  console.log('All 4 locale dictionaries are 100% in sync!');
}
