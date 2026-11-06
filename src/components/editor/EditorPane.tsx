import React from 'react';
import { cn } from '../../lib/utils';
import { useEditorStore } from '../../store';
import { useDeviceStore } from '../../store/deviceStore';
import { CodeEditor } from '../CodeEditor';
import { MobileStatsBar } from './StatusBar';
import { EditorTopBar } from './EditorTopBar';
import { TamedWidget } from './TamedWidget';
import { TableFloatingActionMenu } from './TableFloatingActionMenu';
import { MiniGalleryStrip } from './MiniGalleryStrip';
import { WysiwygCanvas } from './WysiwygCanvas';
import { useTypingSound } from '../../services/audio/useTypingSound';
import { DocReaderContainer } from '../docReader';

export interface EditorPaneProps {
  // refs
  editorPaneRef: React.RefObject<HTMLDivElement | null>;
  editorRef: React.RefObject<any>;
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  isSyncingRef: React.RefObject<boolean>;
  wysiwygLocalBackupTimeoutRef: React.MutableRefObject<any>;
  wysiwygSyncTimeoutRef: React.MutableRefObject<any>;
  lastSyncContentRef: React.MutableRefObject<string>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // state
  isEditorFullScreen: boolean;
  vvHeight: number | null;
  activeMobileTab: string;
  visualStyle: string;
  isDarkMode: boolean;
  t: (key: any) => string;
  editorMode: 'visual' | 'markdown' | 'reading';
  isLivePreviewEnabled: boolean;
  onDemandSyncEnabled: boolean;
  beautifyEnabled: boolean;
  neonTextColored: boolean;
  isSpacingMenuOpen: boolean;
  wysiwygSpacing: number;
  editorFontSize: number;
  toolbarIconSize: number;
  activeTable: Element | null;
  tableRect: DOMRect | null;
  isTableMenuExpanded: boolean;
  isTableMenuPinned: boolean;
  isMiniGalleryOpen: boolean;
  images: any[];
  justInsertedUrl: string | null;
  keyboardOffset: number | null;
  isFullScreen: boolean;
  widgetPos: any;
  isWidgetVisible: boolean;
  isWidgetMenuOpen: boolean;
  activeFormats: any;
  showMobileTools1: boolean;
  showMobileTools2: boolean;
  showMobileToolsOpen: boolean;
  activeModal: string | null;
  widgetNoBorder: boolean;
  performanceMode: boolean;
  floatingPos: any;
  widgetRef: React.RefObject<HTMLDivElement | null>;
  offsetTop: number;
  viewportHeight: number;
  isKeyboardOpen: boolean;
  isSidebarOpen: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  lockedToolsWidth: number | null;
  enabledTools: string[];
  menuDirection: 'up' | 'down';
  widgetOpacity: number;
  lang: string;
  pubTitle?: string;
  setPubTitle?: (val: string) => void;
  pubTags?: string;
  setPubTags?: (val: string) => void;
  drafts?: any[];
  saveDraft?: (status?: 'working' | 'ready') => void;

  // setters / handlers
  handleSetEditorMode: (mode: 'visual' | 'markdown' | 'reading') => void;
  toggleEditorFullScreen: () => void;
  setOnDemandSyncEnabled: (val: boolean) => void;
  notify: (msg: string, type?: any) => void;
  toggleLivePreview: () => void;
  setBeautifyEnabled: (val: boolean) => void;
  setNeonTextColored: (val: boolean) => void;
  setIsSpacingMenuOpen: (val: boolean) => void;
  setWysiwygSpacing: (val: number) => void;
  setEditorFontSize: (val: number) => void;
  setToolbarIconSize: (val: number) => void;
  setIsTableMenuExpanded: (val: boolean) => void;
  setIsTableMenuPinned: (val: boolean) => void;
  setIsMiniGalleryOpen: (val: boolean) => void;
  setJustInsertedUrl: (val: string | null) => void;
  setWidgetPos: (val: any) => void;
  setIsWidgetVisible: (val: boolean) => void;
  setIsWidgetMenuOpen: (val: boolean) => void;
  setShowMobileTools1: (val: boolean) => void;
  setShowMobileTools2: (val: boolean) => void;
  setShowMobileToolsOpen: (val: boolean) => void;
  setActiveModal: (val: string | null) => void;
  setSettingsTab: (val: any) => void;
  setLockedToolsWidth: (val: number) => void;
  setEnabledTools: (val: string[]) => void;
  setWidgetOpacity: (val: number) => void;
  setWidgetNoBorder: (val: boolean) => void;

  // editor functions
  saveCursorPosition: () => void;
  setIsEditorFocused: (val: boolean) => void;
  handleEditorKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleEditorScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  showWidget: (clientX: number, clientY: number) => void;
  handleWysiwygBeforeInput: (e: any) => void;
  handleWysiwygKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  isImageAndProxyUrl: (url: string) => boolean;
  insertHtmlAtCursor: (html: string) => void;
  updateContentFromWysiwyg: (forceImmediate?: boolean) => void;
  htmlToMarkdown: (html: string) => string;
  convertBareImageUrlsToMarkdown: (text: string) => string;
  getMarked: () => any;
  setContent: (content: string) => void;
  saveVisualSelection: () => void;
  updateWysiwygEmptyStatus: (el: HTMLDivElement | null) => void;
  deleteActiveTableRow: () => void;
  deleteActiveTableCol: () => void;
  deleteActiveTable: () => void;
  getMiniGalleryBottomStyle: (params: any) => string | undefined;
  insertImage: (url: string, name: string, format: any) => void;
  insertAtCursor: (text: string) => void;
  confirmDialog: any;
  handleWidgetAction: (action: any, e?: any) => void;
  moveTool: (index: any, direction: any) => void;
  toggleTool: (toolName: string) => void;
  fmt: (format: string, value?: string) => void;
  fmtLine: (format: string) => void;
  handleIndent: any;
  handleLink: () => void;
  importTable: () => void;
  TOOLS_MAP: any;
  scrollCaretIntoView?: (block?: ScrollLogicalPosition) => void;
  typingSound?: ReturnType<typeof useTypingSound>;
  onOpenAudioPresetsModal?: () => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  scrollCaretIntoView,
  typingSound,
  onOpenAudioPresetsModal,
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
  editorMode,
  isLivePreviewEnabled,
  onDemandSyncEnabled,
  beautifyEnabled,
  neonTextColored,
  isSpacingMenuOpen,
  wysiwygSpacing,
  editorFontSize,
  toolbarIconSize,
  activeTable,
  tableRect,
  isTableMenuExpanded,
  isTableMenuPinned,
  isMiniGalleryOpen,
  images,
  justInsertedUrl,
  keyboardOffset,
  isFullScreen,
  widgetPos,
  isWidgetVisible,
  isWidgetMenuOpen,
  activeFormats,
  showMobileTools1,
  showMobileTools2,
  showMobileToolsOpen,
  activeModal,
  widgetNoBorder,
  performanceMode,
  floatingPos,
  widgetRef,
  offsetTop,
  viewportHeight,
  isKeyboardOpen,
  isSidebarOpen,
  scrollRef,
  lockedToolsWidth,
  enabledTools,
  menuDirection,
  widgetOpacity,
  lang,
  pubTitle,
  setPubTitle,
  pubTags,
  setPubTags,
  drafts,
  saveDraft,
  handleSetEditorMode,
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
  setIsTableMenuExpanded,
  setIsTableMenuPinned,
  setIsMiniGalleryOpen,
  setJustInsertedUrl,
  setWidgetPos,
  setIsWidgetVisible,
  setIsWidgetMenuOpen,
  setShowMobileTools1,
  setShowMobileTools2,
  setShowMobileToolsOpen,
  setActiveModal,
  setSettingsTab,
  setLockedToolsWidth,
  setEnabledTools,
  setWidgetOpacity,
  setWidgetNoBorder,
  saveCursorPosition,
  setIsEditorFocused,
  handleEditorKeyDown,
  handleEditorScroll,
  showWidget,
  handleWysiwygBeforeInput,
  handleWysiwygKeyDown,
  isImageAndProxyUrl,
  insertHtmlAtCursor,
  updateContentFromWysiwyg,
  htmlToMarkdown,
  convertBareImageUrlsToMarkdown,
  getMarked,
  setContent,
  saveVisualSelection,
  updateWysiwygEmptyStatus,
  deleteActiveTableRow,
  deleteActiveTableCol,
  deleteActiveTable,
  getMiniGalleryBottomStyle,
  insertImage,
  insertAtCursor,
  confirmDialog,
  handleWidgetAction,
  moveTool,
  toggleTool,
  fmt,
  fmtLine,
  handleIndent,
  handleLink,
  importTable,
  TOOLS_MAP
}) => {
  const isMobileLayout = useDeviceStore(s => s.isMobileLayout);
  const [isTOCOpen, setIsTOCOpen] = React.useState(false);
  const [isSourceDrawerOpen, setIsSourceDrawerOpen] = React.useState(false);

  const scrollSaveTimeoutRef = React.useRef<any>(null);
  const handleWysiwygScroll = React.useCallback(() => {
    if (scrollSaveTimeoutRef.current) clearTimeout(scrollSaveTimeoutRef.current);
    scrollSaveTimeoutRef.current = setTimeout(() => {
      if (wysiwygRef.current) {
        try {
          localStorage.setItem('steem_editor_scroll', String(wysiwygRef.current.scrollTop));
        } catch (e) {
          /* ignore */
        }
      }
    }, 250);
  }, [wysiwygRef]);

  const getEditorBottomSpacingClass = () => {
    if (isKeyboardOpen) {
      return "pb-44 mb-2 lg:pb-20 lg:mb-2";
    }
    if (widgetPos === 'bottom') {
      // In both fullscreen and normal mode on desktop, reserve space so the editor stops safely above TamedWidget
      return "pb-44 mb-[5.5rem] lg:pb-28 lg:mb-8";
    }
    if (widgetPos === 'floating') {
      return isEditorFullScreen || isFullScreen
        ? "pb-44 mb-[5rem] lg:pb-28 lg:mb-6"
        : "pb-44 mb-[5rem] lg:pb-24 lg:mb-6";
    }
    // widgetPos === 'hidden'
    return isEditorFullScreen || isFullScreen
      ? "pb-44 mb-2 lg:pb-16 lg:mb-2"
      : "pb-44 mb-[5rem] lg:pb-16 lg:mb-2";
  };

  return (
    <div 
      ref={editorPaneRef}
      style={isEditorFullScreen ? { 
        height: vvHeight ? `${vvHeight}px` : '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      } : {}}
      className={cn(
        "flex-1 flex flex-col min-w-0 border-r border-slate-800 transition-all relative",
        (isMobileLayout && activeMobileTab !== 'editor') ? "hidden" : "flex",
        isEditorFullScreen && "bg-slate-950 p-0 fixed inset-0 z-[250]"
      )}
    >
      <MobileStatsBar visualStyle={visualStyle} isDarkMode={isDarkMode} t={t} />

      {/* Editor Top Control Bar (Modes, Fullscreen, Sync, Beautify, Audio, Spacing) */}
      <EditorTopBar
        editorMode={editorMode}
        handleSetEditorMode={handleSetEditorMode}
        isTOCOpen={isTOCOpen}
        setIsTOCOpen={setIsTOCOpen}
        isSourceDrawerOpen={isSourceDrawerOpen}
        setIsSourceDrawerOpen={setIsSourceDrawerOpen}
        isEditorFullScreen={isEditorFullScreen}
        toggleEditorFullScreen={toggleEditorFullScreen}
        onDemandSyncEnabled={onDemandSyncEnabled}
        setOnDemandSyncEnabled={setOnDemandSyncEnabled}
        isLivePreviewEnabled={isLivePreviewEnabled}
        toggleLivePreview={toggleLivePreview}
        beautifyEnabled={beautifyEnabled}
        setBeautifyEnabled={setBeautifyEnabled}
        neonTextColored={neonTextColored}
        setNeonTextColored={setNeonTextColored}
        typingSound={typingSound}
        onOpenAudioPresetsModal={onOpenAudioPresetsModal}
        isSpacingMenuOpen={isSpacingMenuOpen}
        setIsSpacingMenuOpen={setIsSpacingMenuOpen}
        wysiwygSpacing={wysiwygSpacing}
        setWysiwygSpacing={setWysiwygSpacing}
        editorFontSize={editorFontSize}
        setEditorFontSize={setEditorFontSize}
        toolbarIconSize={toolbarIconSize}
        setToolbarIconSize={setToolbarIconSize}
        visualStyle={visualStyle}
        isDarkMode={isDarkMode}
        notify={notify}
        t={t}
      />

      

      {editorMode === 'markdown' ? (
        <CodeEditor
          id="main-editor"
          ref={editorRef}
          onDemandSyncEnabled={onDemandSyncEnabled}
          widgetPos={widgetPos}
          isKeyboardOpen={isKeyboardOpen}
          keyboardOffset={keyboardOffset}
          toolbarIconSize={toolbarIconSize}
          onChange={() => {
            saveCursorPosition();
          }}
          onSelect={saveCursorPosition}
          onKeyUp={saveCursorPosition}
          onClick={saveCursorPosition}
          onScroll={handleEditorScroll}
          onFocus={() => {
            setIsEditorFocused(true);
            saveCursorPosition();
            if (widgetPos !== 'hidden') setIsWidgetVisible(true);
          }}
          onBlur={() => {
            saveCursorPosition();
            setTimeout(() => setIsEditorFocused(false), 200);
          }}
          onKeyDown={handleEditorKeyDown}
          onMouseUp={(e) => {
            saveCursorPosition();
            showWidget(e.clientX, e.clientY);
          }}
          className={cn(
            "flex-1 w-full bg-transparent text-base outline-none resize-none custom-scrollbar editor-font overscroll-contain",
            (visualStyle === 'neon' && neonTextColored) ? "text-cyan-400 font-normal" : "text-slate-300",
            beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-[clamp(40rem,60vw,80rem)] mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-3 pt-3 lg:px-6 lg:pt-6",
            getEditorBottomSpacingClass()
          )}
          placeholder={t('placeholder')}
        />
      ) : editorMode === 'reading' ? (
        <DocReaderContainer
          currentEditorContent={useEditorStore.getState().content}
          currentEditorTitle={pubTitle || ''}
          currentEditorTags={pubTags || ''}
          drafts={drafts || []}
          onLoadIntoEditor={async (newTitle, newTags, newContent) => {
            const currentContent = useEditorStore.getState().content || '';
            if (currentContent.trim() && currentContent !== newContent) {
              const shouldSave = await confirmDialog(
                t('docReaderSaveCurrentPrompt'),
                t('docReaderSaveCurrentTitle')
              );
              if (shouldSave) {
                if (saveDraft) {
                  saveDraft('working');
                }
                notify(t('docReaderSavedToDraftsNotify'), "success");
              } else {
                const confirmOverwrite = await confirmDialog(
                  t('docReaderConfirmOverwritePrompt'),
                  t('docReaderConfirmOverwriteTitle')
                );
                if (!confirmOverwrite) {
                  return;
                }
              }
            }

            if (setPubTitle) setPubTitle(newTitle);
            if (setPubTags) setPubTags(newTags);
            useEditorStore.getState().setContent(newContent);
            handleSetEditorMode('visual');
          }}
          onSwitchToEditMode={(mode = 'visual') => {
            handleSetEditorMode(mode);
          }}
          onExitReadingMode={() => {
            handleSetEditorMode('visual');
          }}
          isTOCOpen={isTOCOpen}
          setIsTOCOpen={setIsTOCOpen}
          isSourceDrawerOpen={isSourceDrawerOpen}
          setIsSourceDrawerOpen={setIsSourceDrawerOpen}
          isDarkMode={isDarkMode}
          visualStyle={visualStyle}
          editorFontSize={editorFontSize}
          wysiwygSpacing={wysiwygSpacing}
          beautifyEnabled={beautifyEnabled}
        />
      ) : (
        <WysiwygCanvas
          wysiwygRef={wysiwygRef}
          isSyncingRef={isSyncingRef}
          handleWysiwygBeforeInput={handleWysiwygBeforeInput}
          handleWysiwygKeyDown={handleWysiwygKeyDown}
          isImageAndProxyUrl={isImageAndProxyUrl}
          insertHtmlAtCursor={insertHtmlAtCursor}
          updateContentFromWysiwyg={updateContentFromWysiwyg}
          htmlToMarkdown={htmlToMarkdown}
          convertBareImageUrlsToMarkdown={convertBareImageUrlsToMarkdown}
          getMarked={getMarked}
          updateWysiwygEmptyStatus={updateWysiwygEmptyStatus}
          scrollCaretIntoView={scrollCaretIntoView}
          saveVisualSelection={saveVisualSelection}
          setIsEditorFocused={setIsEditorFocused}
          showWidget={showWidget}
          widgetPos={widgetPos}
          setIsWidgetVisible={setIsWidgetVisible}
          handleWysiwygScroll={handleWysiwygScroll}
          visualStyle={visualStyle}
          neonTextColored={neonTextColored}
          beautifyEnabled={beautifyEnabled}
          bottomSpacingClass={getEditorBottomSpacingClass()}
          t={t}
        />
      )}

      {/* Table Action Menu (Positioned ABOVE the table to avoid covering cells) */}
      <TableFloatingActionMenu
        activeTable={activeTable}
        tableRect={tableRect}
        editorPaneRef={editorPaneRef}
        isTableMenuPinned={isTableMenuPinned}
        setIsTableMenuPinned={setIsTableMenuPinned}
        isTableMenuExpanded={isTableMenuExpanded}
        setIsTableMenuExpanded={setIsTableMenuExpanded}
        deleteActiveTableRow={deleteActiveTableRow}
        deleteActiveTableCol={deleteActiveTableCol}
        deleteActiveTable={deleteActiveTable}
        editorMode={editorMode}
        activeModal={activeModal}
        isMiniGalleryOpen={isMiniGalleryOpen}
        t={t}
      />

      {/* Compact Mini-Gallery Strip */}
      <MiniGalleryStrip
        isOpen={isMiniGalleryOpen}
        onClose={() => setIsMiniGalleryOpen(false)}
        images={images}
        onInsertImage={(url, name) => insertImage(url, name, 'plain')}
        onUploadMore={() => fileInputRef.current?.click()}
        isMobileLayout={isMobileLayout}
        isSidebarOpen={isSidebarOpen}
        isKeyboardOpen={isKeyboardOpen}
        keyboardOffset={keyboardOffset}
        isFullScreen={isFullScreen}
        isEditorFullScreen={isEditorFullScreen}
        widgetPos={widgetPos}
        activeModal={activeModal}
        editorMode={editorMode}
        t={t}
      />

      {/* Tamed Widget */}
      {editorMode !== 'reading' && (
        <TamedWidget
          toolsMap={TOOLS_MAP}
          widgetPos={widgetPos}
          setWidgetPos={setWidgetPos}
          isWidgetVisible={isWidgetVisible}
          setIsWidgetVisible={setIsWidgetVisible}
          isWidgetMenuOpen={isWidgetMenuOpen}
          setIsWidgetMenuOpen={setIsWidgetMenuOpen}
          editorMode={editorMode}
          activeFormats={activeFormats}
          fmt={fmt}
          fmtLine={fmtLine}
          handleIndent={handleIndent}
          handleLink={handleLink}
          importTable={importTable}
          showMobileTools1={showMobileTools1}
          setShowMobileTools1={setShowMobileTools1}
          showMobileTools2={showMobileTools2}
          setShowMobileTools2={setShowMobileTools2}
          setShowMobileToolsOpen={setShowMobileToolsOpen}
          showMobileToolsOpen={showMobileToolsOpen}
          setActiveModal={setActiveModal}
          setSettingsTab={setSettingsTab}
          insertAtCursor={insertAtCursor}
          editorRef={editorRef}
          wysiwygRef={wysiwygRef}
          isSyncingRef={isSyncingRef}
          getMarked={getMarked}
          setContent={setContent}
          confirmDialog={confirmDialog}
          updateWysiwygEmptyStatus={updateWysiwygEmptyStatus}
          activeModal={activeModal}
          isEditorFullScreen={isEditorFullScreen}
          isFullScreen={isFullScreen}
          widgetNoBorder={widgetNoBorder}
          performanceMode={performanceMode}
          floatingPos={floatingPos}
          editorPaneRef={editorPaneRef}
          widgetRef={widgetRef}
          toolbarIconSize={toolbarIconSize}
          offsetTop={offsetTop}
          viewportHeight={viewportHeight}
          isKeyboardOpen={isKeyboardOpen}
          isSidebarOpen={isSidebarOpen}
          scrollRef={scrollRef}
          lockedToolsWidth={lockedToolsWidth}
          setLockedToolsWidth={setLockedToolsWidth}
          enabledTools={enabledTools}
          setEnabledTools={setEnabledTools}
          handleWidgetAction={handleWidgetAction}
          menuDirection={menuDirection}
          widgetOpacity={widgetOpacity}
          setWidgetOpacity={setWidgetOpacity}
          setWidgetNoBorder={setWidgetNoBorder}
          lang={lang}
          moveTool={moveTool}
          toggleTool={toggleTool}
          t={t}
        />
      )}
    </div>
  );
};

export default EditorPane;
