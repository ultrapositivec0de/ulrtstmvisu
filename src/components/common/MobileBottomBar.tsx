import React from 'react';
import { Edit3, Eye, Rocket, Image as ImageIcon, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEditorStore } from '../../store';

export interface MobileBottomBarProps {
  isEditorFullScreen: boolean;
  isFullScreen: boolean;
  isKeyboardOpen: boolean;
  activeMobileTab: 'editor' | 'preview';
  setActiveMobileTab: (tab: 'editor' | 'preview') => void;
  visualStyle: string;
  pubTitle: string;
  setPubTitle: (title: string) => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setSettingsTab: (tab: any) => void;
  t: (key: any) => string;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  isEditorFullScreen,
  isFullScreen,
  isKeyboardOpen,
  activeMobileTab,
  setActiveMobileTab,
  visualStyle,
  pubTitle,
  setPubTitle,
  activeModal,
  setActiveModal,
  isSidebarOpen,
  setIsSidebarOpen,
  setSettingsTab,
  t,
}) => {
  return (
    <nav 
      className={cn(
        "lg:hidden fixed left-0 right-0 bg-slate-900 border-t border-slate-800 grid grid-cols-5 items-center px-1 z-[70] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-200",
        (isEditorFullScreen || isFullScreen || isKeyboardOpen) ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      )}
      style={{
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(4rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <button 
        onClick={() => setActiveMobileTab('editor')}
        className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", activeMobileTab === 'editor' ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
      >
        <Edit3 size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
        <span className="text-[9px] font-bold uppercase tracking-tighter">{t('text')}</span>
      </button>
      <button 
        onClick={() => setActiveMobileTab('preview')}
        className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", activeMobileTab === 'preview' ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
      >
        <Eye size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
        <span className="text-[9px] font-bold uppercase tracking-tighter">{t('preview')}</span>
      </button>
      
      <div className="relative flex justify-center items-center">
        <button 
          onClick={() => {
            if (!pubTitle) {
              const firstLine = useEditorStore.getState().content.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 100);
              setPubTitle(firstLine);
            }
            setActiveModal('publish');
          }}
          className="w-14 h-14 bg-cyan-600 text-white rounded-full shadow-lg shadow-cyan-900/40 active:scale-95 transition-all flex items-center justify-center border-4 border-slate-900 -mt-10 hover:bg-cyan-500"
        >
          <Rocket size={24} />
        </button>
      </div>

      <button 
        onClick={() => {
          setActiveMobileTab('editor');
          setIsSidebarOpen(!isSidebarOpen);
        }}
        className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", isSidebarOpen ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
      >
        <ImageIcon size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
        <span className="text-[9px] font-bold uppercase tracking-tighter">{t('gallery')}</span>
      </button>
      <button 
        onClick={() => {
          setSettingsTab('general');
          setActiveModal('settings');
        }}
        className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", activeModal === 'settings' ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
      >
        <Settings size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
        <span className="text-[9px] font-bold uppercase tracking-tighter">{t('settings')}</span>
      </button>
    </nav>
  );
};
