with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

print("--- useState declarations in App.tsx ---")
for idx, line in enumerate(text.splitlines()):
    if 'useState' in line and ('const [' in line or 'useState<' in line):
        print(f"Line {idx+1}: {line.strip()[:140]}")
