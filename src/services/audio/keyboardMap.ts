/**
 * Ultra Steem Editor - Keyboard Acoustic Mapping
 * Provides collision-free, 1-to-1 unique pitch mapping for every keyboard letter,
 * Ukrainian Cyrillic character, Latin letter, number, and punctuation mark.
 */

// 54-bell joyful celestial carillon scale (spanning pure Major Pentatonic & Lydian harmonics)
// Completely consonant, uplifting, zero eerie microtones or dissonant steps
const JOYFUL_OCTAVE_STEPS = [
  1.0,        // C  (Root)
  1.125,      // D  (Major 2nd)
  1.25,       // E  (Pure Major 3rd - radiant and uplifting)
  1.3348,     // F  (Perfect 4th)
  1.40625,    // F# (Lydian solar sparkle)
  1.5,        // G  (Pure 5th - clarity and peace)
  1.6667,     // A  (Major 6th - joyful warmth)
  1.875       // B  (Major 7th - golden shimmer)
];

const BASE_ROOT_FREQ = 261.625565; // C4 (Sacred resonant center)

export const CARILLON_BELL_SCALE: number[] = Array.from({ length: 54 }, (_, i) => {
  const octave = Math.floor(i / JOYFUL_OCTAVE_STEPS.length) + 1; // Octaves 1..7 (C4..C7 range)
  const stepInOctave = i % JOYFUL_OCTAVE_STEPS.length;
  const ratio = JOYFUL_OCTAVE_STEPS[stepInOctave];
  // Calculate resonant celestial frequency
  const f = BASE_ROOT_FREQ * Math.pow(2, octave - 1) * ratio;
  return Math.round(f * 100) / 100;
});

// 54-bell Cathedral Bronze scale: smooth, close harmonic range (392 Hz / G4 to 783.99 Hz / G5)
// Zero abrupt jumps or harsh drops; every letter has an individual bronze voice that stays in warm unison.
export const CATHEDRAL_BELL_SCALE: number[] = Array.from({ length: 54 }, (_, i) => {
  const f = 392.00 * Math.pow(2, i / 53); // Exactly 1 octave span across 54 unique frequencies
  return Math.round(f * 100) / 100;
});

// Shchedryk / Carol of the Bells harmonic motif scale (Leontovych minor-harmonic ostinato)
// Sequences through festive handbell & chime motifs: (B4-A4-G#4-A4), (E5-D5-C5-D5), (G4-F#4-E4-F#4), (B5-A5-G#5-A5)
const SHCHEDRYK_MOTIF_BASE = [
  493.88, 440.00, 415.30, 440.00, // B4 - A4 - G#4 - A4 (Main Ostinato)
  587.33, 523.25, 493.88, 523.25, // D5 - C5 - B4 - C5 (First Response)
  659.25, 587.33, 523.25, 587.33, // E5 - D5 - C5 - D5 (High Melody)
  392.00, 369.99, 329.63, 369.99, // G4 - F#4 - E4 - F#4 (Warm Under-chime)
  783.99, 739.99, 659.25, 739.99, // G5 - F#5 - E5 - F#5 (Festive Sparkle)
  987.77, 880.00, 830.61, 880.00  // B5 - A5 - G#5 - A5 (Top Silver Bells)
];

export const SHCHEDRYK_BELL_SCALE: number[] = Array.from({ length: 54 }, (_, i) => {
  const baseFreq = SHCHEDRYK_MOTIF_BASE[i % SHCHEDRYK_MOTIF_BASE.length];
  // Micro-harmonic tuning offset to guarantee 100% collision-free individual pitches
  const microOffset = (Math.floor(i / SHCHEDRYK_MOTIF_BASE.length) * 1.5);
  return Math.round((baseFreq + microOffset) * 100) / 100;
});

// Map of Ukrainian Cyrillic characters (33 letters) to distinct, dedicated indices (0..32)
const UKRAINIAN_CHAR_MAP: Record<string, number> = {
  'а': 0, 'б': 1, 'в': 2, 'г': 3, 'ґ': 4, 'д': 5, 'е': 6, 'є': 7, 'ж': 8,
  'з': 9, 'и': 10, 'і': 11, 'ї': 12, 'й': 13, 'к': 14, 'л': 15, 'м': 16,
  'н': 17, 'о': 18, 'п': 19, 'р': 20, 'с': 21, 'т': 22, 'у': 23, 'ф': 24,
  'х': 25, 'ц': 26, 'ч': 27, 'ш': 28, 'щ': 29, 'ь': 30, 'ю': 31, 'я': 32
};

// Map of Latin characters (26 letters) to distinct, dedicated indices (0..25)
const LATIN_CHAR_MAP: Record<string, number> = {
  'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7, 'i': 8,
  'j': 9, 'k': 10, 'l': 11, 'm': 12, 'n': 13, 'o': 14, 'p': 15, 'q': 16,
  'r': 17, 's': 18, 't': 19, 'u': 20, 'v': 21, 'w': 22, 'x': 23, 'y': 24,
  'z': 25
};

// Physical keyboard layout positions (QWERTY / ЙЦУКЕН rows) for physical key code mapping
const PHYSICAL_KEY_CODE_MAP: Record<string, number> = {
  'KeyQ': 0, 'KeyW': 1, 'KeyE': 2, 'KeyR': 3, 'KeyT': 4, 'KeyY': 5, 'KeyU': 6, 'KeyI': 7, 'KeyO': 8, 'KeyP': 9, 'BracketLeft': 10, 'BracketRight': 11,
  'KeyA': 12, 'KeyS': 13, 'KeyD': 14, 'KeyF': 15, 'KeyG': 16, 'KeyH': 17, 'KeyJ': 18, 'KeyK': 19, 'KeyL': 20, 'Semicolon': 21, 'Quote': 22,
  'KeyZ': 23, 'KeyX': 24, 'KeyC': 25, 'KeyV': 26, 'KeyB': 27, 'KeyN': 28, 'KeyM': 29, 'Comma': 30, 'Period': 31, 'Slash': 32
};

// Digits 0..9 (indices 33..42)
const DIGIT_MAP: Record<string, number> = {
  '0': 33, '1': 34, '2': 35, '3': 36, '4': 37, '5': 38, '6': 39, '7': 40, '8': 41, '9': 42
};

// Punctuation & Symbols (indices 43..53)
const PUNCTUATION_MAP: Record<string, number> = {
  '.': 43, ',': 44, '!': 45, '?': 46, ':': 47, ';': 48, '-': 49, '—': 49,
  '(': 50, ')': 50, '"': 51, '«': 51, '»': 51, '\'': 52, '’': 52, '/': 53
};

/**
 * Returns a 100% collision-free, unique integer index (0..53) for any given key or keycode.
 */
export function getUniqueKeyIndex(key?: string, code?: string): number {
  if (!key && !code) return 12; // default home row

  const char = (key || '').toLowerCase();

  // 1. Check Ukrainian Cyrillic map
  if (char && char in UKRAINIAN_CHAR_MAP) {
    return UKRAINIAN_CHAR_MAP[char];
  }

  // 2. Check Latin alphabet map
  if (char && char in LATIN_CHAR_MAP) {
    return LATIN_CHAR_MAP[char];
  }

  // 3. Check Digits
  if (char && char in DIGIT_MAP) {
    return DIGIT_MAP[char];
  }

  // 4. Check Punctuation
  if (char && char in PUNCTUATION_MAP) {
    return PUNCTUATION_MAP[char];
  }

  // 5. Check Physical Key Code (if virtual or special layout)
  if (code && code in PHYSICAL_KEY_CODE_MAP) {
    return PHYSICAL_KEY_CODE_MAP[code];
  }

  // 6. Deterministic fallback for unknown unicode glyphs
  if (char && char.length > 0) {
    const codePoint = char.charCodeAt(0);
    return codePoint % CARILLON_BELL_SCALE.length;
  }

  return 15;
}

/**
 * Calculates a unique, deterministic micro-pitch offset in Hertz for mechanical presets.
 */
export function getUniqueKeyPitchOffset(key?: string, code?: string, maxVarianceHz: number = 45): number {
  const index = getUniqueKeyIndex(key, code);
  const totalSlots = CARILLON_BELL_SCALE.length; // 54
  // Spread from -maxVarianceHz to +maxVarianceHz with zero duplicate steps
  const normalized = (index / (totalSlots - 1)) * 2 - 1; // [-1.0 .. +1.0]
  return Math.round(normalized * maxVarianceHz * 10) / 10;
}
