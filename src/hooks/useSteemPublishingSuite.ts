import { useEffect, useState } from 'react';
import { usePostSettings } from './usePostSettings';
import { useSteemQueue, processContentForSteem } from './useSteemQueue';
import { usePublishingManager } from './usePublishingManager';
import { useEditorStore } from '../store';

export { processContentForSteem };

export interface UseSteemPublishingSuiteProps {
  syncWysiwygToContentIfVisual: () => string;
  t: (key: any) => string;
  notify: (msg: string, type?: any) => void;
  drafts: any[];
  setDrafts: React.Dispatch<React.SetStateAction<any[]>>;
  splitWords: number;
  pubTags: string;
  pubTitle: string;
  setPubTitle: (val: string) => void;
  editingPermlink: string | null;
  setEditingPermlink: (val: string | null) => void;
  authType: any;
  setAuthType: (val: any) => void;
  selectedVaultUser: string;
  username: string;
  vaultPin: string;
  initVault: (pin?: string) => any;
  promptDialog: (opts: any) => Promise<string | null>;
  saveDraftHook: (content: string, status: 'working' | 'ready', notify: any, t: any, meta?: any) => void;
  setActiveModal: (val: string | null) => void;
  activeModal: string | null;
  setPubLog: (log: any) => void;
}

function extractFirstLineTitle(rawContent: string): string {
  return (rawContent.split('\n')[0] || '').replace(/[#*`]/g, '').trim().substring(0, 70);
}

export function useSteemPublishingSuite({
  syncWysiwygToContentIfVisual,
  t,
  notify,
  drafts,
  setDrafts,
  splitWords,
  pubTags,
  pubTitle,
  setPubTitle,
  editingPermlink,
  setEditingPermlink,
  authType,
  setAuthType,
  selectedVaultUser,
  username,
  vaultPin,
  initVault,
  promptDialog,
  saveDraftHook,
  setActiveModal,
  activeModal,
  setPubLog,
}: UseSteemPublishingSuiteProps) {
  const [isPubTitleManuallyEdited, setIsPubTitleManuallyEdited] = useState(false);
  const [allowTitleChangeInEdit, setAllowTitleChangeInEdit] = useState(false);

  // 1. Post & Publishing Settings
  const postSettings = usePostSettings();
  const {
    rewardType,
    setRewardType,
    removeTitleLine,
    setRemoveTitleLine,
    appAgent,
    setAppAgent,
    beneficiaries,
    setBeneficiaries,
    benName,
    setBenName,
    benWeight,
    setBenWeight,
    showAdvancedSettings,
    setShowAdvancedSettings,
    showAdvancedPublish,
    setShowAdvancedPublish,
    tagGroups,
    setTagGroups,
  } = postSettings;

  // Reset title-edit unlock whenever editing session switches/exits
  useEffect(() => {
    setAllowTitleChangeInEdit(false);
  }, [editingPermlink]);

  // 2. Event-driven Auto-Title & Auth Sync (no timers/polling; zero keystroke overhead)
  useEffect(() => {
    if (activeModal === 'publish') {
      if (typeof window !== 'undefined' && !(window as any).steem_keychain) {
        setAuthType('VAULT');
      }
      if (!editingPermlink && !isPubTitleManuallyEdited) {
        const latestContent = syncWysiwygToContentIfVisual() || useEditorStore.getState().content;
        const firstLine = extractFirstLineTitle(latestContent);
        setPubTitle(firstLine);
      }
    }
  }, [activeModal, editingPermlink, isPubTitleManuallyEdited, setAuthType, setPubTitle, syncWysiwygToContentIfVisual]);

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      if (state.content === prevState.content) return;
      if (editingPermlink || isPubTitleManuallyEdited) return;
      const prevFirst = extractFirstLineTitle(prevState.content);
      const nextFirst = extractFirstLineTitle(state.content);
      if (nextFirst !== prevFirst) {
        setPubTitle(nextFirst);
      }
    });
    return unsubscribe;
  }, [editingPermlink, isPubTitleManuallyEdited, setPubTitle]);

  // 3. Publishing Queue
  const publishingQueue = useSteemQueue({
    appAgent,
    t,
    promptDialog,
    notify,
    vaultPin,
    initVault,
    setActiveModal,
    setPubLog,
    removeTitleLine,
    pubTitle,
    pubTags,
    authType,
    username,
    selectedVaultUser,
    editingPermlink,
    setEditingPermlink,
    onExitEditMode: () => {
      setIsPubTitleManuallyEdited(false);
      setAllowTitleChangeInEdit(false);
    },
  });

  const {
    queue,
    setQueue,
    scheduledTime,
    setScheduledTime,
    performBroadcast,
    publishFromQueue,
    addToQueue,
  } = publishingQueue;

  // 4. Publishing Manager
  const publishingManager = usePublishingManager({
    syncWysiwygToContentIfVisual,
    t,
    notify,
    drafts,
    setDrafts,
    splitWords,
    pubTags,
    pubTitle,
    removeTitleLine,
    isEditingPost: editingPermlink !== null,
    editingPermlink,
    setEditingPermlink,
    setIsPubTitleManuallyEdited,
    setAllowTitleChangeInEdit,
    authType,
    selectedVaultUser,
    username,
    rewardType,
    beneficiaries,
    vaultPin,
    initVault,
    promptDialog,
    performBroadcast,
    processContentForSteem,
    addToQueue,
    saveDraftHook,
    setActiveModal,
    setPubLog,
  });

  const {
    extractMentions,
    sanitizeFilename,
    handleSplitPost,
    handlePublish,
    handleAddToQueue,
  } = publishingManager;

  return {
    // Packages for composite props builders
    postSettings,
    publishingQueue,
    publishingManager,

    // Title & edit mode controls
    isPubTitleManuallyEdited,
    setIsPubTitleManuallyEdited,
    allowTitleChangeInEdit,
    setAllowTitleChangeInEdit,

    // Settings helpers
    rewardType,
    setRewardType,
    removeTitleLine,
    setRemoveTitleLine,
    appAgent,
    setAppAgent,
    beneficiaries,
    setBeneficiaries,
    benName,
    setBenName,
    benWeight,
    setBenWeight,
    showAdvancedSettings,
    setShowAdvancedSettings,
    showAdvancedPublish,
    setShowAdvancedPublish,
    tagGroups,
    setTagGroups,

    // Queue helpers
    queue,
    setQueue,
    scheduledTime,
    setScheduledTime,
    performBroadcast,
    publishFromQueue,
    addToQueue,

    // Publishing helpers
    extractMentions,
    sanitizeFilename,
    handleSplitPost,
    handlePublish,
    handleAddToQueue,
  };
}
