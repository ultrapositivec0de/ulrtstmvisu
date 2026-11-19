import { create } from 'zustand';
import { useDeviceStore } from '../store/deviceStore';

export type AppView = 'editor' | 'reader';
export type SettingsTab = 'general' | 'gallery' | 'vault' | 'keys' | 'about' | 'pwa';

export interface AppUIStoreState {
  activeView: AppView;
  isSidebarOpen: boolean;
  isFullScreen: boolean;
  isEditorFullScreen: boolean;
  settingsTab: SettingsTab;

  // Actions
  setActiveView: (view: AppView) => void;
  setIsSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsFullScreen: (full: boolean | ((prev: boolean) => boolean)) => void;
  toggleFullScreen: () => void;
  setIsEditorFullScreen: (full: boolean | ((prev: boolean) => boolean)) => void;
  toggleEditorFullScreen: () => void;
  setSettingsTab: (tab: SettingsTab | ((prev: SettingsTab) => SettingsTab)) => void;
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
  isSidebarOpen: typeof window !== 'undefined' ? !useDeviceStore.getState().isMobileLayout : false,
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

  setSettingsTab: (action) =>
    set((state) => ({
      settingsTab: typeof action === 'function' ? action(state.settingsTab) : action,
    })),
}));
