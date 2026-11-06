import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  Edit,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { callWithFallback } from '../../lib/steem';
import { SteemPost } from '../../types';
import { getTranslation, type TranslationKey } from '../../locales';
import { useLightboxStore } from '../../store/lightboxStore';
import { ReplyBox } from './ReplyBox';

export interface CommentItemProps {
  comment: SteemPost;
  currentUser: string | null | undefined;
  onVote: (author: string, permlink: string, weight: number) => Promise<void>;
  onComment: (
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    editPermlink?: string,
  ) => Promise<void>;
  renderContent: (body: string, permlink?: string) => string;
  voteWeight: number;
  onDeleteComment?: (author: string, permlink: string) => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
  excludeMuted?: boolean;
  mutedUsers?: string[];
  onSelection?: (post: SteemPost, e?: React.MouseEvent | MouseEvent) => void;
  t?: (k: TranslationKey) => string;
  fontSize?: number;
}

export const CommentItem: React.FC<CommentItemProps> = React.memo(({
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
  fontSize,
}) => {
  const currentLang =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('steem_lang') : null) || 'uk';
  const loc = (k: TranslationKey) => (t ? t(k) : getTranslation(currentLang, k));
  const [localComment, setLocalComment] = useState(comment);
  const [showReply, setShowReply] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [editBody, setEditBody] = useState('');
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
        'condenser_api.get_content_replies',
        [localComment.author, localComment.permlink],
      );
      const configStr = localStorage.getItem('steem_reader_config_v1');
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
      console.error('Failed to fetch replies:', err);
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
            •{' '}
            {new Date(localComment.created + 'Z').toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        {isOwn && (
          <div
            className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            style={{ opacity: isEditing ? 1 : undefined }}
          >
            {canDelete && (
              <button
                onClick={async () => {
                  if (confirm(loc('confirmDeleteComment'))) {
                    setIsDeleting(true);
                    try {
                      if (onDeleteComment)
                        await onDeleteComment(
                          localComment.author,
                          localComment.permlink,
                        );
                      setLocalComment((prev) => ({
                        ...prev,
                        body: '*' + loc('commentDeleted') + '*',
                      }));
                    } catch (e) {
                      console.error(e);
                    }
                    setIsDeleting(false);
                  }
                }}
                className="text-red-500 hover:text-red-400"
                title={loc('deleteComment')}
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
              title={loc('editComment')}
            >
              <Edit size={16} />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2 py-2 p-2 border border-slate-700/50 rounded bg-slate-900/50">
          <ReplyBox
            draftKey={`comment-edit-${localComment.permlink}`}
            value={editBody}
            onChange={setEditBody}
            placeholder={loc('editYourCommentPlaceholder')}
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
          className="text-sm markdown-body opacity-90 leading-relaxed transition-all [&_img]:cursor-zoom-in [&_img]:transition-transform hover:[&_img]:opacity-95"
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const img = target.tagName === 'IMG' ? (target as HTMLImageElement) : target.closest('img');
            if (img && img.src) {
              e.preventDefault();
              e.stopPropagation();
              useLightboxStore.getState().openLightbox(img.src, img.alt || '');
            }
          }}
          style={fontSize ? { fontSize: `${Math.max(12, fontSize - 2)}px` } : undefined}
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
                  { voter: currentUser || '', weight: voteWeight },
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
            'flex items-center gap-1 hover:text-cyan-400 transition-colors',
            localComment.active_votes.some((v) => v.voter === currentUser) &&
              'text-cyan-400',
          )}
        >
          <ThumbsUp
            size={16}
            className={cn(
              localComment.active_votes.some((v) => v.voter === currentUser) &&
                'fill-cyan-400/20',
            )}
          />
          <span>{localComment.active_votes.length}</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            setShowReply(!showReply);
            setIsEditing(false);
          }}
          className={cn(
            'flex items-center gap-1 hover:text-green-400 transition-colors post-actions',
            showReply && 'text-green-400',
          )}
        >
          <MessageSquare size={16} />
          <span>{loc('reply')}</span>
        </button>
        {localComment.children > 0 && replies.length === 0 && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              fetchReplies();
            }}
            className="text-cyan-500 hover:underline flex items-center gap-1 post-actions"
          >
            {loadingReplies ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <span>{loc('showReplies')} ({localComment.children})</span>
            )}
          </button>
        )}
      </div>

      {showReply && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 py-2 inline-reply-container"
        >
          <ReplyBox
            draftKey={`comment-reply-${localComment.permlink}`}
            value={replyBody}
            onChange={setReplyBody}
            placeholder={`${loc('replyTo')} @${localComment.author}`}
            onSend={async (body) => {
              const activeUser = currentUser || 'you';
              const tempPermlink = `re-${localComment.author.replace(/\./g, '')}-${Date.now()}`;
              const optimisticReply: SteemPost = {
                author: activeUser,
                permlink: tempPermlink,
                category: localComment.category || '',
                title: '',
                body: body,
                json_metadata: JSON.stringify({ tags: [], app: 'steem-editor', format: 'markdown' }),
                created: new Date().toISOString().replace('Z', ''),
                active_votes: [],
                children: 0,
                parent_author: localComment.author,
                parent_permlink: localComment.permlink,
              };

              // Optimistically append the reply to replies state immediately
              setReplies((prev) => [...prev, optimisticReply]);

              setLocalComment((prev) => ({
                ...prev,
                children: prev.children + 1,
              }));

              // Submit the reply
              await onComment(localComment.author, localComment.permlink, body);
              setReplyBody('');
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
              fontSize={fontSize}
            />
          ))}
        </div>
      )}
    </div>
  );
});
