import { SoundPreset } from '../types';

export const lofiChillPreset: SoundPreset = {
  id: 'lofi-chill',
  name: 'Lofi Chill Keys (Затишний Лоу-Фай)',
  description: 'Приглушений, оксамитовий звук вінтажної аналогової клавіатури з легким аналоговим гудінням, вініловим шумом та м’якими басовими тонами.',
  author: 'Ultra Steem Team',
  version: '1.0.0',
  tags: ['lofi', 'chill', 'calm', 'retro', 'analog'],
  isBuiltin: true,
  oscillator: {
    type: 'triangle',
    baseFreq: 196.00, // G3, warm anchor
    pitchVariance: 15,
    subOsc: {
      type: 'sine',
      freqRatio: 0.5,
      gain: 0.22
    }
  },
  fmModulation: {
    freqRatio: 2.0,
    depthRatio: 0.12
  },
  noise: {
    type: 'brown',
    gain: 0.16,
    durationMs: 120,
    playbackRate: 0.75
  },
  filter: {
    type: 'lowpass',
    baseFrequency: 950,
    q: 0.75
  },
  envelope: {
    attack: 0.012,
    decay: 0.18,
    sustain: 0.0,
    release: 0.06
  },
  specialKeys: {
    space: { pitchMultiplier: 0.66, gainMultiplier: 1.15, decayMultiplier: 1.6, noiseGainMultiplier: 1.5 },
    enter: { pitchMultiplier: 1.25, gainMultiplier: 1.1, decayMultiplier: 1.4, noiseGainMultiplier: 1.4 },
    backspace: { pitchMultiplier: 0.9, gainMultiplier: 0.85, decayMultiplier: 0.8 }
  }
};
