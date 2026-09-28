import { SoundPreset } from '../types';

export const cherryBluePreset: SoundPreset = {
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
};
