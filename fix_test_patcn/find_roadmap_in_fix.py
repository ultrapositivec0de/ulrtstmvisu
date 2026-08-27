import os
import glob

print("--- Searching for 2.4 inside fix_test_patcn ---")
for root, dirs, files in os.walk('fix_test_patcn'):
    for file in files:
        path = os.path.join(root, file)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if '2.4' in content or 'крок 2.4' in content.lower():
                print(f"File: {path}")
                for idx, line in enumerate(content.splitlines()):
                    if '2.4' in line or 'крок' in line.lower():
                        print(f"  Line {idx+1}: {line.strip()[:140]}")
        except Exception as e:
            pass
