/**
 * Ultra Steem Editor - Audio Typing Synth Types
 * Extended procedural sound synthesis types and preset schema.
 */

export type NoiseType = 'white' | 'pink' | 'brown';

export interface KeySoundModifier {
  pitchMultiplier?: number;
  pitchOffset?: number;
  gainMultiplier?: number;
  noiseGainMultiplier?: number;
  decayMultiplier?: number;
  filterFreqMultiplier?: number;
  extraBell?: boolean;
  slideDown?: boolean; // Frequency downslide e.g. for Backspace
  fixedFreq?: number;  // Specific resonant frequency e.g. for Enter
}

export interface PresetSubOscillatorConfig {
  type: OscillatorType;
  freqRatio: number; // e.g. 0.5 for sub-bass, 2.0 for overtone
  gain: number;      // 0.0 to 1.0
}

export interface PresetFrequencySweep {
  targetRatio: number; // e.g. 1.8 for pitch glide upwards (water drops), 0.4 for downward drop
  durationSec: number; // Duration of sweep in seconds
}

export interface PresetFmModulationConfig {
  freqRatio: number;   // Modulator frequency ratio relative to carrier (e.g. 1.5 for bells)
  depthRatio: number;  // Modulation index / depth ratio relative to carrier freq (e.g. 0.5)
  decaySec?: number;   // How long the FM modulation rings
}

export interface PresetOscillatorConfig {
  type: OscillatorType;
  baseFreq: number;       // Base frequency in Hz (e.g. 240Hz)
  freqDecay?: number;     // Pitch drop duration/rate in seconds (for tactile 'thump')
  freqSweep?: PresetFrequencySweep; // Upward or downward pitch glide (e.g. bubbles)
  pitchVariance?: number; // +/- variance in Hz based on key hash
  detune?: number;        // Detune in cents
  subOsc?: PresetSubOscillatorConfig;
}

export interface PresetNoiseConfig {
  type: NoiseType;
  gain: number;           // 0.0 to 1.0
  durationMs: number;     // Noise burst duration in milliseconds
  decayRate?: number;     // Exponential decay speed
  playbackRate?: number;  // Pitch/speed of noise buffer
}

export interface PresetFilterConfig {
  type: BiquadFilterType;
  baseFrequency: number;  // Filter cutoff/center in Hz
  q: number;              // Resonance (0.5 to 15)
  gain?: number;          // dB gain for peaking/shelving
  freqSweep?: number;     // Frequency sweep in Hz over envelope duration
}

export interface PresetEnvelopeConfig {
  attack: number;         // Attack time in seconds (e.g. 0.001s)
  decay: number;          // Decay time in seconds (e.g. 0.035s)
  sustain: number;        // Sustain level (0.0 to 1.0, usually 0 for clicks)
  release: number;        // Release time in seconds
}

export interface PresetTransientConfig {
  enabled?: boolean;
  clickFrequency?: number;       // High-freq burst for mechanical snap (e.g. 3500Hz)
  clickGain?: number;            // 0.0 to 1.0
  clickDurationMs?: number;      // 2ms to 8ms
  secondaryClickDelayMs?: number;// For tactile switches (Cherry MX Blue second click)
  secondaryClickGain?: number;
}

export interface SpecialKeyModifiers {
  space?: KeySoundModifier;
  enter?: KeySoundModifier;
  backspace?: KeySoundModifier;
  delete?: KeySoundModifier;
  tab?: KeySoundModifier;
  modifier?: KeySoundModifier;  // Shift, Ctrl, Alt, Meta
  punctuation?: KeySoundModifier;
  numbers?: KeySoundModifier;
  [key: string]: KeySoundModifier | undefined;
}

export interface SoundPreset {
  id: string;
  name: string;
  description: string;
  author?: string;
  version?: string;
  tags?: string[];
  isBuiltin?: boolean;
  synthesisMode?: 'mechanical' | 'bell' | 'bubbles' | 'geiger' | 'cathedral-bell' | 'shchedryk';
  tuningScale?: 'pentatonic' | 'chromatic' | 'linear';
  fmModulation?: PresetFmModulationConfig;
  oscillator: PresetOscillatorConfig;
  noise?: PresetNoiseConfig;
  filter?: PresetFilterConfig;
  envelope: PresetEnvelopeConfig;
  transient?: PresetTransientConfig;
  specialKeys?: SpecialKeyModifiers;
}

export interface AudioTypingSettings {
  enabled: boolean;
  activePresetId: string;
  volume: number;              // 0.0 to 1.0
  favoritePresetIds: string[];
  customPresets: SoundPreset[];
  playOnVirtualKeys: boolean;   // Touch / virtual keyboard / format buttons
}

export interface KeySoundTriggerOptions {
  key?: string;
  code?: string;
  inputType?: string;
  isVirtual?: boolean;
  forceToneOffset?: number;
}
