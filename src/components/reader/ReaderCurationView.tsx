import React from 'react';
import {
  Briefcase,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Zap,
  Sliders,
  CheckCheck,
  Search,
  MessageSquare,
  ThumbsUp,
  Share2,
  VolumeX,
  ArrowBigUp,
  ChevronsDown,
  Image as ImageIcon,
  Edit,
  UserX,
  UserCheck,
  Layout,
  FileText,
  X,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ReaderConfig, SteemPost } from '../../types';
import { POPULAR_COMMUNITIES, POPULAR_TAGS } from '../../data/communities';
import { getWordCounts } from '../../utils/postFormatting';
import { PostRenderer } from './PostRenderer';

export interface ReaderCurationViewProps {
  currentUser?: string | null;
  isCurationSettingsOpen: boolean;
  setIsCurationSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  curationTagInput: string;
  setCurationTagInput: (tag: string) => void;
  curationTag: string;
  setCurationTag: (tag: string) => void;
  curationType: 'posts' | 'comments';
  setCurationType: (type: 'posts' | 'comments') => void;
  curationPosts: SteemPost[];
  setCurationPosts: React.Dispatch<React.SetStateAction<SteemPost[]>>;
  isCurationLoading: boolean;
  curationError: string | null;
  curationTemplate: string;
  setCurationTemplate: (t: string) => void;
  selectedForVote: Set<string>;
  setSelectedForVote: React.Dispatch<React.SetStateAction<Set<string>>>;
  customWeights: Record<string, number>;
  setCustomWeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  curationSort: 'new' | 'length';
  setCurationSort: (sort: 'new' | 'length') => void;
  curationDays: number;
  setCurationDays: (d: number) => void;
  curationColumns: number;
  setCurationColumns: React.Dispatch<React.SetStateAction<number>>;
  batchVotingStatus: { active: boolean; current: number; total: number };
  autoCommentEnabled: boolean;
  setAutoCommentEnabled: (enabled: boolean) => void;
  individualComments: Record<string, string>;
  setIndividualComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  hasInitiatedCuration: boolean;
  fetchCurationFeed: (overrideTag?: string | React.MouseEvent) => Promise<void>;
  processBatchVotes: () => Promise<void>;
  expandedPosts: Set<string>;
  setExpandedPosts: React.Dispatch<React.SetStateAction<Set<string>>>;
  togglePost: (post: SteemPost) => void;
  config: ReaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  renderContent: (body: string, permlink?: string) => string;
  handleMouseUp: (post: SteemPost, e?: React.MouseEvent | MouseEvent) => void;
  revealedImages: Set<string>;
  setRevealedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleLocalVote: (author: string, permlink: string, weight: number) => Promise<void>;
  voteWeight: number;
  setSearchTag: (tag: string) => void;
  handleLocalComment: (
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    editPermlink?: string,
  ) => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
  t: (key: any) => string;
}

export const ReaderCurationView: React.FC<ReaderCurationViewProps> = React.memo(({
  currentUser,
  isCurationSettingsOpen,
  setIsCurationSettingsOpen,
  curationTagInput,
  setCurationTagInput,
  curationTag,
  setCurationTag,
  curationType,
  setCurationType,
  curationPosts,
  setCurationPosts,
  isCurationLoading,
  curationError,
  curationTemplate,
  setCurationTemplate,
  selectedForVote,
  setSelectedForVote,
  customWeights,
  setCustomWeights,
  curationSort,
  setCurationSort,
  curationDays,
  setCurationDays,
  curationColumns,
  setCurationColumns,
  batchVotingStatus,
  autoCommentEnabled,
  setAutoCommentEnabled,
  individualComments,
  setIndividualComments,
  hasInitiatedCuration,
  fetchCurationFeed,
  processBatchVotes,
  expandedPosts,
  setExpandedPosts,
  togglePost,
  config,
  setConfig,
  renderContent,
  handleMouseUp,
  revealedImages,
  setRevealedImages,
  handleLocalVote,
  voteWeight,
  setSearchTag,
  handleLocalComment,
  onUploadImage,
  t,
}) => {
  return (
                <div key="reader-view-curation" className="space-y-6">
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
                            key="reader-curation-settings-panel"
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
                                {POPULAR_COMMUNITIES.map((comm, idx) => (
                                  <button
                                    key={`cur-comm-${comm.id}-${idx}`}
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
                          {[2, 3, 4].map((cols, idx) => (
                            <button
                              key={`cur-cols-${cols}-${idx}`}
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
                            {[1, 2, 3].map((days, idx) => (
                              <button
                                key={`cur-days-${days}-${idx}`}
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
  );
});
