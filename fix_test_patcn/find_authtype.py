with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for term in ["ImageItem"]:
    print(f"--- Matches for {term} ---")
    for idx, line in enumerate(text.splitlines()[:100]):
        if term in line:
            print(f"Line {idx+1}: {line.strip()[:140]}")
