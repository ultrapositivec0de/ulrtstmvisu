import { sanitizeFilename } from '../src/hooks/gallery/useImageUploadPipeline';
import { sanitizeFilename as reexportedSanitize } from '../src/hooks/useSteemGallery';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing Gallery Decomposition...\n');

// 1. Test sanitizeFilename
console.log('1. Testing sanitizeFilename:');
assert(typeof sanitizeFilename === 'function', 'sanitizeFilename is a function');
assert(sanitizeFilename === reexportedSanitize, 'sanitizeFilename is correctly re-exported by useSteemGallery');

const ukrTest = sanitizeFilename('Мій Допис Картинка.PNG');
console.log(`  "Мій Допис Картинка.PNG" -> "${ukrTest}"`);
assert(ukrTest.startsWith('miy_dopys_kartynka'), 'Cyrillic transliterated properly');
assert(ukrTest.endsWith('.PNG'), 'Extension preserved');

const specialChars = sanitizeFilename('test file @ # $ % ^ & * ( ) ! .jpg');
console.log(`  "test file @ # $ % ^ & * ( ) ! .jpg" -> "${specialChars}"`);
assert(!specialChars.includes(' '), 'Spaces replaced with underscores');
assert(!specialChars.includes('@'), 'Special chars stripped');
assert(specialChars.endsWith('.jpg'), 'Extension preserved');

// 2. Verify sub-hook imports
console.log('\n2. Testing sub-hook module imports:');
import('../src/hooks/gallery/useStockPhotos').then(mod => {
  assert(typeof mod.useStockPhotos === 'function', 'useStockPhotos is exported as function');
});

import('../src/hooks/gallery/useGalleryLayoutMarkup').then(mod => {
  assert(typeof mod.useGalleryLayoutMarkup === 'function', 'useGalleryLayoutMarkup is exported as function');
});

import('../src/hooks/gallery/useImageUploadPipeline').then(mod => {
  assert(typeof mod.useImageUploadPipeline === 'function', 'useImageUploadPipeline is exported as function');
});

import('../src/hooks/useSteemGallery').then(mod => {
  assert(typeof mod.useSteemGallery === 'function', 'useSteemGallery composite hook is exported as function');
  console.log('\nAll Gallery Decomposition checks passed successfully!');
});
