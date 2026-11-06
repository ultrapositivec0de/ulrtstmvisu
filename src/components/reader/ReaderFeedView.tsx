import React, { useState } from 'react';
import {
  Layout,
  RefreshCw,
  FileText,
  UserCheck,
  ThumbsUp,
  MessageSquare,
  Share2,
  VolumeX,
  ArrowBigUp,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
  Image as ImageIcon,
  Edit,
  Edit3,
  UserX,
  Bold,
  Italic,
  Quote as QuoteIcon,
  Link as LinkIcon,
  Eye,
  Hash,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ReaderConfig, SteemPost } from '../../types';
import { PostRenderer } from './PostRenderer';
import { ReplyBox } from './ReplyBox';
import { CommentItem } from './CommentItem';

export interface ReaderFeedViewProps {
  posts: SteemPost[];
  loading: boolean;
  hasInitiatedFeed: boolean;
  fetchPosts: (customTag?: string) => void;
  searchTag?: string;
  expandedPosts: Set<string>;
  togglePost: (post: SteemPost) => void;
  currentUser?: string | null;
  postComments: Record<string, SteemPost[]>;
  respondedReplies: Record<string, string>;
  config: ReaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  renderContent: (body: string, permlink?: string) => string;
  handleMouseUp: (post: SteemPost, e?: React.MouseEvent | MouseEvent) => void;
  quotePosition?: { x: number; y: number } | null;
  setQuotePosition?: (pos: { x: number; y: number } | null) => void;
  revealedImages: Set<string>;
  setRevealedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleLocalVote: (author: string, permlink: string, weight: number) => Promise<void>;
  voteWeight: number;
  onMuteUser?: (username: string, mute: boolean) => Promise<void>;
  setSearchTag: (tag: string) => void;
  commentingPost: SteemPost | null;
  setCommentingPost: (post: SteemPost | null) => void;
  commentBody: string;
  setCommentBody: (b: string) => void;
  handleLocalComment: (
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    editPermlink?: string,
  ) => Promise<void>;
  handleEdit: (post: SteemPost) => void;
  fetchComments: (author: string, permlink: string) => Promise<void>;
  loadingComments: Set<string>;
  onDeleteComment?: (author: string, permlink: string) => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
  currentFontSize: number;
  currentFontWeight: number;
  mutedUsers: string[];
  t: (key: any) => string;
}

export const ReaderFeedView: React.FC<ReaderFeedViewProps> = React.memo(({
  posts,
  loading,
  hasInitiatedFeed,
  fetchPosts,
  expandedPosts,
  togglePost,
  currentUser,
  postComments,
  respondedReplies,
  config,
  setConfig,
  renderContent,
  handleMouseUp,
  quotePosition,
  setQuotePosition,
  revealedImages,
  setRevealedImages,
  handleLocalVote,
  voteWeight,
  onMuteUser,
  searchTag,
  setSearchTag,
  commentingPost,
  setCommentingPost,
  commentBody,
  setCommentBody,
  handleLocalComment,
  handleEdit,
  fetchComments,
  loadingComments,
  onDeleteComment,
  onUploadImage,
  currentFontSize,
  currentFontWeight,
  mutedUsers,
  t,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const activeSearchTag = (searchTag || (config.tags && config.tags[0]) || '').trim().replace(/^[#@]+/, '');
  const isNoTagAndDisabled = !activeSearchTag && !config.loadFeedWithoutTag;

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('inline-comment-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;

    setCommentBody(text.substring(0, start) + replacement + text.substring(end));

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
      }
    }, 50);
  };

  return (
                <div key="reader-view-feed" className="space-y-6">
                  {isNoTagAndDisabled && !loading && posts.length === 0 && (
                    <div className="text-center py-20 px-4 text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/50 flex flex-col items-center">
                      <div className="size-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-sm">
                        <Hash size={32} />
                      </div>
                      <p className="text-lg font-bold text-slate-200">{t("noTagSelected")}</p>
                      <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1.5 mb-6">
                        {t("noTagSelectedDesc")}
                      </p>

                      {config.favoriteTags && config.favoriteTags.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mb-6">
                          {config.favoriteTags.map((tag) => {
                            const clean = tag.replace(/^[#@]+/, '');
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  setSearchTag(clean);
                                  fetchPosts(clean);
                                }}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                              >
                                <Hash size={13} className="text-cyan-400" />
                                <span>{clean}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <p className="text-xs text-slate-500">
                        {t("orEnableInSettings")}
                      </p>
                    </div>
                  )}

                  {!isNoTagAndDisabled && !hasInitiatedFeed && !loading && posts.length === 0 && (
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
                        onClick={() => fetchPosts()}
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
  
                  {!isNoTagAndDisabled && posts.length === 0 && !loading && hasInitiatedFeed && (
                    <div className="text-center py-20 text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/50">
                      <FileText size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-bold">{t("emptyFeed")}</p>
                      <p className="text-sm text-slate-600">
                        {t("emptyFeedDesc")}
                      </p>
                      <button
                        onClick={() => fetchPosts()}
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
                          "bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xl transition-all",
                          isExpanded && "ring-1 ring-[var(--accent-hex)]/30",
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
                            <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] line-clamp-2 sm:truncate leading-tight">
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
                              key={`post-expanded-content-${post.author}-${post.permlink}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-[var(--border-color)]"
                            >
                              <div className="flex justify-center bg-[var(--bg-main)]/40 px-3 sm:px-4 py-5 sm:py-8 overflow-x-hidden">
                                <PostRenderer
                                  body={post.body}
                                  mode="full"
                                  permlink={post.permlink}
                                  loadImages={config.loadImages !== false || revealedImages.has(post.permlink)}
                                  fontSize={currentFontSize}
                                  fontWeight={config.fontWeight}
                                  maxWidth={`${config.contentWidth}px`}
                                  className="w-full flex justify-center"
                                  onTagClick={(tag) => {
                                    setSearchTag(tag);
                                  }}
                                  onAuthorClick={(username) => {
                                    setSearchTag(`@${username}`);
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
                                className="post-actions p-2.5 sm:p-3 bg-[var(--bg-main)]/60 flex flex-wrap items-center gap-2 sm:gap-4 border-t border-[var(--border-color)]"
                              >
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLocalVote(
                                      post.author,
                                      post.permlink,
                                      voteWeight,
                                    );
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800/50 rounded-lg transition-all border border-transparent",
                                    hasVoted
                                      ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5"
                                      : "text-[var(--text-muted)] hover:text-cyan-400 hover:border-cyan-500/20",
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
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchComments(post.author, post.permlink);
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800/50 rounded-lg transition-all border border-transparent text-[var(--text-muted)] hover:text-cyan-400",
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
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      commentingPost?.permlink === post.permlink &&
                                      !quotePosition
                                    ) {
                                      setCommentingPost(null);
                                      setQuotePosition?.(null);
                                    } else {
                                      setCommentingPost(post);
                                      setQuotePosition?.(null);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800/50 rounded-lg transition-all border border-transparent",
                                    commentingPost?.permlink === post.permlink ||
                                      respondedReplies[post.permlink]
                                      ? "text-green-400 bg-green-500/10 border-green-500/20"
                                      : "text-[var(--text-muted)] hover:text-green-400",
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
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-3 sm:p-5 bg-[var(--bg-card)] border-t border-[var(--border-color)] space-y-3 inline-reply-container"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-1 p-1 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
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
                                          mutedUsers={mutedUsers}
                                          onSelection={handleMouseUp}
                                          t={t}
                                          fontSize={currentFontSize}
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
  );
});
