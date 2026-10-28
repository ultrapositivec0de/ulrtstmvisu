import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCcw, Copy, Check, Download } from 'lucide-react';
import { useLightboxStore } from '../../store/lightboxStore';
import { useEditorStore } from '../../store';
import { getTranslation, TranslationKey } from '../../locales';

export const ImageLightboxModal: React.FC = () => {
  const { isOpen, imageSrc, imageAlt, closeLightbox } = useLightboxStore();
  const currentLang = useEditorStore((s) => s.currentLang) as any;
  const t = useCallback((key: TranslationKey) => getTranslation(currentLang || 'uk', key), [currentLang]);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchDistanceRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);

  // Reset transforms whenever a new image opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      setCopied(false);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, imageSrc]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeLightbox]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.35, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.35, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleCopyLink = async () => {
    if (!imageSrc) return;
    try {
      await navigator.clipboard.writeText(imageSrc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY * -0.0015;
    setScale((prev) => {
      const next = Math.min(Math.max(prev + delta, 0.5), 5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Dragging / Panning handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  // Double tap / double click to toggle zoom
  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (scale > 1) {
        handleResetZoom();
      } else {
        setScale(2.5);
      }
    }
    lastTapRef.current = now;
  };

  // Touch pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchDistanceRef.current;
      setScale((prev) => {
        const next = Math.min(Math.max(prev * ratio, 0.5), 5);
        if (next <= 1) setPosition({ x: 0, y: 0 });
        return next;
      });
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="image-lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[400] flex flex-col justify-between select-none"
        style={{
          backgroundColor: 'rgba(5, 10, 20, 0.94)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          overscrollBehavior: 'contain',
          touchAction: scale > 1 ? 'none' : 'pan-y',
        }}
        onClick={(e) => {
          if (e.target === containerRef.current || (e.target as HTMLElement).id === 'lightbox-backdrop') {
            closeLightbox();
          }
        }}
      >
        {/* Top Control Bar */}
        <div 
          className="w-full flex items-center justify-between px-3 sm:px-6 py-3 z-10 shrink-0 border-b border-white/10 bg-slate-950/70"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
        >
          {/* Left info */}
          <div className="flex items-center gap-2 max-w-[50%] min-w-0">
            <span className="text-xs font-semibold text-slate-300 truncate tracking-tight">
              {imageAlt || (imageSrc.split('/').pop()?.split('?')[0] || 'Image')}
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleZoomIn}
              title={t('lightboxZoomIn')}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-white/5 active:scale-95"
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title={t('lightboxZoomOut')}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-white/5 active:scale-95"
            >
              <ZoomOut size={18} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title={t('lightboxResetZoom')}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-white/5 active:scale-95"
            >
              <RotateCcw size={18} />
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              title={copied ? t('lightboxUrlCopied') : t('lightboxCopyUrl')}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-white/5 active:scale-95"
            >
              {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
            </button>
            <a
              href={imageSrc}
              download
              target="_blank"
              rel="noreferrer noopener"
              title="Download image"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-white/5 active:scale-95"
            >
              <Download size={18} />
            </a>
            <button
              type="button"
              onClick={closeLightbox}
              title={t('lightboxClose')}
              className="p-2 rounded-xl bg-red-600/80 hover:bg-red-500 text-white transition-colors cursor-pointer border border-white/10 active:scale-95 ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Central Viewport */}
        <div
          id="lightbox-backdrop"
          ref={containerRef}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative"
          style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-out' }}
        >
          <motion.img
            src={imageSrc}
            alt={imageAlt || 'Expanded Image'}
            draggable={false}
            onClick={handleDoubleTap}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              maxWidth: '92vw',
              maxHeight: '82vh',
              objectFit: 'contain',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            className="rounded-lg shadow-2xl pointer-events-auto"
          />
        </div>

        {/* Bottom Caption / Hint */}
        {imageAlt && (
          <div 
            className="w-full text-center py-2 px-4 bg-slate-950/70 border-t border-white/10 shrink-0 text-xs text-slate-300 tracking-wide font-medium"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            {imageAlt}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
