import { useMemo } from 'react';
import { type EditorPaneProps } from '../components/editor/EditorPane';
import { useEditorModeManager } from './useEditorModeManager';
import { useWysiwygSync } from './useWysiwygSync';
import { useEditorFormat } from './useEditorFormat';
import { useEditorEvents } from './useEditorEvents';
import { useTableOperations } from './useTableOperations';
import { useFloatingWidgetState } from './useFloatingWidgetState';
import { useSteemGallery } from './useSteemGallery';
import { useTypingSound } from '../services/audio/useTypingSound';
import { htmlToMarkdown, convertBareImageUrlsToMarkdown, isImageAndProxyUrl } from '../lib/editorSync';
import { getMarked } from '../utils/markdownParser';
import { useEditorStore } from '../store';

export type BuildEditorPanePropsInput = EditorPaneProps;

export interface CompositeEditorPanePropsInput {
  // Core packages
  modeManager: ReturnType<typeof useEditorModeManager>;
  wysiwygSync: ReturnType<typeof useWysiwygSync>;
  editorFormat: ReturnType<typeof useEditorFormat>;
  editorEvents: ReturnType<typeof useEditorEvents>;
  tableOps: ReturnType<typeof useTableOperations>;
  floatingWidget: ReturnType<typeof useFloatingWidgetState>;
  gallery: ReturnType<typeof useSteemGallery>;

  // Context & UI Refs
  editorPaneRef: React.RefObject<HTMLDivElement | null>;
  editorRef: React.RefObject<any>;
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  isSyncingRef: React.RefObject<boolean>;
  wysiwygLocalBackupTimeoutRef: React.MutableRefObject<any>;
  wysiwygSyncTimeoutRef: React.MutableRefObject<any>;
  lastSyncContentRef: React.MutableRefObject<string>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;

  // Environment & Layout
  isEditorFullScreen: boolean;
  isFullScreen: boolean;
  vvHeight: number | null;
  viewportHeight: number;
  offsetTop: number;
  activeMobileTab: string;
  visualStyle: string;
  isDarkMode: boolean;
  typingSound?: ReturnType<typeof useTypingSound>;
  onOpenAudioPresetsModal?: () => void;
  isLivePreviewEnabled?: boolean;
  onDemandSyncEnabled: boolean;
  beautifyEnabled?: boolean;
  neonTextColored: boolean;
  isSpacingMenuOpen: boolean;
  wysiwygSpacing: number;
  editorFontSize: number;
  toolbarIconSize: number;
  keyboardOffset: number | null;
  performanceMode: boolean;
  isKeyboardOpen: boolean;
  isSidebarOpen: boolean;
  isWidgetMenuOpen: boolean;
  setIsWidgetMenuOpen: (val: boolean) => void;
  lang: string;
  pubTitle?: string;
  setPubTitle?: (val: string) => void;
  pubTags?: string;
  setPubTags?: (val: string) => void;
  drafts?: any[];
  saveDraft?: (status?: 'working' | 'ready') => void;
  toggleEditorFullScreen: () => void;
  setOnDemandSyncEnabled: (val: boolean) => void;
  notify: (msg: string, type?: any) => void;
  toggleLivePreview?: () => void;
  setBeautifyEnabled?: (val: boolean) => void;
  setNeonTextColored: (val: boolean) => void;
  setIsSpacingMenuOpen: (val: boolean) => void;
  setWysiwygSpacing: (val: number) => void;
  setEditorFontSize: (val: number) => void;
  setToolbarIconSize: (val: number) => void;
  isMiniGalleryOpen?: boolean;
  setIsMiniGalleryOpen: (val: boolean) => void;
  setJustInsertedUrl: (val: string | null) => void;
  justInsertedUrl: string | null;
  showMobileTools1: boolean;
  showMobileTools2: boolean;
  showMobileToolsOpen: boolean;
  setShowMobileTools1: (val: boolean) => void;
  setShowMobileTools2: (val: boolean) => void;
  setShowMobileToolsOpen: (val: boolean) => void;
  activeModal: string | null;
  setActiveModal: (val: string | null) => void;
  setSettingsTab: (val: any) => void;
  setIsEditorFocused: (val: boolean) => void;
  confirmDialog: any;
  TOOLS_MAP: any;
  t: (key: any) => string;
}

export function isCompositeEditorPanePropsInput(
  input: BuildEditorPanePropsInput | CompositeEditorPanePropsInput
): input is CompositeEditorPanePropsInput {
  return 'modeManager' in input && 'editorEvents' in input;
}

/**
 * buildEditorPaneProps:
 * Pure utility function to assemble and validate EditorPaneProps either from
 * direct props or high-level composite hook packages.
 */
export function buildEditorPaneProps(input: BuildEditorPanePropsInput | CompositeEditorPanePropsInput): EditorPaneProps {
  if (isCompositeEditorPanePropsInput(input)) {
    const {
      modeManager,
      wysiwygSync,
      editorFormat,
      editorEvents,
      tableOps,
      floatingWidget,
      gallery,
      editorPaneRef,
      editorRef,
      wysiwygRef,
      isSyncingRef,
      wysiwygLocalBackupTimeoutRef,
      wysiwygSyncTimeoutRef,
      lastSyncContentRef,
      fileInputRef,
      scrollRef,
      isEditorFullScreen,
      isFullScreen,
      vvHeight,
      viewportHeight,
      offsetTop,
      activeMobileTab,
      visualStyle,
      isDarkMode,
      typingSound,
      onOpenAudioPresetsModal,
      isLivePreviewEnabled,
      onDemandSyncEnabled,
      beautifyEnabled,
      neonTextColored,
      isSpacingMenuOpen,
      wysiwygSpacing,
      editorFontSize,
      toolbarIconSize,
      keyboardOffset,
      performanceMode,
      isKeyboardOpen,
      isSidebarOpen,
      isWidgetMenuOpen,
      setIsWidgetMenuOpen,
      lang,
      pubTitle,
      setPubTitle,
      pubTags,
      setPubTags,
      drafts,
      saveDraft,
      toggleEditorFullScreen,
      setOnDemandSyncEnabled,
      notify,
      toggleLivePreview,
      setBeautifyEnabled,
      setNeonTextColored,
      setIsSpacingMenuOpen,
      setWysiwygSpacing,
      setEditorFontSize,
      setToolbarIconSize,
      isMiniGalleryOpen = false,
      setIsMiniGalleryOpen,
      setJustInsertedUrl,
      justInsertedUrl,
      showMobileTools1,
      showMobileTools2,
      showMobileToolsOpen,
      setShowMobileTools1,
      setShowMobileTools2,
      setShowMobileToolsOpen,
      activeModal,
      setActiveModal,
      setSettingsTab,
      setIsEditorFocused,
      confirmDialog,
      TOOLS_MAP,
      t,
    } = input;

    return {
      editorPaneRef,
      editorRef,
      wysiwygRef,
      isSyncingRef,
      wysiwygLocalBackupTimeoutRef,
      wysiwygSyncTimeoutRef,
      lastSyncContentRef,
      fileInputRef,
      isEditorFullScreen,
      vvHeight,
      activeMobileTab,
      visualStyle,
      isDarkMode,
      t,
      editorMode: modeManager.editorMode,
      typingSound,
      onOpenAudioPresetsModal,
      isLivePreviewEnabled,
      onDemandSyncEnabled,
      beautifyEnabled,
      neonTextColored,
      isSpacingMenuOpen,
      wysiwygSpacing,
      editorFontSize,
      toolbarIconSize,
      activeTable: tableOps.activeTable,
      tableRect: tableOps.tableRect,
      isTableMenuExpanded: tableOps.isTableMenuExpanded,
      isTableMenuPinned: tableOps.isTableMenuPinned,
      isMiniGalleryOpen,
      images: gallery.images,
      justInsertedUrl,
      keyboardOffset,
      isFullScreen,
      widgetPos: floatingWidget.widgetPos,
      isWidgetVisible: floatingWidget.isWidgetVisible,
      isWidgetMenuOpen,
      activeFormats: editorFormat.activeFormats,
      showMobileTools1,
      showMobileTools2,
      showMobileToolsOpen,
      activeModal,
      widgetNoBorder: floatingWidget.widgetNoBorder,
      performanceMode,
      floatingPos: floatingWidget.floatingPos,
      widgetRef: floatingWidget.widgetRef,
      offsetTop,
      viewportHeight,
      isKeyboardOpen,
      isSidebarOpen,
      scrollRef,
      lockedToolsWidth: floatingWidget.lockedToolsWidth,
      enabledTools: floatingWidget.enabledTools,
      menuDirection: floatingWidget.menuDirection,
      widgetOpacity: floatingWidget.widgetOpacity,
      lang,
      pubTitle,
      setPubTitle,
      pubTags,
      setPubTags,
      drafts,
      saveDraft,
      handleSetEditorMode: modeManager.handleSetEditorMode,
      toggleEditorFullScreen,
      setOnDemandSyncEnabled,
      notify,
      toggleLivePreview,
      setBeautifyEnabled,
      setNeonTextColored,
      setIsSpacingMenuOpen,
      setWysiwygSpacing,
      setEditorFontSize,
      setToolbarIconSize,
      setIsTableMenuExpanded: tableOps.setIsTableMenuExpanded,
      setIsTableMenuPinned: tableOps.setIsTableMenuPinned,
      setIsMiniGalleryOpen,
      setJustInsertedUrl,
      setWidgetPos: floatingWidget.setWidgetPos,
      setIsWidgetVisible: floatingWidget.setIsWidgetVisible,
      setIsWidgetMenuOpen,
      setShowMobileTools1,
      setShowMobileTools2,
      setShowMobileToolsOpen,
      setActiveModal,
      setSettingsTab,
      setLockedToolsWidth: floatingWidget.setLockedToolsWidth,
      setEnabledTools: floatingWidget.setEnabledTools,
      setWidgetOpacity: floatingWidget.setWidgetOpacity,
      setWidgetNoBorder: floatingWidget.setWidgetNoBorder,
      saveCursorPosition: modeManager.saveCursorPosition,
      setIsEditorFocused,
      handleEditorKeyDown: editorEvents.handleEditorKeyDown,
      handleEditorScroll: editorEvents.handleEditorScroll,
      showWidget: floatingWidget.showWidget,
      handleWysiwygBeforeInput: editorEvents.handleWysiwygBeforeInput,
      handleWysiwygKeyDown: editorEvents.handleWysiwygKeyDown,
      isImageAndProxyUrl,
      insertHtmlAtCursor: editorFormat.insertHtmlAtCursor,
      updateContentFromWysiwyg: wysiwygSync.updateContentFromWysiwyg,
      htmlToMarkdown,
      convertBareImageUrlsToMarkdown,
      getMarked,
      setContent: useEditorStore.getState().setContent,
      saveVisualSelection: wysiwygSync.saveVisualSelection,
      updateWysiwygEmptyStatus: wysiwygSync.updateWysiwygEmptyStatus,
      deleteActiveTableRow: tableOps.deleteActiveTableRow,
      deleteActiveTableCol: tableOps.deleteActiveTableCol,
      deleteActiveTable: tableOps.deleteActiveTable,
      insertImage: gallery.insertImage,
      insertAtCursor: editorFormat.insertAtCursor,
      confirmDialog,
      handleWidgetAction: floatingWidget.handleWidgetAction,
      moveTool: floatingWidget.moveTool,
      toggleTool: floatingWidget.toggleTool,
      fmt: editorFormat.fmt,
      fmtLine: editorFormat.fmtLine,
      handleIndent: editorFormat.handleIndent,
      handleLink: editorFormat.handleLink,
      importTable: tableOps.importTable,
      TOOLS_MAP,
      scrollCaretIntoView: editorEvents.scrollCaretIntoView,
    } as EditorPaneProps;
  }
  return input;
}

/**
 * useEditorPaneProps:
 * Encapsulates the aggregation of EditorPaneProps outside of App.tsx,
 * safely memoizing the props bundle and removing the 125-line definition
 * from the root application component.
 */
export function useEditorPaneProps(input: BuildEditorPanePropsInput | CompositeEditorPanePropsInput): EditorPaneProps {
  return useMemo(() => buildEditorPaneProps(input), [input]);
}
