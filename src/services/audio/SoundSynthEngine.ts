/**
 * Ultra Steem Editor - SoundSynthEngine
 * High-performance procedural synthesizer using Web Audio API.
 * Supports specialized acoustic models (FM Crystal Bells, Organic Water Drops, Geiger Counter)
 * from reference physical synthesis alongside customizable mechanical switch presets.
 * Supports pre-rendering and caching of common key sounds into AudioBuffers via OfflineAudioContext
 * for perfect mobile and native-app port performance.
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
import { useEditorStore } from '../../store';

export class SoundSynthEngine {
  private static instance: SoundSynthEngine | null = null;

  // Cache of pre-rendered buffers: presetId -> (keyChar -> AudioBuffer)
  private preRenderedCache: Map<string, Map<string, AudioBuffer>> = new Map();
  private isPreRendering: boolean = false;

  private keystrokeTimestamps: number[] = [];
  private wpmDecayInterval: any = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.startWpmDecayer();
    }
  }

  private startWpmDecayer(): void {
    if (this.wpmDecayInterval) return;
    this.wpmDecayInterval = setInterval(() => {
      this.updateWpm();
    }, 300);
  }

  // Record a keystroke and update active WPM
  public recordKeystroke(): void {
    const now = performance.now();
    this.keystrokeTimestamps.push(now);
    this.updateWpm();
  }

  // Get current speed factor to scale decay times
  public getTypingSpeedFactor(): number {
    const wpm = this.getCurrentWpm();
    if (wpm <= 40) return 1.0;
    if (wpm >= 160) return 0.28; // scale decay down to 28% for ultra fast typing
    // linear interpolation between 40 WPM and 160 WPM
    const ratio = (wpm - 40) / (160 - 40);
    return 1.0 - ratio * (1.0 - 0.28);
  }

  private updateWpm(): void {
    const now = performance.now();
    const windowMs = 4000; // 4 second sliding window
    this.keystrokeTimestamps = this.keystrokeTimestamps.filter(t => t > now - windowMs);
    
    // Formula: WPM = (Keystrokes / 5) * (60000 / windowMs)
    // For 4 seconds window: WPM = Keystrokes * 3
    const calculatedWpm = Math.round((this.keystrokeTimestamps.length / 5) * (60000 / windowMs));
    
    try {
      const state = useEditorStore.getState();
      if (state && state.setWpm && state.wpm !== calculatedWpm) {
        state.setWpm(calculatedWpm);
      }
    } catch (e) {
      // safe fallback
    }
  }

  public getCurrentWpm(): number {
    const now = performance.now();
    const windowMs = 4000;
    const active = this.keystrokeTimestamps.filter(t => t > now - windowMs);
    return Math.round((active.length / 5) * (60000 / windowMs));
  }

  public static getInstance(): SoundSynthEngine {
    if (!SoundSynthEngine.instance) {
      SoundSynthEngine.instance = new SoundSynthEngine();
    }
    return SoundSynthEngine.instance;
  }

  /**
   * Clears the pre-rendered audio buffer cache
   */
  public clearCache(): void {
    this.preRenderedCache.clear();
  }

  /**
   * Pre-renders all common key sounds for the specified preset using OfflineAudioContext.
   * Runs as a staggered background task to avoid any possibility of UI thread stutter.
   */
  public async preRenderPresetSounds(preset: SoundPreset): Promise<void> {
    if (this.isPreRendering) return;
    this.isPreRendering = true;

    const ctx = await audioContextManager.getContext();
    if (!ctx) {
      this.isPreRendering = false;
      return;
    }

    const presetId = preset.id;
    // If this preset is already cached, we are fully warmed up
    if (this.preRenderedCache.has(presetId)) {
      this.isPreRendering = false;
      return;
    }

    const keyCache = new Map<string, AudioBuffer>();
    this.preRenderedCache.set(presetId, keyCache);

    // High-frequency keys, common letters (Latin & Ukrainian), digits, space, enter, and punctuation marks
    const keysToRender = [
      ' ', 'Enter', 'Backspace',
      // Latin letters
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
      // Ukrainian Cyrillic letters
      'а', 'б', 'в', 'г', 'ґ', 'д', 'е', 'є', 'ж', 'з', 'и', 'і', 'ї', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ь', 'ю', 'я',
      // Digits & Punctuation
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      ',', '.', '!', '?', '\'', '’'
    ];

    // Stagger rendering in micro-batches to allow UI thread to process events smoothly
    const batchSize = 10;
    for (let i = 0; i < keysToRender.length; i += batchSize) {
      const batch = keysToRender.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (key) => {
          try {
            const buffer = await this.renderSingleKeySound(preset, key, ctx);
            if (buffer) {
              keyCache.set(key, buffer);
            }
          } catch (err) {
            console.warn(`[SoundSynthEngine] Error pre-rendering key '${key}':`, err);
          }
        })
      );
      // Brief breathing room for browser scheduler
      await new Promise((resolve) => setTimeout(resolve, 4));
    }

    this.isPreRendering = false;
    console.log(`[SoundSynthEngine] Successfully pre-rendered ${keyCache.size} sounds for preset: ${preset.name}`);
  }

  /**
   * Resolves the deterministic key modifiers and pitch offsets for a given key, matching KeyHashDispatcher
   */
  private resolveKeyParams(preset: SoundPreset, key: string): { pitchOffsetHz: number; modifier?: KeySoundModifier } {
    const code = key === ' ' ? 'Space' : '';
    let category: string = 'other';
    let specialKeyId: string | undefined;

    if (key === ' ') {
      category = 'space';
      specialKeyId = 'space';
    } else if (key === 'Enter') {
      category = 'enter';
      specialKeyId = 'enter';
    } else if (key === 'Backspace') {
      category = 'backspace';
      specialKeyId = 'backspace';
    } else if (key === 'Delete') {
      category = 'delete';
      specialKeyId = 'delete';
    } else if (/^[0-9]$/.test(key)) {
      category = 'number';
      specialKeyId = 'numbers';
    } else if (/[.,!?;:()[\]{}'"/\\@#$%^&*_\-+=<>~`]/.test(key)) {
      category = 'punctuation';
      specialKeyId = 'punctuation';
    }

    let modifier: KeySoundModifier | undefined;
    if (specialKeyId && preset.specialKeys && preset.specialKeys[specialKeyId]) {
      modifier = preset.specialKeys[specialKeyId];
    } else if (category === 'backspace') {
      modifier = { slideDown: true, decayMultiplier: 1.15, gainMultiplier: 0.85 };
    } else if (category === 'enter') {
      modifier = { extraBell: true, gainMultiplier: 1.15 };
    }

    let pitchOffsetHz: number;
    const mode = preset.synthesisMode || (
      preset.id === 'crystal-bell' ? 'bell' :
      preset.id === 'cathedral-bell' ? 'cathedral-bell' :
      preset.id === 'shchedryk' ? 'shchedryk' :
      preset.id === 'water-drops' ? 'bubbles' :
      preset.id === 'geiger-counter' ? 'geiger' : 'mechanical'
    );

    if (mode === 'cathedral-bell') {
      const uniqueIdx = getUniqueKeyIndex(key, code);
      const targetFreq = CATHEDRAL_BELL_SCALE[uniqueIdx % CATHEDRAL_BELL_SCALE.length];
      pitchOffsetHz = targetFreq - (preset.oscillator?.baseFreq ?? 440.0);
    } else if (mode === 'shchedryk') {
      const uniqueIdx = getUniqueKeyIndex(key, code);
      const targetFreq = SHCHEDRYK_BELL_SCALE[uniqueIdx % SHCHEDRYK_BELL_SCALE.length];
      pitchOffsetHz = targetFreq - (preset.oscillator?.baseFreq ?? 493.88);
    } else if (preset.tuningScale === 'pentatonic' || mode === 'bell') {
      const uniqueIdx = getUniqueKeyIndex(key, code);
      const targetFreq = CARILLON_BELL_SCALE[uniqueIdx % CARILLON_BELL_SCALE.length];
      pitchOffsetHz = targetFreq - (preset.oscillator?.baseFreq ?? 523.25);
    } else {
      const maxVarianceHz = preset.oscillator?.pitchVariance ?? 45;
      const uniqueIdx = getUniqueKeyIndex(key, code);
      const normalized = (uniqueIdx / (54 - 1)) * 2 - 1; // range [-1.0 .. 1.0]
      pitchOffsetHz = Math.round(normalized * maxVarianceHz * 10) / 10;

      if (key.length === 1 && key !== key.toLowerCase()) {
        pitchOffsetHz += 4.5;
      }
    }

    return { pitchOffsetHz, modifier };
  }

  /**
   * Renders a single key sound offline into an AudioBuffer
   */
  private async renderSingleKeySound(
    preset: SoundPreset,
    key: string,
    liveCtx: AudioContext
  ): Promise<AudioBuffer | null> {
    try {
      const mode = preset.synthesisMode || (
        preset.id === 'crystal-bell' ? 'bell' :
        preset.id === 'cathedral-bell' ? 'cathedral-bell' :
        preset.id === 'shchedryk' ? 'shchedryk' :
        preset.id === 'water-drops' ? 'bubbles' :
        preset.id === 'geiger-counter' ? 'geiger' : 'mechanical'
      );

      let durationSec = 0.25;
      if (mode === 'bell' || mode === 'cathedral-bell' || mode === 'shchedryk') {
        durationSec = 2.0; // Captures beautiful long tails of bells
      } else if (mode === 'bubbles') {
        durationSec = 0.12;
      } else if (mode === 'geiger') {
        durationSec = 0.03;
      } else {
        // Mechanical presets
        const { modifier } = this.resolveKeyParams(preset, key);
        const decayMult = modifier?.decayMultiplier ?? 1.0;
        const attack = preset.envelope.attack ?? 0.002;
        const decay = preset.envelope.decay ?? 0.04;
        const release = preset.envelope.release ?? 0.015;
        durationSec = attack + (decay * decayMult) + release + 0.08;
        if (modifier?.extraBell) {
          durationSec = Math.max(durationSec, 0.35);
        }
      }

      const sampleRate = liveCtx.sampleRate;
      const renderCtx = new OfflineAudioContext(1, Math.floor(sampleRate * durationSec), sampleRate);

      const filterNode = renderCtx.createBiquadFilter();
      const gainNode = renderCtx.createGain();

      filterNode.connect(gainNode);
      gainNode.connect(renderCtx.destination);

      const { pitchOffsetHz, modifier } = this.resolveKeyParams(preset, key);

      this.synthesizePresetSound(
        renderCtx,
        gainNode,
        filterNode,
        preset,
        mode,
        key,
        { key, code: key === ' ' ? 'Space' : '' },
        pitchOffsetHz,
        modifier,
        0.002, // ultra tight lookahead for transients
        () => {} // offline nodes do not need registration/manual disconnects
      );

      return await renderCtx.startRendering();
    } catch (err) {
      console.warn(`[SoundSynthEngine] Failed offline render for key '${key}':`, err);
      return null;
    }
  }

  /**
   * Main entry point to play a key sound
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

    // Trigger pre-rendering of current preset in background if not already started/done
    this.preRenderPresetSounds(preset).catch(() => {});

    const rawKey = options.key || 'a';
    const normalizedKey = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;

    // Query pre-rendered buffer cache
    const presetCache = this.preRenderedCache.get(preset.id);
    const cachedBuffer = presetCache ? presetCache.get(normalizedKey) : null;

    if (cachedBuffer) {
      // 1. HIGH-PERFORMANCE PRE-RENDERED BUFFER PLAYBACK (Ultra low latency, perfect for Android/Mobile Web)
      this.playPreRenderedBuffer(ctx, masterGain, cachedBuffer, preset, options, modifier);
      return;
    }

    // 2. REAL-TIME PROCEDURAL FALLBACK (For rare characters or initial keystrokes prior to render completion)
    const mode = preset.synthesisMode || (
      preset.id === 'crystal-bell' ? 'bell' :
      preset.id === 'cathedral-bell' ? 'cathedral-bell' :
      preset.id === 'shchedryk' ? 'shchedryk' :
      preset.id === 'water-drops' || preset.id === 'water-bubble' ? 'bubbles' :
      preset.id === 'geiger-counter' ? 'geiger' : 'mechanical'
    );

    try {
      let totalDuration = 0.25;
      if (mode === 'bell' || mode === 'cathedral-bell' || mode === 'shchedryk') {
        totalDuration = 2.1;
      } else if (mode === 'bubbles') {
        totalDuration = 0.12;
      } else if (mode === 'geiger') {
        totalDuration = 0.03;
      } else {
        const decayMult = modifier?.decayMultiplier ?? 1.0;
        totalDuration = (preset.envelope.attack ?? 0.002) + ((preset.envelope.decay ?? 0.04) * decayMult) + (preset.envelope.release ?? 0.015) + 0.1;
      }

      const voice = voicePool.acquireVoice(ctx, masterGain, totalDuration + 0.05);

      // Introduce dynamic humanization jitter for real-time playback
      const creativePresetIds = [
        'crystal-bell', 'cathedral-bell', 'shchedryk', 'water-drops',
        'bamboo-zen', 'space-nebula', 'forest-rain', 'lofi-chill', 'coffee-shop'
      ];
      const isCreative = creativePresetIds.includes(preset.id);
      const pitchJitterRange = isCreative ? 0.022 : 0.012;
      const volumeJitterRange = isCreative ? 0.09 : 0.05;
      
      const randomPitchFactor = 1.0 + (Math.random() * 2 - 1) * pitchJitterRange;
      const randomVolumeFactor = 1.0 + (Math.random() * 2 - 1) * volumeJitterRange;
      
      // Calculate a randomized pitch offset for real-time play
      const livePitchOffsetHz = pitchOffsetHz + (randomPitchFactor - 1.0) * (preset.oscillator?.baseFreq ?? 220);
      
      // Merge volume jitter into the modifier
      const liveModifier: KeySoundModifier = {
        ...modifier,
        gainMultiplier: (modifier?.gainMultiplier ?? 1.0) * randomVolumeFactor
      };

      this.synthesizePresetSound(
        ctx,
        voice.gainNode,
        voice.filterNode,
        preset,
        mode,
        rawKey,
        options,
        livePitchOffsetHz,
        liveModifier,
        voice.startTime,
        (node) => voice.registerNode(node)
      );
    } catch (err) {
      console.warn('[SoundSynthEngine] Error during real-time synthesis fallback:', err);
    }
  }

  /**
   * Plays a pre-rendered AudioBuffer cleanly through the voice pool with dynamic humanization
   */
  private playPreRenderedBuffer(
    ctx: AudioContext,
    masterGain: GainNode,
    buffer: AudioBuffer,
    preset: SoundPreset,
    options: KeySoundTriggerOptions,
    modifier?: KeySoundModifier
  ): void {
    const speedFactor = this.getTypingSpeedFactor();
    const duration = buffer.duration;
    const playDuration = duration * speedFactor;

    // Acquire a voice to automatically support active voice capping (voice stealing) & master soft clipping
    const voice = voicePool.acquireVoice(ctx, masterGain, playDuration + 0.02);
    const startTime = voice.startTime;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const voiceGain = voice.gainNode;
    const voiceFilter = voice.filterNode;

    // Dynamic anti-mud low frequency shelving highpass EQ during rapid typing
    if (speedFactor < 0.95) {
      const cutoff = 60 + (1.0 - speedFactor) * (220 - 60) / (1.0 - 0.28);
      voiceFilter.type = 'highpass';
      voiceFilter.frequency.setValueAtTime(cutoff, startTime);
      voiceFilter.Q.setValueAtTime(0.7, startTime);
    } else {
      voiceFilter.type = 'allpass';
    }

    // Introduce dynamic humanization jitter (micro-pitch and micro-volume offsets)
    // to prevent static/repetitive "machine-gun" effect and make typing sound incredibly organic.
    const creativePresetIds = [
      'crystal-bell', 'cathedral-bell', 'shchedryk', 'water-drops',
      'bamboo-zen', 'space-nebula', 'forest-rain', 'lofi-chill', 'coffee-shop'
    ];
    const isCreative = creativePresetIds.includes(preset.id);
    
    // For creative/melodic sounds, a slightly larger pitch jitter makes them feel richer and more shimmering.
    // For mechanical switches, a subtle pitch jitter of ~1.2% keeps them realistic and perfectly mechanical.
    const pitchJitterRange = isCreative ? 0.022 : 0.012; 
    const volumeJitterRange = isCreative ? 0.09 : 0.05;
    
    const randomPitchFactor = 1.0 + (Math.random() * 2 - 1) * pitchJitterRange;
    const randomVolumeFactor = 1.0 + (Math.random() * 2 - 1) * volumeJitterRange;
    
    // Apply pitch jitter to playback rate
    source.playbackRate.setValueAtTime(randomPitchFactor, startTime);

    let volume = 1.0;
    if (modifier?.gainMultiplier) {
      volume *= modifier.gainMultiplier;
    }
    if (options.isRepeat) {
      volume *= 0.72; // Tighten volume slightly on key-holding repeat strokes
    }

    // Apply volume humanization
    volume *= randomVolumeFactor;

    // Mild high-speed volume compression/attenuation to prevent rapid sound buildup fatigue
    if (speedFactor < 1.0) {
      const volAtten = 1.0 - (1.0 - speedFactor) * 0.35;
      volume *= volAtten;
    }

    const releaseTime = Math.min(0.015, playDuration * 0.15);
    const attackTime = Math.min(0.002, playDuration * 0.05);

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(volume, startTime + attackTime); // crisp click-free fade-in
    voiceGain.gain.setValueAtTime(volume, startTime + playDuration - releaseTime);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + playDuration); // smooth release to avoid pop

    source.connect(voiceFilter);
    voice.registerNode(source);

    source.start(startTime);
    source.stop(startTime + playDuration);
  }

  /**
   * Universal procedural synthesizer. Dispatches the synthesis to the chosen acoustic model.
   * Works on any BaseAudioContext (meaning both real-time AudioContext and OfflineAudioContext).
   */
  private synthesizePresetSound(
    ctx: BaseAudioContext,
    targetGainNode: GainNode,
    targetFilterNode: BiquadFilterNode,
    preset: SoundPreset,
    mode: string,
    key: string,
    options: KeySoundTriggerOptions,
    pitchOffsetHz: number,
    modifier: KeySoundModifier | undefined,
    startTime: number,
    registerNode: (node: AudioNode) => void
  ): void {
    const rawCode = options.code || '';
    const speedFactor = this.getTypingSpeedFactor();

    if (mode === 'bell') {
      if (key === 'Backspace' || key === 'Delete') {
        this.synthesizeBellTone(ctx, targetGainNode, targetFilterNode, 659.25, 0.36, 1.4 * speedFactor, startTime, registerNode);
        this.synthesizeBellTone(ctx, targetGainNode, targetFilterNode, 880.00, 0.38, 1.6 * speedFactor, startTime + 0.04 * speedFactor, registerNode);
        return;
      }
      if (key === 'Enter') {
        this.synthesizeBellTone(ctx, targetGainNode, targetFilterNode, 523.25, 0.34, 2.2 * speedFactor, startTime, registerNode);
        this.synthesizeBellTone(ctx, targetGainNode, targetFilterNode, 659.25, 0.30, 2.3 * speedFactor, startTime + 0.035 * speedFactor, registerNode);
        this.synthesizeBellTone(ctx, targetGainNode, targetFilterNode, 783.99, 0.28, 2.4 * speedFactor, startTime + 0.07 * speedFactor, registerNode);
        this.synthesizeBellTone(ctx, targetGainNode, targetFilterNode, 1046.50, 0.26, 2.6 * speedFactor, startTime + 0.105 * speedFactor, registerNode);
        return;
      }
      if (key === ' ' || rawCode === 'Space') {
        this.synthesizeBellTone(ctx, targetGainNode, targetFilterNode, 523.25, 0.40, 2.0 * speedFactor, startTime, registerNode);
        return;
      }

      const uniqueIndex = getUniqueKeyIndex(key, rawCode);
      const freq = CARILLON_BELL_SCALE[uniqueIndex % CARILLON_BELL_SCALE.length];
      const baseVol = 0.40 - (uniqueIndex / CARILLON_BELL_SCALE.length) * 0.08;
      let vol = baseVol * (modifier?.gainMultiplier ?? 1.0);
      let decayTime = freq < 450 ? 2.0 : (freq > 1000 ? 1.4 : 1.7);
      decayTime *= speedFactor;

      if (options.isRepeat) {
        vol *= 0.75;
        decayTime = Math.min(decayTime * 0.45, 0.6);
      }

      this.synthesizeBellTone(ctx, targetGainNode, targetFilterNode, freq, vol, decayTime, startTime, registerNode);
      return;
    }

    if (mode === 'cathedral-bell') {
      if (key === 'Enter') {
        this.synthesizeCathedralBellTone(ctx, targetGainNode, targetFilterNode, 349.23, 0.36, 2.6 * speedFactor, startTime, registerNode);
        this.synthesizeCathedralBellTone(ctx, targetGainNode, targetFilterNode, 523.25, 0.30, 2.8 * speedFactor, startTime + 0.04 * speedFactor, registerNode);
        this.synthesizeCathedralBellTone(ctx, targetGainNode, targetFilterNode, 698.46, 0.26, 3.0 * speedFactor, startTime + 0.08 * speedFactor, registerNode);
        return;
      }
      if (key === ' ' || rawCode === 'Space') {
        this.synthesizeCathedralBellTone(ctx, targetGainNode, targetFilterNode, 293.66, 0.42, 2.4 * speedFactor, startTime, registerNode);
        return;
      }
      if (key === 'Backspace' || key === 'Delete') {
        this.synthesizeCathedralBellTone(ctx, targetGainNode, targetFilterNode, 440.00, 0.35, 1.6 * speedFactor, startTime, registerNode);
        this.synthesizeCathedralBellTone(ctx, targetGainNode, targetFilterNode, 349.23, 0.38, 1.8 * speedFactor, startTime + 0.05 * speedFactor, registerNode);
        return;
      }

      const uniqueIndex = getUniqueKeyIndex(key, rawCode);
      const freq = CATHEDRAL_BELL_SCALE[uniqueIndex % CATHEDRAL_BELL_SCALE.length];
      let vol = 0.38 * (modifier?.gainMultiplier ?? 1.0);
      let decayTime = freq < 500 ? 2.2 : (freq > 650 ? 1.7 : 1.9);
      decayTime *= speedFactor;

      if (options.isRepeat) {
        vol *= 0.75;
        decayTime = Math.min(decayTime * 0.45, 0.6);
      }

      this.synthesizeCathedralBellTone(ctx, targetGainNode, targetFilterNode, freq, vol, decayTime, startTime, registerNode);
      return;
    }

    if (mode === 'shchedryk') {
      if (key === 'Enter') {
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 493.88, 0.34, 2.2 * speedFactor, startTime, registerNode);
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 587.33, 0.30, 2.3 * speedFactor, startTime + 0.04 * speedFactor, registerNode);
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 739.99, 0.28, 2.4 * speedFactor, startTime + 0.08 * speedFactor, registerNode);
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 987.77, 0.26, 2.6 * speedFactor, startTime + 0.12 * speedFactor, registerNode);
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 587.33, 0.22, 1.2 * speedFactor, startTime + 0.18 * speedFactor, registerNode);
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 523.25, 0.22, 1.2 * speedFactor, startTime + 0.24 * speedFactor, registerNode);
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 493.88, 0.24, 1.4 * speedFactor, startTime + 0.30 * speedFactor, registerNode);
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 523.25, 0.24, 1.6 * speedFactor, startTime + 0.36 * speedFactor, registerNode);
        return;
      }
      if (key === ' ' || rawCode === 'Space') {
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 329.63, 0.40, 2.0 * speedFactor, startTime, registerNode);
        return;
      }
      if (key === 'Backspace' || key === 'Delete') {
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 415.30, 0.36, 1.4 * speedFactor, startTime, registerNode);
        this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, 440.00, 0.38, 1.6 * speedFactor, startTime + 0.04 * speedFactor, registerNode);
        return;
      }

      const uniqueIndex = getUniqueKeyIndex(key, rawCode);
      const freq = SHCHEDRYK_BELL_SCALE[uniqueIndex % SHCHEDRYK_BELL_SCALE.length];
      let vol = 0.38 * (modifier?.gainMultiplier ?? 1.0);
      let decayTime = freq < 500 ? 1.8 : (freq > 800 ? 1.3 : 1.5);
      decayTime *= speedFactor;

      if (options.isRepeat) {
        vol *= 0.75;
        decayTime = Math.min(decayTime * 0.45, 0.6);
      }

      this.synthesizeShchedrykChime(ctx, targetGainNode, targetFilterNode, freq, vol, decayTime, startTime, registerNode);
      return;
    }

    if (mode === 'bubbles') {
      if (key === 'Backspace' || key === 'Delete') {
        this.synthesizeSingleBubbleDrop(ctx, targetGainNode, targetFilterNode, 640, 360, 0.48, startTime, registerNode);
        return;
      }
      if (key === 'Enter') {
        this.synthesizeSingleBubbleDrop(ctx, targetGainNode, targetFilterNode, 520, 920, 0.45, startTime, registerNode);
        this.synthesizeSingleBubbleDrop(ctx, targetGainNode, targetFilterNode, 680, 1180, 0.38, startTime + 0.04, registerNode);
        return;
      }
      if (key === ' ' || rawCode === 'Space') {
        this.synthesizeSingleBubbleDrop(ctx, targetGainNode, targetFilterNode, 480, 840, 0.52, startTime, registerNode);
        return;
      }

      const uniqueIndex = getUniqueKeyIndex(key, rawCode);
      const baseFreq = 480 + (uniqueIndex % CARILLON_BELL_SCALE.length) * 14;
      const targetFreq = baseFreq * 1.72;
      const vol = 0.50 * (modifier?.gainMultiplier ?? 1.0);

      this.synthesizeSingleBubbleDrop(ctx, targetGainNode, targetFilterNode, baseFreq, targetFreq, vol, startTime, registerNode);
      return;
    }

    if (mode === 'geiger') {
      const gainMult = modifier?.gainMultiplier ?? 1.0;
      if (key === 'Enter') {
        this.synthesizeSingleGeigerTick(ctx, targetGainNode, targetFilterNode, 0.68 * gainMult, startTime, registerNode);
        this.synthesizeSingleGeigerTick(ctx, targetGainNode, targetFilterNode, 0.55 * gainMult, startTime + 0.007, registerNode);
        this.synthesizeSingleGeigerTick(ctx, targetGainNode, targetFilterNode, 0.48 * gainMult, startTime + 0.016, registerNode);
        return;
      }
      if (key === ' ' || rawCode === 'Space') {
        this.synthesizeSingleGeigerTick(ctx, targetGainNode, targetFilterNode, 0.72 * gainMult, startTime, registerNode);
        return;
      }

      const primaryVol = 0.65 * gainMult;
      this.synthesizeSingleGeigerTick(ctx, targetGainNode, targetFilterNode, primaryVol, startTime, registerNode);

      const charCode = key.length > 0 ? key.charCodeAt(0) : 65;
      const isDoublet = ((charCode * 17 + Math.floor(startTime * 100)) % 100) < 28;
      if (isDoublet) {
        const doubletDelay = 0.005 + (xorshift32() * 0.007);
        this.synthesizeSingleGeigerTick(ctx, targetGainNode, targetFilterNode, primaryVol * 0.58, startTime + doubletDelay, registerNode);
      }
      return;
    }

    // Default mechanical keyboard modeling
    this.synthesizeMechanicalSound(ctx, targetGainNode, targetFilterNode, preset, options, pitchOffsetHz, modifier, startTime, registerNode);
  }

  /**
   * FM Crystal Bell Synth core logic
   */
  private synthesizeBellTone(
    ctx: BaseAudioContext,
    voiceGain: GainNode,
    filter: BiquadFilterNode,
    freq: number,
    vol: number,
    decayTime: number,
    startTime: number,
    registerNode: (node: AudioNode) => void
  ): void {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(12000, startTime);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 1.5, startTime);

    modGain.gain.setValueAtTime(0.0001, startTime);
    modGain.gain.linearRampToValueAtTime(freq * 0.22, startTime + 0.005);
    modGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime * 0.45);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol * 0.65, startTime + 0.008);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);

    osc.connect(filter);
    registerNode(osc);
    registerNode(mod);
    registerNode(modGain);

    osc.start(startTime);
    mod.start(startTime);
    osc.stop(startTime + decayTime + 0.05);
    mod.stop(startTime + decayTime + 0.05);
  }

  /**
   * Cathedral Bell Synth core logic
   */
  private synthesizeCathedralBellTone(
    ctx: BaseAudioContext,
    voiceGain: GainNode,
    filter: BiquadFilterNode,
    freq: number,
    vol: number,
    decayTime: number,
    startTime: number,
    registerNode: (node: AudioNode) => void
  ): void {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(10000, startTime);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.756, startTime);
    modGain.gain.setValueAtTime(0.0001, startTime);
    modGain.gain.linearRampToValueAtTime(freq * 0.18, startTime + 0.006);
    modGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime * 0.5);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    humOsc.type = 'sine';
    humOsc.frequency.setValueAtTime(Math.max(100, freq * 0.5), startTime);
    humGain.gain.setValueAtTime(0.0001, startTime);
    humGain.gain.linearRampToValueAtTime(vol * 0.08, startTime + 0.006);
    humGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime * 0.85);

    humOsc.connect(humGain);
    humGain.connect(filter);

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol * 0.70, startTime + 0.008);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);

    osc.connect(filter);
    registerNode(osc);
    registerNode(mod);
    registerNode(modGain);
    registerNode(humOsc);
    registerNode(humGain);

    osc.start(startTime);
    mod.start(startTime);
    humOsc.start(startTime);

    osc.stop(startTime + decayTime + 0.05);
    mod.stop(startTime + decayTime + 0.05);
    humOsc.stop(startTime + decayTime + 0.05);
  }

  /**
   * Leontovych Shchedryk Bell core logic
   */
  private synthesizeShchedrykChime(
    ctx: BaseAudioContext,
    voiceGain: GainNode,
    filter: BiquadFilterNode,
    freq: number,
    vol: number,
    decayTime: number,
    startTime: number,
    registerNode: (node: AudioNode) => void
  ): void {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(11500, startTime);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.0, startTime);
    modGain.gain.setValueAtTime(0.0001, startTime);
    modGain.gain.linearRampToValueAtTime(freq * 0.20, startTime + 0.005);
    modGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime * 0.45);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol * 0.75, startTime + 0.008);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);

    osc.connect(filter);
    registerNode(osc);
    registerNode(mod);
    registerNode(modGain);

    osc.start(startTime);
    mod.start(startTime);
    osc.stop(startTime + decayTime + 0.05);
    mod.stop(startTime + decayTime + 0.05);
  }

  /**
   * Water Droplet bubble organic synth core logic
   */
  private synthesizeSingleBubbleDrop(
    ctx: BaseAudioContext,
    voiceGain: GainNode,
    filter: BiquadFilterNode,
    startFreq: number,
    endFreq: number,
    vol: number,
    startTime: number,
    registerNode: (node: AudioNode) => void
  ): void {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, startTime);
    filter.Q.setValueAtTime(0.8, startTime);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.038);
    osc.frequency.exponentialRampToValueAtTime(endFreq * 0.95, startTime + 0.055);

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol, startTime + 0.003);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.060);

    osc.connect(filter);
    registerNode(osc);

    osc.start(startTime);
    osc.stop(startTime + 0.070);
  }

  /**
   * Geiger-Müller radiation tick core logic
   */
  private synthesizeSingleGeigerTick(
    ctx: BaseAudioContext,
    voiceGain: GainNode,
    highpass: BiquadFilterNode,
    vol: number,
    startTime: number,
    registerNode: (node: AudioNode) => void
  ): void {
    const buffer = audioContextManager.getGeigerBuffer();
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const jitter = 0.92 + xorshift32() * 0.20;
    source.playbackRate.setValueAtTime(jitter, startTime);

    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(2200, startTime);
    highpass.Q.setValueAtTime(0.707, startTime);

    const piezoPeak = ctx.createBiquadFilter();
    piezoPeak.type = 'peaking';
    piezoPeak.frequency.setValueAtTime(4100 + (xorshift32() * 300 - 150), startTime);
    piezoPeak.Q.setValueAtTime(2.8, startTime);
    piezoPeak.gain.setValueAtTime(3.5, startTime);

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(vol, startTime + 0.0001);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.0024);

    source.connect(piezoPeak);
    piezoPeak.connect(highpass);
    registerNode(source);
    registerNode(piezoPeak);

    source.start(startTime);
    source.stop(startTime + 0.003);
  }

  /**
   * Mechanical Key Synthesis core logic (Cherry MX, Lubed Thock, Typewriter, Minimal Chiclet, Neon Synth)
   */
  private synthesizeMechanicalSound(
    ctx: BaseAudioContext,
    voiceGain: GainNode,
    filterNode: BiquadFilterNode,
    preset: SoundPreset,
    _options: KeySoundTriggerOptions,
    pitchOffsetHz: number,
    modifier: KeySoundModifier | undefined,
    startTime: number,
    registerNode: (node: AudioNode) => void
  ): void {
    const pitchMult = modifier?.pitchMultiplier ?? 1.0;
    const gainMult = modifier?.gainMultiplier ?? 1.0;
    const noiseGainMult = modifier?.noiseGainMultiplier ?? 1.0;
    const decayMult = modifier?.decayMultiplier ?? 1.0;
    const filterFreqMult = modifier?.filterFreqMultiplier ?? 1.0;

    const baseFreq = modifier?.fixedFreq
      ? modifier.fixedFreq
      : Math.max(
          40,
          (preset.oscillator.baseFreq + pitchOffsetHz + (modifier?.pitchOffset ?? 0)) * pitchMult
        );

    const speedFactor = this.getTypingSpeedFactor();
    const attack = Math.max(0.003, preset.envelope.attack);
    const decay = Math.max(0.015, preset.envelope.decay * decayMult * speedFactor);
    const totalDuration = attack + decay + ((preset.envelope.release || 0.02) * speedFactor);

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(0.35 * gainMult, startTime + attack);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay);

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

      registerNode(modOsc);
      registerNode(modGain);
    }

    if (preset.oscillator.detune) {
      osc.detune.setValueAtTime(preset.oscillator.detune, startTime);
    }

    osc.connect(filterNode);
    registerNode(osc);

    osc.start(startTime);
    osc.stop(startTime + totalDuration);

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
      registerNode(subOsc);
      registerNode(subGain);

      subOsc.start(startTime);
      subOsc.stop(startTime + totalDuration);
    }

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
        registerNode(noiseSource);
        registerNode(noiseFilter);
        registerNode(noiseGain);

        noiseSource.start(startTime);
        noiseSource.stop(startTime + noiseDurationSec + 0.01);
      }
    }

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
      registerNode(clickOsc);
      registerNode(clickGain);

      clickOsc.start(startTime);
      clickOsc.stop(startTime + clickDurationSec + 0.005);

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
        registerNode(secOsc);
        registerNode(secGain);

        secOsc.start(secTime);
        secOsc.stop(secTime + clickDurationSec * 1.2 + 0.005);
      }
    }

    if (modifier?.extraBell) {
      const bellTime = startTime + 0.02;
      const bellOsc = ctx.createOscillator();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(1864, bellTime);

      const bellGain = ctx.createGain();
      bellGain.gain.setValueAtTime(0.0001, startTime);
      bellGain.gain.setValueAtTime(0.0001, bellTime);
      bellGain.gain.linearRampToValueAtTime(0.18 * gainMult, bellTime + 0.002);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 0.22);

      bellOsc.connect(bellGain);
      bellGain.connect(filterNode);
      registerNode(bellOsc);
      registerNode(bellGain);

      bellOsc.start(bellTime);
      bellOsc.stop(bellTime + 0.25);
    }
  }
}

export const soundSynthEngine = SoundSynthEngine.getInstance();
