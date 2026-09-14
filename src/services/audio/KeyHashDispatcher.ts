/**
 * Ultra Steem Editor - KeyHashDispatcher
 * Calculates deterministic pitch, tone, and character-frequency modulations for every key,
 * letter, and language alphabet, then dispatches to SoundSynthEngine.
 */

import { soundSynthEngine } from './SoundSynthEngine';
import {
  CARILLON_BELL_SCALE,
  CATHEDRAL_BELL_SCALE,
  SHCHEDRYK_BELL_SCALE,
  getUniqueKeyIndex,
  getUniqueKeyPitchOffset
} from './keyboardMap';
import {
  SoundPreset,
  KeySoundModifier,
  KeySoundTriggerOptions
} from './types';

export class KeyHashDispatcher {
  private static instance: KeyHashDispatcher | null = null;

  public static getInstance(): KeyHashDispatcher {
    if (!KeyHashDispatcher.instance) {
      KeyHashDispatcher.instance = new KeyHashDispatcher();
    }
    return KeyHashDispatcher.instance;
  }

  /**
   * Fast 32-bit Murmur-inspired string hashing for deterministic key pitch
   */
  private hashString(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return Math.abs(hash);
  }

  /**
   * Detects the linguistic or functional character group to shape overtone character
   */
  private getCharCategory(key: string, code: string, inputType?: string): {
    category: 'space' | 'enter' | 'backspace' | 'delete' | 'tab' | 'modifier' | 'punctuation' | 'number' | 'cyrillic' | 'latin' | 'other';
    specialKeyId?: 'space' | 'enter' | 'backspace' | 'delete' | 'tab' | 'modifier' | 'punctuation' | 'numbers';
  } {
    // Virtual or IME inputType handling
    if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
      return { category: 'enter', specialKeyId: 'enter' };
    }
    if (inputType === 'deleteContentBackward' || inputType === 'deleteContent') {
      return { category: 'backspace', specialKeyId: 'backspace' };
    }
    if (inputType === 'deleteContentForward') {
      return { category: 'delete', specialKeyId: 'delete' };
    }

    const lowerKey = (key || '').toLowerCase();
    const codeName = code || '';

    if (key === ' ' || codeName === 'Space' || inputType === 'insertText' && key === ' ') {
      return { category: 'space', specialKeyId: 'space' };
    }
    if (key === 'Enter' || codeName === 'Enter' || codeName === 'NumpadEnter') {
      return { category: 'enter', specialKeyId: 'enter' };
    }
    if (key === 'Backspace' || codeName === 'Backspace') {
      return { category: 'backspace', specialKeyId: 'backspace' };
    }
    if (key === 'Delete' || codeName === 'Delete') {
      return { category: 'delete', specialKeyId: 'delete' };
    }
    if (key === 'Tab' || codeName === 'Tab') {
      return { category: 'tab', specialKeyId: 'tab' };
    }
    if (['shift', 'control', 'alt', 'meta', 'capslock', 'escape'].includes(lowerKey)) {
      return { category: 'modifier', specialKeyId: 'modifier' };
    }

    // Numbers
    if (/^[0-9]$/.test(key) || codeName.startsWith('Digit') || codeName.startsWith('Numpad')) {
      return { category: 'number', specialKeyId: 'numbers' };
    }

    // Punctuation & Symbols
    if (/[.,!?;:()[\]{}'"/\\@#$%^&*_\-+=<>~`]/.test(key)) {
      return { category: 'punctuation', specialKeyId: 'punctuation' };
    }

    // Cyrillic Alphabet (Ukrainian, etc.)
    if (/[\u0400-\u04FF]/.test(key)) {
      return { category: 'cyrillic' };
    }

    // Latin Alphabet
    if (/^[a-zA-Z]$/.test(key)) {
      return { category: 'latin' };
    }

    return { category: 'other' };
  }

  /**
   * Main dispatch method: computes key variance and triggers procedural synthesis
   */
  public async dispatch(preset: SoundPreset, options: KeySoundTriggerOptions = {}): Promise<void> {
    const rawKey = options.key || '';
    const rawCode = options.code || '';
    const inputType = options.inputType;

    const { category, specialKeyId } = this.getCharCategory(rawKey, rawCode, inputType);

    // 1. Resolve Special Key Modifier from Preset or apply intuitive defaults
    let modifier: KeySoundModifier | undefined;
    if (specialKeyId && preset.specialKeys && preset.specialKeys[specialKeyId]) {
      modifier = preset.specialKeys[specialKeyId];
    } else if (category === 'backspace') {
      modifier = { slideDown: true, decayMultiplier: 1.15, gainMultiplier: 0.85 };
    } else if (category === 'enter') {
      modifier = { extraBell: true, gainMultiplier: 1.15 };
    }

    // 2. Compute 100% Collision-Free Pitch Offset
    let pitchOffsetHz: number;

    if (preset.synthesisMode === 'cathedral-bell') {
      const uniqueIdx = getUniqueKeyIndex(rawKey, rawCode);
      const targetFreq = CATHEDRAL_BELL_SCALE[uniqueIdx % CATHEDRAL_BELL_SCALE.length];
      pitchOffsetHz = targetFreq - (preset.oscillator?.baseFreq ?? 440.0);
    } else if (preset.synthesisMode === 'shchedryk') {
      const uniqueIdx = getUniqueKeyIndex(rawKey, rawCode);
      const targetFreq = SHCHEDRYK_BELL_SCALE[uniqueIdx % SHCHEDRYK_BELL_SCALE.length];
      pitchOffsetHz = targetFreq - (preset.oscillator?.baseFreq ?? 493.88);
    } else if (preset.tuningScale === 'pentatonic' || preset.synthesisMode === 'bell') {
      // 54-bell grand carillon scale: every character/symbol gets a distinct musical pitch
      const uniqueIdx = getUniqueKeyIndex(rawKey, rawCode);
      const targetFreq = CARILLON_BELL_SCALE[uniqueIdx % CARILLON_BELL_SCALE.length];
      pitchOffsetHz = targetFreq - (preset.oscillator?.baseFreq ?? 523.25);
    } else {
      // Collision-free deterministic mechanical switch pitch variance
      const maxVarianceHz = preset.oscillator?.pitchVariance ?? 45;
      pitchOffsetHz = getUniqueKeyPitchOffset(rawKey, rawCode, maxVarianceHz);

      // Uppercase / shift subtle harmonic sparkle
      if (rawKey.length === 1 && rawKey !== rawKey.toLowerCase()) {
        pitchOffsetHz += 4.5;
      }
    }

    if (options.forceToneOffset) {
      pitchOffsetHz += options.forceToneOffset;
    }

    // 3. Dispatch to Audio Synthesis Engine
    await soundSynthEngine.playKeySound(preset, options, pitchOffsetHz, modifier);
  }

  /**
   * Preview a preset sound (e.g. from preset manager UI)
   */
  public async preview(preset: SoundPreset, sampleChar: string = 'A'): Promise<void> {
    await this.dispatch(preset, { key: sampleChar, code: `Key${sampleChar.toUpperCase()}` });
  }
}

export const keyHashDispatcher = KeyHashDispatcher.getInstance();
