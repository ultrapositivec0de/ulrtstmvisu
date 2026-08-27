with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const saveVisualSelection =' in line:
        print(f"saveVisualSelection: line {i+1}")
    elif 'const restoreVisualSelection =' in line:
        print(f"restoreVisualSelection: line {i+1}")
    elif 'const focusVisualEditorEnd =' in line:
        print(f"focusVisualEditorEnd: line {i+1}")
    elif 'const updateWysiwygEmptyStatus =' in line:
        print(f"updateWysiwygEmptyStatus: line {i+1}")
    elif 'const updateContentFromWysiwyg =' in line:
        print(f"updateContentFromWysiwyg: line {i+1}")
    elif 'const syncWysiwygToContentIfVisual =' in line:
        print(f"syncWysiwygToContentIfVisual: line {i+1}")
    elif 'const getVisualSelectionHtml =' in line:
        print(f"getVisualSelectionHtml: line {i+1}")
    elif 'const findDomPositionForMarkdownOffset =' in line:
        print(f"findDomPositionForMarkdownOffset: line {i+1}")
    elif 'const syncCursorMarkdownToVisual =' in line:
        print(f"syncCursorMarkdownToVisual: line {i+1}")
    elif 'const syncCursorVisualToMarkdown =' in line:
        print(f"syncCursorVisualToMarkdown: line {i+1}")
