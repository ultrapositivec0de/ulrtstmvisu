import React from 'react';
import { DocReaderSettings, DocReaderTheme, DocReaderWidth, DocReaderFont } from './types';
import { X, Sliders, Sun, Moon, Eye, AlignCenter, Type, Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DocReaderSettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DocReaderSettings;
  onUpdateSettings: (newSettings: Partial<DocReaderSettings>) => void;
}

export const DocReaderSettingsMenu: React.FC<DocReaderSettingsMenuProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  if (!isOpen) return null;

  const themes: { id: DocReaderTheme; label: string; icon: any; bg: string; text: string }[] = [
    { id: 'paper', label: 'Папір', icon: Sun, bg: 'bg-[#fafafa]', text: 'text-slate-900 border-slate-300' },
    { id: 'sepia', label: 'Сепія', icon: Eye, bg: 'bg-[#f4ecd8]', text: 'text-[#433422] border-[#dfd2be]' },
    { id: 'dark', label: 'Ніч', icon: Moon, bg: 'bg-[#0f172a]', text: 'text-slate-100 border-slate-700' },
    { id: 'oled', label: 'OLED', icon: Moon, bg: 'bg-black', text: 'text-slate-200 border-zinc-800' }
  ];

  const widths: { id: DocReaderWidth; label: string; desc: string }[] = [
    { id: 'narrow', label: 'Книга', desc: '65ch (вузька)' },
    { id: 'medium', label: 'Стандарт', desc: '85ch (комфортна)' },
    { id: 'full', label: 'Повна', desc: '100% ширини' }
  ];

  const fonts: { id: DocReaderFont; label: string; fontClass: string }[] = [
    { id: 'sans', label: 'Sans (Сучасний)', fontClass: 'font-sans' },
    { id: 'serif', label: 'Serif (Книжковий)', fontClass: 'font-serif' },
    { id: 'mono', label: 'Mono (Код)', fontClass: 'font-mono' }
  ];

  const isLight = settings.theme === 'paper' || settings.theme === 'sepia';
  const isSepia = settings.theme === 'sepia';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div 
        className={cn(
          "relative w-full max-w-md rounded-2xl shadow-2xl z-10 border overflow-hidden flex flex-col transition-all",
          isSepia
            ? "bg-[#f4ecd8] text-[#433422] border-[#dfd2be]"
            : isLight
            ? "bg-[#fdfdfd] text-slate-800 border-slate-200"
            : settings.theme === 'oled'
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
            <Sliders size={18} className={isSepia ? "text-[#8c6d37]" : isLight ? "text-cyan-600" : "text-cyan-400"} />
            <span>Параметри читання</span>
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
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar text-sm">
          {/* 1. Theme Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">
              Колірна тема
            </label>
            <div className="grid grid-cols-4 gap-2">
              {themes.map(t => {
                const isActive = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onUpdateSettings({ theme: t.id })}
                    className={cn(
                      "p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-medium",
                      t.bg,
                      t.text,
                      isActive 
                        ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-transparent shadow-md scale-102" 
                        : "opacity-80 hover:opacity-100"
                    )}
                  >
                    <t.icon size={16} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Column Width */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-2 flex items-center gap-1.5">
              <AlignCenter size={14} />
              <span>Ширина колонки тексту</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {widths.map(w => {
                const isActive = settings.width === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => onUpdateSettings({ width: w.id })}
                    className={cn(
                      "py-2 px-2.5 rounded-xl border text-center transition-all flex flex-col items-center",
                      isActive
                        ? isSepia
                          ? "bg-[#e5d4b8] border-[#cbb797] font-semibold"
                          : isLight
                          ? "bg-cyan-50 border-cyan-400 text-cyan-900 font-semibold"
                          : "bg-cyan-950/60 border-cyan-500 text-cyan-300 font-semibold"
                        : isSepia
                        ? "bg-[#f8f2e4] border-[#dfd2be] hover:bg-[#ebe0cc]"
                        : isLight
                        ? "bg-white border-slate-200 hover:bg-slate-50"
                        : "bg-slate-800/40 border-slate-800 hover:bg-slate-800"
                    )}
                  >
                    <span className="text-xs font-medium">{w.label}</span>
                    <span className="text-[10px] opacity-60">{w.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Font Family */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-60 mb-2 flex items-center gap-1.5">
              <Type size={14} />
              <span>Гарнітура шрифту</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {fonts.map(f => {
                const isActive = settings.font === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => onUpdateSettings({ font: f.id })}
                    className={cn(
                      "py-2 px-2 rounded-xl border text-center transition-all",
                      f.fontClass,
                      isActive
                        ? isSepia
                          ? "bg-[#e5d4b8] border-[#cbb797] font-semibold"
                          : isLight
                          ? "bg-cyan-50 border-cyan-400 text-cyan-900 font-semibold"
                          : "bg-cyan-950/60 border-cyan-500 text-cyan-300 font-semibold"
                        : isSepia
                        ? "bg-[#f8f2e4] border-[#dfd2be] hover:bg-[#ebe0cc]"
                        : isLight
                        ? "bg-white border-slate-200 hover:bg-slate-50"
                        : "bg-slate-800/40 border-slate-800 hover:bg-slate-800"
                    )}
                  >
                    <span className="text-xs">{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Font Size & Line Height Steppers */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Font Size */}
            <div className={cn(
              "p-3 rounded-xl border flex flex-col justify-between gap-2",
              isSepia ? "bg-[#f8f2e4] border-[#dfd2be]" : isLight ? "bg-white border-slate-200" : "bg-slate-800/40 border-slate-800"
            )}>
              <div className="text-xs font-medium opacity-70">Розмір тексту</div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                  title="Зменшити"
                >
                  <Minus size={14} />
                </button>
                <span className="font-semibold text-sm">{settings.fontSize}px</span>
                <button
                  onClick={() => onUpdateSettings({ fontSize: Math.min(28, settings.fontSize + 1) })}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                  title="Збільшити"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Line Height */}
            <div className={cn(
              "p-3 rounded-xl border flex flex-col justify-between gap-2",
              isSepia ? "bg-[#f8f2e4] border-[#dfd2be]" : isLight ? "bg-white border-slate-200" : "bg-slate-800/40 border-slate-800"
            )}>
              <div className="text-xs font-medium opacity-70">Міжрядковий інтервал</div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onUpdateSettings({ lineHeight: Math.max(1.4, Number((settings.lineHeight - 0.1).toFixed(2))) })}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                  title="Зменшити"
                >
                  <Minus size={14} />
                </button>
                <span className="font-semibold text-sm">{settings.lineHeight}</span>
                <button
                  onClick={() => onUpdateSettings({ lineHeight: Math.min(2.4, Number((settings.lineHeight + 0.1).toFixed(2))) })}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                  title="Збільшити"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 5. Toggles */}
          <div className="pt-2 border-t space-y-2">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs font-medium opacity-80">Показувати верхній прогрес-бар читання</span>
              <input
                type="checkbox"
                checked={settings.showProgress}
                onChange={e => onUpdateSettings({ showProgress: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
