import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
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
  const initialState = useEditorStore.getState();
  const initialContentRef = useRef(initialState.content);

  const syncContentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncCursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caretRafRef = useRef<number | null>(null);
  const caretThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCaretCheckTimeRef = useRef<number>(0);

  const latestContentRef = useRef(initialState.content);
  const latestSelectionStartRef = useRef(initialState.selectionStart);
  const latestSelectionEndRef = useRef(initialState.selectionEnd);

  // Use a local ref if an external one is not provided, or merge them.
  // To keep it simple, we'll assume the parent always passes a ref.
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);
  const hydratedElementRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      if (state.content !== prevState.content) {
        if (localRef.current && localRef.current.value !== state.content) {
          const prevStart = localRef.current.selectionStart;
          const prevEnd = localRef.current.selectionEnd;
          localRef.current.value = state.content;
          if (document.activeElement === localRef.current && prevStart !== null && prevEnd !== null) {
            const safeStart = Math.min(prevStart, state.content.length);
            const safeEnd = Math.min(prevEnd, state.content.length);
            localRef.current.setSelectionRange(safeStart, safeEnd);
          }
        }
        latestContentRef.current = state.content;
      }

      if (state.selectionStart !== prevState.selectionStart || state.selectionEnd !== prevState.selectionEnd) {
        latestSelectionStartRef.current = state.selectionStart;
        latestSelectionEndRef.current = state.selectionEnd;

        if (
          localRef.current &&
          document.activeElement !== localRef.current &&
          state.selectionStart !== null &&
          state.selectionEnd !== null &&
          state.selectionStart !== undefined &&
          state.selectionEnd !== undefined
        ) {
          if (
            localRef.current.selectionStart !== state.selectionStart ||
            localRef.current.selectionEnd !== state.selectionEnd
          ) {
            localRef.current.setSelectionRange(state.selectionStart, state.selectionEnd);
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  const handleRef = useCallback((el: HTMLTextAreaElement | null) => {
    localRef.current = el;
    if (el) {
      if (hydratedElementRef.current !== el) {
        hydratedElementRef.current = el;
        const storeState = useEditorStore.getState();
        if (el.value !== storeState.content) {
          el.value = storeState.content;
        }
        latestContentRef.current = el.value;
        const sStart = storeState.selectionStart;
        const sEnd = storeState.selectionEnd;
        if (typeof sStart === 'number' && typeof sEnd === 'number') {
          try {
            const maxLen = el.value.length;
            el.setSelectionRange(Math.min(Math.max(0, sStart), maxLen), Math.min(Math.max(0, sEnd), maxLen));
          } catch {
            // ignore
          }
        }
      }
    } else {
      hydratedElementRef.current = null;
    }

    if (typeof ref === 'function') {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
  }, [ref]);

  // Flush any pending/debounced changes to the store immediately
  const flushChanges = (target: HTMLTextAreaElement) => {
    if (syncContentTimeoutRef.current) {
      clearTimeout(syncContentTimeoutRef.current);
      syncContentTimeoutRef.current = null;
    }
    if (syncCursorTimeoutRef.current) {
      clearTimeout(syncCursorTimeoutRef.current);
      syncCursorTimeoutRef.current = null;
    }
    const val = target.value;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    latestContentRef.current = val;
    latestSelectionStartRef.current = start;
    latestSelectionEndRef.current = end;
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
      if (syncContentTimeoutRef.current) {
        clearTimeout(syncContentTimeoutRef.current);
      }
      if (syncCursorTimeoutRef.current) {
        clearTimeout(syncCursorTimeoutRef.current);
      }
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
      if (caretRafRef.current !== null) {
        cancelAnimationFrame(caretRafRef.current);
      }
      if (caretThrottleTimerRef.current) {
        clearTimeout(caretThrottleTimerRef.current);
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

    if (target.scrollHeight <= visibleHeight - 20 && target.scrollTop === 0) {
      return;
    }

    const caretY = getExactCaretYInTextarea(target, target.selectionStart);
    const caretRelativeY = caretY - target.scrollTop;

    if (caretRelativeY > visibleHeight - 20) {
      target.scrollTop = caretY - visibleHeight + 35;
    } else if (caretRelativeY < 15) {
      target.scrollTop = Math.max(0, caretY - 25);
    }
  };

  const scheduleCaretVisibilityCheck = (target: HTMLTextAreaElement, immediate = false) => {
    if (!target) return;
    const runCheck = () => {
      if (caretRafRef.current !== null) {
        cancelAnimationFrame(caretRafRef.current);
      }
      caretRafRef.current = requestAnimationFrame(() => {
        caretRafRef.current = null;
        if (localRef.current) {
          lastCaretCheckTimeRef.current = Date.now();
          ensureCaretVisibleInView(localRef.current);
        }
      });
    };

    if (immediate) {
      if (caretThrottleTimerRef.current) {
        clearTimeout(caretThrottleTimerRef.current);
        caretThrottleTimerRef.current = null;
      }
      runCheck();
      return;
    }

    const elapsed = Date.now() - lastCaretCheckTimeRef.current;
    if (elapsed >= 180 && !caretThrottleTimerRef.current) {
      runCheck();
    } else {
      if (caretThrottleTimerRef.current) clearTimeout(caretThrottleTimerRef.current);
      caretThrottleTimerRef.current = setTimeout(() => {
        caretThrottleTimerRef.current = null;
        runCheck();
      }, 180);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'Enter' ||
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'PageUp' ||
      e.key === 'PageDown' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      scheduleCaretVisibilityCheck(e.currentTarget, true);
    }

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
    const target = e.target;
    const val = target.value;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    latestContentRef.current = val;
    latestSelectionStartRef.current = start;
    latestSelectionEndRef.current = end;
    
    // Debounce Zustand update (including row/col calculation)
    const syncDelay = 100;
    if (syncContentTimeoutRef.current) clearTimeout(syncContentTimeoutRef.current);
    syncContentTimeoutRef.current = setTimeout(() => {
      syncContentTimeoutRef.current = null;
      if (syncCursorTimeoutRef.current) {
        clearTimeout(syncCursorTimeoutRef.current);
        syncCursorTimeoutRef.current = null;
      }
      const liveTarget = localRef.current ?? target;
      const liveVal = liveTarget.value;
      const liveStart = liveTarget.selectionStart;
      const liveEnd = liveTarget.selectionEnd;
      latestContentRef.current = liveVal;
      latestSelectionStartRef.current = liveStart;
      latestSelectionEndRef.current = liveEnd;
      const pos = getRowColFromOffset(liveVal, liveStart);
      useEditorStore.setState({
        content: liveVal,
        cursor: pos,
        selectionStart: liveStart,
        selectionEnd: liveEnd
      });
    }, syncDelay);

    // Fast debounced save directly to localStorage to prevent any data loss on refresh/unload
    const STORAGE_KEY_AUTOSAVE = 'steem_autosave_temp';
    
    const backupDelay = props.onDemandSyncEnabled === false ? 350 : 1500;
    if (localSaveTimeoutRef.current) clearTimeout(localSaveTimeoutRef.current);
    localSaveTimeoutRef.current = setTimeout(() => {
      localSaveTimeoutRef.current = null;
      try {
        localStorage.setItem(STORAGE_KEY_AUTOSAVE, latestContentRef.current);
        localStorage.setItem(
          'steem_editor_cursor',
          JSON.stringify({ start: latestSelectionStartRef.current, end: latestSelectionEndRef.current })
        );
        localStorage.setItem('steem_visual_html_is_stale', 'true');
      } catch (err) {
        console.warn('Failed to save content and cursor to localStorage', err);
      }
    }, backupDelay);

    if (props.onChange) {
      props.onChange(e);
    }

    scheduleCaretVisibilityCheck(target, false);
  };

  const updateCursorAndSelection = (target: HTMLTextAreaElement) => {
    const start = target.selectionStart;
    const end = target.selectionEnd;

    if (latestSelectionStartRef.current === start && latestSelectionEndRef.current === end) {
      return; // No change in selection or cursor, avoid useless work
    }
    
    latestSelectionStartRef.current = start;
    latestSelectionEndRef.current = end;

    if (syncCursorTimeoutRef.current) clearTimeout(syncCursorTimeoutRef.current);
    syncCursorTimeoutRef.current = setTimeout(() => {
      syncCursorTimeoutRef.current = null;
      const liveTarget = localRef.current ?? target;
      const liveVal = liveTarget.value;
      const liveStart = liveTarget.selectionStart;
      const liveEnd = liveTarget.selectionEnd;
      latestSelectionStartRef.current = liveStart;
      latestSelectionEndRef.current = liveEnd;
      const pos = getRowColFromOffset(liveVal, liveStart);
      try {
        localStorage.setItem('steem_editor_cursor', JSON.stringify({ start: liveStart, end: liveEnd }));
      } catch (err) {
        console.warn('Failed to save cursor to localStorage', err);
      }
      const currentStore = useEditorStore.getState();
      if (
        currentStore.cursor?.row !== pos.row ||
        currentStore.cursor?.col !== pos.col ||
        currentStore.selectionStart !== liveStart ||
        currentStore.selectionEnd !== liveEnd
      ) {
        useEditorStore.setState({
          cursor: pos,
          selectionStart: liveStart,
          selectionEnd: liveEnd
        });
      }
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
    if (
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'PageUp' ||
      e.key === 'PageDown' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      scheduleCaretVisibilityCheck(e.currentTarget, true);
    } else {
      scheduleCaretVisibilityCheck(e.currentTarget, false);
    }
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
      defaultValue={initialContentRef.current}
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

