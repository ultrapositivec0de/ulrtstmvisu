import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def get_end(start_line):
    for i, line in enumerate(lines[start_line-1:]):
        if line.startswith('  }, ['):
            print(f"End for {start_line}: {start_line+i}")
            return
        if line.startswith('  });') and 'activeFormats' in lines[start_line-1]:
            print(f"End for {start_line}: {start_line+i}")
            return
get_end(1053)
get_end(2161)
get_end(3777)
get_end(4050)
get_end(4214)
get_end(4523)
get_end(4575)
get_end(4615)
