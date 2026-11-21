import { clearReaderTagCache, getAllTagBuckets } from './readerCacheDb';
import { clearImageCache, getImageCacheStats } from './imageCacheDb';
import { useReaderStore, STORAGE_KEY_PINNED_POSTS } from '../store/readerStore';
import {
  getNeutralinoBackupStats,
  isNeutralino,
  isTauri,
  syncNeutralinoBackupNow,
} from './nativeService';

export function formatBytesCompact(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface CacheClearSelection {
  feedCache: boolean;
  curationAndInbox: boolean;
  pinnedPosts: boolean;
  imageBlobs: boolean;
  alsoRemoveImageLinks: boolean;
  stockAndSw: boolean;
  nativeAndLinux: boolean;
}

export const DEFAULT_CACHE_CLEAR_SELECTION: CacheClearSelection = {
  feedCache: true,
  curationAndInbox: true,
  pinnedPosts: false,
  imageBlobs: false,
  alsoRemoveImageLinks: false,
  stockAndSw: true,
  nativeAndLinux: false,
};

export interface LinuxCacheDirEntry {
  id: string;
  label: string;
  baseDir: string;
  cachePaths: string[];
  sizeBytes: number;
  fileCount: number;
  isCurrentApp: boolean;
  isProtectedInfo: boolean;
}

export interface ClearNativeResult {
  removedPaths: string[];
  freedBytes: number;
  errors: string[];
}

export interface CacheCategoryStat {
  bytes: number;
  count: number;
}

export interface CacheBreakdown {
  feedCache: CacheCategoryStat;
  curationAndInbox: CacheCategoryStat;
  pinnedPosts: CacheCategoryStat;
  imageBlobs: CacheCategoryStat & {
    blobCount: number;
    uploadedLinksCount: number;
  };
  stockAndSw: CacheCategoryStat;
  nativeAndLinux: CacheCategoryStat & {
    platform: 'tauri' | 'neutralino' | 'web';
    dirs: LinuxCacheDirEntry[];
  };
  scannedAt: number;
}

export interface CacheClearSummary {
  clearedCategories: string[];
  freedBytes: number;
  errors: string[];
}

const KNOWN_LINUX_APP_IDS = [
  'org.ultraeditor.neutralino',
  'com.ultraeditor.desktop',
  'org.ultrapositive.steemeditorpro',
  'ultra-steem-editor',
  'Ultra Steem Editor',
];

const SAFE_NEUTRALINO_CACHE_DIR_NAMES = new Set([
  'webkitcache',
  'mediacache',
  'cache',
  'code cache',
  'gpucache',
  'dawncache',
  'fscacheddata',
  'scriptcache',
]);

function utf8ByteLength(raw: string | null | undefined): number {
  if (!raw) return 0;
  try {
    return new Blob([raw]).size;
  } catch {
    return raw.length * 2;
  }
}

function safeJsonCount(raw: string | null | undefined): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === 'object') return Object.keys(parsed).length;
    return 0;
  } catch {
    return 0;
  }
}

async function scanNeutralinoDirStats(
  fsApi: any,
  dirPath: string,
  depth = 0
): Promise<{ sizeBytes: number; fileCount: number }> {
  if (depth > 4) return { sizeBytes: 0, fileCount: 0 };
  try {
    const entries = await fsApi.readDirectory(dirPath);
    if (!Array.isArray(entries)) return { sizeBytes: 0, fileCount: 0 };
    let sizeBytes = 0;
    let fileCount = 0;
    for (const entry of entries) {
      const name = entry?.entry;
      if (!name || name === '.' || name === '..') continue;
      const fullPath = `${dirPath.replace(/\/+$/, '')}/${name}`;
      if (entry.type === 'FILE') {
        try {
          const st = await fsApi.getStats(fullPath);
          sizeBytes += Number(st?.size || 0);
          fileCount += 1;
        } catch {
          fileCount += 1;
        }
      } else if (entry.type === 'DIRECTORY') {
        const sub = await scanNeutralinoDirStats(fsApi, fullPath, depth + 1);
        sizeBytes += sub.sizeBytes;
        fileCount += sub.fileCount;
      }
    }
    return { sizeBytes, fileCount };
  } catch {
    return { sizeBytes: 0, fileCount: 0 };
  }
}

async function scanNeutralinoLinuxDirs(): Promise<LinuxCacheDirEntry[]> {
  if (!isNeutralino()) return [];
  const { Neutralino } = window as any;
  if (!Neutralino?.os || !Neutralino?.filesystem) return [];

  const results: LinuxCacheDirEntry[] = [];
  let homeDir: string;
  let xdgCache: string;
  let xdgData: string;

  try {
    homeDir = (await Neutralino.os.getPath('home')) || '';
  } catch {
    homeDir = '';
  }
  try {
    xdgCache = (await Neutralino.os.getEnv('XDG_CACHE_HOME')) || '';
  } catch {
    xdgCache = '';
  }
  try {
    xdgData = (await Neutralino.os.getEnv('XDG_DATA_HOME')) || '';
  } catch {
    xdgData = '';
  }

  const cacheRoot = xdgCache || (homeDir ? `${homeDir}/.cache` : '');
  const dataRoot = xdgData || (homeDir ? `${homeDir}/.local/share` : '');

  const checkBase = async (id: string, label: string, base: string, isCacheRoot: boolean) => {
    try {
      const entries = await Neutralino.filesystem.readDirectory(base);
      if (!Array.isArray(entries)) return;
      const cachePaths: string[] = [];
      let totalBytes = 0;
      let totalFiles = 0;

      for (const entry of entries) {
        const name = entry?.entry;
        if (!name || name === '.' || name === '..' || entry.type !== 'DIRECTORY') continue;
        const lower = String(name).toLowerCase();
        if (lower === 'indexeddb' || lower === 'localstorage' || lower === 'databases') continue;
        if (SAFE_NEUTRALINO_CACHE_DIR_NAMES.has(lower) || (isCacheRoot && (lower === 'webkit' || lower === 'webkitgtk'))) {
          const full = `${base}/${name}`;
          cachePaths.push(full);
          const stats = await scanNeutralinoDirStats(Neutralino.filesystem, full);
          totalBytes += stats.sizeBytes;
          totalFiles += stats.fileCount;
        }
      }

      if (cachePaths.length > 0) {
        results.push({
          id,
          label,
          baseDir: base,
          cachePaths,
          sizeBytes: totalBytes,
          fileCount: totalFiles,
          isCurrentApp: id === 'org.ultraeditor.neutralino',
          isProtectedInfo: false,
        });
      }
    } catch {
      // Directory does not exist
    }
  };

  for (const id of KNOWN_LINUX_APP_IDS) {
    if (cacheRoot) {
      await checkBase(id, `~/.cache/${id}`, `${cacheRoot}/${id}`, true);
    }
    if (dataRoot) {
      await checkBase(id, `~/.local/share/${id}`, `${dataRoot}/${id}`, false);
    }
  }

  const backupStats = await getNeutralinoBackupStats();
  if (backupStats) {
    results.push({
      id: 'neutralino-backup',
      label: '~/.steem_writer_backup.json (Backup)',
      baseDir: backupStats.path,
      cachePaths: [],
      sizeBytes: backupStats.sizeBytes,
      fileCount: 1,
      isCurrentApp: false,
      isProtectedInfo: true,
    });
  }

  return results;
}

export async function scanNativeCacheDirectories(): Promise<{
  platform: 'tauri' | 'neutralino' | 'web';
  dirs: LinuxCacheDirEntry[];
}> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const dirs = await invoke<LinuxCacheDirEntry[]>('scan_linux_cache_dirs');
      return { platform: 'tauri', dirs: Array.isArray(dirs) ? dirs : [] };
    } catch (err) {
      console.debug('Tauri scan_linux_cache_dirs unavailable:', err);
      return { platform: 'tauri', dirs: [] };
    }
  }

  if (isNeutralino()) {
    const dirs = await scanNeutralinoLinuxDirs();
    return { platform: 'neutralino', dirs };
  }

  return { platform: 'web', dirs: [] };
}

export async function clearNativeLinuxDirectories(targetPaths?: string[]): Promise<ClearNativeResult> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      if (targetPaths && targetPaths.length > 0) {
        return await invoke<ClearNativeResult>('clear_linux_cache_targets', { paths: targetPaths });
      }
      return await invoke<ClearNativeResult>('clear_webview_browsing_data');
    } catch (err: any) {
      return {
        removedPaths: [],
        freedBytes: 0,
        errors: [err?.message || String(err)],
      };
    }
  }

  if (isNeutralino()) {
    const { Neutralino } = window as any;
    const dirs = await scanNeutralinoLinuxDirs();
    const allowed = new Map<string, number>();
    dirs.forEach((d) => {
      if (!d.isProtectedInfo) {
        d.cachePaths.forEach((p) => {
          allowed.set(p, d.sizeBytes);
        });
      }
    });

    const requested = targetPaths && targetPaths.length > 0
      ? targetPaths.filter((p) => allowed.has(p))
      : Array.from(allowed.keys());

    const removedPaths: string[] = [];
    let freedBytes = 0;
    const errors: string[] = [];

    for (const target of requested) {
      try {
        const before = await scanNeutralinoDirStats(Neutralino.filesystem, target);
        await Neutralino.filesystem.remove(target);
        removedPaths.push(target);
        freedBytes += before.sizeBytes;
      } catch (err: any) {
        errors.push(`${target}: ${err?.message || String(err)}`);
      }
    }

    try {
      await Neutralino.filesystem.remove('neutralinojs.log');
    } catch {
      // ignore if absent
    }

    return { removedPaths, freedBytes, errors };
  }

  return { removedPaths: [], freedBytes: 0, errors: [] };
}

export async function getCacheBreakdown(): Promise<CacheBreakdown> {
  // 1. Reader Feed Tag Buckets (IndexedDB)
  const buckets = await getAllTagBuckets();
  const feedPostsCount = buckets.reduce((acc, b) => acc + (b.posts?.length || 0), 0);
  const feedBytes = buckets.length > 0 ? utf8ByteLength(JSON.stringify(buckets)) : 0;

  // 2. Curation & Inbox filter cache
  const curationRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('steem_cached_curation_posts') : null;
  const hiddenRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('steem_hidden_replies') : null;
  const curationCount = safeJsonCount(curationRaw) + safeJsonCount(hiddenRaw);
  const curationBytes = utf8ByteLength(curationRaw) + utf8ByteLength(hiddenRaw);

  // 3. Pinned posts (Kept-for-later)
  const pinnedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_PINNED_POSTS) : null;
  const pinnedCount = useReaderStore.getState().pinnedPosts.length || safeJsonCount(pinnedRaw);
  const pinnedBytes = utf8ByteLength(pinnedRaw);

  // 4. Unified Image Cache (IndexedDB)
  const imgStats = await getImageCacheStats();

  // 5. Stock Search + Service Worker CacheStorage
  const stockRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('steem_gallery_cache_results') : null;
  let stockCount = safeJsonCount(stockRaw);
  const stockBytes = utf8ByteLength(stockRaw);
  if (typeof caches !== 'undefined') {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const reqs = await cache.keys();
        stockCount += reqs.length;
      }
    } catch {
      // Ignore CacheStorage inspection errors
    }
  }

  // 6. Native WebView + Linux XDG dirs
  const nativeScan = await scanNativeCacheDirectories();
  const nativeBytes = nativeScan.dirs.reduce(
    (acc, d) => acc + (d.isProtectedInfo ? 0 : d.sizeBytes),
    0
  );
  const nativeFiles = nativeScan.dirs.reduce(
    (acc, d) => acc + (d.isProtectedInfo ? 0 : d.fileCount),
    0
  );

  return {
    feedCache: { bytes: feedBytes, count: feedPostsCount },
    curationAndInbox: { bytes: curationBytes, count: curationCount },
    pinnedPosts: { bytes: pinnedBytes, count: pinnedCount },
    imageBlobs: {
      bytes: imgStats.totalBytes,
      count: imgStats.blobCount,
      blobCount: imgStats.blobCount,
      uploadedLinksCount: imgStats.uploadedCount,
    },
    stockAndSw: { bytes: stockBytes, count: stockCount },
    nativeAndLinux: {
      bytes: nativeBytes,
      count: nativeFiles,
      platform: nativeScan.platform,
      dirs: nativeScan.dirs,
    },
    scannedAt: Date.now(),
  };
}

export async function clearSelectedCacheCategories(
  selection: CacheClearSelection,
  selectedNativePaths?: string[]
): Promise<CacheClearSummary> {
  const clearedCategories: string[] = [];
  let freedBytes = 0;
  const errors: string[] = [];

  if (selection.feedCache) {
    try {
      const buckets = await getAllTagBuckets();
      if (buckets.length > 0) {
        freedBytes += utf8ByteLength(JSON.stringify(buckets));
      }
      await clearReaderTagCache();
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('steem_cached_posts');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('steem-feed-cache-cleared'));
      }
      clearedCategories.push('feedCache');
    } catch (e: any) {
      errors.push(`feedCache: ${e?.message || String(e)}`);
    }
  }

  if (selection.curationAndInbox) {
    try {
      if (typeof localStorage !== 'undefined') {
        freedBytes += utf8ByteLength(localStorage.getItem('steem_cached_curation_posts'));
        freedBytes += utf8ByteLength(localStorage.getItem('steem_hidden_replies'));
        localStorage.removeItem('steem_cached_curation_posts');
        localStorage.removeItem('steem_hidden_replies');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('steem-curation-cache-cleared'));
      }
      clearedCategories.push('curationAndInbox');
    } catch (e: any) {
      errors.push(`curationAndInbox: ${e?.message || String(e)}`);
    }
  }

  if (selection.pinnedPosts) {
    try {
      if (typeof localStorage !== 'undefined') {
        freedBytes += utf8ByteLength(localStorage.getItem(STORAGE_KEY_PINNED_POSTS));
      }
      useReaderStore.getState().clearPinnedPosts();
      clearedCategories.push('pinnedPosts');
    } catch (e: any) {
      errors.push(`pinnedPosts: ${e?.message || String(e)}`);
    }
  }

  if (selection.imageBlobs) {
    try {
      const res = await clearImageCache({
        removeLinksToo: Boolean(selection.alsoRemoveImageLinks),
      });
      freedBytes += res.freedBytes;
      if (selection.alsoRemoveImageLinks) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('steem_uploaded_images_v2');
          localStorage.removeItem('steem_editor_source_links');
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('steem-gallery-links-cleared'));
        }
      }
      clearedCategories.push('imageBlobs');
    } catch (e: any) {
      errors.push(`imageBlobs: ${e?.message || String(e)}`);
    }
  }

  if (selection.stockAndSw) {
    try {
      if (typeof localStorage !== 'undefined') {
        freedBytes += utf8ByteLength(localStorage.getItem('steem_gallery_cache_results'));
        localStorage.removeItem('steem_gallery_cache_results');
      }
      if (typeof caches !== 'undefined') {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((k) => caches.delete(k)));
        } catch {
          // Ignore CacheStorage deletion error
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('steem-stock-cache-cleared'));
      }
      clearedCategories.push('stockAndSw');
    } catch (e: any) {
      errors.push(`stockAndSw: ${e?.message || String(e)}`);
    }
  }

  if (selection.nativeAndLinux) {
    try {
      const nativeRes = await clearNativeLinuxDirectories(selectedNativePaths);
      freedBytes += nativeRes.freedBytes;
      if (nativeRes.errors.length > 0) {
        errors.push(...nativeRes.errors);
      }
      clearedCategories.push('nativeAndLinux');
    } catch (e: any) {
      errors.push(`nativeAndLinux: ${e?.message || String(e)}`);
    }
  }

  // Keep Neutralino backup file in sync immediately so deleted cache keys don't reappear on next launch
  await syncNeutralinoBackupNow();

  return {
    clearedCategories,
    freedBytes,
    errors,
  };
}
