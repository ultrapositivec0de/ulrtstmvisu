import os
import re

SRC_DIR = 'src'
FINDINGS = {
    'backdrop_blur': [],
    'hardcoded_slate_bg': [],
    'hardcoded_black_white_opacity': [],
    'hardcoded_colors_without_vars': []
}

def scan_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    for idx, line in enumerate(lines):
        line_num = idx + 1
        
        # Backdrop blur
        if 'backdrop-blur' in line:
            FINDINGS['backdrop_blur'].append((filepath, line_num, line.strip()))

        # Hardcoded dark/light backgrounds that clash across themes
        for match in re.finditer(r'\b(bg-slate-(?:900|950|800)(?:/\d+)?|bg-black(?:/\d+)?|bg-white/\d+)\b', line):
            FINDINGS['hardcoded_slate_bg'].append((filepath, line_num, match.group(0), line.strip()[:100]))

        # Hardcoded text colors
        for match in re.finditer(r'\b(text-slate-[1-9]00|text-white|text-black)\b', line):
            FINDINGS['hardcoded_colors_without_vars'].append((filepath, line_num, match.group(0)))

for root, _, files in os.walk(SRC_DIR):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            scan_file(os.path.join(root, file))

print(f"Total backdrop-blur usages: {len(FINDINGS['backdrop_blur'])}")
print(f"Total hardcoded slate/black/white bg usages: {len(FINDINGS['hardcoded_slate_bg'])}")
print(f"Total hardcoded text slate/white/black usages: {len(FINDINGS['hardcoded_colors_without_vars'])}")

# Write detailed breakdown to audit file
with open('fix_test_patcn/audit_theme_transparency.txt', 'w', encoding='utf-8') as out:
    out.write("=== THEME TRANSPARENCY & HARDCODED COLOR AUDIT ===\n\n")
    out.write(f"1. BACKDROP-BLUR USAGES ({len(FINDINGS['backdrop_blur'])} items):\n")
    for item in FINDINGS['backdrop_blur']:
        out.write(f"  {item[0]}:{item[1]} -> {item[2]}\n")

    out.write(f"\n2. TOP HARDCODED BACKGROUNDS ({len(FINDINGS['hardcoded_slate_bg'])} items):\n")
    # Group by class
    from collections import Counter
    class_counts = Counter([x[2] for x in FINDINGS['hardcoded_slate_bg']])
    for cls, count in class_counts.most_common(25):
        out.write(f"  {cls}: {count} occurrences\n")

    out.write("\nDetailed Samples:\n")
    for item in FINDINGS['hardcoded_slate_bg'][:50]:
        out.write(f"  {item[0]}:{item[1]} [{item[2]}] -> {item[3]}\n")
