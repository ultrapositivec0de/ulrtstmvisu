with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
terms = ["isGallerySettingsCollapsed", "gridLayout", "gridWithCaptions", "singleCaptionAlign", "isTextWrapEnabled", "isExifEnabled", "imageInsertFormat", "pexelsSettings", "isTrafficOptimized"]

for term in terms:
    print(f"--- Matches for {term} ---")
    for idx, line in enumerate(text.splitlines()[:2500]):
        if term in line and "const [" in line:
            print(f"Line {idx+1}: {line.strip()[:140]}")
