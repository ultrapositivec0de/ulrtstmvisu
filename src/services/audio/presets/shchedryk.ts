import { SoundPreset } from '../types';

export const shchedrykPreset: SoundPreset = {
  id: 'shchedryk',
  name: 'Shchedryk / Carol of the Bells (Щедрик / Дзвоники Леонтовича)',
  description: 'Святковий стилізований передзвін за мотивами всесвітньо відомого «Щедрика» Миколи Леонтовича. Кожна клавіша вплітається в улюблені мотиви, а Enter дарує розкішний святковий каскад срібних дзвоників.',
  author: 'Ultra Steem Team',
  version: '1.0.0',
  tags: ['bell', 'shchedryk', 'carol', 'christmas', 'festive', 'ukrainian', 'celebration'],
  isBuiltin: true,
  synthesisMode: 'shchedryk',
  oscillator: {
    type: 'sine',
    baseFreq: 493.88,
    pitchVariance: 0
  },
  envelope: {
    attack: 0.0025,
    decay: 1.8,
    sustain: 0.0,
    release: 0.25
  }
};
