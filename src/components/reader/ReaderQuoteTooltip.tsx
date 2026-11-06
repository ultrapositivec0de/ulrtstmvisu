import React from 'react';
import {
  Quote as QuoteIcon,
  MessageSquare,
  Eye,
  X,
  Bold,
  Italic,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { SteemPost } from '../../types';
import { TranslationKey } from '../../locales';
import { ReplyBox } from './ReplyBox';

export interface ReaderQuoteTooltipProps {
  quotePosition: { x: number; y: number } | null;
  tooltipRef: React.RefObject<HTMLDivElement | null>;
  tooltipOffset: { x: number; y: number };
  handleQuote: () => void;
  showPreview: boolean;
  setShowPreview: (show: boolean | ((prev: boolean) => boolean)) => void;
  setQuotePosition: (pos: { x: number; y: number } | null) => void;
  commentingPost: SteemPost | null;
  setCommentingPost: (post: SteemPost | null) => void;
  setSelectedText: (text: string) => void;
  insertFloatingText: (prefix: string, suffix: string) => void;
  renderContent: (body: string, permlink?: string) => string;
  floatingCommentBody: string;
  setFloatingCommentBody: (body: string | ((prev: string) => string)) => void;
  handleLocalComment: (
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    editPermlink?: string,
  ) => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
  t: (key: TranslationKey) => string;
}

export const ReaderQuoteTooltip: React.FC<ReaderQuoteTooltipProps> = React.memo(({
  quotePosition,
  tooltipRef,
  tooltipOffset,
  handleQuote,
  showPreview,
  setShowPreview,
  setQuotePosition,
  commentingPost,
  setCommentingPost,
  setSelectedText,
  insertFloatingText,
  renderContent,
  floatingCommentBody,
  setFloatingCommentBody,
  handleLocalComment,
  onUploadImage,
  t,
}) => {
  return (
    <AnimatePresence>
      {quotePosition && (
        <motion.div
          key="reader-quote-tooltip"
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed z-[9999] flex flex-col gap-2 floating-reply-tooltip pointer-events-auto max-h-[85vh] w-[calc(100vw-32px)] sm:w-[500px]"
          style={{
            left: quotePosition.x + tooltipOffset.x,
            top: quotePosition.y + tooltipOffset.y,
            transform: 'translateX(-50%) translateY(-100%)',
            marginTop: '-10px',
          }}
        >
          <div className="bg-[var(--modal-bg)] border border-[var(--border-color)] rounded-full py-1.5 px-3 flex items-center gap-3 shadow-2xl w-fit mx-auto">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleQuote}
              className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              title={t('addSelectionQuote')}
            >
              <QuoteIcon size={18} /> {t('quote')}
            </button>
            <div className="w-px h-3 bg-[var(--border-color)]" />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleQuote}
              className="flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 transition-colors"
            >
              <MessageSquare size={18} /> {t('reply')}
            </button>
            <div className="w-px h-3 bg-[var(--border-color)]" />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                'p-1 transition-all rounded hover:bg-slate-800/50',
                showPreview
                  ? 'text-cyan-400 bg-cyan-400/5'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]',
              )}
            >
              <Eye size={18} />
            </button>
            <div className="w-px h-3 bg-[var(--border-color)]" />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuotePosition(null);
                setCommentingPost(null);
                setSelectedText('');
              }}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="bg-[var(--modal-bg)] border border-[var(--border-color)] rounded-2xl p-3 sm:p-4 shadow-2xl space-y-3 animate-in zoom-in-95 flex flex-col overflow-hidden max-h-[60vh]">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 p-0.5 bg-slate-800/50 rounded border border-slate-700/50">
                <button
                  onClick={() => insertFloatingText('**', '**')}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  title={t('bold')}
                >
                  <Bold size={18} />
                </button>
                <button
                  onClick={() => insertFloatingText('_', '_')}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  title={t('italic')}
                >
                  <Italic size={18} />
                </button>
                <button
                  onClick={() => insertFloatingText('>', '')}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  title={t('quote')}
                >
                  <QuoteIcon size={18} />
                </button>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">
                {t('toUser')} @{commentingPost?.author}
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
                      setFloatingCommentBody('');
                      setQuotePosition(null);
                      setCommentingPost(null);
                      setSelectedText('');
                    }
                  }}
                  onCancel={() => {
                    setQuotePosition(null);
                    setCommentingPost(null);
                    setFloatingCommentBody('');
                  }}
                  onUploadImage={onUploadImage}
                  placeholder={`${t('quickReplyTo')} @${commentingPost?.author}`}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
