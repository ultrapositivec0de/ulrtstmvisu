import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Image as ImageIcon, Send } from 'lucide-react';
import { getTranslation, TranslationKey } from '../../locales';

export const STORAGE_KEY_DRAFTS = "steem_reader_drafts_v1";

export interface ReplyBoxProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  onSend: (val: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  draftKey?: string;
  onUploadImage?: (file: File) => Promise<string>;
  t?: (k: TranslationKey) => string;
}

export const ReplyBox: React.FC<ReplyBoxProps> = React.memo(({
  id,
  value,
  onChange,
  onSend,
  onCancel,
  placeholder,
  draftKey,
  onUploadImage,
  t,
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
      try {
        const saved = localStorage.getItem(STORAGE_KEY_DRAFTS);
        if (saved) {
          const drafts = JSON.parse(saved);
          if (drafts[draftKey]) {
            onChange(drafts[draftKey]);
          }
        }
      } catch (e) {
        console.warn("Failed to read draft:", e);
      }
    }
  }, [draftKey, onChange, value]);

  useEffect(() => {
    if (draftKey) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_DRAFTS);
        const drafts = saved ? JSON.parse(saved) : {};
        if (value) {
          drafts[draftKey] = value;
        } else {
          delete drafts[draftKey];
        }
        localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
      } catch (e) {
        console.warn("Failed to save draft:", e);
      }
    }
  }, [value, draftKey]);

  const handleSend = async () => {
    if (!value.trim()) return;
    setSending(true);
    try {
      await onSend(value);
      onChange(""); // Clear after success
      if (draftKey) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY_DRAFTS);
          if (saved) {
            const drafts = JSON.parse(saved);
            delete drafts[draftKey];
            localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
          }
        } catch {
          /* ignore */
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
    <div className="space-y-2 sm:space-y-3 relative">
      {(sending || uploading) && (
        <div className="absolute inset-0 z-10 bg-[var(--modal-bg)]/80 flex items-center justify-center rounded">
          <RefreshCw size={24} className="text-[var(--accent-hex)] animate-spin" />
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
        rows={3}
        className="w-full bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg p-2.5 sm:p-3 text-xs sm:text-[13px] min-h-[76px] sm:min-h-[110px] max-h-[30vh] sm:max-h-[45vh] outline-none focus:ring-1 focus:ring-[var(--accent-hex)] resize-none font-sans overflow-y-auto transition-all custom-scrollbar"
        placeholder={resolvedPlaceholder}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !sending && value.trim()) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 overflow-x-auto no-scrollbar">
          {onUploadImage && (
            <label className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent-hex)] flex items-center gap-1.5 transition-colors px-2 py-1 rounded-md bg-[var(--bg-main)] border border-[var(--border-color)]">
              <ImageIcon size={16} />
              <span className="text-[11px] font-medium">{loc("image")}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading || sending}
              />
            </label>
          )}
          <span className="text-[10px] text-[var(--text-muted)] leading-none hidden sm:inline">
            {loc("ctrlEnterToSend")}
          </span>
        </div>
        <div className="flex justify-end items-center gap-2 ml-auto">
          {!sending && !uploading && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] border border-transparent hover:border-[var(--border-color)] transition-colors"
            >
              {loc("cancel")}
            </button>
          )}
          <button
            type="button"
            disabled={sending || uploading || !value.trim()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              handleSend();
            }}
            className="btn-primary px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            {sending ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            <span>{sending ? loc("sending") : loc("send")}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

ReplyBox.displayName = 'ReplyBox';
export default ReplyBox;
