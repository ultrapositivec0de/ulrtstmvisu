with open('src/App.tsx', 'r') as f:
    text = f.read()

insert_str = """
  const editorFormat = useEditorFormat({
    editorRef,
    wysiwygRef,
    editorMode,
    getSelectionOrWord,
    getVisualSelectionHtml,
    restoreVisualSelection,
    updateContentFromWysiwyg,
    promptDialog,
    t,
    savedVisualRangeRef,
    focusVisualEditorEnd,
    saveCursorPosition
  });

  const {
    activeFormats, setActiveFormats,
    insertHtmlAtCursor, insertAtCursor,
    handleMarkdownFormat, fmt, fmtLine,
    handleLink, handleIndent
  } = editorFormat;
"""

# Insert after getSelectionOrWord
import re
pattern = r"  const getSelectionOrWord = useCallback\(\(\) => \{.*?\n  \}, \[\]\);"
match = re.search(pattern, text, re.DOTALL)
if match:
    text = text.replace(match.group(0), match.group(0) + insert_str)
else:
    print("Could not find getSelectionOrWord")

with open('src/App.tsx', 'w') as f:
    f.write(text)
