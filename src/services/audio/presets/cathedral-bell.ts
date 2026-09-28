import { SoundPreset } from '../types';

export const cathedralBellPreset: SoundPreset = {
  id: 'cathedral-bell',
  name: 'Cathedral Bronze Bells (Соборні гармонійні дзвони)',
  description: 'Автентичні благородні бронзові дзвони у плавному, злитному гармонійному ряду (G4–G5) без різких стрибків регістру. Глибокий унтертон (Hum Tone), тепла терція та величний триголосний передзвін на Enter.',
  author: 'Ultra Steem Team',
  version: '1.0.0',
  tags: ['bell', 'cathedral', 'temple', 'bronze', 'sacred', 'harmony', 'peace'],
  isBuiltin: true,
  synthesisMode: 'cathedral-bell',
  oscillator: {
    type: 'sine',
    baseFreq: 440.0,
    pitchVariance: 0
  },
  envelope: {
    attack: 0.003,
    decay: 2.0,
    sustain: 0.0,
    release: 0.3
  }
};
