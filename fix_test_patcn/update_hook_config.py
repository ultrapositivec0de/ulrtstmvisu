with open('src/hooks/useEditorFormat.ts', 'r') as f:
    text = f.read()

text = text.replace('  focusVisualEditorEnd: () => void;', '  focusVisualEditorEnd: () => void;\n  saveCursorPosition: () => void;')
text = text.replace('    focusVisualEditorEnd,', '    focusVisualEditorEnd,\n    saveCursorPosition,')
with open('src/hooks/useEditorFormat.ts', 'w') as f:
    f.write(text)
