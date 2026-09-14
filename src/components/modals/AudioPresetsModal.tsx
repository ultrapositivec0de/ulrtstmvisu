import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Star,
  Play,
  Upload,
  Download,
  Trash2,
  Check,
  Music,
  Sliders,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import { SoundPreset, AudioTypingSettings } from '../../services/audio/types';
import { PRESET_JSON_TEMPLATE } from '../../services/audio/presets';

interface AudioPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioTypingSettings;
  activePreset: SoundPreset;
  allPresets: SoundPreset[];
  volume: number;
  favoritePresetIds: string[];
  toggleEnabled: () => void;
  setVolume: (v: number) => void;
  setActivePreset: (id: string) => void;
  toggleFavoritePreset: (id: string) => void;
  addCustomPreset: (json: unknown) => { success: boolean; error?: string; preset?: SoundPreset };
  deleteCustomPreset: (id: string) => void;
  previewPreset: (p: SoundPreset) => void;
  updateSettings: (updater: (prev: AudioTypingSettings) => AudioTypingSettings) => void;
}

export const AudioPresetsModal: React.FC<AudioPresetsModalProps> = ({
  isOpen,
  onClose,
  settings,
  activePreset,
  allPresets,
  volume,
  favoritePresetIds,
  toggleEnabled,
  setVolume,
  setActivePreset,
  toggleFavoritePreset,
  addCustomPreset,
  deleteCustomPreset,
  previewPreset,
  updateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'builtin' | 'custom'>('all');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Filter presets by active tab
  const filteredPresets = allPresets.filter((p) => {
    if (activeTab === 'favorites') return favoritePresetIds.includes(p.id);
    if (activeTab === 'builtin') return p.isBuiltin;
    if (activeTab === 'custom') return !p.isBuiltin;
    return true;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const result = addCustomPreset(parsed);
        if (result.success && result.preset) {
          setImportSuccess(`Пресет "${result.preset.name}" успішно імпортовано та активовано!`);
          setTimeout(() => setImportSuccess(null), 4000);
        } else {
          setImportError(result.error || 'Помилка валідації файлу пресету');
        }
      } catch (err) {
        setImportError('Не вдалося розібрати JSON файл. Перевірте синтаксис.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([PRESET_JSON_TEMPLATE], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sound-preset-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Звуковий супровід набору клавіш"
      subtitle="Процедурний синтез Web Audio без важких семплів та навантаження пам'яті"
      icon={Music}
      size="xl"
      className="max-h-[90vh]"
    >
      <div className="space-y-5">
        {/* Global Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <button
              id="audio-synth-toggle-main-btn"
              onClick={toggleEnabled}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-sm ${
                settings.enabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/60 hover:text-white'
              }`}
            >
              {settings.enabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Увімкнено</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Вимкнено</span>
                </>
              )}
            </button>

            {/* Virtual keys toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={settings.playOnVirtualKeys}
                onChange={(e) =>
                  updateSettings((prev) => ({ ...prev, playOnVirtualKeys: e.target.checked }))
                }
                className="rounded border-slate-700 bg-slate-800 text-[rgb(var(--accent-color))] focus:ring-0"
              />
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>Тач/Екранні кнопки</span>
            </label>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2.5 min-w-[150px]">
            <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              disabled={!settings.enabled}
              className="w-24 sm:w-28 accent-[rgb(var(--accent-color))] cursor-pointer disabled:opacity-40"
            />
            <span className="text-xs text-slate-400 font-mono w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Action feedback notifications */}
        {importError && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs rounded-xl">
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        {/* Tab Selector & Import Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800/60 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Всі ({allPresets.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'favorites'
                  ? 'bg-slate-800 text-amber-400 font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-3 h-3 fill-amber-400/40" />
              <span>Обрані ({favoritePresetIds.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('builtin')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'builtin'
                  ? 'bg-slate-800 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Вшиті
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'custom'
                  ? 'bg-slate-800 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Користувацькі ({settings.customPresets.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs transition-all"
              title="Імпортувати .json пресет із пристрою"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Імпорт JSON</span>
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs transition-all"
              title="Завантажити зразок шаблону пресету для редагування або ШІ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Шаблон</span>
            </button>
          </div>
        </div>

        {/* Presets List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {filteredPresets.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-500 text-xs">
              Немає пресетів у цій категорії.
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const isActive = preset.id === activePreset.id;
              const isFav = favoritePresetIds.includes(preset.id);

              return (
                <div
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id)}
                  className={`relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isActive
                      ? 'bg-[rgb(var(--accent-color)/0.1)] border-[rgb(var(--accent-color)/0.5)] shadow-sm'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700/80 hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs sm:text-sm text-slate-200 truncate">
                          {preset.name}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--accent-color)/0.2)] text-[rgb(var(--accent-color))] font-mono">
                            <Check className="w-2.5 h-2.5" /> Активний
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoritePreset(preset.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                        title={isFav ? 'Видалити з обраних' : 'Додати в обрані'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                          }`}
                        />
                      </button>

                      {/* Delete Custom Preset */}
                      {!preset.isBuiltin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomPreset(preset.id);
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                          title="Видалити користувацький пресет"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer of Card: Tags & Preview */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40 text-[10px]">
                    <div className="flex items-center gap-1 overflow-hidden">
                      {preset.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-slate-800/60 text-slate-400 rounded text-[9px] truncate"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        previewPreset(preset);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shrink-0 font-medium"
                      title="Послухати звук"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Тест</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </BaseModal>
  );
};
