with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

for term in ['STORAGE_KEY_TEMPLATES', 'steem_templates_v2', 'STORAGE_KEY_DRAFTS', 'steem_drafts_v2']:
    print(f"--- Matches for {term} ---")
    for idx, line in enumerate(text.splitlines()):
        if term in line:
            print(f"Line {idx+1}: {line.strip()[:140]}")
