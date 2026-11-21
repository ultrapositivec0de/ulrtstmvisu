import { useState, useCallback, useEffect } from 'react';
import { useImageSearch, UseImageSearchConfig } from '../useImageSearch';

export interface PexelsSettings {
  withAttribution: boolean;
  linkEmbedded: boolean;
}

export type UseStockPhotosConfig = UseImageSearchConfig;

export function useStockPhotos(config: UseStockPhotosConfig) {
  const {
    galleryMode,
    setGalleryMode,
    gallerySearch,
    setGallerySearch,
    isSearchingPexels,
    setIsSearchingPexels,
    pexelsResults,
    setPexelsResults,
    pexelsPage,
    setPexelsPage,
    handleExternalSearch,
  } = useImageSearch(config);

  const [isTrafficOptimized, setIsTrafficOptimized] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('steem_traffic_optimized') === 'true';
  });

  const [pexelsSettings, setPexelsSettings] = useState<PexelsSettings>(() => {
    if (typeof localStorage === 'undefined') {
      return { withAttribution: true, linkEmbedded: true };
    }
    const saved = localStorage.getItem('steem_pexels_settings');
    try {
      return saved ? JSON.parse(saved) : { withAttribution: true, linkEmbedded: true };
    } catch {
      return { withAttribution: true, linkEmbedded: true };
    }
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('steem_traffic_optimized', String(isTrafficOptimized));
    }
  }, [isTrafficOptimized]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('steem_pexels_settings', JSON.stringify(pexelsSettings));
    }
  }, [pexelsSettings]);

  const toggleGalleryMode = useCallback((mode: 'local' | 'cached' | 'pexels' | 'unsplash' | 'pixabay') => {
    setGalleryMode(mode);
    setGallerySearch('');
  }, [setGalleryMode, setGallerySearch]);

  return {
    galleryMode,
    setGalleryMode,
    gallerySearch,
    setGallerySearch,
    isSearchingPexels,
    setIsSearchingPexels,
    pexelsResults,
    setPexelsResults,
    pexelsPage,
    setPexelsPage,
    isTrafficOptimized,
    setIsTrafficOptimized,
    pexelsSettings,
    setPexelsSettings,
    toggleGalleryMode,
    handleExternalSearch,
  };
}
