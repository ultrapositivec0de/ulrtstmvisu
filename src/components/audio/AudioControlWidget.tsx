import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  ChevronDown,
  Star,
  Play,
  Sliders,
  Gauge,
  Smartphone,
  Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTypingSound } from '../../services/audio/useTypingSound';
import { soundSynthEngine } from '../../services/audio/SoundSynthEngine';
import { getPresetDisplayName } from '../../services/audio/presets';
import { useEditorStore } from '../../store';
import { getTranslation, TranslationKey } from '../../locales';

interface AudioControlWidgetProps {
  sound: ReturnType<typeof useTypingSound>;
  onOpenPresetsModal: () => void;
  visualStyle?: string;
  isDarkMode?: boolean;
  className?: string;
}

export const AudioControlWidget: React.FC<AudioControlWidgetProps> = ({
  sound,
  onOpenPresetsModal,
  visualStyle,
  isDarkMode,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentLang = useEditorStore(s => s.currentLang);
  const t = (key: TranslationKey) => getTranslation(currentLang, key);

  const {
    enabled,
    activePreset,
    allPresets,
    volume,
    favoritePresetIds,
    toggleEnabled,
    setVolume,
    setActivePreset,
    toggleFavoritePreset,
    previewPreset,
    updateSettings,
    settings
  } = sound;

  return (
    <div className={cn("relative flex items-center shrink-0", className)}>
      {/* Container holding Toggle Button & Menu Trigger */}
      <div
        className={cn(
          "flex items-center p-0.5 rounded-lg border transition-all text-[10px] sm:text-xs font-bold",
          enabled
            ? (visualStyle === 'neon' || isDarkMode
                ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400"
                : "bg-cyan-50 border-cyan-200 text-cyan-700")
            : (visualStyle === 'neon' || isDarkMode
                ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200"
                : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900")
        )}
      >
        {/* Instant Toggle Button */}
        <button
          id="audio-quick-toggle-btn"
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            toggleEnabled();
          }}
          className={cn(
            "p-1 rounded-md transition-colors flex items-center gap-1",
            enabled
              ? "hover:bg-cyan-500/20 text-cyan-500"
              : "hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
          title={enabled ? t('audioToggleOnTitle').replace('{name}', getPresetDisplayName(activePreset, currentLang)) : t('audioToggleOffTitle')}
        >
          {enabled ? (
            <Volume2 size={13} className="shrink-0 text-cyan-500" />
          ) : (
            <VolumeX size={13} className="shrink-0 text-[var(--text-muted)]" />
          )}
          <span className="hidden md:inline text-[10px] font-semibold truncate max-w-[85px]">
            {t('audioShortLabel')}
          </span>
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0 transition-opacity",
              enabled
                ? "bg-[rgb(var(--accent-color))] opacity-100 animate-pulse"
                : "bg-slate-500 opacity-30"
            )}
          />
        </button>

        {/* Dropdown Opener */}
        <button
          id="audio-quick-menu-trigger"
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            const nextOpen = !isOpen;
            if (nextOpen && typeof document !== 'undefined') {
              const activeEl = document.activeElement as HTMLElement | null;
              if (activeEl && (activeEl.id === 'main-editor' || activeEl.classList.contains('wysiwyg-editor') || activeEl.isContentEditable)) {
                activeEl.blur();
              }
            }
            setIsOpen(nextOpen);
          }}
          className={cn(
            "p-1 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]",
            isOpen && "bg-[var(--bg-card)]"
          )}
          title={t('audioMenuTitle')}
        >
          <ChevronDown size={11} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      </div>

      {/* Popover Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away backdrop */}
            <div
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="fixed left-2 right-2 top-[calc(var(--header-height,3.5rem)+4.75rem+env(safe-area-inset-top,0px))] mx-auto w-auto max-w-[calc(100vw-1rem)] sm:mx-0 sm:left-auto sm:right-0 sm:absolute sm:top-full sm:mt-2 sm:w-72 rounded-2xl border border-[var(--border-color)] bg-[var(--modal-bg)] text-[var(--text-main)] p-3.5 shadow-2xl z-50 flex flex-col gap-3 select-none"
            >
              {/* Header & Quick On/Off */}
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    enabled ? "bg-cyan-500/20 text-cyan-500" : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                  )}>
                    {enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-none text-[var(--text-main)]">{t('audioKeySoundTitle')}</h4>
                    <span className="text-[10px] text-[var(--text-muted)] leading-none">Web Audio Synth</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleEnabled}
                  className={cn(
                    "w-9 h-5 rounded-full relative transition-colors p-0.5",
                    enabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-600"
                  )}
                >
                  <div
                    className={cn(
                      "size-4 bg-white rounded-full transition-all shadow-sm",
                      enabled ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Volume Slider, Touch keys & WPM Speed Optimization toggles */}
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Sliders size={12} /> {t('audioVolume')}
                  </span>
                  <span className="font-mono tabular-nums text-[10px] text-[var(--text-main)]">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  disabled={!enabled}
                  className="w-full accent-[rgb(var(--accent-color))] cursor-pointer disabled:opacity-40 h-1.5 bg-[var(--bg-card)] rounded-lg"
                />

                <label className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 cursor-pointer hover:text-[var(--text-main)] transition-colors">
                  <span className="flex items-center gap-1.5">
                    <Smartphone size={12} /> {t('audioTouchButtons')}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.playOnVirtualKeys}
                    onChange={(e) =>
                      updateSettings((prev) => ({ ...prev, playOnVirtualKeys: e.target.checked }))
                    }
                    className="rounded border-[var(--border-color)] bg-[var(--bg-card)] text-[rgb(var(--accent-color))] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-0.5 cursor-pointer hover:text-[var(--text-main)] transition-colors">
                  <span className="flex items-center gap-1.5">
                    <Gauge size={12} /> {t('audioWpmOpt')}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.speedScalingEnabled !== false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateSettings((prev) => ({ ...prev, speedScalingEnabled: checked }));
                      soundSynthEngine.clearCache();
                    }}
                    className="rounded border-[var(--border-color)] bg-[var(--bg-card)] text-[rgb(var(--accent-color))] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                </label>
              </div>

              {/* Fast Preset Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>{t('audioQuickSelect')}</span>
                  <span className="text-[9px] lowercase font-normal opacity-70">
                    {t('audioPresetsCount').replace('{count}', String(allPresets.length))}
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                  {allPresets.map((preset) => {
                    const isActive = preset.id === activePreset.id;
                    const isFav = favoritePresetIds.includes(preset.id);

                    return (
                      <div
                        key={preset.id}
                        onClick={() => setActivePreset(preset.id)}
                        className={cn(
                          "flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all text-xs",
                          isActive
                            ? "bg-[rgb(var(--accent-color)/0.15)] text-[rgb(var(--accent-color))] font-semibold border border-[rgb(var(--accent-color)/0.35)]"
                            : "hover:bg-[var(--bg-card)] text-[var(--text-main)]"
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoritePreset(preset.id);
                            }}
                            className="p-0.5 text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                          >
                            <Star
                              size={11}
                              className={cn(isFav && "fill-amber-400 text-amber-400")}
                            />
                          </button>
                          <span className="truncate">{getPresetDisplayName(preset, currentLang)}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              previewPreset(preset);
                            }}
                            className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                            title={t('audioPreviewBtnTitle')}
                          >
                            <Play size={10} className="fill-current" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer: Open full presets manager modal */}
              <div className="pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenPresetsModal();
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-[var(--bg-card)] hover:opacity-90 text-[var(--text-main)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-[var(--border-color)]"
                >
                  <Layers size={13} />
                  <span>{t('audioAllPresetsBtn')}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
