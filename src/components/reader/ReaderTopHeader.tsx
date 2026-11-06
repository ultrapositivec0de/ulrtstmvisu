import React, { useState } from 'react';
import { 
  Search, 
  UserCheck, 
  LogOut, 
  ThumbsUp, 
  Layout, 
  Briefcase, 
  Settings, 
  ChevronUp, 
  ChevronDown, 
  RefreshCw, 
  Hash, 
  BellRing, 
  Inbox,
  Plus,
  X,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { SteemPost, ReaderConfig, AuthType } from '../../types';
import { AccountSelector } from '../common/AccountSelector';

export interface ReaderTopHeaderProps {
  isReaderHeaderOpen: boolean;
  setIsReaderHeaderOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  searchTag: string;
  setSearchTag: (tag: string) => void;
  handleSearch: () => void;
  currentUser?: string | null;
  onUserUpdate?: (user: string) => void;
  authType?: AuthType | 'VAULT';
  keychainAccounts?: string[];
  vaultAccounts?: string[];
  onSelectAccount?: (user: string, type: 'KEYCHAIN' | 'VAULT') => void;
  onAddKeychainAccount?: (user: string) => void;
  onOpenVaultManager?: () => void;
  selectedVaultUser?: string;
  currentFontSize: number;
  handleDecreaseFontSize: () => void;
  handleIncreaseFontSize: () => void;
  voteWeight: number;
  setVoteWeight: (w: number) => void;
  viewMode: 'feed' | 'curation' | 'settings';
  setViewMode: (mode: 'feed' | 'curation' | 'settings') => void;
  posts: SteemPost[];
  curationPosts: any[];
  setExpandedPosts: (posts: Set<string>) => void;
  fetchPosts: (customTag?: string) => void;
  loading: boolean;
  curationTagInput: string;
  setCurationTagInput: (val: string) => void;
  fetchCurationFeed: (tag: string) => void;
  isCurationLoading: boolean;
  autoShowInbox?: boolean;
  toggleAutoShowInbox: () => void;
  showInbox: boolean;
  setShowInbox: (show: boolean | ((prev: boolean) => boolean)) => void;
  hasUnreadInbox: boolean;
  showMobileBottomBar?: boolean;
  isMobileLayout?: boolean;
  config?: ReaderConfig;
  setConfig?: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  t: (key: any) => string;
}

export const ReaderTopHeader: React.FC<ReaderTopHeaderProps> = React.memo(({
  isReaderHeaderOpen,
  setIsReaderHeaderOpen,
  searchTag,
  setSearchTag,
  handleSearch,
  currentUser,
  onUserUpdate,
  authType,
  keychainAccounts = [],
  vaultAccounts = [],
  onSelectAccount,
  onAddKeychainAccount,
  onOpenVaultManager,
  selectedVaultUser,
  currentFontSize,
  handleDecreaseFontSize,
  handleIncreaseFontSize,
  voteWeight,
  setVoteWeight,
  viewMode,
  setViewMode,
  posts,
  curationPosts,
  setExpandedPosts,
  fetchPosts,
  loading,
  curationTagInput,
  setCurationTagInput,
  fetchCurationFeed,
  isCurationLoading,
  autoShowInbox,
  toggleAutoShowInbox,
  showInbox,
  setShowInbox,
  hasUnreadInbox,
  showMobileBottomBar,
  isMobileLayout,
  config,
  setConfig,
  t,
}) => {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditingTags, setIsEditingTags] = useState(false);

  const handleAddNewTag = () => {
    const clean = newTagInput.trim().replace(/^[#@]+/, '').toLowerCase();
    if (clean && config && setConfig) {
      if (!config.favoriteTags?.includes(clean)) {
        setConfig((c) => ({
          ...c,
          favoriteTags: [...(c.favoriteTags || []), clean],
        }));
      }
      setSearchTag(clean);
      fetchPosts(clean);
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveFavoriteTag = (tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (config && setConfig) {
      setConfig((c) => ({
        ...c,
        favoriteTags: (c.favoriteTags || []).filter((t) => t !== tagToRemove),
      }));
    }
  };

  return (
    <div className={cn("border-b border-[var(--border-color)] bg-[var(--bg-card)]", (showMobileBottomBar || isMobileLayout) && "hidden")}>
      <AnimatePresence initial={false}>
        {isReaderHeaderOpen && (
          <motion.div
            key="reader-header-collapsible"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="relative flex-1 max-w-xs sm:max-w-sm shrink-0">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    size={16}
                  />
                  <input
                    type="text"
                    value={searchTag || ""}
                    onChange={(e) => setSearchTag(e.target.value)}
                    placeholder={t("tagSearchPlaceholder")}
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl py-1.5 pl-9 pr-8 text-xs text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-500/60"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  {searchTag && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTag("");
                        fetchPosts("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      title={t("clear")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Quick Favorite Tag Chips */}
                {config && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
                    {(config.favoriteTags || []).map((tag) => {
                      const cleanTag = tag.replace(/^#/, '');
                      const isActive = (searchTag || '').trim().toLowerCase() === cleanTag.toLowerCase();
                      return (
                        <div
                          key={tag}
                          className={cn(
                            "flex items-center rounded-full text-[11px] font-medium transition-all shrink-0 border",
                            isActive
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-950/40"
                              : "bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-600"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTag(cleanTag);
                              fetchPosts(cleanTag);
                            }}
                            className="px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                          >
                            <span className="opacity-50 text-[10px]">#</span>
                            <span>{cleanTag}</span>
                          </button>
                          {isEditingTags && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveFavoriteTag(tag, e)}
                              className="pr-2 text-slate-500 hover:text-red-400 cursor-pointer"
                              title={t("delete")}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {isAddingTag ? (
                      <div className="flex items-center gap-1 bg-slate-800 border border-cyan-500/50 rounded-full px-2 py-0.5 shrink-0">
                        <span className="text-slate-500 text-[10px]">#</span>
                        <input
                          autoFocus
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddNewTag();
                            if (e.key === 'Escape') setIsAddingTag(false);
                          }}
                          onBlur={handleAddNewTag}
                          placeholder={t("tagSearchPlaceholder")}
                          className="bg-transparent text-[11px] text-cyan-300 outline-none w-20"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(true)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-slate-400 hover:text-cyan-400 bg-slate-800/50 hover:bg-slate-800 border border-dashed border-slate-700/80 hover:border-cyan-500/40 transition-colors cursor-pointer"
                          title={t("addTag")}
                        >
                          <Plus size={12} />
                          <span>{t("addTag")}</span>
                        </button>
                        {(config.favoriteTags || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsEditingTags(!isEditingTags)}
                            className={cn(
                              "p-1 rounded-full text-slate-500 hover:text-slate-300 border border-transparent transition-colors cursor-pointer",
                              isEditingTags && "text-cyan-400 bg-cyan-950/40 border-cyan-800/40"
                            )}
                            title={t("editTags")}
                          >
                            <Settings size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {onSelectAccount ? (
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
                ) : onUserUpdate ? (
                  <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden h-[34px]">
                    {currentUser ? (
                      <>
                        <div className="px-2 text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                          <UserCheck size={16} />
                          <span className="truncate max-w-[80px]">
                            {currentUser}
                          </span>
                        </div>
                        <button
                          onClick={() => onUserUpdate("")}
                          className="p-2 hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors border-l border-slate-700"
                          title={t("changeAccount")}
                        >
                          <LogOut size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="px-2 text-[10px] text-slate-500 font-bold uppercase">
                          Guest
                        </div>
                        <input
                          type="text"
                          placeholder={t("usernamePlaceholder")}
                          className="bg-transparent border-none outline-none px-2 text-xs w-24 text-cyan-400 placeholder:text-slate-600"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              onUserUpdate(
                                (e.target as HTMLInputElement).value,
                              );
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value) onUserUpdate(e.target.value);
                          }}
                        />
                      </>
                    )}
                  </div>
                ) : null}

                <div className="flex items-center gap-1.5 p-1 bg-slate-800 rounded-lg border border-slate-700">
                  <button
                    onClick={handleDecreaseFontSize}
                    className="p-1 px-2 hover:bg-slate-700 rounded transition-colors text-xs font-bold"
                  >
                    A-
                  </button>
                  <div className="w-10 text-center text-[10px] font-mono text-slate-500 border-x border-slate-700">
                    {currentFontSize}px
                  </div>
                  <button
                    onClick={handleIncreaseFontSize}
                    className="p-1 px-2 hover:bg-slate-700 rounded transition-colors text-xs font-bold"
                  >
                    A+
                  </button>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 h-[34px]">
                  <ThumbsUp size={18} className="text-cyan-400" />
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={voteWeight}
                    onChange={(e) => setVoteWeight(parseInt(e.target.value))}
                    className="w-16 h-1 accent-cyan-500"
                  />
                  <span className="text-[10px] font-mono text-cyan-400 w-6">
                    {(voteWeight / 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-2 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto custom-scrollbar scroll-smooth bg-slate-900/90 border-t border-slate-800/80 shadow-inner">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setViewMode("feed")}
            className={cn(
              "px-2.5 sm:px-4 py-1.5 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 sm:gap-2 border shrink-0",
              viewMode === "feed"
                ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/15 shadow-sm shadow-cyan-950/50"
                : "border-slate-800 bg-slate-800/40 text-slate-300 hover:text-white hover:bg-slate-800",
            )}
          >
            <Layout size={17} className={cn(viewMode === "feed" ? "text-cyan-400" : "text-slate-400")} />
            <span className="text-[11px] sm:text-xs">{t("feed")}</span>
          </button>
          <button
            onClick={() => {
              setViewMode("curation");
            }}
            className={cn(
              "px-2.5 sm:px-4 py-1.5 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 sm:gap-2 border shrink-0",
              viewMode === "curation"
                ? "border-purple-500/60 text-purple-300 bg-purple-500/15 shadow-sm shadow-purple-950/50"
                : "border-slate-800 bg-slate-800/40 text-slate-300 hover:text-white hover:bg-slate-800",
            )}
          >
            <Briefcase size={17} className={cn(viewMode === "curation" ? "text-purple-400" : "text-slate-400")} />
            <span className="hidden lg:inline">{t("curationDashboard")}</span>
            <span className="inline lg:hidden text-[11px] sm:text-xs">{t("curation")}</span>
          </button>
          <button
            onClick={() => {
              setViewMode("settings");
            }}
            className={cn(
              "px-2.5 sm:px-4 py-1.5 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 sm:gap-2 border shrink-0",
              viewMode === "settings"
                ? "border-cyan-400/50 text-white bg-slate-700/70 shadow-sm"
                : "border-slate-800 bg-slate-800/40 text-slate-300 hover:text-white hover:bg-slate-800",
            )}
          >
            <Settings size={17} className={cn(viewMode === "settings" ? "text-cyan-400" : "text-slate-400")} />
            <span className="text-[11px] sm:text-xs">{t("settings")}</span>
          </button>

          <button
            onClick={() => setIsReaderHeaderOpen(!isReaderHeaderOpen)}
            className={cn(
              "ml-0.5 px-2 h-8 flex items-center justify-center rounded-xl border transition-colors shrink-0",
              isReaderHeaderOpen
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                : "bg-slate-800/60 border-slate-700/70 text-slate-300 hover:text-white hover:bg-slate-800"
            )}
            title={isReaderHeaderOpen ? t("collapseHeader") : t("expandHeader")}
          >
            {isReaderHeaderOpen ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto pl-2 border-l border-slate-800/80">
          {(viewMode === "feed" || viewMode === "curation") && (
            <div className="flex items-center gap-0.5 bg-slate-800/80 rounded-xl border border-slate-700/80 p-0.5 shrink-0">
              <button
                onClick={() => {
                   const postList = viewMode === "feed" ? posts : curationPosts;
                   setExpandedPosts(new Set(postList.map((p) => p.permlink)));
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                title={t("expandAll")}
              >
                <ChevronDown size={16} className="text-cyan-400" />
                <span className="hidden md:inline">Expand All</span>
              </button>
              <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
              <button
                onClick={() => setExpandedPosts(new Set())}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                title={t("collapseAll")}
              >
                <ChevronUp size={16} className="text-slate-400" />
                <span className="hidden md:inline">Collapse All</span>
              </button>
            </div>
          )}
          
          {viewMode === "feed" && (
            <>
              <button
                onClick={() => fetchPosts()}
                disabled={loading}
                className="p-1.5 bg-slate-800/60 border border-slate-700/70 text-slate-300 hover:bg-slate-800 rounded-xl hover:text-white transition-colors shrink-0"
              >
                <RefreshCw
                  size={18}
                  className={cn(loading && "animate-spin text-cyan-400")}
                />
              </button>
            </>
          )}
          {viewMode === "curation" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1 bg-slate-800 rounded-xl px-2.5 py-1 border border-slate-700">
                <Hash size={15} className="text-purple-400" />
                <input
                  className="bg-transparent border-none outline-none text-xs text-white p-0.5 w-24"
                  value={curationTagInput || ""}
                  onChange={(e) => setCurationTagInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && fetchCurationFeed(curationTagInput.trim())
                  }
                  placeholder="#hive-145157"
                />
              </div>
              <button
                onClick={() => fetchCurationFeed(curationTagInput.trim())}
                disabled={isCurationLoading}
                className="p-1.5 bg-slate-800/60 text-slate-300 hover:bg-slate-800 rounded-xl transition-all border border-slate-700/80"
              >
                <RefreshCw
                  size={18}
                  className={cn(isCurationLoading && "animate-spin text-purple-400")}
                />
              </button>
            </div>
          )}
          <div className="w-px h-4 bg-slate-700/80 shrink-0" />
          <button
            onClick={toggleAutoShowInbox}
            className={cn(
              "px-2.5 py-1.5 flex items-center gap-1.5 rounded-xl text-[10px] font-bold transition-all border shrink-0",
              autoShowInbox
                ? "bg-cyan-600/20 text-cyan-300 border-cyan-500/40"
                : "bg-slate-800/60 text-slate-300 border-slate-700/70 hover:bg-slate-800",
            )}
            title={t("autoShowInboxTitle")}
          >
            <BellRing size={15} className={cn(autoShowInbox ? "text-cyan-400" : "opacity-60")} />
            <span className="hidden sm:inline">Auto-Inbox: {autoShowInbox ? "ON" : "OFF"}</span>
          </button>
          <button
            onClick={() => setShowInbox(!showInbox)}
            className={cn(
              "p-1.5 rounded-xl transition-colors relative border shrink-0",
              showInbox
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                : "bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:text-white",
            )}
          >
            <Inbox size={18} />
            {hasUnreadInbox && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)] rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

ReaderTopHeader.displayName = 'ReaderTopHeader';
export default ReaderTopHeader;
