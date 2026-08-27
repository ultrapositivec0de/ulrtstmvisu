with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def blank_out(start, end):
    for i in range(start-1, end):
        lines[i] = '\n'

# Blank out extracted functions in App.tsx
blank_out(1854, 1960) # savedVisualRangeRef & saveVisualSelection
blank_out(2015, 2073) # restoreVisualSelection
blank_out(2075, 2092) # focusVisualEditorEnd
blank_out(2094, 2117) # isWysiwygContentEmpty & updateWysiwygEmptyStatus
blank_out(2119, 2159) # lastSyncContentRef, updateContentFromWysiwyg & syncWysiwygToContentIfVisual
blank_out(2308, 2323) # getVisualSelectionHtml
blank_out(2325, 2603) # findDomPositionForMarkdownOffset
blank_out(2605, 2849) # syncCursorMarkdownToVisual
blank_out(3208, 3307) # syncCursorVisualToMarkdown

app_content = "".join(lines)

# Add import statement
if 'import { useWysiwygSync }' not in app_content:
    app_content = app_content.replace(
        'import { useEditorFormat } from "./hooks/useEditorFormat";',
        'import { useEditorFormat } from "./hooks/useEditorFormat";\nimport { useWysiwygSync } from "./hooks/useWysiwygSync";'
    )

# Wire up hook call before useEditorFormat
old_hook_call = """  const editorFormat = useEditorFormat({"""

new_hook_call = """  const setActiveFormatsRef = useRef<any>(null);

  const wysiwygSync = useWysiwygSync({
    wysiwygRef,
    editorMode,
    isEditorFocused,
    onDemandSyncEnabled,
    scrollCaretIntoView,
    cursorPositionRef,
    isSyncingRef,
    wysiwygLocalBackupTimeoutRef,
    wysiwygSyncTimeoutRef,
    setActiveFormatsRef,
    t
  });

  const {
    savedVisualRangeRef,
    lastSyncContentRef,
    saveVisualSelection,
    restoreVisualSelection,
    focusVisualEditorEnd,
    updateWysiwygEmptyStatus,
    updateContentFromWysiwyg,
    syncWysiwygToContentIfVisual,
    getVisualSelectionHtml,
    syncCursorMarkdownToVisual,
    syncCursorVisualToMarkdown,
  } = wysiwygSync;

  const editorFormat = useEditorFormat({"""

if old_hook_call in app_content:
    app_content = app_content.replace(old_hook_call, new_hook_call)
    
    # Also assign setActiveFormatsRef.current = setActiveFormats after handleIndent
    old_destruct = """    handleLink, handleIndent
  } = editorFormat;"""
    new_destruct = """    handleLink, handleIndent
  } = editorFormat;

  setActiveFormatsRef.current = setActiveFormats;"""
    app_content = app_content.replace(old_destruct, new_destruct)

with open('src/App.tsx', 'w') as f:
    f.write(app_content)

print("Extraction applied successfully.")
