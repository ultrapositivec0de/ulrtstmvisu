with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def print_bounds(start_line):
    for i, line in enumerate(lines[start_line-1:]):
        if line.startswith('  }, ['):
            print(f"{start_line} - {start_line+i}")
            return
        if line.startswith('  });') and 'activeFormats' in lines[start_line-1]:
            print(f"{start_line} - {start_line+i}")
            return
            
print_bounds(1053)
print_bounds(2161)
print_bounds(3777)
print_bounds(4050)
print_bounds(4214)
print_bounds(4523)
print_bounds(4575)
print_bounds(4615)
