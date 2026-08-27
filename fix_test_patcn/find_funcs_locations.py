with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for term in ["const performBroadcast =", "const publishFromQueue =", "const addToQueue ="]:
    print(f"--- Matches for {term} ---")
    for idx, line in enumerate(text.splitlines()):
        if term in line:
            print(f"Line {idx+1}: {line.strip()[:140]}")
