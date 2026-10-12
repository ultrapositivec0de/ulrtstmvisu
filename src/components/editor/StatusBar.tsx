import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEditorStore } from '../../store';
import { useDeviceStore } from '../../store/deviceStore';

export interface StatusBarProps {
  t: (key: any) => string;
  visualStyle?: string;
  isDarkMode?: boolean;
  isEditorFullScreen?: boolean;
  isFullScreen?: boolean;
}

export const ReadingTimeBadge: React.FC<{ splitWords?: number; t: (key: any) => string }> = ({ splitWords = 300, t }) => {
  const stats = useEditorStore(state => state.stats);
  return (
    <span className="flex items-center gap-1 text-cyan-500 font-bold uppercase tracking-widest text-[10px] shrink-0">
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

  // Show top stats bar whenever mobile layout is active (including portrait with keyboard open, landscape, and fullscreen)
  if (!isMobileLayout) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2 border-b text-[10px] font-medium uppercase tracking-widest shrink-0 transition-colors select-none",
      visualStyle === 'neon'
        ? "bg-slate-950 border-slate-800/80 text-slate-400"
        : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-600")
    )}>
      <div className="flex gap-x-4 gap-y-1 items-center flex-wrap">
        <span className="tabular-nums">{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400 tabular-nums">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span className="tabular-nums">{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
        {wpm > 0 && (
          <span 
            className="font-bold animate-pulse tabular-nums shrink-0"
            style={{ color: 'var(--accent-hex)' }}
          >
            WPM: {wpm}
          </span>
        )}
      </div>
    </div>
  );
};

export const DesktopStatsFooter: React.FC<StatusBarProps> = ({
  t,
  visualStyle,
  isDarkMode,
  isEditorFullScreen = false,
  isFullScreen = false,
}) => {
  const stats = useEditorStore(state => state.stats);
  const cleanStats = useEditorStore(state => state.cleanStats);
  const wpm = useEditorStore(state => state.wpm);
  const isMobileLayout = useDeviceStore(s => s.isMobileLayout);

  // In mobile layout, stats are always rendered at the top of EditorPane via MobileStatsBar
  if (isMobileLayout) {
    return null;
  }

  return (
    <footer 
      className={cn(
        "flex h-8 min-h-[2rem] border-t items-center px-4 justify-between text-[10px] font-medium uppercase tracking-widest shrink-0 select-none transition-colors",
        visualStyle === 'neon'
          ? "bg-slate-950 border-slate-800/80 text-slate-400"
          : (isDarkMode !== false ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-600"),
        (isEditorFullScreen || isFullScreen) && "fixed bottom-0 left-0 right-0 z-[260]"
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex gap-4 items-center overflow-hidden">
        <span className="shrink-0 tabular-nums">{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400 shrink-0 tabular-nums">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span className="shrink-0 tabular-nums">{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
        {wpm > 0 && (
          <span 
            className="font-bold animate-pulse flex items-center gap-1 shrink-0 tabular-nums"
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
