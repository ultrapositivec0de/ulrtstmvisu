with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

print("--- Matches for setQueue ---")
for idx, line in enumerate(text.splitlines()):
    if 'setQueue' in line:
        print(f"Line {idx+1}: {line.strip()[:140]}")
