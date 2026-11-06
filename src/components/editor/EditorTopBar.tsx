import React from 'react';
import { cn } from '../../lib/utils';
import { 
  Eye, Terminal, BookOpen, Minimize2, Maximize2, RefreshCw, EyeOff, Sparkles, Type, 
  MoveVertical, X, ListTree, FolderOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioControlWidget } from '../audio/AudioControlWidget';

export interface EditorTopBarProps {
  editorMode: 'visual' | 'markdown' | 'reading';
  handleSetEditorMode: (mode: 'visual' | 'markdown' | 'reading') => void;
  isTOCOpen: boolean;
  setIsTOCOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSourceDrawerOpen: boolean;
  setIsSourceDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEditorFullScreen: boolean;
  toggleEditorFullScreen: () => void;
  onDemandSyncEnabled: boolean;
  setOnDemandSyncEnabled: (val: boolean) => void;
  isLivePreviewEnabled: boolean;
  toggleLivePreview: () => void;
  beautifyEnabled: boolean;
  setBeautifyEnabled: (val: boolean) => void;
  neonTextColored: boolean;
  setNeonTextColored: (val: boolean) => void;
  typingSound?: any;
  onOpenAudioPresetsModal?: () => void;
  isSpacingMenuOpen: boolean;
  setIsSpacingMenuOpen: (val: boolean) => void;
  wysiwygSpacing: number;
  setWysiwygSpacing: (val: number) => void;
  editorFontSize: number;
  setEditorFontSize: (val: number) => void;
  toolbarIconSize: number;
  setToolbarIconSize: (val: number) => void;
  visualStyle: string;
  isDarkMode: boolean;
  notify: (msg: string, type?: any) => void;
  t: (key: any) => string;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  editorMode,
  handleSetEditorMode,
  isTOCOpen,
  setIsTOCOpen,
  isSourceDrawerOpen,
  setIsSourceDrawerOpen,
  isEditorFullScreen,
  toggleEditorFullScreen,
  onDemandSyncEnabled,
  setOnDemandSyncEnabled,
  isLivePreviewEnabled,
  toggleLivePreview,
  beautifyEnabled,
  setBeautifyEnabled,
  neonTextColored,
  setNeonTextColored,
  typingSound,
  onOpenAudioPresetsModal,
  isSpacingMenuOpen,
  setIsSpacingMenuOpen,
  wysiwygSpacing,
  setWysiwygSpacing,
  editorFontSize,
  setEditorFontSize,
  toolbarIconSize,
  setToolbarIconSize,
  visualStyle,
  isDarkMode,
  notify,
  t,
}) => {
  return (
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
            onClick={() => handleSetEditorMode('reading')}
            className={cn(
              "px-3 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors flex items-center gap-1.5",
              editorMode === 'reading' 
                ? "bg-cyan-600 text-white shadow-sm" 
                : (isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-900")
            )}
            title={t('modeReadingSwitchTitle')}
          >
            <BookOpen size={12} />
            <span className={cn(
              isLivePreviewEnabled ? "hidden xl:inline" : "hidden sm:inline"
            )}>
              {t('modeReading')}
            </span>
          </button>

          {/* Reader Specific Navigation & Source Buttons */}
          {editorMode === 'reading' && (
            <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-700/60">
              <button
                data-drawer-trigger="toc"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsTOCOpen(prev => !prev)}
                className={cn(
                  "px-2 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors flex items-center gap-1 border",
                  isTOCOpen 
                    ? "bg-cyan-600 text-white border-cyan-500 shadow-sm" 
                    : (isDarkMode || visualStyle === 'neon' 
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800" 
                        : "bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100")
                )}
                title={t('docReaderTocTitle')}
              >
                <ListTree size={12} className={isTOCOpen ? "text-white" : "text-cyan-400"} />
                <span className="hidden sm:inline">{t('docReaderTocButton')}</span>
              </button>
              <button
                data-drawer-trigger="source"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsSourceDrawerOpen(prev => !prev)}
                className={cn(
                  "px-2 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors flex items-center gap-1 border",
                  isSourceDrawerOpen 
                    ? "bg-cyan-600 text-white border-cyan-500 shadow-sm" 
                    : (isDarkMode || visualStyle === 'neon' 
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800" 
                        : "bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100")
                )}
                title={t('docReaderSourceTitle')}
              >
                <FolderOpen size={12} className={isSourceDrawerOpen ? "text-white" : "text-cyan-400"} />
                <span className="hidden sm:inline">{t('docReaderSourceButton')}</span>
              </button>
            </div>
          )}
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
                 ? t('syncOnDemandNotifyOn')
                 : t('syncOnDemandNotifyOff'), 
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
            {t('preview')}
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
                ? t('beautifyNotifyOn')
                : t('beautifyNotifyOff'),
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
                  ? t('neonTextNotifyOn')
                  : t('neonTextNotifyOff'), 
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

        {/* Audio Typing Synth Widget */}
        {typingSound && onOpenAudioPresetsModal && (
          <AudioControlWidget
            sound={typingSound}
            onOpenPresetsModal={onOpenAudioPresetsModal}
            visualStyle={visualStyle}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Visual Spacing and Icon Size Popover */}
        <div className="relative">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const nextOpen = !isSpacingMenuOpen;
              if (nextOpen && typeof document !== 'undefined') {
                const activeEl = document.activeElement as HTMLElement | null;
                if (activeEl && (activeEl.id === 'main-editor' || activeEl.classList.contains('wysiwyg-editor') || activeEl.isContentEditable)) {
                  activeEl.blur();
                }
              }
              setIsSpacingMenuOpen(nextOpen);
            }}
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
              <React.Fragment key="spacing-menu-wrapper">
                {/* Overlay click-away handler */}
                <div 
                  key="spacing-backdrop"
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsSpacingMenuOpen(false)} 
                />
                <motion.div
                  key="spacing-popover-content"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "fixed left-2 right-2 top-[calc(var(--header-height,3.5rem)+4.75rem+env(safe-area-inset-top,0px))] mx-auto w-auto max-w-[calc(100vw-1rem)] sm:mx-0 sm:left-auto sm:right-0 sm:absolute sm:top-full sm:mt-2 sm:w-64 rounded-xl border p-4 shadow-xl z-50 flex flex-col gap-4 select-none",
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
                          {t('beautify')}
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
              </React.Fragment>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
