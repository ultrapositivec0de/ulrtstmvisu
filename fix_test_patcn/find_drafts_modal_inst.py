with open('src/components/modals/AppModals.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

for idx, line in enumerate(text.splitlines()):
    if '<DraftsModal' in line:
        print(f"Line {idx+1}: {line.strip()[:140]}")
        # print next 15 lines
        for l in text.splitlines()[idx:idx+20]:
            print("  " + l.strip()[:120])
