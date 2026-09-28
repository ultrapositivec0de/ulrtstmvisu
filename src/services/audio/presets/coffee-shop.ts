import { SoundPreset } from '../types';

export const coffeeShopPreset: SoundPreset = {
  id: 'coffee-shop',
  name: 'Cozy Coffee Shop (Ранкова кав’ярня)',
  description: 'Неймовірно затишний звук м’яких клавіш із текстурою кавових чашок та тихим заспокійливим шелестом пари на фоні. Enter відтворює дзвіночок готового замовлення.',
  author: 'Ultra Steem Team',
  version: '1.0.0',
  tags: ['cozy', 'warm', 'cafe', 'tactile', 'cup-clank'],
  isBuiltin: true,
  oscillator: {
    type: 'triangle',
    baseFreq: 245.00,
    pitchVariance: 28,
    freqDecay: 0.012,
    subOsc: {
      type: 'sine',
      freqRatio: 0.5,
      gain: 0.15
    }
  },
  noise: {
    type: 'pink',
    gain: 0.14,
    durationMs: 45,
    playbackRate: 0.95
  },
  filter: {
    type: 'bandpass',
    baseFrequency: 1650,
    q: 2.5
  },
  envelope: {
    attack: 0.003,
    decay: 0.048,
    sustain: 0.0,
    release: 0.018
  },
  transient: {
    enabled: true,
    clickFrequency: 2900,
    clickGain: 0.22,
    clickDurationMs: 4.5,
    secondaryClickDelayMs: 8,
    secondaryClickGain: 0.12
  },
  specialKeys: {
    space: { pitchMultiplier: 0.72, gainMultiplier: 1.25, decayMultiplier: 1.5, noiseGainMultiplier: 1.6 },
    enter: { pitchMultiplier: 1.1, gainMultiplier: 1.2, extraBell: true },
    backspace: { pitchMultiplier: 1.05, gainMultiplier: 0.85, decayMultiplier: 0.8 }
  }
};
