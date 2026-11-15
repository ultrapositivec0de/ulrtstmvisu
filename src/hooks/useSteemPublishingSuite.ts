import { useEffect } from 'react';
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
  saveDraftHook: (content: string, status: 'working' | 'ready', notify: any, t: any) => void;
  setActiveModal: (val: string | null) => void;
  activeModal: string | null;
  setPubLog: (log: any) => void;
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

  // 2. Auto-Title & Auth Sync on Publish Modal Open
  useEffect(() => {
    if (activeModal === 'publish') {
      if (typeof window !== 'undefined' && !(window as any).steem_keychain) {
        setAuthType('VAULT');
      }
      if (!pubTitle) {
        const content = useEditorStore.getState().content;
        const firstLine = content.split('\n')[0].replace(/[#*`]/g, '').trim();
        if (firstLine) setPubTitle(firstLine.substring(0, 70));
      }
    }
  }, [activeModal, pubTitle, setAuthType, setPubTitle]);

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
