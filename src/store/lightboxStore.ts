import { create } from 'zustand';

export interface LightboxState {
  isOpen: boolean;
  imageSrc: string | null;
  imageAlt: string | null;
  openLightbox: (src: string, alt?: string) => void;
  closeLightbox: () => void;
}

export const useLightboxStore = create<LightboxState>((set) => ({
  isOpen: false,
  imageSrc: null,
  imageAlt: null,
  openLightbox: (src: string, alt?: string) => set({
    isOpen: true,
    imageSrc: src,
    imageAlt: alt || null,
  }),
  closeLightbox: () => set({
    isOpen: false,
    imageSrc: null,
    imageAlt: null,
  }),
}));
