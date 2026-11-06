import React from 'react';
import {
  Sliders,
  X,
  Search,
  BellRing,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ReaderConfig, SteemPost, AuthType } from '../../types';
import { TranslationKey } from '../../locales';
import { AccountSelector } from '../common/AccountSelector';

export interface ReaderQuickPanelProps {
  showQuickPanel: boolean;
  setShowQuickPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  viewMode: 'feed' | 'curation' | 'settings' | string;
  searchTag: string;
  setSearchTag: (tag: string) => void;
  curationTagInput: string;
  setCurationTagInput: (tag: string) => void;
  handleSearch: () => void;
  fetchCurationFeed: (tag?: string) => void;
  config: ReaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  handleDecreaseFontSize: () => void;
  handleIncreaseFontSize: () => void;
  currentFontSize: number;
  fetchPosts: (customTag?: string) => void;
  loading: boolean;
  isCurationLoading: boolean;
  posts: SteemPost[];
  curationPosts: SteemPost[];
  expandedPosts: Set<string>;
  setExpandedPosts: React.Dispatch<React.SetStateAction<Set<string>>>;
  authType?: AuthType | 'VAULT';
  currentUser?: string | null;
  keychainAccounts?: string[];
  vaultAccounts?: string[];
  onSelectAccount?: (user: string, type: 'KEYCHAIN' | 'VAULT') => void;
  onAddKeychainAccount?: (user: string) => void;
  onOpenVaultManager?: () => void;
  selectedVaultUser?: string;
  t: (key: any) => string;
}

export const ReaderQuickPanel: React.FC<ReaderQuickPanelProps> = React.memo(({
  showQuickPanel,
  setShowQuickPanel,
  viewMode,
  searchTag,
  setSearchTag,
  curationTagInput,
  setCurationTagInput,
  handleSearch,
  fetchCurationFeed,
  config,
  setConfig,
  handleDecreaseFontSize,
  handleIncreaseFontSize,
  currentFontSize,
  fetchPosts,
  loading,
  isCurationLoading,
  posts,
  curationPosts,
  expandedPosts,
  setExpandedPosts,
  authType,
  currentUser,
  keychainAccounts = [],
  vaultAccounts = [],
  onSelectAccount,
  onAddKeychainAccount,
  onOpenVaultManager,
  selectedVaultUser,
  t,
}) => {
  return (
    <AnimatePresence>
      {showQuickPanel && (
        <motion.div
          key="reader-mobile-quick-panel"
          initial={{ opacity: 1, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 1, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 220 }}
          className="fixed left-0 right-0 z-[65] bg-slate-900 border-t border-slate-800 p-4 flex flex-col gap-3 pointer-events-auto"
          style={{
            bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
            maxHeight: 'calc(100dvh - 5rem - env(safe-area-inset-top, 0px))',
          }}
        >
          {/* Header & Close */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-cyan-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {t('mobileQuickControls')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickPanel(false)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Account & Signing Mode Selector */}
          {onSelectAccount && (
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('selectAccount')}
              </span>
              <AccountSelector
                authType={authType || 'KEYCHAIN'}
                currentUsername={currentUser || ''}
                selectedVaultUser={selectedVaultUser || ''}
                keychainAccounts={keychainAccounts}
                vaultAccounts={vaultAccounts}
                onSelectAccount={onSelectAccount}
                onAddKeychainAccount={onAddKeychainAccount}
                onOpenVaultManager={onOpenVaultManager}
                t={t}
              />
            </div>
          )}

          {/* Tag Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('searchTag')}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={15}
                />
                <input
                  type="text"
                  value={viewMode === 'curation' ? curationTagInput || '' : searchTag || ''}
                  onChange={(e) => {
                    if (viewMode === 'curation') {
                      setCurationTagInput(e.target.value);
                    } else {
                      setSearchTag(e.target.value);
                    }
                  }}
                  placeholder={t('tagSearchPlaceholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (viewMode === 'curation') {
                        fetchCurationFeed(curationTagInput.trim());
                      } else {
                        handleSearch();
                      }
                      setShowQuickPanel(false);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (viewMode === 'curation') {
                    fetchCurationFeed(curationTagInput.trim());
                  } else {
                    handleSearch();
                  }
                  setShowQuickPanel(false);
                }}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
              >
                {t('search')}
              </button>
            </div>

            {/* Quick Favorite Tag Chips for Mobile */}
            {viewMode === 'feed' && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {(config.favoriteTags || []).map((tag) => {
                  const cleanTag = tag.replace(/^#/, '');
                  const isActive = (searchTag || '').trim().toLowerCase() === cleanTag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSearchTag(cleanTag);
                        fetchPosts(cleanTag);
                        setShowQuickPanel(false);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 border cursor-pointer",
                        isActive
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                      )}
                    >
                      #{cleanTag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Auto-Inbox & Font Size Controls */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setConfig((c) => ({ ...c, autoShowInbox: !c.autoShowInbox }))}
              className={cn(
                'flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs font-bold cursor-pointer',
                config.autoShowInbox
                  ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:bg-slate-800',
              )}
            >
              <div className="flex items-center gap-1.5">
                <BellRing
                  size={15}
                  className={config.autoShowInbox ? 'text-cyan-400' : 'opacity-60'}
                />
                <span className="truncate">{t('autoInboxActive')}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 font-mono shrink-0">
                {config.autoShowInbox ? t('on') : t('off')}
              </span>
            </button>

            <div className="flex items-center justify-between p-1.5 bg-slate-950/80 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={handleDecreaseFontSize}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={t('headerFontDecreaseTitle')}
              >
                <span className="font-bold text-xs">A-</span>
              </button>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {currentFontSize}px
              </span>
              <button
                type="button"
                onClick={handleIncreaseFontSize}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={t('headerFontIncreaseTitle')}
              >
                <span className="font-bold text-xs">A+</span>
              </button>
            </div>
          </div>

          {/* Quick Actions (Refresh & Expand/Collapse) */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'feed') {
                  fetchPosts();
                } else if (viewMode === 'curation') {
                  fetchCurationFeed();
                }
                setShowQuickPanel(false);
              }}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw
                size={14}
                className={cn((loading || isCurationLoading) && 'animate-spin text-cyan-400')}
              />
              <span>{t('refresh')}</span>
            </button>

            {(viewMode === 'feed' || viewMode === 'curation') && (
              <button
                type="button"
                onClick={() => {
                  const postList = viewMode === 'feed' ? posts : curationPosts;
                  if (expandedPosts.size > 0) {
                    setExpandedPosts(new Set());
                  } else {
                    setExpandedPosts(new Set(postList.map((p) => p.permlink)));
                  }
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {expandedPosts.size > 0 ? t('collapseAll') : t('expandAll')}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
