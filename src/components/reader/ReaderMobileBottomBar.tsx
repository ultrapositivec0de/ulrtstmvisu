import React from 'react';
import { Layout, Briefcase, Inbox, RefreshCw, Sliders, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDeviceStore } from '../../store/deviceStore';
import { type TranslationKey } from '../../locales';

export interface ReaderMobileBottomBarProps {
  viewMode: 'feed' | 'curation' | 'settings';
  onSelectViewMode: (mode: 'feed' | 'curation' | 'settings') => void;
  showInbox: boolean;
  onToggleInbox: () => void;
  inboxCount?: number;
  unreadCount?: number;
  onRefresh: () => void;
  isLoading?: boolean;
  onScrollToTop?: () => void;
  showQuickPanel?: boolean;
  onToggleQuickPanel?: () => void;
  t: (key: TranslationKey) => string;
}

export const ReaderMobileBottomBar: React.FC<ReaderMobileBottomBarProps> = ({
  viewMode,
  onSelectViewMode,
  showInbox,
  onToggleInbox,
  inboxCount = 0,
  unreadCount = 0,
  onRefresh,
  isLoading = false,
  onScrollToTop,
  showQuickPanel = false,
  onToggleQuickPanel,
  t,
}) => {
  const showMobileBottomBar = useDeviceStore((s) => s.showMobileBottomBar);
  const isMobileLayout = useDeviceStore((s) => s.isMobileLayout);
  const isKeyboardOpen = useDeviceStore((s) => s.isKeyboardOpen);

  if (!showMobileBottomBar || !isMobileLayout) {
    return null;
  }

  const handleFeedClick = () => {
    if (viewMode === 'feed') {
      onScrollToTop?.();
    } else {
      onSelectViewMode('feed');
    }
  };

  return (
    <nav
      className={cn(
        "fixed left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center px-1 z-[70] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-200",
        isKeyboardOpen
          ? "translate-y-full opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      )}
      style={{
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label={t('reader')}
    >
      {/* 1. Feed Tab */}
      <button
        type="button"
        onClick={handleFeedClick}
        className={cn(
          "flex flex-col items-center justify-center py-1 rounded-xl transition-all relative group",
          viewMode === 'feed'
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        )}
        title={t('readerNavFeed')}
      >
        <Layout size={20} className={cn("transition-transform", viewMode === 'feed' && "scale-110 text-cyan-400")} />
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">
          {t('readerNavFeed')}
        </span>
        {viewMode === 'feed' && (
          <span className="absolute bottom-0 w-6 h-0.5 bg-cyan-400 rounded-full" />
        )}
      </button>

      {/* 2. Curation Tab */}
      <button
        type="button"
        onClick={() => onSelectViewMode('curation')}
        className={cn(
          "flex flex-col items-center justify-center py-1 rounded-xl transition-all relative group",
          viewMode === 'curation'
            ? "text-purple-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        )}
        title={t('readerNavCuration')}
      >
        <Briefcase size={20} className={cn("transition-transform", viewMode === 'curation' && "scale-110 text-purple-400")} />
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">
          {t('readerNavCuration')}
        </span>
        {viewMode === 'curation' && (
          <span className="absolute bottom-0 w-6 h-0.5 bg-purple-400 rounded-full" />
        )}
      </button>

      {/* 3. Quick Controls Panel Toggle */}
      <button
        type="button"
        onClick={onToggleQuickPanel}
        className={cn(
          "flex flex-col items-center justify-center py-1 rounded-xl transition-all relative group",
          showQuickPanel
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        )}
        title={t('mobileQuickControls')}
      >
        <Sliders size={20} className={cn("transition-transform", showQuickPanel && "scale-110 text-cyan-400")} />
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">
          {t('mobileQuickControls')}
        </span>
        {showQuickPanel && (
          <span className="absolute bottom-0 w-6 h-0.5 bg-cyan-400 rounded-full" />
        )}
      </button>

      {/* 4. Inbox Toggle Button */}
      <button
        type="button"
        onClick={onToggleInbox}
        className={cn(
          "flex flex-col items-center justify-center py-1 rounded-xl transition-all relative group",
          showInbox
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        )}
        title={t('readerNavInbox')}
      >
        <div className="relative">
          <Inbox size={20} className={cn("transition-transform", showInbox && "scale-110 text-cyan-400")} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)] rounded-full animate-pulse" />
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">
          {t('readerNavInbox')}
        </span>
        {showInbox && (
          <span className="absolute bottom-0 w-6 h-0.5 bg-cyan-400 rounded-full" />
        )}
      </button>

      {/* 5. Settings Tab */}
      <button
        type="button"
        onClick={() => onSelectViewMode('settings')}
        className={cn(
          "flex flex-col items-center justify-center py-1 rounded-xl transition-all relative group",
          viewMode === 'settings'
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        )}
        title={t('readerNavSettings')}
      >
        <Settings size={20} className={cn("transition-transform", viewMode === 'settings' && "scale-110 text-cyan-400")} />
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">
          {t('readerNavSettings')}
        </span>
        {viewMode === 'settings' && (
          <span className="absolute bottom-0 w-6 h-0.5 bg-cyan-400 rounded-full" />
        )}
      </button>
    </nav>
  );
};
