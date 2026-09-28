import { SoundPreset } from '../types';

export const crystalBellPreset: SoundPreset = {
  id: 'crystal-bell',
  name: 'Crystal Bell (Кришталеві дзвіночки)',
  description: 'Мелодійні сонячні кришталеві дзвіночки на базі фізичного моделювання з мажорними обертонами. Світле, відкрите та очищувальне звучання без металевого брязкоту.',
  author: 'Ultra Steem Team',
  version: '1.3.0',
  tags: ['bell', 'crystal', 'melody', 'zen', 'joyful', 'celestial'],
  isBuiltin: true,
  synthesisMode: 'bell',
  tuningScale: 'pentatonic',
  oscillator: {
    type: 'sine',
    baseFreq: 523.25,
    pitchVariance: 0
  },
  envelope: {
    attack: 0.003,
    decay: 1.7,
    sustain: 0.0,
    release: 0.2
  }
};
