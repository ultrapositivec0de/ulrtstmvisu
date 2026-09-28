import { SoundPreset } from '../types';

export const vintageTypewriterPreset: SoundPreset = {
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
};
