import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEditorStore } from '../../store';
import { useDeviceStore } from '../../store/deviceStore';

export interface StatusBarProps {
  t: (key: any) => string;
  visualStyle?: string;
  isDarkMode?: boolean;
}

export const ReadingTimeBadge: React.FC<{ splitWords?: number; t: (key: any) => string }> = ({ splitWords = 300, t }) => {
  const stats = useEditorStore(state => state.stats);
  return (
    <span className="flex items-center gap-1 text-cyan-500 font-bold uppercase tracking-widest text-[10px]">
      <Clock size={10} className="inline" />
      {Math.ceil((stats?.words || 0) / (splitWords || 300))} {t('minRead')}
    </span>
  );
};

export const MobileStatsBar: React.FC<StatusBarProps> = ({ visualStyle, isDarkMode, t }) => {
  const stats = useEditorStore(state => state.stats);
  const cleanStats = useEditorStore(state => state.cleanStats);
  const wpm = useEditorStore(state => state.wpm);
  const isMobileLayout = useDeviceStore(s => s.isMobileLayout);
  const showMobileBottomBar = useDeviceStore(s => s.showMobileBottomBar);

  // Show top stats bar only when bottom bar is active in portrait mobile mode
  if (!showMobileBottomBar || !isMobileLayout) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2 border-b text-[10px] font-medium uppercase tracking-widest shrink-0 transition-colors",
      visualStyle === 'neon' ? "bg-slate-950 border-slate-800/80 text-slate-400" : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-600")
    )}>
      <div className="flex gap-4 items-center flex-wrap">
        <span>{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span>{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
        {wpm > 0 && (
          <span 
            className="font-bold animate-pulse"
            style={{ color: 'var(--accent-hex)' }}
          >
            WPM: {wpm}
          </span>
        )}
      </div>
    </div>
  );
};

export const DesktopStatsFooter: React.FC<StatusBarProps> = ({ t }) => {
  const stats = useEditorStore(state => state.stats);
  const cleanStats = useEditorStore(state => state.cleanStats);
  const wpm = useEditorStore(state => state.wpm);
  const showMobileBottomBar = useDeviceStore(s => s.showMobileBottomBar);

  // When MobileBottomBar is visible in mobile portrait, footer is hidden
  if (showMobileBottomBar) {
    return null;
  }

  return (
    <footer 
      className="flex min-h-[2rem] border-t border-slate-800 bg-slate-900 items-center px-4 justify-between text-[10px] font-medium text-slate-500 uppercase tracking-widest shrink-0"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex gap-4 items-center overflow-hidden flex-wrap">
        <span>{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span>{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
        {wpm > 0 && (
          <span 
            className="font-bold animate-pulse flex items-center gap-1 shrink-0"
            style={{ color: 'var(--accent-hex)' }}
          >
            <span 
              className="w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: 'var(--accent-hex)' }}
            />
            WPM: {wpm}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>{t('autosaveActive')}</span>
      </div>
    </footer>
  );
};

export default DesktopStatsFooter;
