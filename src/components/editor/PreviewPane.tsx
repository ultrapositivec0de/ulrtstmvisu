import React from 'react';
import { Eye, EyeOff, MoveVertical, Maximize2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDeviceStore } from '../../store/deviceStore';

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
  editorMode?: string;
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
  t,
  editorMode
}) => {
  const isMobileLayout = useDeviceStore(s => s.isMobileLayout);

  return (
    <div 
      ref={previewRef}
      className={cn(
        "flex-1 flex flex-col min-w-0 bg-slate-900 relative",
        editorMode === 'reading' 
          ? "hidden" 
          : (isMobileLayout 
              ? (activeMobileTab === 'preview' ? "flex" : "hidden")
              : (isLivePreviewEnabled ? "flex" : "hidden")),
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
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isFullScreen ? "bg-amber-600 text-white shadow-none" : "text-slate-500 hover:text-slate-300"
            )}
            title={t('fullscreen')}
          >
            {isFullScreen ? <X size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      <div 
        ref={previewPaneRef}
        className={cn(
          "flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar",
          isFullScreen && "h-full max-w-4xl mx-auto"
        )}
        style={{
          paddingBottom: widgetPos === 'bottom' ? 'calc(5rem + env(safe-area-inset-bottom, 0px))' : 'calc(2.5rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <div id="steem-preview-pane" className="max-w-3xl mx-auto" />
      </div>
    </div>
  );
};

export default PreviewPane;
