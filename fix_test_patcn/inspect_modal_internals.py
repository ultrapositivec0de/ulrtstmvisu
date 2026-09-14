import os
import re

modals_dir = 'src/components/modals'
for f in ['PublishModal.tsx', 'TemplatesModal.tsx', 'DraftsModal.tsx', 'SettingsModal.tsx', 'QueueModal.tsx']:
    content = open(os.path.join(modals_dir, f)).read()
    headers = re.findall(r'<div[^>]*className=["\']([^"\']*(?:border-b|p-4|p-5|justify-between)[^"\']*)["\']', content)
    buttons = re.findall(r'<button[^>]*className=["\']([^"\']*(?:bg-cyan|bg-slate|hover:bg)[^"\']*)["\']', content)
    inputs = re.findall(r'<input[^>]*className=["\']([^"\']*)["\']', content)
    
    print(f"=== {f} ===")
    if headers:
        print("  Header:", headers[0][:80])
    if buttons:
        print("  Button:", buttons[0][:80])
    if inputs:
        print("  Input:", inputs[0][:80])
