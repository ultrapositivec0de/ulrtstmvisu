/**
 * Ultra Steem Editor - Sound Presets
 * Rich procedural synthesis presets for mechanical keyboards, vintage typewriters,
 * deep thock switches, sci-fi cyber clicks, and calming droplet effects.
 */

import { SoundPreset, AudioTypingSettings } from './types';

export const BUILTIN_PRESETS: SoundPreset[] = [
  {
    id: 'cherry-blue',
    name: 'Mechanical Cherry Blue',
    description: 'Чіткий механічний подвійний клік із пластиковим тактильним пелюстком та швидким відгуком.',
    author: 'Ultra Steem Team',
    version: '1.0.0',
    tags: ['mechanical', 'clicky', 'crisp'],
    isBuiltin: true,
    oscillator: {
      type: 'triangle',
      baseFreq: 260,
      freqDecay: 0.02,
      pitchVariance: 45,
      subOsc: {
        type: 'sine',
        freqRatio: 0.5,
        gain: 0.25
      }
    },
    noise: {
      type: 'pink',
      gain: 0.22,
      durationMs: 22,
      playbackRate: 1.2
    },
    filter: {
      type: 'bandpass',
      baseFrequency: 1650,
      q: 3.2,
      freqSweep: -350
    },
    envelope: {
      attack: 0.001,
      decay: 0.038,
      sustain: 0.0,
      release: 0.015
    },
    transient: {
      enabled: true,
      clickFrequency: 3600,
      clickGain: 0.45,
      clickDurationMs: 4,
      secondaryClickDelayMs: 6,
      secondaryClickGain: 0.22
    },
    specialKeys: {
      space: { pitchMultiplier: 0.68, gainMultiplier: 1.25, decayMultiplier: 1.4, noiseGainMultiplier: 1.5 },
      enter: { pitchMultiplier: 0.85, gainMultiplier: 1.2, decayMultiplier: 1.3 },
      backspace: { pitchMultiplier: 1.15, gainMultiplier: 0.9, decayMultiplier: 0.75 },
      delete: { pitchMultiplier: 1.2, gainMultiplier: 0.85, decayMultiplier: 0.7 },
      tab: { pitchMultiplier: 0.75, gainMultiplier: 1.1 },
      modifier: { pitchMultiplier: 0.9, gainMultiplier: 0.7, decayMultiplier: 0.6 }
    }
  },
  {
    id: 'vintage-typewriter',
    name: 'Vintage Typewriter',
    description: 'Автентичний механічний удар літерного важеля об валик та папір друкарської машинки, без металевого дзвону пластин, з класичним дзвоником на Enter.',
    author: 'Ultra Steem Team',
    version: '1.2.0',
    tags: ['vintage', 'retro', 'typewriter', 'mechanical', 'paper'],
    isBuiltin: true,
    oscillator: {
      type: 'triangle',
      baseFreq: 220,
      freqDecay: 0.025,
      pitchVariance: 35,
      subOsc: {
        type: 'sine',
        freqRatio: 0.5,
        gain: 0.25
      }
    },
    noise: {
      type: 'pink',
      gain: 0.30,
      durationMs: 26,
      playbackRate: 1.05
    },
    filter: {
      type: 'bandpass',
      baseFrequency: 1150,
      q: 1.8,
      freqSweep: -280
    },
    envelope: {
      attack: 0.001,
      decay: 0.042,
      sustain: 0.0,
      release: 0.015
    },
    transient: {
      enabled: true,
      clickFrequency: 2400,
      clickGain: 0.42,
      clickDurationMs: 3.5
    },
    specialKeys: {
      space: { pitchMultiplier: 0.68, gainMultiplier: 1.25, noiseGainMultiplier: 1.4, decayMultiplier: 1.3 },
      enter: { pitchMultiplier: 1.1, gainMultiplier: 1.2, extraBell: true },
      backspace: { pitchMultiplier: 0.95, gainMultiplier: 1.05 },
      delete: { pitchMultiplier: 0.95, gainMultiplier: 1.0 },
      modifier: { pitchMultiplier: 0.92, gainMultiplier: 0.6 }
    }
  },
  {
    id: 'deep-thock',
    name: 'Lubed Linear (Deep Thock)',
    description: 'Глибокий, оксамитовий та приглушений звук змащених лінійних світчів без різких високих частот.',
    author: 'Ultra Steem Team',
    version: '1.0.0',
    tags: ['thock', 'smooth', 'linear', 'quiet'],
    isBuiltin: true,
    oscillator: {
      type: 'sine',
      baseFreq: 155,
      freqDecay: 0.025,
      pitchVariance: 30,
      subOsc: {
        type: 'triangle',
        freqRatio: 0.5,
        gain: 0.4
      }
    },
    noise: {
      type: 'brown',
      gain: 0.18,
      durationMs: 25,
      playbackRate: 0.8
    },
    filter: {
      type: 'lowpass',
      baseFrequency: 750,
      q: 1.6
    },
    envelope: {
      attack: 0.002,
      decay: 0.045,
      sustain: 0.0,
      release: 0.02
    },
    transient: {
      enabled: true,
      clickFrequency: 1200,
      clickGain: 0.2,
      clickDurationMs: 3
    },
    specialKeys: {
      space: { pitchMultiplier: 0.72, gainMultiplier: 1.35, decayMultiplier: 1.4 },
      enter: { pitchMultiplier: 0.85, gainMultiplier: 1.15 },
      backspace: { pitchMultiplier: 1.1, gainMultiplier: 0.9 }
    }
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon Synth',
    description: 'Футуристичний електронний кібер-імпульс із дзвінким лазерним піпом. Ідеально пасує до Neon теми.',
    author: 'Ultra Steem Team',
    version: '1.2.0',
    tags: ['sci-fi', 'neon', 'electronic', 'synth', 'cyberpunk'],
    isBuiltin: true,
    oscillator: {
      type: 'sawtooth',
      baseFreq: 780,
      freqDecay: 0.022,
      pitchVariance: 60
    },
    filter: {
      type: 'bandpass',
      baseFrequency: 2800,
      q: 3.5,
      freqSweep: -800
    },
    envelope: {
      attack: 0.001,
      decay: 0.028,
      sustain: 0.0,
      release: 0.012
    },
    transient: {
      enabled: true,
      clickFrequency: 5200,
      clickGain: 0.38,
      clickDurationMs: 2.5
    },
    specialKeys: {
      space: { pitchMultiplier: 0.65, gainMultiplier: 1.25 },
      enter: { pitchMultiplier: 1.45, gainMultiplier: 1.2 },
      backspace: { pitchMultiplier: 0.85, decayMultiplier: 0.7 }
    }
  },
  {
    id: 'crystal-bell',
    name: 'Crystal Bell (Кришталеві дзвіночки)',
    description: 'Мелодійні сонячні кришталеві дзвіночки на базі фізичного моделювання з мажорними обертонами. Світле, відкрите та очищувальне звучання без металевого брязкоту.',
    author: 'Ultra Steem Team',
    version: '1.3.0',
    tags: ['bell', 'crystal', 'melody', 'zen', 'joyful', 'celestial'],
    isBuiltin: true,
    synthesisMode: 'bell',
    tuningScale: 'pentatonic',
    oscillator: {
      type: 'sine',
      baseFreq: 523.25,
      pitchVariance: 0
    },
    envelope: {
      attack: 0.003,
      decay: 1.7,
      sustain: 0.0,
      release: 0.2
    }
  },
  {
    id: 'cathedral-bell',
    name: 'Cathedral Bronze Bells (Соборні гармонійні дзвони)',
    description: 'Автентичні благородні бронзові дзвони у плавному, злитному гармонійному ряду (G4–G5) без різких стрибків регістру. Глибокий унтертон (Hum Tone), тепла терція та величний триголосний передзвін на Enter.',
    author: 'Ultra Steem Team',
    version: '1.0.0',
    tags: ['bell', 'cathedral', 'temple', 'bronze', 'sacred', 'harmony', 'peace'],
    isBuiltin: true,
    synthesisMode: 'cathedral-bell',
    oscillator: {
      type: 'sine',
      baseFreq: 440.0,
      pitchVariance: 0
    },
    envelope: {
      attack: 0.003,
      decay: 2.0,
      sustain: 0.0,
      release: 0.3
    }
  },
  {
    id: 'shchedryk',
    name: 'Shchedryk / Carol of the Bells (Щедрик / Дзвоники Леонтовича)',
    description: 'Святковий стилізований передзвін за мотивами всесвітньо відомого «Щедрика» Миколи Леонтовича. Кожна клавіша вплітається в улюблені мотиви, а Enter дарує розкішний святковий каскад срібних дзвоників.',
    author: 'Ultra Steem Team',
    version: '1.0.0',
    tags: ['bell', 'shchedryk', 'carol', 'christmas', 'festive', 'ukrainian', 'celebration'],
    isBuiltin: true,
    synthesisMode: 'shchedryk',
    oscillator: {
      type: 'sine',
      baseFreq: 493.88,
      pitchVariance: 0
    },
    envelope: {
      attack: 0.0025,
      decay: 1.8,
      sustain: 0.0,
      release: 0.25
    }
  },
  {
    id: 'water-drops',
    name: 'Water Drops (Краплі води / Bubbles)',
    description: 'Автентичний звук падіння крапель води та бульбашок зі стрімким зльотом частоти вгору (Pitch Slide Up). Заспокоює та освіжає ритм письма.',
    author: 'Ultra Steem Team',
    version: '1.2.0',
    tags: ['water', 'drops', 'bubbles', 'nature', 'calm'],
    isBuiltin: true,
    synthesisMode: 'bubbles',
    oscillator: {
      type: 'sine',
      baseFreq: 640,
      pitchVariance: 200
    },
    envelope: {
      attack: 0.003,
      decay: 0.06,
      sustain: 0.0,
      release: 0.01
    }
  },
  {
    id: 'geiger-counter',
    name: 'Geiger Counter / S.T.A.L.K.E.R. (Дозиметр)',
    description: 'Автентичний гострий п’єзо-тріск лічильника Гейгера (S.T.A.L.K.E.R.-style) зі стохастичними іонізаційними спалахами та аномалійним потрійним мікро-імпульсом на Enter.',
    author: 'Ultra Steem Team',
    version: '1.3.0',
    tags: ['geiger', 'electric', 'radiation', 'click', 'sharp', 'stalker', 'dosimeter'],
    isBuiltin: true,
    synthesisMode: 'geiger',
    oscillator: {
      type: 'triangle',
      baseFreq: 4200,
      pitchVariance: 400
    },
    envelope: {
      attack: 0.0001,
      decay: 0.0024,
      sustain: 0.0,
      release: 0.001
    }
  },
  {
    id: 'soft-minimal',
    name: 'Soft Chiclet (Minimal)',
    description: 'Ледь чутний дискретний клік ультратонких клавіатур ноутбуків. Для любителів максимальної стриманості.',
    author: 'Ultra Steem Team',
    version: '1.0.0',
    tags: ['minimal', 'office', 'chiclet', 'discrete'],
    isBuiltin: true,
    oscillator: {
      type: 'triangle',
      baseFreq: 340,
      freqDecay: 0.015,
      pitchVariance: 25
    },
    noise: {
      type: 'white',
      gain: 0.12,
      durationMs: 15,
      playbackRate: 1.4
    },
    filter: {
      type: 'bandpass',
      baseFrequency: 2200,
      q: 2.0
    },
    envelope: {
      attack: 0.001,
      decay: 0.022,
      sustain: 0.0,
      release: 0.01
    },
    specialKeys: {
      space: { pitchMultiplier: 0.8, gainMultiplier: 1.15 },
      enter: { pitchMultiplier: 0.9, gainMultiplier: 1.1 }
    }
  }
];

export const DEFAULT_PRESET_ID = 'cherry-blue';

export const DEFAULT_AUDIO_SETTINGS: AudioTypingSettings = {
  enabled: false,
  activePresetId: DEFAULT_PRESET_ID,
  volume: 0.5,
  favoritePresetIds: ['cherry-blue', 'crystal-bell', 'water-drops', 'deep-thock'],
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
