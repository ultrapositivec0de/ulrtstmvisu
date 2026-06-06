import React from 'react';
import { ExternalLink, Check, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
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
        <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex bg-slate-950/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-0.5 shadow-xl items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onInsert(photo, 'plain'); }}
            className="p-1.5 hover:bg-cyan-600 hover:text-white rounded text-slate-300 transition-all flex items-center justify-center"
            title="Plain / Full width insert"
          >
            <ImageIcon size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onInsert(photo, 'left'); }}
            className="p-1.5 hover:bg-cyan-600 hover:text-white rounded border-x border-slate-800 transition-all flex items-center justify-center"
            title="Float Left insert"
          >
            <AlignLeft size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onInsert(photo, 'center'); }}
            className="p-1.5 hover:bg-cyan-600 hover:text-white rounded transition-all flex items-center justify-center"
            title="Center insertion"
          >
            <AlignCenter size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onInsert(photo, 'right'); }}
            className="p-1.5 hover:bg-cyan-600 hover:text-white rounded border-l border-slate-800 transition-all flex items-center justify-center"
            title="Float Right insert"
          >
            <AlignRight size={14} />
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
        <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-700/60 items-center">
          <button 
            onClick={() => onInsert(photo, 'plain')}
            className="p-1.5 hover:bg-cyan-600 hover:text-white text-slate-400 hover:text-cyan-400 rounded transition-colors flex items-center justify-center"
            title="Plain / Full width insert"
          >
            <ImageIcon size={14} />
          </button>
          <button 
            onClick={() => onInsert(photo, 'left')}
            className="p-1.5 hover:bg-cyan-600 hover:text-white text-slate-400 hover:text-cyan-400 rounded transition-colors border-x border-slate-850 flex items-center justify-center"
            title="Float Left insert"
          >
            <AlignLeft size={14} />
          </button>
          <button 
            onClick={() => onInsert(photo, 'center')}
            className="p-1.5 hover:bg-cyan-600 hover:text-white text-slate-100 hover:text-cyan-400 rounded transition-colors flex items-center justify-center"
            title="Center insertion"
          >
            <AlignCenter size={14} />
          </button>
          <button 
            onClick={() => onInsert(photo, 'right')}
            className="p-1.5 hover:bg-cyan-600 hover:text-white text-slate-400 hover:text-cyan-400 rounded transition-colors border-l border-slate-850 flex items-center justify-center"
            title="Float Right insert"
          >
            <AlignRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalImageItem;
