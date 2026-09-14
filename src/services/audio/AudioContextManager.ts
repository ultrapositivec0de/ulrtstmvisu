/**
 * Ultra Steem Editor - AudioContextManager
 * Zero-garbage-collection singleton audio context with automatic power-saving sleep (suspend/resume)
 * and pre-computed noise buffer caching.
 */

import { NoiseType } from './types';

class AudioContextManager {
  private static instance: AudioContextManager | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private waveShaper: WaveShaperNode | null = null;
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly AUTO_SUSPEND_DELAY_MS = 60000; // 60 seconds of complete idle before power-saving suspend
  private noiseBuffers: Map<NoiseType, AudioBuffer> = new Map();
  private geigerBuffers: AudioBuffer[] = [];
  private isMuted: boolean = false;
  private currentVolume: number = 0.5;

  private constructor() {
    // Lazy: do not create AudioContext on startup to obey autoplay policy and save memory
  }

  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  /**
   * Creates a smooth soft-clipping saturation curve (tanh-based)
   * to eliminate harsh digital clipping and protect speaker diaphragms
   */
  private makeSoftClipCurve(samples = 1024): Float32Array {
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    const k = 1.5; // subtle transparent saturation
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // Soft saturation transfer function
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x * 20 * deg));
    }
    return curve;
  }

  /**
   * Initializes or returns the AudioContext. Must be triggered from a user gesture
   * or when user enables the audio feature.
   */
  public async getContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn('[AudioContextManager] Web Audio API is not supported in this environment');
        return null;
      }
      this.ctx = new AudioCtxClass();
      
      // Master gain node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);

      // Studio-grade transparent limiter: protects against digital clipping while preserving natural polyphonic decay
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-2.0, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(3.0, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.06, this.ctx.currentTime);

      // Soft-clipper wave shaper to smoothly round off peaks without abrupt digital truncation
      this.waveShaper = this.ctx.createWaveShaper();
      this.waveShaper.curve = this.makeSoftClipCurve() as Float32Array<ArrayBuffer>;
      this.waveShaper.oversample = '2x';

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.waveShaper);
      this.waveShaper.connect(this.ctx.destination);

      // Pre-compute noise and impulse buffers (one-time allocation, zero garbage collection during typing)
      this.initNoiseBuffers(this.ctx);
      this.initGeigerBuffers(this.ctx);
    }

    // Auto resume if suspended
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('[AudioContextManager] Could not resume audio context:', err);
      }
    }

    this.scheduleAutoSuspend();
    return this.ctx;
  }

  /**
   * Schedules putting the audio context to sleep after idle delay to save mobile battery and CPU
   */
  public scheduleAutoSuspend(): void {
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }

    this.suspendTimer = setTimeout(async () => {
      if (this.ctx && this.ctx.state === 'running') {
        try {
          await this.ctx.suspend();
        } catch {
          // ignore
        }
      }
    }, this.AUTO_SUSPEND_DELAY_MS);
  }

  /**
   * Immediately wakes the audio context if needed for an incoming sound
   */
  public async ensureRunning(): Promise<AudioContext | null> {
    const ctx = await this.getContext();
    if (!ctx) return null;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }
    this.scheduleAutoSuspend();
    return ctx;
  }

  public getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.currentVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.01);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.currentVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.01);
    }
    if (muted && this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public getNoiseBuffer(type: NoiseType): AudioBuffer | null {
    return this.noiseBuffers.get(type) || null;
  }

  public getGeigerBuffer(index?: number): AudioBuffer | null {
    if (this.geigerBuffers.length === 0) return null;
    if (typeof index === 'number') {
      return this.geigerBuffers[index % this.geigerBuffers.length];
    }
    const randIdx = Math.floor(Math.random() * this.geigerBuffers.length);
    return this.geigerBuffers[randIdx];
  }

  /**
   * Generates 1.5 seconds of loopable noise buffers once.
   * Cached forever so thousands of keypresses reuse the exact same buffer in RAM.
   */
  private initNoiseBuffers(ctx: AudioContext): void {
    const durationSec = 1.5;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);

    // 1. White Noise
    const whiteBuffer = ctx.createBuffer(1, length, sampleRate);
    const whiteData = whiteBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffers.set('white', whiteBuffer);

    // 2. Pink Noise (Paul Kellet's filtered algorithm)
    const pinkBuffer = ctx.createBuffer(1, length, sampleRate);
    const pinkData = pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.noiseBuffers.set('pink', pinkBuffer);

    // 3. Brown (Red) Noise (Integrated white noise)
    const brownBuffer = ctx.createBuffer(1, length, sampleRate);
    const brownData = brownBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      brownData[i] = lastOut * 3.5;
    }
    this.noiseBuffers.set('brown', brownBuffer);
  }

  /**
   * Generates authentic S.T.A.L.K.E.R.-style piezoelectric ionization pulses (2.2ms).
   * Features a sharp needle-impulse transient, damped piezo disc resonance (3800 - 4800 Hz),
   * and stochastic avalanche ionization noise.
   */
  private initGeigerBuffers(ctx: AudioContext): void {
    const sampleRate = ctx.sampleRate;
    const pulseLen = Math.max(32, Math.floor(sampleRate * 0.0022)); // 2.2ms crisp piezo pulse
    this.geigerBuffers = [];

    for (let v = 0; v < 8; v++) {
      const buffer = ctx.createBuffer(1, pulseLen, sampleRate);
      const data = buffer.getChannelData(0);
      const piezoFreq = 3800 + v * 160 + (Math.random() * 80 - 40); // Resonant piezo disc frequency
      const decayTime = 0.00045 + (v % 3) * 0.00008; // Fast exponential ringdown

      for (let i = 0; i < pulseLen; i++) {
        const t = i / sampleRate;
        // Needle spike at onset (Townsend spark discharge)
        const needleSpike = i === 0 ? 0.95 : (i === 1 ? -0.7 : (i === 2 ? 0.45 : 0));
        // Damped resonant sine wave of the dosimeter piezo element
        const ring = Math.sin(2 * Math.PI * piezoFreq * t) * Math.exp(-t / decayTime);
        // High-frequency ionizing spark noise
        const spark = (Math.random() * 0.3 - 0.15) * Math.exp(-t / (decayTime * 0.6));
        data[i] = (needleSpike * 0.45 + ring * 0.75 + spark * 0.35);
      }
      this.geigerBuffers.push(buffer);
    }
  }

  public dispose(): void {
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
      this.compressor = null;
      this.waveShaper = null;
    }
    this.noiseBuffers.clear();
    this.geigerBuffers = [];
  }
}

export const audioContextManager = AudioContextManager.getInstance();
