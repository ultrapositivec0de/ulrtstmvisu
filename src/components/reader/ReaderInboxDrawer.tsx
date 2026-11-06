import React from 'react';
import { 
  Bell, 
  CheckCheck, 
  RefreshCw, 
  X, 
  UserX, 
  GitBranch, 
  UserCheck, 
  ChevronDown, 
  ChevronUp, 
  Image as ImageIcon, 
  ThumbsUp, 
  Quote as QuoteIcon, 
  MessageSquare 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ReaderConfig, SteemPost } from '../../types';
import { ReplyBox } from './ReplyBox';

export interface ReaderInboxDrawerProps {
  showInbox: boolean;
  setShowInbox: (show: boolean | ((prev: boolean) => boolean)) => void;
  isRefreshingInbox: boolean;
  currentUser?: string | null;
  fetchInbox: (force?: boolean, loadMore?: boolean) => void;
  loadingInbox: boolean;
  inbox: SteemPost[];
  hiddenReplies: Set<string>;
  setHiddenReplies: React.Dispatch<React.SetStateAction<Set<string>>>;
  parentContext: Record<string, SteemPost>;
  fetchParentContext: (author: string, permlink: string) => void;
  expandedInboxThreads: Set<string>;
  setExpandedInboxThreads: React.Dispatch<React.SetStateAction<Set<string>>>;
  respondedReplies: Record<string, string>;
  expandedReplies: Set<string>;
  setExpandedReplies: React.Dispatch<React.SetStateAction<Set<string>>>;
  renderContent: (body: string, permlink?: string) => string;
  threads: Record<string, SteemPost[]>;
  threadHistory?: Record<string, SteemPost[]>;
  loadingThreads: Set<string>;
  fetchThread: (author: string, permlink: string) => void;
  editingReply: { permlink: string; body: string } | null;
  setEditingReply: React.Dispatch<React.SetStateAction<{ permlink: string; body: string } | null>>;
  onUploadImage?: (file: File) => Promise<string>;
  handleLocalComment: (parentAuthor: string, parentPermlink: string, body: string, editPermlink?: string) => Promise<void>;
  config: ReaderConfig;
  revealedImages: Set<string>;
  setRevealedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  showMyReplies: Set<string>;
  setShowMyReplies: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleLocalVote: (author: string, permlink: string, weight: number) => Promise<void>;
  voteWeight: number;
  replyingTo: SteemPost | null;
  setReplyingTo: React.Dispatch<React.SetStateAction<SteemPost | null>>;
  floatingCommentBody: string;
  setFloatingCommentBody: (b: string) => void;
  inboxLimit: number;
  t: (key: any) => string;
}

export const ReaderInboxDrawer: React.FC<ReaderInboxDrawerProps> = React.memo(({
  showInbox,
  setShowInbox,
  isRefreshingInbox,
  currentUser,
  fetchInbox,
  loadingInbox,
  inbox,
  hiddenReplies,
  setHiddenReplies,
  parentContext,
  fetchParentContext,
  expandedInboxThreads,
  setExpandedInboxThreads,
  respondedReplies,
  expandedReplies,
  setExpandedReplies,
  renderContent,
  threads,
  threadHistory,
  loadingThreads,
  fetchThread,
  editingReply,
  setEditingReply,
  onUploadImage,
  handleLocalComment,
  config,
  revealedImages,
  setRevealedImages,
  showMyReplies,
  setShowMyReplies,
  handleLocalVote,
  voteWeight,
  replyingTo,
  setReplyingTo,
  floatingCommentBody,
  setFloatingCommentBody,
  inboxLimit,
  t,
}) => {
  return (
    <AnimatePresence>
      {showInbox && (
        <motion.div
          key="reader-inbox-drawer"
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed right-0 z-[160] w-full max-w-md bg-[var(--modal-bg)] border-l border-[var(--border-color)] shadow-2xl flex flex-col pointer-events-auto top-[env(safe-area-inset-top,0px)] sm:top-[calc(var(--header-height,3.5rem)+env(safe-area-inset-top,0px))]"
          style={{
            bottom: 'calc(var(--has-bottom-bar, 0) * 4rem + env(safe-area-inset-bottom, 0px))',
            maxHeight: 'calc(100dvh - calc(var(--header-height, 3.5rem) + env(safe-area-inset-top, 0px)) - calc(var(--has-bottom-bar, 0) * 4rem + env(safe-area-inset-bottom, 0px)))',
          }}
        >
          <div className="p-3 sm:p-4 border-b border-[var(--border-color)] flex items-center justify-between gap-2 bg-[var(--bg-card)] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 truncate">
                <Bell
                  size={20}
                  className={cn(
                    "text-cyan-400 shrink-0",
                    isRefreshingInbox && "animate-pulse",
                  )}
                />
                <span className="truncate">{t("inbox")}</span>
              </h2>
              {inbox.filter((r) => !hiddenReplies.has(r.permlink)).length > 0 && (
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
                  className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 bg-slate-800/80 rounded-lg hover:bg-red-500/10 shrink-0 border border-slate-700/50"
                  title={t("markAllRead")}
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">{t("markAllRead")}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {currentUser && (
                <button
                  type="button"
                  onClick={() => fetchInbox(true)}
                  className="p-1.5 sm:p-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                  title={t("readerNavRefresh")}
                >
                  <RefreshCw
                    size={17}
                    className={cn(
                      (loadingInbox || isRefreshingInbox) && "animate-spin text-cyan-400",
                    )}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowInbox(false)}
                className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl border border-slate-700/70 hover:border-red-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
                title={t("closeModalAria")}
                aria-label={t("closeModalAria")}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            style={{
              paddingBottom: 'calc(var(--app-bottom-total, 4rem) + 1.5rem)',
            }}
          >
            {!currentUser ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-8">
                <UserX size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold text-slate-300 mb-1">
                  Login Required
                </p>
                <p className="text-xs">
                  Please login in the Vault or Enter your username to see replies.
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

                                {isLong && (
                                  <button
                                    onClick={() => {
                                      setExpandedReplies((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(reply.permlink)) {
                                          next.delete(reply.permlink);
                                        } else {
                                          next.add(reply.permlink);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="text-[10px] text-cyan-400 hover:underline block pt-1 font-semibold"
                                  >
                                    {isReplyExpanded
                                      ? t("showLess")
                                      : t("readFullComment")}
                                  </button>
                                )}
                              </div>

                              {/* Thread comments (direct replies to this reply) */}
                              <div className="pt-1 flex items-center gap-2">
                                <button
                                  onClick={() => fetchThread(reply.author, reply.permlink)}
                                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                                >
                                  <MessageSquare size={12} />
                                  {threads[reply.permlink]
                                    ? t("hideReplies")
                                    : t("showRepliesCount").replace("{count}", String(reply.children || 0))}
                                </button>
                                {loadingThreads.has(reply.permlink) && (
                                  <RefreshCw size={12} className="animate-spin text-cyan-400" />
                                )}
                              </div>

                              {threads[reply.permlink] && (
                                <div className="mt-2 pl-3 border-l-2 border-slate-700/50 space-y-2 bg-slate-900/30 p-2 rounded-r-lg">
                                  {threads[reply.permlink].map((item) => (
                                    <div
                                      key={item.permlink}
                                      className="space-y-1 bg-slate-950/30 p-2 rounded border border-slate-800/30"
                                    >
                                      <div className="flex items-center justify-between text-[10px]">
                                        <div className="flex items-center gap-1">
                                          <span className="font-bold text-cyan-400">
                                            @{item.author}
                                          </span>
                                          {item.author === currentUser && (
                                            <div className="flex items-center gap-1 ml-2">
                                              <button
                                                onClick={() =>
                                                  setEditingReply({
                                                    permlink: item.permlink,
                                                    body: item.body,
                                                  })
                                                }
                                                className="text-[8px] text-yellow-500/70 hover:text-yellow-400 font-bold uppercase"
                                              >
                                                Edit
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
  );
});

ReaderInboxDrawer.displayName = 'ReaderInboxDrawer';
export default ReaderInboxDrawer;
