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

  // Direct trigger function for keys or virtual clicks
  const triggerSound = useCallback((options: KeySoundTriggerOptions = {}) => {
    const current = settingsRef.current;
    if (!current.enabled) return;
    if (options.isVirtual && !current.playOnVirtualKeys) return;

    const currentAllPresets = [...BUILTIN_PRESETS, ...current.customPresets];
    const currentActivePreset = currentAllPresets.find((p) => p.id === current.activePresetId) || BUILTIN_PRESETS[0];

    keyHashDispatcher.dispatch(currentActivePreset, options).catch(() => {});
  }, []);

  // Preview helper
  const previewPreset = useCallback((preset: SoundPreset) => {
    audioContextManager.ensureRunning().then(() => {
      keyHashDispatcher.preview(preset, 'A').catch(() => {});
    });
  }, []);

  const lastPhysicalKeyDownTimeRef = useRef<number>(0);

  // Listeners for physical typing, user gesture wake-up, and mobile touch input
  useEffect(() => {
    if (!settings.enabled) return;

    // Wake audio context on first user interaction anywhere (required by WebKitGTK / browser policy)
    const handleGestureWake = () => {
      audioContextManager.ensureRunning().catch(() => {});
    };

    window.addEventListener('pointerdown', handleGestureWake, { passive: true });
    window.addEventListener('click', handleGestureWake, { passive: true });

    // 1. Physical Keyboard listener
    const handleKeyDown = (e: KeyboardEvent) => {
      handleGestureWake();
      // Ignore IME composing sessions (handled via beforeinput)
      if (e.isComposing) return;

      // Filter out lone modifier keys to avoid glitch sounds when using keyboard shortcuts (e.g. Ctrl, Alt, Shift, Meta)
      const isLoneModifier = [
        'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock',
        'Escape', 'ContextMenu', 'Insert', 'Pause'
      ].includes(e.key);
      if (isLoneModifier) return;

      // Ignore shortcuts like Ctrl+C, Ctrl+V, Cmd+Z from producing sound unless space/enter/backspace
      if ((e.ctrlKey || e.metaKey || e.altKey) && !['Backspace', 'Delete', 'Enter', ' '].includes(e.key)) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInputOrEditor = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') ||
        target.closest('.editor-area')
      );

      // We focus on text input elements to avoid triggering sound on general page hotkeys
      if (!isInputOrEditor) return;

      lastPhysicalKeyDownTimeRef.current = performance.now();

      triggerSound({
        key: e.key,
        code: e.code,
        isVirtual: false
      });
    };

    // 2. Mobile Touch Keyboard & IME (beforeinput event)
    const handleBeforeInput = (e: InputEvent) => {
      // Deduplicate: if a physical keydown just fired within 90ms, skip beforeinput to prevent double-click glitch
      if (performance.now() - lastPhysicalKeyDownTimeRef.current < 90) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInputOrEditor = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') ||
        target.closest('.editor-area')
      );
      if (!isInputOrEditor) return;

      const inputType = e.inputType;
      const data = e.data || '';

      triggerSound({
        key: data || undefined,
        inputType,
        isVirtual: true
      });
    };

    window.addEventListener('keydown', handleKeyDown, { passive: true, capture: true });
    window.addEventListener('beforeinput', handleBeforeInput as EventListener, { passive: true, capture: true });

    return () => {
      window.removeEventListener('pointerdown', handleGestureWake);
      window.removeEventListener('click', handleGestureWake);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('beforeinput', handleBeforeInput as EventListener, { capture: true });
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
