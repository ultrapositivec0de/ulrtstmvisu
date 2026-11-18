import { useState, useEffect, useCallback, useRef } from "react";
import { SteemPost, ReaderConfig } from "../../types";
import { callWithFallback } from "../../lib/steem";

interface UseReaderFeedDataProps {
  config: ReaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  mutedUsers: string[];
  setShowQuickPanel?: (show: boolean) => void;
}

interface TagCursorState {
  startAuthor: string;
  startPermlink: string;
  exhausted: boolean;
}

function parseTagsInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((s) => s.trim().replace(/^[#@]+/, "").toLowerCase())
        .filter(Boolean),
    ),
  );
}

function buildFilteredFeed(
  rawList: SteemPost[],
  currentConfig: ReaderConfig,
  mutedUsers: string[],
): SteemPost[] {
  const now = Date.now();
  const limitTime = now - currentConfig.daysLimit * 24 * 60 * 60 * 1000;

  const uniqueMap = new Map<string, SteemPost>();
  for (const post of rawList) {
    const key = `${post.author}/${post.permlink}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, post);
    }
  }

  let filtered = Array.from(uniqueMap.values()).filter((post) => {
    const createdMs = new Date(post.created + "Z").getTime();
    if (createdMs < limitTime) return false;
    if (currentConfig.blackList.includes(post.author)) return false;
    if (currentConfig.excludeMuted && mutedUsers.includes(post.author)) return false;
    if (currentConfig.onlyWhitelist && !currentConfig.whiteList.includes(post.author)) return false;
    return true;
  });

  // Sort merged multi-tag posts newest first
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

export function useReaderFeedData({
  config,
  setConfig,
  mutedUsers,
  setShowQuickPanel,
}: UseReaderFeedDataProps) {
  const [posts, setPosts] = useState<SteemPost[]>(() => {
    try {
      const saved = localStorage.getItem("steem_cached_posts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, SteemPost[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [searchTag, setSearchTag] = useState(config.tags.join(" "));
  const [commentingPost, setCommentingPost] = useState<SteemPost | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [hasInitiatedFeed, setHasInitiatedFeed] = useState(() => {
    try {
      const saved = localStorage.getItem("steem_cached_posts");
      return !!(saved && JSON.parse(saved).length > 0);
    } catch {
      return false;
    }
  });

  const tagCursorsRef = useRef<Record<string, TagCursorState>>({});
  const activeTagsRef = useRef<string[]>([]);
  const rawPoolRef = useRef<SteemPost[]>([]);
  const fetchRequestIdRef = useRef(0);

  useEffect(() => {
    if (posts && posts.length > 0) {
      localStorage.setItem("steem_cached_posts", JSON.stringify(posts.slice(0, 50)));
    }
  }, [posts]);

  useEffect(() => {
    setSearchTag(config.tags.join(" "));
  }, [config.tags]);

  const fetchComments = async (author: string, permlink: string) => {
    setLoadingComments((prev) => new Set(prev).add(permlink));
    try {
      const result: SteemPost[] = await callWithFallback(
        "condenser_api.get_content_replies",
        [author, permlink],
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
    ) => {
      if (!tagCursorsRef.current[tag]) {
        tagCursorsRef.current[tag] = {
          startAuthor: "",
          startPermlink: "",
          exhausted: false,
        };
      }
      const cursor = tagCursorsRef.current[tag];
      const limitTime = Date.now() - currentConfig.daysLimit * 24 * 60 * 60 * 1000;
      let validAdded = 0;

      for (let b = 0; b < maxBatches; b++) {
        if (fetchRequestIdRef.current !== requestId) return;
        if (cursor.exhausted) break;

        const query: Record<string, any> = {
          tag,
          limit: 100,
        };
        if (cursor.startAuthor && cursor.startPermlink) {
          query.start_author = cursor.startAuthor;
          query.start_permlink = cursor.startPermlink;
        }

        const batch: SteemPost[] = await callWithFallback(
          "condenser_api.get_discussions_by_created",
          [query],
        );

        if (fetchRequestIdRef.current !== requestId) return;
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
        if (lastCreatedMs < limitTime) {
          cursor.exhausted = true;
        }

        rawPoolRef.current.push(...items);

        for (const post of items) {
          const createdMs = new Date(post.created + "Z").getTime();
          if (
            createdMs >= limitTime &&
            !currentConfig.blackList.includes(post.author) &&
            !(currentConfig.excludeMuted && currentMuted.includes(post.author)) &&
            !(currentConfig.onlyWhitelist && !currentConfig.whiteList.includes(post.author))
          ) {
            validAdded++;
          }
        }

        if (validAdded >= targetValidAdd || batch.length < 100) {
          if (batch.length < 100) {
            cursor.exhausted = true;
          }
          break;
        }
      }
    },
    [],
  );

  const fetchPosts = useCallback(
    async (customTag?: string) => {
      const requestId = ++fetchRequestIdRef.current;
      const rawTag = customTag !== undefined ? customTag : searchTag;
      const isExplicitEmpty = rawTag.trim() === "";
      const currentSearchTags = parseTagsInput(rawTag);
      const fallbackConfigTags = parseTagsInput((config.tags || []).join(" "));
      const activeTags = isExplicitEmpty
        ? []
        : currentSearchTags.length > 0
          ? currentSearchTags
          : fallbackConfigTags;

      if (isExplicitEmpty && config.tags.length > 0) {
        setConfig((c) => ({ ...c, tags: [] }));
      } else if (
        currentSearchTags.length > 0 &&
        currentSearchTags.join(" ") !== config.tags.join(" ")
      ) {
        setConfig((c) => ({ ...c, tags: currentSearchTags }));
      }

      if (setShowQuickPanel) setShowQuickPanel(false);

      if (activeTags.length === 0 && !config.loadFeedWithoutTag) {
        activeTagsRef.current = [];
        rawPoolRef.current = [];
        tagCursorsRef.current = {};
        setHasMoreFeed(false);
        setPosts([]);
        setLoading(false);
        setHasInitiatedFeed(true);
        return;
      }

      const tagsToFetch = activeTags.length > 0 ? activeTags : [""];
      activeTagsRef.current = tagsToFetch;
      tagCursorsRef.current = {};
      rawPoolRef.current = [];
      setHasMoreFeed(false);
      setHasInitiatedFeed(true);
      setLoading(true);

      try {
        const isMulti = tagsToFetch.length > 1;
        const maxBatchesPerTag = isMulti ? 3 : 8;
        const targetPerTag = isMulti ? 15 : 25;

        for (const tag of tagsToFetch) {
          if (fetchRequestIdRef.current !== requestId) return;
          try {
            await fetchTagBatches(
              tag,
              targetPerTag,
              maxBatchesPerTag,
              requestId,
              config,
              mutedUsers,
            );
            if (fetchRequestIdRef.current !== requestId) return;
            const snapshot = buildFilteredFeed(rawPoolRef.current, config, mutedUsers);
            setPosts(snapshot);
          } catch (tagErr) {
            console.error(`Failed to fetch posts for tag "${tag}":`, tagErr);
          }
        }

        if (fetchRequestIdRef.current === requestId) {
          const anyMore = tagsToFetch.some((tag) => !tagCursorsRef.current[tag]?.exhausted);
          setHasMoreFeed(anyMore);
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        if (fetchRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [config, searchTag, mutedUsers, setConfig, setShowQuickPanel, fetchTagBatches],
  );

  const loadMorePosts = useCallback(async () => {
    const activeTags = activeTagsRef.current;
    if (loading || loadingMore || !hasMoreFeed || activeTags.length === 0) return;

    const requestId = fetchRequestIdRef.current;
    setLoadingMore(true);

    try {
      const isMulti = activeTags.length > 1;
      const maxBatches = isMulti ? 2 : 4;
      const targetValid = isMulti ? 10 : 20;

      for (const tag of activeTags) {
        if (fetchRequestIdRef.current !== requestId) return;
        if (tagCursorsRef.current[tag]?.exhausted) continue;
        try {
          await fetchTagBatches(
            tag,
            targetValid,
            maxBatches,
            requestId,
            config,
            mutedUsers,
          );
          if (fetchRequestIdRef.current !== requestId) return;
          setPosts(buildFilteredFeed(rawPoolRef.current, config, mutedUsers));
        } catch (tagErr) {
          console.error(`Failed to load more posts for tag "${tag}":`, tagErr);
        }
      }

      if (fetchRequestIdRef.current === requestId) {
        const anyMore = activeTags.some((tag) => !tagCursorsRef.current[tag]?.exhausted);
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

  const handleSearch = () => {
    fetchPosts();
  };

  const togglePost = (post: SteemPost) => {
    const id = post.permlink;
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
    setPosts,
    loading,
    setLoading,
    loadingMore,
    hasMoreFeed,
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
    fetchPosts,
    loadMorePosts,
    fetchFavoriteCorePosts,
    fetchComments,
    togglePost,
    handleSearch,
  };
}
