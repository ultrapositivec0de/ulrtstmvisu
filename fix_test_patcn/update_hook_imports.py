with open('src/hooks/useEditorFormat.ts', 'r') as f:
    text = f.read()

import_stmt = "import { getMarked, getAllFormatRangesInLine, FormatRange } from '../App';\n"
if "import { getMarked" not in text:
    text = text.replace("import { useEditorStore } from '../store';", "import { useEditorStore } from '../store';\n" + import_stmt)

with open('src/hooks/useEditorFormat.ts', 'w') as f:
    f.write(text)
