import { useState, useEffect } from "react";
import { SteemPost, ReaderConfig } from "../../types";
import { callWithFallback } from "../../lib/steem";
import { type TranslationKey } from "../../locales";

interface UseReaderCurationProps {
  currentUser?: string | null;
  config: ReaderConfig;
  mutedUsers: string[];
  voteWeight: number;
  handleLocalVote: (author: string, permlink: string, weight: number) => Promise<void>;
  handleLocalComment: (
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    editPermlink?: string,
  ) => Promise<void>;
  setRespondedReplies: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setShowQuickPanel?: (show: boolean) => void;
  t: (key: TranslationKey) => string;
}

export function useReaderCuration({
  currentUser,
  config,
  mutedUsers,
  voteWeight,
  handleLocalVote,
  handleLocalComment,
  setRespondedReplies,
  setShowQuickPanel,
  t,
}: UseReaderCurationProps) {
  const [curationTagInput, setCurationTagInput] = useState("");
  const [curationTag, setCurationTag] = useState("");
  const [curationType, setCurationType] = useState<"posts" | "comments">("comments");
  const [curationPosts, setCurationPosts] = useState<SteemPost[]>(() => {
    try {
      const saved = localStorage.getItem("steem_cached_curation_posts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCurationLoading, setIsCurationLoading] = useState(false);
  const [curationError, setCurationError] = useState<string | null>(null);
  const [curationTemplate, setCurationTemplate] = useState(() => t("communityUpvoteGreet"));
  const [selectedForVote, setSelectedForVote] = useState<Set<string>>(new Set());
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({});
  const [curationSort, setCurationSort] = useState<"new" | "length">("new");
  const [curationDays, setCurationDays] = useState<number>(7);
  const [curationColumns, setCurationColumns] = useState<number>(() => {
    const saved = localStorage.getItem("steem_reader_curation_cols");
    return saved ? parseInt(saved, 10) : 2;
  });
  const [batchVotingStatus, setBatchVotingStatus] = useState<{
    current: number;
    total: number;
    active: boolean;
  }>({ current: 0, total: 0, active: false });
  const [autoCommentEnabled, setAutoCommentEnabled] = useState(false);
  const [individualComments, setIndividualComments] = useState<Record<string, string>>({});
  const [hasInitiatedCuration, setHasInitiatedCuration] = useState(false);
  const [isCurationSettingsOpen, setIsCurationSettingsOpen] = useState(true);

  useEffect(() => {
    localStorage.setItem("steem_reader_curation_cols", curationColumns.toString());
  }, [curationColumns]);

  useEffect(() => {
    if (curationPosts && curationPosts.length > 0) {
      localStorage.setItem("steem_cached_curation_posts", JSON.stringify(curationPosts.slice(0, 50)));
    }
  }, [curationPosts]);

  const fetchCurationFeed = async (overrideTag?: string | React.MouseEvent) => {
    const tagToUse = (typeof overrideTag === "string" ? overrideTag : curationTag) || "";
    if (!tagToUse && !config.onlyWhitelist) return;

    setCurationTag(tagToUse);
    setCurationTagInput(tagToUse);
    if (setShowQuickPanel) setShowQuickPanel(false);

    setHasInitiatedCuration(true);
    if (config.excludeMuted && !currentUser) {
      setCurationError(t("feedFilteredNickPrompt"));
      setCurationPosts([]);
      return;
    }
    setIsCurationLoading(true);
    setCurationError(null);
    const cleanTag = tagToUse.replace("@", "").trim();

    try {
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
        const uniqueResults = results.filter(
          (p, index, self) =>
            index ===
            self.findIndex((tPost) => tPost.author === p.author && tPost.permlink === p.permlink),
        );

        const now = Date.now();
        const maxAgeMs = curationDays * 24 * 60 * 60 * 1000;

        let filtered = uniqueResults.filter((p) => {
          const age = now - new Date(p.created + "Z").getTime();
          const hasVoted = p.active_votes?.some((v) => v.voter === currentUser);
          const isCommMuted = (p as any).stats?.gray === true;
          const isMuted = config.excludeMuted && mutedUsers.includes(p.author);

          return age < maxAgeMs && !hasVoted && !isCommMuted && !isMuted;
        });

        filtered = filtered.filter((post) => !config.blackList.includes(post.author));

        if (config.onlyWhitelist) {
          filtered = filtered.filter((p) => config.whiteList.includes(p.author));
        }

        if (config.strictTagMode && config.tags.length > 0) {
          filtered = filtered.filter((p) => {
            try {
              const meta = JSON.parse(p.json_metadata);
              const pTags = Array.isArray(meta.tags) ? meta.tags : [];
              return config.tags.every((tTag) => pTags.includes(tTag));
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

        const customBody = individualComments[permlink];
        const commentBody = customBody || (autoCommentEnabled ? curationTemplate : null);

        if (commentBody) {
          await handleLocalComment(post.author, post.permlink, commentBody);
          if (customBody) {
            setIndividualComments((prev) => {
              const next = { ...prev };
              delete next[permlink];
              return next;
            });
          }
          setRespondedReplies((prev) => ({ ...prev, [permlink]: commentBody }));
        }
      } catch (err) {
        console.error(`Batch vote failed for ${permlink}:`, err);
      }

      await new Promise((r) => setTimeout(r, 3000));
    }

    setBatchVotingStatus({ active: false, current: 0, total: 0 });
    setSelectedForVote(new Set());
    setCurationTemplate("");
    fetchCurationFeed();
  };

  return {
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
    isCurationSettingsOpen,
    setIsCurationSettingsOpen,
    fetchCurationFeed,
    processBatchVotes,
  };
}
