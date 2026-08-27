with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def blank_out(start, end):
    for i in range(start-1, end):
        lines[i] = '\n'

blank_out(4615, 4643)
blank_out(4575, 4613)
blank_out(4523, 4573)
blank_out(4214, 4473)
blank_out(4050, 4212)
blank_out(3777, 3814)
blank_out(2161, 2304)
blank_out(1053, 1061)

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)
