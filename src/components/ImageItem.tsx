import React, { useState } from 'react';
import { AlignLeft, AlignRight, FileText, CloudUpload, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, Copy } from 'lucide-react';
import { cn } from '../lib/utils';
import { ImageItem as ImageItemType } from '../types';
import { getCanonicalImageUrl, copyTextWithFallback } from '../utils/postFormatting';
import { useCachedImageUrl } from '../hooks/useCachedImageUrl';

interface ImageItemProps {
  img: ImageItemType;
  idx: number;
  galleryView: 'grid' | 'list';
  isTrafficOptimized: boolean;
  onToggle: (idx: number) => void;
  onInsert: (url: string, name: string, pos: 'left' | 'plain' | 'right') => void;
  onHost: (url: string, name: string) => void;
  onDelete: (idx: number) => void;
  onMoveLeft?: (idx: number) => void;
  onMoveRight?: (idx: number) => void;
  t: (key: any) => string;
  isCollapsed?: boolean;
}

const ImageItem = React.memo(({ 
  img, 
  idx, 
  galleryView, 
  isTrafficOptimized,
  onToggle, 
  onInsert, 
  onHost, 
  onDelete,
  onMoveLeft,
  onMoveRight, 
  t,
  isCollapsed
}: ImageItemProps) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const canonicalUrl = getCanonicalImageUrl(img.url);
  const remoteFallbackUrl = isTrafficOptimized && img.url.startsWith('http')
    ? `https://steemitimages.com/${galleryView === 'grid' ? '640x0' : '128x128'}/${img.url}`
    : img.url;
  const displayUrl = useCachedImageUrl(canonicalUrl, remoteFallbackUrl);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyTextWithFallback(canonicalUrl);
    if (ok) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    }
  };

  if (isCollapsed) {
    return (
      <div 
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          "relative rounded-lg overflow-hidden border border-[var(--border-color)] hover:border-cyan-500 hover:ring-1 hover:ring-cyan-500/50 transition-all cursor-pointer bg-[var(--bg-card)] shadow-sm flex-none aspect-square w-full"
        )}
        onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'plain'); }}
        title={t('asIs')}
      >
        <img 
          src={displayUrl} 
          alt={img.name} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer" 
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div 
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        "group relative rounded-lg overflow-hidden border transition-all cursor-pointer bg-[var(--bg-card)] shadow-sm flex-none",
        galleryView === 'grid' ? "flex flex-col w-full min-h-[140px]" : "flex flex-row items-center p-1.5 gap-2 min-h-[50px]",
        img.selected
          ? "border-cyan-500 ring-2 ring-cyan-500/40 shadow-md shadow-cyan-500/15"
          : "border-[var(--border-color)] hover:border-slate-400 dark:hover:border-slate-700"
      )}
      onClick={() => onToggle(idx)}
    >
      {galleryView === 'list' && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(idx);
          }}
          className={cn(
            "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
            img.selected
              ? "bg-cyan-500 border-cyan-400 text-white"
              : "bg-[var(--bg-main)] border-slate-600 text-transparent group-hover:border-cyan-500/60"
          )}
          aria-pressed={!!img.selected}
        >
          <Check size={11} className="stroke-[3]" />
        </button>
      )}
      <div className={cn(
        "overflow-hidden relative flex-none bg-[var(--bg-main)]",
        galleryView === 'grid' ? "aspect-square w-full" : "w-10 h-10 rounded"
      )}>
        <img 
          src={displayUrl} 
          alt={img.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          referrerPolicy="no-referrer" 
          loading="lazy"
        />

        {galleryView === 'grid' && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(idx);
            }}
            className={cn(
              "absolute top-1.5 left-1.5 z-20 w-5 h-5 rounded-md border flex items-center justify-center transition-all shadow-sm",
              img.selected
                ? "bg-cyan-500 border-cyan-300 text-white opacity-100 scale-100"
                : "bg-slate-950/75 border-slate-500/80 text-transparent opacity-80 lg:opacity-0 lg:group-hover:opacity-100 hover:border-cyan-400"
            )}
            aria-pressed={!!img.selected}
          >
            <Check size={12} className="stroke-[3]" />
          </button>
        )}
        
        {galleryView === 'grid' && (
          <div className={cn(
            "absolute inset-x-0 bottom-0 bg-[var(--bg-overlay-surface)] backdrop-blur-dynamic border-t border-[var(--border-subtle)] px-1 py-1.5 flex flex-row items-center justify-center gap-1 transition-all z-10",
            "lg:opacity-0 lg:group-hover:opacity-100"
          )}>
            <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'left'); }} className="p-1.5 bg-slate-800/80 dark:bg-slate-800 rounded flex-1 hover:bg-cyan-600 hover:text-white outline-none text-slate-100 dark:text-white transition-colors flex justify-center items-center shadow-xs" title={t('leftText')}>
              <AlignLeft className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.8)', height: 'calc(var(--gallery-icon-size, 16px) * 0.8)' }} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'plain'); }} className="p-1.5 bg-slate-800/80 dark:bg-slate-800 rounded flex-1 hover:bg-cyan-600 hover:text-white outline-none text-slate-100 dark:text-white transition-colors flex justify-center items-center shadow-xs" title={t('asIs')}>
              <FileText className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.8)', height: 'calc(var(--gallery-icon-size, 16px) * 0.8)' }} />
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'right'); }} className="p-1.5 bg-slate-800/80 dark:bg-slate-800 rounded flex-1 hover:bg-cyan-600 hover:text-white outline-none text-slate-100 dark:text-white transition-colors flex justify-center items-center shadow-xs" title={t('rightText')}>
              <AlignRight className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.8)', height: 'calc(var(--gallery-icon-size, 16px) * 0.8)' }} />
            </button>
            
            {(!img.url.includes('steemitimages.com') && 
              !img.url.includes('pexels.com') && 
              !img.url.includes('pixabay.com') && 
              !img.url.includes('unsplash.com')) && (
              <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); onHost(img.url, img.name); }} 
                className="p-1.5 bg-slate-800/80 dark:bg-slate-800 rounded flex-1 hover:bg-green-600 hover:text-white outline-none text-slate-100 dark:text-white transition-colors flex justify-center items-center shadow-xs" 
                title={t('uploadToSteemit')}
              >
                <CloudUpload className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.8)', height: 'calc(var(--gallery-icon-size, 16px) * 0.8)' }} />
              </button>
            )}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCopyUrl}
              className="p-1.5 bg-slate-800/80 dark:bg-slate-800 rounded flex-1 hover:bg-cyan-600 hover:text-white outline-none text-slate-100 dark:text-white transition-colors flex justify-center items-center shadow-xs"
              title={copiedUrl ? t('lightboxUrlCopied') : t('lightboxCopyUrl')}
            >
              {copiedUrl ? (
                <Check className="shrink-0 text-green-400" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.8)', height: 'calc(var(--gallery-icon-size, 16px) * 0.8)' }} />
              ) : (
                <Copy className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.8)', height: 'calc(var(--gallery-icon-size, 16px) * 0.8)' }} />
              )}
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onDelete(idx); }} className="p-1.5 bg-slate-800/80 dark:bg-slate-800 rounded flex-1 hover:bg-red-600 hover:text-white outline-none text-slate-100 dark:text-white transition-colors flex justify-center items-center shadow-xs" title={t('delete')}>
              <Trash2 className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.8)', height: 'calc(var(--gallery-icon-size, 16px) * 0.8)' }} />
            </button>
          </div>
        )}
      </div>
      
      <div className={cn(
        "min-w-0 flex flex-col justify-center shrink-0",
        galleryView === 'grid' ? "p-1.5 bg-[var(--bg-card)]" : "flex-1"
      )}>
        <p className="text-[9px] font-medium text-[var(--text-main)] truncate leading-tight uppercase tracking-tight">{img.name}</p>
        
        {galleryView === 'list' && (
           <div className="flex items-center gap-2 mt-1">
              <button onMouseDown={(e) => e.preventDefault()} title={t('leftText')} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'left'); }} className="text-[var(--text-muted)] hover:text-cyan-500">
                <AlignLeft className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} title={t('asIs')} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'plain'); }} className="text-[var(--text-muted)] hover:text-cyan-500">
                <FileText className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} title={t('rightText')} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'right'); }} className="text-[var(--text-muted)] hover:text-cyan-500">
                <AlignRight className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} title={copiedUrl ? t('lightboxUrlCopied') : t('lightboxCopyUrl')} onClick={handleCopyUrl} className="text-[var(--text-muted)] hover:text-cyan-500">
                {copiedUrl ? (
                  <Check className="shrink-0 text-green-400" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
                ) : (
                  <Copy className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
                )}
              </button>
              <button onMouseDown={(e) => e.preventDefault()} title={t('delete')} onClick={(e) => { e.stopPropagation(); onDelete(idx); }} className="text-[var(--text-muted)] hover:text-red-500">
                <Trash2 className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
              </button>
           </div>
        )}
      </div>

       {/* Movement controls overlay */}
       {(onMoveLeft || onMoveRight) && (
          <div className={cn(
            "absolute z-20 flex",
            galleryView === 'grid' 
               ? "top-1 right-1 flex-row gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" 
               : "right-1 top-1/2 -translate-y-1/2 flex-col gap-0.5"
          )}>
            {onMoveLeft && (
              <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); onMoveLeft(idx); }} 
                className={cn(
                   "bg-[var(--bg-overlay-surface)] hover:bg-slate-700/80 border border-[var(--border-subtle)] backdrop-blur-dynamic rounded text-[var(--text-main)] transition-colors flex items-center justify-center shadow-xs",
                   galleryView === 'grid' ? "p-1" : "p-0.5"
                )}
                title={galleryView === 'grid' ? t('moveLeft') : t('moveUp')}
              >
                {galleryView === 'grid' ? (
                  <ChevronLeft className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
                ) : (
                  <ChevronUp className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
                )}
              </button>
            )}
            {onMoveRight && (
              <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); onMoveRight(idx); }} 
                className={cn(
                   "bg-[var(--bg-overlay-surface)] hover:bg-slate-700/80 border border-[var(--border-subtle)] backdrop-blur-dynamic rounded text-[var(--text-main)] transition-colors flex items-center justify-center shadow-xs",
                   galleryView === 'grid' ? "p-1" : "p-0.5"
                )}
                title={galleryView === 'grid' ? t('moveRight') : t('moveDown')}
              >
                {galleryView === 'grid' ? (
                  <ChevronRight className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
                ) : (
                  <ChevronDown className="shrink-0" style={{ width: 'calc(var(--gallery-icon-size, 16px) * 0.75)', height: 'calc(var(--gallery-icon-size, 16px) * 0.75)' }} />
                )}
              </button>
            )}
          </div>
       )}

    </div>
  );
});

export default ImageItem;
