import { SoundPreset } from '../types';

export const forestRainPreset: SoundPreset = {
  id: 'forest-rain',
  name: 'Forest Rain (Лісовий дощ)',
  description: 'Неймовірно заспокійливий звук м’яких дерев’яних клавіш із тривалим шелестом літніх крапель дощу на фоні.',
  author: 'Ultra Steem Team',
  version: '1.0.0',
  tags: ['nature', 'calm', 'relaxing', 'rain', 'wood'],
  isBuiltin: true,
  oscillator: {
    type: 'sine',
    baseFreq: 180,
    pitchVariance: 22,
    subOsc: {
      type: 'triangle',
      freqRatio: 0.5,
      gain: 0.2
    }
  },
  noise: {
    type: 'pink',
    gain: 0.15,
    durationMs: 85,
    playbackRate: 0.9
  },
  filter: {
    type: 'bandpass',
    baseFrequency: 1350,
    q: 1.2
  },
  envelope: {
    attack: 0.005,
    decay: 0.08,
    sustain: 0.0,
    release: 0.04
  },
  specialKeys: {
    space: { pitchMultiplier: 0.75, gainMultiplier: 1.2, decayMultiplier: 1.5, noiseGainMultiplier: 1.8 },
    enter: { pitchMultiplier: 0.9, gainMultiplier: 1.15, decayMultiplier: 1.4, noiseGainMultiplier: 1.5 },
    backspace: { pitchMultiplier: 1.1, gainMultiplier: 0.85, decayMultiplier: 0.8 }
  }
};
