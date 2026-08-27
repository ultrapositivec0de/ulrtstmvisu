import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { PexelsService } from '../services/pexelsService';

export interface UseImageSearchConfig {
  t: (key: any) => string;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  setActiveModal: (modal: string | null) => void;
  initVault: () => Promise<void>;
  isUnlocked: boolean;
  isVaultInitialized: boolean;
  setVaultPin: Dispatch<SetStateAction<string>>;
  pexelsApiKey: string | null;
  pixabayApiKey: string | null;
  unsplashAccessKey: string | null;
  performanceMode: boolean;
}

export function useImageSearch(config: UseImageSearchConfig) {
  const [galleryMode, setGalleryMode] = useState<'local' | 'pexels' | 'unsplash' | 'pixabay'>('local');
  const [gallerySearch, setGallerySearch] = useState('');
  const [isSearchingPexels, setIsSearchingPexels] = useState(false);
  const [pexelsPage, setPexelsPage] = useState(1);
  const [pexelsResults, setPexelsResults] = useState<any[]>(() => {
    const cached = localStorage.getItem('steem_gallery_cache_results');
    if (!cached) return [];
    try {
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set();
      return parsed.filter(p => {
        const key = p.id + p.source;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch { return []; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('steem_gallery_cache_results', JSON.stringify(pexelsResults.slice(0, 50)));
    } catch {
      // ignore
    }
  }, [pexelsResults]);

  const handleExternalSearch = useCallback(async (query: string, page: number = 1) => {
    if (!query.trim()) return;

    let apiKey = '';
    if (galleryMode === 'pexels') apiKey = config.pexelsApiKey || '';
    if (galleryMode === 'pixabay') apiKey = config.pixabayApiKey || '';
    if (galleryMode === 'unsplash') apiKey = config.unsplashAccessKey || '';

    if (!apiKey) {
      if (!config.isUnlocked && config.isVaultInitialized) {
        config.setVaultPin('');
        config.setActiveModal('unlock-pin');
        return;
      }
      const msg = galleryMode === 'pexels' ? config.t('pexelsKeyRequired') : 
                  galleryMode === 'pixabay' ? config.t('pixabayKeyRequired') : config.t('unsplashKeyRequired');
      config.notify(msg, 'error');
      return;
    }

    setIsSearchingPexels(true);
    try {
      let results: any[] = [];
      const trimmedKey = apiKey.trim();

      const fetchWithRetry = async (url: string, options: RequestInit) => {
        try {
          const resp = await fetch(url, options);
          if (resp.ok) return resp;
          throw new Error(`${resp.status} ${resp.statusText}`);
        } catch (err: any) {
          if (err.name === 'TypeError' || err.message.includes('fetch')) {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const proxyResp = await fetch(proxyUrl, options);
            if (proxyResp.ok) return proxyResp;
          }
          throw err;
        }
      };

      if (galleryMode === 'pexels') {
        const pRes = await PexelsService.searchPhotos(query, trimmedKey, page);
        results = pRes.map(p => ({
          id: p.id,
          url: p.src.large2x || p.src.large,
          thumb: config.performanceMode ? p.src.medium : (p.src.large2x || p.src.large),
          alt: p.alt || 'Pexels Photo',
          author: p.photographer,
          authorUrl: p.photographer_url,
          source: 'pexels'
        }));
      } else if (galleryMode === 'pixabay') {
        const url = `https://pixabay.com/api/?key=${trimmedKey}&q=${encodeURIComponent(query)}&page=${page}&image_type=photo&per_page=30`;
        const resp = await fetchWithRetry(url, {});
        const data = await resp.json();
        results = (data.hits || []).map((h: any) => ({
          id: h.id,
          url: h.largeImageURL,
          thumb: config.performanceMode ? h.webformatURL : h.largeImageURL,
          alt: h.tags || 'Pixabay Photo',
          author: h.user,
          authorUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
          source: 'pixabay'
        }));
      } else if (galleryMode === 'unsplash') {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=30&client_id=${trimmedKey}`;
        const resp = await fetchWithRetry(url, {});
        const data = await resp.json();
        results = (data.results || []).map((r: any) => ({
          id: r.id,
          url: r.urls.regular,
          thumb: config.performanceMode ? r.urls.small : r.urls.regular,
          alt: r.alt_description || 'Unsplash Photo',
          author: r.user.name,
          authorUrl: r.user.links.html,
          source: 'unsplash'
        }));
      }

      const mapped = results.map(r => ({ ...r, selected: false }));
      if (page === 1) setPexelsResults(mapped);
      else setPexelsResults(prev => {
        const existingIds = new Set(prev.map(p => p.id + p.source));
        const uniqueNew = mapped.filter(p => !existingIds.has(p.id + p.source));
        return [...prev, ...uniqueNew];
      });
      setPexelsPage(page);
    } catch (e: any) {
      console.error(e);
      config.notify(config.t('pexelsError'), 'error');
    } finally {
      setIsSearchingPexels(false);
    }
  }, [galleryMode, config]);

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
    handleExternalSearch,
  };
}
