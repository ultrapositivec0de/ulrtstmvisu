import React from 'react';
import { cn } from '../../lib/utils';
import { useEditorStore } from '../../store';
import { 
  Eye, Terminal, Minimize2, Maximize2, RefreshCw, EyeOff, Sparkles, Type, 
  MoveVertical, X, Check, Images, Plus, Settings, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CodeEditor } from '../CodeEditor';
import { MobileStatsBar } from './StatusBar';
import { TamedWidget } from './TamedWidget';
import { normalizeHtmlForVisualEditor } from '../../utils/markdownParser';

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
  editorMode: 'visual' | 'markdown';
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

  // setters / handlers
  handleSetEditorMode: (mode: 'visual' | 'markdown') => void;
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
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  scrollCaretIntoView,
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
  const getEditorBottomSpacingClass = () => {
    if (isKeyboardOpen) {
      return "pb-44 mb-2 lg:pb-48 lg:mb-4";
    }
    if (widgetPos === 'bottom') {
      // In both fullscreen and normal mode on desktop, reserve space so the editor stops safely above TamedWidget
      return "pb-44 mb-[5.5rem] lg:pb-48 lg:mb-28";
    }
    if (widgetPos === 'floating') {
      return isEditorFullScreen || isFullScreen
        ? "pb-44 mb-[5rem] lg:pb-48 lg:mb-16"
        : "pb-44 mb-[5rem] lg:pb-36 lg:mb-16";
    }
    // widgetPos === 'hidden'
    return isEditorFullScreen || isFullScreen
      ? "pb-44 mb-2 lg:pb-48 lg:mb-4"
      : "pb-44 mb-[5rem] lg:pb-36 lg:mb-4";
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
        activeMobileTab !== 'editor' && "hidden lg:flex",
        isEditorFullScreen && "bg-slate-950 p-0 fixed inset-0 z-[250]"
      )}
    >
      <MobileStatsBar visualStyle={visualStyle} isDarkMode={isDarkMode} t={t} />

      {/* Editor Mode Toggler Tabs */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2 border-b shrink-0 select-none relative transition-colors",
        visualStyle === 'neon' ? "bg-slate-950 border-slate-800/80" : (isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex p-0.5 rounded-lg border shrink-0 shadow-inner transition-colors",
            visualStyle === 'neon' ? "bg-slate-950 border-slate-800" : (isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-300")
          )}>
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSetEditorMode('visual')}
              className={cn(
                "px-3 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors flex items-center gap-1.5",
                editorMode === 'visual' 
                  ? "bg-cyan-600 text-white shadow-sm" 
                  : (isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-900")
              )}
            >
              <Eye size={12} />
              <span className={cn(
                isLivePreviewEnabled ? "hidden xl:inline" : "hidden sm:inline"
              )}>
                {t('visualEditor')}
              </span>
            </button>
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSetEditorMode('markdown')}
              className={cn(
                "px-3 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors flex items-center gap-1.5",
                editorMode === 'markdown' 
                  ? "bg-cyan-600 text-white shadow-sm" 
                  : (isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-900")
              )}
            >
              <Terminal size={12} />
              <span className={cn(
                isLivePreviewEnabled ? "hidden xl:inline" : "hidden sm:inline"
              )}>
                {t('markdownCode')}
              </span>
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleEditorFullScreen}
              className={cn(
                "px-2 py-1 ml-1 rounded transition-colors flex items-center gap-1",
                isEditorFullScreen 
                  ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400" 
                  : (isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-cyan-400 hover:bg-slate-800" : "text-slate-500 hover:text-cyan-600 hover:bg-slate-200")
              )}
              title={isEditorFullScreen ? t('exitFullscreen') : t('fullscreen')}
            >
              {isEditorFullScreen ? <Minimize2 size={12} className="text-white" /> : <Maximize2 size={12} />}
              {isEditorFullScreen && (
                <span className="text-[10px] font-bold uppercase tracking-wider hidden xs:inline">
                  {t('exit')}
                </span>
              )}
            </button>
          </div>

          {/* Real-time sync toggle (RefreshCw) */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const next = !onDemandSyncEnabled;
              setOnDemandSyncEnabled(next);
              localStorage.setItem('steem_on_demand_sync', String(next));
              notify(
                next 
                   ? (lang === 'uk' ? "Увімкнено оптимізовану фонову синхронізацію (без затримок)" : "Optimized background sync enabled (lag-free)") 
                   : (lang === 'uk' ? "Увімкнено безперервну синхронізацію в реальному часі" : "Continuous real-time sync enabled"), 
                "success"
              );
            }}
            className={cn(
              "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold",
              !onDemandSyncEnabled 
                ? (isDarkMode || visualStyle === 'neon' ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100/50") 
                : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
            )}
            title={!onDemandSyncEnabled ? t('realtimeSyncActive') : t('enableRealtimeSync')}
          >
            <RefreshCw size={12} className={cn(!onDemandSyncEnabled ? "text-cyan-400" : "text-slate-500")} />
            <span className={cn(
              isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
            )}>
              {t('realtime')}
            </span>
            {!onDemandSyncEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-color))] shrink-0" />
            )}
          </button>

          {/* Live Preview Toggle */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleLivePreview}
            className={cn(
              "hidden lg:flex p-1.5 rounded-lg border transition-all items-center gap-1.5 text-[10px] sm:text-xs font-bold",
              isLivePreviewEnabled 
                ? (isDarkMode || visualStyle === 'neon' ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100/50") 
                : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
            )}
            title={t('toggleLivePreview')}
          >
            {isLivePreviewEnabled ? <Eye size={12} className={cn(isDarkMode || visualStyle === 'neon' ? "text-cyan-400" : "text-cyan-600")} /> : <EyeOff size={12} className="text-slate-500" />}
            <span className={cn(
              isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
            )}>
              {lang === 'uk' ? 'Прев\'ю' : 'Preview'}
            </span>
          </button>

          {/* Beautification Toggle */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const next = !beautifyEnabled;
              setBeautifyEnabled(next);
              localStorage.setItem('steem_beautify', String(next));
              notify(
                next
                  ? (lang === 'uk' ? "Б'ютіфікацію увімкнено (покращене оформлення)" : "Beautification enabled (enhanced styling)")
                  : (lang === 'uk' ? "Б'ютіфікацію вимкнено" : "Beautification disabled"),
                "success"
              );
            }}
            className={cn(
              "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold",
              beautifyEnabled 
                ? (isDarkMode || visualStyle === 'neon' ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100/50") 
                : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
            )}
            title={beautifyEnabled ? t('beautifyActiveTitle') : t('enableBeautifyTitle')}
          >
            <Sparkles size={12} className={cn(beautifyEnabled ? "text-cyan-400" : "text-slate-500")} />
            <span className={cn(
              isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
            )}>
              {t('beautify')}
            </span>
            {beautifyEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-color))] shrink-0" />
            )}
          </button>

          {/* Neon Editor Text Color Toggle */}
          {visualStyle === 'neon' && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const next = !neonTextColored;
                setNeonTextColored(next);
                notify(
                  next 
                    ? (lang === 'uk' ? "Кольоровий текст увімкнено" : "Colored text enabled") 
                    : (lang === 'uk' ? "Кольоровий текст вимкнено" : "Colored text disabled"), 
                  "success"
                );
              }}
              className={cn(
                "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold",
                neonTextColored 
                  ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" 
                  : "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              )}
              title={neonTextColored ? t('colorTextActiveTitle') : t('enableColorTextTitle')}
            >
              <Type size={12} className={cn(neonTextColored ? "text-cyan-400" : "text-slate-500")} />
              <span className={cn(
                isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
              )}>
                {t('color')}
              </span>
              {neonTextColored && (
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-color))] shrink-0" />
              )}
            </button>
          )}

          {/* Visual Spacing and Icon Size Popover */}
          <div className="relative">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsSpacingMenuOpen(!isSpacingMenuOpen)}
              className={cn(
                "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold relative",
                isSpacingMenuOpen
                  ? "bg-cyan-600 text-white border-cyan-500 shadow-none"
                  : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
              )}
              title={t('spacingSettingsTitle')}
            >
              <MoveVertical size={12} />
              <span className={cn(
                isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
              )}>
                {t('spacing')}
              </span>
            </button>

            <AnimatePresence>
              {isSpacingMenuOpen && (
                <>
                  {/* Overlay click-away handler */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsSpacingMenuOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute right-0 mt-2 w-64 rounded-xl border p-4 shadow-xl z-50 flex flex-col gap-4 select-none",
                      isDarkMode || visualStyle === 'neon' ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-between border-b pb-2",
                      isDarkMode || visualStyle === 'neon' ? "border-slate-800" : "border-slate-100"
                    )}>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        {t('layoutOptions')}
                      </span>
                      <button 
                        onClick={() => setIsSpacingMenuOpen(false)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* Beautification Toggle inside Spacing popover */}
                    <div className={cn(
                      "flex items-center justify-between border-b pb-3",
                      isDarkMode || visualStyle === 'neon' ? "border-slate-800/60" : "border-slate-100"
                    )}>
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-cyan-400" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                            {lang === 'uk' ? "Б'ютіфікація" : "Beautification"}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium block">
                            {t('enhancedStyling')}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const next = !beautifyEnabled;
                          setBeautifyEnabled(next);
                          localStorage.setItem('steem_beautify', String(next));
                        }}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all duration-300 relative border shrink-0",
                          beautifyEnabled 
                            ? "bg-cyan-600 border-cyan-500" 
                            : (isDarkMode || visualStyle === 'neon' ? "bg-slate-800 border-slate-700" : "bg-slate-200 border-slate-300")
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-300",
                          beautifyEnabled ? "left-[18px]" : "left-0.5"
                        )} />
                      </button>
                    </div>

                    {/* Spacing preset & slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {t('paragraphSpacing')}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded">
                          {wysiwygSpacing}px
                        </span>
                      </div>
                      <div className={cn(
                        "grid grid-cols-4 gap-1 p-0.5 rounded-lg border",
                        isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60" : "bg-slate-50 border-slate-200"
                      )}>
                        {[
                          { id: 6, label: t('spacingCompact') },
                          { id: 14, label: t('spacingBalanced') },
                          { id: 20, label: t('spacingNormal') },
                          { id: 28, label: t('spacingSpacious') }
                        ].map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setWysiwygSpacing(p.id);
                              localStorage.setItem('steem_wysiwyg_spacing', String(p.id));
                            }}
                            className={cn(
                              "py-1 px-0.5 rounded text-[9px] font-bold transition-all text-center truncate",
                              wysiwygSpacing === p.id
                                ? "bg-cyan-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[9px] text-slate-500 font-mono">0px</span>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          value={wysiwygSpacing}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setWysiwygSpacing(val);
                            localStorage.setItem('steem_wysiwyg_spacing', String(val));
                          }}
                          className="flex-1 accent-cyan-500 bg-slate-800/60 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[9px] text-slate-500 font-mono">40px</span>
                      </div>
                    </div>

                    {/* Editor font size preset & slider */}
                    <div className={cn(
                      "space-y-2 border-t pt-3",
                      isDarkMode || visualStyle === 'neon' ? "border-slate-800/60" : "border-slate-100"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {t('fontSize')}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded">
                          {editorFontSize}px
                        </span>
                      </div>
                      <div className={cn(
                        "grid grid-cols-4 gap-1 p-0.5 rounded-lg border",
                        isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60" : "bg-slate-50 border-slate-200"
                      )}>
                        {[
                          { id: 14, label: t('fontSmall') },
                          { id: 16, label: t('fontNormal') },
                          { id: 18, label: t('fontLarge') },
                          { id: 22, label: t('fontMax') }
                        ].map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setEditorFontSize(p.id);
                              localStorage.setItem('steem_editor_font_size', String(p.id));
                            }}
                            className={cn(
                              "py-1 px-0.5 rounded text-[9px] font-bold transition-all text-center truncate",
                              editorFontSize === p.id
                                ? "bg-cyan-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[9px] text-slate-500 font-mono">12px</span>
                        <input
                          type="range"
                          min="12"
                          max="32"
                          value={editorFontSize}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setEditorFontSize(val);
                            localStorage.setItem('steem_editor_font_size', String(val));
                          }}
                          className="flex-1 accent-cyan-500 bg-slate-800/60 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[9px] text-slate-500 font-mono">32px</span>
                      </div>
                    </div>

                    {/* Toolbar icon size preset & slider */}
                    <div className={cn(
                      "space-y-2 border-t pt-3",
                      isDarkMode || visualStyle === 'neon' ? "border-slate-800/60" : "border-slate-100"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {t('iconSize')}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded">
                          {toolbarIconSize}px
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 font-mono">12px</span>
                        <input
                          type="range"
                          min="12"
                          max="32"
                          value={toolbarIconSize}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setToolbarIconSize(val);
                            localStorage.setItem('steem_toolbar_icon_size', String(val));
                          }}
                          className="flex-1 accent-cyan-500 bg-slate-800/60 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[9px] text-slate-500 font-mono">32px</span>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

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
            "flex-1 w-full bg-transparent text-base outline-none resize-none custom-scrollbar transition-all duration-700 editor-font overscroll-contain",
            (visualStyle === 'neon' && neonTextColored) ? "text-cyan-400 font-normal" : "text-slate-300",
            beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-[clamp(40rem,60vw,80rem)] mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-3 pt-3 lg:px-6 lg:pt-6",
            getEditorBottomSpacingClass()
          )}
          placeholder={`${t('placeholder')}\n\n\n\n\nОМ АХ ХУМ СО ХА\n♡`}
        />
      ) : (
        <div
          ref={wysiwygRef}
          contentEditable
          suppressContentEditableWarning
          onBeforeInput={handleWysiwygBeforeInput}
          onKeyDown={handleWysiwygKeyDown}
          onPaste={async (e) => {
            e.preventDefault();
            
            const htmlData = e.clipboardData.getData('text/html');
            const textData = e.clipboardData.getData('text/plain');
            
            if (!textData && !htmlData) return;

            // Convert current spacer to standard paragraph before pasting if selection is inside
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const anchorNode = sel.anchorNode;
              if (anchorNode) {
                const parentEl = anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as Element) : anchorNode.parentElement;
                const spacerEl = parentEl?.closest('.table-spacer, [data-placeholder], [data-empty]');
                if (spacerEl) {
                  spacerEl.removeAttribute('data-empty');
                  spacerEl.removeAttribute('data-placeholder');
                  spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
                }
              }
            }
            
            if (textData) {
              const trimmedText = textData.trim();
              if (isImageAndProxyUrl(trimmedText)) {
                const imgHtml = `<img src="${trimmedText}" alt="image">`;
                if (!document.execCommand('insertHTML', false, imgHtml)) {
                  insertHtmlAtCursor(imgHtml);
                }
                updateContentFromWysiwyg();
                return;
              }
            }

            const m = getMarked();
            if (!m) return;

            let finalHtml = '';
            
            if (htmlData) {
              const md = htmlToMarkdown(htmlData);
              finalHtml = await m.parse(md);
            } else if (textData) {
              const processed = convertBareImageUrlsToMarkdown(textData);
              finalHtml = await m.parse(processed);
            }
            
            if (finalHtml) {
              finalHtml = normalizeHtmlForVisualEditor(finalHtml.trim());
              if (finalHtml.startsWith('<p>') && finalHtml.endsWith('</p>') && (finalHtml.match(/<p>/g) || []).length === 1) {
                finalHtml = finalHtml.substring(3, finalHtml.length - 4);
              }
              
              if (!document.execCommand('insertHTML', false, finalHtml)) {
                insertHtmlAtCursor(finalHtml as string);
              }

              if (wysiwygRef.current) {
                wysiwygRef.current.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((el) => {
                  const txt = el.textContent || '';
                  if (txt.trim() !== '' || el.children.length > 1 || (el.children.length === 1 && el.firstElementChild?.tagName !== 'BR')) {
                    el.removeAttribute('data-empty');
                    el.removeAttribute('data-placeholder');
                    el.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
                  }
                });
              }

              updateContentFromWysiwyg();
            }
          }}
          onInput={(e) => {
            if (isSyncingRef.current) return;
            const target = e.target as HTMLDivElement;
            updateWysiwygEmptyStatus(target);

            target.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((spacerEl) => {
              const isTop = spacerEl === target.firstElementChild && spacerEl.classList.contains('top-spacer');
              const isBottom = spacerEl === target.lastElementChild && spacerEl.classList.contains('bottom-spacer');
              const textStr = spacerEl.textContent || '';
              const hasContent = textStr.trim() !== '' || spacerEl.children.length > 1 || (spacerEl.children.length === 1 && spacerEl.firstElementChild?.tagName !== 'BR');
              if (!isTop && !isBottom) {
                spacerEl.removeAttribute('data-empty');
                spacerEl.removeAttribute('data-placeholder');
                spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
              } else if (hasContent) {
                spacerEl.removeAttribute('data-empty');
                spacerEl.removeAttribute('data-placeholder');
                spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
              }
            });

            const blockTags = ['TABLE'];

            const firstEl = target.firstElementChild;
            if (firstEl && blockTags.includes(firstEl.tagName) && !firstEl.classList.contains('top-spacer')) {
              if (!target.querySelector('.top-spacer')) {
                const pBefore = document.createElement('p');
                pBefore.className = 'table-spacer top-spacer';
                pBefore.setAttribute('data-empty', 'true');
                pBefore.setAttribute('data-placeholder', lang === 'uk' ? '↵ Новий параграф...' : lang === 'es' ? '↵ Nuevo párrafo...' : lang === 'ko' ? '↵ 새 문단...' : '↵ New paragraph...');
                pBefore.innerHTML = '<br>';
                target.insertBefore(pBefore, firstEl);
              }
            }

            const lastEl = target.lastElementChild;
            if (lastEl && blockTags.includes(lastEl.tagName) && !lastEl.classList.contains('bottom-spacer')) {
              if (!target.querySelector('.bottom-spacer')) {
                const pAfter = document.createElement('p');
                pAfter.className = 'table-spacer bottom-spacer';
                pAfter.setAttribute('data-empty', 'true');
                pAfter.setAttribute('data-placeholder', lang === 'uk' ? '↵ Новий параграф...' : lang === 'es' ? '↵ Nuevo párrafo...' : lang === 'ko' ? '↵ 새 문단...' : '↵ New paragraph...');
                pAfter.innerHTML = '<br>';
                target.appendChild(pAfter);
              }
            }

            // Use the unified sync function from useWysiwygSync hook
            updateContentFromWysiwyg(false);
            if (scrollCaretIntoView) {
              requestAnimationFrame(() => {
                scrollCaretIntoView('nearest');
              });
            }
          }}
          onFocus={() => {
            setIsEditorFocused(true);
            saveVisualSelection();
            if (widgetPos !== 'hidden') setIsWidgetVisible(true);
          }}
          onBlur={() => {
            setIsEditorFocused(false);
            updateContentFromWysiwyg(true);
          }}
          onScroll={() => {
            if (wysiwygRef.current) {
              localStorage.setItem('steem_editor_scroll', String(wysiwygRef.current.scrollTop));
            }
          }}
          onMouseUp={(e) => {
            showWidget(e.clientX, e.clientY);
            saveVisualSelection();
          }}
          onKeyUp={() => {
            updateWysiwygEmptyStatus(wysiwygRef.current);
            saveVisualSelection();
            if (scrollCaretIntoView) {
              requestAnimationFrame(() => {
                scrollCaretIntoView('nearest');
              });
            }
          }}
          onClick={(e) => {
            const trg = e.target as HTMLElement;
            const spacer = trg.closest?.('.table-spacer, [data-placeholder], [data-empty]') as HTMLElement | null;
            if (spacer && wysiwygRef.current?.contains(spacer)) {
              spacer.removeAttribute('data-empty');
              spacer.removeAttribute('data-placeholder');
              spacer.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
              
              if (!spacer.innerHTML || spacer.innerHTML.trim() === '') {
                spacer.innerHTML = '<br>';
              }
              
              const s = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(spacer);
              range.collapse(true);
              s?.removeAllRanges();
              s?.addRange(range);
              
              updateContentFromWysiwyg();
              return;
            }

            updateWysiwygEmptyStatus(wysiwygRef.current);
            saveVisualSelection();
          }}
          className={cn(
            "relative flex-1 w-full bg-transparent text-base outline-none overflow-y-auto custom-scrollbar transition-colors duration-700 editor-font prose prose-invert prose-cyan max-w-none wysiwyg-editor break-words overscroll-contain",
            (visualStyle === 'neon' && neonTextColored) ? "text-cyan-400 font-normal" : "text-slate-300",
            beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-4xl mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-4 pt-4 lg:px-6 lg:pt-6",
            getEditorBottomSpacingClass()
          )}
          data-is-empty={useEditorStore.getState().content.trim() === '' ? 'true' : undefined}
          data-placeholder-title={t('visualTitlePlaceholder')}
          data-placeholder-body={t('visualBodyPlaceholder')}
          style={{ minHeight: '200px' }}
        />
      )}

      {/* Table Action Menu */}
      {activeTable && tableRect && editorMode === 'visual' && (
        <div 
          className={cn("fixed z-[160] flex flex-col gap-1.5 p-1.5 rounded-xl",
            isTableMenuExpanded || isTableMenuPinned ? "bg-slate-900 border border-slate-700/50 shadow-none" : "bg-transparent shadow-none"
          )}
          style={{
            top: tableRect.top + 10,
            left: Math.max(8, tableRect.left - 48),
          }}
          onMouseEnter={() => !isTableMenuPinned && setIsTableMenuExpanded(true)}
          onMouseLeave={() => !isTableMenuPinned && setIsTableMenuExpanded(false)}
        >
          {isTableMenuExpanded || isTableMenuPinned ? (
            <>
              <button 
                onClick={() => {
                  const newPinned = !isTableMenuPinned;
                  setIsTableMenuPinned(newPinned);
                  localStorage.setItem('steem_table_menu_pinned', newPinned.toString());
                }} 
                className={cn("p-2 rounded-lg transition-colors flex items-center justify-center", isTableMenuPinned ? "text-cyan-400 bg-cyan-900/40" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                title="Pin Menu"
              >
                <Settings size={16} />
              </button>
              <div className="h-px w-full bg-slate-800" />
              <button onClick={deleteActiveTableRow} className="p-2 text-slate-400 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors flex items-center justify-center" title="Delete Row">
                <Trash2 size={16} />
              </button>
              <button onClick={deleteActiveTableCol} className="p-2 text-slate-400 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors flex items-center justify-center" title="Delete Column">
                <Trash2 size={16} className="rotate-90" />
              </button>
              <button onClick={deleteActiveTable} className="p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors flex items-center justify-center" title="Delete Table">
                <Trash2 size={18} />
              </button>
            </>
          ) : (
            <button 
              className="p-2 text-slate-400 bg-slate-900 border border-slate-700/50 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shadow-none flex items-center justify-center" 
              title="Table Settings"
            >
              <Settings size={18} className="opacity-70" />
            </button>
          )}
        </div>
      )}

      {/* Compact Mini-Gallery Strip */}
      <AnimatePresence>
        {isMiniGalleryOpen && images.length > 0 && !activeModal && (window.innerWidth >= 1024 || !isSidebarOpen) && (
          <motion.div
            key="mini-gallery-strip"
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              bottom: getMiniGalleryBottomStyle({
                isMobile: window.innerWidth < 1024,
                isKeyboardOpen,
                keyboardOffset,
                isFullScreen,
                isEditorFullScreen,
                widgetPos,
              }),
            }}
            className={cn(
              "z-[155] p-2 flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl transition-all",
              window.innerWidth < 1024 
                ? "fixed left-3 right-3 max-w-lg mx-auto" 
                : "absolute left-4 right-4 max-w-2xl mx-auto"
            )}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Images size={14} />
                  {t('miniGallery')} ({images.length})
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  • {t('tapToInsert')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-0.5 text-[10px] font-bold bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-md flex items-center gap-1 transition-colors"
                  title="Upload more"
                >
                  <Plus size={12} />
                  <span>+</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsMiniGalleryOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                  title={t('close')}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div 
              className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth"
              style={{ scrollbarWidth: 'none' }}
            >
              {images.filter(img => Boolean(img && (img.url || img.name))).map((img, idx) => (
                <button
                  key={img.url || (img as any).id || `img-${idx}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    insertImage(img.url, img.name, 'plain');
                    setJustInsertedUrl(img.url);
                    setTimeout(() => setJustInsertedUrl(null), 1200);
                  }}
                  className={cn(
                    "group relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border transition-all active:scale-95 focus:outline-none",
                    justInsertedUrl === img.url 
                      ? "border-emerald-400 ring-2 ring-emerald-400/50 scale-105" 
                      : "border-slate-700 hover:border-cyan-400"
                  )}
                  title={`${img.name} - ${t('tapToInsert')}`}
                >
                  <img 
                    src={img.url} 
                    alt={img.name} 
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  {justInsertedUrl === img.url ? (
                    <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex items-center justify-center text-emerald-400">
                      <Check size={18} className="stroke-[3]" />
                    </div>
                  ) : (
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/75 py-0.5 text-[8px] text-center text-slate-300 font-mono truncate px-0.5">
                      {idx + 1}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tamed Widget */}
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
    </div>
  );
};

export default EditorPane;
