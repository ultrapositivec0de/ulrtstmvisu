import React from 'react';
import { DocReaderSettings, DocReaderSource } from './types';
import { 
  Bookmark, ListTree, Sliders, Maximize2, Minimize2, Edit3, X, FileText 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface DocReaderToolbarProps {
  source: DocReaderSource;
  settings: DocReaderSettings;
  scrollProgress: number;
  headingsCount: number;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onOpenSourceDrawer: () => void;
  onOpenTOC: () => void;
  onOpenSettings: () => void;
  onEditDocument: (mode?: 'visual' | 'markdown') => void;
  onExitReadingMode: () => void;
}

export const DocReaderToolbar: React.FC<DocReaderToolbarProps> = ({
  source,
  settings,
  scrollProgress,
  headingsCount,
  isFullScreen,
  onToggleFullScreen,
  onOpenSourceDrawer,
  onOpenTOC,
  onOpenSettings,
  onEditDocument,
  onExitReadingMode
}) => {
  const isLight = settings.theme === 'paper' || settings.theme === 'sepia';
  const isSepia = settings.theme === 'sepia';

  return (
    <div className={cn(
      "sticky top-0 z-30 w-full border-b backdrop-blur-md transition-colors",
      isSepia
        ? "bg-[#f4ecd8]/90 text-[#433422] border-[#dfd2be]"
        : isLight
        ? "bg-[#fdfdfd]/90 text-slate-800 border-slate-200"
        : settings.theme === 'oled'
        ? "bg-black/90 text-slate-100 border-zinc-800"
        : "bg-slate-900/90 text-slate-100 border-slate-800"
    )}>
      {/* Top Scroll Progress Line */}
      {settings.showProgress && (
        <div className="w-full h-0.5 bg-transparent overflow-hidden">
          <div 
            className="h-full bg-cyan-500 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(6,182,212,0.5)]"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 flex items-center justify-between gap-2">
        {/* Left: Source Selector Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenSourceDrawer}
            className={cn(
              "flex items-center gap-2 py-1.5 px-2.5 rounded-xl border text-xs font-medium transition-all max-w-[180px] sm:max-w-xs truncate",
              isSepia
                ? "bg-[#ebdeca] border-[#dfd2be] hover:bg-[#e4d5be] text-[#433422]"
                : isLight
                ? "bg-slate-100 border-slate-200 hover:bg-slate-200/70 text-slate-700"
                : "bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200"
            )}
            title="Змінити джерело читання (чернетки, файл або поточний текст)"
          >
            <Bookmark size={14} className="text-cyan-500 shrink-0" />
            <span className="truncate">
              {source.type === 'draft' ? `Чернетка: ${source.title}` : source.type === 'file' ? `Файл: ${source.fileName}` : 'Поточний документ'}
            </span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* TOC Button */}
          {headingsCount > 0 && (
            <button
              onClick={onOpenTOC}
              className={cn(
                "p-2 rounded-xl transition-colors relative",
                isSepia
                  ? "hover:bg-[#e6d8be] text-[#6e583c]"
                  : isLight
                  ? "hover:bg-slate-100 text-slate-600"
                  : "hover:bg-slate-800 text-slate-300"
              )}
              title="Зміст документа"
            >
              <ListTree size={18} />
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-cyan-600 text-[10px] font-bold text-white rounded-full">
                {headingsCount}
              </span>
            </button>
          )}

          {/* Settings Menu Button */}
          <button
            onClick={onOpenSettings}
            className={cn(
              "p-2 rounded-xl transition-colors",
              isSepia
                ? "hover:bg-[#e6d8be] text-[#6e583c]"
                : isLight
                ? "hover:bg-slate-100 text-slate-600"
                : "hover:bg-slate-800 text-slate-300"
            )}
            title="Налаштування вигляду (тема, шрифт, ширина)"
          >
            <Sliders size={18} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullScreen}
            className={cn(
              "p-2 rounded-xl transition-colors hidden sm:flex",
              isSepia
                ? "hover:bg-[#e6d8be] text-[#6e583c]"
                : isLight
                ? "hover:bg-slate-100 text-slate-600"
                : "hover:bg-slate-800 text-slate-300"
            )}
            title={isFullScreen ? "Вийти з повного екрана" : "Повноекранний режим"}
          >
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <div className="w-px h-5 bg-current/15 mx-1" />

          {/* Primary Action: Edit Document */}
          <button
            onClick={() => onEditDocument('visual')}
            className="py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Перейти до редагування цього тексту"
          >
            <Edit3 size={14} />
            <span className="hidden sm:inline">Редагувати</span>
          </button>

          {/* Close Reading Mode */}
          <button
            onClick={onExitReadingMode}
            className={cn(
              "p-2 rounded-xl transition-colors",
              isSepia
                ? "hover:bg-[#e6d8be] text-[#6e583c]"
                : isLight
                ? "hover:bg-slate-100 text-slate-600"
                : "hover:bg-slate-800 text-slate-300"
            )}
            title="Закрити режим читання та повернутися в редактор"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
