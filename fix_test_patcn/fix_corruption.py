with open('src/hooks/useEditorFormat.ts', 'r') as f:
    text = f.read()

text = text.replace('''    t,
    savedVisualRangeRef,
    focusVisualEditorEnd,
    saveCursorPositionextarea.focus();''', '    textarea.focus();')
text = text.replace('''    t,
    savedVisualRangeRef,
    focusVisualEditorEnd,
    saveCursorPositionemp = document.createElement('div');''', "    temp = document.createElement('div');")

with open('src/hooks/useEditorFormat.ts', 'w') as f:
    f.write(text)
