import { create } from 'zustand';
import { ReaderConfig, SteemPost } from '../types';

export const STORAGE_KEY_READER_CONFIG = 'steem_reader_config_v1';
export const STORAGE_KEY_RESPONDED = 'steem_responded_v1';
export const STORAGE_KEY_PINNED_POSTS = 'steem_pinned_posts_v1';

export const DEFAULT_READER_CONFIG: ReaderConfig = {
  whiteList: [],
  blackList: [],
  fontSize: 16,
  fontWeight: 400,
  limitPerUser: 5,
  daysLimit: 7,
  tags: [],
  contentWidth: 800,
  excludeMuted: true,
  autoLoadComments: false,
  strictTagMode: false,
  favoriteTags: ['ukraine', 'steem', 'hive-145157'],
  autoShowInbox: false,
  loadImages: true,
  enableVoteLogging: true,
  onlyWhitelist: false,
  loadFeedWithoutTag: false,
};

export function loadInitialReaderConfig(): ReaderConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_READER_CONFIG;
  const saved = localStorage.getItem(STORAGE_KEY_READER_CONFIG);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      let cleanedTags = parsed.tags;
      if (Array.isArray(cleanedTags) && cleanedTags.join(' ') === 'ukraine steemexclusive hive-105151') {
        cleanedTags = [];
      }
      let cleanedFavs = parsed.favoriteTags;
      if (!cleanedFavs || cleanedFavs.length === 0 || cleanedFavs.includes('hive-171319')) {
        cleanedFavs = DEFAULT_READER_CONFIG.favoriteTags;
      }
      return {
        ...DEFAULT_READER_CONFIG,
        ...parsed,
        autoShowInbox: parsed.autoShowInbox !== undefined ? Boolean(parsed.autoShowInbox) : false,
        tags: cleanedTags || [],
        favoriteTags: cleanedFavs,
      };
    } catch {
      return DEFAULT_READER_CONFIG;
    }
  }
  return DEFAULT_READER_CONFIG;
}

export function loadInitialRespondedReplies(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  const saved = localStorage.getItem(STORAGE_KEY_RESPONDED);
  try {
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function loadInitialPinnedPosts(): SteemPost[] {
  if (typeof localStorage === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEY_PINNED_POSTS);
  try {
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSetItem(key: string, value: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.debug(e);
  }
}

export interface ReaderStoreState {
  // Config & Preferences
  config: ReaderConfig;
  updateConfig: (patch: Partial<ReaderConfig> | ((prev: ReaderConfig) => Partial<ReaderConfig>)) => void;
  setConfig: (configOrFn: ReaderConfig | ((prev: ReaderConfig) => ReaderConfig)) => void;

  // View Navigation & Panels
  viewMode: 'feed' | 'curation' | 'settings';
  setViewMode: (mode: 'feed' | 'curation' | 'settings') => void;
  isReaderHeaderOpen: boolean;
  setIsReaderHeaderOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  showQuickPanel: boolean;
  setShowQuickPanel: (show: boolean | ((prev: boolean) => boolean)) => void;

  // Reading Options & Interaction
  voteWeight: number;
  setVoteWeight: (weight: number) => void;
  revealedImages: Set<string>;
  setRevealedImages: (images: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  revealImage: (permlink: string) => void;

  // Replies & History
  respondedReplies: Record<string, string>;
  setRespondedReplies: (
    replies: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  recordRespondedReply: (permlink: string, body: string) => void;

  // Pinned / Kept-in-cache posts
  pinnedPosts: SteemPost[];
  togglePinPost: (post: SteemPost) => void;
  clearPinnedPosts: () => void;

  // Muted Manager
  showMutedManager: boolean;
  setShowMutedManager: (show: boolean | ((prev: boolean) => boolean)) => void;
  loadingMutedManager: boolean;
  setLoadingMutedManager: (loading: boolean | ((prev: boolean) => boolean)) => void;
  fetchedMutedUsers: string[];
  setFetchedMutedUsers: (users: string[] | ((prev: string[]) => string[])) => void;

  // Optimistic Mutations
  applyOptimisticVoteToPosts: (
    posts: SteemPost[],
    author: string,
    permlink: string,
    weight: number,
    voter?: string | null,
  ) => SteemPost[];

  applyOptimisticVoteToComments: (
    commentsMap: Record<string, SteemPost[]>,
    author: string,
    permlink: string,
    weight: number,
    voter?: string | null,
  ) => Record<string, SteemPost[]>;
}

export const useReaderStore = create<ReaderStoreState>((set) => ({
  config: loadInitialReaderConfig(),
  updateConfig: (patch) => {
    set((state) => {
      const resolvedPatch = typeof patch === 'function' ? patch(state.config) : patch;
      const nextConfig = { ...state.config, ...resolvedPatch };
      safeSetItem(STORAGE_KEY_READER_CONFIG, JSON.stringify(nextConfig));
      return { config: nextConfig };
    });
  },
  setConfig: (configOrFn) => {
    set((state) => {
      const nextConfig = typeof configOrFn === 'function' ? configOrFn(state.config) : configOrFn;
      safeSetItem(STORAGE_KEY_READER_CONFIG, JSON.stringify(nextConfig));
      return { config: nextConfig };
    });
  },

  viewMode: 'feed',
  setViewMode: (mode) => {
    set({
      viewMode: mode,
      isReaderHeaderOpen: mode !== 'curation',
    });
  },

  isReaderHeaderOpen: true,
  setIsReaderHeaderOpen: (openOrFn) => {
    set((state) => ({
      isReaderHeaderOpen: typeof openOrFn === 'function' ? openOrFn(state.isReaderHeaderOpen) : openOrFn,
    }));
  },

  showQuickPanel: false,
  setShowQuickPanel: (showOrFn) => {
    set((state) => ({
      showQuickPanel: typeof showOrFn === 'function' ? showOrFn(state.showQuickPanel) : showOrFn,
    }));
  },

  voteWeight: 10000,
  setVoteWeight: (voteWeight) => set({ voteWeight }),

  revealedImages: new Set<string>(),
  setRevealedImages: (imagesOrFn) => {
    set((state) => ({
      revealedImages: typeof imagesOrFn === 'function' ? imagesOrFn(state.revealedImages) : imagesOrFn,
    }));
  },
  revealImage: (permlink) => {
    set((state) => {
      const next = new Set(state.revealedImages);
      next.add(permlink);
      return { revealedImages: next };
    });
  },

  respondedReplies: loadInitialRespondedReplies(),
  setRespondedReplies: (repliesOrFn) => {
    set((state) => {
      const next = typeof repliesOrFn === 'function' ? repliesOrFn(state.respondedReplies) : repliesOrFn;
      safeSetItem(STORAGE_KEY_RESPONDED, JSON.stringify(next));
      return { respondedReplies: next };
    });
  },
  recordRespondedReply: (permlink, body) => {
    set((state) => {
      const next = { ...state.respondedReplies, [permlink]: body };
      safeSetItem(STORAGE_KEY_RESPONDED, JSON.stringify(next));
      return { respondedReplies: next };
    });
  },

  pinnedPosts: loadInitialPinnedPosts(),
  togglePinPost: (post) => {
    set((state) => {
      const key = `${post.author}/${post.permlink}`;
      const exists = state.pinnedPosts.some((p) => `${p.author}/${p.permlink}` === key);
      const next = exists
        ? state.pinnedPosts.filter((p) => `${p.author}/${p.permlink}` !== key)
        : [post, ...state.pinnedPosts].slice(0, 50);
      safeSetItem(STORAGE_KEY_PINNED_POSTS, JSON.stringify(next));
      return { pinnedPosts: next };
    });
  },
  clearPinnedPosts: () => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_PINNED_POSTS);
      } catch (e) {
        console.debug(e);
      }
    }
    set({ pinnedPosts: [] });
  },

  showMutedManager: false,
  setShowMutedManager: (showOrFn) => {
    set((state) => ({
      showMutedManager: typeof showOrFn === 'function' ? showOrFn(state.showMutedManager) : showOrFn,
    }));
  },
  loadingMutedManager: false,
  setLoadingMutedManager: (loadingOrFn) => {
    set((state) => ({
      loadingMutedManager: typeof loadingOrFn === 'function' ? loadingOrFn(state.loadingMutedManager) : loadingOrFn,
    }));
  },
  fetchedMutedUsers: [],
  setFetchedMutedUsers: (usersOrFn) => {
    set((state) => ({
      fetchedMutedUsers: typeof usersOrFn === 'function' ? usersOrFn(state.fetchedMutedUsers) : usersOrFn,
    }));
  },

  applyOptimisticVoteToPosts: (posts, author, permlink, weight, voter) => {
    if (!voter) return posts;
    return posts.map((p) => {
      if (p.author === author && p.permlink === permlink) {
        const hasVoted = p.active_votes?.some((v) => v.voter === voter);
        if (!hasVoted) {
          return {
            ...p,
            active_votes: [...(p.active_votes || []), { voter, weight }],
          };
        }
      }
      return p;
    });
  },

  applyOptimisticVoteToComments: (commentsMap, author, permlink, weight, voter) => {
    if (!voter) return commentsMap;
    const next = { ...commentsMap };
    let hasChanged = false;
    Object.keys(next).forEach((key) => {
      next[key] = next[key].map((c) => {
        if (c.author === author && c.permlink === permlink) {
          const hasVoted = c.active_votes?.some((v) => v.voter === voter);
          if (!hasVoted) {
            hasChanged = true;
            return {
              ...c,
              active_votes: [...(c.active_votes || []), { voter, weight }],
            };
          }
        }
        return c;
      });
    });
    return hasChanged ? next : commentsMap;
  },
}));
