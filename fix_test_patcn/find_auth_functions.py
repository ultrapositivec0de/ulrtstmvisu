with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Look for function definitions or const = () => ... containing 'vault' or 'Pin' or 'key' or 'Auth'
print("--- Functions related to Vault/Auth/Security in App.tsx ---")
for idx, line in enumerate(text.splitlines()):
    if any(k in line for k in ["initVault", "unlockVault", "lockVault", "addVaultAccount", "removeVaultAccount", "deleteVault"]) or ("const" in line and any(k in line for k in ["Vault", "Key", "Auth"]) and "=>" in line):
        print(f"Line {idx+1}: {line.strip()[:140]}")
