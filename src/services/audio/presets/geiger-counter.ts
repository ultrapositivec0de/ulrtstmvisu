import { SoundPreset } from '../types';

export const geigerCounterPreset: SoundPreset = {
  id: 'geiger-counter',
  name: 'Geiger Counter / S.T.A.L.K.E.R. (Дозиметр)',
  description: 'Автентичний гострий п’єзо-тріск лічильника Гейгера (S.T.A.L.K.E.R.-style) зі стохастичними іонізаційними спалахами та аномалійним потрійним мікро-імпульсом на Enter.',
  author: 'Ultra Steem Team',
  version: '1.3.0',
  tags: ['geiger', 'electric', 'radiation', 'click', 'sharp', 'stalker', 'dosimeter'],
  isBuiltin: true,
  synthesisMode: 'geiger',
  oscillator: {
    type: 'triangle',
    baseFreq: 4200,
    pitchVariance: 400
  },
  envelope: {
    attack: 0.0001,
    decay: 0.0024,
    sustain: 0.0,
    release: 0.001
  }
};
