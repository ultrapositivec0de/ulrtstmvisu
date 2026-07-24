import React from 'react';
import { AlignLeft, AlignRight, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExternalImageItemProps {
  photo: any;
  idx: number;
  galleryView: 'grid' | 'list';
  onToggle: (idx: number) => void;
  onInsert: (photo: any, pos: 'left' | 'plain' | 'right') => void;
  t: (key: any) => string;
  isCollapsed?: boolean;
}

const ExternalImageItem = React.memo(({ 
  photo, 
  idx, 
  galleryView, 
  onToggle, 
  onInsert, 
  t,
  isCollapsed
}: ExternalImageItemProps) => {

  if (isCollapsed) {
    return (
      <div 
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          "relative rounded-lg overflow-hidden border border-slate-800 hover:border-cyan-500 hover:ring-1 hover:ring-cyan-500/50 transition-all cursor-pointer bg-slate-900 shadow-sm flex-none aspect-square w-full"
        )}
        onClick={(e) => { e.stopPropagation(); onInsert(photo, 'plain'); }}
        title={t('insert')}
      >
        <img 
          src={photo.thumb} 
          alt={photo.alt} 
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
        "group relative rounded-lg overflow-hidden border transition-all cursor-pointer bg-slate-900 flex flex-col shadow-sm flex-none",
        galleryView === 'grid' ? "w-full min-h-[140px]" : "flex-row items-center p-1.5 gap-2 min-h-[50px]",
        photo.selected ? "border-cyan-500 ring-1 ring-cyan-500/20" : "border-slate-800 hover:border-slate-700"
      )}
      onClick={() => onToggle(idx)}
    >
      <div className={cn(
        "overflow-hidden relative flex-none bg-slate-950",
        galleryView === 'grid' ? "aspect-square w-full" : "w-10 h-10 rounded"
      )}>
        <img 
          src={photo.thumb} 
          alt={photo.alt} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          referrerPolicy="no-referrer" 
          loading="lazy"
        />
        
        <div className={cn(
          "absolute inset-x-0 bottom-0 bg-slate-950/90 backdrop-blur-sm px-1 py-1.5 flex flex-row items-center justify-center gap-1 transition-all z-10",
          "lg:opacity-0 lg:group-hover:opacity-100"
        )}>
          <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onInsert(photo, 'left'); }} className="p-1.5 bg-slate-800 flex-1 rounded hover:bg-cyan-600 outline-none text-white transition-colors flex justify-center items-center" title={t('insert')}><AlignLeft size={12} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onInsert(photo, 'plain'); }} className="p-1.5 bg-slate-800 flex-1 rounded hover:bg-cyan-600 outline-none text-white transition-colors flex justify-center items-center" title={t('insert')}><FileText size={12} /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onInsert(photo, 'right'); }} className="p-1.5 bg-slate-800 flex-1 rounded hover:bg-cyan-600 outline-none text-white transition-colors flex justify-center items-center" title={t('insert')}><AlignRight size={12} /></button>
        </div>
      </div>
      
      <div className={cn(
        "min-w-0 flex flex-col justify-center shrink-0 overflow-hidden",
        galleryView === 'grid' ? "p-1.5 bg-slate-900" : "flex-1"
      )}>
        <p className="text-[9px] font-medium text-slate-300 truncate leading-tight">{photo.author}</p>
        <p className="text-[7px] text-slate-500 uppercase tracking-tighter">{photo.source}</p>
      </div>
    </div>
  );
});

export default ExternalImageItem;
