with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("--- localStorage.setItem related to Auth/Keys in App.tsx ---")
for idx, line in enumerate(text.splitlines()):
    if 'localStorage.setItem' in line and any(k in line for k in ["username", "key", "pixabay", "unsplash"]):
        print(f"Line {idx+1}: {line.strip()[:140]}")
