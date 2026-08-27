import sys
import re

with open('src/App.tsx', 'r') as f:
    app_text = f.read()
    
with open('src/hooks/useEditorFormat.ts', 'r') as f:
    hook_text = f.read()

def get_block(start_line, end_line):
    lines = app_text.split('\n')
    return '\n'.join(lines[start_line-1:end_line])

def replace_in_hook(func_name, new_code):
    global hook_text
    # Find the bounds of func_name in hook_text
    pattern = r"  const " + func_name + r" = useCallback\(.*?\n  \}, \[.*?\]\);"
    match = re.search(pattern, hook_text, re.DOTALL)
    if match:
        hook_text = hook_text.replace(match.group(0), new_code)
    else:
        print(f"Could not find {func_name} in hook")

replace_in_hook('handleMarkdownFormat', get_block(4050, 4212))
replace_in_hook('insertAtCursor', get_block(3777, 3814))
replace_in_hook('fmt', get_block(4214, 4473))
replace_in_hook('fmtLine', get_block(4523, 4573))
replace_in_hook('handleLink', get_block(4575, 4613))
replace_in_hook('handleIndent', get_block(4615, 4643))

with open('src/hooks/useEditorFormat.ts', 'w') as f:
    f.write(hook_text)
