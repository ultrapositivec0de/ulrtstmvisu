import { SoundPreset } from '../types';

export const waterDropsPreset: SoundPreset = {
  id: 'water-drops',
  name: 'Water Drops (Краплі води / Bubbles)',
  description: 'Автентичний звук падіння крапель води та бульбашок зі стрімким зльотом частоти вгору (Pitch Slide Up). Заспокоює та освіжає ритм письма.',
  author: 'Ultra Steem Team',
  version: '1.2.0',
  tags: ['water', 'drops', 'bubbles', 'nature', 'calm'],
  isBuiltin: true,
  synthesisMode: 'bubbles',
  oscillator: {
    type: 'sine',
    baseFreq: 640,
    pitchVariance: 200
  },
  envelope: {
    attack: 0.003,
    decay: 0.06,
    sustain: 0.0,
    release: 0.01
  }
};
