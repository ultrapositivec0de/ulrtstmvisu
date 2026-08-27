with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

for term in [
    "const [images", 
    "const [sourceInput", 
    "const [isGalleryCollapsed", 
    "const parseImages",
    "const toggleImageSelection",
    "const moveImageLocal",
    "const insertExternalImage",
    "const insertImage",
    "const insertGrid",
    "const uploadExternalImage",
    "const handleFileUpload"
]:
    print(f"--- Matches for {term} ---")
    for idx, line in enumerate(text.splitlines()):
        if term in line:
            print(f"Line {idx+1}: {line.strip()[:140]}")
