/**
 * Stage 5 Audio Synth Engine & Voice Pool Validation Suite
 */
import { BUILTIN_PRESETS, validateSoundPreset } from '../src/services/audio/presets';
import {
  CARILLON_BELL_LUT,
  CATHEDRAL_BELL_LUT,
  SHCHEDRYK_BELL_LUT,
  getUniqueKeyIndex,
  getUniqueKeyPitchOffset
} from '../src/services/audio/keyboardMap';
import { xorshift32 } from '../src/services/audio/AudioContextManager';

console.log('=== STAGE 5 AUDIO ENGINE VALIDATION ===\n');

// 1. Validate all Built-in Presets
console.log('--- 1. Testing Built-in Presets ---');
let presetErrors = 0;
for (const preset of BUILTIN_PRESETS) {
  const res = validateSoundPreset(preset);
  if (!res.valid) {
    console.error(`❌ Preset validation failed for: ${preset.id} (${preset.name}) -> ${res.error}`);
    presetErrors++;
  } else {
    console.log(`✅ Preset [${preset.id}] "${preset.name}" (mode: ${preset.synthesisMode || 'standard'}) is valid.`);
  }
}

if (presetErrors === 0) {
  console.log(`\n🎉 All ${BUILTIN_PRESETS.length} presets validated successfully!\n`);
} else {
  console.error(`\n❌ Failed presets: ${presetErrors}\n`);
  process.exit(1);
}

// 2. Validate Lookup Tables (LUT)
console.log('--- 2. Testing Float32Array Lookup Tables ---');
const luts = [
  { name: 'CARILLON_BELL_LUT', lut: CARILLON_BELL_LUT, minLen: 40 },
  { name: 'CATHEDRAL_BELL_LUT', lut: CATHEDRAL_BELL_LUT, minLen: 40 },
  { name: 'SHCHEDRYK_BELL_LUT', lut: SHCHEDRYK_BELL_LUT, minLen: 40 }
];

for (const { name, lut, minLen } of luts) {
  if (!(lut instanceof Float32Array)) {
    throw new Error(`${name} is not a Float32Array!`);
  }
  if (lut.length < minLen) {
    throw new Error(`${name} length (${lut.length}) is below minimum (${minLen})`);
  }
  for (let i = 0; i < lut.length; i++) {
    const val = lut[i];
    if (isNaN(val) || !isFinite(val) || val <= 20 || val >= 20000) {
      throw new Error(`Invalid frequency in ${name} at index ${i}: ${val}`);
    }
  }
  console.log(`✅ ${name}: ${lut.length} steps, min=${lut[0]}Hz, max=${lut[lut.length - 1]}Hz.`);
}
console.log('');

// 3. Validate Key Character Mapping & Ukrainian Alphabet Resolution
console.log('--- 3. Testing Ukrainian Cyrillic & Latin Key Resolution ---');
const ukrAlphabet = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'.split('');
const ukrIndices = ukrAlphabet.map(char => getUniqueKeyIndex(char, ''));
const uniqueUkrCount = new Set(ukrIndices).size;
console.log(`Ukrainian 33 letters mapped to ${uniqueUkrCount}/33 distinct key indices.`);
if (uniqueUkrCount !== 33) {
  throw new Error(`Ukrainian Cyrillic letter mapping has collision: ${uniqueUkrCount} vs 33 expected`);
}

const specialKeys = ['Backspace', 'Enter', 'Space', 'Tab', 'KeyA', 'Digit1', '.', ',', '!'];
for (const k of specialKeys) {
  const idx = getUniqueKeyIndex(k, k);
  const offset = getUniqueKeyPitchOffset(k, k);
  if (isNaN(idx) || isNaN(offset)) {
    throw new Error(`NaN generated for key: ${k}`);
  }
}
console.log('✅ Special keys & punctuation key indices resolved correctly.\n');

// 4. Test Xorshift32 PRNG distribution
console.log('--- 4. Testing Xorshift32 PRNG ---');
let minVal = 1;
let maxVal = 0;
const iterations = 50000;
for (let i = 0; i < iterations; i++) {
  const r = xorshift32();
  if (r < minVal) minVal = r;
  if (r > maxVal) maxVal = r;
  if (r < 0 || r >= 1 || isNaN(r)) {
    throw new Error(`Xorshift32 output out of bounds [0, 1): ${r}`);
  }
}
console.log(`✅ Xorshift32 verified across ${iterations} iterations: range [${minVal.toFixed(4)}, ${maxVal.toFixed(4)}].\n`);

console.log('🎉 STAGE 5 VALIDATION SUITE PASSED ALL CHECKS!');
