with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def print_block(name, start_line, end_pattern):
    for i in range(start_line - 1, len(lines)):
        if lines[i].startswith(end_pattern):
            print(f"{name}: lines {start_line} to {i+1}")
            return

print_block("scrollCaretIntoView", 1964, "  }, [")
print_block("handleEditorScroll", 3766, "  }, [")
print_block("handleEditorKeyDown", 3936, "  }, [")
print_block("tryHeadingEnterBreakout", 4703, "  }, [")
print_block("handleWysiwygBeforeInput", 4890, "  }, [")
print_block("handleWysiwygKeyDown", 4898, "  }, [")
