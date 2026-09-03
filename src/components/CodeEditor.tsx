import React, { forwardRef, useEffect, useRef } from 'react';
import { useEditorStore, getRowColFromOffset } from '../store';
import { calculateVisibleEditorHeight, getExactCaretYInTextarea } from '../lib/viewportLayout';

interface CodeEditorProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  selectionStart?: number | null;
  selectionEnd?: number | null;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onDemandSyncEnabled?: boolean;
  widgetPos?: string;
  isKeyboardOpen?: boolean;
  keyboardOffset?: number | null;
  toolbarIconSize?: number;
}

export const CodeEditor = forwardRef<HTMLTextAreaElement, CodeEditorProps>((props, ref) => {
  const content = useEditorStore((state) => state.content);
  const selectionStart = useEditorStore((state) => state.selectionStart);
  const selectionEnd = useEditorStore((state) => state.selectionEnd);

  const syncTimeoutRef = useRef<any>(null);
  const localSaveTimeoutRef = useRef<any>(null);

  const latestContentRef = useRef(content);
  const latestSelectionStartRef = useRef(selectionStart);
  const latestSelectionEndRef = useRef(selectionEnd);

  useEffect(() => {
    if (localRef.current && localRef.current.value !== content) {
      const prevStart = localRef.current.selectionStart;
      const prevEnd = localRef.current.selectionEnd;
      localRef.current.value = content;
      if (document.activeElement === localRef.current && prevStart !== null && prevEnd !== null) {
        const safeStart = Math.min(prevStart, content.length);
        const safeEnd = Math.min(prevEnd, content.length);
        localRef.current.setSelectionRange(safeStart, safeEnd);
      }
    }
    latestContentRef.current = content;
  }, [content]);

  useEffect(() => {
    latestSelectionStartRef.current = selectionStart;
  }, [selectionStart]);

  useEffect(() => {
    latestSelectionEndRef.current = selectionEnd;
  }, [selectionEnd]);

  // Use a local ref if an external one is not provided, or merge them.
  // To keep it simple, we'll assume the parent always passes a ref.
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);
  
  const handleRef = (el: HTMLTextAreaElement | null) => {
    localRef.current = el;
    if (el) {
      const storeState = useEditorStore.getState();
      const sStart = storeState.selectionStart;
      const sEnd = storeState.selectionEnd;
      if (typeof sStart === 'number' && typeof sEnd === 'number') {
        try {
          el.setSelectionRange(sStart, sEnd);
        } catch {
          // ignore
        }
      }
    }
    if (typeof ref === 'function') {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
  };

  React.useEffect(() => {
    if (!localRef.current) return;
    if (selectionStart !== null && selectionEnd !== null && selectionStart !== undefined && selectionEnd !== undefined) {
      if (localRef.current.selectionStart !== selectionStart || localRef.current.selectionEnd !== selectionEnd) {
        localRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }, [selectionStart, selectionEnd]);

  // Flush any pending/debounced changes to the store immediately
  const flushChanges = (target: HTMLTextAreaElement) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    const val = target.value;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const pos = getRowColFromOffset(val, start);
    
    const currentStore = useEditorStore.getState();
    if (currentStore.content !== val || currentStore.selectionStart !== start || currentStore.selectionEnd !== end) {
      useEditorStore.setState({
        content: val,
        cursor: pos,
        selectionStart: start,
        selectionEnd: end
      });
    }
  };

  // Sync on unmount to make sure we don't lose any last keystrokes
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
      const val = latestContentRef.current;
      const start = latestSelectionStartRef.current;
      const end = latestSelectionEndRef.current;
      const pos = getRowColFromOffset(val, start ?? 0);
      
      const currentStore = useEditorStore.getState();
      if (currentStore.content !== val || currentStore.selectionStart !== start || currentStore.selectionEnd !== end) {
        useEditorStore.setState({
          content: val,
          cursor: pos,
          selectionStart: start,
          selectionEnd: end
        });
      }
    };
  }, []);

  // Synchronously flush changes to the store before reload/unload so they are not lost
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (localRef.current) {
        flushChanges(localRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const ensureCaretVisibleInView = (target: HTMLTextAreaElement) => {
    if (!target) return;
    const isMobile = window.innerWidth < 1024;
    const visibleHeight = calculateVisibleEditorHeight(target.clientHeight, {
      isMobile,
      isKeyboardOpen: !!props.isKeyboardOpen,
      keyboardOffset: props.keyboardOffset || 0,
      widgetPos: props.widgetPos || 'bottom',
      toolbarIconSize: props.toolbarIconSize || 18,
    });

    const caretY = getExactCaretYInTextarea(target, target.selectionStart);
    const caretRelativeY = caretY - target.scrollTop;

    if (caretRelativeY > visibleHeight - 20) {
      target.scrollTop = caretY - visibleHeight + 35;
    } else if (caretRelativeY < 15) {
      target.scrollTop = Math.max(0, caretY - 25);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    requestAnimationFrame(() => {
      if (localRef.current) {
        ensureCaretVisibleInView(localRef.current);
      }
    });

    if (props.onKeyDown) {
      props.onKeyDown(e);
      if (e.defaultPrevented) return;
    }

    if (e.key === 'Enter') {
      const target = e.target as HTMLTextAreaElement;
      const val = target.value;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      if (start === end) {
        // Find if cursor is inside an unclosed <div class="(phishy|text-blue|text-green)"> block
        const phishyOpen = val.lastIndexOf('<div class="phishy">', start);
        const blueOpen = val.lastIndexOf('<div class="text-blue">', start);
        const greenOpen = val.lastIndexOf('<div class="text-green">', start);
        const lastOpen = Math.max(phishyOpen, blueOpen, greenOpen);

        if (lastOpen !== -1) {
          const lastClose = val.lastIndexOf('</div>', start);
          if (lastClose === -1 || lastClose < lastOpen) {
            const nextClose = val.indexOf('</div>', start);
            const nextOpenPhishy = val.indexOf('<div class="phishy">', start);
            const nextOpenBlue = val.indexOf('<div class="text-blue">', start);
            const nextOpenGreen = val.indexOf('<div class="text-green">', start);
            const validNextOpens = [nextOpenPhishy, nextOpenBlue, nextOpenGreen].filter((idx) => idx !== -1);
            const nextOpen = validNextOpens.length > 0 ? Math.min(...validNextOpens) : -1;

            if (nextClose !== -1 && (nextOpen === -1 || nextClose < nextOpen)) {
              // Check if current line up to cursor is empty (only whitespace since last newline)
              let lineStart = start - 1;
              while (lineStart >= 0 && val[lineStart] !== '\n') {
                lineStart--;
              }
              const charsBeforeCursorOnLine = val.slice(lineStart + 1, start);
              const isLineEmptyBeforeCursor = /^[ \t\r]*$/.test(charsBeforeCursorOnLine);

              // Check if line after cursor up to next newline is also empty (or reaches </div>)
              let lineEnd = start;
              while (lineEnd < val.length && val[lineEnd] !== '\n') {
                lineEnd++;
              }
              const charsAfterCursorOnLine = val.slice(start, lineEnd);
              const isLineEmptyAfterCursor =
                /^[ \t\r]*$/.test(charsAfterCursorOnLine) || charsAfterCursorOnLine.trim().startsWith('</div>');

              if (isLineEmptyBeforeCursor && isLineEmptyAfterCursor) {
                // Determine opening tag
                const openMatch = val.slice(lastOpen).match(/^<div class="([^"]+)">/);
                const tagType = openMatch ? openMatch[0] : '<div class="phishy">';

                // Check if there is content before current line in the div
                const contentBeforeLine = val
                  .slice(lastOpen + tagType.length, lineStart >= 0 ? lineStart : start)
                  .replace(/[\u200B\r\n\s]/g, '');

                // Text after cursor before closing tag
                const textAfterCursorBeforeClose = val.slice(lineEnd, nextClose).trim();

                if (contentBeforeLine.length > 0) {
                  // Exit the div!
                  e.preventDefault();

                  const cleanBefore = val.slice(0, lineStart >= 0 ? lineStart : start).replace(/[\r\n\s]+$/, '');
                  let newVal = cleanBefore + '\n</div>\n\n';
                  const newStart = newVal.length;

                  if (textAfterCursorBeforeClose.length > 0) {
                    newVal += `${tagType}\n\n${textAfterCursorBeforeClose}\n</div>\n\n` + val.slice(nextClose + '</div>'.length).replace(/^[\r\n]+/, '');
                  } else {
                    newVal += val.slice(nextClose + '</div>'.length).replace(/^[\r\n]+/, '');
                  }

                  target.value = newVal;
                  target.setSelectionRange(newStart, newStart);
                  flushChanges(target);
                  return;
                } else if (textAfterCursorBeforeClose.length === 0) {
                  // The div is completely empty: exit and remove empty div
                  e.preventDefault();
                  const cleanBefore = val.slice(0, lastOpen).replace(/[\r\n\s]+$/, '');
                  const cleanAfter = val.slice(nextClose + '</div>'.length).replace(/^[\r\n]+/, '');
                  const newVal = (cleanBefore ? cleanBefore + '\n\n' : '') + cleanAfter;
                  const newStart = (cleanBefore ? cleanBefore + '\n\n' : '').length;

                  target.value = newVal;
                  target.setSelectionRange(newStart, newStart);
                  flushChanges(target);
                  return;
                }
              }
            }
          }
        }
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const pos = getRowColFromOffset(val, start);

    latestContentRef.current = val;
    latestSelectionStartRef.current = start;
    latestSelectionEndRef.current = end;
    
    // Debounce Zustand update
    const syncDelay = 100;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      useEditorStore.setState({
        content: val,
        cursor: pos,
        selectionStart: start,
        selectionEnd: end
      });
    }, syncDelay);

    // Fast debounced save directly to localStorage to prevent any data loss on refresh/unload
    const STORAGE_KEY_AUTOSAVE = 'steem_autosave_temp';
    
    const backupDelay = props.onDemandSyncEnabled === false ? 350 : 1500;
    if (localSaveTimeoutRef.current) clearTimeout(localSaveTimeoutRef.current);
    localSaveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_AUTOSAVE, val);
        localStorage.setItem('steem_editor_cursor', JSON.stringify({ start, end }));
        localStorage.setItem('steem_visual_html_is_stale', 'true');
      } catch (err) {
        console.warn('Failed to save content and cursor to localStorage', err);
      }
    }, backupDelay);

    if (props.onChange) {
      props.onChange(e);
    }

    requestAnimationFrame(() => {
      ensureCaretVisibleInView(e.target);
    });
  };

  const updateCursorAndSelection = (target: HTMLTextAreaElement) => {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    
    latestSelectionStartRef.current = start;
    latestSelectionEndRef.current = end;

    const currentStore = useEditorStore.getState();
    if (currentStore.selectionStart === start && currentStore.selectionEnd === end) {
      return; // No change in selection or cursor, avoid useless re-render
    }

    const pos = getRowColFromOffset(target.value, start);
    
    // Save cursor position immediately on selection change (clicks/arrows/focus)
    try {
      localStorage.setItem('steem_editor_cursor', JSON.stringify({ start, end }));
    } catch (err) {
      console.warn('Failed to save cursor to localStorage', err);
    }

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      useEditorStore.setState({
        cursor: pos,
        selectionStart: start,
        selectionEnd: end
      });
    }, 100);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    updateCursorAndSelection(e.currentTarget);
    if (props.onSelect) {
      props.onSelect(e);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    updateCursorAndSelection(e.currentTarget);
    if (props.onKeyUp) {
      props.onKeyUp(e);
    }
    requestAnimationFrame(() => {
      ensureCaretVisibleInView(e.currentTarget);
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    updateCursorAndSelection(e.currentTarget);
    if (props.onClick) {
      props.onClick(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    flushChanges(e.currentTarget);
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  const {
    onChange,
    onSelect,
    onKeyUp,
    onClick,
    onBlur,
    onDemandSyncEnabled,
    widgetPos,
    isKeyboardOpen,
    keyboardOffset,
    toolbarIconSize,
    ...rest
  } = props;

  return (
    <textarea
      ref={handleRef}
      defaultValue={content}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onSelect={handleSelect}
      onKeyUp={handleKeyUp}
      onClick={handleClick}
      onBlur={handleBlur}
      {...rest}
    />
  );
});
CodeEditor.displayName = 'CodeEditor';

