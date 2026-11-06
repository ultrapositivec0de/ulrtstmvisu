import React, { useState } from 'react';
import { Images, Plus, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { getMiniGalleryBottomStyle } from '../../lib/viewportLayout';

export interface MiniGalleryStripProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<any>;
  onInsertImage: (url: string, name: string) => void;
  onUploadMore?: () => void;
  isMobileLayout: boolean;
  isSidebarOpen: boolean;
  isKeyboardOpen: boolean;
  keyboardOffset?: number | null;
  isFullScreen: boolean;
  isEditorFullScreen: boolean;
  widgetPos: 'bottom' | 'floating' | 'hidden';
  activeModal: string | null;
  editorMode: string;
  t: (key: any) => string;
}

export const MiniGalleryStrip: React.FC<MiniGalleryStripProps> = React.memo(({
  isOpen,
  onClose,
  images,
  onInsertImage,
  onUploadMore,
  isMobileLayout,
  isSidebarOpen,
  isKeyboardOpen,
  keyboardOffset = 0,
  isFullScreen,
  isEditorFullScreen,
  widgetPos,
  activeModal,
  editorMode,
  t,
}) => {
  const [justInsertedUrl, setJustInsertedUrl] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {isOpen && images.length > 0 && !activeModal && editorMode !== 'reading' && (
        <motion.div
          key="mini-gallery-strip"
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{
            bottom: getMiniGalleryBottomStyle({
              isMobile: isMobileLayout,
              isKeyboardOpen,
              keyboardOffset: keyboardOffset || 0,
              isFullScreen,
              isEditorFullScreen,
              widgetPos,
            }),
            touchAction: 'none',
          }}
          className={cn(
            "z-[155] p-2 flex-col gap-1.5 bg-[var(--bg-overlay-surface)] backdrop-blur-dynamic border border-cyan-500/30 rounded-2xl shadow-2xl transition-all select-none overscroll-contain",
            "fixed left-3 right-3 max-w-lg mx-auto lg:absolute lg:left-4 lg:right-4 lg:max-w-2xl bottom-4",
            (isSidebarOpen && isMobileLayout) ? "hidden" : "flex"
          )}
        >
          <div className="flex items-center justify-between px-1 select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Images size={14} />
                {t('miniGallery')} ({images.length})
              </span>
              <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
                • {t('tapToInsert')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onUploadMore && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onUploadMore}
                  className="px-2 py-0.5 text-[10px] font-bold bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-md flex items-center gap-1 transition-colors"
                  title={t('miniGalleryUploadMoreTitle')}
                >
                  <Plus size={12} />
                  <span>+</span>
                </button>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onClose}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md hover:bg-slate-800/40 dark:hover:bg-slate-800 transition-colors"
                title={t('close')}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div 
            className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth overscroll-contain select-none"
            style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }}
          >
            {images.filter(img => Boolean(img && (img.url || img.name))).map((img, idx) => (
              <button
                key={img.url || (img as any).id || `img-${idx}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  onInsertImage(img.url, img.name);
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
  );
});

MiniGalleryStrip.displayName = 'MiniGalleryStrip';
export default MiniGalleryStrip;
