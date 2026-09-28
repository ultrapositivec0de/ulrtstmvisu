import { SoundPreset } from '../types';

export const spaceNebulaPreset: SoundPreset = {
  id: 'space-nebula',
  name: 'Space Nebula (Космічна туманність)',
  description: 'Об’ємний, надихаючий космічний синтезатор із плавним плаваючим глайдом і сріблястим FM-модульованим хвостом згасання.',
  author: 'Ultra Steem Team',
  version: '1.0.0',
  tags: ['ambient', 'space', 'synth', 'dreamy', 'future'],
  isBuiltin: true,
  oscillator: {
    type: 'sine',
    baseFreq: 220.00, // A3
    pitchVariance: 25,
    freqSweep: {
      targetRatio: 1.25,
      durationSec: 0.12
    }
  },
  fmModulation: {
    freqRatio: 3.5,
    depthRatio: 0.28,
    decaySec: 0.15
  },
  filter: {
    type: 'lowpass',
    baseFrequency: 2100,
    q: 1.4,
    freqSweep: -700
  },
  envelope: {
    attack: 0.022,
    decay: 0.32,
    sustain: 0.0,
    release: 0.18
  },
  transient: {
    enabled: true,
    clickFrequency: 4200,
    clickGain: 0.15,
    clickDurationMs: 8
  },
  specialKeys: {
    space: { pitchMultiplier: 0.5, gainMultiplier: 1.25, decayMultiplier: 1.8 },
    enter: { pitchMultiplier: 1.5, gainMultiplier: 1.15, decayMultiplier: 1.5 },
    backspace: { pitchMultiplier: 0.8, gainMultiplier: 0.8, decayMultiplier: 0.8 }
  }
};
