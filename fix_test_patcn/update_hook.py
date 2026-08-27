import sys
with open('src/hooks/useEditorFormat.ts', 'r') as f:
    text = f.read()

text = text.replace('  editorRef: React.RefObject<HTMLTextAreaElement>;', '  editorRef: React.RefObject<HTMLTextAreaElement>;\n  savedVisualRangeRef: React.MutableRefObject<Range | null>;\n  focusVisualEditorEnd: () => void;')
text = text.replace('    editorMode,', '    editorMode,\n    savedVisualRangeRef,\n    focusVisualEditorEnd,')

import re
old_insert = re.search(r'  const insertHtmlAtCursor = useCallback.*?updateContentFromWysiwyg\(true\);\n    }\n  }, \[.*?\]\);', text, re.DOTALL)

with open('fix_test_patcn/insert_html.txt', 'r') as f:
    new_insert = f.read()

text = text.replace(old_insert.group(0), new_insert.strip())
with open('src/hooks/useEditorFormat.ts', 'w') as f:
    f.write(text)
