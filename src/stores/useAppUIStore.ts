import { create } from 'zustand';

export type AppView = 'editor' | 'reader';

export interface AppUIStoreState {
  activeView: AppView;
  isSidebarOpen: boolean;
  isFullScreen: boolean;
  isEditorFullScreen: boolean;
  settingsTab: string;

  // Actions
  setActiveView: (view: AppView) => void;
  setIsSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  setIsFullScreen: (full: boolean | ((prev: boolean) => boolean)) => void;
  toggleFullScreen: () => void;
  setIsEditorFullScreen: (full: boolean | ((prev: boolean) => boolean)) => void;
  toggleEditorFullScreen: () => void;
  setSettingsTab: (tab: string) => void;
}

const getInitialActiveView = (): AppView => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('steem_app_active_view');
    if (saved === 'editor' || saved === 'reader') {
      return saved;
    }
  }
  return 'editor';
};

export const useAppUIStore = create<AppUIStoreState>((set) => ({
  activeView: getInitialActiveView(),
  isSidebarOpen: true,
  isFullScreen: false,
  isEditorFullScreen: false,
  settingsTab: 'general',

  setActiveView: (activeView) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('steem_app_active_view', activeView);
    }
    set({ activeView });
  },

  setIsSidebarOpen: (action) =>
    set((state) => ({
      isSidebarOpen: typeof action === 'function' ? action(state.isSidebarOpen) : action,
    })),

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setIsFullScreen: (action) =>
    set((state) => ({
      isFullScreen: typeof action === 'function' ? action(state.isFullScreen) : action,
    })),

  toggleFullScreen: () =>
    set((state) => ({ isFullScreen: !state.isFullScreen })),

  setIsEditorFullScreen: (action) =>
    set((state) => ({
      isEditorFullScreen: typeof action === 'function' ? action(state.isEditorFullScreen) : action,
    })),

  toggleEditorFullScreen: () =>
    set((state) => ({ isEditorFullScreen: !state.isEditorFullScreen })),

  setSettingsTab: (settingsTab) => set({ settingsTab }),
}));
