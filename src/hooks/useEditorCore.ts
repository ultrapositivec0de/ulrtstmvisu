import { useRef, useCallback } from 'react';
import { useEditorModeManager } from './useEditorModeManager';
import { useWysiwygSync } from './useWysiwygSync';
import { useEditorFormat } from './useEditorFormat';
import { useEditorEvents } from './useEditorEvents';
import { useTableOperations } from './useTableOperations';
import { htmlToMarkdown } from '../lib/editorSync';
import { useEditorStore } from '../store';

export interface UseEditorCoreProps {
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  previewPaneRef: React.RefObject<HTMLDivElement | null>;
  isSyncingRef: React.MutableRefObject<boolean>;
  lastSyncContentRef: React.MutableRefObject<string>;
  wysiwygLocalBackupTimeoutRef: React.MutableRefObject<number | null>;
  wysiwygSyncTimeoutRef: React.MutableRefObject<number | null>;
  activeView: string;
  activeMobileTab: string;
  isKeyboardOpen: boolean;
  keyboardOffset: number | null;
  widgetPos: 'bottom' | 'floating' | 'hidden';
  toolbarIconSize: number;
  isWidgetVisible: boolean;
  isWidgetMenuOpen: boolean;
  setIsWidgetVisible: (visible: boolean) => void;
  onDemandSyncEnabled: boolean;
  isEditorFocused: boolean;
  syncScrollEnabled: boolean;
  setActiveModal: (modal: any) => void;
  promptDialog: (opts: any) => Promise<string | null>;
  notify: (msg: string, type?: any) => void;
  setContent: (content: string) => void;
  t: (key: any) => string;
}

export function useEditorCore({
  editorRef,
  wysiwygRef,
  previewPaneRef,
  isSyncingRef,
  lastSyncContentRef,
  wysiwygLocalBackupTimeoutRef,
  wysiwygSyncTimeoutRef,
  activeView,
  activeMobileTab,
  isKeyboardOpen,
  keyboardOffset,
  widgetPos,
  toolbarIconSize,
  isWidgetVisible,
  isWidgetMenuOpen,
  setIsWidgetVisible,
  onDemandSyncEnabled,
  isEditorFocused,
  syncScrollEnabled,
  setActiveModal,
  promptDialog,
  notify,
  setContent,
  t,
}: UseEditorCoreProps) {
  // 1. Unified Formats Setter from Zustand Store
  const storeSetActiveFormats = useEditorStore((s) => s.setActiveFormats);

  // 2. Ref Declarations for Inter-Hook Synchronization
  const scrollCaretIntoViewRef = useRef<(block?: ScrollLogicalPosition) => void>(() => {});
  const scrollCaretIntoView = useCallback((block?: ScrollLogicalPosition) => {
    scrollCaretIntoViewRef.current(block);
  }, []);

  const setActiveFormatsRef = useRef<any>(null);
  const saveVisualSelectionRef = useRef<() => void>(() => {});
  const restoreVisualSelectionRef = useRef<() => void>(() => {});
  const syncCursorMarkdownToVisualRef = useRef<() => Promise<void>>(async () => {});
  const syncCursorVisualToMarkdownRef = useRef<() => { md: string } | null>(() => null);

  // 3. Editor Mode Manager
  const modeManager = useEditorModeManager({
    editorRef,
    wysiwygRef,
    isSyncingRef,
    lastSyncContentRef,
    activeView,
    activeMobileTab,
    isKeyboardOpen,
    widgetPos,
    toolbarIconSize,
    setActiveFormats: storeSetActiveFormats,
    saveVisualSelection: useCallback(() => saveVisualSelectionRef.current(), []),
    restoreVisualSelection: useCallback(() => restoreVisualSelectionRef.current(), []),
    syncCursorMarkdownToVisual: useCallback(() => syncCursorMarkdownToVisualRef.current(), []),
    syncCursorVisualToMarkdown: useCallback(() => syncCursorVisualToMarkdownRef.current(), []),
    htmlToMarkdown,
    setContent,
  });

  const {
    editorMode,
    setEditorMode,
    cursorPositionRef,
    saveCursorPosition,
    handleSetEditorMode,
  } = modeManager;

  // 4. WYSIWYG Bi-directional Sync
  const wysiwygSync = useWysiwygSync({
    wysiwygRef,
    editorMode,
    isEditorFocused,
    onDemandSyncEnabled,
    scrollCaretIntoView,
    cursorPositionRef,
    isSyncingRef,
    wysiwygLocalBackupTimeoutRef,
    wysiwygSyncTimeoutRef,
    setActiveFormatsRef,
    t,
  });

  const {
    savedVisualRangeRef,
    saveVisualSelection,
    restoreVisualSelection,
    getVisualSelectionHtml,
    focusVisualEditorEnd,
    updateContentFromWysiwyg,
    syncWysiwygToContentIfVisual,
    syncCursorMarkdownToVisual,
    syncCursorVisualToMarkdown,
    updateWysiwygEmptyStatus,
  } = wysiwygSync;

  saveVisualSelectionRef.current = saveVisualSelection;
  restoreVisualSelectionRef.current = restoreVisualSelection;
  syncCursorMarkdownToVisualRef.current = syncCursorMarkdownToVisual;
  syncCursorVisualToMarkdownRef.current = syncCursorVisualToMarkdown;

  // 5. Selection & Word Extractor Utility
  const getSelectionOrWord = useCallback(() => {
    const content = useEditorStore.getState().content;
    const start = editorRef.current?.selectionStart ?? 0;
    const end = editorRef.current?.selectionEnd ?? 0;
    if (start !== end) {
      return { text: content.slice(start, end), s: start, e: end };
    }
    const match = content.slice(0, start).match(/[a-zA-Z0-9_\u0400-\u04FF]+$/);
    const afterMatch = content.slice(start).match(/^[a-zA-Z0-9_\u0400-\u04FF]+/);
    const wordStart = match ? start - match[0].length : start;
    const wordEnd = afterMatch ? start + afterMatch[0].length : start;
    return { text: content.slice(wordStart, wordEnd), s: wordStart, e: wordEnd };
  }, [editorRef]);

  // 6. Formatting Engine
  const editorFormat = useEditorFormat({
    editorRef,
    wysiwygRef,
    editorMode,
    getSelectionOrWord,
    getVisualSelectionHtml,
    restoreVisualSelection,
    updateContentFromWysiwyg,
    promptDialog,
    t,
    savedVisualRangeRef,
    focusVisualEditorEnd,
    saveCursorPosition,
    scrollCaretIntoView,
  });

  const {
    activeFormats,
    setActiveFormats,
    insertHtmlAtCursor,
    insertAtCursor,
    fmt,
    fmtLine,
    handleLink,
    handleIndent,
  } = editorFormat;

  setActiveFormatsRef.current = setActiveFormats;

  const updateContentFromWysiwygRef = useRef(updateContentFromWysiwyg);
  updateContentFromWysiwygRef.current = updateContentFromWysiwyg;

  // 7. Editor Events
  const editorEvents = useEditorEvents({
    editorRef,
    wysiwygRef,
    previewPaneRef,
    savedVisualRangeRef,
    syncScrollEnabled,
    isKeyboardOpen,
    keyboardOffset: keyboardOffset ?? undefined,
    widgetPos,
    toolbarIconSize,
    isWidgetVisible,
    isWidgetMenuOpen,
    setIsWidgetVisible,
    activeFormats,
    setActiveFormats,
    saveCursorPosition,
    updateContentFromWysiwygRef,
    fmt,
    fmtLine,
    handleLink,
    insertHtmlAtCursor,
    handleIndent,
  });

  scrollCaretIntoViewRef.current = editorEvents.scrollCaretIntoView;

  // 8. Table Operations
  const tableOps = useTableOperations({
    wysiwygRef,
    updateContentFromWysiwyg,
    setIsWidgetVisible,
    setActiveModal,
    insertAtCursor,
    notify,
    t,
  });

  return {
    // Packages
    modeManager,
    wysiwygSync,
    editorFormat,
    editorEvents,
    tableOps,

    // Direct access properties
    editorMode,
    setEditorMode,
    handleSetEditorMode,
    saveCursorPosition,
    cursorPositionRef,
    savedVisualRangeRef,
    saveVisualSelection,
    updateContentFromWysiwyg,
    syncWysiwygToContentIfVisual,
    syncCursorMarkdownToVisual,
    insertAtCursor,
    fmt,
    fmtLine,
    handleLink,
    handleIndent,
    importTable: tableOps.importTable,
    updateWysiwygEmptyStatus,
    activeFormats,
    setActiveFormats,
    activeTable: tableOps.activeTable,
    setActiveTable: tableOps.setActiveTable,
    activeTableRow: tableOps.activeTableRow,
    setActiveTableRow: tableOps.setActiveTableRow,
    activeTableCell: tableOps.activeTableCell,
    setActiveTableCell: tableOps.setActiveTableCell,
    activeTableRef: tableOps.activeTableRef,
    activeTableRowRef: tableOps.activeTableRowRef,
    activeTableCellRef: tableOps.activeTableCellRef,
    tableRect: tableOps.tableRect,
    setTableSelectorPos: tableOps.setTableSelectorPos,
    tableSelectorPos: tableOps.tableSelectorPos,
    tableImportFormat: tableOps.tableImportFormat,
    setTableImportFormat: tableOps.setTableImportFormat,
  };
}
