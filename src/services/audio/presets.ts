/**
 * Ultra Steem Editor - Sound Presets
 * Statically imports modularized sound presets to keep context compact and token consumption low.
 */

import { SoundPreset, AudioTypingSettings } from './types';

// Static imports of modularized sound presets
import { cherryBluePreset } from './presets/cherry-blue';
import { vintageTypewriterPreset } from './presets/vintage-typewriter';
import { deepThockPreset } from './presets/deep-thock';
import { cyberNeonPreset } from './presets/cyber-neon';
import { crystalBellPreset } from './presets/crystal-bell';
import { cathedralBellPreset } from './presets/cathedral-bell';
import { shchedrykPreset } from './presets/shchedryk';
import { waterDropsPreset } from './presets/water-drops';
import { geigerCounterPreset } from './presets/geiger-counter';
import { softMinimalPreset } from './presets/soft-minimal';
import { forestRainPreset } from './presets/forest-rain';
import { lofiChillPreset } from './presets/lofi-chill';
import { spaceNebulaPreset } from './presets/space-nebula';
import { coffeeShopPreset } from './presets/coffee-shop';
import { bambooZenPreset } from './presets/bamboo-zen';

export const BUILTIN_PRESETS: SoundPreset[] = [
  cherryBluePreset,
  vintageTypewriterPreset,
  deepThockPreset,
  cyberNeonPreset,
  crystalBellPreset,
  cathedralBellPreset,
  shchedrykPreset,
  waterDropsPreset,
  geigerCounterPreset,
  softMinimalPreset,
  forestRainPreset,
  lofiChillPreset,
  spaceNebulaPreset,
  coffeeShopPreset,
  bambooZenPreset
];

export const DEFAULT_PRESET_ID = 'cherry-blue';

export const DEFAULT_AUDIO_SETTINGS: AudioTypingSettings = {
  enabled: false,
  activePresetId: DEFAULT_PRESET_ID,
  volume: 0.5,
  favoritePresetIds: ['cherry-blue', 'crystal-bell', 'water-drops', 'deep-thock', 'lofi-chill', 'coffee-shop'],
  customPresets: [],
  playOnVirtualKeys: true
};

export const SETTINGS_STORAGE_KEY = 'steem_editor_audio_synth_config_v1';

/**
 * Loads audio settings from localStorage with fallback to defaults
 */
export function loadAudioSettings(): AudioTypingSettings {
  if (typeof window === 'undefined') return DEFAULT_AUDIO_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AUDIO_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AUDIO_SETTINGS,
      ...parsed,
      // Ensure customPresets is always an array
      customPresets: Array.isArray(parsed.customPresets) ? parsed.customPresets : []
    };
  } catch (e) {
    console.warn('[AudioPresets] Error loading audio settings, using defaults', e);
    return DEFAULT_AUDIO_SETTINGS;
  }
}

/**
 * Persists audio settings to localStorage
 */
export function saveAudioSettings(settings: AudioTypingSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[AudioPresets] Error saving audio settings', e);
  }
}

/**
 * Validates whether an imported object matches the SoundPreset schema
 */
export function validateSoundPreset(obj: unknown): { valid: boolean; error?: string; preset?: SoundPreset } {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, error: 'Об’єкт пресету не передано або він некоректного формату' };
  }

  const p = obj as Record<string, any>;

  if (!p.id || typeof p.id !== 'string') {
    return { valid: false, error: 'Відсутнє або некоректне поле "id" (очікується рядок)' };
  }
  if (!p.name || typeof p.name !== 'string') {
    return { valid: false, error: 'Відсутнє або некоректне поле "name" (очікується назва)' };
  }
  if (!p.oscillator || typeof p.oscillator.baseFreq !== 'number') {
    return { valid: false, error: 'Секція "oscillator" повинна містити числове значення baseFreq' };
  }
  if (!p.envelope || typeof p.envelope.decay !== 'number') {
    return { valid: false, error: 'Секція "envelope" повинна містити числове значення decay' };
  }

  const validatedPreset: SoundPreset = {
    id: String(p.id).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    name: String(p.name).trim(),
    description: p.description ? String(p.description) : 'Користувацький звуковий пресет',
    author: p.author ? String(p.author) : 'Користувач',
    version: p.version ? String(p.version) : '1.0.0',
    tags: Array.isArray(p.tags) ? p.tags.map(String) : ['custom'],
    isBuiltin: false,
    synthesisMode: ['mechanical', 'bell', 'bubbles', 'geiger'].includes(p.synthesisMode) ? p.synthesisMode : undefined,
    tuningScale: ['pentatonic', 'chromatic', 'linear'].includes(p.tuningScale) ? p.tuningScale : undefined,
    fmModulation: p.fmModulation ? {
      freqRatio: Math.max(0.1, Math.min(16, Number(p.fmModulation.freqRatio) || 1.5)),
      depthRatio: Math.max(0.01, Math.min(10, Number(p.fmModulation.depthRatio) || 0.5)),
      decaySec: p.fmModulation.decaySec ? Math.max(0.01, Math.min(4, Number(p.fmModulation.decaySec))) : undefined
    } : undefined,
    oscillator: {
      type: ['sine', 'square', 'sawtooth', 'triangle'].includes(p.oscillator.type) ? p.oscillator.type : 'triangle',
      baseFreq: Math.max(20, Math.min(2000, Number(p.oscillator.baseFreq))),
      freqDecay: p.oscillator.freqDecay ? Math.max(0, Number(p.oscillator.freqDecay)) : undefined,
      freqSweep: p.oscillator.freqSweep ? {
        targetRatio: Math.max(0.1, Math.min(10, Number(p.oscillator.freqSweep.targetRatio) || 1.8)),
        durationSec: Math.max(0.005, Math.min(0.5, Number(p.oscillator.freqSweep.durationSec) || 0.05))
      } : undefined,
      pitchVariance: p.oscillator.pitchVariance ? Math.max(0, Number(p.oscillator.pitchVariance)) : 40,
      detune: p.oscillator.detune ? Number(p.oscillator.detune) : undefined,
      subOsc: p.oscillator.subOsc ? {
        type: p.oscillator.subOsc.type || 'sine',
        freqRatio: Number(p.oscillator.subOsc.freqRatio) || 0.5,
        gain: Math.max(0, Math.min(1, Number(p.oscillator.subOsc.gain) || 0.2))
      } : undefined
    },
    noise: p.noise ? {
      type: ['white', 'pink', 'brown'].includes(p.noise.type) ? p.noise.type : 'pink',
      gain: Math.max(0, Math.min(1, Number(p.noise.gain) || 0.2)),
      durationMs: Math.max(5, Math.min(300, Number(p.noise.durationMs) || 30)),
      playbackRate: p.noise.playbackRate ? Number(p.noise.playbackRate) : undefined
    } : undefined,
    filter: p.filter ? {
      type: p.filter.type || 'bandpass',
      baseFrequency: Math.max(40, Math.min(15000, Number(p.filter.baseFrequency) || 1200)),
      q: Math.max(0.1, Math.min(20, Number(p.filter.q) || 2)),
      freqSweep: p.filter.freqSweep ? Number(p.filter.freqSweep) : undefined
    } : undefined,
    envelope: {
      attack: Math.max(0.0005, Math.min(0.2, Number(p.envelope.attack) || 0.002)),
      decay: Math.max(0.005, Math.min(0.5, Number(p.envelope.decay) || 0.04)),
      sustain: 0,
      release: Math.max(0.005, Math.min(0.2, Number(p.envelope.release) || 0.02))
    },
    transient: p.transient ? {
      enabled: Boolean(p.transient.enabled),
      clickFrequency: Number(p.transient.clickFrequency) || 3200,
      clickGain: Math.max(0, Math.min(1, Number(p.transient.clickGain) || 0.3)),
      clickDurationMs: Math.max(1, Math.min(20, Number(p.transient.clickDurationMs) || 4)),
      secondaryClickDelayMs: p.transient.secondaryClickDelayMs ? Number(p.transient.secondaryClickDelayMs) : undefined,
      secondaryClickGain: p.transient.secondaryClickGain ? Number(p.transient.secondaryClickGain) : undefined
    } : undefined,
    specialKeys: p.specialKeys || {}
  };

  return { valid: true, preset: validatedPreset };
}

/**
 * Example JSON template ready for downloading or generating with AI
 */
export const PRESET_JSON_TEMPLATE = JSON.stringify(
  {
    $schema: 'https://steemeditor.app/schemas/sound-preset.v1.json',
    id: 'my-custom-switch',
    name: 'My Custom Mechanical Switch',
    description: 'Опис власного звукового профілю для набору тексту',
    author: 'Автор',
    version: '1.0.0',
    tags: ['custom', 'mechanical'],
    oscillator: {
      type: 'triangle',
      baseFreq: 260,
      freqDecay: 0.02,
      pitchVariance: 45,
      subOsc: {
        type: 'sine',
        freqRatio: 0.5,
        gain: 0.2
      }
    },
    noise: {
      type: 'pink',
      gain: 0.25,
      durationMs: 25
    },
    filter: {
      type: 'bandpass',
      baseFrequency: 1500,
      q: 3.0,
      freqSweep: -300
    },
    envelope: {
      attack: 0.001,
      decay: 0.04,
      sustain: 0.0,
      release: 0.015
    },
    transient: {
      enabled: true,
      clickFrequency: 3400,
      clickGain: 0.4,
      clickDurationMs: 4,
      secondaryClickDelayMs: 6,
      secondaryClickGain: 0.2
    },
    specialKeys: {
      space: { pitchMultiplier: 0.7, gainMultiplier: 1.25 },
      enter: { pitchMultiplier: 1.2, extraBell: false },
      backspace: { pitchMultiplier: 1.1, decayMultiplier: 0.8 }
    }
  },
  null,
  2
);
