with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const scrollCaretIntoView =' in line:
        print(f"scrollCaretIntoView: line {i+1}")
    elif 'const handleEditorScroll =' in line:
        print(f"handleEditorScroll: line {i+1}")
    elif 'const handleEditorKeyDown =' in line:
        print(f"handleEditorKeyDown: line {i+1}")
    elif 'const tryHeadingEnterBreakout =' in line:
        print(f"tryHeadingEnterBreakout: line {i+1}")
    elif 'const handleWysiwygBeforeInput =' in line:
        print(f"handleWysiwygBeforeInput: line {i+1}")
    elif 'const handleWysiwygKeyDown =' in line:
        print(f"handleWysiwygKeyDown: line {i+1}")
