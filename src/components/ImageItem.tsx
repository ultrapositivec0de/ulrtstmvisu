import React from 'react';
import { AlignLeft, AlignRight, FileText, CloudUpload, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { ImageItem as ImageItemType } from '../types';

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
  const displayUrl = isTrafficOptimized && img.url.startsWith('http')
    ? `https://steemitimages.com/${galleryView === 'grid' ? '640x0' : '128x128'}/${img.url}`
    : img.url;

  if (isCollapsed) {
    return (
      <div 
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          "relative rounded-lg overflow-hidden border border-slate-800 hover:border-cyan-500 hover:ring-1 hover:ring-cyan-500/50 transition-all cursor-pointer bg-slate-900 shadow-sm flex-none aspect-square w-full"
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
        "group relative rounded-lg overflow-hidden border transition-all cursor-pointer bg-slate-900 shadow-sm flex-none",
        galleryView === 'grid' ? "flex flex-col w-full min-h-[140px]" : "flex flex-row items-center p-1.5 gap-2 min-h-[50px]",
        img.selected ? "border-cyan-500 ring-1 ring-cyan-500/20" : "border-slate-800 hover:border-slate-700"
      )}
      onClick={() => onToggle(idx)}
    >
      <div className={cn(
        "overflow-hidden relative flex-none bg-slate-950",
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
          <div className={cn(
            "absolute inset-x-0 bottom-0 bg-slate-950/90 backdrop-blur-sm px-1 py-1.5 flex flex-row items-center justify-center gap-1 transition-all z-10",
            "lg:opacity-0 lg:group-hover:opacity-100"
          )}>
            <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'left'); }} className="p-1.5 bg-slate-800 rounded flex-1 hover:bg-cyan-600 outline-none text-white transition-colors flex justify-center items-center" title={t('leftText')}><AlignLeft size={12} /></button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'plain'); }} className="p-1.5 bg-slate-800 rounded flex-1 hover:bg-cyan-600 outline-none text-white transition-colors flex justify-center items-center" title={t('asIs')}><FileText size={12} /></button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'right'); }} className="p-1.5 bg-slate-800 rounded flex-1 hover:bg-cyan-600 outline-none text-white transition-colors flex justify-center items-center" title={t('rightText')}><AlignRight size={12} /></button>
            
            {(!img.url.includes('steemitimages.com') && 
              !img.url.includes('pexels.com') && 
              !img.url.includes('pixabay.com') && 
              !img.url.includes('unsplash.com')) && (
              <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); onHost(img.url, img.name); }} 
                className="p-1.5 bg-slate-800 rounded flex-1 hover:bg-green-600 outline-none text-white transition-colors flex justify-center items-center" 
                title={t('uploadToSteemit')}
              >
                <CloudUpload size={12} />
              </button>
            )}
            <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onDelete(idx); }} className="p-1.5 bg-slate-800 rounded flex-1 hover:bg-red-600 outline-none text-white transition-colors flex justify-center items-center" title={t('delete')}><Trash2 size={12} /></button>
          </div>
        )}
      </div>
      
      <div className={cn(
        "min-w-0 flex flex-col justify-center shrink-0",
        galleryView === 'grid' ? "p-1.5 bg-slate-900" : "flex-1"
      )}>
        <p className="text-[9px] font-medium text-slate-300 truncate leading-tight uppercase tracking-tight">{img.name}</p>
        
        {galleryView === 'list' && (
           <div className="flex items-center gap-2 mt-1">
              <button onMouseDown={(e) => e.preventDefault()} title={t('leftText')} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'left'); }} className="text-slate-500 hover:text-cyan-400"><AlignLeft size={10} /></button>
              <button onMouseDown={(e) => e.preventDefault()} title={t('asIs')} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'plain'); }} className="text-slate-500 hover:text-cyan-400"><FileText size={10} /></button>
              <button onMouseDown={(e) => e.preventDefault()} title={t('rightText')} onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'right'); }} className="text-slate-500 hover:text-cyan-400"><AlignRight size={10} /></button>
              <button onMouseDown={(e) => e.preventDefault()} title={t('delete')} onClick={(e) => { e.stopPropagation(); onDelete(idx); }} className="text-slate-500 hover:text-red-400"><Trash2 size={10} /></button>
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
                   "bg-slate-900/80 hover:bg-slate-700 backdrop-blur-sm rounded text-white transition-colors",
                   galleryView === 'grid' ? "p-1" : "p-0.5"
                )}
                title={galleryView === 'grid' ? 'Вліво' : 'Вгору'}
              >
                {galleryView === 'grid' ? <ChevronLeft size={12} /> : <ChevronUp size={12} />}
              </button>
            )}
            {onMoveRight && (
              <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); onMoveRight(idx); }} 
                className={cn(
                   "bg-slate-900/80 hover:bg-slate-700 backdrop-blur-sm rounded text-white transition-colors",
                   galleryView === 'grid' ? "p-1" : "p-0.5"
                )}
                title={galleryView === 'grid' ? 'Вправо' : 'Вниз'}
              >
                {galleryView === 'grid' ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
       )}

    </div>
  );
});

export default ImageItem;
