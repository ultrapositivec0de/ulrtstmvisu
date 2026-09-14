import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TOCHeadingItem } from './types';
import { X, Search, ListTree, Hash } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DocReaderTOCProps {
  isOpen: boolean;
  onClose: () => void;
  headings: TOCHeadingItem[];
  activeHeadingId: string | null;
  onSelectHeading: (id: string) => void;
  theme?: string;
}

export const DocReaderTOC: React.FC<DocReaderTOCProps> = ({
  isOpen,
  onClose,
  headings,
  activeHeadingId,
  onSelectHeading,
  theme = 'dark'
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const filteredHeadings = useMemo(() => {
    if (!filterQuery.trim()) return headings;
    const q = filterQuery.toLowerCase();
    return headings.filter(h => h.text.toLowerCase().includes(q));
  }, [headings, filterQuery]);

  // Click outside listener to close drawer without blocking text vision
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        // Prevent closing if clicked on header buttons
        const target = e.target as HTMLElement;
        if (target.closest('button')?.title?.includes('Зміст')) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLight = theme === 'paper' || theme === 'sepia';
  const isSepia = theme === 'sepia';

  return (
    <div 
      ref={drawerRef}
      className={cn(
        "absolute top-0 left-0 bottom-0 z-30 w-80 sm:w-96 max-w-[85vw] h-full shadow-2xl flex flex-col border-r transition-all duration-200 animate-in slide-in-from-left",
        isSepia
          ? "bg-[#f4ecd8] text-[#433422] border-[#dfd2be]"
          : isLight
          ? "bg-[#fdfdfd] text-slate-800 border-slate-200"
          : theme === 'oled'
          ? "bg-black text-slate-100 border-zinc-800"
          : "bg-slate-900 text-slate-100 border-slate-800"
      )}
    >
        {/* Header */}
        <div className={cn(
          "p-4 border-b flex items-center justify-between",
          isSepia ? "border-[#dfd2be]" : isLight ? "border-slate-200" : "border-slate-800"
        )}>
          <div className="flex items-center gap-2 font-medium">
            <ListTree size={18} className={isSepia ? "text-[#8c6d37]" : isLight ? "text-cyan-600" : "text-cyan-400"} />
            <span>Зміст документа ({headings.length})</span>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isSepia 
                ? "hover:bg-[#e6d8be] text-[#6e583c]" 
                : isLight 
                ? "hover:bg-slate-100 text-slate-500" 
                : "hover:bg-slate-800 text-slate-400"
            )}
            title="Закрити зміст"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        {headings.length > 5 && (
          <div className={cn(
            "p-3 border-b",
            isSepia ? "border-[#dfd2be]" : isLight ? "border-slate-200" : "border-slate-800"
          )}>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border",
              isSepia
                ? "bg-[#ebdeca] border-[#dfd2be] text-[#433422]"
                : isLight
                ? "bg-slate-50 border-slate-200 text-slate-800"
                : "bg-slate-950/60 border-slate-800 text-slate-200"
            )}>
              <Search size={15} className="opacity-50 shrink-0" />
              <input
                type="text"
                placeholder="Пошук розділу..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-none placeholder:opacity-50 text-sm"
              />
              {filterQuery && (
                <button onClick={() => setFilterQuery('')} className="opacity-60 hover:opacity-100">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Headings List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {filteredHeadings.length === 0 ? (
            <div className="text-center py-12 px-4 text-sm opacity-60">
              {headings.length === 0 
                ? "У документі немає заголовків (H1-H6)" 
                : "Нічого не знайдено за запитом"}
            </div>
          ) : (
            filteredHeadings.map((h) => {
              const isActive = activeHeadingId === h.id;
              const indentLevel = Math.max(0, h.level - 1);

              return (
                <button
                  key={h.id}
                  onClick={() => {
                    onSelectHeading(h.id);
                    onClose();
                  }}
                  style={{ paddingLeft: `${12 + indentLevel * 14}px` }}
                  className={cn(
                    "w-full text-left py-2 pr-3 rounded-lg text-sm transition-colors flex items-start gap-2 group",
                    isActive
                      ? isSepia
                        ? "bg-[#e5d4b8] font-semibold text-[#2f2214]"
                        : isLight
                        ? "bg-cyan-50 font-semibold text-cyan-800 border-l-2 border-cyan-500"
                        : "bg-cyan-950/60 text-cyan-300 font-semibold border-l-2 border-cyan-400"
                      : isSepia
                      ? "hover:bg-[#ecdfc9] text-[#5c4933]"
                      : isLight
                      ? "hover:bg-slate-100 text-slate-600"
                      : "hover:bg-slate-800/70 text-slate-300"
                  )}
                >
                  <Hash 
                    size={13} 
                    className={cn(
                      "mt-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity",
                      isActive && "opacity-100 text-cyan-400"
                    )} 
                  />
                  <span className="leading-snug break-words">{h.text}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
  );
};
