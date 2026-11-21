import { getCanonicalImageUrl } from '../utils/postFormatting';

const DB_NAME = 'steem_image_cache_v1';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const MAX_CACHED_BLOB_BYTES = 25 * 1024 * 1024; // 25 MB safety limit per image

export type CachedImageSource = 'uploaded' | 'post_cache' | 'stock';

export interface CachedImageRecord {
  canonicalUrl: string;
  originalName: string;
  serverHashName: string;
  mimeType: string;
  byteSize: number;
  blob?: Blob | null;
  source: CachedImageSource;
  keepLink: boolean;
  exif?: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface ImageCacheStats {
  totalRecords: number;
  blobCount: number;
  totalBytes: number;
  uploadedCount: number;
  uploadedBytes: number;
  postCacheCount: number;
  postCacheBytes: number;
  stockCount: number;
  stockBytes: number;
}

const canonicalToObjectUrl = new Map<string, string>();
const objectUrlToCanonical = new Map<string, string>();
const memoryFallbackRecords = new Map<string, CachedImageRecord>();
const inflightFetches = new Map<string, Promise<CachedImageRecord | null>>();

export function emitImageCacheUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('steem-image-cache-updated'));
  }
}

export function extractServerHashName(url: string): string {
  const canonical = getCanonicalImageUrl(url);
  if (!canonical) return '';
  try {
    const parsed = new URL(canonical);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && /^DQm|^[A-Za-z0-9]{20,}/.test(segments[segments.length - 2])) {
      return `${segments[segments.length - 2]}/${segments[segments.length - 1]}`;
    }
    return segments[segments.length - 1] || canonical;
  } catch {
    const clean = canonical.split('?')[0];
    const parts = clean.split('/').filter(Boolean);
    return parts[parts.length - 1] || clean;
  }
}

function revokeObjectUrlForCanonical(canonicalUrl: string): void {
  const existing = canonicalToObjectUrl.get(canonicalUrl);
  if (existing) {
    objectUrlToCanonical.delete(existing);
    canonicalToObjectUrl.delete(canonicalUrl);
    try {
      URL.revokeObjectURL(existing);
    } catch {
      // ignore revoke errors
    }
  }
}

function getOrCreateObjectUrl(canonicalUrl: string, blob: Blob): string {
  const existing = canonicalToObjectUrl.get(canonicalUrl);
  if (existing) return existing;
  const objUrl = URL.createObjectURL(blob);
  canonicalToObjectUrl.set(canonicalUrl, objUrl);
  objectUrlToCanonical.set(objUrl, canonicalUrl);
  return objUrl;
}

export function restoreCanonicalUrl(urlOrBlob: string): string {
  if (!urlOrBlob) return '';
  const trimmed = urlOrBlob.trim();
  const mapped = objectUrlToCanonical.get(trimmed);
  if (mapped) return mapped;
  return getCanonicalImageUrl(trimmed);
}

/**
 * Guarantees that any cached blob: ObjectURL in Markdown/HTML is restored back to its
 * canonical HTTP(S) server URL before saving drafts, exporting files, or publishing.
 */
export function sanitizeContentImageUrls(content: string): string {
  if (!content) return '';
  let result = content;
  if (objectUrlToCanonical.size > 0 && result.includes('blob:')) {
    objectUrlToCanonical.forEach((canonical, objUrl) => {
      if (result.includes(objUrl)) {
        result = result.split(objUrl).join(canonical);
      }
    });
  }
  return result;
}

function openImageCacheDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'canonicalUrl' });
          store.createIndex('originalName', 'originalName', { unique: false });
          store.createIndex('source', 'source', { unique: false });
          store.createIndex('lastUsedAt', 'lastUsedAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getCachedImage(rawUrl: string): Promise<CachedImageRecord | null> {
  const canonicalUrl = restoreCanonicalUrl(rawUrl);
  if (!canonicalUrl || canonicalUrl.startsWith('blob:') || canonicalUrl.startsWith('data:')) {
    return null;
  }

  const mem = memoryFallbackRecords.get(canonicalUrl);
  const db = await openImageCacheDb();
  if (!db) return mem || null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(canonicalUrl);
      req.onsuccess = () => {
        const res = req.result as CachedImageRecord | undefined;
        if (res) {
          memoryFallbackRecords.set(canonicalUrl, res);
          resolve(res);
        } else {
          resolve(mem || null);
        }
      };
      req.onerror = () => resolve(mem || null);
    } catch {
      resolve(mem || null);
    }
  });
}

export async function getAllCachedImages(): Promise<CachedImageRecord[]> {
  const db = await openImageCacheDb();
  if (!db) {
    return Array.from(memoryFallbackRecords.values()).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? (req.result as CachedImageRecord[]) : [];
        list.forEach((item) => {
          if (item?.canonicalUrl) {
            memoryFallbackRecords.set(item.canonicalUrl, item);
          }
        });
        list.sort((a, b) => (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0));
        resolve(list);
      };
      req.onerror = () => {
        resolve(Array.from(memoryFallbackRecords.values()).sort((a, b) => b.lastUsedAt - a.lastUsedAt));
      };
    } catch {
      resolve(Array.from(memoryFallbackRecords.values()).sort((a, b) => b.lastUsedAt - a.lastUsedAt));
    }
  });
}

export async function upsertCachedImage(params: {
  url: string;
  originalName?: string;
  blob?: Blob | null;
  source?: CachedImageSource;
  keepLink?: boolean;
  exif?: string;
  silent?: boolean;
}): Promise<CachedImageRecord | null> {
  const canonicalUrl = restoreCanonicalUrl(params.url);
  if (!canonicalUrl || !/^https?:\/\//i.test(canonicalUrl)) {
    return null;
  }

  const existing = await getCachedImage(canonicalUrl);
  const now = Date.now();
  const serverHashName = extractServerHashName(canonicalUrl);

  const chosenBlob = params.blob !== undefined ? params.blob : (existing?.blob ?? null);
  if (params.blob !== undefined && existing?.blob !== params.blob) {
    revokeObjectUrlForCanonical(canonicalUrl);
  }

  const isUsefulName = (name?: string) => {
    if (!name) return false;
    const trimmed = name.trim();
    return Boolean(trimmed && trimmed !== 'image' && trimmed !== 'image.jpg' && trimmed !== serverHashName);
  };

  const resolvedOriginalName = isUsefulName(params.originalName)
    ? params.originalName!.trim()
    : (existing?.originalName || params.originalName?.trim() || serverHashName || 'image');

  const resolvedSource: CachedImageSource =
    existing?.source === 'uploaded'
      ? 'uploaded'
      : (params.source || existing?.source || 'post_cache');

  const record: CachedImageRecord = {
    canonicalUrl,
    originalName: resolvedOriginalName,
    serverHashName,
    mimeType: chosenBlob?.type || existing?.mimeType || 'image/jpeg',
    byteSize: chosenBlob ? chosenBlob.size : 0,
    blob: chosenBlob,
    source: resolvedSource,
    keepLink: params.keepLink !== undefined ? params.keepLink : (existing?.keepLink ?? resolvedSource === 'uploaded'),
    exif: params.exif !== undefined ? params.exif : existing?.exif,
    createdAt: existing?.createdAt || now,
    lastUsedAt: now,
  };

  memoryFallbackRecords.set(canonicalUrl, record);

  const db = await openImageCacheDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  if (!params.silent) {
    emitImageCacheUpdated();
  }
  return record;
}

export async function markCachedImageUsed(rawUrl: string): Promise<void> {
  const existing = await getCachedImage(rawUrl);
  if (!existing) return;
  await upsertCachedImage({
    url: existing.canonicalUrl,
    originalName: existing.originalName,
    blob: existing.blob,
    source: existing.source,
    keepLink: existing.keepLink,
    exif: existing.exif,
    silent: true,
  });
}

export async function cacheImageFromUrlIfMissing(
  rawUrl: string,
  originalName?: string,
  source: CachedImageSource = 'post_cache'
): Promise<CachedImageRecord | null> {
  const canonicalUrl = restoreCanonicalUrl(rawUrl);
  if (!canonicalUrl || !/^https?:\/\//i.test(canonicalUrl)) return null;

  const existing = await getCachedImage(canonicalUrl);
  if (existing?.blob && existing.blob.size > 0) {
    return existing;
  }

  const inflight = inflightFetches.get(canonicalUrl);
  if (inflight) return inflight;

  const task = (async (): Promise<CachedImageRecord | null> => {
    try {
      let blob: Blob | null = null;
      const candidates = [canonicalUrl];
      if (!canonicalUrl.includes('steemitimages.com/')) {
        candidates.push(`https://steemitimages.com/0x0/${canonicalUrl}`);
      }

      for (const candidate of candidates) {
        try {
          const res = await fetch(candidate, { mode: 'cors', credentials: 'omit' });
          if (res.ok) {
            const b = await res.blob();
            if (b.size > 0 && b.size <= MAX_CACHED_BLOB_BYTES && (b.type.startsWith('image/') || b.type === 'application/octet-stream')) {
              blob = b;
              break;
            }
          }
        } catch {
          // try next candidate
        }
      }

      if (!blob) return null;

      return await upsertCachedImage({
        url: canonicalUrl,
        originalName: originalName || existing?.originalName,
        blob,
        source,
      });
    } finally {
      inflightFetches.delete(canonicalUrl);
    }
  })();

  inflightFetches.set(canonicalUrl, task);
  return task;
}

export function getCachedDisplayUrlSync(rawUrl: string): string {
  const canonical = restoreCanonicalUrl(rawUrl);
  return canonicalToObjectUrl.get(canonical) || rawUrl;
}

export async function getCachedDisplayUrl(rawUrl: string): Promise<string> {
  const canonical = restoreCanonicalUrl(rawUrl);
  if (!canonical || !/^https?:\/\//i.test(canonical)) return rawUrl;

  const memObj = canonicalToObjectUrl.get(canonical);
  if (memObj) return memObj;

  const rec = await getCachedImage(canonical);
  if (rec?.blob && rec.blob.size > 0) {
    return getOrCreateObjectUrl(canonical, rec.blob);
  }
  return rawUrl;
}

export async function removeImageBlobOnly(rawUrl: string): Promise<void> {
  const canonicalUrl = restoreCanonicalUrl(rawUrl);
  if (!canonicalUrl) return;
  revokeObjectUrlForCanonical(canonicalUrl);

  const existing = await getCachedImage(canonicalUrl);
  if (!existing) return;

  const updated: CachedImageRecord = {
    ...existing,
    blob: null,
    byteSize: 0,
    lastUsedAt: Date.now(),
  };
  memoryFallbackRecords.set(canonicalUrl, updated);

  const db = await openImageCacheDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(updated);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  emitImageCacheUpdated();
}

export async function deleteCachedImageFull(rawUrl: string): Promise<void> {
  const canonicalUrl = restoreCanonicalUrl(rawUrl);
  if (!canonicalUrl) return;
  revokeObjectUrlForCanonical(canonicalUrl);
  memoryFallbackRecords.delete(canonicalUrl);

  const db = await openImageCacheDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(canonicalUrl);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  emitImageCacheUpdated();
}

export async function clearImageCache(options?: {
  removeLinksToo?: boolean;
  onlySources?: CachedImageSource[];
}): Promise<{ removedBlobs: number; removedRecords: number; freedBytes: number }> {
  const all = await getAllCachedImages();
  const removeLinksToo = Boolean(options?.removeLinksToo);
  const sources = options?.onlySources;

  let removedBlobs = 0;
  let removedRecords = 0;
  let freedBytes = 0;

  for (const item of all) {
    if (sources && !sources.includes(item.source)) continue;

    if (item.blob && item.blob.size > 0) {
      removedBlobs++;
      freedBytes += item.byteSize || item.blob.size;
    }

    if (removeLinksToo || !item.keepLink) {
      await deleteCachedImageFull(item.canonicalUrl);
      removedRecords++;
    } else if (item.blob) {
      await removeImageBlobOnly(item.canonicalUrl);
    }
  }

  emitImageCacheUpdated();
  return { removedBlobs, removedRecords, freedBytes };
}

export async function getImageCacheStats(): Promise<ImageCacheStats> {
  const all = await getAllCachedImages();
  const stats: ImageCacheStats = {
    totalRecords: all.length,
    blobCount: 0,
    totalBytes: 0,
    uploadedCount: 0,
    uploadedBytes: 0,
    postCacheCount: 0,
    postCacheBytes: 0,
    stockCount: 0,
    stockBytes: 0,
  };

  for (const item of all) {
    const size = item.blob ? (item.byteSize || item.blob.size) : 0;
    if (size > 0) {
      stats.blobCount++;
      stats.totalBytes += size;
    }
    if (item.source === 'uploaded') {
      stats.uploadedCount++;
      stats.uploadedBytes += size;
    } else if (item.source === 'stock') {
      stats.stockCount++;
      stats.stockBytes += size;
    } else {
      stats.postCacheCount++;
      stats.postCacheBytes += size;
    }
  }

  return stats;
}

/**
 * Hydrates <img> elements inside Preview/WYSIWYG/Reader containers with locally cached
 * blob ObjectURLs when available (zero redundant network load), while always preserving
 * data-canonical-src so Markdown/export/publish only ever serialize HTTP(S) URLs.
 */
export async function hydrateCachedImagesInContainer(
  container: HTMLElement | null,
  options?: { cacheOnLoad?: boolean; source?: CachedImageSource }
): Promise<void> {
  if (!container) return;
  const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
  if (imgs.length === 0) return;

  await Promise.all(
    imgs.map(async (img) => {
      const attrCanonical = img.getAttribute('data-canonical-src');
      const rawSrc = attrCanonical || img.getAttribute('src') || '';
      if (!rawSrc || rawSrc.startsWith('data:')) return;

      const canonical = restoreCanonicalUrl(rawSrc);
      if (!canonical || !/^https?:\/\//i.test(canonical)) return;

      if (img.getAttribute('data-canonical-src') !== canonical) {
        img.setAttribute('data-canonical-src', canonical);
      }

      const cachedObjUrl = await getCachedDisplayUrl(canonical);
      if (cachedObjUrl && cachedObjUrl.startsWith('blob:')) {
        if (img.getAttribute('src') !== cachedObjUrl) {
          img.setAttribute('src', cachedObjUrl);
        }
        return;
      }

      if (options?.cacheOnLoad) {
        cacheImageFromUrlIfMissing(canonical, img.getAttribute('alt') || undefined, options.source || 'post_cache').catch(() => {});
      }
    })
  );
}
