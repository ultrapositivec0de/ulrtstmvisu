import { SoundPreset } from '../types';

export const deepThockPreset: SoundPreset = {
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
};
