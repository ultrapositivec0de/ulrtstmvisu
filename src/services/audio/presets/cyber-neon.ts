import { SoundPreset } from '../types';

export const cyberNeonPreset: SoundPreset = {
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
};
