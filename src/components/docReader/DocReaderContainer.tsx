import React, { useEffect } from 'react';
import { useDocReader } from './useDocReader';
import { DocReaderContent } from './DocReaderContent';
import { DocReaderTOC } from './DocReaderTOC';
import { DocReaderSourceDrawer } from './DocReaderSourceDrawer';
import { cn } from '../../lib/utils';

export interface DocReaderContainerProps {
  currentEditorContent: string;
  currentEditorTitle: string;
  currentEditorTags?: string;
  drafts?: any[];
  onLoadIntoEditor?: (title: string, tags: string, content: string) => void;
  onSwitchToEditMode?: (mode?: 'visual' | 'markdown') => void;
  onExitReadingMode: () => void;
  isTOCOpen?: boolean;
  setIsTOCOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  isSourceDrawerOpen?: boolean;
  setIsSourceDrawerOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  isDarkMode?: boolean;
  visualStyle?: string;
  editorFontSize?: number;
  wysiwygSpacing?: number;
  beautifyEnabled?: boolean;
}

export const DocReaderContainer: React.FC<DocReaderContainerProps> = ({
  currentEditorContent,
  currentEditorTitle,
  currentEditorTags,
  drafts,
  onLoadIntoEditor,
  onSwitchToEditMode,
  isTOCOpen = false,
  setIsTOCOpen,
  isSourceDrawerOpen = false,
  setIsSourceDrawerOpen,
  isDarkMode = true,
  visualStyle = 'dark',
  editorFontSize = 16,
  wysiwygSpacing = 1.6,
  beautifyEnabled = false
}) => {
  const {
    source,
    selectCurrentDocument,
    selectDraft,
    selectLocalFile,
    headings,
    activeHeadingId,
    scrollContainerRef,
    handleScroll,
    scrollToHeading,
    handleEditCurrentSource
  } = useDocReader({
    currentEditorContent,
    currentEditorTitle,
    currentEditorTags,
    drafts,
    onLoadIntoEditor,
    onSwitchToEditMode
  });

  // Esc key listener to close drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTOCOpen && setIsTOCOpen) setIsTOCOpen(false);
        else if (isSourceDrawerOpen && setIsSourceDrawerOpen) setIsSourceDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTOCOpen, setIsTOCOpen, isSourceDrawerOpen, setIsSourceDrawerOpen]);

  const drawerTheme = (visualStyle === 'neon' || isDarkMode) ? 'dark' : 'paper';

  return (
    <div 
      className={cn(
        "flex-1 flex flex-col h-full w-full overflow-hidden select-text transition-colors duration-200 relative",
        visualStyle === 'neon' ? "bg-slate-950 text-slate-100" : (isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")
      )}
    >
      {/* Scrollable Document Content */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        <DocReaderContent
          title={source.title}
          tags={source.tags}
          content={source.content}
          headings={headings}
          isDarkMode={isDarkMode}
          visualStyle={visualStyle}
          editorFontSize={editorFontSize}
          wysiwygSpacing={wysiwygSpacing}
          beautifyEnabled={beautifyEnabled}
        />
      </div>

      {/* Drawers */}
      <DocReaderTOC
        isOpen={isTOCOpen}
        onClose={() => setIsTOCOpen && setIsTOCOpen(false)}
        headings={headings}
        activeHeadingId={activeHeadingId}
        onSelectHeading={scrollToHeading}
        theme={drawerTheme}
      />

      <DocReaderSourceDrawer
        isOpen={isSourceDrawerOpen}
        onClose={() => setIsSourceDrawerOpen && setIsSourceDrawerOpen(false)}
        source={source}
        drafts={drafts || []}
        onSelectCurrent={selectCurrentDocument}
        onSelectDraft={selectDraft}
        onSelectLocalFile={selectLocalFile}
        onEditDocument={handleEditCurrentSource}
        theme={drawerTheme}
      />
    </div>
  );
};
