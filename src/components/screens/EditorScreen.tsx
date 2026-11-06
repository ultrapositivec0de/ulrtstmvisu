import React from 'react';
import { cn } from '../../lib/utils';
import { Sidebar, type SidebarProps } from '../sidebar/Sidebar';
import { EditorPane, type EditorPaneProps } from '../editor/EditorPane';
import { PreviewPane } from '../editor/PreviewPane';
import { DesktopStatsFooter } from '../editor/StatusBar';
import { MobileBottomBar } from '../common/MobileBottomBar';
import { type TranslationKey } from '../../locales';
import { Language } from '../../types';

export interface EditorScreenProps {
  isVisible: boolean;
  sidebarProps: SidebarProps;
  editorPaneProps: EditorPaneProps;

  // Layout & UI
  isEditorFullScreen: boolean;
  isFullScreen: boolean;
  visualStyle: 'default' | 'neon' | 'glass' | 'standard';
  isDarkMode: boolean;
  editorMode: string;
  previewRef: React.RefObject<HTMLDivElement | null>;
  previewPaneRef: React.RefObject<HTMLDivElement | null>;
  activeMobileTab: 'editor' | 'preview';
  setActiveMobileTab: (tab: 'editor' | 'preview') => void;
  isLivePreviewEnabled: boolean;
  toggleLivePreview: () => void;
  syncScrollEnabled: boolean;
  setSyncScrollEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  toggleFullScreen: () => void;
  widgetPos: string;
  lang: Language;
  pubTitle: string;
  setPubTitle: (title: string) => void;
  activeModal: string | null;
  setActiveModal: (m: string | null) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setSettingsTab: (tab: 'general' | 'gallery' | 'vault' | 'keys' | 'about' | 'pwa') => void;
  isKeyboardOpen: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: (key: TranslationKey) => string;
}

export const EditorScreen: React.FC<EditorScreenProps> = ({
  isVisible,
  sidebarProps,
  editorPaneProps,
  isEditorFullScreen,
  isFullScreen,
  visualStyle,
  isDarkMode,
  editorMode,
  previewRef,
  previewPaneRef,
  activeMobileTab,
  setActiveMobileTab,
  isLivePreviewEnabled,
  toggleLivePreview,
  syncScrollEnabled,
  setSyncScrollEnabled,
  toggleFullScreen,
  widgetPos,
  lang,
  pubTitle,
  setPubTitle,
  activeModal,
  setActiveModal,
  isSidebarOpen,
  setIsSidebarOpen,
  setSettingsTab,
  isKeyboardOpen,
  fileInputRef,
  handleFileUpload,
  t,
}) => {
  return (
    <>
      <div className={cn("flex-1 overflow-hidden flex", !isVisible && "hidden")}>
        {/* Sidebar */}
        <Sidebar {...sidebarProps} />

        {/* Main Editor Pane Container */}
        <main 
          className="flex-1 flex flex-col min-w-0 bg-slate-950 relative transition-all"
          style={{
            paddingBottom: (isEditorFullScreen || isFullScreen) ? '0px' : 'var(--app-content-bottom-padding, 0px)'
          }}
        >
          <div className="flex-1 flex overflow-hidden">
            {/* Markdown / Visual / Reader Editor Pane */}
            <EditorPane {...editorPaneProps} />

            {/* Preview Pane */}
            <PreviewPane
              editorMode={editorMode}
              previewRef={previewRef}
              previewPaneRef={previewPaneRef}
              activeMobileTab={activeMobileTab}
              isLivePreviewEnabled={isLivePreviewEnabled}
              isFullScreen={isFullScreen}
              toggleLivePreview={toggleLivePreview}
              syncScrollEnabled={syncScrollEnabled}
              setSyncScrollEnabled={setSyncScrollEnabled}
              toggleFullScreen={toggleFullScreen}
              widgetPos={widgetPos}
              lang={lang}
              t={t}
            />
          </div>

          {/* Desktop Status Bar Footer */}
          <DesktopStatsFooter
            t={t}
            visualStyle={visualStyle as any}
            isDarkMode={isDarkMode}
            isEditorFullScreen={isEditorFullScreen}
            isFullScreen={isFullScreen}
          />
        </main>
      </div>

      {/* Mobile Bottom Navigation (Editor only) */}
      {isVisible && (
        <MobileBottomBar
          isEditorFullScreen={isEditorFullScreen}
          isFullScreen={isFullScreen}
          isKeyboardOpen={isKeyboardOpen}
          activeMobileTab={activeMobileTab}
          setActiveMobileTab={setActiveMobileTab}
          visualStyle={visualStyle as any}
          pubTitle={pubTitle}
          setPubTitle={setPubTitle}
          activeModal={activeModal}
          setActiveModal={setActiveModal}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          setSettingsTab={setSettingsTab}
          t={t}
        />
      )}

      {/* Hidden File Input for local image uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        multiple 
        onChange={handleFileUpload} 
      />
    </>
  );
};
