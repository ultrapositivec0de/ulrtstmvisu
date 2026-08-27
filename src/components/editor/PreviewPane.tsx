import React from 'react';
import { Eye, EyeOff, MoveVertical, Maximize2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PreviewPaneProps {
  previewRef?: React.RefObject<any>;
  previewPaneRef?: React.RefObject<any>;
  activeMobileTab: string;
  isLivePreviewEnabled: boolean;
  isFullScreen: boolean;
  toggleLivePreview: () => void;
  syncScrollEnabled: boolean;
  setSyncScrollEnabled: (enabled: boolean) => void;
  toggleFullScreen: () => void;
  widgetPos: string;
  lang: string;
  t: (key: any) => string;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  previewRef,
  previewPaneRef,
  activeMobileTab,
  isLivePreviewEnabled,
  isFullScreen,
  toggleLivePreview,
  syncScrollEnabled,
  setSyncScrollEnabled,
  toggleFullScreen,
  widgetPos,
  lang,
  t
}) => {
  return (
    <div 
      ref={previewRef}
      className={cn(
        "flex-1 flex flex-col min-w-0 bg-slate-900 relative",
        activeMobileTab === 'preview' ? "flex" : "hidden",
        isLivePreviewEnabled ? "lg:flex" : "lg:hidden",
        isFullScreen && "bg-slate-950 p-4 lg:p-12 overflow-y-auto fixed top-0 left-0 right-0 z-[250]"
      )}
    >
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 gap-1 shrink-0">
          <button
            onClick={toggleLivePreview}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isLivePreviewEnabled ? "bg-cyan-600 text-white shadow-none" : "bg-red-950 text-red-400 border border-red-500/30"
            )}
            title={lang === 'uk' ? "Увімкнути/вимкнути прев'ю перегляду" : "Enable/Disable Live Preview"}
          >
            {isLivePreviewEnabled ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5 my-auto" />
          <button
            onClick={() => setSyncScrollEnabled(!syncScrollEnabled)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              syncScrollEnabled ? "bg-cyan-600 text-white shadow-none" : "text-slate-500 hover:text-slate-300"
            )}
            title={t('syncScroll')}
          >
            <MoveVertical size={20} />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5 my-auto" />
          <button 
            onClick={toggleFullScreen}
            className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
            title={t('fullScreen')}
          >
            {isFullScreen ? <X size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      <div 
        className={cn(
          "flex-1 p-8 overflow-y-auto prose prose-invert prose-cyan max-w-none custom-scrollbar markdown-body",
          widgetPos === 'bottom' ? "mb-20 lg:mb-16 pb-24 lg:pb-28" : "pb-24 lg:pb-12",
          isFullScreen && "max-w-4xl mx-auto"
        )}
        ref={previewPaneRef}
      />
    </div>
  );
};

export default PreviewPane;
