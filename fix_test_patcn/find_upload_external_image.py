with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("--- Matches for uploadExternalImage ---")
for idx, line in enumerate(text.splitlines()):
    if 'uploadExternalImage' in line:
        print(f"Line {idx+1}: {line.strip()[:140]}")
