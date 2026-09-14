import React, { useRef, useEffect } from 'react';
import { DocReaderSource } from './types';
import { X, FileText, Bookmark, FolderOpen, Edit, Clock, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DocReaderSourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  source: DocReaderSource;
  drafts: any[];
  onSelectCurrent: () => void;
  onSelectDraft: (draft: any) => void;
  onSelectLocalFile: (file: File) => void;
  onEditDocument: (mode?: 'visual' | 'markdown') => void;
  theme?: string;
}

export const DocReaderSourceDrawer: React.FC<DocReaderSourceDrawerProps> = ({
  isOpen,
  onClose,
  source,
  drafts = [],
  onSelectCurrent,
  onSelectDraft,
  onSelectLocalFile,
  onEditDocument,
  theme = 'dark'
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Click outside listener to close drawer without blocking text vision
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        // Prevent closing if clicked on header buttons
        const target = e.target as HTMLElement;
        if (target.closest('button')?.title?.includes('Джерело')) return;
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectLocalFile(file);
      onClose();
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      ref={drawerRef}
      className={cn(
        "absolute top-0 left-0 bottom-0 z-30 w-84 sm:w-96 max-w-[88vw] h-full shadow-2xl flex flex-col border-r transition-all duration-200 animate-in slide-in-from-left",
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
            <Bookmark size={18} className={isSepia ? "text-[#8c6d37]" : isLight ? "text-cyan-600" : "text-cyan-400"} />
            <span>Джерела для читання</span>
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
            title="Закрити панель"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Active Doc Quick Edit Action */}
        <div className={cn(
          "p-3 border-b space-y-2",
          isSepia ? "border-[#dfd2be] bg-[#ebe0cc]/50" : isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/40"
        )}>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-60 px-1">
            Зараз у рідері
          </div>
          <div className={cn(
            "p-2.5 rounded-xl border flex flex-col gap-1.5",
            isSepia
              ? "bg-[#f9f3e5] border-[#dfd2be]"
              : isLight
              ? "bg-white border-slate-200"
              : "bg-slate-800/80 border-slate-700"
          )}>
            <div className="font-medium text-sm line-clamp-1 flex items-center gap-2">
              <FileText size={15} className="text-cyan-500 shrink-0" />
              <span>{source.title || 'Документ без назви'}</span>
            </div>
            {source.tags && (
              <div className="flex items-center gap-1 text-xs opacity-60">
                <Tag size={12} />
                <span className="line-clamp-1">{source.tags}</span>
              </div>
            )}
            <button
              onClick={() => {
                onEditDocument('visual');
                onClose();
              }}
              className="mt-1 w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Edit size={13} />
              <span>Редагувати цей текст</span>
            </button>
          </div>
        </div>

        {/* Source List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {/* 1. Editor Current Work */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-60 px-1 mb-1.5">
              Основний редактор
            </div>
            <button
              onClick={() => {
                onSelectCurrent();
                onClose();
              }}
              className={cn(
                "w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5",
                source.type === 'current'
                  ? isSepia
                    ? "bg-[#e5d4b8] border-[#cbb797] font-medium"
                    : isLight
                    ? "bg-cyan-50 border-cyan-300 text-cyan-900 font-medium"
                    : "bg-cyan-950/60 border-cyan-500/50 text-cyan-200 font-medium"
                  : isSepia
                  ? "bg-[#f8f2e4] border-[#dfd2be] hover:bg-[#ebe0cc]"
                  : isLight
                  ? "bg-white border-slate-200 hover:bg-slate-50"
                  : "bg-slate-800/40 border-slate-800 hover:bg-slate-800"
              )}
            >
              <FileText size={16} className="mt-0.5 text-cyan-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Поточний документ у редакторі</div>
                <div className="text-xs opacity-60 mt-0.5">Синхронізовано з візуальним / кодовим редактором</div>
              </div>
            </button>
          </div>

          {/* 2. Open Local File */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-60 px-1 mb-1.5">
              Локальні файли
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".md,.txt,.html,.markdown"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full text-left p-2.5 rounded-xl border border-dashed transition-all flex items-center gap-2.5",
                isSepia
                  ? "border-[#cbb797] hover:bg-[#ebe0cc] text-[#55422d]"
                  : isLight
                  ? "border-slate-300 hover:bg-slate-50 text-slate-700"
                  : "border-slate-700 hover:bg-slate-800/60 text-slate-300"
              )}
            >
              <FolderOpen size={16} className="text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Відкрити файл з диска</div>
                <div className="text-xs opacity-60">Підтримує .md, .txt, .html</div>
              </div>
            </button>
          </div>

          {/* 3. Saved Drafts */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-60 px-1 mb-1.5 flex items-center justify-between">
              <span>Збережені чернетки</span>
              <span className="opacity-80">({drafts.length})</span>
            </div>

            {drafts.length === 0 ? (
              <div className="text-center py-6 px-3 text-xs opacity-50 border rounded-xl border-dashed">
                Немає збережених чернеток
              </div>
            ) : (
              <div className="space-y-1.5">
                {drafts.map((d) => {
                  const isSelected = source.type === 'draft' && source.id === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        onSelectDraft(d);
                        onClose();
                      }}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1",
                        isSelected
                          ? isSepia
                            ? "bg-[#e5d4b8] border-[#cbb797]"
                            : isLight
                            ? "bg-cyan-50 border-cyan-300 text-cyan-900"
                            : "bg-cyan-950/60 border-cyan-500/50 text-cyan-200"
                          : isSepia
                          ? "bg-[#f8f2e4] border-[#dfd2be] hover:bg-[#ebe0cc]"
                          : isLight
                          ? "bg-white border-slate-200 hover:bg-slate-50"
                          : "bg-slate-800/30 border-slate-800 hover:bg-slate-800/80"
                      )}
                    >
                      <div className="text-sm font-medium line-clamp-1">
                        {d.title || 'Чернетка без назви'}
                      </div>
                      <div className="flex items-center justify-between text-xs opacity-60">
                        <span>{d.content ? `${d.content.trim().split(/\s+/).length} слів` : '0 слів'}</span>
                        {(d.updatedAt || d.createdAt) && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(d.updatedAt || d.createdAt)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
  );
};
