with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("--- Matches for images state ---")
for idx, line in enumerate(text.splitlines()):
    if 'const [images' in line or 'setImages(' in line or 'images,' in line:
        print(f"Line {idx+1}: {line.strip()[:140]}")
