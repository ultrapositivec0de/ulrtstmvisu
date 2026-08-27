import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEditorStore } from '../../store';

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
  return (
    <div className={cn(
      "lg:hidden flex items-center justify-between px-4 py-2 border-b text-[10px] font-medium uppercase tracking-widest shrink-0 transition-colors",
      visualStyle === 'neon' ? "bg-slate-950 border-slate-800/80 text-slate-400" : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-600")
    )}>
      <div className="flex gap-4 items-center">
        <span>{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span>{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
      </div>
    </div>
  );
};

export const DesktopStatsFooter: React.FC<StatusBarProps> = ({ t }) => {
  const stats = useEditorStore(state => state.stats);
  const cleanStats = useEditorStore(state => state.cleanStats);
  return (
    <footer className="hidden lg:flex h-8 border-t border-slate-800 bg-slate-900 items-center px-4 justify-between text-[10px] font-medium text-slate-500 uppercase tracking-widest">
      <div className="flex gap-4 items-center">
        <span>{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span>{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>{t('autosaveActive')}</span>
      </div>
    </footer>
  );
};

export default DesktopStatsFooter;
