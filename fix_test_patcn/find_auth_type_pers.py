with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("--- Matches for authType ---")
for idx, line in enumerate(text.splitlines()):
    if 'authType' in line and any(k in line for k in ['localStorage', 'set', 'setAuthType']):
        print(f"Line {idx+1}: {line.strip()[:140]}")
