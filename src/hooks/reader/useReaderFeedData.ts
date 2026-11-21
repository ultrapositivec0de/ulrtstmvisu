import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SteemPost, ReaderConfig } from "../../types";
import { callWithFallback } from "../../lib/steem";
import {
  ReaderTagCacheBucket,
  ReaderTagCacheCursor,
  normalizeCacheTagKey,
  getAllTagBuckets,
  saveTagBucket,
  clearReaderTagCache,
} from "../../services/readerCacheDb";

interface UseReaderFeedDataProps {
  config: ReaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  mutedUsers: string[];
  setShowQuickPanel?: (show: boolean) => void;
}

export interface FetchProgressState {
  currentTag: string;
  completed: number;
  total: number;
}

export function parseTagsInput(raw: string): string[] {
  return Array.from(
    new Set(
      (raw || "")
        .split(/[\s,#]+/)
        .map((s) => s.trim().replace(/^[#@]+/, "").toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function getPostNormalizedTags(post: SteemPost): string[] {
  const tags = new Set<string>();
  if (post.category) {
    tags.add(String(post.category).trim().toLowerCase());
  }
  if (post.parent_permlink && (!post.parent_author || post.parent_author === "")) {
    tags.add(String(post.parent_permlink).trim().toLowerCase());
  }
  if (post.json_metadata) {
    try {
      const meta =
        typeof post.json_metadata === "string"
          ? JSON.parse(post.json_metadata)
          : post.json_metadata;
      if (meta && Array.isArray(meta.tags)) {
        for (const t of meta.tags) {
          if (typeof t === "string" && t.trim()) {
            tags.add(t.trim().replace(/^#+/, "").toLowerCase());
          }
        }
      }
    } catch {
      // Ignore malformed json_metadata
    }
  }
  return Array.from(tags);
}

export function postMatchesTag(post: SteemPost, queryTag: string): boolean {
  const clean = (queryTag || "").trim().replace(/^[#@]+/, "").toLowerCase();
  if (!clean || clean === "__all__") return true;
  return getPostNormalizedTags(post).includes(clean);
}

export function filterPostsForTag(
  rawList: SteemPost[],
  tagKey: string,
  currentConfig: ReaderConfig,
  mutedUsers: string[],
): SteemPost[] {
  const now = Date.now();
  const limitTime = now - currentConfig.daysLimit * 24 * 60 * 60 * 1000;
  const normalizedKey = normalizeCacheTagKey(tagKey);

  const uniqueMap = new Map<string, SteemPost>();
  for (const post of rawList) {
    const key = `${post.author}/${post.permlink}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, post);
    }
  }

  let filtered = Array.from(uniqueMap.values()).filter((post) => {
    const createdMs = new Date(post.created + "Z").getTime();
    if (Number.isFinite(createdMs) && createdMs < limitTime) return false;
    if (normalizedKey !== "__all__" && !postMatchesTag(post, normalizedKey)) return false;
    if (currentConfig.blackList.includes(post.author)) return false;
    if (currentConfig.excludeMuted && mutedUsers.includes(post.author)) return false;
    if (currentConfig.onlyWhitelist && !currentConfig.whiteList.includes(post.author)) {
      return false;
    }
    return true;
  });

  filtered.sort(
    (a, b) => new Date(b.created + "Z").getTime() - new Date(a.created + "Z").getTime(),
  );

  const userCounts: Record<string, number> = {};
  filtered = filtered.filter((post) => {
    userCounts[post.author] = (userCounts[post.author] || 0) + 1;
    return userCounts[post.author] <= currentConfig.limitPerUser;
  });

  return filtered;
}

const SESSION_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export function useReaderFeedData({
  config,
  setConfig,
  mutedUsers,
  setShowQuickPanel,
}: UseReaderFeedDataProps) {
  const [posts, setPosts] = useState<SteemPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<FetchProgressState | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, SteemPost[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [searchTag, setSearchTag] = useState(() => config.tags.join(" "));
  const [commentingPost, setCommentingPost] = useState<SteemPost | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [hasInitiatedFeed, setHasInitiatedFeed] = useState(false);

  const [cachedTagBuckets, setCachedTagBuckets] = useState<Record<string, ReaderTagCacheBucket>>({});
  const [selectedCacheTags, setSelectedCacheTags] = useState<string[]>([]);

  const tagBucketsRef = useRef<Record<string, ReaderTagCacheBucket>>({});
  const activeTagsRef = useRef<string[]>([]);
  const fetchRequestIdRef = useRef(0);

  // Hydrate isolated IndexedDB session cache on mount and clean up legacy localStorage payload
  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("steem_cached_posts");
      }
    } catch {
      // Ignore storage cleanup error
    }

    let cancelled = false;
    getAllTagBuckets().then((buckets) => {
      if (cancelled || buckets.length === 0) return;
      const map: Record<string, ReaderTagCacheBucket> = {};
      for (const b of buckets) {
        if (b && b.tag) {
          map[b.tag] = b;
        }
      }
      tagBucketsRef.current = map;
      setCachedTagBuckets(map);

      // Rehydrate active feed silently if current config.tags matches cached buckets
      const initialTags = parseTagsInput((config.tags || []).join(" "));
      if (initialTags.length > 0) {
        const seen = new Set<string>();
        const hydrated: SteemPost[] = [];
        let matchedAny = false;
        const activeKeys: string[] = [];

        for (const t of initialTags) {
          const key = normalizeCacheTagKey(t);
          activeKeys.push(key);
          const bucket = map[key];
          if (bucket && bucket.posts.length > 0) {
            matchedAny = true;
            const filtered = filterPostsForTag(bucket.posts, key, config, mutedUsers);
            for (const post of filtered) {
              const pKey = `${post.author}/${post.permlink}`;
              if (!seen.has(pKey)) {
                seen.add(pKey);
                hydrated.push(post);
              }
            }
          }
        }

        if (matchedAny) {
          activeTagsRef.current = activeKeys;
          setPosts(hydrated);
          setHasInitiatedFeed(true);
          const anyMore = activeKeys.some((k) => !map[k]?.cursor?.exhausted);
          setHasMoreFeed(anyMore);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const persistBucket = useCallback((bucket: ReaderTagCacheBucket) => {
    const key = normalizeCacheTagKey(bucket.tag);
    const updated: ReaderTagCacheBucket = { ...bucket, tag: key };
    tagBucketsRef.current = {
      ...tagBucketsRef.current,
      [key]: updated,
    };
    setCachedTagBuckets((prev) => ({
      ...prev,
      [key]: updated,
    }));
    void saveTagBucket(updated);
  }, []);

  const fetchComments = async (author: string, permlink: string) => {
    setLoadingComments((prev) => new Set(prev).add(permlink));
    try {
      const result: SteemPost[] = await callWithFallback(
        "condenser_api.get_content_replies",
        [author, permlink],
        (config.rpcTimeoutSec || 30) * 1000,
        { preferActiveNode: true },
      );
      const filtered = result.filter((c) => {
        if (config.onlyWhitelist) {
          if (!config.whiteList.includes(c.author)) return false;
        } else {
          if (config.blackList.includes(c.author)) return false;
        }
        return !(config.excludeMuted && mutedUsers.includes(c.author));
      });
      setPostComments((prev) => ({ ...prev, [permlink]: filtered }));
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoadingComments((prev) => {
        const next = new Set(prev);
        next.delete(permlink);
        return next;
      });
    }
  };

  const fetchTagBatches = useCallback(
    async (
      tag: string,
      targetValidAdd: number,
      maxBatches: number,
      requestId: number,
      currentConfig: ReaderConfig,
      currentMuted: string[],
      resetCursor: boolean,
    ): Promise<ReaderTagCacheBucket | null> => {
      const key = normalizeCacheTagKey(tag);
      const rpcTag = key === "__all__" ? "" : key;
      const batchLimit = Math.min(100, Math.max(10, currentConfig.rpcBatchSize || 25));
      const timeoutMs = (currentConfig.rpcTimeoutSec || 30) * 1000;

      const prevBucket = !resetCursor ? tagBucketsRef.current[key] : undefined;
      const cursor: ReaderTagCacheCursor = prevBucket
        ? { ...prevBucket.cursor }
        : { startAuthor: "", startPermlink: "", exhausted: false };

      const bucketPostMap = new Map<string, SteemPost>();
      if (prevBucket && !resetCursor) {
        for (const p of prevBucket.posts) {
          bucketPostMap.set(`${p.author}/${p.permlink}`, p);
        }
      }

      const limitTime = Date.now() - currentConfig.daysLimit * 24 * 60 * 60 * 1000;
      let validAdded = 0;

      for (let b = 0; b < maxBatches; b++) {
        if (fetchRequestIdRef.current !== requestId) return null;
        if (cursor.exhausted) break;

        const query: Record<string, any> = {
          tag: rpcTag,
          limit: batchLimit,
        };
        if (cursor.startAuthor && cursor.startPermlink) {
          query.start_author = cursor.startAuthor;
          query.start_permlink = cursor.startPermlink;
        }

        const batch: SteemPost[] = await callWithFallback(
          "condenser_api.get_discussions_by_created",
          [query],
          timeoutMs,
          { preferActiveNode: true },
        );

        if (fetchRequestIdRef.current !== requestId) return null;
        if (!batch || batch.length === 0) {
          cursor.exhausted = true;
          break;
        }

        const isContinuation = Boolean(cursor.startAuthor);
        if (isContinuation && batch.length <= 1) {
          cursor.exhausted = true;
          break;
        }

        const items = isContinuation ? batch.slice(1) : batch;
        const lastPost = batch[batch.length - 1];
        cursor.startAuthor = lastPost.author;
        cursor.startPermlink = lastPost.permlink;

        const lastCreatedMs = new Date(lastPost.created + "Z").getTime();
        if (Number.isFinite(lastCreatedMs) && lastCreatedMs < limitTime) {
          cursor.exhausted = true;
        }

        for (const post of items) {
          if (rpcTag !== "" && !postMatchesTag(post, rpcTag)) {
            continue;
          }
          const postKey = `${post.author}/${post.permlink}`;
          if (!bucketPostMap.has(postKey)) {
            bucketPostMap.set(postKey, post);
          }

          const createdMs = new Date(post.created + "Z").getTime();
          if (
            (!Number.isFinite(createdMs) || createdMs >= limitTime) &&
            !currentConfig.blackList.includes(post.author) &&
            !(currentConfig.excludeMuted && currentMuted.includes(post.author)) &&
            !(currentConfig.onlyWhitelist && !currentConfig.whiteList.includes(post.author))
          ) {
            validAdded++;
          }
        }

        if (validAdded >= targetValidAdd || batch.length < batchLimit) {
          if (batch.length < batchLimit) {
            cursor.exhausted = true;
          }
          break;
        }
      }

      const nextBucket: ReaderTagCacheBucket = {
        tag: key,
        posts: Array.from(bucketPostMap.values()),
        cursor,
        daysLimit: Math.max(prevBucket?.daysLimit || 0, currentConfig.daysLimit),
        fetchedAt: Date.now(),
      };
      persistBucket(nextBucket);
      return nextBucket;
    },
    [persistBucket],
  );

  const fetchPosts = useCallback(
    async (customTag?: string, options?: { forceRefresh?: boolean }) => {
      const requestId = ++fetchRequestIdRef.current;
      const forceRefresh = Boolean(options?.forceRefresh);
      const rawTag = customTag !== undefined ? customTag : searchTag;
      const activeTags = parseTagsInput(rawTag);

      if (customTag !== undefined) {
        setSearchTag(activeTags.join(" "));
      }

      if (activeTags.join(" ") !== (config.tags || []).join(" ")) {
        setConfig((c) => ({ ...c, tags: activeTags }));
      }

      if (setShowQuickPanel) setShowQuickPanel(false);
      // Reset local cached-group view filter on a fresh search so user sees searched results
      setSelectedCacheTags([]);

      if (activeTags.length === 0 && !config.loadFeedWithoutTag) {
        activeTagsRef.current = [];
        setHasMoreFeed(false);
        setPosts([]);
        setLoading(false);
        setFetchProgress(null);
        setHasInitiatedFeed(true);
        return;
      }

      const tagsToFetch = activeTags.length > 0 ? activeTags : ["__all__"];
      const normalizedKeys = tagsToFetch.map(normalizeCacheTagKey);
      activeTagsRef.current = normalizedKeys;
      setHasMoreFeed(false);
      setHasInitiatedFeed(true);
      setLoading(true);
      setFetchProgress(null);

      try {
        const isMulti = tagsToFetch.length > 1;
        const maxBatchesPerTag = isMulti ? 3 : 6;
        const targetPerTag = isMulti ? 15 : 25;

        const accumulated: SteemPost[] = [];
        const seenKeys = new Set<string>();

        const appendBucketToFeed = (bucket: ReaderTagCacheBucket | null, key: string) => {
          if (!bucket || bucket.posts.length === 0) return;
          const filteredForTag = filterPostsForTag(bucket.posts, key, config, mutedUsers);
          let appendedCount = 0;
          for (const post of filteredForTag) {
            const pKey = `${post.author}/${post.permlink}`;
            if (!seenKeys.has(pKey)) {
              seenKeys.add(pKey);
              accumulated.push(post);
              appendedCount++;
            }
          }
          if (appendedCount > 0 || accumulated.length === 0) {
            setPosts([...accumulated]);
          }
        };

        for (let i = 0; i < normalizedKeys.length; i++) {
          if (fetchRequestIdRef.current !== requestId) return;
          const key = normalizedKeys[i];
          const existingBucket = tagBucketsRef.current[key];
          const isCacheValid =
            !forceRefresh &&
            existingBucket &&
            existingBucket.posts.length > 0 &&
            existingBucket.daysLimit >= config.daysLimit &&
            Date.now() - existingBucket.fetchedAt < SESSION_CACHE_TTL_MS;

          if (isCacheValid && existingBucket) {
            appendBucketToFeed(existingBucket, key);
            continue;
          }

          setFetchProgress({
            currentTag: key === "__all__" ? "" : key,
            completed: i,
            total: normalizedKeys.length,
          });

          try {
            const fetchedBucket = await fetchTagBatches(
              key,
              targetPerTag,
              maxBatchesPerTag,
              requestId,
              config,
              mutedUsers,
              forceRefresh || Boolean(existingBucket && config.daysLimit > existingBucket.daysLimit),
            );
            if (fetchRequestIdRef.current !== requestId) return;
            appendBucketToFeed(fetchedBucket, key);
          } catch (tagErr) {
            console.error(`Failed to fetch posts for tag "${key}":`, tagErr);
          }
        }

        if (fetchRequestIdRef.current === requestId) {
          if (accumulated.length === 0) {
            setPosts([]);
          }
          const anyMore = normalizedKeys.some(
            (key) => !tagBucketsRef.current[key]?.cursor?.exhausted,
          );
          setHasMoreFeed(anyMore);
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        if (fetchRequestIdRef.current === requestId) {
          setLoading(false);
          setFetchProgress(null);
        }
      }
    },
    [config, searchTag, mutedUsers, setConfig, setShowQuickPanel, fetchTagBatches],
  );

  const loadMorePosts = useCallback(async () => {
    const activeKeys = activeTagsRef.current;
    if (loading || loadingMore || !hasMoreFeed || activeKeys.length === 0) return;

    const requestId = fetchRequestIdRef.current;
    setLoadingMore(true);

    try {
      const isMulti = activeKeys.length > 1;
      const maxBatches = isMulti ? 2 : 4;
      const targetValid = isMulti ? 10 : 20;

      const rebuildFromActiveBuckets = () => {
        const seen = new Set<string>();
        const merged: SteemPost[] = [];
        for (const key of activeKeys) {
          const bucket = tagBucketsRef.current[key];
          if (!bucket) continue;
          const filtered = filterPostsForTag(bucket.posts, key, config, mutedUsers);
          for (const p of filtered) {
            const pk = `${p.author}/${p.permlink}`;
            if (!seen.has(pk)) {
              seen.add(pk);
              merged.push(p);
            }
          }
        }
        setPosts(merged);
      };

      for (const key of activeKeys) {
        if (fetchRequestIdRef.current !== requestId) return;
        if (tagBucketsRef.current[key]?.cursor?.exhausted) continue;
        try {
          await fetchTagBatches(
            key,
            targetValid,
            maxBatches,
            requestId,
            config,
            mutedUsers,
            false,
          );
          if (fetchRequestIdRef.current !== requestId) return;
          rebuildFromActiveBuckets();
        } catch (tagErr) {
          console.error(`Failed to load more posts for tag "${key}":`, tagErr);
        }
      }

      if (fetchRequestIdRef.current === requestId) {
        const anyMore = activeKeys.some(
          (key) => !tagBucketsRef.current[key]?.cursor?.exhausted,
        );
        setHasMoreFeed(anyMore);
      }
    } finally {
      if (fetchRequestIdRef.current === requestId) {
        setLoadingMore(false);
      }
    }
  }, [loading, loadingMore, hasMoreFeed, config, mutedUsers, fetchTagBatches]);

  const fetchFavoriteCorePosts = useCallback(() => {
    const favs = parseTagsInput((config.favoriteTags || []).join(" "));
    if (favs.length === 0) return;
    const combined = favs.join(" ");
    setSearchTag(combined);
    fetchPosts(combined);
  }, [config.favoriteTags, fetchPosts]);

  const handleSearch = useCallback(() => {
    fetchPosts(searchTag, { forceRefresh: false });
  }, [fetchPosts, searchTag]);

  const resetActiveFeedTag = useCallback(() => {
    fetchRequestIdRef.current++;
    activeTagsRef.current = [];
    setSearchTag("");
    setSelectedCacheTags([]);
    setConfig((c) => ({ ...c, tags: [] }));
    setPosts([]);
    setHasMoreFeed(false);
    setLoading(false);
    setFetchProgress(null);
    setHasInitiatedFeed(false);
  }, [setConfig]);

  const refilterExistingFeed = useCallback(
    (nextConfig: ReaderConfig, nextMuted: string[] = mutedUsers) => {
      const activeKeys = activeTagsRef.current;
      if (activeKeys.length > 0) {
        const seen = new Set<string>();
        const rebuilt: SteemPost[] = [];
        let hasBuckets = false;
        for (const key of activeKeys) {
          const bucket = tagBucketsRef.current[key];
          if (!bucket) continue;
          hasBuckets = true;
          const filtered = filterPostsForTag(bucket.posts, key, nextConfig, nextMuted);
          for (const p of filtered) {
            const pk = `${p.author}/${p.permlink}`;
            if (!seen.has(pk)) {
              seen.add(pk);
              rebuilt.push(p);
            }
          }
        }
        if (hasBuckets) {
          setPosts(rebuilt);
          return;
        }
      }

      setPosts((prev) => filterPostsForTag(prev, "__all__", nextConfig, nextMuted));
    },
    [mutedUsers],
  );

  const toggleSelectedCacheTag = useCallback((tagKey: string) => {
    const norm = normalizeCacheTagKey(tagKey);
    setSelectedCacheTags((prev) =>
      prev.includes(norm) ? prev.filter((t) => t !== norm) : [...prev, norm],
    );
  }, []);

  const clearSelectedCacheTags = useCallback(() => {
    setSelectedCacheTags([]);
  }, []);

  const clearAllTagCache = useCallback(async () => {
    tagBucketsRef.current = {};
    setCachedTagBuckets({});
    setSelectedCacheTags([]);
    await clearReaderTagCache();
  }, []);

  // Derive locally grouped cached view when user selects 1+ cached tags in the switcher bar
  const displayedPosts = useMemo(() => {
    if (selectedCacheTags.length === 0) return posts;
    const seen = new Set<string>();
    const result: SteemPost[] = [];
    for (const key of selectedCacheTags) {
      const bucket = cachedTagBuckets[key];
      if (!bucket) continue;
      const filtered = filterPostsForTag(bucket.posts, key, config, mutedUsers);
      for (const p of filtered) {
        const pk = `${p.author}/${p.permlink}`;
        if (!seen.has(pk)) {
          seen.add(pk);
          result.push(p);
        }
      }
    }
    return result;
  }, [selectedCacheTags, cachedTagBuckets, posts, config, mutedUsers]);

  const togglePost = (post: SteemPost) => {
    const id = `${post.author}/${post.permlink}`;
    if (!expandedPosts.has(id)) {
      if (post.children > 0 && config.autoLoadComments) {
        fetchComments(post.author, post.permlink);
      }
    }
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return {
    posts,
    displayedPosts,
    setPosts,
    loading,
    setLoading,
    loadingMore,
    hasMoreFeed,
    fetchProgress,
    expandedPosts,
    setExpandedPosts,
    postComments,
    setPostComments,
    loadingComments,
    searchTag,
    setSearchTag,
    hasInitiatedFeed,
    commentingPost,
    setCommentingPost,
    commentBody,
    setCommentBody,
    cachedTagBuckets,
    selectedCacheTags,
    toggleSelectedCacheTag,
    clearSelectedCacheTags,
    clearAllTagCache,
    fetchPosts,
    loadMorePosts,
    fetchFavoriteCorePosts,
    fetchComments,
    togglePost,
    handleSearch,
    resetActiveFeedTag,
    refilterExistingFeed,
  };
}
