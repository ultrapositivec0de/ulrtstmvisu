import { useState, useEffect } from 'react';
import { getCachedDisplayUrl, getCachedDisplayUrlSync, restoreCanonicalUrl } from '../services/imageCacheDb';

/**
 * Resolves a local IndexedDB Blob ObjectURL when the image is cached, falling back
 * cleanly to the remote URL without changing the canonical URL used for Markdown/export.
 */
export function useCachedImageUrl(rawUrl: string | null | undefined, fallbackUrl?: string): string {
  const targetUrl = rawUrl || '';
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    if (!targetUrl) return fallbackUrl || '';
    const cachedSync = getCachedDisplayUrlSync(targetUrl);
    return cachedSync !== targetUrl ? cachedSync : (fallbackUrl || targetUrl);
  });

  useEffect(() => {
    let active = true;
    if (!targetUrl) {
      setResolvedUrl(fallbackUrl || '');
      return;
    }

    const canonical = restoreCanonicalUrl(targetUrl);
    const cachedSync = getCachedDisplayUrlSync(canonical);
    if (cachedSync !== canonical && cachedSync.startsWith('blob:')) {
      setResolvedUrl(cachedSync);
    } else {
      setResolvedUrl(fallbackUrl || targetUrl);
    }

    const refresh = () => {
      getCachedDisplayUrl(canonical).then((url) => {
        if (!active) return;
        if (url && url.startsWith('blob:')) {
          setResolvedUrl(url);
        } else {
          setResolvedUrl(fallbackUrl || targetUrl);
        }
      });
    };

    refresh();
    window.addEventListener('steem-image-cache-updated', refresh);
    return () => {
      active = false;
      window.removeEventListener('steem-image-cache-updated', refresh);
    };
  }, [targetUrl, fallbackUrl]);

  return resolvedUrl;
}
