with open('src/components/modals/AppModals.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

for idx, line in enumerate(text.splitlines()):
    if 'currentDraftId,' in line:
        print(f"Line {idx+1}: {line.strip()[:140]}")
        # print next 10 lines
        for l in text.splitlines()[idx:idx+15]:
            print("  " + l.strip()[:120])
