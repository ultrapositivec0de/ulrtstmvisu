import React from 'react';
import { 
  Palette, 
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
import { BaseModal } from './BaseModal';
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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={Palette}
      title="Settings Hub"
      subtitle="Personalize experience"
      modalKey="modal-quick-style"
      bodyClassName="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 max-h-[80vh]"
    >
      {/* Theme Color Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
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
                "h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer",
                themeColor === tItem.name 
                  ? "border-cyan-400 scale-105 shadow-md shadow-cyan-900/20 bg-cyan-500/10" 
                  : "border-[var(--border-color)] opacity-60 hover:opacity-100 bg-[var(--bg-main)]/50"
              )}
              title={tItem.name}
            >
              <div className="w-3.5 h-3.5 rounded-md shadow-xs" style={{ backgroundColor: tItem.hex }} />
            </button>
          ))}
        </div>
      </div>

      {/* Typography Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
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
                "px-2.5 py-1.5 rounded-xl border text-center transition-all flex items-center gap-1.5 cursor-pointer text-xs",
                editorFont === f.id 
                  ? "bg-cyan-600 border-cyan-500 text-white shadow-xs" 
                  : "bg-[var(--bg-main)]/60 border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-slate-500"
              )}
              style={{ fontFamily: f.family }}
            >
              <span className="font-bold text-sm">Aa</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{f.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Beautification Toggle */}
      <div className="flex items-center justify-between bg-[var(--bg-main)]/50 p-3.5 rounded-xl border border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
            <Eye size={18} />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] block">Beautification</span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Enhanced styling</span>
          </div>
        </div>
        <button 
          onClick={() => {
            const next = !beautifyEnabled;
            setBeautifyEnabled(next);
            localStorage.setItem('steem_beautify', next.toString());
          }}
          className={cn(
            "w-12 h-6 rounded-full transition-all duration-300 relative cursor-pointer border border-transparent",
            beautifyEnabled ? "bg-cyan-600 border-cyan-500" : "bg-[var(--bg-card)] border-[var(--border-color)]"
          )}
        >
          <div className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300",
            beautifyEnabled ? "left-7" : "left-1"
          )} />
        </button>
      </div>

      {/* Dark/Light & Neon Toggles */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button 
          onClick={() => {
            setIsDarkMode(!isDarkMode);
            localStorage.setItem('steem_dark_mode', (!isDarkMode).toString());
            setVisualStyle('standard');
            localStorage.setItem('steem_visual_style', 'standard');
          }}
          className="py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all bg-[var(--bg-main)]/70 hover:bg-[var(--border-color)] text-[var(--text-main)] border border-[var(--border-color)] cursor-pointer"
        >
          {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-400" />} 
          {isDarkMode ? "Light" : "Dark"}
        </button>
        <button 
          onClick={() => {
            const next = visualStyle === 'neon' ? 'standard' : 'neon';
            setVisualStyle(next);
            localStorage.setItem('steem_visual_style', next);
          }}
          className={cn(
            "py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all border cursor-pointer",
            visualStyle === 'neon' 
              ? "bg-purple-600/20 text-purple-400 border-purple-500/50 shadow-sm" 
              : "bg-[var(--bg-main)]/70 hover:bg-[var(--border-color)] text-[var(--text-main)] border-[var(--border-color)]"
          )}
        >
          <Zap size={17} className={visualStyle === 'neon' ? "text-purple-400" : "text-[var(--text-muted)]"} /> Neon
        </button>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col gap-2.5 border-t border-[var(--border-color)]">
        {!isPwaInstalled && !isTauriEnv() && !isNeutralinoEnv() && (
          <button 
            onClick={() => {
              onClose();
              handleInstallPwa();
            }}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2.5 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
          >
            <Download size={16} /> {t('installApp') || "Встановити додаток (PWA)"}
          </button>
        )}
        <button 
          onClick={() => {
            onClose();
            setSettingsTab('general');
            setActiveModal('settings');
          }}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2.5 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
        >
          <Settings size={16} /> {t('advancedSettings')}
        </button>
        <a 
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
        >
          <Maximize2 size={16} /> {t('fullPreviewTesting')}
        </a>
        <button 
          onClick={() => {
            onClose();
            setActiveModal('about');
          }}
          className="w-full py-3 bg-[var(--bg-main)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-xl text-xs sm:text-sm font-bold text-[var(--text-main)] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
        >
          <Info size={16} /> {t('about')}
        </button>
      </div>
    </BaseModal>
  );
};
