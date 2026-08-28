import React, { forwardRef, useEffect, useRef } from 'react';
import { useEditorStore, getRowColFromOffset } from '../store';

interface CodeEditorProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  selectionStart?: number | null;
  selectionEnd?: number | null;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onDemandSyncEnabled?: boolean;
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onChange, onSelect, onKeyUp, onClick, onBlur, onDemandSyncEnabled, ...rest } = props;

  return (
    <textarea
      ref={handleRef}
      defaultValue={content}
      onChange={handleChange}
      onSelect={handleSelect}
      onKeyUp={handleKeyUp}
      onClick={handleClick}
      onBlur={handleBlur}
      {...rest}
    />
  );
});
CodeEditor.displayName = 'CodeEditor';

