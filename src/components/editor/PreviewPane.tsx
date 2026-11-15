import React from 'react';
import { Eye, EyeOff, MoveVertical, Maximize2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDeviceStore } from '../../store/deviceStore';
import { useLightboxStore } from '../../store/lightboxStore';
import { useEditorStore } from '../../store';
import { useAppUIStore } from '../../stores/useAppUIStore';

export interface PreviewPaneProps {
  previewRef?: React.RefObject<any>;
  previewPaneRef?: React.RefObject<any>;
  activeMobileTab: string;
  isLivePreviewEnabled?: boolean;
  isFullScreen?: boolean;
  toggleLivePreview?: () => void;
  syncScrollEnabled?: boolean;
  setSyncScrollEnabled?: (enabled: boolean) => void;
  toggleFullScreen?: () => void;
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
  const storeIsLivePreviewEnabled = useEditorStore(s => s.isLivePreviewEnabled);
  const storeToggleLivePreview = useEditorStore(s => s.toggleLivePreview);
  const storeSyncScrollEnabled = useEditorStore(s => s.syncScrollEnabled);
  const storeSetSyncScrollEnabled = useEditorStore(s => s.setSyncScrollEnabled);
  const storeIsFullScreen = useAppUIStore(s => s.isFullScreen);
  const storeToggleFullScreen = useAppUIStore(s => s.toggleFullScreen);

  const livePreview = isLivePreviewEnabled ?? storeIsLivePreviewEnabled;
  const handleToggleLivePreview = toggleLivePreview ?? storeToggleLivePreview;
  const syncScroll = syncScrollEnabled ?? storeSyncScrollEnabled;
  const handleSetSyncScroll = setSyncScrollEnabled ?? storeSetSyncScrollEnabled;
  const fullScreen = isFullScreen ?? storeIsFullScreen;
  const handleToggleFullScreen = toggleFullScreen ?? storeToggleFullScreen;

  return (
    <div 
      ref={previewRef}
      className={cn(
        "flex-1 flex flex-col min-w-0 bg-slate-900 relative",
        editorMode === 'reading' 
          ? "hidden" 
          : (isMobileLayout 
              ? (activeMobileTab === 'preview' ? "flex" : "hidden")
              : (livePreview ? "flex" : "hidden")),
        fullScreen && "bg-slate-950 p-4 lg:p-12 overflow-y-auto fixed inset-0 z-[250]"
      )}
    >
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 gap-1 shrink-0">
          <button
            onClick={handleToggleLivePreview}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              livePreview ? "bg-cyan-600 text-white shadow-none" : "bg-red-950 text-red-400 border border-red-500/30"
            )}
            title={t('toggleLivePreview')}
          >
            {livePreview ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5 my-auto" />
          <button
            onClick={() => handleSetSyncScroll(!syncScroll)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              syncScroll ? "bg-cyan-600 text-white shadow-none" : "text-slate-500 hover:text-slate-300"
            )}
            title={t('syncScroll')}
          >
            <MoveVertical size={20} />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-0.5 my-auto" />
          <button
            onClick={handleToggleFullScreen}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              fullScreen ? "bg-amber-600 text-white shadow-none" : "text-slate-500 hover:text-slate-300"
            )}
            title={t('fullscreen')}
          >
            {fullScreen ? <X size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      <div 
        ref={previewPaneRef}
        onClick={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const img = target.tagName === 'IMG' ? (target as HTMLImageElement) : target.closest('img');
          if (img && img.src) {
            e.preventDefault();
            e.stopPropagation();
            useLightboxStore.getState().openLightbox(img.src, img.alt || '');
          }
        }}
        className={cn(
          "flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar [&_img]:cursor-zoom-in [&_img]:transition-transform hover:[&_img]:opacity-95",
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
