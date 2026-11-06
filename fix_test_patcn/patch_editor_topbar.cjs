const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'editor', 'EditorPane.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '{/* Editor Mode Toggler Tabs */}';
const endMarker = '{editorMode === \'markdown\' ? (';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers in EditorPane.tsx');
  process.exit(1);
}

// Find the last </div> before the endMarker
const sub = content.substring(startIndex, endIndex);
const lastDiv = sub.lastIndexOf('</div>');

if (lastDiv === -1) {
  console.error('Could not find closing div before editorMode');
  process.exit(1);
}

const replacement = `{/* Editor Top Control Bar (Modes, Fullscreen, Sync, Beautify, Audio, Spacing) */}
      <EditorTopBar
        editorMode={editorMode}
        handleSetEditorMode={handleSetEditorMode}
        isTOCOpen={isTOCOpen}
        setIsTOCOpen={setIsTOCOpen}
        isSourceDrawerOpen={isSourceDrawerOpen}
        setIsSourceDrawerOpen={setIsSourceDrawerOpen}
        isEditorFullScreen={isEditorFullScreen}
        toggleEditorFullScreen={toggleEditorFullScreen}
        onDemandSyncEnabled={onDemandSyncEnabled}
        setOnDemandSyncEnabled={setOnDemandSyncEnabled}
        isLivePreviewEnabled={isLivePreviewEnabled}
        toggleLivePreview={toggleLivePreview}
        beautifyEnabled={beautifyEnabled}
        setBeautifyEnabled={setBeautifyEnabled}
        neonTextColored={neonTextColored}
        setNeonTextColored={setNeonTextColored}
        typingSound={typingSound}
        onOpenAudioPresetsModal={onOpenAudioPresetsModal}
        isSpacingMenuOpen={isSpacingMenuOpen}
        setIsSpacingMenuOpen={setIsSpacingMenuOpen}
        wysiwygSpacing={wysiwygSpacing}
        setWysiwygSpacing={setWysiwygSpacing}
        editorFontSize={editorFontSize}
        setEditorFontSize={setEditorFontSize}
        toolbarIconSize={toolbarIconSize}
        setToolbarIconSize={setToolbarIconSize}
        visualStyle={visualStyle}
        isDarkMode={isDarkMode}
        notify={notify}
        t={t}
      />

      `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(startIndex + lastDiv + 6);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully replaced top bar with EditorTopBar in EditorPane.tsx');
