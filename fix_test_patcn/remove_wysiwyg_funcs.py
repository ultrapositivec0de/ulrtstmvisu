with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def check_lines(start, end, desc):
    print(f"--- {desc} ({start}-{end}) ---")
    print("START:", repr(lines[start-1]))
    print("END:", repr(lines[end-1]))

check_lines(1856, 1960, "saveVisualSelection")
check_lines(2015, 2073, "restoreVisualSelection")
check_lines(2075, 2092, "focusVisualEditorEnd")
check_lines(2094, 2117, "updateWysiwygEmptyStatus")
check_lines(2119, 2159, "updateContentFromWysiwyg & syncWysiwygToContentIfVisual")
check_lines(2308, 2323, "getVisualSelectionHtml")
check_lines(2325, 2603, "findDomPositionForMarkdownOffset")
check_lines(2605, 2849, "syncCursorMarkdownToVisual")
check_lines(3208, 3307, "syncCursorVisualToMarkdown")
