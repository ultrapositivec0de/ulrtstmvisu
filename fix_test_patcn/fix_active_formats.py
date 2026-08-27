import re

with open('src/hooks/useEditorFormat.ts', 'r') as f:
    text = f.read()

pattern = r"  const \[activeFormats, setActiveFormats\] = useState\(\{.*?\n.*?\n.*?\n  \}\);"
new_state = """  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    code: false,
    strikethrough: false,
    sub: false,
    sup: false,
    phishy: false
  });"""

match = re.search(pattern, text, re.DOTALL)
if match:
    text = text.replace(match.group(0), new_state)

with open('src/hooks/useEditorFormat.ts', 'w') as f:
    f.write(text)
