import { useState, useEffect, useCallback } from "react";
import { SteemPost, ReaderConfig } from "../../types";
import { callWithFallback } from "../../lib/steem";

interface UseReaderFeedDataProps {
  config: ReaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  mutedUsers: string[];
  setShowQuickPanel?: (show: boolean) => void;
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

  const fetchPosts = useCallback(async (customTag?: string) => {
    const rawTag = customTag !== undefined ? customTag : searchTag;
    const isExplicitEmpty = rawTag.trim() === "";
    const currentSearchTags = rawTag.split(" ").filter(Boolean);
    const activeTags = isExplicitEmpty ? [] : (currentSearchTags.length > 0 ? currentSearchTags : config.tags);
    const selectedTag = activeTags.length > 0 ? activeTags[0].replace(/^[#@]+/, '') : "";

    if (isExplicitEmpty && config.tags.length > 0) {
      setConfig((c) => ({ ...c, tags: [] }));
    } else if (currentSearchTags.length > 0 && currentSearchTags.join(" ") !== config.tags.join(" ")) {
      setConfig((c) => ({ ...c, tags: currentSearchTags }));
    }

    if (setShowQuickPanel) setShowQuickPanel(false);

    // If tag is not entered and user has not enabled loading feed without tag:
    if (!selectedTag && !config.loadFeedWithoutTag) {
      setPosts([]);
      setLoading(false);
      setHasInitiatedFeed(true);
      return;
    }

    setHasInitiatedFeed(true);
    setLoading(true);

    try {
      const query = {
        tag: selectedTag,
        limit: 100,
      };

      const result: SteemPost[] = await callWithFallback(
        "condenser_api.get_discussions_by_created",
        [query],
      );

      const now = new Date();
      const limitDate = new Date(
        now.getTime() - config.daysLimit * 24 * 60 * 60 * 1000,
      );

      let filtered = result.filter((post) => {
        const created = new Date(post.created + "Z");
        return created >= limitDate;
      });

      filtered = filtered.filter(
        (post) => !config.blackList.includes(post.author),
      );

      if (config.excludeMuted) {
        filtered = filtered.filter(
          (post) => !mutedUsers.includes(post.author),
        );
      }

      if (config.onlyWhitelist) {
        filtered = filtered.filter((post) =>
          config.whiteList.includes(post.author),
        );
      }

      const userCounts: Record<string, number> = {};
      filtered = filtered.filter((post) => {
        userCounts[post.author] = (userCounts[post.author] || 0) + 1;
        return userCounts[post.author] <= config.limitPerUser;
      });

      if (config.excludeMuted) {
        filtered = filtered.filter(
          (p) => !mutedUsers.includes(p.author),
        );
      }

      const uniquePosts = filtered.filter(
        (p, index, self) =>
          index ===
          self.findIndex(
            (t) => t.author === p.author && t.permlink === p.permlink,
          ),
      );

      setPosts(uniquePosts);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, [config, searchTag, mutedUsers, setConfig, setShowQuickPanel]);

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
    fetchComments,
    togglePost,
    handleSearch,
  };
}
