/* eslint-disable react-hooks/purity */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Search,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "../lib/utils";
import { ReaderConfig, SteemPost, AuthType } from "../types";
import { getTranslation, type TranslationKey } from "../locales";
import { ReaderMobileBottomBar } from "./reader/ReaderMobileBottomBar";
import { useDeviceStore } from "../store/deviceStore";
import { ReaderTopHeader } from "./reader/ReaderTopHeader";
import { ReaderInboxDrawer } from "./reader/ReaderInboxDrawer";
import { ReaderQuoteTooltip } from "./reader/ReaderQuoteTooltip";
import { ReaderQuickPanel } from "./reader/ReaderQuickPanel";
import { ReaderSettingsView } from "./reader/ReaderSettingsView";
import { ReaderFeedView } from "./reader/ReaderFeedView";
import { ReaderCurationView } from "./reader/ReaderCurationView";

import { useReaderFeedData } from "../hooks/reader/useReaderFeedData";
import { useReaderCuration } from "../hooks/reader/useReaderCuration";
import { useReaderInbox } from "../hooks/reader/useReaderInbox";
import { useReaderInteraction } from "../hooks/reader/useReaderInteraction";

export interface ReaderProps {
  lang?: string;
  t?: (key: TranslationKey) => string;
  editorFontSize?: number;
  setEditorFontSize?: (size: number | ((prev: number) => number)) => void;
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
  authType?: AuthType | 'VAULT';
  keychainAccounts?: string[];
  vaultAccounts?: string[];
  onSelectAccount?: (user: string, type: 'KEYCHAIN' | 'VAULT') => void;
  onAddKeychainAccount?: (user: string) => void;
  onOpenVaultManager?: () => void;
  selectedVaultUser?: string;
}

const STORAGE_KEY_READER_CONFIG = "steem_reader_config_v1";
const STORAGE_KEY_RESPONDED = "steem_responded_v1";

const DEFAULT_READER_CONFIG: ReaderConfig = {
  whiteList: [],
  blackList: [],
  fontSize: 16,
  fontWeight: 400,
  limitPerUser: 5,
  daysLimit: 7,
  tags: [],
  contentWidth: 800,
  excludeMuted: true,
  autoLoadComments: false,
  strictTagMode: false,
  favoriteTags: ["ukraine", "steem", "hive-145157"],
  autoShowInbox: false,
  loadImages: true,
  enableVoteLogging: true,
  onlyWhitelist: false,
  loadFeedWithoutTag: false,
};

export default function Reader({
  lang: propLang,
  t: propT,
  editorFontSize,
  setEditorFontSize,
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
  authType,
  keychainAccounts = [],
  vaultAccounts = [],
  onSelectAccount,
  onAddKeychainAccount,
  onOpenVaultManager,
  selectedVaultUser,
}: ReaderProps) {
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const t = useCallback((k: TranslationKey) => {
    if (propT) return propT(k);
    const currentLang =
      propLang ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("steem_lang") : null) ||
      "uk";
    return getTranslation(currentLang, k);
  }, [propT, propLang]);

  // Config State
  const [config, setConfig] = useState<ReaderConfig>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY_READER_CONFIG) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let cleanedTags = parsed.tags;
        if (Array.isArray(cleanedTags) && cleanedTags.join(" ") === "ukraine steemexclusive hive-105151") {
          cleanedTags = [];
        }
        let cleanedFavs = parsed.favoriteTags;
        if (!cleanedFavs || cleanedFavs.length === 0 || cleanedFavs.includes("hive-171319")) {
          cleanedFavs = DEFAULT_READER_CONFIG.favoriteTags;
        }
        return {
          ...DEFAULT_READER_CONFIG,
          ...parsed,
          autoShowInbox: parsed.autoShowInbox !== undefined ? Boolean(parsed.autoShowInbox) : false,
          tags: cleanedTags || [],
          favoriteTags: cleanedFavs,
        };
      } catch {
        return DEFAULT_READER_CONFIG;
      }
    }
    return DEFAULT_READER_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_READER_CONFIG, JSON.stringify(config));
  }, [config]);

  const [respondedReplies, setRespondedReplies] = useState<Record<string, string>>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY_RESPONDED) : null;
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RESPONDED, JSON.stringify(respondedReplies));
  }, [respondedReplies]);

  const [viewMode, setViewMode] = useState<"feed" | "curation" | "settings">("feed");
  const [isReaderHeaderOpen, setIsReaderHeaderOpen] = useState(true);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const [voteWeight, setVoteWeight] = useState(10000);
  const [revealedImages, setRevealedImages] = useState<Set<string>>(new Set());

  // Muted Manager States
  const [showMutedManager, setShowMutedManager] = useState(false);
  const [loadingMutedManager, setLoadingMutedManager] = useState(false);
  const [fetchedMutedUsers, setFetchedMutedUsers] = useState<string[]>([]);

  const showMobileBottomBar = useDeviceStore((s) => s.showMobileBottomBar);
  const isMobileLayout = useDeviceStore((s) => s.isMobileLayout);
  const mutedUsersRef = useRef<string[]>(mutedUsers);
  mutedUsersRef.current = mutedUsers;

  // Auto-collapse header when switching to curation mode
  useEffect(() => {
    if (viewMode === "curation") {
      setIsReaderHeaderOpen(false);
    } else {
      setIsReaderHeaderOpen(true);
    }
  }, [viewMode]);

  // Font size helpers
  const currentFontSize = editorFontSize ?? config.fontSize;

  const handleDecreaseFontSize = useCallback(() => {
    if (setEditorFontSize) {
      setEditorFontSize((prev) => Math.max(10, prev - 1));
    } else {
      setConfig((c) => ({ ...c, fontSize: Math.max(10, c.fontSize - 1) }));
    }
  }, [setEditorFontSize]);

  const handleIncreaseFontSize = useCallback(() => {
    if (setEditorFontSize) {
      setEditorFontSize((prev) => Math.min(32, prev + 1));
    } else {
      setConfig((c) => ({ ...c, fontSize: Math.min(32, c.fontSize + 1) }));
    }
  }, [setEditorFontSize]);

  // Feed Hook
  const {
    posts,
    setPosts,
    loading,
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
  } = useReaderFeedData({
    config,
    setConfig,
    mutedUsers: mutedUsersRef.current,
    setShowQuickPanel,
  });

  // Local Vote & Comment Optimistic Handlers
  const handleLocalVote = async (author: string, permlink: string, weight: number) => {
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

    inboxHook.setInbox((prev) =>
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

    setPostComments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = next[key].map((c) => {
          if (c.author === author && c.permlink === permlink) {
            const hasVoted = c.active_votes.some((v) => v.voter === currentUser);
            if (!hasVoted) {
              return {
                ...c,
                active_votes: [...c.active_votes, { voter: currentUser || "", weight }],
              };
            }
          }
          return c;
        });
      });
      return next;
    });

    curationHook.setCurationPosts((prev) =>
      prev.map((p) => {
        if (p.author === author && p.permlink === permlink) {
          const hasVoted = p.active_votes?.some((v) => v.voter === currentUser);
          if (!hasVoted) {
            return {
              ...p,
              active_votes: [...(p.active_votes || []), { voter: currentUser || "", weight }],
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
          const logsStr = localStorage.getItem("steem_vote_logs");
          const logs = logsStr ? JSON.parse(logsStr) : [];
          let isComment = true;
          const foundInPosts = posts.find((p) => p.author === author && p.permlink === permlink);
          const foundInCuration = curationHook.curationPosts.find(
            (p) => p.author === author && p.permlink === permlink,
          );
          const foundInInbox = inboxHook.inbox.find((p) => p.author === author && p.permlink === permlink);
          const foundInComments = Object.values(postComments)
            .flat()
            .find((p: SteemPost) => p.author === author && p.permlink === permlink);

          const target = foundInPosts || foundInCuration || foundInInbox || foundInComments;
          if (target && target.parent_author === "") {
            isComment = false;
          }

          logs.push({
            author,
            permlink,
            weight: weight / 100,
            isComment,
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem("steem_vote_logs", JSON.stringify(logs));
        } catch (e) {
          console.error("Failed to log vote", e);
        }
      }
    } catch (err) {
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

      const tempPermlink = editPermlink || `re-${parentAuthor.replace(/\./g, "")}-${Date.now()}`;
      const optimisticComment: SteemPost = {
        author: currentUser,
        permlink: tempPermlink,
        category: "",
        title: "",
        body: body,
        json_metadata: JSON.stringify({ tags: [], app: "steem-editor", format: "markdown" }),
        created: new Date().toISOString().replace("Z", ""),
        active_votes: [],
        children: 0,
        parent_author: parentAuthor,
        parent_permlink: parentPermlink,
      };

      setPostComments((prev) => {
        const list = prev[parentPermlink] || [];
        if (list.some((c) => c.permlink === tempPermlink)) return prev;
        return {
          ...prev,
          [parentPermlink]: [...list, optimisticComment],
        };
      });

      setPosts((prev) =>
        prev.map((p) => {
          if (p.permlink === parentPermlink) {
            return { ...p, children: p.children + 1 };
          }
          return p;
        }),
      );

      curationHook.setCurationPosts((prev) =>
        prev.map((p) => {
          if (p.permlink === parentPermlink) {
            return { ...p, children: p.children + 1 };
          }
          return p;
        }),
      );

      try {
        await onComment(parentAuthor, parentPermlink, body, editPermlink);
      } catch (err) {
        setPostComments((prev) => {
          const list = prev[parentPermlink] || [];
          return {
            ...prev,
            [parentPermlink]: list.filter((c) => c.permlink !== tempPermlink),
          };
        });

        setPosts((prev) =>
          prev.map((p) => {
            if (p.permlink === parentPermlink) {
              return { ...p, children: Math.max(0, p.children - 1) };
            }
            return p;
          }),
        );

        curationHook.setCurationPosts((prev) =>
          prev.map((p) => {
            if (p.permlink === parentPermlink) {
              return { ...p, children: Math.max(0, p.children - 1) };
            }
            return p;
          }),
        );

        throw err;
      }

      setRespondedReplies((prev) => ({
        ...prev,
        [parentPermlink]: body,
      }));

      inboxHook.setHiddenReplies((prev) => new Set(prev).add(parentPermlink));

      setTimeout(() => {
        fetchComments(parentAuthor, parentPermlink);
      }, 4000);

      if (inboxHook.showInbox) {
        setTimeout(() => {
          inboxHook.fetchInbox(false, true);
        }, 3000);
      }
    } catch (err) {
      console.error("Comment failed:", err);
      throw err;
    }
  };

  // Curation Hook
  const curationHook = useReaderCuration({
    currentUser,
    config,
    mutedUsers: mutedUsersRef.current,
    voteWeight,
    handleLocalVote,
    handleLocalComment,
    setRespondedReplies,
    setShowQuickPanel,
    t,
  });

  // Inbox Hook
  const inboxHook = useReaderInbox({
    currentUser,
    config,
    mutedUsers: mutedUsersRef.current,
    rawInboxData,
    targetReaderPost,
    setRespondedReplies,
  });

  // Interaction Hook (Text selection, quoting)
  const {
    selectedText,
    setSelectedText,
    quotePosition,
    setQuotePosition,
    showPreview,
    setShowPreview,
    floatingCommentBody,
    setFloatingCommentBody,
    tooltipRef,
    tooltipOffset,
    handleMouseUp,
    handleQuote,
    insertFloatingText,
  } = useReaderInteraction({
    commentingPost,
    setCommentingPost,
    viewMode,
    setSelectedForVote: curationHook.setSelectedForVote,
    setIndividualComments: curationHook.setIndividualComments,
    setCommentBody,
  });

  // Muted users auto-filter
  useEffect(() => {
    if (config.excludeMuted && mutedUsers.length > 0) {
      curationHook.setCurationPosts((prev) => prev.filter((p) => !mutedUsers.includes(p.author)));
      setPosts((prev) => prev.filter((p) => !mutedUsers.includes(p.author)));
      inboxHook.setInbox((prev) => prev.filter((p) => !mutedUsers.includes(p.author)));
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
    if (!commentingPost) {
      setSelectedText("");
      setQuotePosition(null);
      setFloatingCommentBody("");
      setShowPreview(false);
    }
  }, [commentingPost, setSelectedText, setQuotePosition, setFloatingCommentBody, setShowPreview]);

  const handleEdit = (post: SteemPost) => {
    onEditPost(post);
  };

  const renderContent = (body: string, permlink?: string) => {
    if (!marked || !DOMPurify) return body;
    let html = marked.parse(body) as string;

    const shouldLoadImages = config.loadImages !== false || (permlink && revealedImages.has(permlink));

    if (!shouldLoadImages) {
      html = html.replace(
        /<img[^>]*>/g,
        `<div class="image-blocked-placeholder">${t("imageHiddenBlocked")}</div>`,
      );
    }

    html = html.replace(/<img /g, '<img referrerpolicy="no-referrer" ');
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans">
      <ReaderTopHeader
        isReaderHeaderOpen={isReaderHeaderOpen}
        setIsReaderHeaderOpen={setIsReaderHeaderOpen}
        searchTag={searchTag}
        setSearchTag={setSearchTag}
        handleSearch={handleSearch}
        currentUser={currentUser}
        onUserUpdate={onUserUpdate}
        currentFontSize={currentFontSize}
        handleDecreaseFontSize={handleDecreaseFontSize}
        handleIncreaseFontSize={handleIncreaseFontSize}
        voteWeight={voteWeight}
        setVoteWeight={setVoteWeight}
        viewMode={viewMode}
        setViewMode={setViewMode}
        posts={posts}
        curationPosts={curationHook.curationPosts}
        setExpandedPosts={setExpandedPosts}
        fetchPosts={fetchPosts}
        loading={loading}
        curationTagInput={curationHook.curationTagInput}
        setCurationTagInput={curationHook.setCurationTagInput}
        fetchCurationFeed={curationHook.fetchCurationFeed}
        isCurationLoading={curationHook.isCurationLoading}
        autoShowInbox={config.autoShowInbox}
        toggleAutoShowInbox={() => setConfig((c) => ({ ...c, autoShowInbox: !c.autoShowInbox }))}
        showInbox={inboxHook.showInbox}
        setShowInbox={inboxHook.setShowInbox}
        hasUnreadInbox={inboxHook.inbox.some((r) => !inboxHook.hiddenReplies.has(r.permlink))}
        showMobileBottomBar={showMobileBottomBar}
        isMobileLayout={isMobileLayout}
        config={config}
        setConfig={setConfig}
        authType={authType}
        keychainAccounts={keychainAccounts}
        vaultAccounts={vaultAccounts}
        onSelectAccount={onSelectAccount}
        onAddKeychainAccount={onAddKeychainAccount}
        onOpenVaultManager={onOpenVaultManager}
        selectedVaultUser={selectedVaultUser}
        t={t}
      />

      <ReaderInboxDrawer
        showInbox={inboxHook.showInbox}
        setShowInbox={inboxHook.setShowInbox}
        isRefreshingInbox={inboxHook.isRefreshingInbox}
        currentUser={currentUser}
        fetchInbox={inboxHook.fetchInbox}
        loadingInbox={inboxHook.loadingInbox}
        inbox={inboxHook.inbox}
        hiddenReplies={inboxHook.hiddenReplies}
        setHiddenReplies={inboxHook.setHiddenReplies}
        parentContext={inboxHook.parentContext}
        fetchParentContext={inboxHook.fetchParentContext}
        expandedInboxThreads={inboxHook.expandedInboxThreads}
        setExpandedInboxThreads={inboxHook.setExpandedInboxThreads}
        respondedReplies={respondedReplies}
        expandedReplies={curationHook.selectedForVote}
        setExpandedReplies={() => {}}
        renderContent={renderContent}
        threads={inboxHook.threads}
        loadingThreads={inboxHook.loadingThreads}
        fetchThread={inboxHook.fetchThread}
        editingReply={inboxHook.editingReply}
        setEditingReply={inboxHook.setEditingReply}
        onUploadImage={onUploadImage}
        handleLocalComment={handleLocalComment}
        config={config}
        revealedImages={revealedImages}
        setRevealedImages={setRevealedImages}
        showMyReplies={inboxHook.showMyReplies}
        setShowMyReplies={inboxHook.setShowMyReplies}
        handleLocalVote={handleLocalVote}
        voteWeight={voteWeight}
        replyingTo={inboxHook.replyingTo}
        setReplyingTo={inboxHook.setReplyingTo}
        floatingCommentBody={inboxHook.floatingCommentBody}
        setFloatingCommentBody={inboxHook.setFloatingCommentBody}
        inboxLimit={inboxHook.inboxLimit}
        t={t}
      />

      <div
        ref={mainScrollRef}
        className={cn(
          "flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar transition-all duration-300",
          inboxHook.showInbox && "md:mr-[448px]",
        )}
        style={{
          paddingBottom: "calc(var(--app-bottom-total, 4rem) + 1.5rem)",
        }}
      >
        <div className="max-w-6xl mx-auto w-full space-y-4">
          <AnimatePresence>
            {viewMode === "feed" ? (
              <ReaderFeedView
                posts={posts}
                loading={loading}
                hasInitiatedFeed={hasInitiatedFeed}
                fetchPosts={fetchPosts}
                expandedPosts={expandedPosts}
                togglePost={togglePost}
                currentUser={currentUser}
                postComments={postComments}
                respondedReplies={respondedReplies}
                config={config}
                setConfig={setConfig}
                renderContent={renderContent}
                handleMouseUp={handleMouseUp}
                revealedImages={revealedImages}
                setRevealedImages={setRevealedImages}
                handleLocalVote={handleLocalVote}
                voteWeight={voteWeight}
                onMuteUser={onMuteUser}
                searchTag={searchTag}
                setSearchTag={setSearchTag}
                commentingPost={commentingPost}
                setCommentingPost={setCommentingPost}
                commentBody={commentBody}
                setCommentBody={setCommentBody}
                handleLocalComment={handleLocalComment}
                handleEdit={handleEdit}
                fetchComments={fetchComments}
                loadingComments={loadingComments}
                onDeleteComment={onDeleteComment}
                onUploadImage={onUploadImage}
                currentFontSize={currentFontSize}
                currentFontWeight={config.fontWeight || 400}
                mutedUsers={mutedUsersRef.current}
                quotePosition={quotePosition}
                setQuotePosition={setQuotePosition}
                t={t}
              />
            ) : viewMode === "curation" ? (
              <ReaderCurationView
                currentUser={currentUser}
                isCurationSettingsOpen={curationHook.isCurationSettingsOpen}
                setIsCurationSettingsOpen={curationHook.setIsCurationSettingsOpen}
                curationTagInput={curationHook.curationTagInput}
                setCurationTagInput={curationHook.setCurationTagInput}
                curationTag={curationHook.curationTag}
                setCurationTag={curationHook.setCurationTag}
                curationType={curationHook.curationType}
                setCurationType={curationHook.setCurationType}
                curationPosts={curationHook.curationPosts}
                setCurationPosts={curationHook.setCurationPosts}
                isCurationLoading={curationHook.isCurationLoading}
                curationError={curationHook.curationError}
                curationTemplate={curationHook.curationTemplate}
                setCurationTemplate={curationHook.setCurationTemplate}
                selectedForVote={curationHook.selectedForVote}
                setSelectedForVote={curationHook.setSelectedForVote}
                customWeights={curationHook.customWeights}
                setCustomWeights={curationHook.setCustomWeights}
                curationSort={curationHook.curationSort}
                setCurationSort={curationHook.setCurationSort}
                curationDays={curationHook.curationDays}
                setCurationDays={curationHook.setCurationDays}
                curationColumns={curationHook.curationColumns}
                setCurationColumns={curationHook.setCurationColumns}
                batchVotingStatus={curationHook.batchVotingStatus}
                autoCommentEnabled={curationHook.autoCommentEnabled}
                setAutoCommentEnabled={curationHook.setAutoCommentEnabled}
                individualComments={curationHook.individualComments}
                setIndividualComments={curationHook.setIndividualComments}
                hasInitiatedCuration={curationHook.hasInitiatedCuration}
                fetchCurationFeed={curationHook.fetchCurationFeed}
                processBatchVotes={curationHook.processBatchVotes}
                expandedPosts={expandedPosts}
                setExpandedPosts={setExpandedPosts}
                togglePost={togglePost}
                config={config}
                setConfig={setConfig}
                renderContent={renderContent}
                handleMouseUp={handleMouseUp}
                revealedImages={revealedImages}
                setRevealedImages={setRevealedImages}
                handleLocalVote={handleLocalVote}
                voteWeight={voteWeight}
                setSearchTag={setSearchTag}
                handleLocalComment={handleLocalComment}
                onUploadImage={onUploadImage}
                t={t}
              />
            ) : viewMode === "settings" ? (
              <ReaderSettingsView
                config={config}
                setConfig={setConfig}
                currentUser={currentUser}
                showMutedManager={showMutedManager}
                setShowMutedManager={setShowMutedManager}
                loadingMutedManager={loadingMutedManager}
                setLoadingMutedManager={setLoadingMutedManager}
                fetchedMutedUsers={fetchedMutedUsers}
                setFetchedMutedUsers={setFetchedMutedUsers}
                onMuteUser={onMuteUser}
                setViewMode={setViewMode}
                fetchPosts={fetchPosts}
                t={t}
              />
            ) : null}
          </AnimatePresence>
        </div>

        {posts.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500/50">
            <Search size={64} className="mb-4" />
            <p className="text-xl font-medium">{t("noVoicesHeard")}</p>
            <p className="text-sm">{t("noVoicesHint")}</p>
          </div>
        )}
      </div>

      <ReaderQuoteTooltip
        quotePosition={quotePosition}
        tooltipRef={tooltipRef}
        tooltipOffset={tooltipOffset}
        handleQuote={handleQuote}
        showPreview={showPreview}
        setShowPreview={setShowPreview}
        setQuotePosition={setQuotePosition}
        commentingPost={commentingPost}
        setCommentingPost={setCommentingPost}
        setSelectedText={setSelectedText}
        insertFloatingText={insertFloatingText}
        renderContent={renderContent}
        floatingCommentBody={floatingCommentBody}
        setFloatingCommentBody={setFloatingCommentBody}
        handleLocalComment={handleLocalComment}
        onUploadImage={onUploadImage}
        t={t}
      />

      <ReaderQuickPanel
        showQuickPanel={showQuickPanel}
        setShowQuickPanel={setShowQuickPanel}
        viewMode={viewMode}
        searchTag={searchTag}
        setSearchTag={setSearchTag}
        curationTagInput={curationHook.curationTagInput}
        setCurationTagInput={curationHook.setCurationTagInput}
        handleSearch={handleSearch}
        fetchCurationFeed={curationHook.fetchCurationFeed}
        config={config}
        setConfig={setConfig}
        handleDecreaseFontSize={handleDecreaseFontSize}
        handleIncreaseFontSize={handleIncreaseFontSize}
        currentFontSize={currentFontSize}
        fetchPosts={fetchPosts}
        loading={loading}
        isCurationLoading={curationHook.isCurationLoading}
        posts={posts}
        curationPosts={curationHook.curationPosts}
        expandedPosts={expandedPosts}
        setExpandedPosts={setExpandedPosts}
        authType={authType}
        currentUser={currentUser}
        keychainAccounts={keychainAccounts}
        vaultAccounts={vaultAccounts}
        onSelectAccount={onSelectAccount}
        onAddKeychainAccount={onAddKeychainAccount}
        onOpenVaultManager={onOpenVaultManager}
        selectedVaultUser={selectedVaultUser}
        t={t}
      />

      <ReaderMobileBottomBar
        viewMode={viewMode}
        onSelectViewMode={(mode) => setViewMode(mode)}
        showInbox={inboxHook.showInbox}
        onToggleInbox={() => inboxHook.setShowInbox(!inboxHook.showInbox)}
        inboxCount={inboxHook.inbox.length}
        unreadCount={inboxHook.unreadRepliesCount}
        showQuickPanel={showQuickPanel}
        onToggleQuickPanel={() => setShowQuickPanel((prev) => !prev)}
        onRefresh={() => {
          if (viewMode === "feed") {
            fetchPosts();
          } else if (viewMode === "curation") {
            curationHook.fetchCurationFeed();
          }
        }}
        isLoading={loading || curationHook.isCurationLoading}
        onScrollToTop={() => {
          mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }}
        t={t}
      />
    </div>
  );
}
