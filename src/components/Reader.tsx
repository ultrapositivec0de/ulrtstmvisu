/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, react-hooks/refs */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import {
  BellRing,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ThumbsUp,
  MessageSquare,
  Edit,
  Edit3,
  Search,
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  Eye,
  Send,
  RefreshCw,
  UserCheck,
  UserX,
  Quote as QuoteIcon,
  X,
  Trash2,
  Settings,
  Bell,
  LogOut,
  Layout,
  Briefcase,
  Zap,
  Hash,
  Inbox,
  ArrowBigUp,
  GitBranch,
  CheckCheck,
  AlertTriangle,
  FileText,
  Share2,
  VolumeX,
  Download,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "../lib/utils";
import { callWithFallback } from "../lib/steem";
import { ReaderConfig, SteemPost } from "../types";
import { getTranslation, type TranslationKey } from "../locales";
import { POPULAR_COMMUNITIES, POPULAR_TAGS } from "../data/communities";

function getWordCounts(body: string) {
  const dirtyWords = body.trim().split(/\s+/).length;
  // Strip Markdown links, images
  const noMdLinks = body
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "");
  // Strip HTML
  const noHtml = noMdLinks.replace(/<[^>]*>/g, " ");
  // Strip special characters except alphanumeric, cyrillic, punctuation inside words
  const cleanText = noHtml
    .replace(/[^\w\u0400-\u04FF]+ /g, " ")
    .replace(/ [^\w\u0400-\u04FF]+/g, " ")
    .trim();
  const cleanWords = cleanText
    ? cleanText.split(/\s+/).filter((w) => w.length > 0).length
    : 0;
  return { clean: cleanWords, dirty: dirtyWords };
}

interface ReaderProps {
  lang?: string;
  t?: (key: TranslationKey) => string;
  onEditPost: (post: SteemPost) => void;
  onComment: (
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    editPermlink?: string,
  ) => Promise<void>;
  onVote: (author: string, permlink: string, weight: number) => Promise<void>;
  currentUser?: string | null;
  onUserUpdate?: (username: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  onDeleteComment?: (author: string, permlink: string) => Promise<void>;
  onMuteUser?: (author: string, mute?: boolean) => Promise<void>;
  mutedUsers?: string[];
  targetReaderPost?: {
    author: string;
    permlink: string;
    commentAuthor?: string;
    commentPermlink?: string;
  } | null;
  rawInboxData?: SteemPost[];
}

const STORAGE_KEY_READER_CONFIG = "steem_reader_config_v1";
const STORAGE_KEY_RESPONDED = "steem_responded_v1";
const STORAGE_KEY_DRAFTS = "steem_reader_drafts_v1";

const ReplyBox = React.memo(
  ({
    id,
    value,
    onChange,
    onSend,
    onCancel,
    placeholder,
    draftKey,
    onUploadImage,
    t,
  }: {
    id?: string;
    value: string;
    onChange: (val: string) => void;
    onSend: (val: string) => Promise<void>;
    onCancel: () => void;
    placeholder?: string;
    draftKey?: string;
    onUploadImage?: (file: File) => Promise<string>;
    t?: (k: TranslationKey) => string;
  }) => {
    const currentLang = (typeof localStorage !== "undefined" ? localStorage.getItem("steem_lang") : null) || "uk";
    const loc = (k: TranslationKey) => t ? t(k) : getTranslation(currentLang, k);
    const resolvedPlaceholder = placeholder || loc("yourReplyPlaceholder");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);

    const loadedDraftKey = useRef<string | null>(null);
    useEffect(() => {
      if (draftKey && !value && loadedDraftKey.current !== draftKey) {
        loadedDraftKey.current = draftKey;
        const saved = localStorage.getItem(STORAGE_KEY_DRAFTS);
        if (saved) {
          const drafts = JSON.parse(saved);
          if (drafts[draftKey]) {
            onChange(drafts[draftKey]);
          }
        }
      }
    }, [draftKey, onChange, value]);

    useEffect(() => {
      if (draftKey) {
        const saved = localStorage.getItem(STORAGE_KEY_DRAFTS);
        const drafts = saved ? JSON.parse(saved) : {};
        if (value) {
          drafts[draftKey] = value;
        } else {
          delete drafts[draftKey];
        }
        localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
      }
    }, [value, draftKey]);

    const handleSend = async () => {
      if (!value.trim()) return;
      setSending(true);
      try {
        await onSend(value);
        onChange(""); // Clear after success
        if (draftKey) {
          const saved = localStorage.getItem(STORAGE_KEY_DRAFTS);
          if (saved) {
            const drafts = JSON.parse(saved);
            delete drafts[draftKey];
            localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
          }
        }
      } finally {
        setSending(false);
      }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onUploadImage) {
        setUploading(true);
        try {
          const url = await onUploadImage(file);
          onChange(
            value +
              (value.endsWith("\n") || !value ? "" : "\n") +
              `![${file.name}](${url})\n`,
          );
        } catch (err) {
          console.error("Upload fail:", err);
        } finally {
          setUploading(false);
          e.target.value = "";
        }
      }
    };

    return (
      <div className="space-y-3 relative">
        {(sending || uploading) && (
          <div className="absolute inset-0 z-10 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center rounded">
            <RefreshCw size={24} className="text-cyan-400 animate-spin" />
          </div>
        )}
        <textarea
          autoFocus
          ref={textareaRef}
          id={id}
          value={value || ""}
          onChange={(e) => {
            onChange(e.target.value || "");
            // Only auto-expand up to 150px, then scroll internally
            const target = e.target as HTMLTextAreaElement;
            if (target.scrollHeight < 150) {
              target.style.height = "inherit";
              target.style.height = `${target.scrollHeight}px`;
            }
          }}
          rows={4}
          className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-[12px] min-h-[120px] max-h-[40vh] md:max-h-[50vh] outline-none focus:ring-1 focus:ring-cyan-500 resize-none font-sans overflow-y-auto transition-all custom-scrollbar"
          placeholder={resolvedPlaceholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey && !sending && value.trim()) {
              handleSend();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar justify-between sm:justify-start pb-1 sm:pb-0">
            {onUploadImage && (
              <label className="cursor-pointer text-slate-500 hover:text-cyan-400 flex items-center gap-1.5 transition-colors">
                <ImageIcon size={18} />
                <span className="text-[10px] hidden sm:inline">{loc("image")}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading || sending}
                />
              </label>
            )}
            <span className="text-[10px] text-slate-500 leading-none">
              {loc("ctrlEnterToSend")}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            {!sending && !uploading && (
              <button
                onClick={onCancel}
                className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300"
              >
                {loc("cancel")}
              </button>
            )}
            <button
              disabled={sending || uploading || !value.trim()}
              onClick={handleSend}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors"
            >
              {sending ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {sending ? loc("sending") : loc("send")}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export default function Reader({
  lang: propLang,
  t: propT,
  onEditPost,
  onComment,
  onVote,
  currentUser,
  onUserUpdate,
  onDeleteComment,
  onUploadImage,
  onMuteUser,
  mutedUsers = [],
  targetReaderPost,
  rawInboxData,
}: ReaderProps) {
  const t = useCallback((k: TranslationKey) => {
    if (propT) return propT(k);
    const currentLang = propLang || (typeof localStorage !== "undefined" ? localStorage.getItem("steem_lang") : null) || "uk";
    return getTranslation(currentLang, k);
  }, [propT, propLang]);

  const [posts, setPosts] = useState<SteemPost[]>(() => {
    try {
      const saved = localStorage.getItem('steem_cached_posts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [respondedReplies, setRespondedReplies] = useState<
    Record<string, string>
  >(() => {
    const saved = localStorage.getItem(STORAGE_KEY_RESPONDED);
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showMyReplies, setShowMyReplies] = useState<Set<string>>(new Set());
  const [threads, setThreads] = useState<Record<string, SteemPost[]>>({});
  const [loadingThreads, setLoadingThreads] = useState<Set<string>>(new Set());
  const [editingReply, setEditingReply] = useState<{
    permlink: string;
    body: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"feed" | "curation" | "settings">(
    "feed",
  );
  const [isReaderHeaderOpen, setIsReaderHeaderOpen] = useState(true);
  const [isCurationSettingsOpen, setIsCurationSettingsOpen] = useState(true);

  // Auto-collapse header when switching to curation mode
  useEffect(() => {
    if (viewMode === "curation") {
      setIsReaderHeaderOpen(false);
    } else {
      setIsReaderHeaderOpen(true);
    }
  }, [viewMode]);
  const [curationTagInput, setCurationTagInput] = useState("");
  const [curationTag, setCurationTag] = useState("");
  const [curationType, setCurationType] = useState<"posts" | "comments">(
    "comments",
  );
  const [curationPosts, setCurationPosts] = useState<SteemPost[]>(() => {
    try {
      const saved = localStorage.getItem('steem_cached_curation_posts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCurationLoading, setIsCurationLoading] = useState(false);
  const [curationError, setCurationError] = useState<string | null>(null);
  const [curationTemplate, setCurationTemplate] = useState(
    t("communityUpvoteGreet"),
  );
  const [selectedForVote, setSelectedForVote] = useState<Set<string>>(
    new Set(),
  );
  const [customWeights, setCustomWeights] = useState<Record<string, number>>(
    {},
  );
  const [curationSort, setCurationSort] = useState<"new" | "length">("new");
  const [curationDays, setCurationDays] = useState<number>(7);
  const [curationColumns, setCurationColumns] = useState<number>(() => {
    const saved = localStorage.getItem("steem_reader_curation_cols");
    return saved ? parseInt(saved) : 2;
  });
  const [batchVotingStatus, setBatchVotingStatus] = useState<{
    current: number;
    total: number;
    active: boolean;
  }>({ current: 0, total: 0, active: false });
  const [autoCommentEnabled, setAutoCommentEnabled] = useState(false);
  const [individualComments, setIndividualComments] = useState<
    Record<string, string>
  >({});

  const [revealedImages, setRevealedImages] = useState<Set<string>>(new Set());

  const [showMutedManager, setShowMutedManager] = useState(false);
  const [loadingMutedManager, setLoadingMutedManager] = useState(false);
  const [fetchedMutedUsers, setFetchedMutedUsers] = useState<string[]>([]);

  const fetchCurationFeed = async (overrideTag?: string | React.MouseEvent) => {
    const tagToUse = (typeof overrideTag === 'string' ? overrideTag : curationTag) || "";
    if (!tagToUse && !config.onlyWhitelist) return;
//
    
    
    setCurationTag(tagToUse);
    setCurationTagInput(tagToUse);
    
    setHasInitiatedCuration(true);
    if (config.excludeMuted && !currentUser) {
      setCurationError(
        t("feedFilteredNickPrompt"),
      );
      setCurationPosts([]);
      return;
    }
    setIsCurationLoading(true);
    setCurationError(null);
    const cleanTag = tagToUse.replace("@", "").trim();

    try {
      // Fetch admin info (delegation etc) if we have the community account
      const results: SteemPost[] = [];
      if (curationType === "comments") {
        let isDone = false;
        let startAuthor = "";
        let startPermlink = "";
        let totalFetched = 0;

        while (!isDone && totalFetched < 2000) {
          const query: any = { start_author: startAuthor || cleanTag, limit: 100 };
          if (startPermlink) {
            query.start_permlink = startPermlink;
          }
          const batch = await callWithFallback(
            "condenser_api.get_discussions_by_comments",
            [query],
          );
          if (!batch || (batch.length <= 1 && startAuthor)) break;
          if (!batch || batch.length === 0) break;

          if (startAuthor) {
            results.push(...batch.slice(1));
            totalFetched += batch.length - 1;
          } else {
            results.push(...batch);
            totalFetched += batch.length;
          }

          const lastPost = batch[batch.length - 1];
          startAuthor = lastPost.author;
          startPermlink = lastPost.permlink;

          const age = Date.now() - new Date(lastPost.created + "Z").getTime();
          if (age > curationDays * 24 * 60 * 60 * 1000) {
            isDone = true;
          }
        }
      } else {
        let isDone = false;
        let startAuthor = "";
        let startPermlink = "";
        let totalFetched = 0;

        while (!isDone && totalFetched < 2000) {
          const query: any = { tag: cleanTag, limit: 100 };
          if (startAuthor) {
            query.start_author = startAuthor;
            query.start_permlink = startPermlink;
          }
          const batch = await callWithFallback(
            "condenser_api.get_discussions_by_created",
            [query],
          );
          if (!batch || (batch.length <= 1 && startAuthor)) break;
          if (!batch || batch.length === 0) break;

          if (startAuthor) {
            results.push(...batch.slice(1));
            totalFetched += batch.length - 1;
          } else {
            results.push(...batch);
            totalFetched += batch.length;
          }

          const lastPost = batch[batch.length - 1];
          startAuthor = lastPost.author;
          startPermlink = lastPost.permlink;

          const age = Date.now() - new Date(lastPost.created + "Z").getTime();
          if (age > curationDays * 24 * 60 * 60 * 1000) {
            isDone = true;
          }
        }
      }

      if (results && Array.isArray(results)) {
        // Deduplicate results by author/permlink
        const uniqueResults = results.filter(
          (p, index, self) =>
            index ===
            self.findIndex(
              (t) => t.author === p.author && t.permlink === p.permlink,
            ),
        );

        // Filter: > N days, already voted, muted
        const now = Date.now();
        const maxAgeMs = curationDays * 24 * 60 * 60 * 1000;

        let filtered = uniqueResults.filter((p) => {
          const age = now - new Date(p.created + "Z").getTime();
          const hasVoted = p.active_votes?.some((v) => v.voter === currentUser);
          // Also handle community mute if we can (bridge API usually flags them)
          const isCommMuted = (p as any).stats?.gray === true;
          const isMuted =
            config.excludeMuted && mutedUsersRef.current.includes(p.author);

          return age < maxAgeMs && !hasVoted && !isCommMuted && !isMuted;
        });

        filtered = filtered.filter(
          (post) => !config.blackList.includes(post.author),
        );

        // Only Whitelist Filtering
        if (config.onlyWhitelist && config.whiteList.length > 0) {
          filtered = filtered.filter((p) =>
            config.whiteList.includes(p.author),
          );
        }

        // Strict Tag Filtering
        if (config.strictTagMode && config.tags.length > 0) {
          filtered = filtered.filter((p) => {
            try {
              const meta = JSON.parse(p.json_metadata);
              const pTags = Array.isArray(meta.tags) ? meta.tags : [];
              // Every config tag must be present in post tags
              return config.tags.every((t) => pTags.includes(t));
            } catch {
              return false;
            }
          });
        }

        if (curationSort === "length") {
          filtered.sort((a, b) => b.body.length - a.body.length);
        }

        setCurationPosts(filtered);
      } else {
        setCurationPosts([]);
      }
    } catch (e: any) {
      console.error("Curation fetch failed:", e);
      setCurationError(e.message || String(e));
    } finally {
      setIsCurationLoading(false);
    }
  };

  const processBatchVotes = async () => {
    const toVote = Array.from(selectedForVote);
    if (toVote.length === 0 || !currentUser) return;

    setBatchVotingStatus({ active: true, current: 0, total: toVote.length });

    for (let i = 0; i < toVote.length; i++) {
      const permlink = toVote[i];
      const post = curationPosts.find((p) => p.permlink === permlink);
      if (!post) continue;

      setBatchVotingStatus((prev) => ({ ...prev, current: i + 1 }));

      try {
        const weight = customWeights[permlink] || voteWeight;
        await handleLocalVote(post.author, post.permlink, weight);

        // Comment handling: Individual comment has priority, then template if enabled
        const customBody = individualComments[permlink];
        const commentBody =
          customBody || (autoCommentEnabled ? curationTemplate : null);

        if (commentBody) {
          await handleLocalComment(post.author, post.permlink, commentBody);
          // Clear individual comment after processing
          if (customBody) {
            setIndividualComments((prev) => {
              const next = { ...prev };
              delete next[permlink];
              return next;
            });
          }
          // Mark as responded
          setRespondedReplies((prev) => ({ ...prev, [permlink]: commentBody }));
        }
      } catch (err) {
        console.error(`Batch vote failed for ${permlink}:`, err);
      }

      // Delay to respect blockchain limits
      await new Promise((r) => setTimeout(r, 3000));
    }

    setBatchVotingStatus({ active: false, current: 0, total: 0 });
    setSelectedForVote(new Set());
    setCurationTemplate("");
    // Refresh feed
    fetchCurationFeed();
  };

  const DEFAULT_READER_CONFIG: ReaderConfig = {
    whiteList: [],
    blackList: [],
    fontSize: 16,
    fontWeight: 400,
    limitPerUser: 5,
    daysLimit: 7,
    tags: ["ukraine"],
    contentWidth: 800,
    excludeMuted: true,
    autoLoadComments: false,
    strictTagMode: false,
    favoriteTags: ["ukraine", "steem", "hive-171319"],
    autoShowInbox: false,
    loadImages: true,
    enableVoteLogging: false,
  };

  const [config, setConfig] = useState<ReaderConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_READER_CONFIG);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_READER_CONFIG,
          ...parsed,
          whiteList: Array.from(new Set(parsed.whiteList || [])),
          blackList: Array.from(new Set(parsed.blackList || [])),
          tags: Array.from(new Set(parsed.tags || [])),
          favoriteTags: Array.from(new Set(parsed.favoriteTags || [])),
        };
      } catch (e) {
        console.error("Failed to parse reader config", e);
      }
    }
    return DEFAULT_READER_CONFIG;
  });

  const [searchTag, setSearchTag] = useState(config.tags.join(" "));
  const [commentingPost, setCommentingPost] = useState<SteemPost | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [quotePosition, setQuotePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [floatingCommentBody, setFloatingCommentBody] = useState("");
  const [postComments, setPostComments] = useState<Record<string, SteemPost[]>>(
    {},
  );
  const [loadingComments, setLoadingComments] = useState<Set<string>>(
    new Set(),
  );
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set(),
  );
  const [hiddenReplies, setHiddenReplies] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`steem_hidden_replies`);
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load hidden replies", e);
    }
    return new Set();
  });

  useEffect(() => {
    if (hiddenReplies.size > 0) {
      // Keep only up to 200 items so localStorage doesn't bloat
      const arr = Array.from(hiddenReplies).slice(-200);
      localStorage.setItem(`steem_hidden_replies`, JSON.stringify(arr));
    }
  }, [hiddenReplies]);

  const [voteWeight, setVoteWeight] = useState(10000); // 100%
  const [showInbox, setShowInbox] = useState(false);
  const [inbox, setInbox] = useState<SteemPost[]>([]);
  const [inboxLimit, setInboxLimit] = useState(50);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [replyingTo, setReplyingTo] = useState<SteemPost | null>(null);
  const [parentContext, setParentContext] = useState<Record<string, SteemPost>>(
    {},
  );
  const [expandedInboxThreads, setExpandedInboxThreads] = useState<Set<string>>(new Set());
  const [loadingContext, setLoadingContext] = useState<Set<string>>(new Set());
  const [isRefreshingInbox, setIsRefreshingInbox] = useState(false);
  const [hasAutoFetchedInbox, setHasAutoFetchedInbox] = useState(false);
  const [hasInitiatedFeed, setHasInitiatedFeed] = useState(false);
  const [hasInitiatedCuration, setHasInitiatedCuration] = useState(false);

  const mutedUsersRef = useRef<string[]>(mutedUsers);
  useEffect(() => {
    mutedUsersRef.current = mutedUsers;
  }, [mutedUsers]);

  // Sync recent comments to highlight replied posts
  useEffect(() => {
    if (currentUser) {
      const syncOwnComments = async () => {
        try {
          let results: SteemPost[] = await callWithFallback(
            "bridge.get_account_posts",
            { sort: "comments", account: currentUser, limit: 100 },
          ).catch(() => null);
          if (!results) {
            const state = await callWithFallback("condenser_api.get_state", [
              `/@${currentUser}/comments`,
            ]).catch(() => null);
            if (state && state.content) {
              results = Object.values(state.content) as SteemPost[];
              results = results.filter((p) => p.author === currentUser);
            } else {
              results = [];
            }
          }

          if (results && Array.isArray(results) && results.length > 0) {
            setRespondedReplies((prev) => {
              const next = { ...prev };
              let changed = false;
              for (const comment of results) {
                if (comment.author === currentUser && comment.parent_permlink && !next[comment.parent_permlink]) {
                  next[comment.parent_permlink] = comment.body;
                  changed = true;
                }
              }
              return changed ? next : prev;
            });
          }
        } catch (err) {
          console.warn("Failed to sync own comments:", err);
        }
      };
      syncOwnComments();
    }
  }, [currentUser]);

  const fetchInbox = async (more: boolean = false, silent: boolean = false) => {
    if (!currentUser) return;

    const newLimit = Math.min(more ? inboxLimit + 50 : 50, 100);
    if (more) setInboxLimit(newLimit);

    if (silent) setIsRefreshingInbox(true);
    else setLoadingInbox(true);
    try {
      let results: SteemPost[] = [];

      if (!more && rawInboxData && rawInboxData.length > 0) {
        results = rawInboxData;
      } else {
        // Get recent replies - fallback to get_state if bridge fails
        results = await callWithFallback("bridge.get_account_posts", {
          sort: "replies",
          account: currentUser,
          limit: newLimit,
        }).catch(() => null);
        if (!results) {
          // Fallback to get_state for nodes that don't support bridge plugin
          const state = await callWithFallback("condenser_api.get_state", [
            `/@${currentUser}/recent-replies`,
          ]).catch(() => null);
          if (state && state.content) {
            results = Object.values(state.content) as SteemPost[];
            // Filter to only get replies to the user, not their own comments
            results = results.filter(
              (p) =>
                p.parent_author === currentUser || p.author !== currentUser,
            );
            results.sort(
              (a, b) =>
                new Date(b.created).getTime() - new Date(a.created).getTime(),
            );
          } else {
            results = [];
          }
        }
      }

      // Also fetch user's last comments to check for responses (last 100 operations to be sure)
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
          // Filtering logic is already applied to rawInboxData, but we re-apply for 'more' fetched nodes
          if (config.onlyWhitelist && config.whiteList.length > 0) {
            if (!config.whiteList.includes(p.author)) return false;
          } else {
            if (config.blackList.includes(p.author)) return false;
          }
          if (config.excludeMuted && mutedUsersRef.current.includes(p.author))
            return false;
          return true;
        })
        .sort(
          (a: SteemPost, b: SteemPost) =>
            new Date(b.created).getTime() - new Date(a.created).getTime(),
        );

      // Deduplicate and enrich with "already replied" status from real blockchain data
      setRespondedReplies((prev) => {
        const next = { ...prev };
        myComments.forEach((c) => {
          if (c.author === currentUser && c.parent_permlink) {
            next[c.parent_permlink] = c.body;
          }
        });
        return next;
      });

      // Deduplicate replies
      const uniqueReplies = replies.filter(
        (p, index, self) =>
          index ===
          self.findIndex(
            (t) => t.author === p.author && t.permlink === p.permlink,
          ),
      );

      setInbox(uniqueReplies);
      const hasUnread = uniqueReplies.some(
        (r) => !hiddenReplies.has(r.permlink),
      );
      return hasUnread;
    } catch (err) {
      console.error("Failed to fetch inbox:", err);
      return false;
    } finally {
      setLoadingInbox(false);
      setIsRefreshingInbox(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, hasAutoFetchedInbox, config.autoShowInbox]);

  // Dynamically filter content once the muted users list is loaded or updated
  useEffect(() => {
    if (config.excludeMuted && mutedUsers.length > 0) {
      setCurationPosts((prev) =>
        prev.filter((p) => !mutedUsers.includes(p.author)),
      );
      setPosts((prev) => prev.filter((p) => !mutedUsers.includes(p.author)));
      setInbox((prev) => prev.filter((p) => !mutedUsers.includes(p.author)));
      setPostComments((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const k in next) {
          const originalLen = next[k].length;
          next[k] = next[k].filter((c) => !mutedUsers.includes(c.author));
          if (next[k].length !== originalLen) changed = true;
        }
        return changed ? next : prev;
      });
    }
  }, [mutedUsers, config.excludeMuted]);

  useEffect(() => {
    localStorage.setItem(
      "steem_reader_curation_cols",
      curationColumns.toString(),
    );
  }, [curationColumns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_READER_CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_RESPONDED,
      JSON.stringify(respondedReplies),
    );
  }, [respondedReplies]);

  useEffect(() => {
    // Only cache up to 50 posts to avoid exceeding localStorage quota
    if (posts && posts.length > 0) {
       localStorage.setItem('steem_cached_posts', JSON.stringify(posts.slice(0, 50)));
    }
  }, [posts]);

  useEffect(() => {
    if (curationPosts && curationPosts.length > 0) {
       localStorage.setItem('steem_cached_curation_posts', JSON.stringify(curationPosts.slice(0, 50)));
    }
  }, [curationPosts]);

  useEffect(() => {
    // Clear selection state when switching posts or closing inbox
    if (!commentingPost) {
      setSelectedText("");
      setQuotePosition(null);
      setFloatingCommentBody("");
      setShowPreview(false);
    }
  }, [commentingPost]);

  const fetchParentContext = async (author: string, permlink: string) => {
    const key = `${author}/${permlink}`;
    if (loadingContext.has(key)) return;

    setLoadingContext((prev) => new Set(prev).add(key));
    try {
      const result = await callWithFallback("condenser_api.get_content", [
        author,
        permlink,
      ]);
      setParentContext((prev) => ({ ...prev, [key]: result }));

      // If the parent also has a parent, we can optionally fetch it too to build the chain
      if (result && result.parent_author) {
        // We don't auto-fetch recursively to save resources, but we could
      }
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

  // Auto-fetch parent context for visible inbox threads
  useEffect(() => {
    if (showInbox && inbox.length > 0) {
      const keysToFetch = inbox
        .filter((r) => !hiddenReplies.has(r.permlink))
        .map((r) => `${r.parent_author}/${r.parent_permlink}`)
        .filter((value, index, self) => self.indexOf(value) === index) // unique keys
        .slice(0, 15); // limit to first 15 threads to avoid overloading
      
      keysToFetch.forEach((key) => {
        const [p_author, p_permlink] = key.split('/');
        if (p_author && p_permlink && !parentContext[key] && !loadingContext.has(key)) {
          fetchParentContext(p_author, p_permlink);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInbox, inbox, hiddenReplies, parentContext, loadingContext]);


  const fetchThread = async (author: string, permlink: string) => {
    setLoadingThreads((prev) => new Set(prev).add(permlink));
    try {
      // Simple thread view: get the content and its replies
      const post: SteemPost = await callWithFallback(
        "condenser_api.get_content",
        [author, permlink],
      );
      const replies: SteemPost[] = await callWithFallback(
        "condenser_api.get_content_replies",
        [author, permlink],
      );
      const filteredReplies = [post, ...replies].filter((p) => {
        if (config.onlyWhitelist && config.whiteList.length > 0) {
          if (!config.whiteList.includes(p.author)) return false;
        } else {
          if (config.blackList.includes(p.author)) return false;
        }
        return !(
          config.excludeMuted && mutedUsersRef.current.includes(p.author)
        );
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

  const fetchComments = async (author: string, permlink: string) => {
    setLoadingComments((prev) => {
      const next = new Set(prev);
      next.add(permlink);
      return next;
    });
    try {
      const result: SteemPost[] = await callWithFallback(
        "condenser_api.get_content_replies",
        [author, permlink],
      );
      // Filter out muted users
      const filtered = result.filter((c) => {
        if (config.onlyWhitelist && config.whiteList.length > 0) {
          if (!config.whiteList.includes(c.author)) return false;
        } else {
          if (config.blackList.includes(c.author)) return false;
        }
        const isMuted =
          config.excludeMuted && mutedUsersRef.current.includes(c.author);
        return !isMuted;
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

  const handleLocalVote = async (
    author: string,
    permlink: string,
    weight: number,
  ) => {
    // Optimistic update for posts
    setPosts((prev) =>
      prev.map((p) => {
        if (p.author === author && p.permlink === permlink) {
          const hasVoted = p.active_votes.some((v) => v.voter === currentUser);
          if (!hasVoted) {
            return {
              ...p,
              active_votes: [...p.active_votes, { voter: currentUser || "", weight }],
            };
          }
        }
        return p;
      }),
    );

    // Optimistic update for inbox
    setInbox((prev) =>
      prev.map((p) => {
        if (p.author === author && p.permlink === permlink) {
          const hasVoted = p.active_votes.some((v) => v.voter === currentUser);
          if (!hasVoted) {
            return {
              ...p,
              active_votes: [...p.active_votes, { voter: currentUser || "", weight }],
            };
          }
        }
        return p;
      }),
    );

    // Optimistic update for comments
    setPostComments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = next[key].map((c) => {
          if (c.author === author && c.permlink === permlink) {
            const hasVoted = c.active_votes.some(
              (v) => v.voter === currentUser,
            );
            if (!hasVoted) {
              return {
                ...c,
                active_votes: [
                  ...c.active_votes,
                  { voter: currentUser || "", weight },
                ],
              };
            }
          }
          return c;
        });
      });
      return next;
    });

    // Optimistic update for curation
      setCurationPosts((prev) =>
      prev.map((p) => {
        if (p.author === author && p.permlink === permlink) {
          const hasVoted = p.active_votes?.some((v) => v.voter === currentUser);
          if (!hasVoted) {
            return {
              ...p,
              active_votes: [
                ...(p.active_votes || []),
                { voter: currentUser || "", weight },
              ],
            };
          }
        }
        return p;
      }),
    );

    try {
      await onVote(author, permlink, weight);

      if (config.enableVoteLogging) {
        try {
          const logsStr = localStorage.getItem('steem_vote_logs');
          const logs = logsStr ? JSON.parse(logsStr) : [];
          
          let isComment = true;
          // Improved identification check
          const foundInPosts = posts.find(p => p.author === author && p.permlink === permlink);
          const foundInCuration = curationPosts.find(p => p.author === author && p.permlink === permlink);
          const foundInInbox = inbox.find(p => p.author === author && p.permlink === permlink);
          const foundInComments = Object.values(postComments).flat().find((p: SteemPost) => p.author === author && p.permlink === permlink);
          
          const target = foundInPosts || foundInCuration || foundInInbox || foundInComments;
          if (target && target.parent_author === '') {
             isComment = false;
          }

          logs.push({
            author,
            permlink,
            weight: weight / 100, // convert 10000 to 100%
            isComment,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem('steem_vote_logs', JSON.stringify(logs));
        } catch(e) {
          console.error("Failed to log vote", e);
        }
      }
    } catch (err) {
      // Revert if failed? (For now just log, full revert is complex)
      console.error("Vote failed:", err);
    }
  };

  const handleLocalComment = async (
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    editPermlink?: string,
  ) => {
    try {
      if (!currentUser) {
        alert("Please specify your username in settings first!");
        return;
      }

      const tempPermlink = editPermlink || `re-${parentAuthor.replace(/\./g, '')}-${Date.now()}`;
      const optimisticComment: SteemPost = {
        author: currentUser,
        permlink: tempPermlink,
        category: "",
        title: "",
        body: body,
        json_metadata: JSON.stringify({ tags: [], app: "steem-editor", format: "markdown" }),
        created: new Date().toISOString().replace('Z', ''),
        active_votes: [],
        children: 0,
        parent_author: parentAuthor,
        parent_permlink: parentPermlink
      };

      // Optimistically append the comment to postComments state immediately
      setPostComments((prev) => {
        const list = prev[parentPermlink] || [];
        if (list.some((c) => c.permlink === tempPermlink)) return prev;
        return {
          ...prev,
          [parentPermlink]: [...list, optimisticComment]
        };
      });

      // Optimistically increment the children count of the parent post
      setPosts((prev) =>
        prev.map((p) => {
          if (p.permlink === parentPermlink) {
            return { ...p, children: p.children + 1 };
          }
          return p;
        })
      );
      setCurationPosts((prev) =>
        prev.map((p) => {
          if (p.permlink === parentPermlink) {
            return { ...p, children: p.children + 1 };
          }
          return p;
        })
      );

      // Submit comment to the blockchain
      await onComment(parentAuthor, parentPermlink, body, editPermlink);

      // Set responded status instantly for quick feedback
      setRespondedReplies((prev) => ({
        ...prev,
        [parentPermlink]: body,
      }));

      // Hide from inbox if we just responded to a message there
      setHiddenReplies((prev) => new Set(prev).add(parentPermlink));

      // Fetch the verified comments list after a short delay to let the blockchain process it
      setTimeout(() => {
        fetchComments(parentAuthor, parentPermlink);
      }, 4000);

      // Silently refresh the inbox in the background after a short delay
      if (showInbox) {
        setTimeout(() => {
          fetchInbox(false, true);
        }, 3000);
      }
    } catch (err) {
      console.error("Comment failed:", err);
    }
  };

  useEffect(() => {
    if (showInbox && rawInboxData && rawInboxData.length > 0) {
      // Refresh inbox silently when new global data arrives
      fetchInbox(false, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawInboxData, showInbox]);

  useEffect(() => {
    const handleMarkAllRead = () => {
      try {
        const saved = localStorage.getItem('steem_hidden_replies');
        if (saved) {
          setHiddenReplies(new Set(JSON.parse(saved)));
        }
      } catch (e) {
        console.error("Failed to mark all as read in reader", e);
      }
    };
    window.addEventListener("steem_mark_all_read", handleMarkAllRead);
    return () =>
      window.removeEventListener("steem_mark_all_read", handleMarkAllRead);
  }, []);

  useEffect(() => {
    if (targetReaderPost) {
      if (targetReaderPost.commentPermlink || targetReaderPost.permlink) {
        setShowInbox(true);
        fetchInbox(true).then(() => {
          setTimeout(() => {
            const targetId =
              targetReaderPost.commentPermlink || targetReaderPost.permlink;
            const el = document.getElementById(`inbox-item-${targetId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-2", "ring-cyan-500", "bg-cyan-500/10");
              setTimeout(
                () =>
                  el.classList.remove(
                    "ring-2",
                    "ring-cyan-500",
                    "bg-cyan-500/10",
                  ),
                2000,
              );
            }
          }, 500);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetReaderPost]);

  const fetchPosts = useCallback(async () => {
    const currentSearchTags = searchTag.split(" ").filter(Boolean);
    const activeTags = currentSearchTags.length > 0 ? currentSearchTags : config.tags;
    
    if (activeTags.length === 0) return;
    
    // Sync config if it differs
    if (currentSearchTags.length > 0 && currentSearchTags.join(" ") !== config.tags.join(" ")) {
      setConfig((c) => ({ ...c, tags: currentSearchTags }));
    }

    setHasInitiatedFeed(true);
    setLoading(true);
    try {
      const query = {
        tag: activeTags[0],
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
          (post) => !mutedUsersRef.current.includes(post.author),
        );
      }

      if (config.onlyWhitelist && config.whiteList.length > 0) {
        filtered = filtered.filter((post) =>
          config.whiteList.includes(post.author),
        );
      }

      const userCounts: Record<string, number> = {};
      filtered = filtered.filter((post) => {
        userCounts[post.author] = (userCounts[post.author] || 0) + 1;
        return userCounts[post.author] <= config.limitPerUser;
      });

      // After filtering by date, filter by muted
      if (config.excludeMuted) {
        filtered = filtered.filter(
          (p) => !mutedUsersRef.current.includes(p.author),
        );
      }

      // Deduplicate posts
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
  }, [config, searchTag]);

  useEffect(() => {
    setSearchTag(config.tags.join(" "));
  }, [config.tags]);

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

  const handleMouseUp = (
    post: SteemPost,
    e?: React.MouseEvent | MouseEvent,
  ) => {
    const selection = window.getSelection();

    // Check if we clicked inside the floating menu/tooltip or any text input area
    const target =
      (e?.target as HTMLElement) || (window.event?.target as HTMLElement);
    if (
      target?.closest(".floating-reply-tooltip") ||
      target?.closest(".inline-reply-container") ||
      target?.tagName === "TEXTAREA" ||
      target?.tagName === "INPUT"
    ) {
      return;
    }

    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects.length === 0) return;

      const rect = rects[0]; // Use first rect for stability
      const x = rect.left + rect.width / 2;
      const y = rect.top; // Keep Y simple relative to the viewport

      setSelectedText(selection.toString().trim());
      setQuotePosition({ x, y: y - 8 }); // Small offset above

      if (commentingPost?.permlink !== post.permlink) {
        setFloatingCommentBody("");
      }

      setCommentingPost(post);
    } else {
      // If clicking outside and not on a menu, clear it
      const target = window.event?.target as HTMLElement;
      if (
        !target?.closest(".floating-reply-tooltip") &&
        !target?.closest(".inline-reply-container") &&
        !target?.closest(".post-actions")
      ) {
        setQuotePosition(null);
        setCommentingPost(null);
        setSelectedText("");
      }
    }
  };

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipOffset, setTooltipOffset] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (quotePosition && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const padding = 15;
      let dx = 0;
      let dy = 0;

      // Check horizontals
      if (rect.left < padding) dx = padding - rect.left;
      else if (rect.right > window.innerWidth - padding)
        dx = window.innerWidth - padding - rect.right;

      // Check verticals
      if (rect.top < padding) {
        // If it goes above, we might want to flip it to be below the selection or just shift it
        // Shifting down for now
        dy = padding - rect.top;
      } else if (rect.bottom > window.innerHeight - padding) {
        dy = window.innerHeight - padding - rect.bottom;
      }

      if (dx !== 0 || dy !== 0) {
        setTooltipOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }
    } else if (!quotePosition) {
      setTooltipOffset({ x: 0, y: 0 });
    }
  }, [quotePosition, floatingCommentBody, showPreview]);

  const handleQuote = () => {
    if (selectedText && commentingPost) {
      setShowPreview(false);
      if (viewMode === "curation") {
        const permlink = commentingPost.permlink;
        setSelectedForVote((prev) => new Set(prev).add(permlink));

        let fullLength = 0;
        let nextValue = "";
        setIndividualComments((prev) => {
          const current = prev[permlink] || "";
          // Ensure a double newline if there's already text to keep it separated
          let prefix = "";
          if (current) {
            if (current.endsWith("\n\n")) prefix = "";
            else if (current.endsWith("\n")) prefix = "\n";
            else prefix = "\n\n";
          }
          const quote = `> ${selectedText}\n\n`;
          const next = current + prefix + quote;
          fullLength = next.length;
          nextValue = next;
          return { ...prev, [permlink]: next };
        });

        // Focus and scroll to the textarea after a short delay to allow layout to settle
        setTimeout(() => {
          const el = document.getElementById(
            `curation-comment-${permlink}`,
          ) as HTMLTextAreaElement;
          if (el) {
            if (el.value !== nextValue) el.value = nextValue;
            el.focus();
            // Move cursor to the end
            el.setSelectionRange(fullLength, fullLength);
            // Scroll into view
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 150);
      } else {
        setFloatingCommentBody((prev) => {
          let prefix = "";
          if (prev) {
            if (prev.endsWith("\n\n")) prefix = "";
            else if (prev.endsWith("\n")) prefix = "\n";
            else prefix = "\n\n";
          }
          const quote = `> ${selectedText}\n\n`;
          const next = prev + prefix + quote;

          // Focus the floating editor's textarea
          setTimeout(() => {
            const el = document.getElementById(
              "floating-reply-textarea",
            ) as HTMLTextAreaElement;
            if (el) {
              if (el.value !== next) el.value = next;
              el.focus();
              el.setSelectionRange(next.length, next.length);
            }
          }, 150);

          return next;
        });
      }
      window.getSelection()?.removeAllRanges();
    }
  };

  const insertFloatingText = (before: string, after: string = "") => {
    const textarea = document.getElementById(
      "floating-reply-textarea",
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;

    setFloatingCommentBody(
      text.substring(0, start) + replacement + text.substring(end),
    );

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
      }
    }, 50);
  };

  const insertText = (before: string, after: string = "") => {
    const textarea = document.getElementById(
      "inline-comment-editor",
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;

    setCommentBody(
      text.substring(0, start) + replacement + text.substring(end),
    );

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
      }
    }, 50);
  };

  const handleEdit = (post: SteemPost) => {
    onEditPost(post);
  };

  const renderContent = (body: string, permlink?: string) => {
    if (!marked || !DOMPurify) return body;
    let html = marked.parse(body) as string;

    const shouldLoadImages =
      config.loadImages !== false || (permlink && revealedImages.has(permlink));

    if (!shouldLoadImages) {
      // Replace image tags with a placeholder hint
      html = html.replace(
        /<img[^>]*>/g,
        '<div class="image-blocked-placeholder">${t("imageHiddenBlocked")}</div>',
      );
    }

    // Add referrerpolicy="no-referrer" to all img tags
    html = html.replace(/<img /g, '<img referrerpolicy="no-referrer" ');
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <AnimatePresence initial={false}>
          {isReaderHeaderOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      size={18}
                    />
                    <input
                      type="text"
                      value={searchTag || ""}
                      onChange={(e) => setSearchTag(e.target.value)}
                      placeholder={t("searchFeedTags")}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {onUserUpdate && (
                    <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden h-[34px]">
                      {currentUser ? (
                        <>
                          <div className="px-2 text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                            <UserCheck size={16} />
                            <span className="truncate max-w-[80px]">
                              {currentUser}
                            </span>
                          </div>
                          <button
                            onClick={() => onUserUpdate("")}
                            className="p-2 hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors border-l border-slate-700"
                            title={t("changeAccount")}
                          >
                            <LogOut size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="px-2 text-[10px] text-slate-500 font-bold uppercase">
                            Guest
                          </div>
                          <input
                            type="text"
                            placeholder={t("usernamePlaceholder")}
                            className="bg-transparent border-none outline-none px-2 text-xs w-24 text-cyan-400 placeholder:text-slate-600"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onUserUpdate(
                                  (e.target as HTMLInputElement).value,
                                );
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value) onUserUpdate(e.target.value);
                            }}
                          />
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 p-1 bg-slate-800 rounded-lg border border-slate-700">
                    <button
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          fontSize: Math.max(12, c.fontSize - 1),
                        }))
                      }
                      className="p-1 px-2 hover:bg-slate-700 rounded transition-colors text-xs font-bold"
                    >
                      A-
                    </button>
                    <div className="w-10 text-center text-[10px] font-mono text-slate-500 border-x border-slate-700">
                      {config.fontSize}px
                    </div>
                    <button
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          fontSize: Math.min(24, c.fontSize + 1),
                        }))
                      }
                      className="p-1 px-2 hover:bg-slate-700 rounded transition-colors text-xs font-bold"
                    >
                      A+
                    </button>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 h-[34px]">
                    <ThumbsUp size={18} className="text-cyan-400" />
                    <input
                      type="range"
                      min="100"
                      max="10000"
                      step="100"
                      value={voteWeight}
                      onChange={(e) => setVoteWeight(parseInt(e.target.value))}
                      className="w-16 h-1 accent-cyan-500"
                    />
                    <span className="text-[10px] font-mono text-cyan-400 w-6">
                      {(voteWeight / 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-1 sm:px-4 pb-2 pt-2 flex items-center justify-between overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setViewMode("feed")}
              className={cn(
                "px-2 sm:px-4 py-1.5 rounded-t-lg transition-all text-xs font-bold flex items-center gap-1 sm:gap-2 border-b-2 shrink-0",
                viewMode === "feed"
                  ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-300",
              )}
            >
              <Layout size={18} /> <span className="hidden sm:inline">{t("feed")}</span>
            </button>
            <button
              onClick={() => {
                setViewMode("curation");
              }}
              className={cn(
                "px-2 sm:px-4 py-1.5 rounded-t-lg transition-all text-xs font-bold flex items-center gap-1 sm:gap-2 border-b-2 shrink-0",
                viewMode === "curation"
                  ? "border-purple-500 text-purple-400 bg-purple-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-300",
              )}
            >
              <Briefcase size={18} /> <span className="hidden lg:inline">{t("curationDashboard")}</span><span className="hidden sm:inline lg:hidden">{t("curation")}</span>
            </button>
            <button
              onClick={() => {
                setViewMode("settings");
              }}
              className={cn(
                "px-2 sm:px-4 py-1.5 rounded-t-lg transition-all text-xs font-bold flex items-center gap-1 sm:gap-2 border-b-2 shrink-0",
                viewMode === "settings"
                  ? "border-white text-white bg-slate-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-300",
              )}
            >
              <Settings size={18} /> <span className="hidden sm:inline">{t("settings")}</span>
            </button>

            <button
              onClick={() => setIsReaderHeaderOpen(!isReaderHeaderOpen)}
              className="ml-2 w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              title={isReaderHeaderOpen ? t("collapseHeader") : t("expandHeader")}
            >
              {isReaderHeaderOpen ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
            {(viewMode === "feed" || viewMode === "curation") && (
              <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                <button
                  onClick={() => {
                     const postList = viewMode === "feed" ? posts : curationPosts;
                     setExpandedPosts(new Set(postList.map((p) => p.permlink)));
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded text-[10px] font-bold transition-colors flex items-center gap-1"
                  title={t("expandAll")}
                >
                  <ChevronDown size={18} />
                  <span className="hidden md:inline">Expand All</span>
                </button>
                <div className="w-px h-3 bg-slate-700 mx-0.5" />
                <button
                  onClick={() => setExpandedPosts(new Set())}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded text-[10px] font-bold transition-colors flex items-center gap-1"
                  title={t("collapseAll")}
                >
                  <ChevronUp size={18} />
                  <span className="hidden md:inline">Collapse All</span>
                </button>
              </div>
            )}
            
            {viewMode === "feed" && (
              <>
                <button
                  onClick={fetchPosts}
                  disabled={loading}
                  className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
                >
                  <RefreshCw
                    size={20}
                    className={cn(loading && "animate-spin")}
                  />
                </button>
              </>
            )}
            {viewMode === "curation" && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">
                  <Hash size={16} className="text-slate-500" />
                  <input
                    className="bg-transparent border-none outline-none text-xs text-white p-0.5 w-24"
                    value={curationTagInput || ""}
                    onChange={(e) => setCurationTagInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && fetchCurationFeed(curationTagInput.trim())
                    }
                    placeholder="#hive-145157"
                  />
                </div>
                <button
                  onClick={() => fetchCurationFeed(curationTagInput.trim())}
                  disabled={isCurationLoading}
                  className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-all border border-slate-700"
                >
                  <RefreshCw
                    size={20}
                    className={cn(isCurationLoading && "animate-spin")}
                  />
                </button>
              </div>
            )}
            <div className="w-px h-4 bg-slate-800" />
            <button
              onClick={() =>
                setConfig((c) => ({ ...c, autoShowInbox: !c.autoShowInbox }))
              }
              className={cn(
                "px-2 py-1 flex items-center gap-1 rounded text-[9px] font-bold transition-all border shrink-0",
                config.autoShowInbox
                  ? "bg-cyan-600/20 text-cyan-400 border-cyan-500/30"
                  : "text-slate-500 border-slate-800 hover:bg-slate-800",
              )}
              title={t("autoShowInboxTitle")}
            >
              <BellRing size={16} className={cn(!config.autoShowInbox && "opacity-50")} /><span className="hidden sm:inline">Auto-Inbox: {config.autoShowInbox ? "ON" : "OFF"}</span>
            </button>
            <button
              onClick={() => setShowInbox(!showInbox)}
              className={cn(
                "p-1.5 rounded-lg transition-colors relative",
                showInbox
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:bg-slate-800",
              )}
            >
              <Inbox size={20} />
              {inbox.some((r) => !hiddenReplies.has(r.permlink)) && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)] rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showInbox && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed inset-y-0 right-0 z-[9999] w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col pointer-events-auto"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Bell
                    size={20}
                    className={cn(
                      "text-cyan-400",
                      isRefreshingInbox && "animate-pulse",
                    )}
                  />
                  Recent Replies
                </h2>
                {inbox.filter((r) => !hiddenReplies.has(r.permlink)).length >
                  0 && (
                  <button
                    onClick={() => {
                      const visiblePermlinks = inbox
                        .filter((r) => !hiddenReplies.has(r.permlink))
                        .map((r) => r.permlink);
                      setHiddenReplies((prev) => {
                        const next = new Set(prev);
                        visiblePermlinks.forEach((p) => next.add(p));
                        return next;
                      });
                    }}
                    className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-1 ml-2 transition-colors px-2 py-1 bg-slate-800/50 rounded-lg hover:bg-red-500/10"
                  >
                    <CheckCheck size={16} /> {t("markAllRead")}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentUser && (
                  <button
                    onClick={() => fetchInbox(true)}
                    className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-cyan-500 transition-colors"
                  >
                    <RefreshCw
                      size={18}
                      className={cn(
                        (loadingInbox || isRefreshingInbox) && "animate-spin",
                      )}
                    />
                  </button>
                )}
                <button
                  onClick={() => setShowInbox(false)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {!currentUser ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-8">
                  <UserX size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold text-slate-300 mb-1">
                    Login Required
                  </p>
                  <p className="text-xs">
                    Please login in the Vault or Enter your username to see
                    replies.
                  </p>
                </div>
              ) : loadingInbox ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                  <RefreshCw className="animate-spin mb-2" />
                  <p className="text-xs">{t("loadingReplies")}</p>
                </div>
              ) : inbox.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <p>{t("noRepliesFound")}</p>
                  <button
                    onClick={() => fetchInbox(false)}
                    className="mt-4 text-xs text-cyan-500 hover:underline"
                  >
                    Check again
                  </button>
                </div>
              ) : (
                (() => {
                  const groupedMap: Record<string, SteemPost[]> = {};
                  inbox
                    .filter((r) => !hiddenReplies.has(r.permlink))
                    .forEach((reply) => {
                      const key = `${reply.parent_author}/${reply.parent_permlink}`;
                      if (!groupedMap[key]) {
                        groupedMap[key] = [];
                      }
                      groupedMap[key].push(reply);
                    });

                  const sortedThreadKeys = Object.keys(groupedMap).sort((keyA, keyB) => {
                    const latestA = Math.max(...groupedMap[keyA].map(r => new Date(r.created).getTime()));
                    const latestB = Math.max(...groupedMap[keyB].map(r => new Date(r.created).getTime()));
                    return latestB - latestA;
                  });

                  return sortedThreadKeys.map((threadKey) => {
                    const threadReplies = groupedMap[threadKey];
                    const sortedReplies = [...threadReplies].sort(
                      (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
                    );
                    
                    const firstReply = sortedReplies[0];
                    const isThreadExpanded = expandedInboxThreads.has(threadKey);
                    
                    const visibleReplies = isThreadExpanded 
                      ? sortedReplies 
                      : [sortedReplies[sortedReplies.length - 1]];
                    const hiddenCount = sortedReplies.length - visibleReplies.length;

                    return (
                      <div
                        key={threadKey}
                        className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-4 relative group/thread hover:border-slate-700/50 transition-colors"
                      >
                        {/* Thread Context Header */}
                        <div className="border-b border-slate-800/60 pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
                              <GitBranch size={12} className="text-cyan-500/80 rotate-180" />
                              {t("threadDialog")} @{firstReply.parent_author}
                            </span>
                            
                            <button
                              onClick={() => {
                                setHiddenReplies((prev) => {
                                  const next = new Set(prev);
                                  threadReplies.forEach((r) => next.add(r.permlink));
                                  return next;
                                });
                              }}
                              className="text-[10px] text-slate-500 hover:text-red-400 opacity-0 group-hover/thread:opacity-100 transition-opacity flex items-center gap-1"
                              title={t("markThreadAsRead")}
                            >
                              <X size={14} /> {t("hideThread")}
                            </button>
                          </div>

                          {(() => {
                            const chains = [];
                            let currentParentKey = threadKey;
                            let currentParent = parentContext[currentParentKey];
                            let depth = 0;
                            
                            while (currentParent && depth < 4) {
                              const p = currentParent;
                              const nextKey = `${p.parent_author}/${p.parent_permlink}`;
                              
                              chains.unshift(
                                <div
                                  key={`${p.author}/${p.permlink}`}
                                  className="p-3 mb-2 bg-slate-900/60 rounded-xl border border-slate-800/50 text-[11px] text-slate-350 italic"
                                >
                                  <div className="flex justify-between items-center mb-1 text-[10px]">
                                    <span className="font-bold text-cyan-400">@{p.author}:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-500">
                                        {new Date(p.created + "Z").toLocaleString()}
                                      </span>
                                      {p.parent_author && p.parent_author !== "" && (
                                        <button
                                          onClick={() => {
                                            fetchParentContext(p.parent_author, p.parent_permlink);
                                          }}
                                          className="text-cyan-500 hover:text-cyan-400 underline font-semibold cursor-pointer"
                                        >
                                          {t("contextUp")}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="line-clamp-3 text-slate-400 font-sans">
                                    {p.body.replace(/[#*`>_-]/g, '').substring(0, 160)}
                                    {p.body.length > 160 ? "..." : ""}
                                  </div>
                                </div>
                              );
                              
                              if (!p.parent_author || p.parent_author === '') break;
                              currentParentKey = nextKey;
                              currentParent = parentContext[currentParentKey];
                              depth++;
                            }

                            if (chains.length === 0) {
                              return (
                                <div className="flex items-center justify-between text-[11px] text-slate-500 p-2 bg-slate-900/30 rounded-xl">
                                  <span>{t("contextLoading")}</span>
                                  <button
                                    onClick={() => {
                                      const [pa, pp] = threadKey.split('/');
                                      fetchParentContext(pa, pp);
                                    }}
                                    className="text-[10px] text-cyan-500 hover:underline"
                                  >
                                    {t("refreshContext")}
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-1.5 border-l-2 border-slate-800/85 pl-3">
                                {chains}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Collapsed comments indicator */}
                        {hiddenCount > 0 && (
                          <button
                            onClick={() => {
                              setExpandedInboxThreads((prev) => {
                                const next = new Set(prev);
                                next.add(threadKey);
                                return next;
                              });
                            }}
                            className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800/80 rounded-xl text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ChevronDown size={14} />
                            {t("showMoreComments")} ({hiddenCount}) {t("inThisThread")}
                          </button>
                        )}

                        {/* Expanded state collapse button */}
                        {isThreadExpanded && sortedReplies.length > 1 && (
                          <button
                            onClick={() => {
                              setExpandedInboxThreads((prev) => {
                                const next = new Set(prev);
                                next.delete(threadKey);
                                return next;
                              });
                            }}
                            className="w-full py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 hover:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ChevronUp size={14} />
                            {t("collapseThread")}
                          </button>
                        )}

                        {/* List of visible replies */}
                        <div className="space-y-3">
                          {visibleReplies.map((reply) => {
                            const myReply = respondedReplies[reply.permlink];
                            const isReplyExpanded = expandedReplies.has(reply.permlink);
                            const isLong = reply.body.length > 300;
                            const displayBody =
                              isLong && !isReplyExpanded
                                ? reply.body.substring(0, 300) + "..."
                                : reply.body;

                            return (
                              <div
                                key={reply.permlink}
                                id={`inbox-item-${reply.permlink}`}
                                className="p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl space-y-2 relative group/item"
                              >
                                <button
                                  onClick={() =>
                                    setHiddenReplies((prev) =>
                                      new Set(prev).add(reply.permlink),
                                    )
                                  }
                                  className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                  title={t("hideThisComment")}
                                >
                                  <X size={14} />
                                </button>

                                <div className="flex items-center justify-between pr-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-cyan-400">
                                      @{reply.author}
                                    </span>
                                    {new Date(reply.created + "Z").getTime() >
                                      Date.now() - 24 * 60 * 60 * 1000 && (
                                      <span className="text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full font-bold uppercase animate-pulse">
                                        New
                                      </span>
                                    )}
                                    {myReply && (
                                      <span className="flex items-center gap-0.5 text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        <UserCheck size={8} /> Replied
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(reply.created + "Z").toLocaleString()}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div
                                    className="text-xs markdown-body opacity-90"
                                    dangerouslySetInnerHTML={{
                                      __html: renderContent(
                                        displayBody,
                                        reply.permlink,
                                      ),
                                    }}
                                  />
                                  {config.loadImages === false &&
                                    !revealedImages.has(reply.permlink) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRevealedImages((prev) =>
                                            new Set(prev).add(reply.permlink),
                                          );
                                        }}
                                        className="flex items-center gap-2 px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded text-[10px] text-cyan-400 font-bold transition-all border border-cyan-500/10"
                                      >
                                        <ImageIcon size={16} /> {t("showPhoto")}
                                      </button>
                                    )}
                                  {isLong && (
                                    <button
                                      onClick={() =>
                                        setExpandedReplies((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(reply.permlink))
                                            next.delete(reply.permlink);
                                          else next.add(reply.permlink);
                                          return next;
                                        })
                                      }
                                      className="text-[10px] text-cyan-500 hover:text-cyan-400 font-bold uppercase tracking-tighter"
                                    >
                                      {isReplyExpanded ? "Show Less" : "Show More..."}
                                    </button>
                                  )}
                                </div>

                                {reply.children > 0 && !threads[reply.permlink] && (
                                  <button
                                    onClick={() =>
                                      fetchThread(reply.author, reply.permlink)
                                    }
                                    disabled={loadingThreads.has(reply.permlink)}
                                    className="w-full py-1 bg-slate-900 border border-slate-800/60 rounded text-[10px] text-slate-400 hover:text-cyan-400 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                                  >
                                    {loadingThreads.has(reply.permlink) ? (
                                      <RefreshCw size={12} className="animate-spin" />
                                    ) : (
                                      <GitBranch size={12} />
                                    )}
                                    Show full thread ({reply.children} replies)
                                  </button>
                                )}

                                {threads[reply.permlink] && (
                                  <div className="space-y-2 pl-2 border-l border-slate-700 mt-2 relative">
                                    <button
                                      onClick={() =>
                                        setThreads((prev) => {
                                          const next = { ...prev };
                                          delete next[reply.permlink];
                                          return next;
                                        })
                                      }
                                      className="absolute -right-1 -top-2 p-1 bg-slate-900 border border-slate-800 rounded-full text-slate-500 hover:text-red-400 shadow-lg"
                                      title={t("collapseThread")}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    {threads[reply.permlink].map((item) => (
                                      <div
                                        key={`${item.author}/${item.permlink}`}
                                        className={cn(
                                          "p-2 rounded text-[10px] space-y-1 group",
                                          item.author === currentUser
                                            ? "bg-cyan-500/5 border border-cyan-500/10"
                                            : "bg-slate-900/50",
                                        )}
                                      >
                                        <div className="flex justify-between items-center opacity-60">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={cn(
                                                "font-bold",
                                                item.author === currentUser
                                                  ? "text-cyan-400"
                                                  : "text-slate-400",
                                              )}
                                            >
                                              @{item.author}
                                            </span>
                                            {item.author === currentUser ? (
                                              <button
                                                onClick={() =>
                                                  setEditingReply({
                                                    permlink: item.permlink,
                                                    body: item.body,
                                                  })
                                                }
                                                className="hidden group-hover:block text-[8px] text-yellow-500/70 hover:text-yellow-400 uppercase font-bold"
                                              >
                                                Edit
                                              </button>
                                            ) : (
                                              <div className="hidden group-hover:flex items-center gap-2">
                                                <button
                                                  onClick={() =>
                                                    handleLocalVote(
                                                      item.author,
                                                      item.permlink,
                                                      voteWeight,
                                                    )
                                                  }
                                                  className="text-[8px] text-cyan-500/70 hover:text-cyan-400 font-bold uppercase"
                                                >
                                                  Vote
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setReplyingTo(item);
                                                    setFloatingCommentBody(
                                                      `> ${item.body.substring(0, 100)}${item.body.length > 100 ? "..." : ""}\n\n`,
                                                    );
                                                  }}
                                                  className="text-[8px] text-green-500/70 hover:text-green-400 font-bold uppercase"
                                                >
                                                  Reply
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          <span>
                                            {new Date(item.created + "Z").toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        </div>
                                        {editingReply?.permlink === item.permlink ? (
                                          <div className="space-y-2 mt-1">
                                            <ReplyBox
                                              value={editingReply.body}
                                              onChange={(txt) =>
                                                setEditingReply((prev) =>
                                                  prev ? { ...prev, body: txt } : null,
                                                )
                                              }
                                              placeholder={t("editCommentPlaceholder")}
                                              onUploadImage={onUploadImage}
                                              onCancel={() => setEditingReply(null)}
                                              onSend={async (body) => {
                                                await handleLocalComment(
                                                  item.parent_author,
                                                  item.parent_permlink,
                                                  body,
                                                  editingReply.permlink,
                                                );
                                                setEditingReply(null);
                                                fetchThread(reply.author, reply.permlink);
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <>
                                            <div
                                              className="markdown-body text-[10px]"
                                              dangerouslySetInnerHTML={{
                                                __html: renderContent(item.body, item.permlink),
                                              }}
                                            />
                                            {config.loadImages === false &&
                                              !revealedImages.has(item.permlink) && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRevealedImages((prev) =>
                                                      new Set(prev).add(item.permlink),
                                                    );
                                                  }}
                                                  className="flex items-center gap-1.5 mt-1 text-[9px] text-cyan-400 hover:text-cyan-300 font-bold"
                                                >
                                                  <ImageIcon size={14} /> {t("showPhoto")}
                                                </button>
                                              )}
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {myReply && !threads[reply.permlink] && (
                                  <div className="bg-slate-900 border-l-2 border-green-500/50 p-2 rounded-r-lg space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-green-400/60 uppercase">
                                        {t("yourReply")}
                                      </span>
                                      <button
                                        onClick={() =>
                                          setShowMyReplies((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(reply.permlink))
                                              next.delete(reply.permlink);
                                            else next.add(reply.permlink);
                                            return next;
                                          })
                                        }
                                        className="text-[9px] text-slate-500 hover:text-slate-300 underline"
                                      >
                                        {showMyReplies.has(reply.permlink) ? t("hide") : t("show")}
                                      </button>
                                    </div>
                                    {showMyReplies.has(reply.permlink) && (
                                      <div className="text-[11px] text-slate-400 italic font-sans">
                                        {myReply}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-3 pt-2">
                                  <button
                                    onClick={() =>
                                      handleLocalVote(reply.author, reply.permlink, voteWeight)
                                    }
                                    className={cn(
                                      "flex items-center gap-1 text-[10px] transition-colors px-2 py-1 rounded hover:bg-slate-800",
                                      reply.active_votes.some((v) => v.voter === currentUser)
                                        ? "text-cyan-400 font-bold"
                                        : "text-slate-400 hover:text-cyan-400",
                                    )}
                                  >
                                    <ThumbsUp
                                      size={14}
                                      className={cn(
                                        reply.active_votes.some((v) => v.voter === currentUser) &&
                                          "fill-cyan-400/20",
                                      )}
                                    />
                                    {reply.active_votes.some((v) => v.voter === currentUser)
                                      ? "Voted"
                                      : "Upvote"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const isAlreadyReplying = replyingTo?.permlink === reply.permlink;
                                      setReplyingTo(isAlreadyReplying ? null : reply);
                                      if (!isAlreadyReplying) {
                                        setFloatingCommentBody(
                                          `> ${reply.body.substring(0, 150)}${reply.body.length > 150 ? "..." : ""}\n\n`,
                                        );
                                      }
                                    }}
                                    className={cn(
                                      "flex items-center gap-1 text-[10px] transition-colors px-2 py-1 rounded hover:bg-slate-800",
                                      replyingTo?.permlink === reply.permlink
                                        ? "text-green-400 font-bold bg-green-500/10"
                                        : "text-slate-400 hover:text-green-400",
                                    )}
                                  >
                                    <QuoteIcon size={14} />
                                    Quote & Reply
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingTo(replyingTo?.permlink === reply.permlink ? null : reply);
                                      if (!replyingTo || replyingTo.permlink !== reply.permlink) {
                                        setFloatingCommentBody("");
                                      }
                                    }}
                                    className={cn(
                                      "flex items-center gap-1 text-[10px] transition-colors px-2 py-1 rounded hover:bg-slate-800",
                                      replyingTo?.permlink === reply.permlink
                                        ? "text-green-400 font-bold bg-green-500/10"
                                        : "text-slate-400 hover:text-green-400",
                                    )}
                                  >
                                    <MessageSquare size={14} />
                                    Reply
                                  </button>
                                </div>

                                {replyingTo?.permlink === reply.permlink && (
                                  <ReplyBox
                                    id={`inbox-reply-textarea-${reply.permlink}`}
                                    draftKey={`inbox-reply-${reply.permlink}`}
                                    value={floatingCommentBody}
                                    onChange={setFloatingCommentBody}
                                    onUploadImage={onUploadImage}
                                    placeholder={`Reply to @${reply.author}`}
                                    onSend={async (body) => {
                                      await handleLocalComment(reply.author, reply.permlink, body);
                                      setReplyingTo(null);
                                      setFloatingCommentBody("");
                                    }}
                                    onCancel={() => {
                                      setReplyingTo(null);
                                      setFloatingCommentBody("");
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
              {inbox.length >= inboxLimit && (
                <div className="p-4 pt-0">
                  <button
                    onClick={() => fetchInbox(false, true)}
                    disabled={loadingInbox}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-710/50 border border-slate-700/50 rounded-xl text-slate-400 text-[10px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingInbox ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                    {loadingInbox
                      ? "Loading..."
                      : `Load More (Current: ${inbox.length})`}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar transition-all duration-300",
          showInbox && "md:mr-[448px]",
        )}
      >
        <div className="max-w-6xl mx-auto w-full space-y-4">
          <AnimatePresence>
            {viewMode === "feed" ? (
              <div className="space-y-6">
                {!hasInitiatedFeed && !loading && (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
                    <Layout
                      size={48}
                      className="mb-4 opacity-20 text-slate-400"
                    />
                    <p className="text-lg font-bold text-slate-300">
                      {t("feedWaiting")}
                    </p>
                    <p className="text-xs mb-8 max-w-xs text-center text-slate-500">
                      {t("feedWaitingDesc")}
                    </p>
                    <button
                      onClick={fetchPosts}
                      className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-2"
                    >
                      <RefreshCw size={20} />
                      {t("loadPosts")}
                    </button>
                  </div>
                )}

                {loading && posts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <RefreshCw
                      className="animate-spin mb-4 text-slate-600"
                      size={32}
                    />
                    <p className="text-sm">{t("fetchingPosts")}</p>
                  </div>
                )}

                {posts.length === 0 && !loading && hasInitiatedFeed && (
                  <div className="text-center py-20 text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/50">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-bold">{t("emptyFeed")}</p>
                    <p className="text-sm text-slate-600">
                      {t("emptyFeedDesc")}
                    </p>
                    <button
                      onClick={fetchPosts}
                      className="mt-4 text-cyan-500 hover:underline flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw size={18} /> {t("tryAgain")}
                    </button>
                  </div>
                )}

                {posts.map((post) => {
                  const isExpanded = expandedPosts.has(post.permlink);
                  const isOwn = currentUser === post.author;
                  const hasVoted = post.active_votes.some(
                    (v) => v.voter === currentUser,
                  );
                  const hasCommented =
                    (post.children > 0 &&
                      postComments[post.permlink]?.some(
                        (c) => c.author === currentUser,
                      )) ||
                    respondedReplies[post.permlink];

                  return (
                    <motion.div
                      key={`${post.author}/${post.permlink}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onMouseUp={(e) => handleMouseUp(post, e)}
                      className={cn(
                        "bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl transition-all",
                        isExpanded && "ring-1 ring-cyan-500/20",
                      )}
                    >
                      <div
                        className="group p-3 sm:p-4 cursor-pointer hover:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between transition-colors items-start gap-2 sm:gap-4 relative"
                        onClick={() => togglePost(post)}
                      >
                        <div className="flex-1 min-w-0 pr-8 sm:pr-0 w-full">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="text-cyan-400 font-medium text-xs sm:text-sm">
                              @{post.author}
                            </span>
                            <span className="text-slate-500 text-[10px] sm:text-xs">
                              •{" "}
                              {new Date(
                                post.created + "Z",
                              ).toLocaleDateString()}
                            </span>
                            {config.whiteList.includes(post.author) && (
                              <UserCheck size={16} className="text-green-500" />
                            )}
                            {isOwn && (
                              <span className="bg-slate-800 text-[9px] px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-wider font-bold">
                                You
                              </span>
                            )}
                            {hasVoted && (
                              <ThumbsUp
                                size={14}
                                className="text-cyan-400 fill-cyan-400/20"
                              />
                            )}
                            {hasCommented && (
                              <MessageSquare
                                size={14}
                                className="text-green-400 fill-green-400/20"
                              />
                            )}

                            {/* Copy Link & Mute Buttons */}
                            <div className="flex items-center gap-1 ml-1 sm:ml-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(
                                    `https://steemit.com/@${post.author}/${post.permlink}`,
                                  );
                                }}
                                className="p-1 hover:bg-slate-700 text-slate-500 hover:text-cyan-400 rounded transition-colors"
                                title={t("copyLink")}
                              >
                                <Share2 size={14} />
                              </button>
                              {onMuteUser && !isOwn && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Mute @${post.author}?`))
                                      onMuteUser(post.author, true);
                                  }}
                                  className="p-1 hover:bg-slate-700 text-slate-500 hover:text-red-400 rounded transition-colors"
                                  title={t("muteUser")}
                                >
                                  <VolumeX size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-100 line-clamp-2 sm:truncate leading-tight">
                            {post.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 sm:ml-4 w-full sm:w-auto justify-between sm:justify-end">
                          {!isExpanded && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLocalVote(
                                    post.author,
                                    post.permlink,
                                    voteWeight,
                                  );
                                }}
                                className={cn(
                                  "p-1.5 sm:p-2 hover:bg-green-500/10 rounded-lg text-slate-500 hover:text-green-500 transition-colors flex items-center gap-1",
                                  hasVoted && "text-cyan-400",
                                )}
                                title={t("quickVote")}
                              >
                                <ArrowBigUp size={20} />
                                <span className="text-[10px] sm:text-xs font-bold">
                                  {(voteWeight / 100).toFixed(0)}%
                                </span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!expandedPosts.has(post.permlink)) {
                                    togglePost(post);
                                  }
                                  fetchComments(post.author, post.permlink);
                                }}
                                className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 px-2 py-1 bg-slate-950/30 hover:bg-slate-900 rounded-lg hidden sm:flex transition-all border border-slate-800/40 hover:border-cyan-500/20"
                                title={t("loadComments")}
                              >
                                <MessageSquare size={16} />
                                <span className="text-[10px] sm:text-xs font-semibold">{post.children}</span>
                              </button>
                            </div>
                          )}
                          <div
                            className="flex gap-1 absolute top-2 right-2 sm:static sm:top-auto sm:right-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePost(post);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp
                                className="text-slate-500 p-1 hover:bg-slate-800 rounded"
                                size={28}
                              />
                            ) : (
                              <ChevronDown
                                className="text-slate-500 p-1 hover:bg-slate-800 rounded"
                                size={28}
                              />
                            )}
                            {!isExpanded && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePost(post);
                                  // small delay to let mount occur
                                  setTimeout(() => {
                                    const el = document.getElementById(
                                      `actions-${post.permlink}`,
                                    );
                                    if (el)
                                      el.scrollIntoView({ behavior: "smooth" });
                                  }, 200);
                                }}
                                title={t("openAndGoToBottom")}
                                className="text-slate-500 p-1 hover:bg-slate-800 rounded flex flex-col justify-center items-center"
                              >
                                <ChevronsDown size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Post Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-800"
                          >
                            <div className="flex justify-center bg-slate-950/20 px-4 py-8 overflow-x-hidden">
                              <div
                                className="markdown-body transition-all"
                                style={{
                                  fontSize: `${config.fontSize}px`,
                                  fontWeight: config.fontWeight,
                                  maxWidth: `${config.contentWidth}px`,
                                  width: "100%",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: renderContent(
                                    post.body,
                                    post.permlink,
                                  ),
                                }}
                              />
                            </div>

                            {config.loadImages === false &&
                              !revealedImages.has(post.permlink) && (
                                <div className="flex justify-center pb-8">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRevealedImages((prev) =>
                                        new Set(prev).add(post.permlink),
                                      );
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm text-cyan-400 font-bold transition-all border border-cyan-500/10 shadow-lg"
                                  >
                                    <ImageIcon size={18} /> {t("showPostPhoto")}
                                  </button>
                                </div>
                              )}

                            <div
                              id={`actions-${post.permlink}`}
                              className="p-3 bg-slate-950/50 flex flex-wrap items-center gap-2 sm:gap-4 border-t border-slate-800"
                            >
                              <button
                                onClick={() =>
                                  handleLocalVote(
                                    post.author,
                                    post.permlink,
                                    voteWeight,
                                  )
                                }
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-all border border-transparent",
                                  hasVoted
                                    ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5"
                                    : "text-slate-400 hover:text-cyan-400 hover:border-cyan-500/20",
                                )}
                              >
                                <ThumbsUp
                                  size={18}
                                  className={cn(hasVoted && "fill-cyan-400/20")}
                                />
                                <span className="text-sm">
                                  {post.active_votes.length}
                                </span>
                              </button>

                               <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchComments(post.author, post.permlink);
                                }}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-all border border-transparent text-slate-400 hover:text-cyan-400",
                                  loadingComments.has(post.permlink) && "animate-pulse text-cyan-400"
                                )}
                                title={t("loadComments")}
                              >
                                <MessageSquare
                                  size={18}
                                  className={cn(
                                    postComments[post.permlink] && "fill-cyan-400/10 text-cyan-400"
                                  )}
                                />
                                <span className="text-sm font-bold">
                                  {post.children}
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  if (
                                    commentingPost?.permlink === post.permlink
                                  ) {
                                    setCommentingPost(null);
                                    setQuotePosition(null);
                                  } else {
                                    setCommentingPost(post);
                                    setQuotePosition(null);
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-all border border-transparent",
                                  commentingPost?.permlink === post.permlink ||
                                    respondedReplies[post.permlink]
                                    ? "text-green-400 bg-green-500/10 border-green-500/20"
                                    : "text-slate-400 hover:text-green-400",
                                )}
                                title={t("writeComment")}
                              >
                                <Edit3 size={18} />
                                <span className="text-sm font-medium">{t("commentAction")}</span>
                                {respondedReplies[post.permlink] && (
                                  <span className="hidden sm:inline-block ml-1 px-1.5 py-0.5 bg-green-500/20 text-[8px] font-bold uppercase rounded text-green-400 tracking-tighter">
                                    {t("youReplied")}
                                  </span>
                                )}
                              </button>

                              {isOwn && (
                                <button
                                  onClick={() => handleEdit(post)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-yellow-400 transition-all border border-transparent hover:border-yellow-500/20"
                                >
                                  <Edit size={18} />
                                  <span className="text-sm">{t("edit")}</span>
                                </button>
                              )}

                              <div className="flex gap-1 ml-auto">
                                {!config.whiteList.includes(post.author) && (
                                  <button
                                    onClick={() =>
                                      setConfig((c) => ({
                                        ...c,
                                        whiteList: Array.from(
                                          new Set([
                                            ...c.whiteList,
                                            post.author,
                                          ]),
                                        ),
                                      }))
                                    }
                                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-green-500 transition-colors"
                                    title={t("addToWhitelist")}
                                  >
                                    <UserCheck size={18} />
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    setConfig((c) => ({
                                      ...c,
                                      blackList: Array.from(
                                        new Set([...c.blackList, post.author]),
                                      ),
                                      whiteList: c.whiteList.filter(
                                        (u) => u !== post.author,
                                      ),
                                    }))
                                  }
                                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
                                  title={t("addToBlacklist")}
                                >
                                  <UserX size={18} />
                                </button>
                              </div>
                            </div>

                            {commentingPost?.permlink === post.permlink &&
                              !quotePosition && (
                                <div className="p-6 bg-slate-900 border-t border-slate-800 space-y-4 inline-reply-container">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
                                      <button
                                        onClick={() => insertText("**", "**")}
                                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        title={t("bold")}
                                      >
                                        <Bold size={20} />
                                      </button>
                                      <button
                                        onClick={() => insertText("_", "_")}
                                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        title={t("italic")}
                                      >
                                        <Italic size={20} />
                                      </button>
                                      <button
                                        onClick={() => insertText(">", "")}
                                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        title={t("quote")}
                                      >
                                        <QuoteIcon size={20} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          insertText("[", "](url)")
                                        }
                                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        title={t("link")}
                                      >
                                        <LinkIcon size={20} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          insertText("![", "](url)")
                                        }
                                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        title={t("image")}
                                      >
                                        <ImageIcon size={20} />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() =>
                                        setShowPreview(!showPreview)
                                      }
                                      className={cn(
                                        "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all",
                                        showPreview
                                          ? "bg-cyan-600 text-white"
                                          : "text-slate-500 hover:text-slate-300",
                                      )}
                                    >
                                      <Eye size={18} /> Preview
                                    </button>
                                  </div>

                                  {showPreview ? (
                                    <>
                                      <div
                                        className="p-4 bg-slate-950 rounded-xl border border-slate-700 min-h-[150px] markdown-body"
                                        dangerouslySetInnerHTML={{
                                          __html: renderContent(
                                            commentBody,
                                            post.permlink,
                                          ),
                                        }}
                                      />
                                      {config.loadImages === false &&
                                        !revealedImages.has(post.permlink) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setRevealedImages((prev) =>
                                                new Set(prev).add(
                                                  post.permlink,
                                                ),
                                              );
                                            }}
                                            className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-cyan-400 font-bold transition-all border border-cyan-500/10"
                                          >
                                            <ImageIcon size={18} /> {t("showCommentPhoto")}
                                          </button>
                                        )}
                                    </>
                                  ) : (
                                    <ReplyBox
                                      id="inline-comment-editor"
                                      draftKey={`post-comment-${post.permlink}`}
                                      value={commentBody}
                                      onChange={setCommentBody}
                                      placeholder={t("constructiveFeedbackPlaceholder")}
                                      onSend={async (body) => {
                                        await handleLocalComment(
                                          post.author,
                                          post.permlink,
                                          body,
                                        );
                                        setCommentingPost(null);
                                        setCommentBody("");
                                        setShowPreview(false);
                                      }}
                                      onCancel={() => {
                                        setCommentingPost(null);
                                        setCommentBody("");
                                        setShowPreview(false);
                                      }}
                                    />
                                  )}
                                </div>
                              )}

                            {/* Comments Section */}
                            {post.children > 0 && isExpanded && (
                              <div className="p-4 bg-slate-950/30 border-t border-slate-800">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <MessageSquare size={18} /> {t("comments")} (
                                    {post.children})
                                  </h4>
                                  {loadingComments.has(post.permlink) && (
                                    <RefreshCw
                                      size={18}
                                      className="animate-spin text-cyan-500"
                                    />
                                  )}
                                </div>

                                <div className="space-y-4">
                                  {postComments[post.permlink]?.map(
                                    (comment) => (
                                      <CommentItem
                                        key={`${comment.author}/${comment.permlink}`}
                                        comment={comment}
                                        currentUser={currentUser}
                                        onVote={handleLocalVote}
                                        onComment={handleLocalComment}
                                        renderContent={renderContent}
                                        voteWeight={voteWeight}
                                        onDeleteComment={onDeleteComment}
                                        onUploadImage={onUploadImage}
                                        excludeMuted={config.excludeMuted}
                                        mutedUsers={mutedUsersRef.current}
                                        onSelection={handleMouseUp}
                                        t={t}
                                      />
                                    ),
                                  )}
                                  {post.children > 0 &&
                                    !postComments[post.permlink] &&
                                    !loadingComments.has(post.permlink) && (
                                      <button
                                        onClick={() =>
                                          fetchComments(
                                            post.author,
                                            post.permlink,
                                          )
                                        }
                                        className="text-xs text-cyan-500 hover:underline"
                                      >
                                        {t("loadCommentsDots")}
                                      </button>
                                    )}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            ) : viewMode === "curation" ? (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Briefcase size={120} className="text-purple-500" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-xl">
                          <Briefcase size={24} className="text-purple-400" />
                        </div>
                        Curation Dashboard
                      </h2>
                      <button
                        onClick={() =>
                          setIsCurationSettingsOpen(!isCurationSettingsOpen)
                        }
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition-colors border border-slate-700"
                        title={isCurationSettingsOpen ? t("collapseSettings") : t("expandSettings")}
                      >
                        {isCurationSettingsOpen ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                    </div>
                    {isCurationSettingsOpen && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-slate-500 text-sm mb-6 max-w-xl"
                      >
                        {t("curationDesc")}
                      </motion.p>
                    )}

                    <AnimatePresence initial={false}>
                      {isCurationSettingsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden"
                        >
                          {/* Column 1: Main Target & Communities */}
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                                {t("communityTarget")}
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={curationTagInput || ""}
                                  onChange={(e) =>
                                    setCurationTagInput(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      if (curationTagInput.startsWith("#")) {
                                        const tag = curationTagInput
                                          .substring(1)
                                          .trim();
                                        if (tag && !config.tags.includes(tag)) {
                                          setConfig((c) => ({
                                            ...c,
                                            tags: [...c.tags, tag],
                                          }));
                                          setCurationTagInput("");
                                        }
                                      } else {
                                        fetchCurationFeed(curationTagInput.trim());
                                      }
                                    }
                                  }}
                                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-slate-700"
                                  placeholder={t("curationTagPlaceholder")}
                                />
                                <button
                                  onClick={() => fetchCurationFeed(curationTagInput.trim())}
                                  disabled={isCurationLoading}
                                  className="px-4 bg-purple-600 hover:bg-purple-500 rounded-xl transition-all disabled:opacity-50"
                                >
                                  {isCurationLoading ? (
                                    <RefreshCw
                                      size={18}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Search size={18} />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {POPULAR_COMMUNITIES.map((comm) => (
                                <button
                                  key={comm.id}
                                  onClick={() => {
                                    fetchCurationFeed(comm.id);
                                  }}
                                  className={cn(
                                    "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all",
                                    curationTag === comm.id
                                      ? "bg-purple-500/20 border-purple-500 text-purple-400"
                                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600",
                                  )}
                                  title={comm.desc}
                                >
                                  {comm.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Column 2: Filters & Selection */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {t("filterOptions")}
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <span className="text-[10px] text-slate-400 group-hover:text-slate-200">
                                  {t("strictMatch")}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={config.strictTagMode}
                                  onChange={(e) =>
                                    setConfig((c) => ({
                                      ...c,
                                      strictTagMode: e.target.checked,
                                    }))
                                  }
                                  className="accent-purple-500 ml-1"
                                />
                              </label>
                            </div>

                            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 min-h-[80px]">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {config.tags.filter(Boolean).length > 0 ? (
                                  config.tags.filter(Boolean).map((t, idx) => (
                                    <span
                                      key={`reader-tag-${t}-${idx}`}
                                      className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-500/20"
                                    >
                                      #{t}
                                      <X
                                        size={14}
                                        className="cursor-pointer hover:text-red-400 ml-1"
                                        onClick={() =>
                                          setConfig((c) => ({
                                            ...c,
                                            tags: c.tags.filter(
                                              (tag) => tag !== t,
                                            ),
                                          }))
                                        }
                                      />
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-600 italic">
                                    {t("noTagsFiltered")}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 opacity-60">
                                {POPULAR_TAGS.filter(Boolean).filter(
                                  (t) => !config.tags.includes(t),
                                ).map((t, idx) => (
                                  <button
                                    key={`reader-pop-tag-${t}-${idx}`}
                                    onClick={() =>
                                      setConfig((c) => ({
                                        ...c,
                                        tags: [...c.tags, t],
                                      }))
                                    }
                                    className="text-[10px] text-slate-500 border border-slate-800 px-2 py-0.5 rounded hover:border-slate-600 hover:text-slate-300"
                                  >
                                    +{t}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">
                                  {t("type")}
                                </label>
                                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                                  <button
                                    onClick={() => {
                                      setCurationType("comments");
                                    }}
                                    className={cn(
                                      "flex-1 py-1 text-[10px] font-bold rounded transition-all",
                                      curationType === "comments"
                                        ? "bg-purple-600 text-white"
                                        : "text-slate-500 hover:text-slate-300",
                                    )}
                                  >
                                    {t("comments")}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCurationType("posts");
                                    }}
                                    className={cn(
                                      "flex-1 py-1 text-[10px] font-bold rounded transition-all",
                                      curationType === "posts"
                                        ? "bg-purple-600 text-white"
                                        : "text-slate-500 hover:text-slate-300",
                                    )}
                                  >
                                    {t("posts")}
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">
                                  {t("sort")}
                                </label>
                                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                                  <button
                                    onClick={() => setCurationSort("new")}
                                    className={cn(
                                      "flex-1 py-1 text-[10px] font-bold rounded transition-all",
                                      curationSort === "new"
                                        ? "bg-slate-800 text-purple-400"
                                        : "text-slate-500 hover:text-slate-300",
                                    )}
                                  >
                                    {t("newest")}
                                  </button>
                                  <button
                                    onClick={() => setCurationSort("length")}
                                    className={cn(
                                      "flex-1 py-1 text-[10px] font-bold rounded transition-all",
                                      curationSort === "length"
                                        ? "bg-slate-800 text-purple-400"
                                        : "text-slate-500 hover:text-slate-300",
                                    )}
                                  >
                                    {t("length")}
                                  </button>
                                </div>
                              </div>
                              <div className="col-span-3 sm:col-span-1 space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">
                                  {t("ageLimit")}
                                </label>
                                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 h-[28px] items-center">
                                  <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={curationDays}
                                    onChange={(e) =>
                                      setCurationDays(
                                        Math.max(
                                          1,
                                          Math.min(30, Number(e.target.value)),
                                        ),
                                      )
                                    }
                                    className="w-full bg-transparent text-center text-[10px] font-bold text-purple-400 outline-none"
                                  />
                                  <span className="text-[9px] text-slate-500 pr-2">
                                    {t("days")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Column 3: {t("responseTemplate")} */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                                Response Template
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <span className="text-[10px] text-slate-400 group-hover:text-slate-200">
                                  {t("autoReplyAfterVote")}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={autoCommentEnabled}
                                  onChange={(e) =>
                                    setAutoCommentEnabled(e.target.checked)
                                  }
                                  className="accent-purple-500 ml-1"
                                />
                              </label>
                            </div>
                            <textarea
                              value={curationTemplate || ""}
                              onChange={(e) =>
                                setCurationTemplate(e.target.value)
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 h-[80px] text-xs outline-none focus:ring-1 focus:ring-purple-500 custom-scrollbar resize-none"
                              placeholder={t("curationTemplatePlaceholder")}
                            />
                            
                            <div className="mt-3 flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-800 gap-2">
                              <label className="flex items-center gap-1.5 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={!!config.enableVoteLogging}
                                  onChange={(e) =>
                                    setConfig((c) => ({
                                      ...c,
                                      enableVoteLogging: e.target.checked,
                                    }))
                                  }
                                  className="accent-purple-500"
                                />
                                <span className="text-[10px] text-slate-400 group-hover:text-slate-200 uppercase font-bold tracking-tight">
                                  {t("logVotes")}
                                </span>
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    localStorage.removeItem('steem_vote_logs');
                                    const btn = e.currentTarget;
                                    const orig = btn.innerText;
                                    btn.innerText = 'Cleared!';
                                    setTimeout(() => { btn.innerText = orig; }, 1500);
                                  }}
                                  className="text-[9px] font-bold uppercase px-2 py-1 bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-200 rounded transition"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    try {
                                      const logsStr = localStorage.getItem('steem_vote_logs');
                                      const logs = logsStr ? JSON.parse(logsStr) : [];
                                      if (logs.length === 0) {
                                          const btn = e.currentTarget;
                                          const orig = btn.innerText;
                                          btn.innerText = 'Empty!';
                                          setTimeout(() => { btn.innerText = orig; }, 1500);
                                          return;
                                      }
                                      const mdHeader = '| Nickname | Link | Weight | Type | Date |\n|---|---|---|---|---|\n';
                                      const mdBody = logs.map((l:any) => `| @${l.author} | [link](https://steemit.com/@${l.author}/${l.permlink}) | ${l.weight}% | ${l.isComment ? 'Comment' : 'Post'} | ${new Date(l.timestamp).toLocaleDateString()} |`).join('\n');
                                      const blob = new Blob([mdHeader + mdBody], { type: 'text/markdown;charset=utf-8;' });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `curation-votes-${new Date().toISOString().split('T')[0]}.md`;
                                      a.click();
                                    } catch(err) {
                                      console.error("Export failed", err);
                                    }
                                  }}
                                  className="text-[9px] font-bold uppercase px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition shadow"
                                >
                                  {t("exportMd")}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {curationError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3"
                  >
                    <AlertTriangle
                      className="text-red-500 shrink-0"
                      size={18}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-400">
                        {t("connectionError")}
                      </p>
                      <p className="text-xs text-red-500/80 mt-1">
                        {curationError}
                      </p>
                      <button
                        onClick={fetchCurationFeed}
                        className="mt-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-3 py-1 rounded-lg transition-colors"
                      >
                        {t("tryAgain")}
                      </button>
                    </div>
                  </motion.div>
                )}

                {curationPosts.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800/50 backdrop-blur-md sticky top-0 z-20 shadow-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 mr-2">
                        {[2, 3, 4].map((cols) => (
                          <button
                            key={cols}
                            onClick={() => setCurationColumns(cols)}
                            className={cn(
                              "size-7 flex items-center justify-center rounded text-[10px] font-bold transition-all",
                              curationColumns === cols
                                ? "bg-purple-600 text-white"
                                : "text-slate-500 hover:text-slate-300",
                            )}
                            title={`${cols} ${t("columns")}`}
                          >
                            {cols}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          onClick={() => {
                            if (selectedForVote.size === curationPosts.length)
                              setSelectedForVote(new Set());
                            else
                              setSelectedForVote(
                                new Set(curationPosts.map((p) => p.permlink)),
                              );
                          }}
                          className="h-8 px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                        >
                          <CheckCheck size={18} />
                          {selectedForVote.size === curationPosts.length ? t("deselect") : t("select")}
                        </button>

                        <div className="flex items-center gap-1 ml-1 border-l border-slate-800 pl-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase mr-1 hidden sm:inline">
                            {t("byAge")}
                          </span>
                          {[1, 2, 3].map((days) => (
                            <button
                              key={days}
                              onClick={() => {
                                const now = Date.now();
                                const limit = days * 24 * 60 * 60 * 1000;
                                const filtered = curationPosts.filter(
                                  (p) =>
                                    now - new Date(p.created + "Z").getTime() <=
                                    limit,
                                );
                                setSelectedForVote(
                                  new Set(filtered.map((p) => p.permlink)),
                                );
                              }}
                              className="h-7 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-400 hover:text-purple-400 transition-colors"
                            >
                              {days}d
                            </button>
                          ))}
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono ml-2 border-l border-slate-800 pl-3">
                        {selectedForVote.size} / {curationPosts.length} {t("selected")}
                      </span>
                    </div>

                    {batchVotingStatus.active ? (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-purple-400 uppercase">
                            {t("batchProcessing")}
                          </span>
                          <span className="text-xs font-mono">
                            {batchVotingStatus.current} /{" "}
                            {batchVotingStatus.total}
                          </span>
                        </div>
                        <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-purple-500"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(batchVotingStatus.current / batchVotingStatus.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={processBatchVotes}
                        disabled={selectedForVote.size === 0}
                        className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:grayscale rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-green-500/20 active:scale-95"
                      >
                        <Zap size={18} />
                        {t("voteAndReplySelected")}
                      </button>
                    )}
                  </div>
                )}

                {isCurationLoading && curationPosts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <RefreshCw
                      className="animate-spin mb-4 text-purple-400"
                      size={32}
                    />
                    <p className="text-sm font-medium">
                      {t("analyzingCommunity")}
                    </p>
                  </div>
                )}

                {!hasInitiatedCuration && !isCurationLoading && (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
                    <Zap
                      size={48}
                      className="mb-4 opacity-20 text-purple-400"
                    />
                    <p className="text-lg font-bold text-slate-300">
                      {t("readyToCurate")}
                    </p>
                    <p className="text-xs mb-8 max-w-xs text-center text-slate-500">
                      {t("curationStartHint")}
                    </p>
                    <button
                      onClick={fetchCurationFeed}
                      className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-900/20 active:scale-95 flex items-center gap-2"
                    >
                      <RefreshCw size={20} />
                      {t("startScan")}
                    </button>
                  </div>
                )}

                <div
                  className={cn(
                    "grid grid-cols-1 gap-6",
                    curationColumns === 2
                      ? "md:grid-cols-2"
                      : curationColumns === 3
                        ? "md:grid-cols-2 lg:grid-cols-3"
                        : "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
                  )}
                >
                  {curationPosts.map((post) => {
                    const isSelected = selectedForVote.has(post.permlink);
                    const isExpanded = expandedPosts.has(post.permlink);
                    const counts = getWordCounts(post.body);
                    const weight = customWeights[post.permlink] || voteWeight;

                    const toggleSelection = (e?: React.MouseEvent) => {
                      if (e) e.stopPropagation();
                      setSelectedForVote((prev) => {
                        const next = new Set(prev);
                        if (next.has(post.permlink)) next.delete(post.permlink);
                        else next.add(post.permlink);
                        return next;
                      });
                    };

                    return (
                      <motion.div
                        key={`${post.author}/${post.permlink}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => toggleSelection()}
                        onMouseUp={(e) => handleMouseUp(post, e)}
                        className={cn(
                          "bg-slate-900 border rounded-2xl p-4 flex flex-col gap-4 transition-all duration-300 group cursor-pointer relative",
                          isSelected
                            ? "border-green-500 ring-2 ring-green-500/20 bg-green-500/5 shadow-2xl"
                            : "border-slate-800 hover:border-slate-600 shadow-lg",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "size-6 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected
                                  ? "bg-green-500 border-green-500 text-slate-900"
                                  : "border-slate-700",
                              )}
                            >
                              {isSelected && (
                                <Zap size={18} fill="currentColor" />
                              )}
                            </div>
                            <div>
                              <span className="text-purple-400 font-bold block leading-none">
                                @{post.author}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(
                                  post.created + "Z",
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap shrink-0 items-center gap-1 pointer-events-auto">
                            <div
                              className="flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                              title={`${counts.clean} ${t("cleanWords")}, ${counts.dirty} ${t("dirtyWords")}`}
                            >
                              <FileText size={14} className="text-slate-500" />
                              <span
                                className={
                                  counts.clean > 50
                                    ? "text-green-500"
                                    : "text-yellow-500"
                                }
                              >
                                {counts.clean}
                              </span>
                              <span className="text-slate-600">/</span>
                              <span className="text-slate-500">
                                {counts.dirty}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(
                                  `https://steemit.com/@${post.author}/${post.permlink}`,
                                );
                              }}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-cyan-400 transition-colors"
                              title={t("copyLink")}
                            >
                              <Share2 size={16} />
                            </button>
                            <a
                              href={`https://steemit.com${post.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-cyan-500 transition-colors flex-shrink-0"
                            >
                              <LinkIcon size={16} />
                            </a>
                          </div>
                        </div>

                        <div className="space-y-2 relative pointer-events-auto">
                          <div
                            onClick={(e) => {
                              if (!isSelected) toggleSelection(e);
                            }}
                            className={cn(
                              "text-sm text-slate-300 bg-slate-950/50 p-4 rounded-xl transition-all relative custom-scrollbar",
                              isExpanded
                                ? "max-h-[500px] overflow-y-auto"
                                : "max-h-[120px] overflow-hidden",
                            )}
                          >
                            <div
                              className="markdown-body opacity-90 text-[13px] leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: renderContent(post.body, post.permlink),
                              }}
                            />
                            {config.loadImages === false &&
                              !revealedImages.has(post.permlink) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRevealedImages((prev) =>
                                      new Set(prev).add(post.permlink),
                                    );
                                  }}
                                  className="mt-2 flex items-center gap-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 rounded text-[10px] text-cyan-400 font-bold transition-all border border-cyan-500/10"
                                >
                                  <ImageIcon size={16} /> {t("showPhoto")}
                                </button>
                              )}
                            {!isExpanded && post.body.length > 200 && (
                              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPosts((prev) => {
                                const next = new Set(prev);
                                if (next.has(post.permlink))
                                  next.delete(post.permlink);
                                else next.add(post.permlink);
                                return next;
                              });
                            }}
                            className="w-full py-1 text-[10px] font-bold text-slate-500 hover:text-purple-400 uppercase tracking-widest text-center"
                          >
                            {isExpanded ? t("collapse") : t("expandContent")}
                          </button>
                        </div>

                        <div
                          className="flex flex-col gap-3 pt-3 border-t border-slate-800 mt-auto pointer-events-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isSelected && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                              <label className="text-[9px] font-bold text-purple-400/70 uppercase flex justify-between">
                                <span>{t("individualCommentOptional")}</span>
                                {individualComments[post.permlink] && (
                                  <button
                                    onClick={() =>
                                      setIndividualComments((prev) => {
                                        const n = { ...prev };
                                        delete n[post.permlink];
                                        return n;
                                      })
                                    }
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    Clear
                                  </button>
                                )}
                              </label>
                              <textarea
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] outline-none focus:ring-1 focus:ring-purple-500 custom-scrollbar min-h-[60px]"
                                id={`curation-comment-${post.permlink}`}
                                placeholder={t("customCommentPlaceholder")}
                                value={individualComments[post.permlink] || ""}
                                onChange={(e) =>
                                  setIndividualComments((prev) => ({
                                    ...prev,
                                    [post.permlink]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              {t("weight")}
                            </span>
                            <span className="text-xs font-mono font-bold text-green-400">
                              {(weight / 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="100"
                            max="10000"
                            step="100"
                            value={weight}
                            onChange={(e) =>
                              setCustomWeights((prev) => ({
                                ...prev,
                                [post.permlink]: parseInt(e.target.value),
                              }))
                            }
                            className="w-full accent-green-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {curationPosts.length === 0 &&
                  !isCurationLoading &&
                  hasInitiatedCuration && (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                      <div className="p-4 bg-slate-800 rounded-full mb-4">
                        <Zap size={32} className="text-slate-600" />
                      </div>
                      <p className="text-lg font-bold text-slate-300">
                        {t("queueEmpty")}
                      </p>
                      <p className="text-sm text-slate-500 text-center max-w-xs">
                        {t("queueEmptyDesc")}
                      </p>
                      <button
                        onClick={fetchCurationFeed}
                        className="mt-6 text-purple-400 font-bold hover:underline flex items-center gap-2"
                      >
                        <RefreshCw size={18} /> {t("scanAgain")}
                      </button>
                    </div>
                  )}
              </div>
            ) : viewMode === "settings" ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Settings size={24} className="text-cyan-400" />
                    {t("readerSettings")}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">
                        {t("limitPerUser")}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={config.limitPerUser}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              limitPerUser: parseInt(e.target.value),
                            }))
                          }
                          className="flex-1 accent-cyan-500"
                        />
                        <span className="text-sm font-mono text-cyan-400 w-4">
                          {config.limitPerUser}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">
                        {t("periodDays")}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="30"
                          value={config.daysLimit}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              daysLimit: parseInt(e.target.value),
                            }))
                          }
                          className="flex-1 accent-cyan-500"
                        />
                        <span className="text-sm font-mono text-cyan-400 w-4">
                          {config.daysLimit}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">
                        {t("contentWidth")}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="400"
                          max="1400"
                          step="50"
                          value={config.contentWidth}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              contentWidth: parseInt(e.target.value),
                            }))
                          }
                          className="flex-1 accent-cyan-500"
                        />
                        <span className="text-sm font-mono text-cyan-400 w-12">
                          {config.contentWidth}px
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex-1">
                      <h4 className="font-bold">{t("loadImages")}</h4>
                      <p className="text-xs text-slate-500">
                        {t("loadImagesDesc")}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setConfig((c) => ({ ...c, loadImages: !c.loadImages }))
                      }
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        config.loadImages !== false
                          ? "bg-cyan-500"
                          : "bg-slate-700",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 left-1 bg-white size-4 rounded-full transition-all shadow",
                          config.loadImages !== false && "translate-x-6",
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex-1">
                      <h4 className="font-bold">{t("autoLoadComments")}</h4>
                      <p className="text-xs text-slate-500">
                        {t("autoLoadCommentsDesc")}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          autoLoadComments: !c.autoLoadComments,
                        }))
                      }
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        config.autoLoadComments
                          ? "bg-cyan-500"
                          : "bg-slate-700",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 left-1 bg-white size-4 rounded-full transition-all shadow",
                          config.autoLoadComments && "translate-x-6",
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex-1">
                      <h4 className="font-bold">{t("onlyWhitelistMode")}</h4>
                      <p className="text-xs text-slate-500">
                        {t("onlyWhitelistDesc")}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          onlyWhitelist: !c.onlyWhitelist,
                        }))
                      }
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        config.onlyWhitelist ? "bg-cyan-500" : "bg-slate-700",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 size-4 bg-white rounded-full transition-all",
                          config.onlyWhitelist ? "left-7" : "left-1",
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex-1">
                      <h4 className="font-bold flex items-center gap-2">
                        {t("excludeMutedAccounts")}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {t("excludeMutedDesc")}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          excludeMuted: !c.excludeMuted,
                        }))
                      }
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        config.excludeMuted ? "bg-cyan-500" : "bg-slate-700",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 size-4 bg-white rounded-full transition-all",
                          config.excludeMuted ? "left-7" : "left-1",
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold flex items-center gap-2">
                          <VolumeX size={20} className="text-red-400" /> {t("manageMutedAccounts")}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {t("manageMutedDesc")}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!currentUser) return alert("Login required");
                          setShowMutedManager(!showMutedManager);
                          if (!showMutedManager) {
                            setLoadingMutedManager(true);
                            try {
                              const result = await callWithFallback(
                                "condenser_api.get_following",
                                [currentUser, "", "ignore", 1000],
                              );
                              if (result && Array.isArray(result)) {
                                const usernames: string[] = result.map(
                                  (f: any) => f.following,
                                );
                                setFetchedMutedUsers(
                                  Array.from(new Set(usernames)),
                                );
                              }
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setLoadingMutedManager(false);
                            }
                          } else {
                            setFetchedMutedUsers([]);
                          }
                        }}
                        className="px-4 py-1.5 rounded-lg text-sm font-bold bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 transition-all font-mono"
                      >
                        {showMutedManager ? t("hideList") : t("loadList")}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showMutedManager && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          {loadingMutedManager ? (
                            <div className="flex justify-center p-4 text-cyan-500">
                              <RefreshCw className="animate-spin" size={20} />
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                              {fetchedMutedUsers.length === 0 ? (
                                <p className="text-center text-slate-500 text-sm py-4">
                                  {t("noMutedAccounts")}
                                </p>
                              ) : (
                                fetchedMutedUsers.filter(Boolean).map((username, idx) => (
                                  <div
                                    key={`muted-user-${username}-${idx}`}
                                    className="flex items-center justify-between group py-1.5 px-2 hover:bg-slate-900 rounded border-b border-slate-900/50 last:border-0 text-sm"
                                  >
                                    <span className="font-bold text-slate-400">
                                      @{username}
                                    </span>
                                    <button
                                      onClick={async () => {
                                        if (onMuteUser) {
                                          await onMuteUser(username, false);
                                          setFetchedMutedUsers((prev) =>
                                            prev.filter((u) => u !== username),
                                          );
                                        }
                                      }}
                                      className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs font-bold transition-all border border-red-500/20"
                                    >
                                      {t("unmute")}
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-500">
                          <UserCheck size={20} />
                          <h3 className="text-sm font-bold uppercase tracking-wider">
                            {t("whiteList")} ({config.whiteList.length})
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <label
                            className="cursor-pointer p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title={t("importWhitelist")}
                          >
                            <Upload size={18} />
                            <input
                              type="file"
                              accept=".json"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const parsed = JSON.parse(
                                      event.target?.result as string,
                                    );
                                    if (Array.isArray(parsed)) {
                                      setConfig((c) => ({
                                        ...c,
                                        whiteList: Array.from(
                                          new Set([...c.whiteList, ...parsed]),
                                        ),
                                        blackList: c.blackList.filter(
                                          (u) => !parsed.includes(u),
                                        ),
                                      }));
                                    }
                                  } catch (err) {
                                    console.error(
                                      "Failed to parse whitelist JSON",
                                      err,
                                    );
                                  }
                                };
                                reader.readAsText(file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            onClick={() => {
                              const blob = new Blob(
                                [JSON.stringify(config.whiteList, null, 2)],
                                { type: "application/json" },
                              );
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `whitelist_export_${new Date().toISOString().split("T")[0]}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title={t("exportWhitelist")}
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t("addUsernamePlaceholder")}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-green-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = (e.target as HTMLInputElement).value
                                .trim()
                                .toLowerCase()
                                .replace("@", "");
                              if (val && !config.whiteList.includes(val)) {
                                setConfig((c) => ({
                                  ...c,
                                  whiteList: Array.from(
                                    new Set([...c.whiteList, val]),
                                  ),
                                  blackList: c.blackList.filter(
                                    (u) => u !== val,
                                  ),
                                }));
                                (e.target as HTMLInputElement).value = "";
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 h-32 overflow-y-auto custom-scrollbar space-y-1">
                        {config.whiteList.filter(Boolean).map((username, idx) => (
                          <div
                            key={`white-user-${username}-${idx}`}
                            className="flex items-center justify-between group py-1 border-b border-slate-900 last:border-0 text-sm"
                          >
                            <span>@{username}</span>
                            <button
                              onClick={() =>
                                setConfig((c) => ({
                                  ...c,
                                  whiteList: c.whiteList.filter(
                                    (u) => u !== username,
                                  ),
                                }))
                              }
                              className="p-1 text-slate-600 hover:text-red-500"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-500">
                          <UserX size={20} />
                          <h3 className="text-sm font-bold uppercase tracking-wider">
                            {t("blackList")} ({config.blackList.length})
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <label
                            className="cursor-pointer p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title={t("importBlacklist")}
                          >
                            <Upload size={18} />
                            <input
                              type="file"
                              accept=".json"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const parsed = JSON.parse(
                                      event.target?.result as string,
                                    );
                                    if (Array.isArray(parsed)) {
                                      setConfig((c) => ({
                                        ...c,
                                        blackList: Array.from(
                                          new Set([...c.blackList, ...parsed]),
                                        ),
                                        whiteList: c.whiteList.filter(
                                          (u) => !parsed.includes(u),
                                        ),
                                      }));
                                    }
                                  } catch (err) {
                                    console.error(
                                      "Failed to parse blacklist JSON",
                                      err,
                                    );
                                  }
                                };
                                reader.readAsText(file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            onClick={() => {
                              const blob = new Blob(
                                [JSON.stringify(config.blackList, null, 2)],
                                { type: "application/json" },
                              );
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `blacklist_export_${new Date().toISOString().split("T")[0]}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title={t("exportBlacklist")}
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t("addUsernamePlaceholder")}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-red-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = (e.target as HTMLInputElement).value
                                .trim()
                                .toLowerCase()
                                .replace("@", "");
                              if (val && !config.blackList.includes(val)) {
                                setConfig((c) => ({
                                  ...c,
                                  blackList: Array.from(
                                    new Set([...c.blackList, val]),
                                  ),
                                  whiteList: c.whiteList.filter(
                                    (u) => u !== val,
                                  ),
                                }));
                                (e.target as HTMLInputElement).value = "";
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 h-32 overflow-y-auto custom-scrollbar space-y-1">
                        {config.blackList.filter(Boolean).map((username, idx) => (
                          <div
                            key={`black-user-${username}-${idx}`}
                            className="flex items-center justify-between group py-1 border-b border-slate-900 last:border-0 text-sm"
                          >
                            <span>@{username}</span>
                            <button
                              onClick={() =>
                                setConfig((c) => ({
                                  ...c,
                                  blackList: c.blackList.filter(
                                    (u) => u !== username,
                                  ),
                                }))
                              }
                              className="p-1 text-slate-600 hover:text-red-500"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setViewMode("feed");
                      fetchPosts();
                    }}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all shadow-lg active:scale-95"
                  >
                    {t("applyAndGoToFeed")}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {posts.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500/50">
            <Search size={64} className="mb-4" />
            <p className="text-xl font-medium">{t("noVoicesHeard")}</p>
            <p className="text-sm">
              {t("noVoicesHint")}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {quotePosition && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed z-[9999] flex flex-col gap-2 floating-reply-tooltip pointer-events-auto max-h-[85vh] w-[calc(100vw-32px)] sm:w-[500px]"
            style={{
              left: quotePosition.x + tooltipOffset.x,
              top: quotePosition.y + tooltipOffset.y,
              transform: "translateX(-50%) translateY(-100%)",
              marginTop: "-10px",
            }}
          >
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-full py-1.5 px-3 flex items-center gap-3 shadow-2xl shadow-cyan-500/20 w-fit mx-auto">
              <button
                onClick={handleQuote}
                className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                title={t("addSelectionQuote")}
              >
                <QuoteIcon size={18} /> {t("quote")}
              </button>
              <div className="w-px h-3 bg-slate-700" />
              <button
                onClick={handleQuote}
                className="flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 transition-colors"
              >
                <MessageSquare size={18} /> {t("reply")}
              </button>
              <div className="w-px h-3 bg-slate-700" />
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "p-1 transition-all rounded hover:bg-slate-800",
                  showPreview
                    ? "text-cyan-400 bg-cyan-400/5"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                <Eye size={18} />
              </button>
              <div className="w-px h-3 bg-slate-700" />
              <button
                onClick={() => {
                  setQuotePosition(null);
                  setCommentingPost(null);
                  setSelectedText("");
                }}
                className="p-1 text-slate-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3 animate-in zoom-in-95 backdrop-blur-md bg-slate-900/95 ring-1 ring-white/5 flex flex-col overflow-hidden max-h-[60vh]">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1 p-0.5 bg-slate-800/50 rounded border border-slate-700/50">
                  <button
                    onClick={() => insertFloatingText("**", "**")}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    title={t("bold")}
                  >
                    <Bold size={18} />
                  </button>
                  <button
                    onClick={() => insertFloatingText("_", "_")}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    title={t("italic")}
                  >
                    <Italic size={18} />
                  </button>
                  <button
                    onClick={() => insertFloatingText(">", "")}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    title={t("quote")}
                  >
                    <QuoteIcon size={18} />
                  </button>
                </div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">
                  {t("toUser")} @{commentingPost?.author}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[50vh]">
                {showPreview ? (
                  <div
                    className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] markdown-body min-h-[120px]"
                    dangerouslySetInnerHTML={{
                      __html: renderContent(
                        floatingCommentBody,
                        commentingPost?.permlink,
                      ),
                    }}
                  />
                ) : (
                  <ReplyBox
                    id="floating-reply-textarea"
                    draftKey={`floating-${commentingPost?.author}-${commentingPost?.permlink}`}
                    value={floatingCommentBody}
                    onChange={setFloatingCommentBody}
                    onSend={async (body) => {
                      if (commentingPost) {
                        await handleLocalComment(
                          commentingPost.author,
                          commentingPost.permlink,
                          body,
                        );
                        setFloatingCommentBody("");
                        setQuotePosition(null);
                        setCommentingPost(null);
                        setSelectedText("");
                      }
                    }}
                    onCancel={() => {
                      setQuotePosition(null);
                      setCommentingPost(null);
                      setFloatingCommentBody("");
                    }}
                    onUploadImage={onUploadImage}
                    placeholder={`${t("quickReplyTo")} @${commentingPost?.author}`}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommentItem({
  comment,
  currentUser,
  onVote,
  onComment,
  renderContent,
  voteWeight,
  onDeleteComment,
  onUploadImage,
  excludeMuted = false,
  mutedUsers = [],
  onSelection,
  t,
}: {
  comment: SteemPost;
  currentUser: string | null | undefined;
  onVote: ReaderProps["onVote"];
  onComment: ReaderProps["onComment"];
  renderContent: (body: string, permlink?: string) => string;
  voteWeight: number;
  onDeleteComment?: ReaderProps["onDeleteComment"];
  onUploadImage?: ReaderProps["onUploadImage"];
  excludeMuted?: boolean;
  mutedUsers?: string[];
  onSelection?: (post: SteemPost, e?: React.MouseEvent | MouseEvent) => void;
  t?: (k: TranslationKey) => string;
}) {
  const currentLang = (typeof localStorage !== "undefined" ? localStorage.getItem("steem_lang") : null) || "uk";
  const loc = (k: TranslationKey) => t ? t(k) : getTranslation(currentLang, k);
  const [localComment, setLocalComment] = useState(comment);
  const [showReply, setShowReply] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [editBody, setEditBody] = useState("");
  const [replies, setReplies] = useState<SteemPost[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLocalComment(comment);
  }, [comment]);

  const fetchReplies = async (force: boolean = false) => {
    if (!force && localComment.children === 0) return;
    setLoadingReplies(true);
    try {
      const result: SteemPost[] = await callWithFallback(
        "condenser_api.get_content_replies",
        [localComment.author, localComment.permlink],
      );
      const configStr = localStorage.getItem("steem_reader_config_v1");
      const config = configStr
        ? JSON.parse(configStr)
        : { blackList: [], whiteList: [] };
      const filtered = result.filter((r) => {
        if (
          config.onlyWhitelist &&
          config.whiteList &&
          config.whiteList.length > 0
        ) {
          if (!config.whiteList.includes(r.author)) return false;
        } else {
          if (config.blackList && config.blackList.includes(r.author))
            return false;
        }
        const isMuted = excludeMuted && mutedUsers.includes(r.author);
        return !isMuted;
      });
      setReplies(filtered);
    } catch (err) {
      console.error("Failed to fetch replies:", err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const isOwn = localComment.author === currentUser;
  const canDelete =
    isOwn && replies.length === 0 && localComment.active_votes.length === 0;

  return (
    <div
      id={`comment-${localComment.permlink}`}
      className="pl-4 border-l-2 border-slate-800 space-y-2 relative group transition-colors duration-500"
      onMouseUp={(e) => onSelection?.(localComment, e)}
    >
      {isDeleting && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <RefreshCw size={24} className="animate-spin text-red-500" />
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-bold text-cyan-400/80">
            @{localComment.author}
          </span>
          <span>
            •{" "}
            {new Date(localComment.created + "Z").toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {isOwn && (
          <div
            className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ opacity: isEditing ? 1 : undefined }}
          >
            {canDelete && (
              <button
                onClick={async () => {
                  if (confirm(loc("confirmDeleteComment"))) {
                    setIsDeleting(true);
                    try {
                      if (onDeleteComment)
                        await onDeleteComment(
                          localComment.author,
                          localComment.permlink,
                        );
                      setLocalComment((prev) => ({
                        ...prev,
                        body: "*" + loc("commentDeleted") + "*",
                      }));
                    } catch (e) {
                      console.error(e);
                    }
                    setIsDeleting(false);
                  }
                }}
                className="text-red-500 hover:text-red-400"
                title={loc("deleteComment")}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={() => {
                setEditBody(localComment.body);
                setIsEditing(!isEditing);
                setShowReply(false);
              }}
              className="text-yellow-500 hover:text-yellow-400"
              title={loc("editComment")}
            >
              <Edit size={16} />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2 py-2 p-2 border border-slate-700/50 rounded bg-slate-900/50">
          <ReplyBox
            value={editBody}
            onChange={setEditBody}
            placeholder={loc("editYourCommentPlaceholder")}
            onUploadImage={onUploadImage}
            onSend={async (body) => {
              await onComment(
                localComment.parent_author,
                localComment.parent_permlink,
                body,
                localComment.permlink,
              );
              setIsEditing(false);
              setLocalComment((prev) => ({ ...prev, body }));
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div
          className="text-sm markdown-body opacity-90 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderContent(localComment.body) }}
        />
      )}

      <div className="flex items-center gap-4 text-[10px]">
        <button
          onClick={async () => {
            if (
              !localComment.active_votes.some((v) => v.voter === currentUser)
            ) {
              setLocalComment((prev) => ({
                ...prev,
                active_votes: [
                  ...prev.active_votes,
                  { voter: currentUser || "", weight: voteWeight },
                ],
              }));
            }
            await onVote(
              localComment.author,
              localComment.permlink,
              voteWeight,
            );
          }}
          className={cn(
            "flex items-center gap-1 hover:text-cyan-400 transition-colors",
            localComment.active_votes.some((v) => v.voter === currentUser) &&
              "text-cyan-400",
          )}
        >
          <ThumbsUp
            size={16}
            className={cn(
              localComment.active_votes.some((v) => v.voter === currentUser) &&
                "fill-cyan-400/20",
            )}
          />
          <span>{localComment.active_votes.length}</span>
        </button>
        <button
          onClick={() => {
            setShowReply(!showReply);
            setIsEditing(false);
          }}
          className={cn(
            "flex items-center gap-1 hover:text-green-400 transition-colors",
            showReply && "text-green-400",
          )}
        >
          <MessageSquare size={16} />
          <span>{loc("reply")}</span>
        </button>
        {localComment.children > 0 && replies.length === 0 && (
          <button
            onClick={() => fetchReplies()}
            className="text-cyan-500 hover:underline flex items-center gap-1"
          >
            {loadingReplies ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <span>{loc("showReplies")} ({localComment.children})</span>
            )}
          </button>
        )}
      </div>

      {showReply && (
        <div className="mt-2 py-2">
          <ReplyBox
            draftKey={`comment-reply-${localComment.permlink}`}
            value={replyBody}
            onChange={setReplyBody}
            placeholder={`${loc("replyTo")} @${localComment.author}`}
            onSend={async (body) => {
              const activeUser = currentUser || "you";
              const tempPermlink = `re-${localComment.author.replace(/\./g, '')}-${Date.now()}`;
              const optimisticReply: SteemPost = {
                author: activeUser,
                permlink: tempPermlink,
                category: localComment.category || "",
                title: "",
                body: body,
                json_metadata: JSON.stringify({ tags: [], app: "steem-editor", format: "markdown" }),
                created: new Date().toISOString().replace('Z', ''),
                active_votes: [],
                children: 0,
                parent_author: localComment.author,
                parent_permlink: localComment.permlink
              };

              // Optimistically append the reply to replies state immediately
              setReplies((prev) => [...prev, optimisticReply]);

              setLocalComment((prev) => ({
                ...prev,
                children: prev.children + 1,
              }));

              // Submit the reply
              await onComment(localComment.author, localComment.permlink, body);
              setReplyBody("");
              setShowReply(false);

              // Background refresh after a short delay so the blockchain registers it
              setTimeout(() => {
                fetchReplies(true);
              }, 4000);
            }}
            onCancel={() => setShowReply(false)}
          />
        </div>
      )}

      {replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={`${reply.author}/${reply.permlink}`}
              comment={reply}
              currentUser={currentUser}
              onVote={onVote}
              onComment={onComment}
              renderContent={renderContent}
              voteWeight={voteWeight}
              onDeleteComment={onDeleteComment}
              onUploadImage={onUploadImage}
              excludeMuted={excludeMuted}
              mutedUsers={mutedUsers}
              onSelection={onSelection}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
