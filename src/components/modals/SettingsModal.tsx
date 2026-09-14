import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Download,
  Trash2,
  ShieldCheck,
  Key,
  CheckCircle,
  Copy,
  Sun,
  Zap,
  ChevronDown,
  Terminal,
  Type,
  Sparkles,
  User,
  Bot,
  Code,
  RotateCcw,
  Sliders,
  Maximize2
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import { cn } from '../../lib/utils';
import { Template, ImageItem } from '../../types';
import { SecurityService } from '../../services/securityService';
import { APP_CHANGELOG, getChangelogText } from '../../data/changelog';
import { DEFAULT_APP_AGENT } from '../../hooks/usePostSettings';
import { UiScalePreset } from '../../hooks/useThemeAndStyles';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settingsTab: 'general' | 'gallery' | 'vault' | 'keys' | 'about' | 'pwa';
  setSettingsTab: (tab: 'general' | 'gallery' | 'vault' | 'keys' | 'about' | 'pwa') => void;
  // General settings
  lang: string;
  setLang?: (lang: any) => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  visualStyle: 'standard' | 'neon';
  setVisualStyle: (style: 'standard' | 'neon') => void;
  isDarkMode: boolean;
  neonTextColored: boolean;
  setNeonTextColored: (val: boolean) => void;
  editorFont: string;
  setEditorFont: (font: string) => void;
  editorFontSize: string | number;
  setEditorFontSize: (size: any) => void;
  toolbarIconSize: string | number;
  setToolbarIconSize: (size: any) => void;
  // UI Scaling System
  uiScalePreset?: UiScalePreset;
  setUiScalePreset?: (preset: UiScalePreset) => void;
  applyUiScalePreset?: (preset: UiScalePreset) => void;
  headerIconSize?: number;
  setHeaderIconSize?: (size: number) => void;
  headerHeight?: number;
  setHeaderHeight?: (height: number) => void;
  headerHeightAuto?: boolean;
  setHeaderHeightAuto?: (auto: boolean) => void;
  galleryIconSize?: number;
  setGalleryIconSize?: (size: number) => void;
  wysiwygSpacing: string | number;
  setWysiwygSpacing: (spacing: any) => void;
  widgetPos: 'floating' | 'bottom' | 'hidden' | 'left' | 'right';
  setWidgetPos: (pos: any) => void;
  isTrafficOptimized: boolean;
  setIsTrafficOptimized: (val: boolean) => void;
  syncScrollEnabled: boolean;
  setSyncScrollEnabled: (val: boolean) => void;
  performanceMode: boolean;
  setPerformanceMode: (val: boolean) => void;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (val: boolean) => void;
  appAgent: string;
  setAppAgent: (val: string) => void;
  // Gallery / Unsplash / Pixabay / Pexels
  imageInsertFormat: 'html' | 'markdown' | string;
  setImageInsertFormat: (format: any) => void;
  unsplashAccessKey: string | null;
  setUnsplashAccessKey: (key: string | null) => void;
  pixabayApiKey: string | null;
  setPixabayApiKey: (key: string | null) => void;
  pexelsApiKey: string | null;
  setPexelsApiKey: (key: string | null) => void;
  pexelsSettings: any;
  setPexelsSettings: React.Dispatch<React.SetStateAction<any>>;
  images: ImageItem[];
  clearAllImages?: () => void;
  templates: Template[];
  clearAllTemplates?: () => void;
  handleClearCache: () => void;
  // Vault
  isUnlocked: boolean;
  vaultAccounts: string[];
  initVault: () => void;
  // Keys modal trigger
  setActiveModal: (modal: any) => void;
  // PWA
  isPwaInstalled: boolean;
  handleInstallPwa: () => void;
  setShowPwaInstructionsModal: (val: boolean) => void;
  // Helpers
  notify: (msg: string, type?: any) => void;
  confirmDialog: (msg: string) => Promise<boolean>;
  promptDialog: (message: string, defaultValue?: string, title?: string, inputType?: 'text' | 'password') => Promise<string | null>;
  t: (key: any) => string;
}

export const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    settingsTab,
    setSettingsTab,
    lang,
    themeColor,
    setThemeColor,
    visualStyle,
    setVisualStyle,
    isDarkMode,
    neonTextColored,
    setNeonTextColored,
    editorFont,
    setEditorFont,
    editorFontSize,
    setEditorFontSize,
    toolbarIconSize,
    setToolbarIconSize,
    uiScalePreset,
    setUiScalePreset,
    applyUiScalePreset,
    headerIconSize,
    setHeaderIconSize,
    headerHeight,
    setHeaderHeight,
    headerHeightAuto,
    setHeaderHeightAuto,
    galleryIconSize,
    setGalleryIconSize,
    wysiwygSpacing,
    setWysiwygSpacing,
    widgetPos,
    setWidgetPos,
    isTrafficOptimized,
    setIsTrafficOptimized,
    syncScrollEnabled,
    setSyncScrollEnabled,
    performanceMode,
    setPerformanceMode,
    showAdvancedSettings,
    setShowAdvancedSettings,
    appAgent,
    setAppAgent,
    imageInsertFormat,
    setImageInsertFormat,
    unsplashAccessKey,
    setUnsplashAccessKey,
    pixabayApiKey,
    setPixabayApiKey,
    pexelsApiKey,
    setPexelsApiKey,
    pexelsSettings,
    setPexelsSettings,
    handleClearCache,
    isUnlocked,
    vaultAccounts,
    initVault,
    isPwaInstalled,
    handleInstallPwa,
    setShowPwaInstructionsModal,
    notify,
    confirmDialog,
    promptDialog,
    t
  } = props;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={Settings}
      title={t('settings')}
      modalKey="modal-settings"
      bodyClassName="p-0 flex flex-col flex-1 overflow-hidden"
    >
      {/* Settings Tabs Bar */}
      <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-main)]/60 overflow-x-auto no-scrollbar shrink-0 px-2 sm:px-4">
        {(['general', 'gallery', 'vault', 'keys', 'about', 'pwa'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSettingsTab(tab)}
            className={cn(
              "px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer",
              settingsTab === tab 
                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
            )}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar flex-1">
        {settingsTab === 'general' && (
          <section className="space-y-6">
            {/* Performance Mode */}
            <div className="flex items-center justify-between p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg"><Zap size={18} /></div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-main)]">{t('performanceMode')}</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{t('performanceDesc') || 'Вимикає деякі анімації'}</p>
                </div>
              </div>
              <button 
                onClick={() => setPerformanceMode(!performanceMode)}
                className={cn(
                  "w-10 h-5 rounded-full transition-all relative cursor-pointer border border-transparent",
                  performanceMode ? "bg-cyan-600 border-cyan-500" : "bg-[var(--bg-card)] border-[var(--border-color)]"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-xs",
                  performanceMode ? "left-5" : "left-0.5"
                )} />
              </button>
            </div>

            {/* Visual Style Selector */}
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-2">{t('appearance') || 'Style'}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setVisualStyle('standard');
                    localStorage.setItem('steem_visual_style', 'standard');
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer",
                    visualStyle === 'standard' 
                      ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-sm" 
                      : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  )}
                >
                  <Sun size={14} /> {isDarkMode ? 'Dark' : 'Light'}
                </button>
                <button
                  onClick={() => {
                    setVisualStyle('neon');
                    localStorage.setItem('steem_visual_style', 'neon');
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer",
                    visualStyle === 'neon' 
                      ? "bg-purple-900/40 border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]" 
                      : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  )}
                >
                  <Zap size={14} /> Cyber Neon
                </button>
              </div>
            </div>

            {/* Neon Editor Text Color Toggle (Active only when Cyber Neon is enabled) */}
            {visualStyle === 'neon' && (
              <div className="flex items-center justify-between p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-2xl transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg"><Type size={18} /></div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-main)]">
                      {t('coloredEditorText')}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide leading-normal mt-0.5">
                      {t('coloredEditorTextDesc')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setNeonTextColored(!neonTextColored)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative shrink-0 cursor-pointer border border-transparent",
                    neonTextColored ? "bg-cyan-600 border-cyan-500" : "bg-[var(--bg-card)] border-[var(--border-color)]"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-xs",
                    neonTextColored ? "left-5" : "left-0.5"
                  )} />
                </button>
              </div>
            )}

            {/* Font Selector */}
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-2">{t('font')}</label>
              <div className="grid grid-cols-3 gap-2">
                 {[
                   { id: 'sans', label: t('fontSans'), class: 'font-sans' },
                   { id: 'serif', label: t('fontSerif'), class: 'font-serif' },
                   { id: 'mono', label: t('fontMono'), class: 'font-mono' }
                 ].map(f => (
                   <button 
                     key={f.id}
                     onClick={() => {
                       setEditorFont(f.id);
                       localStorage.setItem('steem_editor_font', f.id);
                     }}
                     className={cn(
                       "py-2.5 rounded-xl border text-xs transition-all cursor-pointer",
                       editorFont === f.id 
                        ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-sm" 
                        : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                     )}
                   >
                     <span className={f.class}>Aa</span>
                     <span className="ml-2 font-bold">{f.label.split(' ')[0]}</span>
                   </button>
                 ))}
              </div>
            </div>

            {/* Theme Colors */}
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-2">{t('theme')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cyan', label: t('themeCyan'), color: '#06b6d4' },
                  { id: 'emerald', label: t('themeEmerald'), color: '#10b981' },
                  { id: 'orange', label: t('themeOrange'), color: '#f97316' },
                  { id: 'rose', label: t('themeRose'), color: '#f43f5e' }
                ].map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setThemeColor(theme.id);
                      localStorage.setItem('steem_theme_color', theme.id);
                    }}
                    className={cn(
                      "text-[10px] p-2.5 rounded-xl border transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer font-bold",
                      themeColor === theme.id 
                        ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-sm" 
                        : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500 hover:text-[var(--text-main)]"
                    )}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.color }} />
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Options */}
            <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
              {/* Widget Mode Selector */}
              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-2">{t('widgetPos') || 'Режим плаваючого віджета'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bottom', label: lang === 'uk' ? '🔒 Внизу' : '🔒 Bottom' },
                    { id: 'floating', label: lang === 'uk' ? '🎈 Плаваючий' : '🎈 Floating' },
                    { id: 'hidden', label: lang === 'uk' ? '🚫 Вимкнено' : '🚫 Hidden' }
                  ].map(pos => (
                    <button
                      key={pos.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setWidgetPos(pos.id as any);
                        localStorage.setItem('steem_widget_pos', pos.id);
                      }}
                      className={cn(
                        "py-2 px-1 rounded-xl border text-[10px] font-bold uppercase transition-all text-center truncate cursor-pointer",
                        widgetPos === pos.id 
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-sm" 
                          : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500 hover:text-[var(--text-main)]"
                      )}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {t('syncScroll')}
                </span>
                <button 
                  onClick={() => {
                    const next = !syncScrollEnabled;
                    setSyncScrollEnabled(next);
                    localStorage.setItem('steem_sync_scroll', next.toString());
                  }}
                  className={cn(
                    "w-9 h-5 rounded-full transition-all relative cursor-pointer border border-transparent",
                    syncScrollEnabled ? "bg-cyan-600 border-cyan-500" : "bg-[var(--bg-card)] border-[var(--border-color)]"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-xs",
                    syncScrollEnabled ? "left-4.5" : "left-0.5"
                  )} />
                </button>
              </div>

              {/* Custom Editor Font Size Control */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/60">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {t('fontSize')}
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                    {editorFontSize} px
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-1.5 bg-[var(--bg-main)]/60 p-1 rounded-xl border border-[var(--border-color)]">
                  {[
                    { id: 14, label: lang === 'uk' ? "Дрібний" : "Small" },
                    { id: 16, label: lang === 'uk' ? "Стандарт" : "Normal" },
                    { id: 18, label: lang === 'uk' ? "Великий" : "Large" },
                    { id: 22, label: lang === 'uk' ? "Макс" : "Max" }
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setEditorFontSize(preset.id);
                        localStorage.setItem('steem_editor_font_size', String(preset.id));
                      }}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[10px] font-semibold uppercase transition-all text-center truncate cursor-pointer",
                        editorFontSize === preset.id 
                          ? "bg-cyan-600 text-white shadow" 
                          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">12px</span>
                  <input
                    type="range"
                    min="12"
                    max="32"
                    value={editorFontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setEditorFontSize(val);
                      localStorage.setItem('steem_editor_font_size', String(val));
                    }}
                    className="flex-1 accent-cyan-500 bg-[var(--bg-card)] h-1.5 rounded-lg appearance-none cursor-pointer border border-[var(--border-color)]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">32px</span>
                </div>
              </div>

              {/* Custom Toolbar Icon Size Control */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/60">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {t('iconSize')}
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                    {toolbarIconSize} px
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-main)]/60 p-1 rounded-xl border border-[var(--border-color)]">
                  {[
                    { id: 14, label: lang === 'uk' ? "Дрібні" : "Small" },
                    { id: 20, label: lang === 'uk' ? "Стандарт" : "Normal" },
                    { id: 26, label: lang === 'uk' ? "Великі" : "Large" }
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setToolbarIconSize(preset.id);
                        localStorage.setItem('steem_toolbar_icon_size', String(preset.id));
                      }}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-[10px] font-semibold uppercase transition-all text-center cursor-pointer",
                        toolbarIconSize === preset.id 
                          ? "bg-cyan-600 text-white shadow" 
                          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">12px</span>
                  <input
                    type="range"
                    min="12"
                    max="32"
                    value={toolbarIconSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setToolbarIconSize(val);
                      localStorage.setItem('steem_toolbar_icon_size', String(val));
                    }}
                    className="flex-1 accent-cyan-500 bg-[var(--bg-card)] h-1.5 rounded-lg appearance-none cursor-pointer border border-[var(--border-color)]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">32px</span>
                </div>
              </div>

              {/* Custom Visual Editor Spacing Control */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/60">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {t('visualSpacing')}
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                    {wysiwygSpacing} px
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-1.5 bg-[var(--bg-main)]/60 p-1 rounded-xl border border-[var(--border-color)]">
                  {[
                    { id: 6, label: lang === 'uk' ? "Компакт" : "Compact" },
                    { id: 14, label: lang === 'uk' ? "Збаланс" : "Balanced" },
                    { id: 20, label: lang === 'uk' ? "Стандарт" : "Normal" },
                    { id: 28, label: lang === 'uk' ? "Просторі" : "Spacious" }
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setWysiwygSpacing(preset.id);
                        localStorage.setItem('steem_wysiwyg_spacing', String(preset.id));
                      }}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[10px] font-semibold uppercase transition-all text-center truncate cursor-pointer",
                        wysiwygSpacing === preset.id 
                          ? "bg-cyan-600 text-white shadow" 
                          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">0px</span>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={wysiwygSpacing}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setWysiwygSpacing(val);
                      localStorage.setItem('steem_wysiwyg_spacing', String(val));
                    }}
                    className="flex-1 accent-cyan-500 bg-[var(--bg-card)] h-1.5 rounded-lg appearance-none cursor-pointer border border-[var(--border-color)]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">40px</span>
                </div>
              </div>
            </div>

            {/* Interface Scale & Element Sizing */}
            <div className="p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                    <Sliders size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-main)]">
                      {lang === 'uk' ? "Масштаб інтерфейсу та розміри" : "UI Scale & Element Sizing"}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                      {lang === 'uk' ? "Іконки хедера, бічної панелі та висота" : "Header icons, gallery & toolbar sizes"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);
                    applyUiScalePreset?.(isMobile ? 'touch' : 'normal');
                    setHeaderHeightAuto?.(true);
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 transition-all cursor-pointer"
                  title={lang === 'uk' ? "Скинути до стандартних значень" : "Reset to default"}
                >
                  <RotateCcw size={12} />
                  <span>{lang === 'uk' ? "Скинути" : "Reset"}</span>
                </button>
              </div>

              {/* Presets Grid */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block">
                    {lang === 'uk' ? "Готові пресети масштабу" : "Scale Presets"}
                  </label>
                  {uiScalePreset === 'custom' && (
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded uppercase">
                      {lang === 'uk' ? "Ручний" : "Custom"}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[var(--bg-main)]/60 p-1 rounded-xl border border-[var(--border-color)]">
                  {[
                    { id: 'compact', label: lang === 'uk' ? "Компакт" : "Compact", desc: "16px" },
                    { id: 'normal', label: lang === 'uk' ? "Стандарт" : "Normal", desc: "18px" },
                    { id: 'large', label: lang === 'uk' ? "Збільшений" : "Large", desc: "20px" },
                    { id: 'touch', label: lang === 'uk' ? "Сенсорний" : "Touch / Mob", desc: "22px" },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => applyUiScalePreset?.(preset.id as any)}
                      className={cn(
                        "py-2 px-1 rounded-lg text-[10px] font-semibold uppercase transition-all flex flex-col items-center justify-center cursor-pointer",
                        uiScalePreset === preset.id
                          ? "bg-cyan-600 text-white shadow"
                          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
                      )}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[8px] opacity-75 font-mono">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Header Auto-height toggle */}
              <div className="flex items-center justify-between p-2.5 bg-[var(--bg-card)]/40 rounded-xl border border-[var(--border-color)]">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-main)]">
                    {lang === 'uk' ? "Автоматична висота хедера" : "Auto header height"}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                    {lang === 'uk' ? "Підлаштовує висоту під розмір іконок і відступи" : "Calculates height dynamically based on icon size"}
                  </p>
                </div>
                <button 
                  onClick={() => setHeaderHeightAuto?.(!headerHeightAuto)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative shrink-0 cursor-pointer border border-transparent",
                    headerHeightAuto ? "bg-cyan-600 border-cyan-500" : "bg-[var(--bg-card)] border-[var(--border-color)]"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-xs",
                    headerHeightAuto ? "left-5" : "left-0.5"
                  )} />
                </button>
              </div>

              {/* Sliders for Manual Overrides */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-color)]/60">
                {/* Header Icon Size Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      {lang === 'uk' ? "Розмір іконок хедера" : "Header Icon Size"}
                    </label>
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                      {headerIconSize || 18} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">14px</span>
                    <input
                      type="range"
                      min="14"
                      max="28"
                      value={headerIconSize || 18}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setUiScalePreset?.('custom');
                        setHeaderIconSize?.(val);
                      }}
                      className="flex-1 accent-cyan-500 bg-[var(--bg-card)] h-1.5 rounded-lg appearance-none cursor-pointer border border-[var(--border-color)]"
                    />
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">28px</span>
                  </div>
                </div>

                {/* Header Height Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {lang === 'uk' ? "Висота хедера" : "Header Height"}
                      </label>
                      {headerHeightAuto && (
                        <span className="text-[9px] text-cyan-400 font-semibold bg-cyan-950/50 px-1.5 py-0.2 rounded border border-cyan-800/40">
                          {lang === 'uk' ? "авто розрахунок" : "auto calculated"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                      {headerHeight || 56} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">40px</span>
                    <input
                      type="range"
                      min="40"
                      max="80"
                      disabled={headerHeightAuto}
                      value={headerHeight || 56}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setUiScalePreset?.('custom');
                        setHeaderHeightAuto?.(false);
                        setHeaderHeight?.(val);
                      }}
                      className={cn(
                        "flex-1 accent-cyan-500 bg-[var(--bg-card)] h-1.5 rounded-lg appearance-none border border-[var(--border-color)]",
                        headerHeightAuto ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                      )}
                    />
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">80px</span>
                  </div>
                </div>

                {/* Gallery Icon Size Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      {lang === 'uk' ? "Розмір іконок галереї / панелі" : "Gallery / Sidebar Icon Size"}
                    </label>
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                      {galleryIconSize || 16} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">12px</span>
                    <input
                      type="range"
                      min="12"
                      max="26"
                      value={galleryIconSize || 16}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setUiScalePreset?.('custom');
                        setGalleryIconSize?.(val);
                      }}
                      className="flex-1 accent-cyan-500 bg-[var(--bg-card)] h-1.5 rounded-lg appearance-none cursor-pointer border border-[var(--border-color)]"
                    />
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">26px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CACHE CLEAR (Visible in all platforms: Tauri, Android, PWA, Web) */}
            <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Trash2 size={18} /></div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">
                    {t('clearAppCache')}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] max-w-[200px] sm:max-w-[300px] leading-tight mt-0.5">
                    {lang === 'uk'
                      ? 'Очищує кеш зображень, завантажені списки та тимчасові файли. Чернетки, шаблони та ключі НЕ видаляються.'
                      : 'Clear images, loaded lists & temporary files. Drafts, templates, and keys will NOT be deleted.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleClearCache}
                className="px-4 py-2 bg-rose-600/80 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/20 shrink-0 cursor-pointer"
              >
                {t('clearAction')}
              </button>
            </div>
          </section>
        )}

        {settingsTab === 'gallery' && (
          <section className="space-y-6">
            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block">{t('gallerySettings') || "Gallery"}</label>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <span className="text-[10px] font-bold text-[var(--text-muted)] block">{t('imageFormat')}</span>
                   <div className="grid grid-cols-2 gap-1 bg-[var(--bg-main)]/60 p-1 rounded-xl border border-[var(--border-color)]">
                      <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-1 text-[10px] font-bold rounded cursor-pointer", imageInsertFormat === 'html' ? "bg-cyan-600 text-white shadow-xs" : "text-[var(--text-muted)]")}>HTML</button>
                      <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-1 text-[10px] font-bold rounded cursor-pointer", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white shadow-xs" : "text-[var(--text-muted)]")}>MD</button>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <span className="text-[10px] font-bold text-[var(--text-muted)] block">{t('trafficOptimization')}</span>
                   <button 
                     onClick={() => setIsTrafficOptimized(!isTrafficOptimized)}
                     className={cn(
                       "w-full py-1.5 text-[10px] rounded-xl font-bold border transition-all cursor-pointer",
                       isTrafficOptimized ? "border-cyan-500 text-cyan-400 bg-cyan-400/10" : "border-[var(--border-color)] text-[var(--text-muted)] bg-[var(--bg-main)]/40"
                     )}
                   >
                     {isTrafficOptimized ? "ON" : "OFF"}
                   </button>
                 </div>
              </div>

              <div className="p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl space-y-3">
                 <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{t('pexelsAttribution')}</span>
                   <button 
                    onClick={() => setPexelsSettings((prev: any) => ({ ...prev, withAttribution: !prev.withAttribution }))}
                    className={cn("w-8 h-4 rounded-full relative transition-all cursor-pointer", pexelsSettings.withAttribution ? "bg-cyan-600" : "bg-slate-700")}
                   >
                      <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-xs", pexelsSettings.withAttribution ? "left-4.5" : "left-0.5")} />
                   </button>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{t('pexelsLink')}</span>
                   <button 
                    onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))}
                    className={cn("w-8 h-4 rounded-full relative transition-all cursor-pointer", pexelsSettings.linkEmbedded ? "bg-cyan-600" : "bg-slate-700")}
                   >
                      <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-xs", pexelsSettings.linkEmbedded ? "left-4.5" : "left-0.5")} />
                   </button>
                 </div>
              </div>
            </div>
          </section>
        )}

        {settingsTab === 'vault' && (
          <section className="space-y-6">
            <div className="p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400">
                   <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">{t('vaultSecurity')}</h4>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-tighter">
                    {isUnlocked ? t('sessionActive') : t('vaultClosed')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={async () => {
                    if (isUnlocked) SecurityService.lock();
                    else {
                       const pin = await promptDialog(t('enterPin'), '', undefined, 'password');
                       if (pin) {
                         try {
                           await SecurityService.unlock(pin);
                           initVault();
                         } catch {
                           notify(t('error'), 'error');
                         }
                       }
                    }
                  }}
                  className={cn(
                    "py-2 rounded-lg font-bold text-xs transition-all border cursor-pointer",
                    isUnlocked ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-green-500/10 border-green-500/30 text-green-500"
                  )}
                >
                   {isUnlocked ? t('lock') : t('unlock')}
                </button>
                <button 
                  onClick={async () => {
                    if (await confirmDialog(t('confirmResetVault'))) {
                       await SecurityService.clearAll();
                       initVault();
                       notify(t('saveSuccess'));
                    }
                  }}
                  className="py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg font-bold text-xs transition-colors cursor-pointer"
                >
                   {t('confirmResetVault') || "Reset"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">{t('accounts') || "Accounts"}</label>
              <div className="space-y-2">
                {vaultAccounts.filter(Boolean).map((acc, idx) => (
                  <div key={acc || `settings-vault-acc-${idx}`} className="flex items-center justify-between p-3 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl">
                    <span className="font-bold text-cyan-400">@{acc}</span>
                    <button 
                      onClick={async () => {
                        if (await confirmDialog(t('confirmDeleteAccount').replace('{acc}', acc))) {
                           await SecurityService.deleteAccount(acc);
                           initVault();
                        }
                      }}
                      className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {settingsTab === 'keys' && (
          <section className="space-y-6">
            <div className="space-y-4">
               <div className="p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl space-y-4">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block">{t('pexelsKey')}</label>
                  <div className="relative">
                    <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                    <input 
                      type="password"
                      value={pexelsApiKey || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setPexelsApiKey(val);
                        if (!isUnlocked) {
                           localStorage.setItem('steem_pexels_key_raw', val);
                        } else {
                           await SecurityService.savePexelsKey(val);
                        }
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder="Pexels API Key"
                    />
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)] leading-tight">
                    {isUnlocked ? "Stored securely in vault" : "Stored unencrypted in local storage"}
                  </p>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block">Pixabay</label>
                    <input 
                      type="password"
                      value={pixabayApiKey || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPixabayApiKey(val);
                        SecurityService.saveApiKey('pixabay', val);
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg py-2 pl-3 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block">Unsplash</label>
                    <input 
                      type="password"
                      value={unsplashAccessKey || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUnsplashAccessKey(val);
                        SecurityService.saveApiKey('unsplashAccess', val);
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg py-2 pl-3 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
               </div>
            </div>
          </section>
        )}

        {settingsTab === 'about' && (
          <section className="space-y-6">
            <div className="p-6 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-2xl text-center space-y-4">
               <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl mx-auto flex items-center justify-center text-cyan-400 font-black text-2xl shadow-md shadow-cyan-500/10">S</div>
               <div>
                 <h3 className="text-xl font-black tracking-tight text-[var(--text-main)]">SteemEditor <span className="text-cyan-400">Pro</span></h3>
                 <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-[0.2em] pt-1">Version 4.8.0 "Quantum"</p>
               </div>
               <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1 pt-4 block border-t border-[var(--border-color)]">Changelog & Updates</label>
                <div className="mt-2 p-3 bg-[var(--bg-card)] border border-cyan-500/20 rounded-xl text-left">
                  <p className="text-xs text-[var(--text-main)] font-medium">New in v4.8.0: Autoscroll Caret Clearance, Phishy Block & Span Exit Fixes & Cross-Platform Version Sync</p>
                </div>
               
               <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3">
                 {APP_CHANGELOG.map((log, index) => (
                   <div key={`${log.version}-${index}`} className={cn("space-y-1", index > 0 && "pt-2 border-t border-[var(--border-color)]/50")}>
                     <div className="flex items-center gap-2">
                       <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", index === 0 ? "text-cyan-400 bg-cyan-500/10" : "text-[var(--text-muted)] bg-[var(--bg-main)]")}>{log.version}</span>
                       <span className="text-[9px] text-[var(--text-muted)]">{log.date}</span>
                     </div>
                     <ul className={cn("text-xs list-inside list-disc pl-1 leading-snug", index === 0 ? "text-[var(--text-main)] space-y-1.5" : "text-[var(--text-muted)] space-y-1")}>
                       {log.changes.map((change, i) => (
                         <li key={i}>{change}</li>
                        ))}
                     </ul>
                   </div>
                 ))}
               </div>
               
               <div className="flex justify-end pt-1">
                 <button 
                   onClick={() => {
                     navigator.clipboard.writeText(getChangelogText());
                     const btn = document.getElementById('copy-changelog-btn');
                     if (btn) {
                       const orig = btn.innerText;
                       btn.innerText = "COPIED!";
                       setTimeout(() => btn.innerText = orig, 2000);
                     }
                   }}
                   id="copy-changelog-btn"
                   className="text-[9px] font-bold text-[var(--text-muted)] hover:text-cyan-400 transition-colors uppercase tracking-widest px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg flex gap-1 items-center cursor-pointer"
                 >
                   <Copy size={11} /> COPY LOG
                 </button>
               </div>
            </div>

            <div className="space-y-4 pt-2 text-left">
               {/* Credits & Development (Fair Transparency: Human + AI) */}
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-cyan-400" /> {t('credits') || 'Авторство та розробка'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Human Role */}
                    <div className="p-3.5 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl space-y-2 hover:border-slate-500 transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                          <User size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--text-main)] block">{t('humanCredits') || 'Людина (Автор проєкту)'}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-medium">{t('developer') || 'Розробник'} / Архітектор</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                        {t('humanTasks') || 'Ідея, концепція, творче спрямування, тестування, архітектурне бачення та асистування.'}
                      </p>
                    </div>

                    {/* AI Role */}
                    <div className="p-3.5 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl space-y-2 hover:border-slate-500 transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                          <Bot size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-cyan-400 block">{t('aiCredits') || 'ШІ (Gemini AI / AI Studio)'}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-medium">Технічна реалізація</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                        {t('aiTasks') || 'Написання коду, глибока технічна оптимізація, алгоритми та реалізація логіки.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex items-center justify-between text-[10px] text-[var(--text-muted)] px-3">
                    <span className="flex items-center gap-1.5">
                      <Code size={12} className="text-cyan-400" /> {t('license') || 'Ліцензія'}: Apache 2.0 (Open Source)
                    </span>
                    <span className="text-[var(--text-muted)] font-mono text-[9px]">© 2026 SteemEditor Pro</span>
                  </div>
               </div>

               <div className="pt-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1">Пакетний Аудит (NPM Packages)</label>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                     {[
                       { n: 'react', v: '19.0.0', d: 'Ядро інтерфейсу, реактивність та керування станом компонентів.' },
                       { n: '@blazeapps/dsteem', v: '0.12.2', d: 'Повноцінна клієнтська інтеграція з блокчейном Steem (транзакції, підписи, апвоути).' },
                       { n: 'motion', v: '13.1.0', d: 'Професійні та плавні анімації інтерфейсу для відмінного UX.' },
                       { n: 'marked', v: '18.0.7', d: 'Швидкісний і безпечний парсер Markdown розмітки в чистий HTML.' },
                       { n: 'dompurify', v: '3.4.13', d: 'Надійне очищення HTML від XSS-загроз при читанні стрічки дописів.' },
                       { n: 'lucide-react', v: '1.31.0', d: 'Набір сучасних та лаконічних векторних іконок для UI.' },
                       { n: 'buffer', v: '6.0.3', d: 'Поліфіл буфера для криптографічних підписів у браузерному оточенні.' },
                       { n: 'fflate', v: '0.8.3', d: 'Ультра-швидке та легковажне стиснення й розархівування чернеток у ZIP.' },
                       { n: 'exifreader', v: '4.38.1', d: 'Зчитування та аналіз метаданих EXIF з фотографій для параметрів зйомки.' },
                       { n: 'idb-keyval', v: '6.2.2', d: 'Надшвидке сховище автозбереження чернеток в IndexedDB браузера.' },
                       { n: 'idiomorph', v: '0.7.4', d: 'Інтелектуальне зіставлення (morphing) DOM для безшовної синхронізації без втрати фокусу й курсору.' },
                       { n: 'zustand', v: '5.0.14', d: 'Легковажне керування глобальним станом застосунку.' }
                     ].map(pkg => (
                       <div key={pkg.n} className="p-2.5 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl flex flex-col gap-1 hover:border-slate-500 transition-all">
                          <div className="flex justify-between items-center">
                             <span className="text-[11px] font-black text-cyan-400 font-mono leading-none">{pkg.n}</span>
                             <span className="text-[9px] text-[var(--text-muted)] font-mono font-bold">v.{pkg.v} (STABLE)</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] leading-normal">{pkg.d}</p>
                       </div>
                     ))}
                  </div>
               </div>

               <p className="text-[9px] text-[var(--text-muted)] italic px-2 text-center pt-2">Усі активи та залежності верифіковані в межах безпечного релізу Steem Editor Pro.</p>
            </div>

            <section className="space-y-4 border-t border-[var(--border-color)] pt-6">
              <button 
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center gap-2 w-full text-left cursor-pointer"
              >
                <ChevronDown className={cn("text-[var(--text-muted)] transition-transform", showAdvancedSettings && "rotate-180")} size={20} />
                <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--text-main)]">
                  <Terminal size={20} className="text-cyan-400" /> {t('advanced')}
                </h3>
              </button>

              <AnimatePresence>
                {showAdvancedSettings && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 bg-[var(--bg-main)]/60 p-4 rounded-xl border border-[var(--border-color)] overflow-hidden"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">{t('appAgent')}</label>
                        {appAgent !== DEFAULT_APP_AGENT && (
                          <button
                            type="button"
                            onClick={() => {
                              setAppAgent(DEFAULT_APP_AGENT);
                              localStorage.setItem('steem_app_agent', DEFAULT_APP_AGENT);
                            }}
                            className="text-[9px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
                            title={DEFAULT_APP_AGENT}
                          >
                            <RotateCcw size={10} /> {DEFAULT_APP_AGENT}
                          </button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={appAgent}
                        onChange={e => {
                          setAppAgent(e.target.value);
                          localStorage.setItem('steem_app_agent', e.target.value);
                        }}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs text-[var(--text-main)] outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                        placeholder="ultrasteemeditor/4.8.0"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </section>
        )}

        {settingsTab === 'pwa' && (
          <section className="space-y-6">
            <div className="p-6 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-md shadow-cyan-500/20">S</div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-[var(--text-main)]">{t('pwaSupport')}</h3>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-[0.2em] pt-1">{t('pwaPlatformSupport')}</p>
              </div>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed text-left bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)]">
                {t('pwaInstallDesc')}
              </p>

              <div className="pt-2">
                {isPwaInstalled ? (
                  <div className="py-3 px-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 font-bold text-xs flex items-center justify-center gap-2">
                    <CheckCircle size={16} />
                    {t('pwaAlreadyInstalled')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleInstallPwa}
                      className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-95 cursor-pointer"
                    >
                      <Download size={16} />
                      {t('installApp')}
                    </button>
                    <button
                      onClick={() => setShowPwaInstructionsModal(true)}
                      className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-[var(--text-muted)] hover:text-cyan-400 bg-[var(--bg-card)] border border-[var(--border-color)] transition-colors cursor-pointer"
                    >
                      {t('pwaHowToInstall') || "Інструкція зі встановлення"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </BaseModal>
  );
};
