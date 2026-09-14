import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  ChevronDown,
  Star,
  Play,
  Sliders,
  Sparkles,
  Smartphone,
  Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTypingSound } from '../../services/audio/useTypingSound';

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
              ? "hover:bg-cyan-500/20 text-cyan-400"
              : "hover:bg-slate-800/50 text-slate-500 hover:text-slate-300"
          )}
          title={enabled ? `Звук клавіш: ${activePreset.name} (Увімкнено)` : 'Увімкнути звук набору клавіш'}
        >
          {enabled ? (
            <Volume2 size={13} className="shrink-0 text-cyan-400 animate-in fade-in" />
          ) : (
            <VolumeX size={13} className="shrink-0 text-slate-500" />
          )}
          <span className="hidden md:inline text-[10px] font-semibold truncate max-w-[85px]">
            {enabled ? activePreset.name.split(' ')[0] : 'Звук'}
          </span>
          {enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-color))] shrink-0 animate-pulse" />
          )}
        </button>

        {/* Dropdown Opener */}
        <button
          id="audio-quick-menu-trigger"
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={cn(
            "p-1 rounded-md transition-colors text-slate-400 hover:text-white",
            isOpen && "bg-slate-800"
          )}
          title="Налаштування звуку та швидкий вибір пресетів"
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
              className={cn(
                "absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 rounded-2xl border p-3.5 shadow-2xl z-50 flex flex-col gap-3 select-none",
                visualStyle === 'neon' || isDarkMode
                  ? "bg-slate-900/95 backdrop-blur-md border-slate-800 text-slate-100"
                  : "bg-white/95 backdrop-blur-md border-slate-200 text-slate-900 shadow-slate-300/50"
              )}
            >
              {/* Header & Quick On/Off */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    enabled ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-400"
                  )}>
                    {enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-none">Звук клавіш</h4>
                    <span className="text-[10px] text-slate-400 leading-none">Web Audio Synth</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleEnabled}
                  className={cn(
                    "w-9 h-5 rounded-full relative transition-colors p-0.5",
                    enabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700"
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

              {/* Volume Slider & Touch keys toggle */}
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Sliders size={12} /> Гучність
                  </span>
                  <span className="font-mono text-[10px] text-slate-300">
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
                  className="w-full accent-[rgb(var(--accent-color))] cursor-pointer disabled:opacity-40 h-1.5 bg-slate-800 rounded-lg"
                />

                <label className="flex items-center justify-between text-[11px] text-slate-400 pt-1 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Smartphone size={12} /> Екранний тач / кнопки
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.playOnVirtualKeys}
                    onChange={(e) =>
                      updateSettings((prev) => ({ ...prev, playOnVirtualKeys: e.target.checked }))
                    }
                    className="rounded border-slate-700 bg-slate-800 text-[rgb(var(--accent-color))] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                </label>
              </div>

              {/* Fast Preset Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Швидкий вибір</span>
                  <span className="text-[9px] lowercase font-normal opacity-70">
                    {allPresets.length} пресетів
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
                            ? "bg-[rgb(var(--accent-color)/0.15)] text-[rgb(var(--accent-color))] font-semibold border border-[rgb(var(--accent-color)/0.3)]"
                            : "hover:bg-slate-800/60 text-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoritePreset(preset.id);
                            }}
                            className="p-0.5 text-slate-500 hover:text-amber-400 transition-colors"
                          >
                            <Star
                              size={11}
                              className={cn(isFav && "fill-amber-400 text-amber-400")}
                            />
                          </button>
                          <span className="truncate">{preset.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              previewPreset(preset);
                            }}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Послухати"
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
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenPresetsModal();
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-700/60"
                >
                  <Layers size={13} />
                  <span>Всі пресети, імпорт та налаштування...</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
