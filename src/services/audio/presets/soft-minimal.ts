import { SoundPreset } from '../types';

export const softMinimalPreset: SoundPreset = {
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
};
