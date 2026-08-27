with open('src/App.tsx', 'r') as f:
    content = f.read()

# Pattern to remove from line 3778
hook_code = """  const setActiveFormatsRef = useRef<any>(null);

  const wysiwygSync = useWysiwygSync({
    wysiwygRef,
    editorMode,
    isEditorFocused,
    onDemandSyncEnabled,
    scrollCaretIntoView,
    cursorPositionRef,
    isSyncingRef,
    wysiwygLocalBackupTimeoutRef,
    wysiwygSyncTimeoutRef,
    setActiveFormatsRef,
    t
  });

  const {
    savedVisualRangeRef,
    lastSyncContentRef,
    saveVisualSelection,
    restoreVisualSelection,
    focusVisualEditorEnd,
    updateWysiwygEmptyStatus,
    updateContentFromWysiwyg,
    syncWysiwygToContentIfVisual,
    getVisualSelectionHtml,
    syncCursorMarkdownToVisual,
    syncCursorVisualToMarkdown,
  } = wysiwygSync;"""

content = content.replace(hook_code, "")

# Insert point: right after scrollCaretIntoView
target_anchor = """      if (hasValidRect) {
          const editorRect = editor.getBoundingClientRect();
          const caretTop = rect.top - editorRect.top;
          const visibleHeight = calculateVisibleEditorHeight(editorRect.height, {
              isMobile: window.innerWidth < 1024,
              isKeyboardOpen,
              widgetPos,
              toolbarIconSize,
          });
          
          if (block === 'center') {
              const targetY = editor.scrollTop + caretTop - (visibleHeight / 2) + (rect.height / 2);
              editor.scrollTo({ top: Math.max(0, targetY), behavior: 'auto' });
          } else if (block === 'nearest') {
              if (caretTop < 10) {
                  editor.scrollBy({ top: caretTop - 20, behavior: 'auto' });
              } else if (caretTop + rect.height > visibleHeight) {
                  editor.scrollBy({ top: caretTop + rect.height - visibleHeight + 20, behavior: 'auto' });
              }
          }
      }
  }, [isKeyboardOpen, widgetPos, toolbarIconSize]);"""

replacement = target_anchor + "\n\n" + hook_code

content = content.replace(target_anchor, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Moved useWysiwygSync call up successfully.")
