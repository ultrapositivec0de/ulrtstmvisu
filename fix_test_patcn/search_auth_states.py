with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

print("--- Auth/Key/Vault state declarations in App.tsx ---")
for idx, line in enumerate(text.splitlines()):
    if any(k in line for k in ["vault", "Pin", "Auth", "username", "steemUser"]) and any(k in line for k in ["useState", "const ["]):
        print(f"Line {idx+1}: {line.strip()[:140]}")
