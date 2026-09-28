/**
 * Ultra Steem Editor - VoicePool
 * High-performance ephemeral voice manager with zero voice-stealing collisions,
 * zero-DC-offset initialization, and automatic garbage collection.
 */

export interface ActiveVoice {
  id: number;
  startTime: number;
  stopTime: number;
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  nodes: AudioNode[];
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

export class VoicePool {
  private static instance: VoicePool | null = null;
  private activeVoices: Set<ActiveVoice> = new Set();
  private voiceCounter = 0;

  public static getInstance(): VoicePool {
    if (!VoicePool.instance) {
      VoicePool.instance = new VoicePool();
    }
    return VoicePool.instance;
  }

  /**
   * Spawns an isolated, clean voice node chain for a single note event.
   * Nodes are directly connected to masterBus, execute their planned envelopes,
   * and cleanly self-disconnect upon completion.
   */
  public acquireVoice(
    ctx: AudioContext,
    masterBus: GainNode,
    durationSec: number,
    targetStartTime?: number
  ): {
    slotId: number;
    startTime: number;
    gainNode: GainNode;
    filterNode: BiquadFilterNode;
    registerNode: (node: AudioNode) => void;
    finish: () => void;
  } {
    const now = ctx.currentTime;
    // Micro-lookahead (2ms) ensures audio thread receives the scheduling smoothly
    const startTime = targetStartTime !== undefined && targetStartTime >= now ? targetStartTime : now + 0.002;
    const stopTime = startTime + durationSec;

    // Voice Stealing: Enforce maximum 16 concurrent voices
    const MAX_ACTIVE_VOICES = 16;
    if (this.activeVoices.size >= MAX_ACTIVE_VOICES) {
      let oldestVoice: ActiveVoice | null = null;
      for (const v of this.activeVoices) {
        if (!oldestVoice || v.startTime < oldestVoice.startTime) {
          oldestVoice = v;
        }
      }

      if (oldestVoice) {
        // Smoothly fade out oldest voice over 5ms to avoid clicks/pops
        const fadeOutTime = now + 0.005;
        try {
          oldestVoice.gainNode.gain.cancelScheduledValues(now);
          oldestVoice.gainNode.gain.setValueAtTime(oldestVoice.gainNode.gain.value || 0.5, now);
          oldestVoice.gainNode.gain.linearRampToValueAtTime(0.0001, fadeOutTime);
        } catch {
          // ignore
        }

        const targetVoice = oldestVoice;
        setTimeout(() => {
          if (this.activeVoices.has(targetVoice)) {
            this.activeVoices.delete(targetVoice);
            if (targetVoice.cleanupTimer) {
              clearTimeout(targetVoice.cleanupTimer);
              targetVoice.cleanupTimer = undefined;
            }
            for (let i = 0; i < targetVoice.nodes.length; i++) {
              try {
                targetVoice.nodes[i].disconnect();
              } catch {
                // ignore
              }
            }
            targetVoice.nodes = [];
          }
        }, 8);
      }
    }

    // Fresh isolated node chain: Filter -> Gain -> MasterBus
    const gainNode = ctx.createGain();
    const filterNode = ctx.createBiquadFilter();

    filterNode.connect(gainNode);
    gainNode.connect(masterBus);

    // Initial clean zero gain state
    gainNode.gain.setValueAtTime(0.0001, startTime);

    const voice: ActiveVoice = {
      id: ++this.voiceCounter,
      startTime,
      stopTime,
      gainNode,
      filterNode,
      nodes: [filterNode, gainNode]
    };

    this.activeVoices.add(voice);

    const finishVoice = () => {
      if (!this.activeVoices.has(voice)) return;
      this.activeVoices.delete(voice);

      if (voice.cleanupTimer) {
        clearTimeout(voice.cleanupTimer);
        voice.cleanupTimer = undefined;
      }

      for (let i = 0; i < voice.nodes.length; i++) {
        try {
          voice.nodes[i].disconnect();
        } catch {
          // ignore
        }
      }
      voice.nodes = [];
    };

    // Auto-cleanup timer scheduled safely past decay and start delay
    const delayMs = Math.ceil((startTime - now + durationSec + 0.2) * 1000);
    voice.cleanupTimer = setTimeout(() => {
      finishVoice();
    }, delayMs);

    return {
      slotId: voice.id,
      startTime,
      gainNode,
      filterNode,
      registerNode: (node: AudioNode) => {
        voice.nodes.push(node);
      },
      finish: finishVoice
    };
  }

  /**
   * Resets and disconnects all active voices on mute or shutdown
   */
  public reset(): void {
    this.activeVoices.forEach((voice) => {
      if (voice.cleanupTimer) {
        clearTimeout(voice.cleanupTimer);
      }
      for (let i = 0; i < voice.nodes.length; i++) {
        try {
          voice.nodes[i].disconnect();
        } catch {
          // ignore
        }
      }
    });
    this.activeVoices.clear();
  }
}

export const voicePool = VoicePool.getInstance();

