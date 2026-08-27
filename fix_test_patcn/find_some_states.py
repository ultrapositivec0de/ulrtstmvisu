with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for term in ["removeTitleLine", "pubTitle", "pubTags", "setPubLog", "setActiveModal"]:
    print(f"--- Matches for {term} ---")
    for idx, line in enumerate(text.splitlines()):
        if any(w in line for w in ["useState", "const ["]) and term in line:
            print(f"Line {idx+1}: {line.strip()[:140]}")
