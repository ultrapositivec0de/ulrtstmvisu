/**
 * Ultra Steem Editor - useTypingSound Hook
 * Orchestrates physical keyboard keydown events and mobile virtual keyboard beforeinput events,
 * manages active preset and volume, and provides quick toggle controls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SoundPreset,
  AudioTypingSettings,
  KeySoundTriggerOptions
} from './types';
import {
  BUILTIN_PRESETS,
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  saveAudioSettings,
  validateSoundPreset
} from './presets';
import { audioContextManager } from './AudioContextManager';
import { keyHashDispatcher } from './KeyHashDispatcher';
import { soundSynthEngine } from './SoundSynthEngine';
import { useDeviceStore } from '../../store/deviceStore';

type ActiveKeyboardMode = 'physical' | 'virtual';

function isTextTypingTarget(target: EventTarget | null): target is HTMLElement {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
  if (el.tagName === 'INPUT') {
    const inputType = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return !['checkbox', 'radio', 'range', 'file', 'button', 'submit', 'reset', 'color'].includes(inputType);
  }
  return Boolean(el.closest('[contenteditable="true"]') || el.closest('.editor-area'));
}

function buildStrokeSignature(key?: string, code?: string, inputType?: string): string {
  if (code === 'Space' || key === ' ' || key === 'Space') return 'space';
  if (
    key === 'Enter' ||
    key === '\n' ||
    key === '\r' ||
    code === 'Enter' ||
    code === 'NumpadEnter' ||
    inputType === 'insertLineBreak' ||
    inputType === 'insertParagraph'
  ) {
    return 'enter';
  }
  if (
    key === 'Backspace' ||
    code === 'Backspace' ||
    inputType === 'deleteContentBackward' ||
    inputType === 'deleteContent' ||
    inputType === 'deleteWordBackward' ||
    inputType === 'deleteSoftLineBackward' ||
    inputType === 'deleteHardLineBackward'
  ) {
    return 'backspace';
  }
  if (
    key === 'Delete' ||
    code === 'Delete' ||
    inputType === 'deleteContentForward' ||
    inputType === 'deleteWordForward' ||
    inputType === 'deleteSoftLineForward' ||
    inputType === 'deleteHardLineForward'
  ) {
    return 'delete';
  }
  if (key === 'Tab' || code === 'Tab') return 'tab';
  if (key && key.length > 0) {
    const single = key.length > 1 ? key.slice(-1) : key;
    return `char:${single.toLowerCase()}`;
  }
  return inputType ? `type:${inputType}` : 'unknown';
}

function extractCompositionDelta(
  prevText: string,
  nextText: string
): { key: string; code: string; inputType: string; signature: string } | null {
  if (nextText === prevText) {
    return null;
  }

  if (nextText.length < prevText.length) {
    // Composition shrunk -> Backspace key inside virtual IME composition
    if (nextText === '' || prevText.startsWith(nextText) || prevText.includes(nextText)) {
      return {
        key: 'Backspace',
        code: 'Backspace',
        inputType: 'deleteContentBackward',
        signature: 'backspace'
      };
    }
  }

  let extractedChar: string;
  if (nextText.length > prevText.length) {
    if (nextText.length - prevText.length === 1) {
      let idx = 0;
      while (idx < prevText.length && prevText[idx] === nextText[idx]) {
        idx++;
      }
      extractedChar = nextText[idx] ?? nextText.slice(-1);
    } else {
      extractedChar = nextText.slice(-1);
    }
  } else if (nextText.length === prevText.length && nextText.length > 0) {
    let idx = 0;
    while (idx < prevText.length && prevText[idx] === nextText[idx]) {
      idx++;
    }
    extractedChar = nextText[idx] ?? nextText.slice(-1);
  } else if (nextText.length === 1) {
    extractedChar = nextText;
  } else {
    return {
      key: 'Backspace',
      code: 'Backspace',
      inputType: 'deleteContentBackward',
      signature: 'backspace'
    };
  }

  if (!extractedChar) return null;
  if (extractedChar === '\n' || extractedChar === '\r') {
    return {
      key: 'Enter',
      code: 'Enter',
      inputType: 'insertLineBreak',
      signature: 'enter'
    };
  }
  const code = extractedChar === ' ' ? 'Space' : '';
  return {
    key: extractedChar,
    code,
    inputType: 'insertCompositionText',
    signature: buildStrokeSignature(extractedChar, code)
  };
}

export function useTypingSound() {
  const [settings, setSettings] = useState<AudioTypingSettings>(() => loadAudioSettings());
  const settingsRef = useRef<AudioTypingSettings>(settings);
  settingsRef.current = settings;

  // Sync volume & mute state with AudioContextManager
  useEffect(() => {
    audioContextManager.setMuted(!settings.enabled);
    audioContextManager.setVolume(settings.volume);
  }, [settings.enabled, settings.volume]);

  // Persist settings whenever they change
  const updateSettings = useCallback((updater: (prev: AudioTypingSettings) => AudioTypingSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      saveAudioSettings(next);
      return next;
    });
  }, []);

  // Toggle sound enabled/disabled
  const toggleEnabled = useCallback(() => {
    updateSettings((prev) => {
      const nextState = !prev.enabled;
      // If enabling, trigger context wake-up to obey browser user-gesture policy
      if (nextState) {
        audioContextManager.ensureRunning().catch(() => {});
      } else {
        audioContextManager.setMuted(true);
      }
      return { ...prev, enabled: nextState };
    });
  }, [updateSettings]);

  // Set volume (0.0 to 1.0)
  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    updateSettings((prev) => ({ ...prev, volume: clamped }));
  }, [updateSettings]);

  // Set active preset
  const setActivePreset = useCallback((presetId: string) => {
    updateSettings((prev) => ({ ...prev, activePresetId: presetId }));
  }, [updateSettings]);

  // Toggle favorite preset
  const toggleFavoritePreset = useCallback((presetId: string) => {
    updateSettings((prev) => {
      const exists = prev.favoritePresetIds.includes(presetId);
      const nextFavorites = exists
        ? prev.favoritePresetIds.filter((id) => id !== presetId)
        : [...prev.favoritePresetIds, presetId];
      return { ...prev, favoritePresetIds: nextFavorites };
    });
  }, [updateSettings]);

  // Add custom preset
  const addCustomPreset = useCallback((rawJson: unknown): { success: boolean; error?: string; preset?: SoundPreset } => {
    const res = validateSoundPreset(rawJson);
    if (!res.valid || !res.preset) {
      return { success: false, error: res.error || 'Невалідний пресет' };
    }
    const newPreset = res.preset;
    updateSettings((prev) => {
      // replace if exists with same id or append
      const filtered = prev.customPresets.filter((p) => p.id !== newPreset.id);
      return {
        ...prev,
        customPresets: [...filtered, newPreset],
        activePresetId: newPreset.id
      };
    });
    return { success: true, preset: newPreset };
  }, [updateSettings]);

  // Delete custom preset
  const deleteCustomPreset = useCallback((presetId: string) => {
    updateSettings((prev) => ({
      ...prev,
      customPresets: prev.customPresets.filter((p) => p.id !== presetId),
      activePresetId: prev.activePresetId === presetId ? 'cherry-blue' : prev.activePresetId,
      favoritePresetIds: prev.favoritePresetIds.filter((id) => id !== presetId)
    }));
  }, [updateSettings]);

  // Resolve current active preset object
  const allPresets = [...BUILTIN_PRESETS, ...settings.customPresets];
  const activePreset = allPresets.find((p) => p.id === settings.activePresetId) || BUILTIN_PRESETS[0];

  // Pre-render current preset sounds whenever audio is enabled or preset changes
  useEffect(() => {
    if (settings.enabled) {
      audioContextManager.ensureRunning().then(() => {
        soundSynthEngine.preRenderPresetSounds(activePreset).catch(() => {});
      });
    }
  }, [settings.enabled, activePreset]);

  // Direct trigger function for keys or virtual clicks
  const triggerSound = useCallback((options: KeySoundTriggerOptions = {}) => {
    const current = settingsRef.current;
    if (!current.enabled) return;
    if (options.isVirtual && !current.playOnVirtualKeys) return;

    const currentAllPresets = [...BUILTIN_PRESETS, ...current.customPresets];
    const currentActivePreset = currentAllPresets.find((p) => p.id === current.activePresetId) || BUILTIN_PRESETS[0];

    // Record keystroke to track typing speed WPM in real-time
    soundSynthEngine.recordKeystroke();

    keyHashDispatcher.dispatch(currentActivePreset, options).catch(() => {});
  }, []);

  // Preview helper
  const previewPreset = useCallback((preset: SoundPreset) => {
    audioContextManager.ensureRunning().then(() => {
      keyHashDispatcher.preview(preset, 'A').catch(() => {});
    });
  }, []);

  const lastKeyRepeatTimeRef = useRef<number>(0);
  const activeKeyboardRef = useRef<ActiveKeyboardMode>(
    (() => {
      const d = useDeviceStore.getState();
      return d.isKeyboardOpen || d.isAndroid || d.isIOS || d.isNativeMobile ? 'virtual' : 'physical';
    })()
  );
  const lastVirtualSignalTimeRef = useRef<number>(0);
  const lastPhysicalSignalTimeRef = useRef<number>(0);
  const pendingImeKeyDownRef = useRef<{ time: number; target: EventTarget | null }>({
    time: 0,
    target: null
  });
  const compositionTextRef = useRef<string>('');
  const lastHandledCompositionDataRef = useRef<string | null>(null);
  const lastEndedCompositionRef = useRef<{ time: number; text: string }>({ time: 0, text: '' });
  const lastDispatchedRef = useRef<{
    time: number;
    source: 'keydown' | 'beforeinput' | 'compositionupdate' | 'pointerdown';
    signature: string;
  }>({
    time: 0,
    source: 'keydown',
    signature: ''
  });

  // Listeners for physical typing, user gesture wake-up, virtual keyboard input, and touch keys
  useEffect(() => {
    if (!settings.enabled) return;

    // Wake audio context on first user interaction anywhere (required by WebKitGTK / browser policy)
    const handleGestureWake = () => {
      audioContextManager.ensureRunning().catch(() => {});
    };

    const resolveKeyDownIsVirtual = (
      e: KeyboardEvent,
      now: number,
      device: ReturnType<typeof useDeviceStore.getState>
    ): boolean => {
      if (device.isKeyboardOpen) return true;
      // Hardware keyboards always provide a non-empty physical scan code (e.g. 'KeyA', 'Enter', 'Space').
      // Virtual/soft keyboards on Android/iOS commonly leave e.code empty.
      if (!e.code) return true;

      const isMobilePlatform = device.isAndroid || device.isIOS || device.isNativeMobile;
      if (isMobilePlatform) {
        const isActionKey = ['Enter', ' ', 'Backspace', 'Delete', 'Tab'].includes(e.key);
        if (
          isActionKey &&
          lastVirtualSignalTimeRef.current > lastPhysicalSignalTimeRef.current &&
          now - lastVirtualSignalTimeRef.current < 15000
        ) {
          return true;
        }
        if (
          activeKeyboardRef.current === 'virtual' &&
          isActionKey &&
          now - lastPhysicalSignalTimeRef.current > 15000
        ) {
          return true;
        }
      }
      return false;
    };

    const resolveBeforeInputIsVirtual = (
      now: number,
      device: ReturnType<typeof useDeviceStore.getState>
    ): boolean => {
      if (device.isKeyboardOpen) return true;
      if (now - pendingImeKeyDownRef.current.time < 150) {
        return activeKeyboardRef.current === 'virtual';
      }
      if (device.isAndroid || device.isIOS || device.isNativeMobile) {
        return lastVirtualSignalTimeRef.current >= lastPhysicalSignalTimeRef.current;
      }
      return activeKeyboardRef.current === 'virtual';
    };

    // 1. Keyboard listener (triggers on key press down, NOT release)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.isTrusted) return;
      handleGestureWake();
      const now = performance.now();

      if (!isTextTypingTarget(e.target)) return;

      const device = useDeviceStore.getState();
      const isImeUnidentified =
        e.keyCode === 229 ||
        e.which === 229 ||
        e.key === 'Unidentified' ||
        e.key === 'Process';

      // Android / soft-keyboard IME fires keyCode 229 (Unidentified) before delivering
      // the actual character via beforeinput/compositionupdate. Never play a hardcoded dummy
      // key ('KeyA') and never block beforeinput; instead mark active keyboard state and let
      // beforeinput resolve the exact pressed character right before DOM commit.
      if (isImeUnidentified) {
        if (
          device.isKeyboardOpen ||
          device.isAndroid ||
          device.isIOS ||
          device.isNativeMobile ||
          !e.code
        ) {
          activeKeyboardRef.current = 'virtual';
          lastVirtualSignalTimeRef.current = now;
        } else {
          activeKeyboardRef.current = 'physical';
          lastPhysicalSignalTimeRef.current = now;
        }
        pendingImeKeyDownRef.current = { time: now, target: e.target };
        return;
      }

      // Filter out lone modifier/navigation keys that do not represent typed keystrokes
      const isLoneModifier = [
        'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock',
        'Escape', 'ContextMenu', 'Insert', 'Pause'
      ].includes(e.key);
      if (isLoneModifier) return;

      // Ignore shortcuts like Ctrl+C, Ctrl+V, Cmd+Z from producing sound unless editing whitespace/deletion keys
      if ((e.ctrlKey || e.metaKey || e.altKey) && !['Backspace', 'Delete', 'Enter', ' '].includes(e.key)) {
        return;
      }

      const isActionKey = ['Enter', ' ', 'Backspace', 'Delete', 'Tab'].includes(e.key);

      // Composing dead keys / IME character composition with non-229 keys are handled by beforeinput
      // so the composed result is played once, whereas Enter/Space/Backspace fire immediately on keydown.
      if (e.isComposing && !isActionKey) {
        return;
      }

      // Throttle OS key-repeat events (~13Hz / min 75ms) to prevent voice flooding when holding a key
      if (e.repeat) {
        if (now - lastKeyRepeatTimeRef.current < 75) {
          return;
        }
        lastKeyRepeatTimeRef.current = now;
      }

      const isVirtual = resolveKeyDownIsVirtual(e, now, device);
      if (isVirtual) {
        activeKeyboardRef.current = 'virtual';
        lastVirtualSignalTimeRef.current = now;
      } else {
        activeKeyboardRef.current = 'physical';
        lastPhysicalSignalTimeRef.current = now;
      }

      const signature = buildStrokeSignature(e.key, e.code);
      lastDispatchedRef.current = { time: now, source: 'keydown', signature };

      triggerSound({
        key: e.key,
        code: e.code,
        isVirtual,
        isRepeat: !!e.repeat
      });
    };

    // 2. Virtual Keyboard & IME pre-mutation listener (fires before DOM update & before keyup)
    const handleBeforeInput = (e: InputEvent) => {
      if (!e.isTrusted) return;
      if (!isTextTypingTarget(e.target)) return;

      const inputType = e.inputType || '';

      // Ignore non-typing mutations (paste, undo/redo, drag/drop, cut, toolbar formatting)
      if (
        inputType === 'insertFromPaste' ||
        inputType === 'insertFromDrop' ||
        inputType === 'insertFromYank' ||
        inputType === 'deleteByCut' ||
        inputType === 'deleteByDrag' ||
        inputType === 'historyUndo' ||
        inputType === 'historyRedo' ||
        inputType.startsWith('format')
      ) {
        return;
      }

      const now = performance.now();
      let resolvedKey: string | undefined;
      let resolvedCode: string;
      let resolvedInputType: string = inputType;
      let signature: string;

      if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
        compositionTextRef.current = '';
        lastHandledCompositionDataRef.current = null;
        resolvedKey = 'Enter';
        resolvedCode = 'Enter';
        signature = 'enter';
      } else if (
        inputType === 'deleteContentBackward' ||
        inputType === 'deleteContent' ||
        inputType === 'deleteWordBackward' ||
        inputType === 'deleteSoftLineBackward' ||
        inputType === 'deleteHardLineBackward'
      ) {
        compositionTextRef.current = '';
        lastHandledCompositionDataRef.current = null;
        resolvedKey = 'Backspace';
        resolvedCode = 'Backspace';
        signature = 'backspace';
      } else if (
        inputType === 'deleteContentForward' ||
        inputType === 'deleteWordForward' ||
        inputType === 'deleteSoftLineForward' ||
        inputType === 'deleteHardLineForward'
      ) {
        compositionTextRef.current = '';
        lastHandledCompositionDataRef.current = null;
        resolvedKey = 'Delete';
        resolvedCode = 'Delete';
        signature = 'delete';
      } else if (inputType === 'insertCompositionText') {
        if (e.data === null || e.data === undefined) {
          // Some WebViews supply composition data only on compositionupdate
          return;
        }
        const delta = extractCompositionDelta(compositionTextRef.current, e.data);
        compositionTextRef.current = e.data;
        lastHandledCompositionDataRef.current = e.data;
        if (!delta) return;
        resolvedKey = delta.key;
        resolvedCode = delta.code;
        resolvedInputType = delta.inputType;
        signature = delta.signature;
      } else if (inputType === 'insertFromComposition') {
        const data = e.data || '';
        const prevComp = compositionTextRef.current;
        const recentlyEndedSame =
          now - lastEndedCompositionRef.current.time < 120 &&
          data === lastEndedCompositionRef.current.text;
        compositionTextRef.current = '';
        if (
          !data ||
          data === prevComp ||
          data === lastHandledCompositionDataRef.current ||
          recentlyEndedSame
        ) {
          lastHandledCompositionDataRef.current = null;
          return;
        }
        lastHandledCompositionDataRef.current = null;
        const ch = data.slice(-1);
        resolvedKey = ch === '\n' || ch === '\r' ? 'Enter' : ch;
        resolvedCode = resolvedKey === ' ' ? 'Space' : resolvedKey === 'Enter' ? 'Enter' : '';
        signature = buildStrokeSignature(resolvedKey, resolvedCode, inputType);
      } else if (inputType === 'insertText' || inputType === 'insertReplacementText') {
        compositionTextRef.current = '';
        lastHandledCompositionDataRef.current = null;
        const data = e.data || '';
        if (!data) return;
        const ch = data.slice(-1);
        if (ch === '\n' || ch === '\r') {
          resolvedKey = 'Enter';
          resolvedCode = 'Enter';
          resolvedInputType = 'insertLineBreak';
          signature = 'enter';
        } else {
          resolvedKey = ch;
          resolvedCode = ch === ' ' ? 'Space' : '';
          signature = buildStrokeSignature(ch, resolvedCode, inputType);
        }
      } else {
        return;
      }

      // Deduplicate against keydown or pointerdown for the exact same keystroke
      const prevDispatch = lastDispatchedRef.current;
      if (
        (prevDispatch.source === 'keydown' || prevDispatch.source === 'pointerdown') &&
        now - prevDispatch.time < 120 &&
        prevDispatch.signature === signature
      ) {
        return;
      }

      // Throttle rapid repeated virtual Backspace/Delete holds (~13Hz)
      if (
        prevDispatch.source === 'beforeinput' &&
        (signature === 'backspace' || signature === 'delete') &&
        prevDispatch.signature === signature &&
        now - prevDispatch.time < 75
      ) {
        return;
      }

      const device = useDeviceStore.getState();
      const isVirtual = resolveBeforeInputIsVirtual(now, device);
      if (isVirtual) {
        activeKeyboardRef.current = 'virtual';
        lastVirtualSignalTimeRef.current = now;
      }

      pendingImeKeyDownRef.current.time = 0;
      lastDispatchedRef.current = { time: now, source: 'beforeinput', signature };

      triggerSound({
        key: resolvedKey,
        code: resolvedCode || undefined,
        inputType: resolvedInputType,
        isVirtual
      });
    };

    const handleCompositionStart = (e: CompositionEvent) => {
      if (!isTextTypingTarget(e.target)) return;
      compositionTextRef.current = e.data || '';
      lastHandledCompositionDataRef.current = null;
    };

    const handleCompositionUpdate = (e: CompositionEvent) => {
      if (!e.isTrusted || !isTextTypingTarget(e.target)) return;
      const nextData = e.data ?? '';
      if (lastHandledCompositionDataRef.current === nextData) {
        compositionTextRef.current = nextData;
        return;
      }

      const delta = extractCompositionDelta(compositionTextRef.current, nextData);
      compositionTextRef.current = nextData;
      lastHandledCompositionDataRef.current = nextData;
      if (!delta) return;

      const now = performance.now();
      const prevDispatch = lastDispatchedRef.current;
      if (
        (prevDispatch.source === 'keydown' || prevDispatch.source === 'beforeinput' || prevDispatch.source === 'pointerdown') &&
        now - prevDispatch.time < 100 &&
        prevDispatch.signature === delta.signature
      ) {
        return;
      }

      const device = useDeviceStore.getState();
      const isVirtual = resolveBeforeInputIsVirtual(now, device);
      if (isVirtual) {
        activeKeyboardRef.current = 'virtual';
        lastVirtualSignalTimeRef.current = now;
      }

      lastDispatchedRef.current = { time: now, source: 'compositionupdate', signature: delta.signature };
      triggerSound({
        key: delta.key,
        code: delta.code || undefined,
        inputType: delta.inputType,
        isVirtual
      });
    };

    const resetCompositionTracking = () => {
      if (compositionTextRef.current) {
        lastEndedCompositionRef.current = {
          time: performance.now(),
          text: compositionTextRef.current
        };
      }
      compositionTextRef.current = '';
      lastHandledCompositionDataRef.current = null;
      pendingImeKeyDownRef.current.time = 0;
    };

    // 3. PointerDown listener: instant touch-down response for in-app virtual keys
    //    and active touch keyboard hint when tapping into an editor
    const handlePointerDown = (e: PointerEvent) => {
      if (!e.isTrusted) return;
      handleGestureWake();
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const now = performance.now();
      const virtualBtn = target.closest('[data-sound-key], .virtual-key');
      if (virtualBtn) {
        const rawAttr =
          virtualBtn.getAttribute('data-sound-key') ||
          virtualBtn.getAttribute('data-key') ||
          'Space';
        const keyName = rawAttr === 'Space' ? ' ' : rawAttr;
        const codeName = rawAttr === 'Space' || keyName === ' ' ? 'Space' : '';
        const signature = buildStrokeSignature(keyName, codeName);

        activeKeyboardRef.current = 'virtual';
        lastVirtualSignalTimeRef.current = now;
        lastDispatchedRef.current = { time: now, source: 'pointerdown', signature };

        triggerSound({
          key: keyName,
          code: codeName || undefined,
          isVirtual: true
        });
        return;
      }

      if (e.pointerType === 'touch' && isTextTypingTarget(target)) {
        activeKeyboardRef.current = 'virtual';
        if (useDeviceStore.getState().isKeyboardOpen) {
          lastVirtualSignalTimeRef.current = now;
        }
        resetCompositionTracking();
      }
    };

    window.addEventListener('touchstart', handleGestureWake, { passive: true });
    window.addEventListener('touchend', handleGestureWake, { passive: true });
    window.addEventListener('click', handleGestureWake, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true, capture: true });
    window.addEventListener('beforeinput', handleBeforeInput as EventListener, { passive: true, capture: true });
    window.addEventListener('compositionstart', handleCompositionStart as EventListener, { passive: true, capture: true });
    window.addEventListener('compositionupdate', handleCompositionUpdate as EventListener, { passive: true, capture: true });
    window.addEventListener('compositionend', resetCompositionTracking, { passive: true, capture: true });
    window.addEventListener('focusin', resetCompositionTracking, { passive: true, capture: true });
    window.addEventListener('focusout', resetCompositionTracking, { passive: true, capture: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });

    return () => {
      window.removeEventListener('touchstart', handleGestureWake);
      window.removeEventListener('touchend', handleGestureWake);
      window.removeEventListener('click', handleGestureWake);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('beforeinput', handleBeforeInput as EventListener, { capture: true });
      window.removeEventListener('compositionstart', handleCompositionStart as EventListener, { capture: true });
      window.removeEventListener('compositionupdate', handleCompositionUpdate as EventListener, { capture: true });
      window.removeEventListener('compositionend', resetCompositionTracking, { capture: true });
      window.removeEventListener('focusin', resetCompositionTracking, { capture: true });
      window.removeEventListener('focusout', resetCompositionTracking, { capture: true });
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, [settings.enabled, triggerSound]);

  return {
    settings,
    enabled: settings.enabled,
    activePreset,
    allPresets,
    volume: settings.volume,
    favoritePresetIds: settings.favoritePresetIds,
    toggleEnabled,
    setVolume,
    setActivePreset,
    toggleFavoritePreset,
    addCustomPreset,
    deleteCustomPreset,
    triggerSound,
    previewPreset,
    updateSettings
  };
}
