import React, { useRef, useState } from 'react';
import { Images, Plus, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { getMiniGalleryBottomStyle } from '../../lib/viewportLayout';
import { usePerformanceStore } from '../../stores/usePerformanceStore';
import { useCachedImageUrl } from '../../hooks/useCachedImageUrl';

const MiniGalleryThumb: React.FC<{ url: string; alt: string }> = ({ url, alt }) => {
  const src = useCachedImageUrl(url, url);
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity pointer-events-none select-none"
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
};

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const didDragRef = useRef(false);

  const validImages = images.filter(img => Boolean(img && (img.url || img.name)));

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

          <div className="flex items-center gap-1 min-w-0">
            {validImages.length > 4 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const { performanceMode, lowGpuMode } = usePerformanceStore.getState();
                  scrollRef.current?.scrollBy({ left: -180, behavior: (performanceMode || lowGpuMode) ? 'auto' : 'smooth' });
                }}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-cyan-400 hover:bg-slate-800/40 transition-colors shrink-0"
                title={t('moveLeft')}
                aria-label={t('moveLeft')}
              >
                <ChevronLeft size={16} />
              </button>
            )}

            <div
              ref={scrollRef}
              onWheel={(e) => {
                const el = scrollRef.current;
                if (!el) return;
                if (Math.abs(e.deltaY) >= Math.abs(e.deltaX) && e.deltaY !== 0) {
                  e.preventDefault();
                  el.scrollLeft += e.deltaY;
                }
              }}
              onMouseDown={(e) => {
                if (e.button !== 0 || !scrollRef.current) return;
                e.preventDefault();
                isDraggingRef.current = true;
                didDragRef.current = false;
                dragStartXRef.current = e.clientX;
                dragStartScrollLeftRef.current = scrollRef.current.scrollLeft;
              }}
              onMouseMove={(e) => {
                if (!isDraggingRef.current || !scrollRef.current) return;
                const dx = e.clientX - dragStartXRef.current;
                if (Math.abs(dx) > 4) {
                  didDragRef.current = true;
                }
                if (didDragRef.current) {
                  scrollRef.current.scrollLeft = dragStartScrollLeftRef.current - dx;
                }
              }}
              onMouseUp={() => {
                isDraggingRef.current = false;
                setTimeout(() => {
                  didDragRef.current = false;
                }, 0);
              }}
              onMouseLeave={() => {
                isDraggingRef.current = false;
                setTimeout(() => {
                  didDragRef.current = false;
                }, 0);
              }}
              className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar overscroll-contain select-none touch-pan-x cursor-grab active:cursor-grabbing"
              style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }}
            >
              {validImages.map((img, idx) => (
                <button
                  key={img.url || (img as any).id || `img-${idx}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    if (didDragRef.current) {
                      didDragRef.current = false;
                      e.preventDefault();
                      return;
                    }
                    e.preventDefault();
                    onInsertImage(img.url, img.name);
                    setJustInsertedUrl(img.url);
                    setTimeout(() => setJustInsertedUrl(null), 1200);
                  }}
                  style={{ touchAction: 'pan-x' }}
                  className={cn(
                    "group relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border transition-all active:scale-95 focus:outline-none touch-pan-x",
                    justInsertedUrl === img.url 
                      ? "border-emerald-400 ring-2 ring-emerald-400/50 scale-105" 
                      : "border-slate-700 hover:border-cyan-400"
                  )}
                  title={`${img.name} - ${t('tapToInsert')}`}
                >
                  <MiniGalleryThumb url={img.url} alt={img.name} />
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

            {validImages.length > 4 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const { performanceMode, lowGpuMode } = usePerformanceStore.getState();
                  scrollRef.current?.scrollBy({ left: 180, behavior: (performanceMode || lowGpuMode) ? 'auto' : 'smooth' });
                }}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-cyan-400 hover:bg-slate-800/40 transition-colors shrink-0"
                title={t('moveRight')}
                aria-label={t('moveRight')}
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

MiniGalleryStrip.displayName = 'MiniGalleryStrip';
export default MiniGalleryStrip;
