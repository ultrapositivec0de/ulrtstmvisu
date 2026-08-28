import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  X,
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
  Type
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Template, ImageItem } from '../../types';
import { SecurityService } from '../../services/securityService';
import { APP_CHANGELOG, getChangelogText } from '../../data/changelog';

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

  if (!isOpen) return null;

  return (
<div key="modal-settings" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90"
            onClick={() => onClose()}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg bg-[var(--bg-sidebar)] border-[var(--border-color)] rounded-2xl shadow-none overflow-hidden container-theme"
          >
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-slate-800/10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
                <Settings className="text-cyan-400" /> {t('settings')}
              </h2>
              <button onClick={() => onClose()} className="text-slate-500 hover:text-white"><X /></button>
            </div>
              <div className="flex border-b border-[var(--border-color)] bg-slate-800/10 overflow-x-auto no-scrollbar shrink-0">
                {(['general', 'gallery', 'vault', 'keys', 'about', 'pwa'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSettingsTab(tab)}
                    className={cn(
                      "px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                      settingsTab === tab 
                        ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
                    )}
                  >
                    {t(tab)}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {settingsTab === 'general' && (
                  <section className="space-y-6">
                    {/* Performance Mode */}
                    <div className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-700/50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg"><Zap size={18} /></div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{t('performanceMode')}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{t('performanceDesc') || 'Вимикає деякі анімації'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setPerformanceMode(!performanceMode)}
                        className={cn(
                          "w-10 h-5 rounded-full transition-all relative",
                          performanceMode ? "bg-cyan-600" : "bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                          performanceMode ? "left-6" : "left-1"
                        )} />
                      </button>
                    </div>

                    {/* Visual Style Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('appearance') || 'Style'}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setVisualStyle('standard');
                            localStorage.setItem('steem_visual_style', 'standard');
                          }}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2",
                            visualStyle === 'standard' ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg" : "bg-slate-900 border-slate-800 text-slate-50"
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
                            "py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2",
                            visualStyle === 'neon' ? "bg-purple-900/40 border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "bg-slate-900 border-slate-800 text-slate-50"
                          )}
                        >
                          <Zap size={14} /> Cyber Neon
                        </button>
                      </div>
                    </div>

                    {/* Neon Editor Text Color Toggle (Active only when Cyber Neon is enabled) */}
                    {visualStyle === 'neon' && (
                      <div className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-700/50 rounded-2xl transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg"><Type size={18} /></div>
                          <div>
                            <p className="text-sm font-bold text-slate-200">
                              {t('coloredEditorText')}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide leading-normal mt-0.5">
                              {t('coloredEditorTextDesc')}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setNeonTextColored(!neonTextColored)}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative shrink-0",
                            neonTextColored ? "bg-cyan-600" : "bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                            neonTextColored ? "left-6" : "left-1"
                          )} />
                        </button>
                      </div>
                    )}

                    {/* Font Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('font')}</label>
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
                               "py-2 rounded-xl border text-xs transition-all",
                               editorFont === f.id ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg" : "bg-slate-900 border-slate-800 text-slate-500"
                             )}
                           >
                             <span className={f.class}>Aa</span>
                             <span className="ml-2">{f.label.split(' ')[0]}</span>
                           </button>
                         ))}
                      </div>
                    </div>

                    {/* Theme Colors */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('theme')}</label>
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
                              "text-[9px] p-2 rounded-xl border transition-all text-center flex flex-col items-center gap-1.5",
                              themeColor === theme.id ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-900/10" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                            )}
                          >
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.color }} />
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Editor Options */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      {/* Widget Mode Selector */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('widgetPos') || 'Режим плаваючого віджета'}</label>
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
                                "py-2 px-1 rounded-xl border text-[10px] font-bold uppercase transition-all text-center truncate",
                                widgetPos === pos.id 
                                  ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-900/10" 
                                  : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                              )}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          {t('syncScroll')}
                        </span>
                        <button 
                          onClick={() => {
                            const next = !syncScrollEnabled;
                            setSyncScrollEnabled(next);
                            localStorage.setItem('steem_sync_scroll', next.toString());
                          }}
                          className={cn(
                            "w-9 h-5 rounded-full transition-all relative",
                            syncScrollEnabled ? "bg-cyan-600" : "bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                            syncScrollEnabled ? "left-5" : "left-1"
                          )} />
                        </button>
                      </div>

                      {/* Custom Editor Font Size Control */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/40">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('fontSize')}
                          </label>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                            {editorFontSize} px
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
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
                                "py-1.5 px-1 rounded-lg text-[10px] font-semibold uppercase transition-all text-center truncate",
                                editorFontSize === preset.id 
                                  ? "bg-cyan-600 text-white shadow" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">12px</span>
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
                            className="flex-1 accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">32px</span>
                        </div>
                      </div>

                      {/* Custom Toolbar Icon Size Control */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/40">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('iconSize')}
                          </label>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                            {toolbarIconSize} px
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
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
                                "py-1.5 px-2 rounded-lg text-[10px] font-semibold uppercase transition-all text-center",
                                toolbarIconSize === preset.id 
                                  ? "bg-cyan-600 text-white shadow" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">12px</span>
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
                            className="flex-1 accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">32px</span>
                        </div>
                      </div>

                      {/* Custom Visual Editor Spacing Control */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/40">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('visualSpacing')}
                          </label>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                            {wysiwygSpacing} px
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
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
                                "py-1.5 px-1 rounded-lg text-[10px] font-semibold uppercase transition-all text-center truncate",
                                wysiwygSpacing === preset.id 
                                  ? "bg-cyan-600 text-white shadow" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">0px</span>
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
                            className="flex-1 accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">40px</span>
                        </div>
                      </div>
                    </div>

                    {/* CACHE CLEAR (Visible in all platforms: Tauri, Android, PWA, Web) */}
                    <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Trash2 size={18} /></div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {t('clearAppCache')}
                          </h3>
                          <p className="text-[10px] text-slate-400 max-w-[200px] sm:max-w-[300px] leading-tight">
                            {lang === 'uk'
                              ? 'Очищує кеш зображень, завантажені списки та тимчасові файли. Чернетки, шаблони та ключі НЕ видаляються.'
                              : 'Clear images, loaded lists & temporary files. Drafts, templates, and keys will NOT be deleted.'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={handleClearCache}
                        className="px-4 py-2 bg-rose-600/80 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-900/20 shrink-0"
                      >
                        {t('clearAction')}
                      </button>
                    </div>
                  </section>
                )}

                {settingsTab === 'gallery' && (
                  <section className="space-y-6">
                    <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('gallerySettings') || "Gallery"}</label>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <span className="text-[10px] font-bold text-slate-400 block">{t('imageFormat')}</span>
                           <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg">
                              <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-1 text-[9px] rounded", imageInsertFormat === 'html' ? "bg-cyan-600 text-white" : "text-slate-500")}>HTML</button>
                              <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-1 text-[9px] rounded", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white" : "text-slate-500")}>MD</button>
                           </div>
                         </div>

                         <div className="space-y-2">
                           <span className="text-[10px] font-bold text-slate-400 block">{t('trafficOptimization')}</span>
                           <button 
                             onClick={() => setIsTrafficOptimized(!isTrafficOptimized)}
                             className={cn(
                               "w-full py-1 text-[9px] rounded font-bold border transition-all",
                               isTrafficOptimized ? "border-cyan-500 text-cyan-400 bg-cyan-400/5" : "border-slate-800 text-slate-600"
                             )}
                           >
                             {isTrafficOptimized ? "ON" : "OFF"}
                           </button>
                         </div>
                      </div>

                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('pexelsAttribution')}</span>
                           <button 
                            onClick={() => setPexelsSettings((prev: any) => ({ ...prev, withAttribution: !prev.withAttribution }))}
                            className={cn("w-8 h-4 rounded-full relative transition-all", pexelsSettings.withAttribution ? "bg-cyan-600" : "bg-slate-700")}
                           >
                              <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", pexelsSettings.withAttribution ? "left-4.5" : "left-0.5")} />
                           </button>
                         </div>
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('pexelsLink')}</span>
                           <button 
                            onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))}
                            className={cn("w-8 h-4 rounded-full relative transition-all", pexelsSettings.linkEmbedded ? "bg-cyan-600" : "bg-slate-700")}
                           >
                              <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", pexelsSettings.linkEmbedded ? "left-4.5" : "left-0.5")} />
                           </button>
                         </div>
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'vault' && (
                  <section className="space-y-6">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400">
                           <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{t('vaultSecurity')}</h4>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">
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
                            "py-2 rounded-lg font-bold text-xs transition-all border",
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
                          className="py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg font-bold text-xs hover:bg-slate-700"
                        >
                           {t('confirmResetVault') || "Reset"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('accounts') || "Accounts"}</label>
                      <div className="space-y-2">
                        {vaultAccounts.filter(Boolean).map((acc, idx) => (
                          <div key={acc || `settings-vault-acc-${idx}`} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                            <span className="font-bold text-cyan-400">@{acc}</span>
                            <button 
                              onClick={async () => {
                                if (await confirmDialog(t('confirmDeleteAccount').replace('{acc}', acc))) {
                                   await SecurityService.deleteAccount(acc);
                                   initVault();
                                }
                              }}
                              className="p-1.5 text-slate-600 hover:text-red-500 transition-colors"
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
                       <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('pexelsKey')}</label>
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
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                              placeholder="Pexels API Key"
                            />
                          </div>
                          <p className="text-[9px] text-slate-600 leading-tight">
                            {isUnlocked ? "Stored securely in vault" : "Stored unencrypted in local storage"}
                          </p>
                       </div>

                       <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Pixabay</label>
                            <input 
                              type="password"
                              value={pixabayApiKey || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPixabayApiKey(val);
                                SecurityService.saveApiKey('pixabay', val);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Unsplash</label>
                            <input 
                              type="password"
                              value={unsplashAccessKey || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setUnsplashAccessKey(val);
                                SecurityService.saveApiKey('unsplashAccess', val);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                       </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'about' && (
                  <section className="space-y-6">
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
                       <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl mx-auto flex items-center justify-center text-cyan-400 font-black text-2xl shadow-xl shadow-cyan-500/10">S</div>
                       <div>
                         <h3 className="text-xl font-black tracking-tight">SteemEditor <span className="text-cyan-400">Pro</span></h3>
                         <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] pt-1">Version 4.7.5 "Quantum"</p>
                       </div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 pt-4 block border-t border-slate-800">Changelog & Updates</label>
                        <div className="mt-2 p-3 bg-slate-950 border border-cyan-500/20 rounded-xl text-left">
                          <p className="text-xs text-slate-300 font-medium">New in v4.7.5: WYSIWYG State Persistence Hardening, Flush on Pagehide / VisibilityChange & Responsive 300ms Debounce</p>
                        </div>
                       
                       <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-xl p-3">
                         {APP_CHANGELOG.map((log, index) => (
                           <div key={`${log.version}-${index}`} className={cn("space-y-1", index > 0 && "pt-2 border-t border-slate-800/50")}>
                             <div className="flex items-center gap-2">
                               <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", index === 0 ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 bg-slate-800")}>{log.version}</span>
                               <span className="text-[9px] text-slate-500">{log.date}</span>
                             </div>
                             <ul className={cn("text-xs list-inside list-disc pl-1 leading-snug", index === 0 ? "text-slate-300 space-y-1.5" : "text-slate-400 space-y-1")}>
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
                           className="text-[9px] font-bold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest px-2 py-1 bg-slate-800/50 rounded flex gap-1 items-center"
                         >
                           <Copy size={10} /> COPY LOG
                         </button>
                       </div>
                    </div>

                    <div className="space-y-4 pt-2 text-left">
                       <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Пакетний Аудит (NPM Packages)</label>
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
                               <div key={pkg.n} className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl flex flex-col gap-1 hover:border-slate-700/50 transition-all">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[11px] font-black text-cyan-400 font-mono leading-none">{pkg.n}</span>
                                     <span className="text-[9px] text-slate-500 font-mono font-bold">v.{pkg.v} (STABLE)</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-normal">{pkg.d}</p>
                               </div>
                             ))}
                          </div>
                       </div>

                       <p className="text-[9px] text-slate-600 italic px-2 text-center pt-2">Усі активи та залежності верифіковані в межах безпечного релізу Steem Editor Pro.</p>
                    </div>

                    <section className="space-y-4 border-t border-slate-800 pt-6">
                      <button 
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <ChevronDown className={cn("text-slate-500 transition-transform", showAdvancedSettings && "rotate-180")} size={20} />
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          <Terminal size={20} className="text-cyan-400" /> {t('advanced')}
                        </h3>
                      </button>

                      <AnimatePresence>
                        {showAdvancedSettings && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800 overflow-hidden"
                          >
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">{t('appAgent')}</label>
                              <input 
                                type="text" 
                                value={appAgent}
                                onChange={e => {
                                  setAppAgent(e.target.value);
                                  localStorage.setItem('steem_app_agent', e.target.value);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500"
                                placeholder="ultrasteemeditor/4.7.5"
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
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-cyan-500/20">S</div>
                      <div>
                        <h3 className="text-xl font-black tracking-tight">{t('pwaSupport')}</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] pt-1">{t('pwaPlatformSupport')}</p>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed text-left bg-slate-950 p-4 rounded-xl border border-slate-800/60">
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
                              className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-95 cursor-pointer"
                            >
                              <Download size={16} />
                              {t('installApp')}
                            </button>
                            <button
                              onClick={() => setShowPwaInstructionsModal(true)}
                              className="w-full py-2 px-3 rounded-lg font-bold text-[11px] text-slate-400 hover:text-cyan-400 bg-slate-950 border border-slate-800/80 transition-colors cursor-pointer"
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
          </motion.div>
        </div>
  );
};
