/**
 * Ultra Steem Editor - SoundSynthEngine
 * High-performance procedural synthesizer using Web Audio API.
 * Supports specialized acoustic models (FM Crystal Bells, Organic Water Drops, Geiger Counter)
 * from reference physical synthesis alongside customizable mechanical switch presets.
 */

import { audioContextManager, xorshift32 } from './AudioContextManager';
import { voicePool } from './VoicePool';
import {
  CARILLON_BELL_SCALE,
  CATHEDRAL_BELL_SCALE,
  SHCHEDRYK_BELL_SCALE,
  getUniqueKeyIndex
} from './keyboardMap';
import {
  SoundPreset,
  KeySoundModifier,
  KeySoundTriggerOptions
} from './types';

export const PENTATONIC_SCALE = CARILLON_BELL_SCALE;

export class SoundSynthEngine {
  private static instance: SoundSynthEngine | null = null;

  public static getInstance(): SoundSynthEngine {
    if (!SoundSynthEngine.instance) {
      SoundSynthEngine.instance = new SoundSynthEngine();
    }
    return SoundSynthEngine.instance;
  }

  /**
   * Main entry point to play key sound
   */
  public async playKeySound(
    preset: SoundPreset,
    options: KeySoundTriggerOptions = {},
    pitchOffsetHz: number = 0,
    modifier?: KeySoundModifier
  ): Promise<void> {
    const ctx = await audioContextManager.ensureRunning();
    const masterGain = audioContextManager.getMasterGain();
    if (!ctx || !masterGain) return;

    // Detect specialized synthesis mode
    const mode = preset.synthesisMode || (
      preset.id === 'crystal-bell' ? 'bell' :
      preset.id === 'cathedral-bell' ? 'cathedral-bell' :
      preset.id === 'shchedryk' ? 'shchedryk' :
      preset.id === 'water-drops' || preset.id === 'water-bubble' ? 'bubbles' :
      preset.id === 'geiger-counter' ? 'geiger' : 'mechanical'
    );

    try {
      if (mode === 'bell') {
        this.playBellSound(ctx, masterGain, options, modifier);
        return;
      }

      if (mode === 'cathedral-bell') {
        this.playCathedralBellSound(ctx, masterGain, options, modifier);
        return;
      }

      if (mode === 'shchedryk') {
        this.playShchedrykSound(ctx, masterGain, options, modifier);
        return;
      }

      if (mode === 'bubbles') {
        this.playBubblesSound(ctx, masterGain, options, modifier);
        return;
      }

      if (mode === 'geiger') {
        this.playGeigerSound(ctx, masterGain, options, modifier);
        return;
      }

      // Default: mechanical / tactile switch synthesis
      this.playMechanicalSound(ctx, masterGain, preset, options, pitchOffsetHz, modifier);
    } catch (err) {
      console.warn('[SoundSynthEngine] Error synthesizing sound:', err);
    }
  }

  /**
   * Pure physical modeling of crystalline bells with multi-partial harmonics,
   * 1-to-1 collision-free unique carillon tuning for every letter/symbol, and zero repeat clashing.
   */
  private playBellSound(
    ctx: AudioContext,
    masterGain: GainNode,
    options: KeySoundTriggerOptions,
    modifier?: KeySoundModifier
  ): void {
    const now = ctx.currentTime;
    const rawKey = options.key || 'a';
    const rawCode = options.code || '';

    // 1. Backspace / Delete: Joyful rising celestial chime interval (E5 -> A5)
    if (rawKey === 'Backspace' || rawKey === 'Delete' || rawCode === 'Backspace' || rawCode === 'Delete') {
      this.playBellTone(ctx, masterGain, 659.25, 0.36, 1.4, now);
      this.playBellTone(ctx, masterGain, 880.00, 0.38, 1.6, now + 0.04);
      return;
    }

    // 2. Enter: Magnificent radiant multi-tone celestial chord (C5 + E5 + G5 + C6)
    if (rawKey === 'Enter' || rawCode === 'Enter') {
      this.playBellTone(ctx, masterGain, 523.25, 0.34, 2.2, now);
      this.playBellTone(ctx, masterGain, 659.25, 0.30, 2.3, now + 0.035);
      this.playBellTone(ctx, masterGain, 783.99, 0.28, 2.4, now + 0.07);
      this.playBellTone(ctx, masterGain, 1046.50, 0.26, 2.6, now + 0.105);
      return;
    }

    // 3. Spacebar: Warm, soothing singing quartz bell tone (C5 / 523.25 Hz)
    if (rawKey === ' ' || rawCode === 'Space') {
      this.playBellTone(ctx, masterGain, 523.25, 0.40, 2.0, now);
      return;
    }

    // 4. Regular Keys: Collision-free 1-to-1 unique joyful carillon bell mapping
    const uniqueIndex = getUniqueKeyIndex(rawKey, rawCode);
    const freq = CARILLON_BELL_SCALE[uniqueIndex % CARILLON_BELL_SCALE.length];

    // Dynamic volume scaling across octaves: gentle high-end roll-off to prevent ear fatigue and polyphony overload
    const baseVol = 0.40 - (uniqueIndex / CARILLON_BELL_SCALE.length) * 0.08;
    let vol = baseVol * (modifier?.gainMultiplier ?? 1.0);
    let decayTime = freq < 450 ? 2.0 : (freq > 1000 ? 1.4 : 1.7);

    // On continuous key-holding (repeat strokes), tighten decay to create a clean rhythmic chime without sound buildup
    if (options.isRepeat) {
      vol *= 0.75;
      decayTime = Math.min(decayTime * 0.45, 0.6);
    }

    this.playBellTone(ctx, masterGain, freq, vol, decayTime, now);
  }

  /**
   * Synthesizes a single high-purity crystal bell tone using pure 2-operator FM synthesis (Carrier + Modulator).
   * Zero node-overload, zero DC clicks, and singing natural harmonic decay.
   */
  private playBellTone(
    ctx: AudioContext,
    masterGain: GainNode,
    freq: number,
    vol: number,
    decayTime: number,
    _startTime: number
  ): void {
    const voice = voicePool.acquireVoice(ctx, masterGain, decayTime + 0.1, _startTime);
    const startTime = voice.startTime;

    const filter = voice.filterNode;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(12000, startTime);

    // 1. FM Carrier
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // 2. FM Modulator (1.5x inharmonic tierce/quint bell overtone)
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 1.5, startTime);

    // Dynamic FM modulation index: smooth, non-clicky metallic strike that relaxes into a pure crystal body
    modGain.gain.setValueAtTime(0.0001, startTime);
    modGain.gain.linearRampToValueAtTime(freq * 0.22, startTime + 0.005);
    modGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime * 0.45);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    // 3. Voice Master Gain: Smooth 8ms attack to eliminate clicks/pops
    const voiceGain = voice.gainNode;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol * 0.65, startTime + 0.008);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);

    osc.connect(filter);
    voice.registerNode(osc);
    voice.registerNode(mod);
    voice.registerNode(modGain);

    osc.start(startTime);
    mod.start(startTime);
    osc.stop(startTime + decayTime + 0.05);
    mod.stop(startTime + decayTime + 0.05);
  }

  /**
   * Authentic Cathedral Bronze Bells (Гармонійні соборні дзвони)
   * Smooth, cohesive register without abrupt octave jumps; rich bronze acoustics
   * with deep Hum Tone (0.5x), Strike Prime (1.0x), Warm Tierce (1.25x), Quint (1.5x), and Nominal (2.0x).
   */
  private playCathedralBellSound(
    ctx: AudioContext,
    masterGain: GainNode,
    options: KeySoundTriggerOptions,
    modifier?: KeySoundModifier
  ): void {
    const now = ctx.currentTime;
    const rawKey = options.key || 'a';
    const rawCode = options.code || '';

    // 1. Enter: Majestic triple cathedral bell peal (F4 + C5 + F5) with rich singing tail
    if (rawKey === 'Enter' || rawCode === 'Enter') {
      this.playCathedralBellTone(ctx, masterGain, 349.23, 0.36, 2.6, now);
      this.playCathedralBellTone(ctx, masterGain, 523.25, 0.30, 2.8, now + 0.04);
      this.playCathedralBellTone(ctx, masterGain, 698.46, 0.26, 3.0, now + 0.08);
      return;
    }

    // 2. Spacebar: Grand foundation bronze bass bell (D4 / 293.66 Hz)
    if (rawKey === ' ' || rawCode === 'Space') {
      this.playCathedralBellTone(ctx, masterGain, 293.66, 0.42, 2.4, now);
      return;
    }

    // 3. Backspace / Delete: Soothing cathedral soft clapper tone (A4 -> F4)
    if (rawKey === 'Backspace' || rawKey === 'Delete' || rawCode === 'Backspace' || rawCode === 'Delete') {
      this.playCathedralBellTone(ctx, masterGain, 440.00, 0.35, 1.6, now);
      this.playCathedralBellTone(ctx, masterGain, 349.23, 0.38, 1.8, now + 0.05);
      return;
    }

    // 4. Regular Keys: Smooth, tight 1-octave harmonic range (392 Hz .. 783 Hz)
    const uniqueIndex = getUniqueKeyIndex(rawKey, rawCode);
    const freq = CATHEDRAL_BELL_SCALE[uniqueIndex % CATHEDRAL_BELL_SCALE.length];

    let vol = 0.38 * (modifier?.gainMultiplier ?? 1.0);
    let decayTime = freq < 500 ? 2.2 : (freq > 650 ? 1.7 : 1.9);

    if (options.isRepeat) {
      vol *= 0.75;
      decayTime = Math.min(decayTime * 0.45, 0.6);
    }

    this.playCathedralBellTone(ctx, masterGain, freq, vol, decayTime, now);
  }

  /**
   * Synthesizes noble bronze cathedral bell acoustics using pure FM synthesis (Carrier + Inharmonic Modulator + Warm Hum).
   */
  private playCathedralBellTone(
    ctx: AudioContext,
    masterGain: GainNode,
    freq: number,
    vol: number,
    decayTime: number,
    _startTime: number
  ): void {
    const voice = voicePool.acquireVoice(ctx, masterGain, decayTime + 0.1, _startTime);
    const startTime = voice.startTime;

    const filter = voice.filterNode;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(10000, startTime);

    // 1. FM Carrier (Bronze strike prime)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // 2. Bronze Inharmonic Modulator (2.756x bronze bell ratio)
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.756, startTime);
    modGain.gain.setValueAtTime(0.0001, startTime);
    modGain.gain.linearRampToValueAtTime(freq * 0.18, startTime + 0.006);
    modGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime * 0.5);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    // 3. Gentle warm undertone cushion (0.5x)
    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    humOsc.type = 'sine';
    humOsc.frequency.setValueAtTime(Math.max(100, freq * 0.5), startTime);
    humGain.gain.setValueAtTime(0.0001, startTime);
    humGain.gain.linearRampToValueAtTime(vol * 0.08, startTime + 0.006);
    humGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime * 0.85);

    humOsc.connect(humGain);
    humGain.connect(filter);

    // 4. Voice Master Gain: Smooth 8ms attack to eliminate clicks/pops
    const voiceGain = voice.gainNode;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol * 0.70, startTime + 0.008);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);

    osc.connect(filter);
    voice.registerNode(osc);
    voice.registerNode(mod);
    voice.registerNode(modGain);
    voice.registerNode(humOsc);
    voice.registerNode(humGain);

    osc.start(startTime);
    mod.start(startTime);
    humOsc.start(startTime);

    osc.stop(startTime + decayTime + 0.05);
    mod.stop(startTime + decayTime + 0.05);
    humOsc.stop(startTime + decayTime + 0.05);
  }

  /**
   * Shchedryk / Carol of the Bells (Щедрик / Carol of the Bells)
   * Festive Ukrainian handbell & orchestra chime acoustic physical model,
   * stepping through Leontovych's iconic motifs and harmonies.
   */
  private playShchedrykSound(
    ctx: AudioContext,
    masterGain: GainNode,
    options: KeySoundTriggerOptions,
    modifier?: KeySoundModifier
  ): void {
    const now = ctx.currentTime;
    const rawKey = options.key || 'a';
    const rawCode = options.code || '';

    // 1. Enter: Celebratory full Shchedryk festive chime cascade (B4 -> D5 -> F#5 -> B5 + handbell flourish)
    if (rawKey === 'Enter' || rawCode === 'Enter') {
      this.playShchedrykChime(ctx, masterGain, 493.88, 0.34, 2.2, now); // B4
      this.playShchedrykChime(ctx, masterGain, 587.33, 0.30, 2.3, now + 0.04); // D5
      this.playShchedrykChime(ctx, masterGain, 739.99, 0.28, 2.4, now + 0.08); // F#5
      this.playShchedrykChime(ctx, masterGain, 987.77, 0.26, 2.6, now + 0.12); // B5 (High silver bell)
      // Rapid celebratory handbell echo (D5 -> C5 -> B4 -> C5)
      this.playShchedrykChime(ctx, masterGain, 587.33, 0.22, 1.2, now + 0.18);
      this.playShchedrykChime(ctx, masterGain, 523.25, 0.22, 1.2, now + 0.24);
      this.playShchedrykChime(ctx, masterGain, 493.88, 0.24, 1.4, now + 0.30);
      this.playShchedrykChime(ctx, masterGain, 523.25, 0.24, 1.6, now + 0.36);
      return;
    }

    // 2. Spacebar: Warm, deep festive chime tonic base (E4 / 329.63 Hz)
    if (rawKey === ' ' || rawCode === 'Space') {
      this.playShchedrykChime(ctx, masterGain, 329.63, 0.40, 2.0, now);
      return;
    }

    // 3. Backspace / Delete: Playful counter-phrase echo (G#4 -> A4)
    if (rawKey === 'Backspace' || rawKey === 'Delete' || rawCode === 'Backspace' || rawCode === 'Delete') {
      this.playShchedrykChime(ctx, masterGain, 415.30, 0.36, 1.4, now);
      this.playShchedrykChime(ctx, masterGain, 440.00, 0.38, 1.6, now + 0.04);
      return;
    }

    // 4. Regular Keys: Stepping through Shchedryk modal ostinato variations
    const uniqueIndex = getUniqueKeyIndex(rawKey, rawCode);
    const freq = SHCHEDRYK_BELL_SCALE[uniqueIndex % SHCHEDRYK_BELL_SCALE.length];

    let vol = 0.38 * (modifier?.gainMultiplier ?? 1.0);
    let decayTime = freq < 500 ? 1.8 : (freq > 800 ? 1.3 : 1.5);

    if (options.isRepeat) {
      vol *= 0.75;
      decayTime = Math.min(decayTime * 0.45, 0.6);
    }

    this.playShchedrykChime(ctx, masterGain, freq, vol, decayTime, now);
  }

  /**
   * Synthesizes a festive silver handbell chime using FM synthesis (2.0x silver octave harmonic).
   */
  private playShchedrykChime(
    ctx: AudioContext,
    masterGain: GainNode,
    freq: number,
    vol: number,
    decayTime: number,
    _startTime: number
  ): void {
    const voice = voicePool.acquireVoice(ctx, masterGain, decayTime + 0.1, _startTime);
    const startTime = voice.startTime;

    const filter = voice.filterNode;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(11500, startTime);

    // 1. FM Carrier
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // 2. Silver Handbell FM Modulator (2.0x pure octave chime)
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.0, startTime);
    modGain.gain.setValueAtTime(0.0001, startTime);
    modGain.gain.linearRampToValueAtTime(freq * 0.20, startTime + 0.005);
    modGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime * 0.45);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    // 3. Voice Master Gain: Smooth 8ms attack to eliminate clicks/pops
    const voiceGain = voice.gainNode;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol * 0.75, startTime + 0.008);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);

    osc.connect(filter);
    voice.registerNode(osc);
    voice.registerNode(mod);
    voice.registerNode(modGain);

    osc.start(startTime);
    mod.start(startTime);
    osc.stop(startTime + decayTime + 0.05);
    mod.stop(startTime + decayTime + 0.05);
  }

  /**
   * Organic soft water bubble drops with smooth pitch sweep,
   * warm lowpass filtering, and click-free envelopes.
   */
  private playBubblesSound(
    ctx: AudioContext,
    masterGain: GainNode,
    options: KeySoundTriggerOptions,
    modifier?: KeySoundModifier
  ): void {
    const now = ctx.currentTime;
    const rawKey = options.key || 'a';
    const rawCode = options.code || '';

    // Backspace: soft downward water droplet
    if (rawKey === 'Backspace' || rawKey === 'Delete' || rawCode === 'Backspace' || rawCode === 'Delete') {
      this.playSingleBubbleDrop(ctx, masterGain, 640, 360, 0.48, now);
      return;
    }

    // Enter: dual ripple water droplets
    if (rawKey === 'Enter' || rawCode === 'Enter') {
      this.playSingleBubbleDrop(ctx, masterGain, 520, 920, 0.45, now);
      this.playSingleBubbleDrop(ctx, masterGain, 680, 1180, 0.38, now + 0.04);
      return;
    }

    // Space: deep water droplet
    if (rawKey === ' ' || rawCode === 'Space') {
      this.playSingleBubbleDrop(ctx, masterGain, 480, 840, 0.52, now);
      return;
    }

    // Determine organic bubble pitch from collision-free unique key index
    const uniqueIndex = getUniqueKeyIndex(rawKey, rawCode);
    const baseFreq = 480 + (uniqueIndex % CARILLON_BELL_SCALE.length) * 14;
    const targetFreq = baseFreq * 1.72;
    const vol = 0.50 * (modifier?.gainMultiplier ?? 1.0);

    this.playSingleBubbleDrop(ctx, masterGain, baseFreq, targetFreq, vol, now);
  }

  /**
   * Synthesizes a single organic water droplet
   */
  private playSingleBubbleDrop(
    ctx: AudioContext,
    masterGain: GainNode,
    startFreq: number,
    endFreq: number,
    vol: number,
    _startTime: number
  ): void {
    const voice = voicePool.acquireVoice(ctx, masterGain, 0.08, _startTime);
    const startTime = voice.startTime;

    const filter = voice.filterNode;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, startTime);
    filter.Q.setValueAtTime(0.8, startTime);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.038);
    osc.frequency.exponentialRampToValueAtTime(endFreq * 0.95, startTime + 0.055);

    const voiceGain = voice.gainNode;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol, startTime + 0.003);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.060);

    osc.connect(filter);
    voice.registerNode(osc);

    osc.start(startTime);
    osc.stop(startTime + 0.070);
  }

  /**
   * Authentic S.T.A.L.K.E.R.-style Geiger-Müller radiation counter dosimeter clicks.
   * Features sharp piezoelectric sounder pings, electrostatic ionization sparks,
   * stochastic particle doublets, and highpass isolation (zero plastic/polymer box thumping).
   */
  private playGeigerSound(
    ctx: AudioContext,
    masterGain: GainNode,
    options: KeySoundTriggerOptions,
    modifier?: KeySoundModifier
  ): void {
    const now = ctx.currentTime;
    const rawKey = options.key || 'a';
    const rawCode = options.code || '';
    const gainMult = modifier?.gainMultiplier ?? 1.0;

    // 1. Enter: Rapid 3-particle radiation ionization burst (stepping near an anomaly)
    if (rawKey === 'Enter' || rawCode === 'Enter') {
      this.playSingleGeigerTick(ctx, masterGain, 0.68 * gainMult, now);
      this.playSingleGeigerTick(ctx, masterGain, 0.55 * gainMult, now + 0.007);
      this.playSingleGeigerTick(ctx, masterGain, 0.48 * gainMult, now + 0.016);
      return;
    }

    // 2. Spacebar: Prominent single dosimeter tick
    if (rawKey === ' ' || rawCode === 'Space') {
      this.playSingleGeigerTick(ctx, masterGain, 0.72 * gainMult, now);
      return;
    }

    // 3. Regular Keys & Backspace: Authentic stochastic ionizing particle ticks
    const primaryVol = 0.65 * gainMult;
    this.playSingleGeigerTick(ctx, masterGain, primaryVol, now);

    // Stochastic Poisson doublet click (~28% chance of secondary micro-particle)
    const charCode = rawKey.length > 0 ? rawKey.charCodeAt(0) : 65;
    const isDoublet = ((charCode * 17 + Math.floor(now * 100)) % 100) < 28;
    if (isDoublet) {
      const doubletDelay = 0.005 + (xorshift32() * 0.007); // 5ms - 12ms secondary arrival
      this.playSingleGeigerTick(ctx, masterGain, primaryVol * 0.58, now + doubletDelay);
    }
  }

  /**
   * Plays a single razor-sharp piezoelectric Geiger tick with highpass body-stripping and piezo resonance
   */
  private playSingleGeigerTick(
    ctx: AudioContext,
    masterGain: GainNode,
    vol: number,
    _startTime: number
  ): void {
    const buffer = audioContextManager.getGeigerBuffer();
    if (!buffer) return;

    const voice = voicePool.acquireVoice(ctx, masterGain, 0.01, _startTime);
    const startTime = voice.startTime;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Stochastic pitch variation per ionizing particle (3800Hz - 4800Hz range)
    const jitter = 0.92 + xorshift32() * 0.20;
    source.playbackRate.setValueAtTime(jitter, startTime);

    // 1. Highpass filter at 2200 Hz: completely removes muddy polymer box / plastic thump frequencies
    const highpass = voice.filterNode;
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(2200, startTime);
    highpass.Q.setValueAtTime(0.707, startTime);

    // 2. Peaking filter at 4100 Hz (Q=2.8): enhances the crisp piezoelectric sounder disc resonance ("пік/цок")
    const piezoPeak = ctx.createBiquadFilter();
    piezoPeak.type = 'peaking';
    piezoPeak.frequency.setValueAtTime(4100 + (xorshift32() * 300 - 150), startTime);
    piezoPeak.Q.setValueAtTime(2.8, startTime);
    piezoPeak.gain.setValueAtTime(3.5, startTime);

    const voiceGain = voice.gainNode;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol, startTime + 0.0001); // 0.1ms instantaneous needle spike
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.0024); // 2.4ms fast piezo decay

    source.connect(piezoPeak);
    piezoPeak.connect(highpass);
    voice.registerNode(source);
    voice.registerNode(piezoPeak);

    source.start(startTime);
    source.stop(startTime + 0.003);
  }

  /**
   * Intuitive downward pitch slide (280Hz -> 90Hz) representing undo / deletion for mechanical presets.
   */
  private playBackspaceSound(ctx: AudioContext, masterGain: GainNode, _now: number): void {
    const voice = voicePool.acquireVoice(ctx, masterGain, 0.12, _now);
    const startTime = voice.startTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, startTime);
    osc.frequency.exponentialRampToValueAtTime(90, startTime + 0.1);

    const voiceGain = voice.gainNode;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(0.35, startTime + 0.005);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.1);

    osc.connect(voice.filterNode);
    voice.registerNode(osc);

    osc.start(startTime);
    osc.stop(startTime + 0.11);
  }

  /**
   * Resonant carriage bell tone (1450Hz with 1.8s decay) marking typewriter paragraph / line completion.
   */
  private playEnterSound(ctx: AudioContext, masterGain: GainNode, _now: number): void {
    const voice = voicePool.acquireVoice(ctx, masterGain, 1.9, _now);
    const startTime = voice.startTime;

    const filter = voice.filterNode;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(7000, startTime);

    const osc = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1450, startTime);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(1450 * 1.5, startTime);
    modGain.gain.setValueAtTime(1450 * 0.35, startTime);
    modGain.gain.exponentialRampToValueAtTime(1, startTime + 0.15);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    const voiceGain = voice.gainNode;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(0.42, startTime + 0.005);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.8);

    osc.connect(filter);
    voice.registerNode(osc);
    voice.registerNode(mod);
    voice.registerNode(modGain);

    osc.start(startTime);
    mod.start(startTime);
    osc.stop(startTime + 1.85);
    mod.stop(startTime + 1.85);
  }

  /**
   * Standard mechanical switch synthesizer (Cherry Blue, Typewriter, Thock, Cyber, Chiclet).
   * Generates multi-oscillator tones, noise bursts, and click transients without dropping keystrokes.
   */
  private playMechanicalSound(
    ctx: AudioContext,
    masterGain: GainNode,
    preset: SoundPreset,
    _options: KeySoundTriggerOptions,
    pitchOffsetHz: number,
    modifier?: KeySoundModifier
  ): void {
    // 1. Calculate effective parameters with modifiers
    const pitchMult = modifier?.pitchMultiplier ?? 1.0;
    const gainMult = modifier?.gainMultiplier ?? 1.0;
    const noiseGainMult = modifier?.noiseGainMultiplier ?? 1.0;
    const decayMult = modifier?.decayMultiplier ?? 1.0;
    const filterFreqMult = modifier?.filterFreqMultiplier ?? 1.0;

    // Base Frequency with key-hash variance & pitch offset or fixed frequency
    const baseFreq = modifier?.fixedFreq
      ? modifier.fixedFreq
      : Math.max(
          40,
          (preset.oscillator.baseFreq + pitchOffsetHz + (modifier?.pitchOffset ?? 0)) * pitchMult
        );

    // Envelope durations
    const attack = Math.max(0.003, preset.envelope.attack);
    const decay = Math.max(0.015, preset.envelope.decay * decayMult);
    const totalDuration = attack + decay + (preset.envelope.release || 0.02);

    const voice = voicePool.acquireVoice(ctx, masterGain, totalDuration + 0.05);
    const startTime = voice.startTime;

    // Voice master gain for this single key hit
    const voiceGain = voice.gainNode;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(0.7 * gainMult, startTime + attack);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay);

    // Filter configuration
    const filterNode = voice.filterNode;
    if (preset.filter) {
      filterNode.type = preset.filter.type;
      const cutoff = Math.max(80, preset.filter.baseFrequency * filterFreqMult);
      filterNode.frequency.setValueAtTime(cutoff, startTime);
      filterNode.Q.setValueAtTime(preset.filter.q, startTime);
      if (preset.filter.gain) filterNode.gain.setValueAtTime(preset.filter.gain, startTime);

      if (preset.filter.freqSweep) {
        filterNode.frequency.exponentialRampToValueAtTime(
          Math.max(50, cutoff + preset.filter.freqSweep),
          startTime + decay
        );
      }
    } else {
      filterNode.type = 'allpass';
    }

    // 2. Main Oscillator
    const osc = ctx.createOscillator();
    osc.type = preset.oscillator.type;

    if (modifier?.slideDown) {
      const startDrop = Math.max(180, baseFreq * 1.2);
      osc.frequency.setValueAtTime(startDrop, startTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(60, startDrop * 0.32), startTime + Math.min(decay, 0.12));
    } else if (preset.oscillator.freqSweep) {
      osc.frequency.setValueAtTime(baseFreq, startTime);
      const sweepTarget = Math.max(40, baseFreq * preset.oscillator.freqSweep.targetRatio);
      osc.frequency.exponentialRampToValueAtTime(
        sweepTarget,
        startTime + preset.oscillator.freqSweep.durationSec
      );
    } else if (preset.oscillator.freqDecay && preset.oscillator.freqDecay > 0) {
      osc.frequency.setValueAtTime(baseFreq, startTime);
      const dropRatio = 0.45;
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(30, baseFreq * dropRatio),
        startTime + preset.oscillator.freqDecay
      );
    } else {
      osc.frequency.setValueAtTime(baseFreq, startTime);
    }

    // 2.1 FM Modulation (if defined in custom preset)
    if (preset.fmModulation && preset.fmModulation.depthRatio > 0 && !modifier?.slideDown) {
      const modOsc = ctx.createOscillator();
      const modGain = ctx.createGain();

      const modFreq = baseFreq * preset.fmModulation.freqRatio;
      const modDepth = baseFreq * preset.fmModulation.depthRatio;

      modOsc.type = 'sine';
      modOsc.frequency.setValueAtTime(modFreq, startTime);
      modGain.gain.setValueAtTime(modDepth, startTime);

      modOsc.connect(modGain);
      modGain.connect(osc.frequency);

      modOsc.start(startTime);
      modOsc.stop(startTime + totalDuration);

      voice.registerNode(modOsc);
      voice.registerNode(modGain);
    }

    if (preset.oscillator.detune) {
      osc.detune.setValueAtTime(preset.oscillator.detune, startTime);
    }

    osc.connect(filterNode);
    voice.registerNode(osc);

    osc.start(startTime);
    osc.stop(startTime + totalDuration);

    // 3. Sub / Overtone Oscillator (if configured in preset)
    if (preset.oscillator.subOsc && preset.oscillator.subOsc.gain > 0) {
      const subOsc = ctx.createOscillator();
      subOsc.type = preset.oscillator.subOsc.type;
      subOsc.frequency.setValueAtTime(baseFreq * preset.oscillator.subOsc.freqRatio, startTime);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.0001, startTime);
      subGain.gain.linearRampToValueAtTime(preset.oscillator.subOsc.gain * gainMult, startTime + 0.001);
      subGain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay * 0.8);

      subOsc.connect(subGain);
      subGain.connect(filterNode);
      voice.registerNode(subOsc);
      voice.registerNode(subGain);

      subOsc.start(startTime);
      subOsc.stop(startTime + totalDuration);
    }

    // 4. Noise Burst (mechanical friction, paper/platen strike, switch bottoming-out)
    if (preset.noise && preset.noise.gain > 0) {
      const noiseBuffer = audioContextManager.getNoiseBuffer(preset.noise.type);
      if (noiseBuffer) {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.playbackRate.setValueAtTime(preset.noise.playbackRate ?? 1.0, startTime);

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(
          preset.filter ? preset.filter.baseFrequency * 1.5 : 1800,
          startTime
        );
        noiseFilter.Q.setValueAtTime(2.0, startTime);

        const noiseGain = ctx.createGain();
        const effectiveNoiseGain = preset.noise.gain * noiseGainMult;
        const noiseDurationSec = (preset.noise.durationMs || 30) / 1000;

        noiseGain.gain.setValueAtTime(0.0001, startTime);
        noiseGain.gain.linearRampToValueAtTime(effectiveNoiseGain, startTime + 0.001);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDurationSec);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(filterNode);
        voice.registerNode(noiseSource);
        voice.registerNode(noiseFilter);
        voice.registerNode(noiseGain);

        noiseSource.start(startTime);
        noiseSource.stop(startTime + noiseDurationSec + 0.01);
      }
    }

    // 5. Mechanical Click Transient (smooth acoustic leaf snap)
    if (preset.transient?.enabled && (preset.transient.clickGain ?? 0) > 0) {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(preset.transient.clickFrequency ?? 2800, startTime);

      const clickGain = ctx.createGain();
      const clickDurationSec = Math.max(0.006, (preset.transient.clickDurationMs ?? 6) / 1000);
      clickGain.gain.setValueAtTime(0.0001, startTime);
      clickGain.gain.linearRampToValueAtTime((preset.transient.clickGain ?? 0.35) * gainMult, startTime + 0.0015);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + clickDurationSec);

      clickOsc.connect(clickGain);
      clickGain.connect(filterNode);
      voice.registerNode(clickOsc);
      voice.registerNode(clickGain);

      clickOsc.start(startTime);
      clickOsc.stop(startTime + clickDurationSec + 0.005);

      // Secondary Click (Tactile leaf reset, e.g. Cherry Blue double-click)
      if (
        preset.transient.secondaryClickDelayMs &&
        preset.transient.secondaryClickDelayMs > 0 &&
        (preset.transient.secondaryClickGain ?? 0) > 0
      ) {
        const secTime = startTime + preset.transient.secondaryClickDelayMs / 1000;
        const secOsc = ctx.createOscillator();
        secOsc.type = 'sine';
        secOsc.frequency.setValueAtTime((preset.transient.clickFrequency ?? 2800) * 1.15, secTime);

        const secGain = ctx.createGain();
        secGain.gain.setValueAtTime(0.0001, startTime);
        secGain.gain.setValueAtTime(0.0001, secTime);
        secGain.gain.linearRampToValueAtTime((preset.transient.secondaryClickGain ?? 0.22) * gainMult, secTime + 0.0015);
        secGain.gain.exponentialRampToValueAtTime(0.0001, secTime + clickDurationSec * 1.2);

        secOsc.connect(secGain);
        secGain.connect(filterNode);
        voice.registerNode(secOsc);
        voice.registerNode(secGain);

        secOsc.start(secTime);
        secOsc.stop(secTime + clickDurationSec * 1.2 + 0.005);
      }
    }

    // 6. Enter Key typewriter carriage bell simulation
    if (modifier?.extraBell) {
      const bellTime = startTime + 0.02;
      const bellOsc = ctx.createOscillator();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(1864, bellTime);

      const bellGain = ctx.createGain();
      bellGain.gain.setValueAtTime(0.0001, startTime);
      bellGain.gain.setValueAtTime(0.0001, bellTime);
      bellGain.gain.linearRampToValueAtTime(0.28, bellTime + 0.002);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 0.22);

      bellOsc.connect(bellGain);
      bellGain.connect(filterNode);
      voice.registerNode(bellOsc);
      voice.registerNode(bellGain);

      bellOsc.start(bellTime);
      bellOsc.stop(bellTime + 0.25);
    }
  }
}

export const soundSynthEngine = SoundSynthEngine.getInstance();
