import os
import re

modals_dir = 'src/components/modals'
for f in sorted(os.listdir(modals_dir)):
    if not f.endswith('.tsx') or f == 'AppModals.tsx':
        continue
    content = open(os.path.join(modals_dir, f)).read()
    
    # Backdrop
    bd = re.findall(r'className=["\']([^"\']*(?:bg-slate-950|bg-black|backdrop-blur)[^"\']*)["\']', content)
    # Outer modal card
    cards = re.findall(r'className=["\']([^"\']*(?:rounded-2xl|rounded-3xl|rounded-\[[^"\']+\]|max-w-)[^"\']*)["\']', content)
    
    print(f"=== {f} ===")
    if bd:
        print("  Backdrop:", bd[0])
    if cards:
        print("  Card:", cards[0])
