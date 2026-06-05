import React from 'react';
import { ExternalLink, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExternalImageItemProps {
  photo: any;
  idx: number;
  galleryView: 'grid' | 'list';
  onToggle: (idx: number) => void;
  onInsert: (photo: any, pos: 'left' | 'right' | 'center' | 'plain') => void;
  t: (key: string) => string;
}

const ExternalImageItem: React.FC<ExternalImageItemProps> = ({
  photo,
  idx,
  galleryView,
  onToggle,
  onInsert,
  t,
}) => {
  const isSelected = !!photo.selected;
  const thumbUrl = photo.thumb || photo.url;

  if (galleryView === 'grid') {
    return (
      <div className={cn(
        "relative rounded-xl overflow-hidden bg-slate-900 border transition-all h-[130px] group",
        isSelected ? "border-cyan-500 shadow-md shadow-cyan-900/10" : "border-slate-800 hover:border-slate-700"
      )}>
        <div 
          onClick={() => onToggle(idx)} 
          className="absolute inset-0 cursor-pointer"
        >
          <img 
            src={thumbUrl} 
            alt={photo.alt || 'External Photo'} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-cyan-600 rounded-full flex items-center justify-center text-white text-[10px] shadow border border-cyan-400 z-10">
            <Check size={12} />
          </div>
        )}

        {/* Author link */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/70 text-slate-300 text-[8px] max-w-[80px] truncate leading-tight flex items-center gap-0.5 pointer-events-auto">
          {photo.author || 'Pexels'}
          {photo.authorUrl && (
            <a 
              href={photo.authorUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()}
              className="text-cyan-400 hover:text-cyan-300"
            >
              <ExternalLink size={8} />
            </a>
          )}
        </div>

        {/* Action button overlay */}
        <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onInsert(photo, 'plain'); }}
            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[9px] font-bold shadow-lg flex items-center gap-1 transition-all"
          >
            + {t('insertWord') || 'Insert'}
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className={cn(
      "p-2 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl flex items-center justify-between gap-3 group transition-colors",
      isSelected && "border-cyan-500/50 bg-cyan-950/5"
    )}>
      <div 
        onClick={() => onToggle(idx)}
        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
      >
        <div className="w-10 h-10 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-700/60">
          <img 
            src={thumbUrl} 
            alt={photo.alt || 'External Photo'} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs text-slate-300 truncate">{photo.alt || 'Pexels Photo'}</p>
          <p className="text-[9px] text-slate-500 truncate mt-0.5 flex items-center gap-1 font-medium">
            <span>by {photo.author || 'Pexels'}</span>
            {photo.authorUrl && (
              <a 
                href={photo.authorUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => e.stopPropagation()}
                className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-0.5"
              >
                Profile <ExternalLink size={7} />
              </a>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700/50">
          <button 
            onClick={() => onInsert(photo, 'plain')}
            className="px-1.5 py-1 hover:bg-slate-800 text-[8px] uppercase font-black text-slate-400 hover:text-cyan-400 rounded-md transition-colors"
          >
            Plain
          </button>
          <button 
            onClick={() => onInsert(photo, 'left')}
            className="px-1.5 py-1 hover:bg-slate-800 text-[8px] uppercase font-black text-slate-400 hover:text-cyan-400 rounded-md transition-colors border-x border-slate-800"
          >
            Left
          </button>
          <button 
            onClick={() => onInsert(photo, 'center')}
            className="px-1.5 py-1 hover:bg-slate-800 text-[8px] uppercase font-black text-slate-100 hover:text-cyan-400 rounded-md transition-colors"
          >
            Center
          </button>
          <button 
            onClick={() => onInsert(photo, 'right')}
            className="px-1.5 py-1 hover:bg-slate-800 text-[8px] uppercase font-black text-slate-400 hover:text-cyan-400 rounded-md transition-colors border-l border-slate-800"
          >
            Right
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalImageItem;
