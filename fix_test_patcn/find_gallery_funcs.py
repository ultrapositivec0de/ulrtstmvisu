with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("--- Gallery/Image functions in App.tsx ---")
for idx, line in enumerate(text.splitlines()):
    if 'const' in line and any(k in line for k in ['Pexels', 'Pixabay', 'Unsplash', 'Gallery', 'Image', 'upload']) and '=>' in line:
        print(f"Line {idx+1}: {line.strip()[:140]}")
