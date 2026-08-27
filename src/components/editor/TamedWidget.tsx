import React from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  Sparkles,
  Move,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  List as ListIcon,
  Link as LinkIcon,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  Eye,
  Settings,
  Plus,
  X,
  Layers,
  Globe,
  FileText,
  LayoutGrid,
  Maximize2,
  Minimize2,
  ListOrdered,
  CheckSquare,
  CornerDownRight,
  CornerUpLeft,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Zap,
  MoveVertical
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ShieldUserIcon } from '../common/ShieldUserIcon';
import { getFloatingWidgetStyles } from '../../lib/viewportLayout';

export interface TamedWidgetProps {
  toolsMap?: Record<string, { label: string | React.ReactNode; action: (e?: React.MouseEvent) => void }>;
  widgetPos: 'bottom' | 'floating' | 'hidden';
  setWidgetPos: (pos: 'bottom' | 'floating' | 'hidden') => void;
  isWidgetVisible: boolean;
  setIsWidgetVisible: (v: boolean) => void;
  isWidgetMenuOpen: boolean;
  setIsWidgetMenuOpen: (o: any) => void;
  editorMode: string;
  activeFormats: any;
  fmt: (prefix: string, suffix?: string) => void;
  fmtLine: (prefix: string) => void;
  handleIndent: (dir: 'in' | 'out') => void;
  handleLink: () => void;
  importTable: () => void;
  showMobileTools1: boolean;
  setShowMobileTools1: (s: boolean) => void;
  showMobileTools2: boolean;
  setShowMobileTools2: (s: boolean) => void;
  setShowMobileToolsOpen: (s: boolean) => void;
  showMobileToolsOpen: boolean;
  setActiveModal: (modal: any) => void;
  setSettingsTab: (tab: any) => void;
  insertAtCursor: (text: string, selectionMode?: 'end' | 'select') => void;
  editorRef: React.RefObject<any>;
  wysiwygRef: React.RefObject<any>;
  isSyncingRef: React.MutableRefObject<boolean>;
  getMarked: () => any;
  setContent: (content: string) => void;
  confirmDialog: (options: any) => Promise<boolean>;
  updateWysiwygEmptyStatus: (ref: any) => void;
  activeModal: string | null;
  isEditorFullScreen: boolean;
  isFullScreen: boolean;
  widgetNoBorder?: boolean;
  performanceMode?: boolean;
  floatingPos?: any;
  editorPaneRef?: any;
  widgetRef?: any;
  toolbarIconSize?: any;
  offsetTop?: any;
  viewportHeight?: any;
  isKeyboardOpen?: boolean;
  isSidebarOpen?: boolean;
  scrollRef?: any;
  lockedToolsWidth?: any;
  setLockedToolsWidth?: any;
  enabledTools?: any;
  setEnabledTools?: any;
  handleWidgetAction?: any;
  menuDirection?: any;
  widgetOpacity?: any;
  setWidgetOpacity?: any;
  setWidgetNoBorder?: any;
  lang?: string;
  moveTool?: any;
  toggleTool?: any;
  t: (key: any) => string;
}

export const TamedWidget: React.FC<TamedWidgetProps> = (props) => {
  const {
    widgetPos,
    setWidgetPos,
    isWidgetVisible,
    setIsWidgetVisible,
    isWidgetMenuOpen,
    setIsWidgetMenuOpen,
    editorMode,
    activeFormats,
    fmt,
    fmtLine,
    handleIndent,
    handleLink,
    importTable,
    showMobileTools1,
    setShowMobileTools1,
    showMobileTools2,
    setShowMobileTools2,
    setShowMobileToolsOpen,
    showMobileToolsOpen,
    setActiveModal,
    setSettingsTab,
    insertAtCursor,
    editorRef,
    wysiwygRef,
    isSyncingRef,
    getMarked,
    setContent,
    confirmDialog,
    updateWysiwygEmptyStatus,
    activeModal,
    isEditorFullScreen = false,
    isFullScreen = false,
    widgetNoBorder,
    performanceMode,
    floatingPos,
    editorPaneRef,
    widgetRef,
    toolbarIconSize,
    offsetTop,
    viewportHeight,
    isKeyboardOpen = false,
    isSidebarOpen = false,
    scrollRef,
    lockedToolsWidth,
    setLockedToolsWidth,
    enabledTools = [],
    setEnabledTools,
    handleWidgetAction = (fn: any) => fn(),
    menuDirection = 'up',
    widgetOpacity = 1.0,
    setWidgetOpacity,
    setWidgetNoBorder,
    lang = 'uk',
    moveTool,
    toggleTool,
    t
  } = props;

  const fallbackToolsMap: Record<string, { label: string | React.ReactNode, action: (e?: React.MouseEvent) => void }> = {
    'B': { label: 'B', action: () => fmt('**') },
    'I': { label: 'I', action: () => fmt('*') },
    'S': { label: '~~', action: () => fmt('~~') },
    'sub': { label: 'sub', action: () => fmt('<sub>', '</sub>') },
    'sup': { label: 'sup', action: () => fmt('<sup>', '</sup>') },
    'H1': { label: 'H1', action: () => fmtLine('# ') },
    'H2': { label: 'H2', action: () => fmtLine('## ') },
    'H3': { label: 'H3', action: () => fmtLine('### ') },
    'Link': { label: <LinkIcon size={20} />, action: handleLink },
    'Quote': { label: <Quote size={20} />, action: () => fmtLine('> ') },
    'List': { label: '•', action: () => fmtLine('- ') },
    'Num': { label: '1.', action: () => fmtLine('1. ') },
    'Task': { label: '☑', action: () => fmtLine('- [ ] ') },
    'Table': { label: <LayoutGrid size={20} />, action: importTable },
    'Separator': { label: <Minus size={20} />, action: () => insertAtCursor('| Head |\n| --- |\n', 'end') },
    'Import': { label: <TableIcon size={20} />, action: importTable },
    'Code': { label: <Code size={20} />, action: () => fmt('```\n', '\n```') },
    'Inline': { label: '</>', action: () => fmt('`') },
    'Indent': { label: 'Tab →', action: () => handleIndent('in') },
    'Esc': { label: '\\', action: () => fmt('\\', '') },
    'HR': { label: '—', action: () => insertAtCursor('\n\n---\n\n') },
    'Color': { label: 'A', action: () => fmt('<div class="phishy">', '</div>') },
    'Caption': { label: 'Caption', action: () => fmt('<center>\n<sub>', '</sub>\n</center>') },
    'Left': { label: '⬅', action: () => fmt('<div class="text-left">\n', '\n</div>') },
    'Center': { label: 'Центр', action: () => fmt('<center>\n', '\n</center>') },
    'Right': { label: '➡', action: () => fmt('<div class="text-right">\n', '\n</div>') },
    'Justify': { label: 'Вирів', action: () => fmt('<div class="text-justify">\n', '\n</div>') },
    'Grid': { label: 'Сітка', action: () => insertAtCursor('<div class="pull-left">\n</div>\n<div class="pull-right">\n</div>\n<div class="clearfix"></div>\n') },
    'Templates': { label: <FileText size={20} />, action: () => setActiveModal('templates') },
    'Mentions': { label: 'Mentions', action: () => insertAtCursor('@') },
    'Img': { label: <ImageIcon size={20} />, action: () => {} },
    'Gallery': { label: 'Gallery', action: () => {} }
  };

  const TOOLS_MAP = props.toolsMap || fallbackToolsMap;

  return (
    <>
{/* Tamed Widget - With 3 distinct modes (hidden, bottom, floating) and fixed mobile positioning */}
              {(isWidgetVisible || widgetPos === 'bottom') && widgetPos !== 'hidden' && !activeModal && (window.innerWidth >= 1024 || !isSidebarOpen) && (
                  <div 
                    key="steem-widget"
                    ref={widgetRef}
                    style={getFloatingWidgetStyles({
                      widgetPos,
                      isMobile: window.innerWidth < 1024,
                      floatingPos,
                      editorPaneEl: editorPaneRef.current,
                      widgetEl: widgetRef.current,
                      toolbarIconSize,
                      offsetTop,
                      viewportHeight,
                      isKeyboardOpen,
                      isFullScreen,
                      isEditorFullScreen,
                    })}
                    className={cn(
                      "steem-widget-container z-[150] p-1 flex items-center gap-1",
                      widgetNoBorder 
                        ? "shadow-none border-none border-transparent py-0 px-0 bg-slate-900"
                        : "bg-slate-900 border border-white/10 rounded-3xl p-1 shadow-none",
                      widgetPos === 'floating' && window.innerWidth >= 1024 
                        ? "fixed" 
                        : "fixed sm:absolute bottom-4 left-2 right-2 sm:left-4 sm:right-4 rounded-3xl mx-auto max-w-2xl"
                    )}
                  >
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => scrollRef.current?.scrollBy({ left: -100, behavior: 'smooth' })}
                      className="hidden lg:flex h-[var(--toolbar-btn-size,3rem)] px-1.5 items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <ChevronLeft size={20} className="w-[var(--toolbar-icon-size,1.25rem)] h-[var(--toolbar-icon-size,1.25rem)]" />
                    </button>

                    <div 
                      ref={scrollRef}
                      onWheel={(e) => {
                        if (scrollRef.current) {
                          if (e.deltaX !== 0) {
                            // Let native horizontal scrolling work
                            return;
                          }
                          // Translate vertical scrolling to horizontal
                          e.preventDefault();
                          scrollRef.current.scrollBy({ left: e.deltaY > 0 ? 50 : -50 });
                        }
                      }}
                      className="flex items-center flex-nowrap justify-start gap-1.5 overflow-x-auto custom-scrollbar scroll-smooth no-scrollbar px-1 py-0 w-full"
                      style={{ 
                        scrollbarWidth: 'none',
                        minWidth: isWidgetMenuOpen && lockedToolsWidth ? `${lockedToolsWidth}px` : undefined,
                        width: isWidgetMenuOpen && lockedToolsWidth ? `${lockedToolsWidth}px` : undefined
                      }}
                    >
                      {enabledTools.map((key: string) => {
                        const tool = TOOLS_MAP[key];
                        if (!tool) return null;
                        const isToolActive = 
                          key === 'B' ? activeFormats.bold :
                          key === 'I' ? activeFormats.italic :
                          key === 'S' ? activeFormats.strikethrough :
                          key === 'sub' ? activeFormats.sub :
                          key === 'sup' ? activeFormats.sup :
                          key === 'Inline' ? activeFormats.code :
                          key === 'Color' ? activeFormats.phishy :
                          false;
                        return (
                          <button 
                            key={key}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => handleWidgetAction(tool.action, e)} 
                            className={cn(
                              "toolbar-btn flex-shrink-0 flex items-center justify-center rounded-xl transition-colors font-bold",
                              isToolActive 
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-none"
                                : !widgetNoBorder 
                                  ? "bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-300 shadow-none"
                                  : "bg-transparent text-slate-400 hover:bg-slate-800"
                            )}
                          >
                            {tool.label}
                          </button>
                        );
                      })}
                    </div>

                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => scrollRef.current?.scrollBy({ left: 100, behavior: 'smooth' })}
                      className="hidden lg:flex h-[var(--toolbar-btn-size,3rem)] px-1.5 items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <ChevronRight size={20} className="w-[var(--toolbar-icon-size,1.25rem)] h-[var(--toolbar-icon-size,1.25rem)]" />
                    </button>

                    <div className="hidden lg:block w-px h-[calc(var(--toolbar-btn-size,3rem)-8px)] bg-slate-700/50 mx-1 flex-shrink-0" />
                    
                    <div className="relative widget-settings-container">
                      <button 
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isWidgetMenuOpen && scrollRef.current) {
                            setLockedToolsWidth(scrollRef.current.offsetWidth);
                          } else {
                            setTimeout(() => setLockedToolsWidth(null), 300); // Wait for transition
                          }
                          setIsWidgetMenuOpen((prev: any) => !prev);
                        }} 
                        className={cn(
                          "toolbar-btn flex-shrink-0 flex items-center justify-center rounded-xl transition-all",
                          isWidgetMenuOpen ? "bg-cyan-600 text-white" : 
                          !widgetNoBorder ? "bg-slate-700 hover:bg-cyan-600 hover:text-white border border-slate-600/50" : "bg-transparent text-slate-400 hover:bg-white/10"
                        )}
                      >
                        <Settings size={20} />
                      </button>

                      <AnimatePresence mode="popLayout">
                        {isWidgetMenuOpen && (
                          <motion.div
                            key="widget-settings-menu"
                            initial={{ opacity: 0, y: menuDirection === 'down' ? -10 : 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className={cn(
                              "absolute right-0 w-72 border border-white/5 rounded-3xl overflow-hidden z-[160] flex flex-col bg-slate-900 shadow-none",
                              menuDirection === 'down' ? "top-full mt-3" : "bottom-full mb-3"
                            )}
                            style={{ 
                              maxHeight: widgetRef.current ? 
                                (menuDirection === 'up' 
                                  ? `${Math.max(200, widgetRef.current.getBoundingClientRect().top - 70)}px`
                                  : `${Math.max(200, window.innerHeight - widgetRef.current.getBoundingClientRect().bottom - 20)}px`) 
                                : '80vh' 
                            }}
                          >
                            <div className="p-4 border-b border-white/5 bg-slate-800/20 flex items-center justify-between shrink-0">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Zap size={16} className="text-cyan-400" /> {t('widgetSettings')}
                                </h3>
                                <button 
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => setLockedToolsWidth(null), 300);
                                    setIsWidgetMenuOpen(false);
                                  }} 
                                  className="p-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
                                >
                                  <X size={18} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar pb-8">
                              <div className="space-y-4">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('widgetOpacity')}</label>
                                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">{Math.round(widgetOpacity * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range" min="0.1" max="1" step="0.05" value={widgetOpacity}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setWidgetOpacity(val);
                                      localStorage.setItem('widget_opacity', val.toString());
                                    }}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 opacity-80 hover:opacity-100 transition-opacity"
                                  />
                                </div>

                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full transition-all duration-500", widgetNoBorder ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-slate-600")} />
                                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tight">{t('widgetNoBorder') || 'Без рамок'}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const next = !widgetNoBorder;
                                      setWidgetNoBorder(next);
                                      localStorage.setItem('widget_no_border', next.toString());
                                    }}
                                    className={cn(
                                      "w-9 h-5 rounded-full transition-all duration-300 relative",
                                      widgetNoBorder ? "bg-cyan-600" : "bg-slate-700"
                                    )}
                                  >
                                    <div className={cn(
                                      "absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300",
                                      widgetNoBorder ? "left-5" : "left-1"
                                    )} />
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">{t('widgetPos')}</label>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                      { id: 'bottom', label: lang === 'uk' ? 'ВНИЗУ' : 'BOTTOM' },
                                      { id: 'floating', label: lang === 'uk' ? 'ПЛАВАЮЧИЙ' : 'FLOAT' },
                                      { id: 'hidden', label: lang === 'uk' ? 'ВИМКН' : 'OFF' }
                                    ].map(pos => (
                                      <button
                                        key={pos.id}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          setWidgetPos(pos.id as any);
                                          localStorage.setItem('steem_widget_pos', pos.id);
                                        }}
                                        className={cn(
                                          "text-[9px] py-2 px-1 rounded-xl border transition-all duration-300 text-center font-bold tracking-tighter truncate",
                                          widgetPos === pos.id ? "bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-900/20" : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10"
                                        )}
                                      >
                                        {pos.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('activeToolsSort')}</label>
                                  <span className="text-[9px] text-slate-600 italic">Drag to sort</span>
                                </div>

                                <Reorder.Group 
                                  axis="y" 
                                  values={enabledTools} 
                                  onReorder={(newOrder) => {
                                    setEnabledTools(newOrder);
                                    localStorage.setItem('steem_enabled_tools', JSON.stringify(newOrder));
                                  }} 
                                  className="space-y-2"
                                >
                                  {enabledTools.map((key: string, idx: number) => (
                                    <Reorder.Item 
                                      key={key} 
                                      value={key}
                                      transition={{ duration: 0.1 }}
                                      dragListener={true}
                                      whileDrag={{ 
                                        scale: 1, 
                                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                                        borderColor: "rgba(6, 182, 212, 0.3)",
                                        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                                        zIndex: 200
                                      }}
                                      className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2.5 rounded-2xl cursor-grab active:cursor-grabbing hover:border-cyan-500/10 group relative"
                                    >
                                      <div className="flex items-center gap-3">
                                        <MoveVertical size={18} className="text-slate-600 group-hover:text-cyan-500 transition-colors" />
                                        <span className="text-[11px] font-bold text-slate-200">{TOOLS_MAP[key]?.label}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveTool(key, 'up');
                                          }}
                                          disabled={idx === 0}
                                          className="text-slate-500 hover:text-cyan-400 disabled:opacity-0 transition-all p-1"
                                        >
                                          <ChevronUp size={20} />
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveTool(key, 'down');
                                          }}
                                          disabled={idx === enabledTools.length - 1}
                                          className="text-slate-500 hover:text-cyan-400 disabled:opacity-0 transition-all p-1"
                                        >
                                          <ChevronDown size={20} />
                                        </button>
                                      </div>
                                    </Reorder.Item>
                                  ))}
                                </Reorder.Group>

                                <div className="grid grid-cols-4 gap-1.5 pt-2">
                                  {Object.keys(TOOLS_MAP).map(key => (
                                    <button
                                      key={`toggle-${key}`}
                                      onClick={() => toggleTool(key)}
                                      className={cn(
                                        "text-[9px] py-1.5 px-2 rounded-lg border text-center transition-all font-medium truncate",
                                        enabledTools.includes(key) 
                                          ? "bg-cyan-600/10 border-cyan-500/50 text-cyan-400" 
                                          : "bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700"
                                      )}
                                    >
                                      {key}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button 
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsWidgetVisible(false);
                      }} 
                      className={cn(
                        "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all lg:hidden",
                        !widgetNoBorder ? (performanceMode ? "bg-slate-700 hover:bg-red-600 hover:text-white border border-slate-600/50" : "bg-slate-700/50 hover:bg-red-600 hover:text-white border border-slate-600/50") : "bg-transparent text-slate-400 hover:bg-red-600/20 hover:text-red-400"
                      )}
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
    </>
  );
};
