import { useState, useCallback, useMemo, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { ImageItem, AuthType } from '../types';
import { useStockPhotos } from './gallery/useStockPhotos';
import { useGalleryLayoutMarkup } from './gallery/useGalleryLayoutMarkup';
import { useImageUploadPipeline, sanitizeFilename } from './gallery/useImageUploadPipeline';
import {
  CachedImageRecord,
  getAllCachedImages,
  upsertCachedImage,
  removeImageBlobOnly,
  deleteCachedImageFull,
} from '../services/imageCacheDb';
import { getCanonicalImageUrl } from '../utils/postFormatting';
import { CachedImageFilter } from '../components/gallery/CachedImagesPanel';

export { sanitizeFilename };

const STORAGE_KEY_IMAGES = 'steem_uploaded_images_v2';

export interface SteemGalleryConfig {
  t: (key: any) => string;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  promptDialog: (message: string, defaultValue?: string, title?: string, inputType?: 'text' | 'password') => Promise<string | null>;
  insertAtCursor: (text: string, selection?: 'select' | 'end') => void;
  setActiveModal: (modal: string | null) => void;
  initVault: () => Promise<void>;
  isUnlocked: boolean;
  isVaultInitialized: boolean;
  setVaultPin: Dispatch<SetStateAction<string>>;
  setPubLog: Dispatch<SetStateAction<{ msg: string; type: 'success' | 'error' | 'loading' | null }>>;
  username: string;
  setUsername: Dispatch<SetStateAction<string>>;
  selectedVaultUser: string;
  vaultAccounts: string[];
  pexelsApiKey: string | null;
  pixabayApiKey: string | null;
  unsplashAccessKey: string | null;
  performanceMode: boolean;
  onImageInserted?: () => void;
  setIsMiniGalleryOpen: Dispatch<SetStateAction<boolean>>;
  authType?: AuthType | 'VAULT';
}

export function useSteemGallery(config: SteemGalleryConfig) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const isImagesLoaded = useRef(false);
  const [sourceInput, setSourceInput] = useState('');
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('steem_gallery_collapsed') === 'true';
  });
  const [galleryView, setGalleryView] = useState<'grid' | 'list'>('grid');
  const [cachedImages, setCachedImages] = useState<CachedImageRecord[]>([]);
  const [cachedFilter, setCachedFilter] = useState<CachedImageFilter>('all');
  const [selectedCachedUrls, setSelectedCachedUrls] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('steem_gallery_collapsed', String(isGalleryCollapsed));
    }
  }, [isGalleryCollapsed]);

  // 1. Stock Photos Hook
  const stockPhotos = useStockPhotos(config);

  // 2. Filtered local images and image management
  const filteredLocalImages = useMemo(() => {
    if (!stockPhotos.gallerySearch.trim()) return images;
    return images.filter(img =>
      img.name.toLowerCase().includes(stockPhotos.gallerySearch.toLowerCase()) ||
      img.url.toLowerCase().includes(stockPhotos.gallerySearch.toLowerCase())
    );
  }, [images, stockPhotos.gallerySearch]);

  const parseImages = useCallback((input: string) => {
    setSourceInput(input);
    const urlPattern = /(https?:\/\/[^[\]\s<>"'()]+?\.(?:jpg|jpeg|png|webp|gif|svg))/gi;
    const matches = input.match(urlPattern) || [];
    const uniqueUrls = Array.from(new Set(matches));

    setImages(prev => {
      const existingUrls = new Set(prev.map(img => img.url));
      const newImages = uniqueUrls.map(url => ({
        url,
        name: url.split('/').pop()?.split('?')[0] || 'image',
        selected: false,
      })).filter(img => !existingUrls.has(img.url));

      const keptImages = prev.filter(img => uniqueUrls.includes(img.url));
      return [...keptImages, ...newImages];
    });
  }, []);

  const toggleImageSelection = useCallback((filteredIdx: number) => {
    const url = filteredLocalImages[filteredIdx]?.url;
    if (!url) return;
    setImages(prev => {
      const idx = prev.findIndex(i => i.url === url);
      if (idx === -1) return prev;
      const newImages = [...prev];
      newImages[idx] = { ...newImages[idx], selected: !newImages[idx].selected };
      return newImages;
    });
  }, [filteredLocalImages]);

  const moveImageLocal = useCallback((filteredIdx: number, direction: -1 | 1) => {
    const targetFilteredIdx = filteredIdx + direction;
    if (targetFilteredIdx < 0 || targetFilteredIdx >= filteredLocalImages.length) return;

    const url1 = filteredLocalImages[filteredIdx].url;
    const url2 = filteredLocalImages[targetFilteredIdx].url;

    setImages(prev => {
      const idx1 = prev.findIndex(i => i.url === url1);
      const idx2 = prev.findIndex(i => i.url === url2);
      if (idx1 === -1 || idx2 === -1) return prev;

      const newImages = [...prev];
      const temp = newImages[idx1];
      newImages[idx1] = newImages[idx2];
      newImages[idx2] = temp;
      return newImages;
    });
  }, [filteredLocalImages]);

  const hasInitializedRef = useRef(false);
  const initVaultRef = useRef(config.initVault);
  initVaultRef.current = config.initVault;
  const didSkipInitialImagesSaveRef = useRef(false);
  const didSkipInitialLinksSaveRef = useRef(false);

  // Load saved images once on mount (never overwrite selection on config re-renders)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    initVaultRef.current();

    let loadTimer: ReturnType<typeof setTimeout> | null = null;
    if (typeof localStorage !== 'undefined') {
      const savedLinks = localStorage.getItem('steem_editor_source_links');
      const savedImages = localStorage.getItem(STORAGE_KEY_IMAGES);

      let restoredFromSavedImages = false;
      if (savedImages) {
        try {
          const parsed = JSON.parse(savedImages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setImages(parsed);
            restoredFromSavedImages = true;
          }
        } catch (e) {
          console.error("Failed to load images", e);
        }
      }

      if (savedLinks) {
        if (restoredFromSavedImages) {
          setSourceInput(savedLinks);
        } else {
          parseImages(savedLinks);
        }
      }
    }

    loadTimer = setTimeout(() => {
      isImagesLoaded.current = true;
    }, 50);

    return () => {
      if (loadTimer) clearTimeout(loadTimer);
    };
  }, [parseImages]);

  // Save images on change (after initial mount)
  useEffect(() => {
    if (!didSkipInitialImagesSaveRef.current) {
      didSkipInitialImagesSaveRef.current = true;
      return;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
      } catch (e) {
        console.error("Failed to save images", e);
      }
    }
  }, [images]);

  // Save source links on change (after initial mount)
  useEffect(() => {
    if (!didSkipInitialLinksSaveRef.current) {
      didSkipInitialLinksSaveRef.current = true;
      return;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('steem_editor_source_links', sourceInput);
      } catch (e) {
        console.error("Failed to save source links", e);
      }
    }
  }, [sourceInput]);

  // Load and sync unified image cache records
  const refreshCachedImages = useCallback(async () => {
    const list = await getAllCachedImages();
    setCachedImages(list);
  }, []);

  useEffect(() => {
    refreshCachedImages();
    const handler = () => {
      refreshCachedImages();
    };
    const linksClearedHandler = () => {
      setImages([]);
      setSourceInput('');
      setSelectedCachedUrls(new Set());
      refreshCachedImages();
    };
    window.addEventListener('steem-image-cache-updated', handler);
    window.addEventListener('steem-gallery-links-cleared', linksClearedHandler);
    return () => {
      window.removeEventListener('steem-image-cache-updated', handler);
      window.removeEventListener('steem-gallery-links-cleared', linksClearedHandler);
    };
  }, [refreshCachedImages]);

  // Ensure previously saved gallery links exist in the unified cache index with original names
  const didBackfillCacheRef = useRef(false);
  useEffect(() => {
    if (didBackfillCacheRef.current || images.length === 0) return;
    didBackfillCacheRef.current = true;
    Promise.all(
      images.map((img) =>
        upsertCachedImage({
          url: img.url,
          originalName: img.name,
          source: 'uploaded',
          keepLink: true,
          exif: img.exif,
          silent: true,
        })
      )
    ).then(() => refreshCachedImages()).catch(() => {});
  }, [images, refreshCachedImages]);

  const filteredCachedImages = useMemo(() => {
    const q = stockPhotos.gallerySearch.trim().toLowerCase();
    return cachedImages.filter((rec) => {
      if (cachedFilter !== 'all' && rec.source !== cachedFilter) return false;
      if (!q) return true;
      return (
        rec.originalName.toLowerCase().includes(q) ||
        rec.serverHashName.toLowerCase().includes(q) ||
        rec.canonicalUrl.toLowerCase().includes(q)
      );
    });
  }, [cachedImages, cachedFilter, stockPhotos.gallerySearch]);

  const selectedCachedImages = useMemo<ImageItem[]>(() => {
    if (selectedCachedUrls.size === 0) return [];
    return cachedImages
      .filter((r) => selectedCachedUrls.has(r.canonicalUrl))
      .map((r) => ({
        url: r.canonicalUrl,
        name: r.originalName,
        selected: true,
        exif: r.exif,
      }));
  }, [cachedImages, selectedCachedUrls]);

  const toggleCachedSelection = useCallback((canonicalUrl: string) => {
    setSelectedCachedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(canonicalUrl)) next.delete(canonicalUrl);
      else next.add(canonicalUrl);
      return next;
    });
  }, []);

  const selectAllCached = useCallback(() => {
    setSelectedCachedUrls(new Set(filteredCachedImages.map((r) => r.canonicalUrl)));
  }, [filteredCachedImages]);

  const clearCachedSelection = useCallback(() => {
    setSelectedCachedUrls(new Set());
  }, []);

  const stripUrlFromGalleryLists = useCallback((targetUrls: Set<string>) => {
    setImages((prev) => prev.filter((img) => !targetUrls.has(getCanonicalImageUrl(img.url))));
    setSourceInput((prev) =>
      prev
        .split('\n')
        .filter((line) => {
          const trimmed = line.trim();
          if (!trimmed) return false;
          return !targetUrls.has(getCanonicalImageUrl(trimmed));
        })
        .join('\n')
    );
  }, []);

  const deleteSingleCachedImage = useCallback(async (canonicalUrl: string, mode: 'blob_only' | 'full') => {
    if (mode === 'blob_only') {
      await removeImageBlobOnly(canonicalUrl);
      config.notify(config.t('cachedBlobPurgedNotify'), 'success');
    } else {
      await deleteCachedImageFull(canonicalUrl);
      stripUrlFromGalleryLists(new Set([canonicalUrl]));
      setSelectedCachedUrls((prev) => {
        const next = new Set(prev);
        next.delete(canonicalUrl);
        return next;
      });
      config.notify(config.t('cachedDeletedNotify'), 'success');
    }
  }, [config, stripUrlFromGalleryLists]);

  const deleteSelectedCachedImages = useCallback(async (mode: 'blob_only' | 'full') => {
    const targets = Array.from(selectedCachedUrls);
    if (targets.length === 0) return;

    if (mode === 'blob_only') {
      await Promise.all(targets.map((u) => removeImageBlobOnly(u)));
      config.notify(config.t('cachedBlobPurgedNotify'), 'success');
    } else {
      await Promise.all(targets.map((u) => deleteCachedImageFull(u)));
      stripUrlFromGalleryLists(new Set(targets));
      setSelectedCachedUrls(new Set());
      config.notify(config.t('cachedDeletedNotify'), 'success');
    }
  }, [selectedCachedUrls, config, stripUrlFromGalleryLists]);

  const deleteLocalImage = useCallback(async (rawUrl: string) => {
    const canonical = getCanonicalImageUrl(rawUrl);
    stripUrlFromGalleryLists(new Set([canonical]));
    await deleteCachedImageFull(canonical);
  }, [stripUrlFromGalleryLists]);

  // 3. Layout and Markup Hook
  const layoutMarkup = useGalleryLayoutMarkup({
    images,
    setImages,
    selectedCachedImages,
    clearCachedSelection,
    pexelsResults: stockPhotos.pexelsResults,
    setPexelsResults: stockPhotos.setPexelsResults,
    galleryMode: stockPhotos.galleryMode,
    pexelsSettings: stockPhotos.pexelsSettings,
    insertAtCursor: config.insertAtCursor,
    onImageInserted: config.onImageInserted,
    t: config.t,
  });

  // 4. Image Upload Pipeline Hook
  const uploadPipeline = useImageUploadPipeline({
    t: config.t,
    notify: config.notify,
    promptDialog: config.promptDialog,
    setActiveModal: config.setActiveModal,
    initVault: config.initVault,
    setPubLog: config.setPubLog,
    username: config.username,
    setUsername: config.setUsername,
    selectedVaultUser: config.selectedVaultUser,
    vaultAccounts: config.vaultAccounts,
    setIsMiniGalleryOpen: config.setIsMiniGalleryOpen,
    authType: config.authType,
    setImages,
    setSourceInput,
    insertImage: layoutMarkup.insertImage,
  });

  return {
    images,
    setImages,
    sourceInput,
    setSourceInput,
    isGalleryCollapsed,
    setIsGalleryCollapsed,
    galleryView,
    setGalleryView,
    filteredLocalImages,
    parseImages,
    toggleImageSelection,
    moveImageLocal,
    deleteLocalImage,

    // Cached images unified library
    cachedImages,
    filteredCachedImages,
    cachedFilter,
    setCachedFilter,
    selectedCachedUrls,
    toggleCachedSelection,
    selectAllCached,
    clearCachedSelection,
    deleteSingleCachedImage,
    deleteSelectedCachedImages,

    // From stockPhotos
    galleryMode: stockPhotos.galleryMode,
    setGalleryMode: stockPhotos.setGalleryMode,
    gallerySearch: stockPhotos.gallerySearch,
    setGallerySearch: stockPhotos.setGallerySearch,
    isSearchingPexels: stockPhotos.isSearchingPexels,
    setIsSearchingPexels: stockPhotos.setIsSearchingPexels,
    pexelsResults: stockPhotos.pexelsResults,
    setPexelsResults: stockPhotos.setPexelsResults,
    pexelsPage: stockPhotos.pexelsPage,
    setPexelsPage: stockPhotos.setPexelsPage,
    isTrafficOptimized: stockPhotos.isTrafficOptimized,
    setIsTrafficOptimized: stockPhotos.setIsTrafficOptimized,
    pexelsSettings: stockPhotos.pexelsSettings,
    setPexelsSettings: stockPhotos.setPexelsSettings,
    toggleGalleryMode: stockPhotos.toggleGalleryMode,
    handleExternalSearch: stockPhotos.handleExternalSearch,

    // From layoutMarkup
    isGallerySettingsCollapsed: layoutMarkup.isGallerySettingsCollapsed,
    setIsGallerySettingsCollapsed: layoutMarkup.setIsGallerySettingsCollapsed,
    gridLayout: layoutMarkup.gridLayout,
    setGridLayout: layoutMarkup.setGridLayout,
    gridWithCaptions: layoutMarkup.gridWithCaptions,
    setGridWithCaptions: layoutMarkup.setGridWithCaptions,
    singleCaptionAlign: layoutMarkup.singleCaptionAlign,
    setSingleCaptionAlign: layoutMarkup.setSingleCaptionAlign,
    isTextWrapEnabled: layoutMarkup.isTextWrapEnabled,
    setIsTextWrapEnabled: layoutMarkup.setIsTextWrapEnabled,
    imageInsertFormat: layoutMarkup.imageInsertFormat,
    setImageInsertFormat: layoutMarkup.setImageInsertFormat,
    shortenName: layoutMarkup.shortenName,
    insertExternalImage: layoutMarkup.insertExternalImage,
    insertImage: layoutMarkup.insertImage,
    insertGrid: layoutMarkup.insertGrid,

    // From uploadPipeline
    isUploading: uploadPipeline.isUploading,
    setIsUploading: uploadPipeline.setIsUploading,
    imageUploadAccount: uploadPipeline.imageUploadAccount,
    setImageUploadAccount: uploadPipeline.setImageUploadAccount,
    isExifEnabled: uploadPipeline.isExifEnabled,
    setIsExifEnabled: uploadPipeline.setIsExifEnabled,
    getExifTableFromBlob: uploadPipeline.getExifTableFromBlob,
    uploadExternalImage: uploadPipeline.uploadExternalImage,
    handleFileUpload: uploadPipeline.handleFileUpload,
  };
}
