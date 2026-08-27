import os
import glob

print("--- Searching for refactoring roadmap ---")
for path in glob.glob('src/**/*.*', recursive=True) + glob.glob('*.md'):
    if os.path.isdir(path): continue
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        if '2.4' in content or 'крок' in content or 'Крок' in content or 'Step' in content:
            print(f"File: {path}")
            for idx, line in enumerate(content.splitlines()):
                if any(x in line for x in ['2.4', 'крок', 'Крок', 'Step', 'Roadmap', 'план', 'План']):
                    print(f"  Line {idx+1}: {line.strip()[:140]}")
    except Exception as e:
        pass
