with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

def print_block_end(start_idx, end_pattern):
    for i in range(start_idx, len(lines)):
        if lines[i].startswith(end_pattern):
            print(f"{start_idx+1} to {i+1}")
            return

print("saveVisualSelection:")
print_block_end(1855, "  }, [")

print("restoreVisualSelection:")
print_block_end(2014, "  }, [")

print("focusVisualEditorEnd:")
print_block_end(2074, "  }, [")

print("updateWysiwygEmptyStatus:")
print_block_end(2103, "  }, [")

print("updateContentFromWysiwyg:")
print_block_end(2120, "  }, [")

print("syncWysiwygToContentIfVisual:")
print_block_end(2148, "  }, [")

print("getVisualSelectionHtml:")
print_block_end(2307, "  }, [")

print("findDomPositionForMarkdownOffset:")
print_block_end(2324, "  };")

print("syncCursorMarkdownToVisual:")
print_block_end(2604, "  }, [")

print("syncCursorVisualToMarkdown:")
print_block_end(3207, "  }, [")
