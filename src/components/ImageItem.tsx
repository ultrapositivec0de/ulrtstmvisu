import React from 'react';
import { Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, Check, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { ImageItem } from '../types';

interface ImageItemCompProps {
  img: ImageItem;
  idx: number;
  galleryView: 'grid' | 'list';
  isTrafficOptimized: boolean;
  onToggle: (idx: number) => void;
  onInsert: (url: string, name: string, pos: 'left' | 'right' | 'center' | 'plain') => void;
  onHost?: (url: string) => void;
  onDelete: (idx: number) => void;
  onMoveLeft?: (idx: number) => void;
  onMoveRight?: (idx: number) => void;
  t: (key: string) => string;
}

const ImageItemComp: React.FC<ImageItemCompProps> = ({
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
}) => {
  const isSelected = !!img.selected;

  if (galleryView === 'grid') {
    return (
      <div className={cn(
        "relative rounded-xl overflow-hidden bg-slate-900 border transition-all h-[130px] group",
        isSelected ? "border-cyan-500 shadow-md shadow-cyan-900/10" : "border-slate-800 hover:border-slate-700"
      )}>
        {/* Toggleable overlay */}
        <div 
          onClick={() => onToggle(idx)} 
          className="absolute inset-0 cursor-pointer"
        >
          {!isTrafficOptimized && (
            <img 
              src={img.url} 
              alt={img.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              referrerPolicy="no-referrer"
            />
          )}
          {isTrafficOptimized && (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-500">
              <ImageIcon size={24} className="mb-1 opacity-40" />
              <p className="text-[10px] text-center line-clamp-2 select-none">{img.name}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-cyan-600 rounded-full flex items-center justify-center text-white text-[10px] shadow border border-cyan-400 z-10">
            <Check size={12} />
          </div>
        )}

        {/* Hover controls */}
        <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-slate-950/90 to-slate-950/40 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="flex gap-0.5">
            {onMoveLeft && (
              <button 
                onClick={(e) => { e.stopPropagation(); onMoveLeft(idx); }}
                className="p-1 hover:bg-slate-800 rounded bg-slate-900/60 text-slate-300"
                title={t('moveUp') || "Move Left"}
              >
                <ChevronLeft size={12} />
              </button>
            )}
            {onMoveRight && (
              <button 
                onClick={(e) => { e.stopPropagation(); onMoveRight(idx); }}
                className="p-1 hover:bg-slate-800 rounded bg-slate-900/60 text-slate-300"
                title={t('moveDown') || "Move Right"}
              >
                <ChevronRight size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onInsert(img.url, img.name, 'plain'); }}
              className="px-1.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-[9px] font-bold"
              title={t('insertWord') || "Insert"}
            >
              +
            </button>
            
            {onHost && img.url.startsWith('http') && !img.url.includes('steemitimages.com') && (
              <button 
                onClick={(e) => { e.stopPropagation(); onHost(img.url); }}
                className="p-1 bg-yellow-600/30 hover:bg-yellow-600 rounded text-yellow-300 hover:text-white"
                title={t('hostOnSteem') || "Host on Steem"}
              >
                <Globe size={11} />
              </button>
            )}

            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
              className="p-1 bg-rose-950/50 hover:bg-rose-600 rounded text-rose-400 hover:text-white"
              title={t('deleteWord') || "Delete"}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className={cn(
      "p-2 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl flex items-center justify-between gap-3 group transition-colors",
      isSelected && "border-cyan-500/50 bg-cyan-950/5"
    )}>
      <div 
        onClick={() => onToggle(idx)}
        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
      >
        <div className="w-10 h-10 rounded-lg bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center border border-slate-700/60">
          {!isTrafficOptimized ? (
            <img 
              src={img.url} 
              alt={img.name} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <ImageIcon size={18} className="text-slate-500 opacity-40" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs text-slate-300 truncate">{img.name}</p>
          <p className="text-[9px] text-slate-500 truncate mt-0.5 select-all">{img.url}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onMoveLeft && (
          <button 
            onClick={() => onMoveLeft(idx)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
            title={t('moveUp') || "Move Left"}
          >
            <ChevronLeft size={13} />
          </button>
        )}
        {onMoveRight && (
          <button 
            onClick={() => onMoveRight(idx)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
            title={t('moveDown') || "Move Right"}
          >
            <ChevronRight size={13} />
          </button>
        )}

        {onHost && img.url.startsWith('http') && !img.url.includes('steemitimages.com') && (
          <button 
            onClick={() => onHost(img.url)}
            className="p-1.5 hover:bg-yellow-600 hover:text-white rounded text-yellow-400"
            title={t('hostOnSteem') || "Host on Steem"}
          >
            <Globe size={13} />
          </button>
        )}

        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700/50">
          <button 
            onClick={() => onInsert(img.url, img.name, 'plain')}
            className="px-1.5 py-1 hover:bg-slate-800 text-[8px] uppercase font-black text-slate-400 hover:text-cyan-400 rounded-md transition-colors"
            title="Plain / Full width"
          >
            Plain
          </button>
          <button 
            onClick={() => onInsert(img.url, img.name, 'left')}
            className="px-1.5 py-1 hover:bg-slate-800 text-[8px] uppercase font-black text-slate-400 hover:text-cyan-400 rounded-md transition-colors border-x border-slate-800"
            title="Float Left"
          >
            Left
          </button>
          <button 
            onClick={() => onInsert(img.url, img.name, 'center')}
            className="px-1.5 py-1 hover:bg-slate-800 text-[8px] uppercase font-black text-slate-100 hover:text-cyan-400 rounded-md transition-colors"
            title="Center Aligned"
          >
            Center
          </button>
          <button 
            onClick={() => onInsert(img.url, img.name, 'right')}
            className="px-1.5 py-1 hover:bg-slate-800 text-[8px] uppercase font-black text-slate-400 hover:text-cyan-400 rounded-md transition-colors border-l border-slate-800"
            title="Float Right"
          >
            Right
          </button>
        </div>

        <button 
          onClick={() => onDelete(idx)}
          className="p-1.5 hover:bg-rose-900 hover:text-rose-100 rounded text-rose-400 transition-colors"
          title={t('deleteWord') || "Delete"}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

export default ImageItemComp;
