with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("--- Matches for queue={ or publishFromQueue={ or setQueue={ ---")
for idx, line in enumerate(text.splitlines()):
    if any(k in line for k in ["queue={", "publishFromQueue={", "setQueue={"]):
        print(f"Line {idx+1}: {line.strip()[:140]}")
