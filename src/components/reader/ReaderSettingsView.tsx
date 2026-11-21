import React, { useState, useRef, useMemo } from 'react';
import {
  Settings,
  VolumeX,
  Upload,
  Download,
  Trash2,
  UserCheck,
  UserX,
  RefreshCw,
  Plus,
  X,
  Hash,
  Wifi,
  Layers,
  Filter,
  Layout,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ReaderConfig } from '../../types';
import { callWithFallback } from '../../lib/steem';
import { parseTagsInput } from '../../hooks/reader/useReaderFeedData';

export interface ReaderSettingsViewProps {
  config: ReaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  currentUser?: string | null;
  showMutedManager: boolean;
  setShowMutedManager: React.Dispatch<React.SetStateAction<boolean>>;
  loadingMutedManager: boolean;
  setLoadingMutedManager: React.Dispatch<React.SetStateAction<boolean>>;
  fetchedMutedUsers: string[];
  setFetchedMutedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  onMuteUser?: (username: string, mute: boolean) => Promise<void>;
  setViewMode: (mode: 'feed' | 'curation' | 'settings') => void;
  searchTag: string;
  setSearchTag: (tag: string) => void;
  hasInitiatedFeed: boolean;
  postsCount: number;
  fetchPosts: (customTag?: string, options?: { forceRefresh?: boolean }) => void;
  resetActiveFeedTag: () => void;
  refilterExistingFeed: (nextConfig: ReaderConfig) => void;
  refilterCurationPosts: (nextConfig: ReaderConfig) => void;
  t: (key: any) => string;
}

const RPC_BATCH_OPTIONS = [15, 25, 50, 100];

function cloneSnapshotConfig(cfg: ReaderConfig): ReaderConfig {
  return {
    ...cfg,
    whiteList: [...(cfg.whiteList || [])],
    blackList: [...(cfg.blackList || [])],
    tags: [...(cfg.tags || [])],
    favoriteTags: [...(cfg.favoriteTags || [])],
  };
}

function sameList(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((item) => setA.has(item));
}

export const ReaderSettingsView: React.FC<ReaderSettingsViewProps> = React.memo(({
  config,
  setConfig,
  currentUser,
  showMutedManager,
  setShowMutedManager,
  loadingMutedManager,
  setLoadingMutedManager,
  fetchedMutedUsers,
  setFetchedMutedUsers,
  onMuteUser,
  setViewMode,
  searchTag,
  setSearchTag,
  hasInitiatedFeed,
  postsCount,
  fetchPosts,
  resetActiveFeedTag,
  refilterExistingFeed,
  refilterCurationPosts,
  t,
}) => {
  const [newFavTag, setNewFavTag] = useState('');
  const initialConfigRef = useRef<ReaderConfig>(cloneSnapshotConfig(config));
  const initialSearchTagRef = useRef<string>(searchTag);
  const [targetExitTag, setTargetExitTag] = useState<string>(searchTag);

  const normalizedFavTags = useMemo(
    () => parseTagsInput((config.favoriteTags || []).join(' ')),
    [config.favoriteTags],
  );
  const favCoreJoined = useMemo(() => normalizedFavTags.join(' '), [normalizedFavTags]);

  const handleAddFavTag = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseTagsInput(newFavTag);
    if (parsed.length === 0) return;
    setConfig((prev) => ({
      ...prev,
      favoriteTags: Array.from(new Set([...(prev.favoriteTags || []), ...parsed])),
    }));
    setNewFavTag('');
  };

  const handleRemoveFavTag = (tagToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      favoriteTags: (prev.favoriteTags || []).filter((tag) => tag !== tagToRemove),
    }));
  };

  const exitPlan = useMemo(() => {
    const init = initialConfigRef.current;
    const initTagsNorm = parseTagsInput(initialSearchTagRef.current).join(' ');
    const targetTagsNorm = parseTagsInput(targetExitTag).join(' ');

    const targetTagChanged = initTagsNorm !== targetTagsNorm;
    const willResetToEmpty = targetTagChanged && targetTagsNorm === '' && !config.loadFeedWithoutTag;

    const whitelistChanged = !sameList(init.whiteList, config.whiteList);
    const blacklistChanged = !sameList(init.blackList, config.blackList);
    const onlyWhitelistChanged = Boolean(init.onlyWhitelist) !== Boolean(config.onlyWhitelist);
    const excludeMutedChanged = Boolean(init.excludeMuted) !== Boolean(config.excludeMuted);
    const limitPerUserChanged = init.limitPerUser !== config.limitPerUser;

    const filterChanged =
      whitelistChanged ||
      blacklistChanged ||
      onlyWhitelistChanged ||
      excludeMutedChanged ||
      limitPerUserChanged;

    const whiteAdded = (config.whiteList || []).some((u) => !(init.whiteList || []).includes(u));
    const blackRemoved = (init.blackList || []).some((u) => !(config.blackList || []).includes(u));
    const filterRelaxed =
      (Boolean(init.onlyWhitelist) && !config.onlyWhitelist) ||
      (Boolean(init.excludeMuted) && !config.excludeMuted) ||
      blackRemoved ||
      (Boolean(config.onlyWhitelist) && whiteAdded) ||
      config.limitPerUser > init.limitPerUser;

    const daysIncreased = config.daysLimit > init.daysLimit;
    const daysDecreased = config.daysLimit < init.daysLimit;
    const loadWithoutTagEnabled = !init.loadFeedWithoutTag && Boolean(config.loadFeedWithoutTag);

    const needsNetworkFetch = willResetToEmpty
      ? false
      : Boolean(
          targetTagChanged ||
            daysIncreased ||
            (loadWithoutTagEnabled && targetTagsNorm === '' && postsCount === 0) ||
            (filterRelaxed && hasInitiatedFeed),
        );

    return {
      filterChanged,
      filterRelaxed,
      daysIncreased,
      daysDecreased,
      targetTagChanged,
      targetTagsNorm,
      willResetToEmpty,
      needsNetworkFetch,
    };
  }, [config, targetExitTag, hasInitiatedFeed, postsCount]);

  const handleApplyAndExit = () => {
    if (exitPlan.filterChanged || exitPlan.daysDecreased) {
      refilterExistingFeed(config);
      refilterCurationPosts(config);
    }

    if (exitPlan.willResetToEmpty) {
      resetActiveFeedTag();
      setViewMode('feed');
      return;
    }

    if (exitPlan.targetTagChanged) {
      setSearchTag(exitPlan.targetTagsNorm);
    }

    if (exitPlan.needsNetworkFetch) {
      fetchPosts(exitPlan.targetTagsNorm, {
        forceRefresh: exitPlan.daysIncreased || exitPlan.filterRelaxed,
      });
    }

    setViewMode('feed');
  };

  const exitHintText = exitPlan.needsNetworkFetch
    ? t('settingsExitNetworkHint')
    : exitPlan.filterChanged || exitPlan.daysDecreased
      ? t('settingsExitLocalFilterHint')
      : t('settingsExitNoReloadHint');

  return (
    <motion.div
      key="reader-view-settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
    >
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings size={24} className="text-cyan-400" />
          {t('readerSettings')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
        {/* Section 1: Feed Scope Parameters */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Layout size={15} />
            <span>{t('settingsSectionFeed')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {t('limitPerUser')}
              </label>
              <div className="flex items-center gap-3 min-h-[44px]">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={config.limitPerUser}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      limitPerUser: parseInt(e.target.value, 10),
                    }))
                  }
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-sm font-mono tabular-nums text-cyan-400 w-8 text-right">
                  {config.limitPerUser}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {t('periodDays')}
              </label>
              <div className="flex items-center gap-3 min-h-[44px]">
                <input
                  type="range"
                  min="1"
                  max="180"
                  value={config.daysLimit}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      daysLimit: parseInt(e.target.value, 10),
                    }))
                  }
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-sm font-mono tabular-nums text-cyan-400 min-w-[3rem] text-right">
                  {config.daysLimit}
                </span>
              </div>
            </div>
          </div>

          {/* Load Feed Without Tag Mode */}
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex-1">
              <h4 className="font-bold flex items-center gap-2">
                {t('loadFeedWithoutTag')}
              </h4>
              <p className="text-xs text-slate-500">
                {t('loadFeedWithoutTagDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setConfig((c) => ({
                  ...c,
                  loadFeedWithoutTag: !c.loadFeedWithoutTag,
                }))
              }
              className={cn(
                'w-12 h-7 rounded-full transition-all relative shrink-0 cursor-pointer',
                config.loadFeedWithoutTag ? 'bg-cyan-500' : 'bg-slate-700',
              )}
            >
              <div
                className={cn(
                  'absolute top-1 size-5 bg-white rounded-full transition-all',
                  config.loadFeedWithoutTag ? 'left-6' : 'left-1',
                )}
              />
            </button>
          </div>
        </section>

        {/* Section 2: Reading Display & UI Options (Zero RPC needed) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <BookOpen size={15} className="text-cyan-400" />
            <span>{t('settingsSectionReadingUi')}</span>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-2">
            <label className="text-sm font-medium text-slate-300">
              {t('contentWidth')}
            </label>
            <div className="flex items-center gap-3 min-h-[44px]">
              <input
                type="range"
                min="400"
                max="1400"
                step="50"
                value={config.contentWidth}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    contentWidth: parseInt(e.target.value, 10),
                  }))
                }
                className="flex-1 accent-cyan-500"
              />
              <span className="text-sm font-mono tabular-nums text-cyan-400 w-16 text-right">
                {config.contentWidth}px
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex-1">
                <h4 className="font-bold">{t('loadImages')}</h4>
                <p className="text-xs text-slate-500">{t('loadImagesDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({ ...c, loadImages: !c.loadImages }))
                }
                className={cn(
                  'w-12 h-7 rounded-full transition-all relative shrink-0 cursor-pointer',
                  config.loadImages !== false ? 'bg-cyan-500' : 'bg-slate-700',
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 left-1 bg-white size-5 rounded-full transition-all shadow',
                    config.loadImages !== false && 'translate-x-5',
                  )}
                />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex-1">
                <h4 className="font-bold">{t('autoLoadComments')}</h4>
                <p className="text-xs text-slate-500">
                  {t('autoLoadCommentsDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    autoLoadComments: !c.autoLoadComments,
                  }))
                }
                className={cn(
                  'w-12 h-7 rounded-full transition-all relative shrink-0 cursor-pointer',
                  config.autoLoadComments ? 'bg-cyan-500' : 'bg-slate-700',
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 left-1 bg-white size-5 rounded-full transition-all shadow',
                    config.autoLoadComments && 'translate-x-5',
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Network & Slow Internet Tuning */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Wifi size={15} />
            <span>{t('settingsSectionNetwork')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {t('rpcTimeoutSetting')}
              </label>
              <div className="flex items-center gap-3 min-h-[44px]">
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={config.rpcTimeoutSec || 30}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      rpcTimeoutSec: parseInt(e.target.value, 10),
                    }))
                  }
                  className="flex-1 accent-amber-500"
                />
                <span className="text-sm font-mono tabular-nums text-amber-300 w-10 text-right">
                  {config.rpcTimeoutSec || 30}s
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{t('rpcTimeoutSettingDesc')}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {t('rpcBatchSizeSetting')}
              </label>
              <div className="flex items-center gap-2 min-h-[44px]">
                {RPC_BATCH_OPTIONS.map((size) => {
                  const active = (config.rpcBatchSize || 25) === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          rpcBatchSize: size,
                        }))
                      }
                      className={cn(
                        'flex-1 min-h-[44px] rounded-xl border text-xs font-mono font-bold tabular-nums transition-colors cursor-pointer',
                        active
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-white',
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">{t('rpcBatchSizeSettingDesc')}</p>
            </div>
          </div>
        </section>

        {/* Section 4: Favorite Quick Tags Management */}
        <div className="flex flex-col gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div>
            <h4 className="font-bold flex items-center gap-2">
              <Hash size={18} className="text-cyan-400" />
              {t('favoriteTags')}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('editTags')}
            </p>
          </div>

          <form onSubmit={handleAddFavTag} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                value={newFavTag}
                onChange={(e) => setNewFavTag(e.target.value)}
                placeholder={t('addTag')}
                className="w-full min-h-[44px] sm:min-h-[38px] bg-slate-900/80 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={!newFavTag.trim()}
              className="min-h-[44px] sm:min-h-[38px] px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>{t('addTag')}</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {(!config.favoriteTags || config.favoriteTags.length === 0) ? (
              <span className="text-xs text-slate-500 italic">—</span>
            ) : (
              config.favoriteTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300"
                >
                  <Hash size={12} className="text-cyan-400" />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFavTag(tag)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                    title={t('removeTagTitle')}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Section 5: Shared Filters (Feed + Curation) */}
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
              <Filter size={15} />
              <span>{t('settingsSectionSharedFilters')}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{t('settingsSharedFiltersNote')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex-1">
                <h4 className="font-bold">{t('onlyWhitelistMode')}</h4>
                <p className="text-xs text-slate-500">{t('onlyWhitelistDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    onlyWhitelist: !c.onlyWhitelist,
                  }))
                }
                className={cn(
                  'w-12 h-7 rounded-full transition-all relative shrink-0 cursor-pointer',
                  config.onlyWhitelist ? 'bg-cyan-500' : 'bg-slate-700',
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 size-5 bg-white rounded-full transition-all',
                    config.onlyWhitelist ? 'left-6' : 'left-1',
                  )}
                />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex-1">
                <h4 className="font-bold flex items-center gap-2">
                  {t('excludeMutedAccounts')}
                </h4>
                <p className="text-xs text-slate-500">{t('excludeMutedDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    excludeMuted: !c.excludeMuted,
                  }))
                }
                className={cn(
                  'w-12 h-7 rounded-full transition-all relative shrink-0 cursor-pointer',
                  config.excludeMuted ? 'bg-cyan-500' : 'bg-slate-700',
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 size-5 bg-white rounded-full transition-all',
                    config.excludeMuted ? 'left-6' : 'left-1',
                  )}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-bold flex items-center gap-2">
                  <VolumeX size={20} className="text-red-400" /> {t('manageMutedAccounts')}
                </h4>
                <p className="text-xs text-slate-500">
                  {t('manageMutedDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!currentUser) return;
                  setShowMutedManager(!showMutedManager);
                  if (!showMutedManager) {
                    setLoadingMutedManager(true);
                    try {
                      const result = await callWithFallback(
                        'condenser_api.get_following',
                        [currentUser, '', 'ignore', 1000],
                      );
                      if (result && Array.isArray(result)) {
                        const usernames: string[] = result.map(
                          (f: any) => f.following,
                        );
                        setFetchedMutedUsers(
                          Array.from(new Set(usernames)),
                        );
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setLoadingMutedManager(false);
                    }
                  } else {
                    setFetchedMutedUsers([]);
                  }
                }}
                className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-lg text-sm font-bold bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 transition-all font-mono cursor-pointer shrink-0"
              >
                {showMutedManager ? t('hideList') : t('loadList')}
              </button>
            </div>

            <AnimatePresence>
              {showMutedManager && (
                <motion.div
                  key="reader-muted-manager-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {loadingMutedManager ? (
                    <div className="flex justify-center p-4 text-cyan-500">
                      <RefreshCw className="animate-spin" size={20} />
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                      {fetchedMutedUsers.length === 0 ? (
                        <p className="text-center text-slate-500 text-sm py-4">
                          {t('noMutedAccounts')}
                        </p>
                      ) : (
                        fetchedMutedUsers.filter(Boolean).map((username, idx) => (
                          <div
                            key={`muted-user-${username}-${idx}`}
                            className="flex items-center justify-between group py-1.5 px-2 hover:bg-slate-900 rounded border-b border-slate-900/50 last:border-0 text-sm"
                          >
                            <span className="font-bold text-slate-400">
                              @{username}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                if (onMuteUser) {
                                  await onMuteUser(username, false);
                                  setFetchedMutedUsers((prev) =>
                                    prev.filter((u) => u !== username),
                                  );
                                }
                              }}
                              className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs font-bold transition-all border border-red-500/20 cursor-pointer"
                            >
                              {t('unmute')}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-500">
                  <UserCheck size={20} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    {t('whiteList')} (<span className="tabular-nums">{config.whiteList.length}</span>)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    className="cursor-pointer p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title={t('importWhitelist')}
                  >
                    <Upload size={18} />
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const parsed = JSON.parse(
                              event.target?.result as string,
                            );
                            if (Array.isArray(parsed)) {
                              setConfig((c) => ({
                                ...c,
                                whiteList: Array.from(
                                  new Set([...c.whiteList, ...parsed]),
                                ),
                                blackList: c.blackList.filter(
                                  (u) => !parsed.includes(u),
                                ),
                              }));
                            }
                          } catch (err) {
                            console.error(
                              'Failed to parse whitelist JSON',
                              err,
                            );
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob(
                        [JSON.stringify(config.whiteList, null, 2)],
                        { type: 'application/json' },
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `whitelist_export_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={t('exportWhitelist')}
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('addUsernamePlaceholder')}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-green-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        const raw = input.value.trim().toLowerCase();
                        if (!raw) return;
                        const items = raw.split(/[\s,]+/).map(s => s.replace('@', '').trim()).filter(Boolean);
                        if (items.length > 0) {
                          setConfig((c) => ({
                            ...c,
                            whiteList: Array.from(new Set([...c.whiteList, ...items])),
                            blackList: c.blackList.filter((u) => !items.includes(u)),
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      if (!input) return;
                      const raw = input.value.trim().toLowerCase();
                      if (!raw) return;
                      const items = raw.split(/[\s,]+/).map(s => s.replace('@', '').trim()).filter(Boolean);
                      if (items.length > 0) {
                        setConfig((c) => ({
                          ...c,
                          whiteList: Array.from(new Set([...c.whiteList, ...items])),
                          blackList: c.blackList.filter((u) => !items.includes(u)),
                        }));
                        input.value = '';
                      }
                    }}
                    className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    {t('add')}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 px-1">
                  {t('pressEnterToAdd')}
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 h-32 overflow-y-auto custom-scrollbar space-y-1">
                {config.whiteList.filter(Boolean).map((username, idx) => (
                  <div
                    key={`white-user-${username}-${idx}`}
                    className="flex items-center justify-between group py-1 border-b border-slate-900 last:border-0 text-sm"
                  >
                    <span>@{username}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          whiteList: c.whiteList.filter(
                            (u) => u !== username,
                          ),
                        }))
                      }
                      className="p-1 text-slate-600 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-500">
                  <UserX size={20} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    {t('blackList')} (<span className="tabular-nums">{config.blackList.length}</span>)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    className="cursor-pointer p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title={t('importBlacklist')}
                  >
                    <Upload size={18} />
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const parsed = JSON.parse(
                              event.target?.result as string,
                            );
                            if (Array.isArray(parsed)) {
                              setConfig((c) => ({
                                ...c,
                                blackList: Array.from(
                                  new Set([...c.blackList, ...parsed]),
                                ),
                                whiteList: c.whiteList.filter(
                                  (u) => !parsed.includes(u),
                                ),
                              }));
                            }
                          } catch (err) {
                            console.error(
                              'Failed to parse blacklist JSON',
                              err,
                            );
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob(
                        [JSON.stringify(config.blackList, null, 2)],
                        { type: 'application/json' },
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `blacklist_export_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={t('exportBlacklist')}
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('addUsernamePlaceholder')}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-red-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        const raw = input.value.trim().toLowerCase();
                        if (!raw) return;
                        const items = raw.split(/[\s,]+/).map(s => s.replace('@', '').trim()).filter(Boolean);
                        if (items.length > 0) {
                          setConfig((c) => ({
                            ...c,
                            blackList: Array.from(new Set([...c.blackList, ...items])),
                            whiteList: c.whiteList.filter((u) => !items.includes(u)),
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      if (!input) return;
                      const raw = input.value.trim().toLowerCase();
                      if (!raw) return;
                      const items = raw.split(/[\s,]+/).map(s => s.replace('@', '').trim()).filter(Boolean);
                      if (items.length > 0) {
                        setConfig((c) => ({
                          ...c,
                          blackList: Array.from(new Set([...c.blackList, ...items])),
                          whiteList: c.whiteList.filter((u) => !items.includes(u)),
                        }));
                        input.value = '';
                      }
                    }}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    {t('add')}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 px-1">
                  {t('pressEnterToAdd')}
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 h-32 overflow-y-auto custom-scrollbar space-y-1">
                {config.blackList.filter(Boolean).map((username, idx) => (
                  <div
                    key={`black-user-${username}-${idx}`}
                    className="flex items-center justify-between group py-1 border-b border-slate-900 last:border-0 text-sm"
                  >
                    <span>@{username}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          blackList: c.blackList.filter(
                            (u) => u !== username,
                          ),
                        }))
                      }
                      className="p-1 text-slate-600 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Target Tag Control + Smart Apply & Return Bar (Mobile Thumb-Friendly >= 44px) */}
      <div className="p-4 bg-slate-950/70 border-t border-slate-800 space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Hash size={14} className="text-cyan-400" />
              <span>{t('settingsTargetFeedTag')}</span>
            </span>
            {targetExitTag.trim() && (
              <button
                type="button"
                onClick={() => setTargetExitTag('')}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <X size={13} />
                <span>{t('resetActiveTag')}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={targetExitTag}
              onChange={(e) => setTargetExitTag(e.target.value)}
              placeholder={t('tagSearchPlaceholder')}
              className="flex-1 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {normalizedFavTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {normalizedFavTags.length > 1 && (
                <button
                  type="button"
                  onClick={() => setTargetExitTag(favCoreJoined)}
                  className={cn(
                    'min-h-[40px] sm:min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-semibold border shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap',
                    parseTagsInput(targetExitTag).join(' ') === favCoreJoined
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-900 text-amber-300/90 border-amber-500/30 hover:bg-amber-500/15',
                  )}
                >
                  <Layers size={13} />
                  <span>{t('loadAllFavoriteTags')}</span>
                </button>
              )}
              {normalizedFavTags.map((tag) => {
                const isSelected = parseTagsInput(targetExitTag).join(' ') === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTargetExitTag(tag)}
                    className={cn(
                      'min-h-[40px] sm:min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-medium border shrink-0 transition-colors cursor-pointer whitespace-nowrap',
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600',
                    )}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            {exitHintText}
          </p>
          <button
            type="button"
            onClick={handleApplyAndExit}
            className="min-h-[44px] px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-sm text-white transition-all shadow-lg active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          >
            {t('applyAndGoToFeed')}
          </button>
        </div>
      </div>
    </motion.div>
  );
});
