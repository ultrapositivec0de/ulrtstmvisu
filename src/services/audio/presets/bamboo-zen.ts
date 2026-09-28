import { SoundPreset } from '../types';

export const bambooZenPreset: SoundPreset = {
  id: 'bamboo-zen',
  name: 'Bamboo Garden (Бамбуковий дзен)',
  description: 'Природний порожнистий звук ударів бамбука та дерев’яних паличок у медитативному японському саду. Використовує гармонійну пентатоніку для спокійного набору.',
  author: 'Ultra Steem Team',
  version: '1.0.0',
  tags: ['nature', 'wood', 'organic', 'meditative', 'zen', 'calm'],
  isBuiltin: true,
  tuningScale: 'pentatonic',
  oscillator: {
    type: 'sine',
    baseFreq: 330.00, // E4, bright resonant woody note
    pitchVariance: 40,
    freqDecay: 0.01
  },
  noise: {
    type: 'pink',
    gain: 0.09,
    durationMs: 28,
    playbackRate: 1.2
  },
  filter: {
    type: 'bandpass',
    baseFrequency: 1100,
    q: 4.5 // High Q creates beautiful resonant wooden hollowness
  },
  envelope: {
    attack: 0.002,
    decay: 0.038,
    sustain: 0.0,
    release: 0.016
  },
  transient: {
    enabled: true,
    clickFrequency: 1800, // Organic low wooden knock
    clickGain: 0.25,
    clickDurationMs: 6
  },
  specialKeys: {
    space: { pitchMultiplier: 0.6, gainMultiplier: 1.2, decayMultiplier: 1.6, filterFreqMultiplier: 0.8 },
    enter: { pitchMultiplier: 1.33, gainMultiplier: 1.15, decayMultiplier: 1.4 },
    backspace: { pitchMultiplier: 0.9, gainMultiplier: 0.8, decayMultiplier: 0.8 }
  }
};
