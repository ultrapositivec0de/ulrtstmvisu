import React, { useState } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ReaderConfig } from '../../types';
import { callWithFallback } from '../../lib/steem';

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
  fetchPosts: () => void;
  t: (key: any) => string;
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
  fetchPosts,
  t,
}) => {
  const [newFavTag, setNewFavTag] = useState('');

  const handleAddFavTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFavTag.trim().toLowerCase().replace(/^#/, '');
    if (!clean) return;
    if (!config.favoriteTags?.includes(clean)) {
      setConfig((prev) => ({
        ...prev,
        favoriteTags: [...(prev.favoriteTags || []), clean],
      }));
    }
    setNewFavTag('');
  };

  const handleRemoveFavTag = (tagToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      favoriteTags: (prev.favoriteTags || []).filter((t) => t !== tagToRemove),
    }));
  };

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

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">
              {t('limitPerUser')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="20"
                value={config.limitPerUser}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    limitPerUser: parseInt(e.target.value),
                  }))
                }
                className="flex-1 accent-cyan-500"
              />
              <span className="text-sm font-mono text-cyan-400 w-4">
                {config.limitPerUser}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">
              {t('periodDays')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="30"
                value={config.daysLimit}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    daysLimit: parseInt(e.target.value),
                  }))
                }
                className="flex-1 accent-cyan-500"
              />
              <span className="text-sm font-mono text-cyan-400 w-4">
                {config.daysLimit}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">
              {t('contentWidth')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="400"
                max="1400"
                step="50"
                value={config.contentWidth}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    contentWidth: parseInt(e.target.value),
                  }))
                }
                className="flex-1 accent-cyan-500"
              />
              <span className="text-sm font-mono text-cyan-400 w-12">
                {config.contentWidth}px
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex-1">
            <h4 className="font-bold">{t('loadImages')}</h4>
            <p className="text-xs text-slate-500">
              {t('loadImagesDesc')}
            </p>
          </div>
          <button
            onClick={() =>
              setConfig((c) => ({ ...c, loadImages: !c.loadImages }))
            }
            className={cn(
              'w-12 h-6 rounded-full transition-all relative',
              config.loadImages !== false ? 'bg-cyan-500' : 'bg-slate-700',
            )}
          >
            <div
              className={cn(
                'absolute top-1 left-1 bg-white size-4 rounded-full transition-all shadow',
                config.loadImages !== false && 'translate-x-6',
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
            onClick={() =>
              setConfig((c) => ({
                ...c,
                autoLoadComments: !c.autoLoadComments,
              }))
            }
            className={cn(
              'w-12 h-6 rounded-full transition-all relative',
              config.autoLoadComments ? 'bg-cyan-500' : 'bg-slate-700',
            )}
          >
            <div
              className={cn(
                'absolute top-1 left-1 bg-white size-4 rounded-full transition-all shadow',
                config.autoLoadComments && 'translate-x-6',
              )}
            />
          </button>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex-1">
            <h4 className="font-bold">{t('onlyWhitelistMode')}</h4>
            <p className="text-xs text-slate-500">
              {t('onlyWhitelistDesc')}
            </p>
          </div>
          <button
            onClick={() =>
              setConfig((c) => ({
                ...c,
                onlyWhitelist: !c.onlyWhitelist,
              }))
            }
            className={cn(
              'w-12 h-6 rounded-full transition-all relative',
              config.onlyWhitelist ? 'bg-cyan-500' : 'bg-slate-700',
            )}
          >
            <div
              className={cn(
                'absolute top-1 size-4 bg-white rounded-full transition-all',
                config.onlyWhitelist ? 'left-7' : 'left-1',
              )}
            />
          </button>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex-1">
            <h4 className="font-bold flex items-center gap-2">
              {t('excludeMutedAccounts')}
            </h4>
            <p className="text-xs text-slate-500">
              {t('excludeMutedDesc')}
            </p>
          </div>
          <button
            onClick={() =>
              setConfig((c) => ({
                ...c,
                excludeMuted: !c.excludeMuted,
              }))
            }
            className={cn(
              'w-12 h-6 rounded-full transition-all relative',
              config.excludeMuted ? 'bg-cyan-500' : 'bg-slate-700',
            )}
          >
            <div
              className={cn(
                'absolute top-1 size-4 bg-white rounded-full transition-all',
                config.excludeMuted ? 'left-7' : 'left-1',
              )}
            />
          </button>
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
            onClick={() =>
              setConfig((c) => ({
                ...c,
                loadFeedWithoutTag: !c.loadFeedWithoutTag,
              }))
            }
            className={cn(
              'w-12 h-6 rounded-full transition-all relative',
              config.loadFeedWithoutTag ? 'bg-cyan-500' : 'bg-slate-700',
            )}
          >
            <div
              className={cn(
                'absolute top-1 size-4 bg-white rounded-full transition-all',
                config.loadFeedWithoutTag ? 'left-7' : 'left-1',
              )}
            />
          </button>
        </div>

        {/* Favorite Quick Tags Management */}
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
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={!newFavTag.trim()}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Plus size={14} />
              <span>{t('addTag')}</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {(!config.favoriteTags || config.favoriteTags.length === 0) ? (
              <span className="text-xs text-slate-500 italic">...</span>
            ) : (
              config.favoriteTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300"
                >
                  <Hash size={12} className="text-cyan-400" />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFavTag(tag)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-0.5"
                    title={t('removeTagTitle')}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-bold flex items-center gap-2">
                <VolumeX size={20} className="text-red-400" /> {t('manageMutedAccounts')}
              </h4>
              <p className="text-xs text-slate-500">
                {t('manageMutedDesc')}
              </p>
            </div>
            <button
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
              className="px-4 py-1.5 rounded-lg text-sm font-bold bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 transition-all font-mono"
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
                            onClick={async () => {
                              if (onMuteUser) {
                                await onMuteUser(username, false);
                                setFetchedMutedUsers((prev) =>
                                  prev.filter((u) => u !== username),
                                );
                              }
                            }}
                            className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs font-bold transition-all border border-red-500/20"
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
                  {t('whiteList')} ({config.whiteList.length})
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
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
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
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        whiteList: c.whiteList.filter(
                          (u) => u !== username,
                        ),
                      }))
                    }
                    className="p-1 text-slate-600 hover:text-red-500"
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
                  {t('blackList')} ({config.blackList.length})
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
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
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
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        blackList: c.blackList.filter(
                          (u) => u !== username,
                        ),
                      }))
                    }
                    className="p-1 text-slate-600 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
        <button
          onClick={() => {
            setViewMode('feed');
            fetchPosts();
          }}
          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all shadow-lg active:scale-95"
        >
          {t('applyAndGoToFeed')}
        </button>
      </div>
    </motion.div>
  );
});
