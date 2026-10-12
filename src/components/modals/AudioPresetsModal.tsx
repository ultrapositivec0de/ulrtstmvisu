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
  Gauge,
  Smartphone
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import { SoundPreset, AudioTypingSettings } from '../../services/audio/types';
import { PRESET_JSON_TEMPLATE, getPresetDisplayName, getPresetDisplayDescription } from '../../services/audio/presets';
import { soundSynthEngine } from '../../services/audio/SoundSynthEngine';
import { useEditorStore } from '../../store';
import { getTranslation, TranslationKey } from '../../locales';

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
  const currentLang = useEditorStore(s => s.currentLang);
  const t = (key: TranslationKey) => getTranslation(currentLang, key);

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
          setImportSuccess(t('audioImportSuccess').replace('{name}', result.preset.name));
          setTimeout(() => setImportSuccess(null), 4000);
        } else {
          setImportError(result.error || t('audioImportValidationError'));
        }
      } catch (err) {
        setImportError(t('audioImportJsonError'));
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
      title={t('audioModalHeaderTitle')}
      subtitle={t('audioModalHeaderSubtitle')}
      icon={Music}
      size="xl"
      className="max-h-[90vh]"
    >
      <div className="space-y-5">
        {/* Global Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="audio-synth-toggle-main-btn"
              onClick={toggleEnabled}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-sm ${
                settings.enabled
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-main)]'
              }`}
            >
              {settings.enabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                  <span>{t('audioEnabled')}</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>{t('audioDisabled')}</span>
                </>
              )}
            </button>

            {/* Virtual keys toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-main)] select-none">
              <input
                type="checkbox"
                checked={settings.playOnVirtualKeys}
                onChange={(e) =>
                  updateSettings((prev) => ({ ...prev, playOnVirtualKeys: e.target.checked }))
                }
                className="rounded border-[var(--border-color)] bg-[var(--bg-main)] text-[rgb(var(--accent-color))] focus:ring-0"
              />
              <Smartphone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>{t('audioTouchButtonsShort')}</span>
            </label>

            {/* WPM speed scaling toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-main)] select-none">
              <input
                type="checkbox"
                checked={settings.speedScalingEnabled !== false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateSettings((prev) => ({ ...prev, speedScalingEnabled: checked }));
                  soundSynthEngine.clearCache();
                }}
                className="rounded border-[var(--border-color)] bg-[var(--bg-main)] text-[rgb(var(--accent-color))] focus:ring-0"
              />
              <Gauge className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>{t('audioWpmOptFull')}</span>
            </label>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2.5 min-w-[150px]">
            <Sliders className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
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
            <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Action feedback notifications */}
        {importError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs rounded-xl">
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        {/* Tab Selector & Import Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-color)] text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-[rgb(var(--accent-color))] text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t('audioTabAll')} ({allPresets.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'favorites'
                  ? 'bg-[rgb(var(--accent-color))] text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{t('audioTabFavorites')} ({favoritePresetIds.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('builtin')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'builtin'
                  ? 'bg-[rgb(var(--accent-color))] text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t('audioTabBuiltin')}
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'custom'
                  ? 'bg-[rgb(var(--accent-color))] text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t('audioTabCustom')} ({settings.customPresets.length})
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:opacity-90 text-[var(--text-main)] border border-[var(--border-color)] text-xs font-medium transition-all"
              title={t('audioImportJsonTitle')}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('audioImportJsonBtn')}</span>
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:opacity-90 text-[var(--text-main)] border border-[var(--border-color)] text-xs font-medium transition-all"
              title={t('audioTemplateTitle')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('audioTemplateBtn')}</span>
            </button>
          </div>
        </div>

        {/* Presets List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {filteredPresets.length === 0 ? (
            <div className="col-span-full py-10 text-center text-[var(--text-muted)] text-xs">
              {t('audioEmptyCategory')}
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
                      ? 'bg-[rgb(var(--accent-color)/0.12)] border-[rgb(var(--accent-color)/0.6)] shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[rgb(var(--accent-color)/0.4)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs sm:text-sm text-[var(--text-main)] truncate">
                          {getPresetDisplayName(preset, currentLang)}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[rgb(var(--accent-color)/0.2)] text-[rgb(var(--accent-color))] font-mono">
                            <Check className="w-2.5 h-2.5" /> {t('audioActiveBadge')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
                        {getPresetDisplayDescription(preset, currentLang)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoritePreset(preset.id);
                        }}
                        className="p-1 rounded-lg text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                        title={isFav ? t('audioFavRemoveTitle') : t('audioFavAddTitle')}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFav ? 'fill-amber-400 text-amber-400' : 'text-[var(--text-muted)]'
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
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                          title={t('audioDeleteCustomTitle')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer of Card: Tags & Preview */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-color)] text-[10px]">
                    <div className="flex items-center gap-1 overflow-hidden">
                      {preset.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)] rounded text-[9px] truncate"
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-main)] hover:bg-[rgb(var(--accent-color))] text-[var(--text-main)] hover:text-white border border-[var(--border-color)] transition-all shrink-0 font-semibold"
                      title={t('audioPreviewSoundTitle')}
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{t('audioTestBtn')}</span>
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
