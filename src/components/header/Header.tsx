import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Edit3,
  Globe,
  Type,
  ChevronDown,
  Bell,
  Trash2,
  ArrowRight,
  Sun,
  Moon,
  Layers,
  FileDown,
  FilePlus,
  Save,
  CheckCircle,
  Bold,
  Italic,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Link as LinkIcon,
  Minus,
  Terminal,
  Code,
  Indent,
  LayoutGrid,
  SplitSquareHorizontal,
  Table as TableIcon,
  AtSign,
  FileText,
  X,
  FileUp,
  Download,
  Settings,
  Rocket,
  List as ListIcon,
  FolderOpen
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from '../common/IconButton';
import { ShieldUserIcon } from '../common/ShieldUserIcon';
import { AVAILABLE_LANGUAGES } from '../../locales';
import { useEditorStore } from '../../store';

export interface HeaderProps {
  setIsSMenuOpen: (open: boolean) => void;
  visualStyle: 'standard' | 'neon';
  activeView: string;
  setActiveView: (view: any) => void;
  editorMode: string;
  toolsMap?: Record<string, { label: string | React.ReactNode; action: (e?: React.MouseEvent) => void }>;
  // Format actions & states
  fmt: (prefix: string, suffix?: string) => void;
  fmtLine: (prefix: string) => void;
  handleIndent: (dir: 'in' | 'out') => void;
  handleLink: () => void;
  importTable: () => void;
  saveDraft: () => void;
  downloadFile: () => void;
  insertAtCursor: (text: string, selectionMode?: 'end' | 'select') => void;
  saveFirst?: () => void;
  activeFormats: any;
  // Collections & Drafts
  templates: any[];
  drafts?: any[];
  mentions: any[];
  queue: any[];
  setPubTitle: (t: string) => void;
  setPubTags: (t: string) => void;
  setCurrentDraftId: (id: string | null) => void;
  // Notifications
  notifEnabled: boolean;
  setNotifEnabled: (enabled: boolean) => void;
  visibleNotifications: any[];
  showNotificationList: boolean;
  setShowNotificationList: (show: boolean) => void;
  markAllAsRead: () => void;
  setTargetReaderPost: (post: any) => void;
  // Language & Theme
  lang: string;
  setLang: (lang: string) => void;
  showLangMenu: boolean;
  setShowLangMenu: (show: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  performanceMode: boolean;
  // Mobile Tools
  showMobileToolsOpen: boolean;
  setShowMobileToolsOpen: (open: boolean) => void;
  showMobileTools1: boolean;
  setShowMobileTools1: (open: boolean) => void;
  showMobileTools2: boolean;
  setShowMobileTools2: (open: boolean) => void;
  // App & Editor Refs / Helpers
  setActiveModal: (modal: any) => void;
  setSettingsTab: (tab: any) => void;
  isPwaInstalled: boolean;
  handleInstallPwa: () => void;
  getMotionConfig: () => any;
  editorRef: React.RefObject<any>;
  wysiwygRef: React.RefObject<any>;
  isSyncingRef: React.MutableRefObject<boolean>;
  getMarked: () => any;
  setContent: (content: string) => void;
  confirmDialog: (options: any) => Promise<boolean>;
  updateWysiwygEmptyStatus: (ref: any) => void;
  isTauriEnv: () => boolean;
  isNeutralinoEnv: () => boolean;
  t: (key: any) => string;
}

export const Header: React.FC<HeaderProps> = (props) => {
  const {
    setIsSMenuOpen,
    visualStyle,
    activeView,
    setActiveView,
    editorMode,
    fmt,
    fmtLine,
    handleIndent,
    handleLink,
    importTable,
    saveDraft,
    downloadFile,
    insertAtCursor,
    activeFormats,
    setPubTitle,
    setPubTags,
    setCurrentDraftId,
    notifEnabled,
    setNotifEnabled,
    visibleNotifications,
    showNotificationList,
    setShowNotificationList,
    markAllAsRead,
    setTargetReaderPost,
    lang,
    setLang,
    showLangMenu,
    setShowLangMenu,
    isDarkMode,
    setIsDarkMode,
    performanceMode,
    showMobileToolsOpen,
    setShowMobileToolsOpen,
    showMobileTools1,
    setShowMobileTools1,
    showMobileTools2,
    setShowMobileTools2,
    setActiveModal,
    setSettingsTab,
    isPwaInstalled,
    handleInstallPwa,
    getMotionConfig,
    editorRef,
    wysiwygRef,
    isSyncingRef,
    getMarked,
    setContent,
    confirmDialog,
    updateWysiwygEmptyStatus,
    isTauriEnv,
    isNeutralinoEnv,
    toolsMap,
    t
  } = props;

  const fallbackToolsMap: Record<string, { label: string | React.ReactNode, action: (e?: React.MouseEvent) => void }> = {
    'B': { label: 'B', action: () => fmt('**') },
    'I': { label: 'I', action: () => fmt('*') },
    'S': { label: '~~', action: () => fmt('~~') },
    'sub': { label: 'sub', action: () => fmt('<sub>', '</sub>') },
    'sup': { label: 'sup', action: () => fmt('<sup>', '</sup>') },
    'code': { label: '</>', action: () => fmt('`') },
    'H1': { label: 'H1', action: () => fmtLine('# ') },
    'H2': { label: 'H2', action: () => fmtLine('## ') },
    'H3': { label: 'H3', action: () => fmtLine('### ') },
    'quote': { label: '""', action: () => fmtLine('> ') },
    'ul': { label: '• List', action: () => fmtLine('- ') },
    'ol': { label: '1. List', action: () => fmtLine('1. ') },
    'task': { label: '[ ] Task', action: () => fmtLine('- [ ] ') },
    'link': { label: 'Link', action: handleLink },
    'Table': { label: 'Table', action: importTable },
    'table': { label: 'Table', action: importTable },
    'indent': { label: 'Tab →', action: () => handleIndent('in') },
    'outdent': { label: '← ShiftTab', action: () => handleIndent('out') }
  };

  const TOOLS_MAP = toolsMap || fallbackToolsMap;

  return (
<header 
        className="border-b border-slate-800 bg-slate-900 flex items-center px-2 sm:px-4 z-[200] relative shrink-0"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <div className="flex items-center gap-1.5 xs:gap-3 shrink-0">
          <div className="flex items-center gap-1 xs:gap-2">
            <button 
              onClick={() => setIsSMenuOpen(true)}
              className="w-8 h-8 xs:w-10 xs:h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg xs:rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all text-lg xs:text-xl"
            >
              <span className={cn("logo-s", visualStyle === 'neon' && "neon-icon-glow")}>S</span>
            </button>
            <div className="flex flex-col">
              <span className={cn("font-black text-xs xs:text-lg hidden sm:inline-block tracking-tighter leading-none shrink-0 italic", visualStyle === 'neon' && "neon-icon-glow")}>Steem<span className="text-cyan-400">Editor</span></span>
              <span className="text-[7px] xs:text-[9px] font-bold text-slate-500 tracking-widest uppercase hidden sm:block">Professional Pro</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5 xs:mx-1 hidden md:block" />

          {/* View Toggler */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0">
            <button 
              onClick={() => setActiveView('editor')}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1.5",
                activeView === 'editor' ? "bg-cyan-600 text-white shadow-none neon-tab-glow" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Edit3 size={16} className={cn(visualStyle === 'neon' && "neon-icon-glow")} /> <span className="hidden xs:inline">{t('editor')}</span>
            </button>
            <button 
              onClick={() => {
                setActiveView('reader');
                markAllAsRead();
              }}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1.5 relative",
                activeView === 'reader' ? "bg-cyan-600 text-white shadow-none neon-tab-glow" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Globe size={16} className={cn(visualStyle === 'neon' && "neon-icon-glow")} /> <span className="hidden xs:inline">{t('reader')}</span>
            </button>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block shrink-0" />

        {/* Center: Formatting Tools */}
        {activeView === 'editor' && (
          <div className="flex-1 min-w-0 px-1 flex items-center justify-start lg:justify-center relative group/tools">
            {/* Format menu trigger */}
            <div className="relative mobile-tools-container shrink-0 lg:hidden">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !showMobileToolsOpen;
                  setShowMobileToolsOpen(nextState);
                  if (nextState) {
                    setShowMobileTools1(false);
                    setShowMobileTools2(false);
                    setShowNotificationList(false);
                    setShowLangMenu(false);
                  }
                }}
                className="flex shrink-0 items-center justify-center bg-slate-800/30 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all gap-1.5 h-9"
                title={t('formatting') || "Formatting Tools"}
              >
                <Type size={16} className="shrink-0" />
                <ChevronDown size={14} className={cn("transition-transform duration-200 shrink-0", showMobileToolsOpen && "rotate-180")} />
              </button>

              {/* Tools Dropdown */}
              <div className={cn(
                "fixed top-14 left-2 right-2 sm:absolute sm:top-full sm:left-0 sm:right-auto mt-2 bg-slate-800 border border-slate-700 p-2.5 rounded-xl shadow-2xl z-[150] flex-col gap-2.5 max-w-[95vw] sm:w-max max-h-[75vh] overflow-y-auto custom-scrollbar mx-auto sm:mx-0",
                showMobileToolsOpen ? "flex" : "hidden"
              )}>
                {/* Group 1 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={Bold} onClick={() => { fmt('**'); setShowMobileToolsOpen(false); }} title={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
                  <IconButton icon={Italic} onClick={() => { fmt('*'); setShowMobileToolsOpen(false); }} title={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
                  <IconButton icon={Strikethrough} onClick={() => { fmt('~~'); setShowMobileToolsOpen(false); }} title={t('strike')} className="shrink-0 size-8" active={activeFormats.strikethrough} />
                </div>
                {/* Group 2 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { fmtLine('# '); setShowMobileToolsOpen(false); }} title={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { fmtLine('## '); setShowMobileToolsOpen(false); }} title={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { fmtLine('### '); setShowMobileToolsOpen(false); }} title={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
                </div>
                {/* Group 3 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={AlignLeft} onClick={() => { fmt('<div class="text-left">\n', '\n</div>'); setShowMobileToolsOpen(false); }} title={t('leftText')} className="shrink-0 size-8" />
                  <IconButton icon={AlignCenter} onClick={() => { fmt('<center>\n', '\n</center>'); setShowMobileToolsOpen(false); }} title="Center" className="shrink-0 size-8" />
                  <IconButton icon={AlignRight} onClick={() => { fmt('<div class="text-right">\n', '\n</div>'); setShowMobileToolsOpen(false); }} title={t('rightText')} className="shrink-0 size-8" />
                  <IconButton icon={AlignJustify} onClick={() => { fmt('<div class="text-justify">\n', '\n</div>'); setShowMobileToolsOpen(false); }} title="Justify" className="shrink-0 size-8" />
                </div>
                {/* Group 4 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={Quote} onClick={() => { fmtLine('> '); setShowMobileToolsOpen(false); }} title={t('quote')} className="shrink-0 size-8" />
                  <IconButton icon={LinkIcon} onClick={() => { handleLink(); setShowMobileToolsOpen(false); }} title={t('link')} className="shrink-0 size-8" />
                  <IconButton icon={Minus} onClick={() => { insertAtCursor('\n\n---\n\n', 'end'); setShowMobileToolsOpen(false); }} title={t('hr')} className="shrink-0 size-8" />
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => { fmt('<div class="phishy">', '</div>'); setShowMobileToolsOpen(false); }} title={t('redText')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0 transition-colors", activeFormats.phishy ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50" : "text-red-500")}>A</button>
                </div>
                {/* Group 5 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  Code
                  <IconButton icon={Terminal} onClick={() => { fmt('`'); setShowMobileToolsOpen(false); }} title={t('inlineCode')} className="shrink-0 size-8 ml-auto" active={activeFormats.code} />
                  <IconButton icon={Code} onClick={() => { fmt('```\n', '\n```'); setShowMobileToolsOpen(false); }} title={t('codeBlock')} className="shrink-0 size-8" />
                  <IconButton icon={Indent} onClick={() => {
                    handleIndent('out');
                    setShowMobileToolsOpen(false);
                  }} title={t('indent')} className="shrink-0 size-8" />
                </div>
                {/* Group 6 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  {t('table')}
                  <IconButton icon={LayoutGrid} onClick={(e) => { TOOLS_MAP['Table']?.action(e); setShowMobileToolsOpen(false); }} title={t('table')} className="shrink-0 size-8 ml-auto" />
                  <IconButton icon={SplitSquareHorizontal} onClick={() => { insertAtCursor('| Head |\n| --- |\n', 'end'); setShowMobileToolsOpen(false); }} title="1 Col" className="shrink-0 size-8" />
                  <IconButton icon={TableIcon} onClick={() => { importTable(); setShowMobileToolsOpen(false); }} title={t('importTable')} className="shrink-0 size-8" />
                </div>
                {/* Group 7 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={AtSign} onClick={() => { setActiveModal('mentions'); setShowMobileToolsOpen(false); }} title={t('mentions')} className="shrink-0 size-8" />
                  <IconButton icon={FileText} onClick={() => { setActiveModal('templates'); setShowMobileToolsOpen(false); }} title={t('templates')} className="shrink-0 size-8" />
                </div>
              </div>
            </div>

            {/* Desktop Formatting Tools (Scrollable) */}
            <div className="hidden lg:flex flex-1 overflow-hidden relative"
              onWheel={(e) => {
                const container = e.currentTarget.querySelector('.tools-scroll-container');
                if (container && e.deltaY !== 0) container.scrollLeft += e.deltaY;
              }}
            >
              <div className="tools-scroll-container mx-auto flex items-center justify-start gap-1 bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap w-full lg:w-auto">
                <IconButton icon={Bold} onClick={() => fmt('**')} title={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
                <IconButton icon={Italic} onClick={() => fmt('*')} title={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
                <IconButton icon={Strikethrough} onClick={() => fmt('~~')} title={t('strike')} className="shrink-0 size-8" active={activeFormats.strikethrough} />
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => fmtLine('# ')} title={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => fmtLine('## ')} title={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => fmtLine('### ')} title={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <IconButton icon={AlignLeft} onClick={() => fmt('<div class="text-left">\n', '\n</div>')} title={t('leftText')} className="shrink-0 size-8" />
                <IconButton icon={AlignCenter} onClick={() => fmt('<center>\n', '\n</center>')} title="Center" className="shrink-0 size-8" />
                <IconButton icon={AlignRight} onClick={() => fmt('<div class="text-right">\n', '\n</div>')} title={t('rightText')} className="shrink-0 size-8" />
                <IconButton icon={AlignJustify} onClick={() => fmt('<div class="text-justify">\n', '\n</div>')} title="Justify" className="shrink-0 size-8" />
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <IconButton icon={Quote} onClick={() => fmtLine('> ')} title={t('quote')} className="shrink-0 size-8" />
                <IconButton icon={LinkIcon} onClick={handleLink} title={t('link')} className="shrink-0 size-8" />
                <IconButton icon={Minus} onClick={() => insertAtCursor('\n\n---\n\n', 'end')} title={t('hr')} className="shrink-0 size-8" />
                <button type="button" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()} onClick={() => fmt('<div class="phishy">', '</div>')} title={t('redText')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0 transition-colors", activeFormats.phishy ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50" : "text-red-500")}>A</button>
                <IconButton icon={Terminal} onClick={() => fmt('`')} title={t('inlineCode')} className="shrink-0 size-8" active={activeFormats.code} />
                <IconButton icon={Code} onClick={() => fmt('```\n', '\n```')} title={t('codeBlock')} className="shrink-0 size-8" />
                <IconButton icon={Indent} onClick={handleIndent} title={t('indent')} className="shrink-0 size-8" />
                <IconButton icon={LayoutGrid} onClick={(e) => TOOLS_MAP['Table']?.action(e)} title={t('table')} className="shrink-0 size-8" />
                <IconButton icon={SplitSquareHorizontal} onClick={() => insertAtCursor('| Head |\n| --- |\n', 'end')} title="1 Col" className="shrink-0 size-8" />
                <IconButton icon={TableIcon} onClick={importTable} title={t('importTable')} className="shrink-0 size-8" />
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <IconButton icon={AtSign} onClick={() => setActiveModal('mentions')} title={t('mentions')} className="shrink-0 size-8" />
                <IconButton icon={FileText} onClick={() => setActiveModal('templates')} title={t('templates')} className="shrink-0 size-8" />
              </div>
            </div>
          </div>
        )}

        <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block shrink-0" />

        {/* Right side: Notifications, Pub, etc */}
        <div className="flex items-center gap-1 xs:gap-1.5 shrink-0 ml-auto">
          <div className="relative notification-container shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const nextState = !showNotificationList;
                setShowNotificationList(nextState);
                if (nextState) {
                  setShowMobileToolsOpen(false);
                  setShowMobileTools1(false);
                  setShowMobileTools2(false);
                  setShowLangMenu(false);
                }
              }}
              className={cn(
                "size-8 xs:size-9 flex items-center justify-center rounded-xl transition-all relative",
                notifEnabled ? "bg-[rgb(var(--accent-color)/0.1)] text-[rgb(var(--accent-color))]" : "text-slate-500 hover:text-white"
              )}
            >
              <Bell size={18} className={cn(visibleNotifications.some(n => !n.isRead) ? "animate-swing" : "")} />
              {visibleNotifications.some(n => !n.isRead) && (
                <span className={cn(
                  "absolute top-0 right-0 w-3.5 h-3.5 rounded-full border border-slate-950 flex items-center justify-center animate-pulse z-10 text-[7px] text-black font-black bg-[rgb(var(--accent-color))]"
                )}>
                  {visibleNotifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotificationList && (
                <motion.div 
                  {...getMotionConfig()}
                  className="fixed top-14 left-2 right-2 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:origin-top-right sm:mt-2 sm:w-80 max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Сповіщення</h3>
                      <span className="text-[9px] text-slate-500 font-bold">{visibleNotifications.filter(n => !n.isRead).length} нових</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => setNotifEnabled(!notifEnabled)} className={cn("w-7 h-4 rounded-full relative transition-colors", notifEnabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700")}>
                          <div className={cn("absolute top-0.5 size-3 bg-white rounded-full transition-all", notifEnabled ? "left-3.5" : "left-0.5")} />
                       </button>
                       <button onClick={() => markAllAsRead()} className="p-1 text-slate-500 hover:text-white" title="Очистити"><Trash2 size={16} /></button>
                       <button onClick={() => setShowNotificationList(false)} className="p-1 text-slate-500 hover:text-white"><X size={18} /></button>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {visibleNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-[10px] uppercase font-black">Порожньо</div>
                    ) : (
                      <div className="divide-y divide-slate-800/30">
                        {visibleNotifications.map(n => (
                          <div key={n.id} className={cn("p-3 hover:bg-slate-800/30 transition-colors", !n.isRead && "bg-lime-400/5")}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-black text-white">@{n.author}</span>
                              {!n.isRead && <div className="w-1.5 h-1.5 bg-lime-400 rounded-full ml-auto" />}
                            </div>
                            <p className="text-[10px] text-slate-400 italic line-clamp-1 mb-1">{n.body}</p>
                            <button 
                              onClick={() => { 
                                setActiveView('reader'); 
                                setShowNotificationList(false);
                                setTargetReaderPost({ 
                                  author: n.parent_author || n.author, 
                                  permlink: n.parent_permlink || n.permlink,
                                  commentAuthor: n.author,
                                  commentPermlink: n.permlink
                                });
                              }}
                              className="text-[9px] font-black text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              ПЕРЕГЛЯНУТИ <ArrowRight size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          <div className="hidden md:flex items-center bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 shrink-0">
             <button 
                onClick={() => {
                  const next = !isDarkMode;
                  setIsDarkMode(next);
                  localStorage.setItem('steem_dark_mode', next.toString());
                }}
                className="p-1.5 text-slate-500 hover:text-white transition-all shrink-0"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <div className="relative shrink-0 lang-menu-container">
                 <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextState = !showLangMenu;
                      setShowLangMenu(nextState);
                      if (nextState) {
                        setShowMobileToolsOpen(false);
                        setShowMobileTools1(false);
                        setShowMobileTools2(false);
                        setShowNotificationList(false);
                      }
                    }}
                    className="flex items-center gap-1 bg-slate-900/50 px-1.5 py-1 rounded-lg text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all"
                 >
                    {lang}
                    <ChevronDown size={8} className={cn("transition-transform", showLangMenu && "rotate-180")} />
                 </button>
                 
                 <AnimatePresence>
                   {showLangMenu && (
                     <motion.div
                       initial={{ opacity: 0, y: 5, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 5, scale: 0.95 }}
                       className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[120px]"
                     >
                       {AVAILABLE_LANGUAGES.map(item => (
                         <button
                           key={item.code}
                           onClick={() => {
                             setLang(item.code);
                             localStorage.setItem('steem_lang', item.code);
                             setShowLangMenu(false);
                           }}
                           className={cn(
                             "flex items-center justify-between w-full text-left px-3 py-2 text-[10px] font-black uppercase transition-colors border-b last:border-0 border-slate-700/50 gap-2",
                             lang === item.code ? "bg-cyan-600/20 text-cyan-400" : "text-slate-400 hover:text-white hover:bg-slate-700"
                           )}
                         >
                           <span>{item.label}</span>
                           <span className="text-[9px] font-normal normal-case opacity-70">{item.nativeName}</span>
                         </button>
                       ))}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
          </div>

          <div className="relative shrink-0 z-50 mobile-tools-container">
             <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !showMobileTools1;
                  setShowMobileTools1(nextState);
                  if (nextState) {
                    setShowMobileTools2(false);
                    setShowMobileToolsOpen(false);
                    setShowNotificationList(false);
                    setShowLangMenu(false);
                  }
                }}
                className="lg:hidden flex items-center justify-center bg-slate-800/30 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all size-8 xs:size-9"
                title="Tools"
             >
                <Layers size={18} />
             </button>
             <div className={cn(
                "absolute lg:static top-full right-0 mt-2 lg:mt-0 bg-slate-800 lg:bg-slate-800/30 border border-slate-700 lg:border-slate-700/30 p-2 lg:p-1 rounded-xl shadow-2xl lg:shadow-none min-w-max flex-col lg:flex-row items-center gap-1 lg:gap-1.5 z-50",
                showMobileTools1 ? "flex" : "hidden lg:flex"
             )}>
                <IconButton icon={Layers} onClick={() => { setActiveModal('splitPost'); setShowMobileTools1(false); }} title={t('splitPost')} className="shrink-0 size-10" />
                <IconButton icon={ListIcon} onClick={() => { setActiveModal('queue'); setShowMobileTools1(false); }} title={t('queue')} className="shrink-0 size-10" />
                <IconButton icon={FolderOpen} onClick={() => { setActiveModal('drafts'); setShowMobileTools1(false); }} title={t('drafts')} className="shrink-0 size-10" />
                <div className="w-full lg:w-px h-px lg:h-5 bg-slate-700 my-1 lg:my-0 lg:mx-0.5 shrink-0" />
                <label className="w-10 h-10 bg-cyan-950/20 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center shadow-lg shadow-cyan-950/50" title={t('importMd') || 'Import MD'}>
                   <FileDown size={20} />
                   <input type="file" accept=".md,.txt" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if(f) {
                         const reader = new FileReader();
                         reader.onload = (ev) => {
                            const val = ev.target?.result as string;
                            const currentContent = useEditorStore.getState().content;
                            const newContent = currentContent ? currentContent + '\n\n' + val : val;
                            
                            useEditorStore.setState({ content: newContent });
                            
                            if (editorMode === 'markdown' && editorRef.current) {
                               editorRef.current.value = newContent;
                               editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
                            } else if (editorMode === 'visual') {
                               setContent(newContent);
                               if (wysiwygRef.current) {
                                  isSyncingRef.current = true;
                                  const getMarkedFn = getMarked;
                                  const m = getMarkedFn();
                                  if (m) {
                                     m.parse(newContent).then((parsed: any) => {
                                        if (wysiwygRef.current) {
                                          wysiwygRef.current.innerHTML = parsed;
                                        }
                                        isSyncingRef.current = false;
                                     });
                                  } else {
                                     isSyncingRef.current = false;
                                  }
                               }
                            } else {
                               setContent(newContent);
                            }
                            
                            setShowMobileTools1(false);
                            e.target.value = '';
                         };
                         reader.readAsText(f);
                      }
                   }} />
                </label>
                <IconButton icon={FileUp} onClick={() => { downloadFile(); setShowMobileTools1(false); }} title={t('exportMd') || 'Export MD'} className="shrink-0 size-10 text-slate-400 hover:text-cyan-400" />
             </div>
          </div>

          <div className="relative shrink-0 z-40 mobile-tools-container">
             <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !showMobileTools2;
                  setShowMobileTools2(nextState);
                  if (nextState) {
                    setShowMobileTools1(false);
                    setShowMobileToolsOpen(false);
                    setShowNotificationList(false);
                    setShowLangMenu(false);
                  }
                }}
                className="lg:hidden flex items-center justify-center bg-slate-800/30 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all size-8 xs:size-9"
                title="Files"
             >
                <FilePlus size={18} />
             </button>
             <div className={cn(
                "absolute lg:static top-full right-0 mt-2 lg:mt-0 bg-slate-800 lg:bg-slate-800/30 border border-slate-700 lg:border-slate-700/30 p-2 lg:p-1 rounded-xl shadow-2xl lg:shadow-none min-w-max flex-col lg:flex-row items-stretch lg:items-center gap-1.5 z-40",
                showMobileTools2 ? "flex" : "hidden lg:flex"
             )}>
                <IconButton 
                  icon={FilePlus} 
                  onClick={async () => {
                    setShowMobileTools2(false);
                    if (useEditorStore.getState().content.trim() !== '') {
                      const saveFirst = await confirmDialog(t('saveDraftBeforeNew') || "Save draft before starting new?");
                      if (saveFirst) saveDraft();
                      else if (!await confirmDialog(t('confirmNewPost'))) return;
                    }
                    setPubTitle(''); setContent(''); setPubTags(''); setCurrentDraftId(null);
                    localStorage.removeItem('steem_autosave_temp_visual_html');
                    if (wysiwygRef.current) {
                      wysiwygRef.current.innerHTML = '<p><br></p>';
                      updateWysiwygEmptyStatus(wysiwygRef.current);
                    }
                  }} 
                  title={t('newPost')} 
                  className="shrink-0 size-10 flex mx-auto" 
                />
                <div className="w-full lg:w-px h-px lg:h-5 bg-slate-700 my-0.5 lg:my-0 lg:mx-0.5 shrink-0" />
                <div className="flex flex-col lg:flex-row lg:items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shrink-0">
                   <button onClick={() => { saveDraft(); setShowMobileTools2(false); }} className="px-3 lg:px-2 py-2 lg:py-1.5 hover:bg-slate-800 text-slate-300 border-b lg:border-b-0 lg:border-r border-slate-700 flex items-center justify-center lg:justify-start gap-1.5 text-[10px] lg:text-[9px] font-black uppercase transition-colors" title={t('saveDraft')}>
                     <Save size={20} /> 
                     <span className="lg:hidden xl:inline">{t('saveDraft')}</span>
                   </button>
                   <button onClick={() => { saveDraft(); setShowMobileTools2(false); }} className={cn(
                     "px-3 lg:px-2 py-2 lg:py-1.5 flex items-center justify-center transition-colors hover:bg-[rgb(var(--accent-color)/0.1)] text-[rgb(var(--accent-color))] hover:text-[rgb(var(--accent-color))]"
                   )} title={t('ready')}>
                     <CheckCircle size={20} />
                   </button>
                </div>
             </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5 xs:mx-1 shrink-0" />

          <div className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 shrink-0">
            {!isPwaInstalled && !isTauriEnv() && !isNeutralinoEnv() && (
              <IconButton 
                icon={Download} 
                onClick={handleInstallPwa} 
                title={t('installApp') || "Встановити PWA"} 
                className="shrink-0 size-8 hidden lg:flex text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/80 active:scale-95 transition-transform" 
              />
            )}
            <IconButton icon={ShieldUserIcon} onClick={() => setActiveModal('keys')} title={t('keys')} className="shrink-0 size-8 flex" />
            <IconButton icon={Settings} onClick={() => { setSettingsTab('general'); setActiveModal('settings'); }} title={t('settings')} className="shrink-0 size-8 hidden lg:flex" />

            {activeView === 'editor' && (
              <IconButton icon={Rocket} onClick={() => setActiveModal('publish')} title={t('publish')} className={cn("shrink-0 size-8 bg-cyan-600 text-white hover:bg-cyan-500 border border-cyan-500/30 transition-all", performanceMode ? "shadow-none" : "shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95")} />
            )}
          </div>
        </div>
      </header>
  );
};
