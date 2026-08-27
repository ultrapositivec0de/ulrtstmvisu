import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PanelLeftOpen,
  PanelLeftClose,
  Lock,
  LayoutGrid,
  List as ListIcon,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Rows,
  Columns,
  PanelLeft,
  PanelRight,
  Search,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ImageItem } from '../../types';
import { SecurityService } from '../../services/securityService';
import ImageItemComp from '../ImageItem';
import ExternalImageItem from '../ExternalImageItem';

export const TextWrapIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 6h18" />
    <path d="M3 12h15a3 3 0 1 1 0 6h-4" />
    <polyline points="16 16 14 18 16 20" />
    <path d="M3 18h7" />
  </svg>
);

export const ImageCaptionIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="18" height="10" x="3" y="3" rx="2" />
    <path d="M7 8h.01" />
    <path d="M3 17h18" />
    <path d="M3 21h12" />
  </svg>
);

export interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isGalleryCollapsed: boolean;
  setIsGalleryCollapsed: (collapsed: boolean) => void;
  getSidebarMotionConfig: () => any;
  // Auth and Vault
  username: string;
  vaultAccounts: string[];
  selectedVaultUser: string;
  imageUploadAccount: string;
  setImageUploadAccount: (acc: string) => void;
  // Gallery state
  galleryMode: 'local' | 'pexels' | 'pixabay' | 'unsplash';
  toggleGalleryMode: (mode: 'local' | 'pexels' | 'pixabay' | 'unsplash') => void;
  galleryView: 'grid' | 'list';
  setGalleryView: (view: 'grid' | 'list') => void;
  gallerySearch: string;
  setGallerySearch: (query: string) => void;
  filteredLocalImages: ImageItem[];
  images: ImageItem[];
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  toggleImageSelection: (index: number) => void;
  moveImageLocal: (filteredIdx: number, direction: -1 | 1) => void;
  insertImage: (url: string, name: string, position: 'left' | 'right' | 'center' | 'plain') => void;
  insertExternalImage: (photo: any, position: 'left' | 'right' | 'center' | 'plain') => void;
  uploadExternalImage: (url: string, fileName?: string) => Promise<void>;
  insertGrid: () => void;
  // External Search
  isSearchingPexels: boolean;
  pexelsResults: any[];
  setPexelsResults: React.Dispatch<React.SetStateAction<any[]>>;
  pexelsPage: number;
  handleExternalSearch: (query: string, page?: number) => void;
  pexelsApiKey: string | null;
  pixabayApiKey: string | null;
  unsplashAccessKey: string | null;
  isTrafficOptimized: boolean;
  setIsTrafficOptimized: (val: boolean) => void;
  performanceMode: boolean;
  setPerformanceMode?: (val: boolean) => void;
  pexelsSettings: any;
  setPexelsSettings: React.Dispatch<React.SetStateAction<any>>;
  // Layout & Formatting Options
  isGallerySettingsCollapsed: boolean;
  setIsGallerySettingsCollapsed: (collapsed: boolean) => void;
  gridLayout: 'col' | 'col-table' | 'row' | 'grid-2' | 'col-img-text' | 'col-text-img';
  setGridLayout: React.Dispatch<React.SetStateAction<'col' | 'col-table' | 'row' | 'grid-2' | 'col-img-text' | 'col-text-img'>>;
  gridWithCaptions: boolean;
  setGridWithCaptions: (captions: boolean) => void;
  singleCaptionAlign: 'left' | 'center' | 'right';
  setSingleCaptionAlign: (align: 'left' | 'center' | 'right') => void;
  isTextWrapEnabled: boolean;
  setIsTextWrapEnabled: (enabled: boolean) => void;
  isExifEnabled: boolean;
  setIsExifEnabled: (enabled: boolean) => void;
  imageInsertFormat: string;
  setImageInsertFormat: (format: any) => void;
  // Upload and parsing
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  sourceInput: string;
  setSourceInput: React.Dispatch<React.SetStateAction<string>>;
  parseImages: (input: string) => void;
  // Modal / Actions
  setActiveModal: (modal: any) => void;
  notify: (msg: string, type?: any) => void;
  t: (key: any) => string;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const {
    isSidebarOpen,
    isGalleryCollapsed,
    setIsGalleryCollapsed,
    getSidebarMotionConfig,
    username,
    vaultAccounts,
    selectedVaultUser,
    imageUploadAccount,
    setImageUploadAccount,
    galleryMode,
    toggleGalleryMode,
    galleryView,
    setGalleryView,
    gallerySearch,
    setGallerySearch,
    filteredLocalImages,
    images,
    setImages,
    toggleImageSelection,
    moveImageLocal,
    insertImage,
    insertExternalImage,
    uploadExternalImage,
    insertGrid,
    isSearchingPexels,
    pexelsResults,
    setPexelsResults,
    pexelsPage,
    handleExternalSearch,
    pexelsApiKey,
    pixabayApiKey,
    unsplashAccessKey,
    isTrafficOptimized,
    setIsTrafficOptimized,
    performanceMode,
    setPerformanceMode,
    pexelsSettings,
    setPexelsSettings,
    isGallerySettingsCollapsed,
    setIsGallerySettingsCollapsed,
    gridLayout,
    setGridLayout,
    gridWithCaptions,
    setGridWithCaptions,
    singleCaptionAlign,
    setSingleCaptionAlign,
    isTextWrapEnabled,
    setIsTextWrapEnabled,
    isExifEnabled,
    setIsExifEnabled,
    imageInsertFormat,
    setImageInsertFormat,
    isUploading,
    fileInputRef,
    sourceInput,
    setSourceInput,
    parseImages,
    setActiveModal,
    notify,
    t
  } = props;

  return (
    <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside 
              {...getSidebarMotionConfig()}
              className={cn(
                "border-r border-slate-800 bg-slate-900 flex flex-col z-30 absolute lg:relative h-full pb-16 lg:pb-0 shadow-2xl lg:shadow-none transition-all duration-300 overflow-visible",
                isGalleryCollapsed ? "w-16" : "w-[clamp(20rem,25vw,30rem)]"
              )}
            >
              <div className="flex flex-col flex-1 overflow-hidden custom-scrollbar">
                <section className={cn("flex flex-col flex-1 min-h-0 overflow-hidden py-2", isGalleryCollapsed ? "px-1" : "px-4")}>
                  <div className={cn("flex items-center mb-3 shrink-0", isGalleryCollapsed ? "justify-center" : "justify-between")}>
                    {!isGalleryCollapsed && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('gallery')}</span>}
                    <button 
                      onClick={() => setIsGalleryCollapsed(!isGalleryCollapsed)}
                      className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title={isGalleryCollapsed ? t('expandGallery') : t('collapseGallery')}
                    >
                      {isGalleryCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                  </div>

                  {!isGalleryCollapsed && (
                    <>
                      <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2 shrink-0 overflow-x-auto no-scrollbar">
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggleGalleryMode('local')}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0",
                        galleryMode === 'local' ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      {t('gallery')}
                    </button>
                    <div className="w-px h-3 bg-slate-800 shrink-0" />
                    {[
                      { id: 'pexels', label: 'Pexels', key: pexelsApiKey },
                      { id: 'pixabay', label: 'Pixabay', key: pixabayApiKey },
                      { id: 'unsplash', label: 'Unsplash', key: unsplashAccessKey }
                    ].map(srv => (
                      <button 
                        key={srv.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => toggleGalleryMode(srv.id as any)}
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 shrink-0",
                          galleryMode === srv.id ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {srv.label}
                        {!srv.key && <Lock size={8} className="text-slate-600" />}
                      </button>
                    ))}
                    <div className="flex-1" />
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setGalleryView('grid')} 
                        className={cn("p-1 rounded", galleryView === 'grid' ? "text-cyan-400 bg-cyan-400/10" : "text-slate-600")}
                      >
                        <LayoutGrid size={14} />
                      </button>
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setGalleryView('list')} 
                        className={cn("p-1 rounded", galleryView === 'list' ? "text-cyan-400 bg-cyan-400/10" : "text-slate-600")}
                      >
                        <ListIcon size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 shrink-0">
                    {isGallerySettingsCollapsed && (
                      <div 
                        onClick={() => setIsGallerySettingsCollapsed(false)}
                        className="flex items-center justify-between mb-0.5 cursor-pointer group"
                      >
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none group-hover:text-cyan-400 transition-colors">{t('editorTools') || "Tools"}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsGallerySettingsCollapsed(false);
                          }}
                          className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-slate-500 transition-all"
                          title={t('settings')}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    )}
                  
                    <AnimatePresence>
                      {!isGallerySettingsCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="md:max-h-none overflow-y-auto custom-scrollbar pr-1 pb-1">
                            {galleryMode === 'local' ? (
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <button 
                                    onClick={() => {
                                      fileInputRef.current?.click();
                                      // if (window.innerWidth < 1024) setIsWidgetVisible(false); // Kept visible as requested
                                    }}
                                    disabled={isUploading}
                                    className="px-3 py-1.5 flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 border border-cyan-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0"
                                    title={t('insert')}
                                  >
                                    {isUploading ? (
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : <ImageIcon size={16} />}
                                    <span className="truncate">{t('insert')}</span>
                                  </button>

                                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                    <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                      <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'html' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>HTML</button>
                                      <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>MD</button>
                                    </div>
                                    <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                      <button onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))} className={cn("px-2 py-0.5 text-[8px] font-bold rounded uppercase transition-all", pexelsSettings.linkEmbedded ? "bg-slate-700 text-blue-400" : "text-slate-600 hover:text-slate-400")} title={t('linkInImg')}>LINK</button>
                                    </div>
                                    <button 
                                      onClick={() => setIsGallerySettingsCollapsed(true)}
                                      className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-cyan-400 transition-all ml-1 shrink-0"
                                      title={t('settings')}
                                    >
                                      <ChevronUp size={16} />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {(vaultAccounts.length > 0 || !(typeof window !== 'undefined' && (window as any).steem_keychain)) && (
                                    <div className="col-span-2 sm:col-span-3 flex items-center gap-2 p-1.5 bg-slate-800/80 rounded-xl border border-slate-700/80 shadow-sm">
                                      {vaultAccounts.length > 0 ? (
                                        <select 
                                          value={imageUploadAccount || ((typeof window !== 'undefined' && (window as any).steem_keychain) ? '' : (selectedVaultUser || vaultAccounts[0]))}
                                          onChange={(e) => setImageUploadAccount(e.target.value)}
                                          className="flex-1 bg-slate-900 text-[10px] text-cyan-400 font-bold outline-none cursor-pointer truncate px-2.5 py-1.5 rounded-lg border border-slate-700/80 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                          style={{ colorScheme: 'dark' }}
                                        >
                                          {(typeof window !== 'undefined' && (window as any).steem_keychain) && (
                                            <option value="" className="bg-slate-900 text-slate-300 py-1">
                                              🛡️ {username ? `@${username} (Keychain)` : '@keychain (default)'}
                                            </option>
                                          )}
                                          {vaultAccounts.map(acc => (
                                            <option key={acc} value={acc} className="bg-slate-900 text-slate-200 py-1">
                                              🔑 @{acc} (Vault) {!SecurityService.isLocked() ? '✓' : '🔒'}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <button 
                                          onClick={() => setActiveModal('keys')}
                                          className="flex-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg py-1.5 px-2.5 flex items-center justify-center gap-1.5 transition-all"
                                        >
                                          <Lock size={12} />
                                          <span>{t('addVaultKeyForUpload')}</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                  <p className="text-[8px] text-slate-500 truncate">
                                    {galleryMode === 'pexels' ? t('pexelsSearch') : 
                                    `Search ${galleryMode === 'unsplash' ? 'Unsplash' : 'Pixabay'}`}
                                  </p>
                                </div>
                                {pexelsResults.length > 0 && (
                                  <button 
                                    onClick={() => {
                                      setPexelsResults([]);
                                      notify(t('cacheCleared'));
                                    }}
                                    className="px-2 py-1.5 bg-slate-800/50 hover:bg-red-900/30 text-red-400 border border-red-900/20 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center shrink-0"
                                    title={t('clearCache')}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                <div className="flex items-center gap-1.5 shrink-0 ml-auto mr-0.5">
                                  <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                    <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'html' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>HTML</button>
                                    <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>MD</button>
                                  </div>
                                  <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                    <button onClick={() => setPexelsSettings((prev: any) => ({ ...prev, withAttribution: !prev.withAttribution }))} className={cn("px-1.5 py-0.5 text-[8px] font-bold rounded uppercase transition-all", pexelsSettings.withAttribution ? "bg-slate-700 text-green-400" : "text-slate-600 hover:text-slate-400")} title={t('attribution')}>ATTR</button>
                                    <button onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))} className={cn("px-1.5 py-0.5 text-[8px] font-bold rounded uppercase transition-all", pexelsSettings.linkEmbedded ? "bg-slate-700 text-blue-400" : "text-slate-600 hover:text-slate-400")} title={t('linkInImg')}>LINK</button>
                                  </div>
                                  <button 
                                    onClick={() => setIsGallerySettingsCollapsed(true)}
                                    className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-cyan-400 transition-all ml-1 shrink-0"
                                    title={t('settings')}
                                  >
                                    <ChevronUp size={16} />
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1.5 shrink-0">
                                  <button
                                    title={t('performanceDesc') || 'Вимикає деякі анімації'}
                                    onClick={() => {
                                      const next = !performanceMode;
                                      setPerformanceMode?.(next);
                                      localStorage.setItem('steem_performance_mode', next.toString());
                                    }}
                                    className={cn("flex justify-between items-center px-1.5 py-1 rounded border", performanceMode ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500")}
                                  >
                                    <span className="text-[9px] font-bold uppercase truncate">{t('performanceMode') || 'Perf'}</span>
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", performanceMode ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700")} />
                                  </button>

                                  <button
                                    onClick={() => {
                                      const newState = !isTrafficOptimized;
                                      setIsTrafficOptimized(newState);
                                      localStorage.setItem('steem_traffic_optimized', newState.toString());
                                    }}
                                    className={cn("flex justify-between items-center px-1.5 py-1 rounded border", isTrafficOptimized ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500")}
                                  >
                                    <span className="text-[9px] font-bold uppercase truncate">{t('trafficOptimization')?.substring(0, 6) || "Optim"}</span>
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isTrafficOptimized ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700")} />
                                  </button>

                                  <button
                                    onClick={() => {
                                      const newState = !isExifEnabled;
                                      setIsExifEnabled(newState);
                                      localStorage.setItem('steem_exif_enabled', newState.toString());
                                    }}
                                    className={cn("flex justify-between items-center px-1.5 py-1 rounded border", isExifEnabled ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500")}
                                  >
                                    <span className="text-[9px] font-bold uppercase truncate">{t('exifEnabled') || "EXIF"}</span>
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isExifEnabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700")} />
                                  </button>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-1.5 mb-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800/50 shrink-0 select-none">
                              <div className="flex items-center gap-1.5 w-full">
                                <button
                                  onClick={() => setIsTextWrapEnabled(!isTextWrapEnabled)}
                                  className={cn("flex items-center justify-center px-2 py-1.5 rounded-lg border transition-colors flex-1 min-w-0", isTextWrapEnabled ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300")}
                                  title={t('textWrap')}
                                >
                                  <TextWrapIcon size={15} className="shrink-0" />
                                </button>

                                <button
                                  onClick={() => setGridWithCaptions(!gridWithCaptions)}
                                  className={cn("flex items-center justify-center px-2 py-1.5 rounded-lg border transition-colors flex-1 min-w-0", gridWithCaptions ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300")}
                                  title={t('addCaption') || "Add Caption"}
                                >
                                  <ImageCaptionIcon size={15} className="shrink-0" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-1.5 w-full">
                                <div className="flex bg-slate-950/50 rounded-lg p-0.5 border border-slate-800/50 hover:border-slate-700/50 transition-colors shrink-0">
                                  {(['left', 'center', 'right'] as const).map(p => (
                                    <button
                                      key={p}
                                      onClick={() => setSingleCaptionAlign(p)}
                                      className={cn(
                                        "p-1.5 rounded transition-all", 
                                        singleCaptionAlign === p ? "bg-cyan-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300 active:scale-95"
                                      )}
                                    >
                                      {p === 'left' ? <AlignLeft size={15} /> : p === 'center' ? <AlignCenter size={15} /> : <AlignRight size={15} />}
                                    </button>
                                  ))}
                                </div>
                                <button 
                                  onClick={() => {
                                    insertGrid();
                                    // if (window.innerWidth < 1024) setIsWidgetVisible(false); // Kept visible as requested
                                  }}
                                  disabled={galleryMode === 'local' ? images.filter(i => i.selected).length === 0 : pexelsResults.filter(p => p.selected).length === 0}
                                  className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-cyan-900 disabled:opacity-50 border border-slate-700 hover:border-cyan-700 text-cyan-400 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 min-w-0"
                                  title={t('createGrid')}
                                >
                                  <LayoutGrid size={12} className="shrink-0" /> ({galleryMode === 'local' ? images.filter(i => i.selected).length : pexelsResults.filter(p => p.selected).length})
                                </button>
                              </div>

                              <div className="flex justify-between sm:justify-center bg-slate-950/50 rounded-lg p-0.5 border border-slate-800/50 hover:border-slate-700/50 transition-colors w-full overflow-x-auto no-scrollbar gap-0.5">
                                  {(['col', 'col-table', 'grid-2', 'row', 'col-img-text', 'col-text-img'] as const).map(l => (
                                    <button
                                      key={l}
                                      onClick={() => setGridLayout(l)}
                                      className={cn(
                                        "p-1.5 shrink-0 rounded transition-all flex-1 sm:flex-none flex justify-center", 
                                        gridLayout === l ? "bg-cyan-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300 active:scale-95"
                                      )}
                                      title={l === 'col' ? 'В стовпчик (не таблиця)' : l === 'col-table' ? 'Стовпчик в таблиці (зверху вниз)' : l === 'grid-2' ? 'Плитка (2x2)' : l === 'row' ? 'В один рядок (таблиця)' : l === 'col-img-text' ? 'Текст праворуч' : 'Текст ліворуч'}
                                    >
                                      {l === 'col' ? <ListIcon size={15} /> : l === 'col-table' ? <Rows size={15} /> : l === 'grid-2' ? <LayoutGrid size={15} /> : l === 'row' ? <Columns size={15} /> : l === 'col-img-text' ? <PanelLeft size={15} /> : <PanelRight size={15} />}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative mb-2 shrink-0">
                    <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      placeholder={
                        galleryMode === 'local' ? t('gallery') + "..." : 
                        galleryMode === 'pexels' ? t('pexelsSearch') + " (Enter)..." : 
                        `Search ${galleryMode === 'unsplash' ? 'Unsplash' : 'Pixabay'} (Enter)...`
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1 pl-7 pr-2 text-[10px] outline-none focus:ring-1 focus:ring-cyan-500"
                      value={gallerySearch}
                      onChange={e => setGallerySearch(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && galleryMode !== 'local') {
                          handleExternalSearch(gallerySearch);
                        }
                      }}
                    />
                    {galleryMode !== 'local' && isSearchingPexels && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="w-2.5 h-2.5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  </>
                  )}

                  <div className={cn(
                    "overflow-y-auto custom-scrollbar flex-1 min-h-0 px-1 mt-1",
                    !isGalleryCollapsed && galleryView === 'grid' ? "grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] auto-rows-min gap-3 content-start" : "flex flex-col gap-2"
                  )}>
                    {galleryMode === 'local' ? (
                      filteredLocalImages.map((img: ImageItem, idx: number) => (
                          <ImageItemComp
                            key={img.url + idx}
                            img={img}
                            idx={idx}
                            galleryView={galleryView}
                            isTrafficOptimized={isTrafficOptimized}
                            onToggle={toggleImageSelection}
                            onInsert={(url: any, name: any, pos?: any) => {
                              insertImage(url, name, pos);
                              // if (window.innerWidth < 1024) setIsWidgetVisible(false); // Kept visible as requested
                            }}
                            onHost={uploadExternalImage}
                            onDelete={(i: any) => {
                              const url = filteredLocalImages[i]?.url;
                              if (url) setImages(prev => prev.filter(x => x.url !== url));
                            }}
                            onMoveLeft={idx > 0 ? (i: any) => moveImageLocal(i, -1) : undefined}
                            onMoveRight={idx < filteredLocalImages.length - 1 ? (i: any) => moveImageLocal(i, 1) : undefined}
                            t={t}
                            isCollapsed={isGalleryCollapsed}
                          />
                        ))
                    ) : (
                      pexelsResults.length > 0 ? (
                        pexelsResults.map((photo: any, idx: number) => (
                          <ExternalImageItem
                            key={photo.id + '-' + (photo.source || 'ext') + '-' + idx}
                            photo={photo}
                            idx={idx}
                            galleryView={galleryView}
                            onToggle={(i: any) => setPexelsResults(prev => prev.map((p, j) => i === j ? { ...p, selected: !p.selected } : p))}
                            onInsert={(photo: any, pos?: any) => {
                              insertExternalImage(photo, pos);
                              // if (window.innerWidth < 1024) setIsWidgetVisible(false); // Kept visible as requested
                            }}
                            t={t}
                            isCollapsed={isGalleryCollapsed}
                          />
                        ))
                      ) : (
                        <div className={cn("flex flex-col items-center justify-center h-40 text-slate-600 gap-2", isGalleryCollapsed && "hidden")}>
                          <Search size={24} />
                          <p className="text-[10px] text-center">
                            {t('pexelsSearch')}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                  
                  {galleryMode !== 'local' && pexelsResults.length > 0 && !isSearchingPexels && !isGalleryCollapsed && (
                    <div className="mt-2 flex justify-center">
                      <button 
                        onClick={() => handleExternalSearch(gallerySearch, pexelsPage + 1)}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded-full transition-colors"
                      >
                        {t('loadMore')}
                      </button>
                    </div>
                  )}

                  {!isGalleryCollapsed && (
                  <div className="mt-2 shrink-0 border-t border-slate-800 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('links')}</span>
                      {(sourceInput || images.length > 0) && (
                        <button 
                          onClick={() => { setSourceInput(''); setImages([]); }}
                          className="text-[9px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={8} /> {t('clear')}
                        </button>
                      )}
                    </div>
                    <textarea 
                      className="w-full h-16 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-[9px] focus:ring-1 focus:ring-cyan-500 outline-none resize-none custom-scrollbar"
                      placeholder={t('pasteUrl')}
                      value={sourceInput}
                      onChange={e => parseImages(e.target.value)}
                    />
                  </div>
                  )}
                </section>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
  );
};
