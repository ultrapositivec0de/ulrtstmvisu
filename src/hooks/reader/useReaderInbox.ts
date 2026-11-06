import { useState, useEffect } from "react";
import { SteemPost, ReaderConfig } from "../../types";
import { callWithFallback } from "../../lib/steem";

interface UseReaderInboxProps {
  currentUser?: string | null;
  config: ReaderConfig;
  mutedUsers: string[];
  rawInboxData?: SteemPost[];
  targetReaderPost?: {
    author: string;
    permlink: string;
    commentAuthor?: string;
    commentPermlink?: string;
  } | null;
  setRespondedReplies: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function useReaderInbox({
  currentUser,
  config,
  mutedUsers,
  rawInboxData,
  targetReaderPost,
  setRespondedReplies,
}: UseReaderInboxProps) {
  const [showInbox, setShowInbox] = useState(false);
  const [inbox, setInbox] = useState<SteemPost[]>([]);
  const [hiddenReplies, setHiddenReplies] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("steem_hidden_replies");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [inboxLimit, setInboxLimit] = useState(50);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [isRefreshingInbox, setIsRefreshingInbox] = useState(false);
  const [hasAutoFetchedInbox, setHasAutoFetchedInbox] = useState(false);

  const [parentContext, setParentContext] = useState<Record<string, SteemPost>>({});
  const [expandedInboxThreads, setExpandedInboxThreads] = useState<Set<string>>(new Set());
  const [loadingContext, setLoadingContext] = useState<Set<string>>(new Set());

  const [threads, setThreads] = useState<Record<string, SteemPost[]>>({});
  const [loadingThreads, setLoadingThreads] = useState<Set<string>>(new Set());
  const [editingReply, setEditingReply] = useState<{
    permlink: string;
    body: string;
  } | null>(null);
  const [showMyReplies, setShowMyReplies] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<SteemPost | null>(null);
  const [floatingCommentBody, setFloatingCommentBody] = useState("");

  const unreadRepliesCount = inbox.filter((r) => !hiddenReplies.has(r.permlink)).length;

  const fetchInbox = async (more: boolean = false, silent: boolean = false): Promise<boolean> => {
    if (!currentUser) return false;

    const newLimit = Math.min(more ? inboxLimit + 50 : 50, 100);
    if (more) setInboxLimit(newLimit);

    if (silent) setIsRefreshingInbox(true);
    else setLoadingInbox(true);

    try {
      let results: SteemPost[] = [];

      if (!more && rawInboxData && rawInboxData.length > 0) {
        results = rawInboxData;
      } else {
        results = await callWithFallback("bridge.get_account_posts", {
          sort: "replies",
          account: currentUser,
          limit: newLimit,
        }).catch(() => null);

        if (!results) {
          const state = await callWithFallback("condenser_api.get_state", [
            `/@${currentUser}/recent-replies`,
          ]).catch(() => null);

          if (state && state.content) {
            results = Object.values(state.content) as SteemPost[];
            results = results.filter(
              (p) => p.parent_author === currentUser || p.author !== currentUser,
            );
            results.sort(
              (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
            );
          } else {
            results = [];
          }
        }
      }

      const myComments: SteemPost[] = await callWithFallback(
        "condenser_api.get_account_history",
        [currentUser, -1, 100],
      ).then((res: any) =>
        res
          .filter((op: any) => op[1].op[0] === "comment")
          .map((op: any) => op[1].op[1]),
      );

      const replies = (results as SteemPost[])
        .filter((p: SteemPost) => {
          if (p.author === currentUser) return false;
          if (config.onlyWhitelist) {
            if (!config.whiteList.includes(p.author)) return false;
          } else {
            if (config.blackList.includes(p.author)) return false;
          }
          if (config.excludeMuted && mutedUsers.includes(p.author)) return false;
          return true;
        })
        .sort(
          (a: SteemPost, b: SteemPost) =>
            new Date(b.created).getTime() - new Date(a.created).getTime(),
        );

      setRespondedReplies((prev) => {
        const next = { ...prev };
        myComments.forEach((c) => {
          if (c.author === currentUser && c.parent_permlink) {
            next[c.parent_permlink] = c.body;
          }
        });
        return next;
      });

      const uniqueReplies = replies.filter(
        (p, index, self) =>
          index === self.findIndex((t) => t.author === p.author && t.permlink === p.permlink),
      );

      setInbox(uniqueReplies);
      return uniqueReplies.some((r) => !hiddenReplies.has(r.permlink));
    } catch (err) {
      console.error("Failed to fetch inbox:", err);
      return false;
    } finally {
      setLoadingInbox(false);
      setIsRefreshingInbox(false);
    }
  };

  const fetchParentContext = async (author: string, permlink: string) => {
    const key = `${author}/${permlink}`;
    if (loadingContext.has(key)) return;

    setLoadingContext((prev) => new Set(prev).add(key));
    try {
      const result = await callWithFallback("condenser_api.get_content", [author, permlink]);
      setParentContext((prev) => ({ ...prev, [key]: result }));
    } catch (err) {
      console.error("Failed to fetch context:", err);
    } finally {
      setLoadingContext((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const fetchThread = async (author: string, permlink: string) => {
    setLoadingThreads((prev) => new Set(prev).add(permlink));
    try {
      const post: SteemPost = await callWithFallback("condenser_api.get_content", [
        author,
        permlink,
      ]);
      const replies: SteemPost[] = await callWithFallback(
        "condenser_api.get_content_replies",
        [author, permlink],
      );
      const filteredReplies = [post, ...replies].filter((p) => {
        if (config.onlyWhitelist) {
          if (!config.whiteList.includes(p.author)) return false;
        } else {
          if (config.blackList.includes(p.author)) return false;
        }
        return !(config.excludeMuted && mutedUsers.includes(p.author));
      });
      setThreads((prev) => ({ ...prev, [permlink]: filteredReplies }));
    } catch (err) {
      console.error("Failed to fetch thread:", err);
    } finally {
      setLoadingThreads((prev) => {
        const next = new Set(prev);
        next.delete(permlink);
        return next;
      });
    }
  };

  useEffect(() => {
    if (currentUser && !hasAutoFetchedInbox && config.autoShowInbox) {
      fetchInbox().then((hasReplies) => {
        if (hasReplies) setShowInbox(true);
      });
      setHasAutoFetchedInbox(true);
    } else if (!currentUser) {
      setHasAutoFetchedInbox(false);
      setInbox([]);
    }
  }, [currentUser, hasAutoFetchedInbox, config.autoShowInbox]);

  useEffect(() => {
    if (showInbox && inbox.length > 0) {
      const keysToFetch = inbox
        .filter((r) => !hiddenReplies.has(r.permlink))
        .map((r) => `${r.parent_author}/${r.parent_permlink}`)
        .filter((value, index, self) => self.indexOf(value) === index)
        .slice(0, 15);

      keysToFetch.forEach((key) => {
        const [p_author, p_permlink] = key.split("/");
        if (p_author && p_permlink && !parentContext[key] && !loadingContext.has(key)) {
          fetchParentContext(p_author, p_permlink);
        }
      });
    }
  }, [showInbox, inbox, hiddenReplies, parentContext, loadingContext]);

  useEffect(() => {
    if (showInbox && rawInboxData && rawInboxData.length > 0) {
      fetchInbox(false, true);
    }
  }, [rawInboxData, showInbox]);

  useEffect(() => {
    const handleMarkAllRead = () => {
      try {
        const saved = localStorage.getItem("steem_hidden_replies");
        if (saved) {
          setHiddenReplies(new Set(JSON.parse(saved)));
        }
      } catch (e) {
        console.error("Failed to mark all as read in reader", e);
      }
    };
    window.addEventListener("steem_mark_all_read", handleMarkAllRead);
    return () => window.removeEventListener("steem_mark_all_read", handleMarkAllRead);
  }, []);

  useEffect(() => {
    if (targetReaderPost) {
      if (targetReaderPost.commentPermlink || targetReaderPost.permlink) {
        setShowInbox(true);
        fetchInbox(true).then(() => {
          setTimeout(() => {
            const targetId = targetReaderPost.commentPermlink || targetReaderPost.permlink;
            const el = document.getElementById(`inbox-item-${targetId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-2", "ring-cyan-500", "bg-cyan-500/10");
              setTimeout(() => {
                el.classList.remove("ring-2", "ring-cyan-500", "bg-cyan-500/10");
              }, 2000);
            }
          }, 500);
        });
      }
    }
  }, [targetReaderPost]);

  return {
    showInbox,
    setShowInbox,
    inbox,
    setInbox,
    hiddenReplies,
    setHiddenReplies,
    inboxLimit,
    loadingInbox,
    isRefreshingInbox,
    parentContext,
    fetchParentContext,
    expandedInboxThreads,
    setExpandedInboxThreads,
    threads,
    loadingThreads,
    fetchThread,
    editingReply,
    setEditingReply,
    showMyReplies,
    setShowMyReplies,
    replyingTo,
    setReplyingTo,
    floatingCommentBody,
    setFloatingCommentBody,
    unreadRepliesCount,
    fetchInbox,
  };
}
