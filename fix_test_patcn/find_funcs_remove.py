import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def get_block(start_str):
    for i, line in enumerate(lines):
        if line.startswith(start_line):
            start = i
            break
