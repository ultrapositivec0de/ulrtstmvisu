import { useState, useRef, useLayoutEffect } from "react";
import { SteemPost } from "../../types";

interface UseReaderInteractionProps {
  commentingPost: SteemPost | null;
  setCommentingPost: (post: SteemPost | null) => void;
  viewMode: "feed" | "curation" | "settings" | string;
  setSelectedForVote?: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIndividualComments?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCommentBody?: React.Dispatch<React.SetStateAction<string>>;
}

export function useReaderInteraction({
  commentingPost,
  setCommentingPost,
  viewMode,
  setSelectedForVote,
  setIndividualComments,
  setCommentBody,
}: UseReaderInteractionProps) {
  const [selectedText, setSelectedText] = useState("");
  const [quotePosition, setQuotePosition] = useState<{ x: number; y: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [floatingCommentBody, setFloatingCommentBody] = useState("");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipOffset, setTooltipOffset] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (quotePosition && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const padding = 15;
      let dx = 0;
      let dy = 0;

      if (rect.left < padding) dx = padding - rect.left;
      else if (rect.right > window.innerWidth - padding) {
        dx = window.innerWidth - padding - rect.right;
      }

      if (rect.top < padding) {
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

  const handleMouseUp = (post: SteemPost, e?: React.MouseEvent | MouseEvent) => {
    const selection = window.getSelection();

    const target = (e?.target as HTMLElement) || (window.event?.target as HTMLElement);
    if (
      target?.closest(".floating-reply-tooltip") ||
      target?.closest(".inline-reply-container") ||
      target?.closest(".post-actions") ||
      target?.closest("button") ||
      target?.tagName === "TEXTAREA" ||
      target?.tagName === "INPUT"
    ) {
      return;
    }

    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects.length === 0) return;

      const rect = rects[0];
      const x = rect.left + rect.width / 2;
      const y = rect.top;

      setSelectedText(selection.toString().trim());
      setQuotePosition({ x, y: y - 8 });

      if (commentingPost?.permlink !== post.permlink) {
        setFloatingCommentBody("");
      }

      setCommentingPost(post);
    } else {
      if (
        !target?.closest(".floating-reply-tooltip") &&
        !target?.closest(".inline-reply-container") &&
        !target?.closest(".post-actions") &&
        quotePosition
      ) {
        setQuotePosition(null);
        setSelectedText("");
      }
    }
  };

  const handleQuote = () => {
    if (selectedText && commentingPost) {
      setShowPreview(false);
      if (viewMode === "curation" && setSelectedForVote && setIndividualComments) {
        const permlink = commentingPost.permlink;
        setSelectedForVote((prev) => new Set(prev).add(permlink));

        let fullLength = 0;
        let nextValue = "";
        setIndividualComments((prev) => {
          const current = prev[permlink] || "";
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

        setTimeout(() => {
          const el = document.getElementById(
            `curation-comment-${permlink}`,
          ) as HTMLTextAreaElement;
          if (el) {
            if (el.value !== nextValue) el.value = nextValue;
            el.focus();
            el.setSelectionRange(fullLength, fullLength);
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

          setTimeout(() => {
            const el = document.getElementById("floating-reply-textarea") as HTMLTextAreaElement;
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
    const textarea = document.getElementById("floating-reply-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;

    setFloatingCommentBody(text.substring(0, start) + replacement + text.substring(end));

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
      }
    }, 50);
  };

  const insertText = (before: string, after: string = "") => {
    if (!setCommentBody) return;
    const textarea = document.getElementById("inline-comment-editor") as HTMLTextAreaElement;
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

  return {
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
    insertText,
  };
}
