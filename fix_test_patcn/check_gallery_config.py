import sys
import re

with open('src/hooks/useSteemGallery.ts', 'r') as f:
    text = f.read()

match = re.search(r'export interface SteemGalleryConfig {([^}]+)}', text)
if match:
    print(match.group(1))
