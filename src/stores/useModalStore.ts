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
  showPwaBanner: boolean;
  showPwaInstructionsModal: boolean;
  isAudioPresetsModalOpen: boolean;
  isAccountPromptModalOpen: boolean;
  isTableSelectorOpen: boolean;

  // Actions
  setActiveModal: (modal: ModalType | null, params?: Record<string, any>) => void;
  openModal: (modal: ModalType, params?: Record<string, any>) => void;
  closeModal: (modal?: ModalType) => void;
  closeAllModals: () => void;
  setIsSMenuOpen: (open: boolean) => void;
  setShowPwaBanner: (show: boolean) => void;
  setShowPwaInstructionsModal: (show: boolean) => void;
  setIsAudioPresetsModalOpen: (open: boolean) => void;
  setIsAccountPromptModalOpen: (open: boolean) => void;
  setIsTableSelectorOpen: (open: boolean) => void;
}

export const useModalStore = create<ModalStoreState>((set, get) => ({
  activeModal: null,
  previousModal: null,
  modalParams: {},

  isSMenuOpen: false,
  showPwaBanner: false,
  showPwaInstructionsModal: false,
  isAudioPresetsModalOpen: false,
  isAccountPromptModalOpen: false,
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
    const { activeModal, previousModal } = get();
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
      showPwaInstructionsModal: false,
      isAudioPresetsModalOpen: false,
      isAccountPromptModalOpen: false,
      isTableSelectorOpen: false,
    });
  },

  setIsSMenuOpen: (open) => set({ isSMenuOpen: open }),
  setShowPwaBanner: (show) => set({ showPwaBanner: show }),
  setShowPwaInstructionsModal: (show) => set({ showPwaInstructionsModal: show }),
  setIsAudioPresetsModalOpen: (open) => set({ isAudioPresetsModalOpen: open }),
  setIsAccountPromptModalOpen: (open) => set({ isAccountPromptModalOpen: open }),
  setIsTableSelectorOpen: (open) => set({ isTableSelectorOpen: open }),
}));
