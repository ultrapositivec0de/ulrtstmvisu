import { create } from 'zustand';

export type ModalType =
  | 'unlock-pin'
  | 'keys'
  | 'publish'
  | 'templates'
  | 'tagPresets'
  | 'splitPost'
  | 'drafts'
  | 'mentions'
  | 'about'
  | 'tagGroups'
  | 'queue'
  | 'tableImport'
  | 'settings'
  | 'audioPresets'
  | 'accountPrompt'
  | string;

export interface ModalStoreState {
  activeModal: ModalType | null;
  previousModal: ModalType | null;
  modalParams: Record<string, any>;

  // Direct boolean helpers for non-exclusive floating modals/overlays
  isSMenuOpen: boolean;
  isTableSelectorOpen: boolean;

  // Actions
  setActiveModal: (modal: ModalType | null, params?: Record<string, any>) => void;
  openModal: (modal: ModalType, params?: Record<string, any>) => void;
  closeModal: (modal?: ModalType) => void;
  closeAllModals: () => void;
  setIsSMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsTableSelectorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export const useModalStore = create<ModalStoreState>((set, get) => ({
  activeModal: null,
  previousModal: null,
  modalParams: {},

  isSMenuOpen: false,
  isTableSelectorOpen: false,

  setActiveModal: (modal, params = {}) => {
    const current = get().activeModal;
    set({
      activeModal: modal,
      previousModal: modal ? current : null,
      modalParams: params || {},
    });
  },

  openModal: (modal, params = {}) => {
    const current = get().activeModal;
    set({
      activeModal: modal,
      previousModal: current,
      modalParams: params || {},
    });
  },

  closeModal: (modal) => {
    const { activeModal } = get();
    if (!modal || activeModal === modal) {
      set({
        activeModal: null,
        modalParams: {},
        previousModal: null,
      });
    }
  },

  closeAllModals: () => {
    set({
      activeModal: null,
      previousModal: null,
      modalParams: {},
      isSMenuOpen: false,
      isTableSelectorOpen: false,
    });
  },

  setIsSMenuOpen: (action) =>
    set((state) => ({
      isSMenuOpen: typeof action === 'function' ? action(state.isSMenuOpen) : action,
    })),

  setIsTableSelectorOpen: (action) =>
    set((state) => ({
      isTableSelectorOpen: typeof action === 'function' ? action(state.isTableSelectorOpen) : action,
    })),
}));
