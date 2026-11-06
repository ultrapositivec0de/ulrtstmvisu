import { create } from 'zustand';
import { SteemPost } from '../types';

export type ReaderFeedMode = 'trending' | 'created' | 'hot' | 'feed' | 'blog';
export type ReaderViewTab = 'feed' | 'curation' | 'settings';

export interface ReaderStoreState {
  selectedPost: SteemPost | null;
  activeTag: string;
  feedMode: ReaderFeedMode;
  searchQuery: string;
  searchTag: string;
  isDetailView: boolean;
  viewMode: ReaderViewTab;
  showInbox: boolean;
  showQuickPanel: boolean;
  isReaderHeaderOpen: boolean;
  revealedImages: Set<string>;

  // Actions
  setSelectedPost: (post: SteemPost | null) => void;
  setActiveTag: (tag: string) => void;
  setFeedMode: (mode: ReaderFeedMode) => void;
  setSearchQuery: (query: string) => void;
  setSearchTag: (tag: string) => void;
  setIsDetailView: (isDetail: boolean) => void;
  setViewMode: (viewMode: ReaderViewTab) => void;
  setShowInbox: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowQuickPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  setIsReaderHeaderOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleRevealImage: (permlink: string) => void;
  resetReaderState: () => void;
}

export const useReaderStore = create<ReaderStoreState>((set) => ({
  selectedPost: null,
  activeTag: '',
  feedMode: 'created',
  searchQuery: '',
  searchTag: '',
  isDetailView: false,
  viewMode: 'feed',
  showInbox: false,
  showQuickPanel: false,
  isReaderHeaderOpen: true,
  revealedImages: new Set(),

  setSelectedPost: (selectedPost) => set({ selectedPost, isDetailView: !!selectedPost }),
  setActiveTag: (activeTag) => set({ activeTag }),
  setFeedMode: (feedMode) => set({ feedMode }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchTag: (searchTag) => set({ searchTag }),
  setIsDetailView: (isDetailView) => set({ isDetailView }),
  setViewMode: (viewMode) => set({ viewMode }),
  setShowInbox: (arg) => set((s) => ({ showInbox: typeof arg === 'function' ? arg(s.showInbox) : arg })),
  setShowQuickPanel: (arg) => set((s) => ({ showQuickPanel: typeof arg === 'function' ? arg(s.showQuickPanel) : arg })),
  setIsReaderHeaderOpen: (arg) => set((s) => ({ isReaderHeaderOpen: typeof arg === 'function' ? arg(s.isReaderHeaderOpen) : arg })),
  toggleRevealImage: (permlink) => set((state) => {
    const next = new Set(state.revealedImages);
    if (next.has(permlink)) {
      next.delete(permlink);
    } else {
      next.add(permlink);
    }
    return { revealedImages: next };
  }),
  resetReaderState: () => set({
    selectedPost: null,
    activeTag: '',
    feedMode: 'created',
    searchQuery: '',
    searchTag: '',
    isDetailView: false,
    viewMode: 'feed',
    showInbox: false,
    showQuickPanel: false,
  }),
}));
