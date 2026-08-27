import sys
with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def print_func(start_line):
    for i, line in enumerate(lines[start_line-1:]):
        print(f"{start_line+i}: {line.rstrip()[:120]}")
        if line.startswith('  }, ['):
            return

print_func(1053)
print_func(2161)
print_func(3763)
print_func(3777)
print_func(4050)
print_func(4214)
print_func(4523)
print_func(4575)
print_func(4615)
