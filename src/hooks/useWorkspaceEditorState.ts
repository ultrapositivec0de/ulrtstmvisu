import { useState, useEffect } from 'react';
import { useEditorStore } from '../store';
import { useAppUIStore, type SettingsTab } from '../stores/useAppUIStore';
import { useModalStore } from '../stores/useModalStore';
import { usePerformanceStore } from '../stores/usePerformanceStore';

const LEGACY_ONDEMAND_SYNC_KEY = 'steem_on_demand_sync';

export interface UseWorkspaceEditorStateParams {
  authType: string;
  selectedVaultUser: string;
  username: string;
  storageKeyUsers: string;
}

export interface WorkspaceEditorState {
  splitWords: number;
  setSplitWords: React.Dispatch<React.SetStateAction<number>>;
  performanceMode: boolean;
  setPerformanceMode: React.Dispatch<React.SetStateAction<boolean>>;
  activeMobileTab: 'editor' | 'preview';
  setActiveMobileTab: React.Dispatch<React.SetStateAction<'editor' | 'preview'>>;
  isEditorFocused: boolean;
  setIsEditorFocused: React.Dispatch<React.SetStateAction<boolean>>;
  isMiniGalleryOpen: boolean;
  setIsMiniGalleryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  justInsertedUrl: string | null;
  setJustInsertedUrl: React.Dispatch<React.SetStateAction<string | null>>;
  onDemandSyncEnabled: boolean;
  setOnDemandSyncEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  syncScrollEnabled: boolean;
  setSyncScrollEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isLivePreviewEnabled: boolean;
  setIsLivePreviewEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  toggleLivePreview: () => void;
  settingsTab: SettingsTab;
  setSettingsTab: React.Dispatch<React.SetStateAction<SettingsTab>>;
  mentions: string[];
  setMentions: React.Dispatch<React.SetStateAction<string[]>>;
  newMention: string;
  setNewMention: React.Dispatch<React.SetStateAction<string>>;
  currentUser: string;
  targetReaderPost: { author: string; permlink: string; commentAuthor?: string; commentPermlink?: string } | null;
  setTargetReaderPost: React.Dispatch<React.SetStateAction<{ author: string; permlink: string; commentAuthor?: string; commentPermlink?: string } | null>>;
  editingPermlink: string | null;
  setEditingPermlink: React.Dispatch<React.SetStateAction<string | null>>;
  isSMenuOpen: boolean;
  setIsSMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  beautifyEnabled: boolean;
  setBeautifyEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useWorkspaceEditorState({
  authType,
  selectedVaultUser,
  username,
  storageKeyUsers,
}: UseWorkspaceEditorStateParams): WorkspaceEditorState {
  const [splitWords, setSplitWords] = useState(300);
  const performanceMode = usePerformanceStore((s) => s.performanceMode);
  const setPerformanceMode = usePerformanceStore((s) => s.setPerformanceMode);
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isMiniGalleryOpen, setIsMiniGalleryOpen] = useState(false);
  const [justInsertedUrl, setJustInsertedUrl] = useState<string | null>(null);
  const [onDemandSyncEnabled, setOnDemandSyncEnabled] = useState<boolean>(() => {
    const current = localStorage.getItem('steem_ondemand_sync');
    if (current !== null) return current === 'true';
    const legacy = localStorage.getItem(LEGACY_ONDEMAND_SYNC_KEY);
    if (legacy !== null) {
      localStorage.setItem('steem_ondemand_sync', legacy);
      localStorage.removeItem(LEGACY_ONDEMAND_SYNC_KEY);
      return legacy === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('steem_ondemand_sync', String(onDemandSyncEnabled));
  }, [onDemandSyncEnabled]);

  const syncScrollEnabled = useEditorStore((s) => s.syncScrollEnabled);
  const setSyncScrollEnabled = useEditorStore((s) => s.setSyncScrollEnabled);
  const isLivePreviewEnabled = useEditorStore((s) => s.isLivePreviewEnabled);
  const setIsLivePreviewEnabled = useEditorStore((s) => s.setIsLivePreviewEnabled);
  const toggleLivePreview = useEditorStore((s) => s.toggleLivePreview);
  const beautifyEnabled = useEditorStore((s) => s.beautifyEnabled);
  const setBeautifyEnabled = useEditorStore((s) => s.setBeautifyEnabled);

  const settingsTab = useAppUIStore((s) => s.settingsTab);
  const setSettingsTab = useAppUIStore((s) => s.setSettingsTab);

  const isSMenuOpen = useModalStore((s) => s.isSMenuOpen);
  const setIsSMenuOpen = useModalStore((s) => s.setIsSMenuOpen);

  const [mentions, setMentions] = useState<string[]>(() => {
    const saved = localStorage.getItem(storageKeyUsers);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newMention, setNewMention] = useState('');
  const currentUser = authType === 'VAULT' ? (selectedVaultUser || username) : username;

  useEffect(() => {
    if (username) {
      localStorage.setItem('steem_username', username);
    } else {
      localStorage.removeItem('steem_username');
    }
  }, [username]);

  const [targetReaderPost, setTargetReaderPost] = useState<{ author: string; permlink: string; commentAuthor?: string; commentPermlink?: string } | null>(null);
  const [editingPermlink, setEditingPermlink] = useState<string | null>(null);

  return {
    splitWords,
    setSplitWords,
    performanceMode,
    setPerformanceMode,
    activeMobileTab,
    setActiveMobileTab,
    isEditorFocused,
    setIsEditorFocused,
    isMiniGalleryOpen,
    setIsMiniGalleryOpen,
    justInsertedUrl,
    setJustInsertedUrl,
    onDemandSyncEnabled,
    setOnDemandSyncEnabled,
    syncScrollEnabled,
    setSyncScrollEnabled,
    isLivePreviewEnabled,
    setIsLivePreviewEnabled,
    toggleLivePreview,
    settingsTab,
    setSettingsTab,
    mentions,
    setMentions,
    newMention,
    setNewMention,
    currentUser,
    targetReaderPost,
    setTargetReaderPost,
    editingPermlink,
    setEditingPermlink,
    isSMenuOpen,
    setIsSMenuOpen,
    beautifyEnabled,
    setBeautifyEnabled,
  };
}
