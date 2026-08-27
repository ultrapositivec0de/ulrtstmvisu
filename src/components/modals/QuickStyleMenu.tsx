import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  X, 
  Edit3, 
  Eye, 
  Sun, 
  Moon, 
  Zap, 
  Download, 
  Settings, 
  Maximize2, 
  Info 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ColorTheme {
  name: string;
  hex: string;
  rgb: string;
  [key: string]: any;
}

interface FontOption {
  id: string;
  label: string;
  family: string;
}

interface QuickStyleMenuProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
  setThemeColor: (val: string) => void;
  themes: ColorTheme[];
  editorFont: string;
  setEditorFont: (val: string) => void;
  fontOptions: FontOption[];
  beautifyEnabled: boolean;
  setBeautifyEnabled: (val: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  visualStyle: 'standard' | 'neon';
  setVisualStyle: React.Dispatch<React.SetStateAction<'standard' | 'neon'>>;
  isPwaInstalled: boolean;
  isTauriEnv: () => boolean;
  isNeutralinoEnv: () => boolean;
  handleInstallPwa: () => void;
  setSettingsTab: (tab: any) => void;
  setActiveModal: (modal: any) => void;
  t: (key: any) => string;
}

export const QuickStyleMenu: React.FC<QuickStyleMenuProps> = ({
  isOpen,
  onClose,
  themeColor,
  setThemeColor,
  themes,
  editorFont,
  setEditorFont,
  fontOptions,
  beautifyEnabled,
  setBeautifyEnabled,
  isDarkMode,
  setIsDarkMode,
  visualStyle,
  setVisualStyle,
  isPwaInstalled,
  isTauriEnv,
  isNeutralinoEnv,
  handleInstallPwa,
  setSettingsTab,
  setActiveModal,
  t
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-slate-900 border border-white/5 rounded-[2rem] shadow-none max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
              <div className="absolute top-0 right-0 p-4 z-10">
                <button onClick={onClose} className="text-slate-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-none">
                  <span className={cn("logo-s", visualStyle === 'neon' && "neon-icon-glow")}>S</span>
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white leading-none">Settings <span className="text-cyan-400">Hub</span></h2>
                  <p className="text-slate-500 text-[10px] font-medium mt-1 uppercase tracking-widest">Personalize experience</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Theme Assortment */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Palette size={14} className="text-cyan-400" /> Theme Color
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {themes.map(tItem => (
                      <button
                        key={tItem.name}
                        onClick={() => {
                          setThemeColor(tItem.name);
                          localStorage.setItem('steem_theme_color', tItem.name);
                        }}
                        className={cn(
                          "h-8 rounded-xl border flex items-center justify-center transition-all",
                          themeColor === tItem.name ? "border-[rgb(var(--accent-color))] scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className="w-3 h-3 rounded-md" style={{ backgroundColor: tItem.hex }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Configuration */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Edit3 size={14} className="text-cyan-400" /> Typography
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {fontOptions.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setEditorFont(f.id);
                          localStorage.setItem('steem_editor_font', f.id);
                        }}
                        className={cn(
                          "px-2 py-1 rounded-lg border text-center transition-all flex items-center gap-1.5",
                          editorFont === f.id ? "bg-[rgb(var(--accent-color)/0.1)] border-[rgb(var(--accent-color)/0.5)] text-[rgb(var(--accent-color))]" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/[0.08]"
                        )}
                        style={{ fontFamily: f.family }}
                      >
                        <span className="text-sm font-bold">Aa</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">{f.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Beautification */}
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                      <Eye size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-200 block">Beautification</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Enhanced styling</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const next = !beautifyEnabled;
                      setBeautifyEnabled(next);
                      localStorage.setItem('steem_beautify', next.toString());
                    }}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all duration-500 relative",
                      beautifyEnabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white shadow-xl transition-all duration-500",
                      beautifyEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <button 
                    onClick={() => {
                      setIsDarkMode(!isDarkMode);
                      localStorage.setItem('steem_dark_mode', (!isDarkMode).toString());
                      setVisualStyle('standard');
                      localStorage.setItem('steem_visual_style', 'standard');
                    }}
                    className={cn(
                      "py-4 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all",
                      visualStyle === 'standard' ? "bg-white/10 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-indigo-400" />} 
                    {isDarkMode ? "Light" : "Dark"}
                  </button>
                  <button 
                    onClick={() => {
                      const next = visualStyle === 'neon' ? 'standard' : 'neon';
                      setVisualStyle(next);
                      localStorage.setItem('steem_visual_style', next);
                    }}
                    className={cn(
                      "py-4 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all",
                      visualStyle === 'neon' ? "bg-purple-600/20 text-purple-400 border border-purple-500/50" : "bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    <Zap size={18} className={visualStyle === 'neon' ? "text-purple-400" : "text-slate-500"} /> Neon
                  </button>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  {!isPwaInstalled && !isTauriEnv() && !isNeutralinoEnv() && (
                    <button 
                      onClick={() => {
                        onClose();
                        handleInstallPwa();
                      }}
                      className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-3xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl shadow-cyan-600/20 text-center cursor-pointer"
                    >
                      <Download size={18} /> {t('installApp') || "Встановити додаток (PWA)"}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      onClose();
                      setSettingsTab('general');
                      setActiveModal('settings');
                    }}
                    className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-3xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl shadow-cyan-600/20 text-center"
                  >
                    <Settings size={18} /> {t('advancedSettings')}
                  </button>
                  <a 
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-3xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-600/20 text-center"
                  >
                    <Maximize2 size={18} /> {t('fullPreviewTesting')}
                  </a>
                  <button 
                    onClick={() => {
                      onClose();
                      setActiveModal('about');
                    }}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-3xl text-sm font-black text-slate-300 flex items-center justify-center gap-3 transition-all"
                  >
                    <Info size={18} /> {t('about')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
