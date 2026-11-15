import { useCallback, useEffect } from 'react';
import { probeNodes } from '../lib/steem';
import { marked } from 'marked';
import { useEditorStore } from '../store';
import { useModalStore } from '../stores/useModalStore';
import { useSteemPublishingSuite, processContentForSteem } from './useSteemPublishingSuite';
import { useSteemGallery } from './useSteemGallery';
import { useAppBackup } from './useAppBackup';
import { useReaderBlockchainActions } from './useReaderBlockchainActions';
import { useEditorShortcutsAndAutosave } from './useEditorShortcutsAndAutosave';
import { useAppPublishing } from './useAppPublishing';
import { useEditorWorker } from './useEditorWorker';
import { createToolsMap } from '../components/editor/toolsMap';

import { WorkspaceDOMRefs } from './useWorkspaceDOMRefs';
import { WorkspaceEditorState } from './useWorkspaceEditorState';

export { processContentForSteem };

export interface UseWorkspaceServicesParams {
  // Primitives & Shared References
  t: (key: any) => string;
  notify: any;
  confirmDialog: any;
  promptDialog: any;
  setPubLog: any;
  lang: any;
  pubTitle: string;
  setPubTitle: (t: string) => void;
  pubTags: string;
  setPubTags: (t: string) => void;
  splitWords?: number;
  editingPermlink?: string | null;
  setEditingPermlink?: (p: string | null) => void;
  activeModal: string | null;
  setActiveModal: (m: string | null) => void;
  activeView: any;
  setActiveView: (v: any) => void;
  performanceMode?: boolean;
  isLivePreviewEnabled?: boolean;
  syncScrollEnabled?: boolean;
  saveLargeStorage: any;
  STORAGE_KEY_AUTOSAVE: string;
  STORAGE_KEY_USERS: string;
  hasLoadedRef?: React.MutableRefObject<boolean>;
  isFirstRender?: React.MutableRefObject<boolean>;
  getMarked: () => any;
  setIsMiniGalleryOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  exportBackup: any;
  importBackup: any;

  // Domain suites & refs
  auth: any;
  draftsManager: any;
  editorCore: any;
  pwa: any;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  previewPaneRef?: React.RefObject<HTMLDivElement | null>;
  editorRef?: React.RefObject<HTMLTextAreaElement | null>;
  wysiwygRef?: React.RefObject<HTMLDivElement | null>;
  lastSyncContentRef?: React.MutableRefObject<string>;
  contentForPublish: string;
  mentions?: string[];
  setMentions?: any;
  newMention?: string;
  setNewMention?: any;

  // Bundled refs and editor state
  domRefs?: WorkspaceDOMRefs;
  editorState?: WorkspaceEditorState;
}

export function useWorkspaceServices(params: UseWorkspaceServicesParams) {
  const {
    t,
    notify,
    confirmDialog,
    promptDialog,
    setPubLog,
    lang,
    pubTitle,
    setPubTitle,
    pubTags,
    setPubTags,
    activeModal,
    setActiveModal,
    activeView,
    setActiveView,
    saveLargeStorage,
    STORAGE_KEY_AUTOSAVE,
    STORAGE_KEY_USERS,
    getMarked,
    auth,
    draftsManager,
    editorCore,
    pwa,
    contentForPublish,
    exportBackup,
    importBackup,
    domRefs,
    editorState,
  } = params;

  const hasLoadedRef = (domRefs?.hasLoadedRef ?? params.hasLoadedRef)!;

  const editorRef = (domRefs?.editorRef ?? params.editorRef)!;
  const wysiwygRef = (domRefs?.wysiwygRef ?? params.wysiwygRef)!;
  const fileInputRef = (domRefs?.fileInputRef ?? params.fileInputRef)!;
  const previewPaneRef = (domRefs?.previewPaneRef ?? params.previewPaneRef)!;
  const lastSyncContentRef = (domRefs?.lastSyncContentRef ?? params.lastSyncContentRef)!;
  const isFirstRender = (domRefs?.isFirstRender ?? params.isFirstRender)!;

  const performanceMode = editorState?.performanceMode ?? params.performanceMode ?? true;
  const isLivePreviewEnabled = editorState?.isLivePreviewEnabled ?? params.isLivePreviewEnabled ?? false;
  const syncScrollEnabled = editorState?.syncScrollEnabled ?? params.syncScrollEnabled ?? true;
  const setIsMiniGalleryOpen = (editorState?.setIsMiniGalleryOpen ?? params.setIsMiniGalleryOpen)!;
  const splitWords = editorState?.splitWords ?? params.splitWords ?? 300;
  const editingPermlink = editorState?.editingPermlink ?? params.editingPermlink ?? null;
  const setEditingPermlink = (editorState?.setEditingPermlink ?? params.setEditingPermlink)!;
  const mentions = editorState?.mentions ?? params.mentions ?? [];
  const setMentions = editorState?.setMentions ?? params.setMentions;
  const newMention = editorState?.newMention ?? params.newMention ?? '';
  const setNewMention = editorState?.setNewMention ?? params.setNewMention;

  const setContent = useEditorStore(state => state.setContent);

  const {
    syncWysiwygToContentIfVisual,
    syncCursorMarkdownToVisual,
    editorMode,
    savedVisualRangeRef,
    cursorPositionRef,
    saveVisualSelection,
    saveCursorPosition,
    activeTableRef,
    activeTableRowRef,
    activeTableCellRef,
    setActiveTable,
    setActiveTableRow,
    setActiveTableCell,
    fmt,
    fmtLine,
    handleLink,
    handleIndent,
    importTable,
    insertAtCursor,
    setTableSelectorPos,
  } = editorCore;

  const setShowTableSelector = useModalStore((s) => s.setIsTableSelectorOpen);

  const {
    drafts,
    setDrafts,
    saveDraft: saveDraftHook,
  } = draftsManager;

  const {
    authType,
    setAuthType,
    username,
    setUsername,
    selectedVaultUser,
    vaultPin,
    setVaultPin,
    isVaultInitialized,
    vaultAccounts,
    isUnlocked,
    pexelsApiKey,
    pixabayApiKey,
    unsplashAccessKey,
    initVault,
  } = auth;

  // 1. Publishing Suite
  const publishingSuite = useSteemPublishingSuite({
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
  });

  const {
    postSettings,
    publishingQueue,
    publishingManager,
    appAgent,
    extractMentions,
    sanitizeFilename,
  } = publishingSuite;

  // 2. Editor Web Worker (Stats & Cleanup)
  const handleWorkerStats = useCallback((rawStats: any, cleanStatsResult: any) => {
    useEditorStore.getState().setStats(rawStats, cleanStatsResult);
  }, []);

  useEditorWorker(handleWorkerStats);

  // 3. Gallery & Media Manager
  const gallery = useSteemGallery({
    t,
    notify,
    promptDialog,
    insertAtCursor,
    setActiveModal,
    initVault,
    isUnlocked,
    isVaultInitialized,
    setVaultPin,
    setPubLog,
    username,
    setUsername,
    selectedVaultUser,
    vaultAccounts,
    pexelsApiKey,
    pixabayApiKey,
    unsplashAccessKey,
    performanceMode,
    setIsMiniGalleryOpen,
    authType,
  });

  const {
    imageUploadAccount,
  } = gallery;

  // 4. Backup & Export
  const appBackup = useAppBackup({
    lang,
    drafts,
    setDrafts,
    pubTitle,
    pubTags,
    exportBackup: params.exportBackup,
    importBackup: params.importBackup,
    syncWysiwygToContentIfVisual,
    processContentForSteem,
    notify,
    confirmDialog,
    t,
  });

  // 5. Reader Actions
  const readerBlockchainActions = useReaderBlockchainActions({
    authType,
    selectedVaultUser,
    username,
    imageUploadAccount,
    vaultAccounts,
    vaultPin,
    appAgent,
    mutedUsers: pwa.mutedUsers,
    setMutedUsers: pwa.setMutedUsers,
    initVault,
    notify,
    setPubLog,
    promptDialog,
    sanitizeFilename,
    setUsername,
    t,
  });

  // 6. Editor Shortcuts, Selection & Autosave Pipeline
  useEditorShortcutsAndAutosave({
    editorMode,
    editorRef,
    wysiwygRef,
    previewPaneRef,
    savedVisualRangeRef,
    cursorPositionRef,
    hasLoadedRef,
    isFirstRender,
    activeTableRef,
    activeTableRowRef,
    activeTableCellRef,
    setActiveTable,
    setActiveTableRow,
    setActiveTableCell,
    saveVisualSelection,
    saveCursorPosition,
    saveLargeStorage,
    STORAGE_KEY_AUTOSAVE,
    isLivePreviewEnabled,
    syncScrollEnabled,
    lang,
    getMarked,
    t,
  });

  // 7. Initial document restore
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY_AUTOSAVE) || sessionStorage.getItem(STORAGE_KEY_AUTOSAVE);
    } catch (err) {
      console.debug(err);
    }
    if (saved && saved !== useEditorStore.getState().content) {
      setContent(saved);
    }
    hasLoadedRef.current = true;
  }, [setContent, STORAGE_KEY_AUTOSAVE, hasLoadedRef]);

  // 8. Initial Steem Node probing & marked parser config
  useEffect(() => {
    probeNodes();
    if (marked && (marked as any).use) {
      (marked as any).use({ breaks: true, gfm: true });
    }
  }, []);

  // 9. Publishing & Draft Management
  const appPublishing = useAppPublishing({
    syncWysiwygToContentIfVisual,
    saveDraftHook,
    confirmDialog,
    notify,
    t,
    setPubTitle,
    setContent,
    setPubTags,
    setEditingPermlink,
    setActiveView,
    lastSyncContentRef,
    syncCursorMarkdownToVisual,
    mentions,
    setMentions,
    newMention,
    setNewMention,
    STORAGE_KEY_USERS,
  });

  // 10. Tools Map
  const TOOLS_MAP = createToolsMap({
    fmt,
    fmtLine,
    handleLink,
    insertAtCursor,
    importTable,
    setTableSelectorPos,
    setShowTableSelector,
    editorRef,
    setContent,
    promptDialog,
    setActiveModal,
    extractMentions,
    contentForPublish,
    fileInputRef,
    setIsMiniGalleryOpen,
    t,
  });

  return {
    publishingSuite,
    postSettings,
    publishingQueue,
    publishingManager,
    gallery,
    appBackup,
    readerBlockchainActions,
    appPublishing,
    TOOLS_MAP,
  };
}
