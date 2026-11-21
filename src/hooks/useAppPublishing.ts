import { useCallback } from 'react';
import { SteemPost } from '../types';
import { type SaveDraftMeta } from './useDrafts';

export interface UseAppPublishingProps {
  syncWysiwygToContentIfVisual: () => string;
  saveDraftHook: (currentMarkdown: string, status: 'working' | 'ready', notify: any, t: any, meta?: SaveDraftMeta) => void;
  confirmDialog: (title: string, msg: string) => Promise<boolean>;
  notify: (msg: string, type?: any) => void;
  t: (key: any) => string;
  pubTitle?: string;
  setPubTitle: (title: string) => void;
  setContent: (content: string) => void;
  pubTags?: string;
  setPubTags: React.Dispatch<React.SetStateAction<string>> | ((tags: any) => void);
  editingPermlink?: string | null;
  setEditingPermlink: (permlink: string | null) => void;
  editingOriginalTitle?: string | null;
  setEditingOriginalTitle?: (title: string | null) => void;
  setCurrentDraftId?: (id: string | null) => void;
  setIsPubTitleManuallyEdited?: (val: boolean) => void;
  setAllowTitleChangeInEdit?: (val: boolean) => void;
  setActiveView: (view: 'editor' | 'reader') => void;
  lastSyncContentRef: React.MutableRefObject<string>;
  syncCursorMarkdownToVisual: () => Promise<void>;
  mentions: string[];
  setMentions: (mentions: string[]) => void;
  newMention: string;
  setNewMention: (mention: string) => void;
  STORAGE_KEY_USERS: string;
}

export function useAppPublishing({
  syncWysiwygToContentIfVisual,
  saveDraftHook,
  confirmDialog,
  notify,
  t,
  pubTitle,
  setPubTitle,
  setContent,
  pubTags,
  setPubTags,
  editingPermlink,
  setEditingPermlink,
  editingOriginalTitle,
  setEditingOriginalTitle,
  setCurrentDraftId,
  setIsPubTitleManuallyEdited,
  setAllowTitleChangeInEdit,
  setActiveView,
  lastSyncContentRef,
  syncCursorMarkdownToVisual,
  mentions,
  setMentions,
  newMention,
  setNewMention,
  STORAGE_KEY_USERS,
}: UseAppPublishingProps) {
  const toggleTag = useCallback((tag: string) => {
    setPubTags((prev: any) => {
      const prevStr = typeof prev === 'string' ? prev : '';
      const tags = prevStr.split(' ').filter(t => t.trim());
      if (tags.includes(tag)) {
        return tags.filter(t => t !== tag).join(' ');
      }
      return [...tags, tag].join(' ');
    });
  }, [setPubTags]);

  const saveDraft = useCallback((status: 'working' | 'ready' = 'working') => {
    const currentMarkdown = syncWysiwygToContentIfVisual();
    saveDraftHook(currentMarkdown, status, notify, t, {
      editingPermlink: editingPermlink || null,
      editingOriginalTitle: editingPermlink ? (editingOriginalTitle ?? pubTitle) : undefined,
      tags: pubTags,
      pubTitle,
    });
  }, [syncWysiwygToContentIfVisual, saveDraftHook, notify, t, editingPermlink, editingOriginalTitle, pubTags, pubTitle]);

  const handleEditPost = useCallback(async (post: SteemPost) => {
    const currentMarkdown = syncWysiwygToContentIfVisual();
    if (currentMarkdown && currentMarkdown.trim() !== '' && currentMarkdown.trim() !== post.body.trim()) {
      const saveFirst = await confirmDialog(
        t('saveDraftBeforeNew'),
        t('saveDraft')
      );
      if (saveFirst) {
        saveDraft('working');
      }
    }

    let parsedTags = post.category || '';
    try {
      const meta = JSON.parse(post.json_metadata || '{}');
      if (Array.isArray(meta?.tags) && meta.tags.length > 0) {
        parsedTags = meta.tags.join(' ');
      }
    } catch {
      parsedTags = post.category || '';
    }

    const originalTitle = post.title ?? '';

    setCurrentDraftId?.(null);
    setIsPubTitleManuallyEdited?.(false);
    setAllowTitleChangeInEdit?.(false);
    // Set edit metadata synchronously before updating content so auto-title subscribers preserve post.title
    setEditingPermlink(post.permlink);
    setEditingOriginalTitle?.(originalTitle);
    setPubTitle(originalTitle);
    setPubTags(parsedTags);
    setContent(post.body);
    setActiveView('editor');
    lastSyncContentRef.current = post.body;
    setTimeout(() => {
      syncCursorMarkdownToVisual();
    }, 50);
    notify(t('editor'), 'success');
  }, [
    syncWysiwygToContentIfVisual,
    confirmDialog,
    t,
    saveDraft,
    setCurrentDraftId,
    setIsPubTitleManuallyEdited,
    setAllowTitleChangeInEdit,
    setPubTitle,
    setContent,
    setPubTags,
    setEditingPermlink,
    setEditingOriginalTitle,
    setActiveView,
    lastSyncContentRef,
    syncCursorMarkdownToVisual,
    notify,
  ]);

  const addMention = useCallback(() => {
    const name = newMention.trim().replace('@', '');
    if (!name || mentions.includes(name)) return;
    const updated = [name, ...mentions];
    setMentions(updated);
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
    } catch (e) {
      console.debug(e);
    }
    setNewMention('');
  }, [newMention, mentions, setMentions, setNewMention, STORAGE_KEY_USERS]);

  return {
    toggleTag,
    saveDraft,
    handleEditPost,
    addMention,
  };
}
