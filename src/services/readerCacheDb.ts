import { SteemPost } from '../types';

const DB_NAME = 'steem_reader_feed_cache_v1';
const DB_VERSION = 1;
const STORE_NAME = 'tag_buckets';
const MAX_POSTS_PER_BUCKET = 250;

export interface ReaderTagCacheCursor {
  startAuthor: string;
  startPermlink: string;
  exhausted: boolean;
}

export interface ReaderTagCacheBucket {
  tag: string; // normalized key or '__all__'
  posts: SteemPost[];
  cursor: ReaderTagCacheCursor;
  daysLimit: number;
  fetchedAt: number;
}

const memoryFallbackStore = new Map<string, ReaderTagCacheBucket>();

export function normalizeCacheTagKey(tag: string): string {
  const clean = (tag || '').trim().replace(/^[#@]+/, '').toLowerCase();
  return clean || '__all__';
}

function openCacheDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'tag' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getTagBucket(tag: string): Promise<ReaderTagCacheBucket | null> {
  const key = normalizeCacheTagKey(tag);
  const memHit = memoryFallbackStore.get(key);
  const db = await openCacheDb();
  if (!db) return memHit || null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result as ReaderTagCacheBucket | undefined;
        if (res) {
          memoryFallbackStore.set(key, res);
          resolve(res);
        } else {
          resolve(memHit || null);
        }
      };
      req.onerror = () => resolve(memHit || null);
    } catch {
      resolve(memHit || null);
    }
  });
}

export async function getAllTagBuckets(): Promise<ReaderTagCacheBucket[]> {
  const db = await openCacheDb();
  if (!db) {
    return Array.from(memoryFallbackStore.values());
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? (req.result as ReaderTagCacheBucket[]) : [];
        for (const item of list) {
          if (item && item.tag) {
            memoryFallbackStore.set(item.tag, item);
          }
        }
        resolve(list);
      };
      req.onerror = () => resolve(Array.from(memoryFallbackStore.values()));
    } catch {
      resolve(Array.from(memoryFallbackStore.values()));
    }
  });
}

export async function saveTagBucket(bucket: ReaderTagCacheBucket): Promise<void> {
  const key = normalizeCacheTagKey(bucket.tag);
  const normalizedBucket: ReaderTagCacheBucket = {
    ...bucket,
    tag: key,
    posts: bucket.posts.slice(0, MAX_POSTS_PER_BUCKET),
  };

  memoryFallbackStore.set(key, normalizedBucket);
  const db = await openCacheDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(normalizedBucket);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function deleteTagBucket(tag: string): Promise<void> {
  const key = normalizeCacheTagKey(tag);
  memoryFallbackStore.delete(key);
  const db = await openCacheDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearReaderTagCache(): Promise<void> {
  memoryFallbackStore.clear();
  const db = await openCacheDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
