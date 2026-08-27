import { useState, useRef, useCallback, useEffect } from 'react';
import { useEditorStore, getRowColFromOffset, getOffsetFromRowCol } from '../store';
import { isInsideTagInLine } from '../utils/formatUtils';
import { calculateCaretScrollTop } from '../lib/viewportLayout';

interface UseEditorModeManagerProps {
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  isSyncingRef: React.MutableRefObject<boolean>;
  lastSyncContentRef: React.MutableRefObject<string>;
  activeView: string;
  activeMobileTab: string;
  isKeyboardOpen: boolean;
  widgetPos: 'floating' | 'bottom' | 'hidden';
  toolbarIconSize: number | 'small' | 'medium' | 'large';
  setActiveFormats: React.Dispatch<React.SetStateAction<any>>;
  saveVisualSelection: () => void;
  restoreVisualSelection: () => void;
  syncCursorMarkdownToVisual: () => Promise<void>;
  syncCursorVisualToMarkdown: () => { md: string } | null;
  htmlToMarkdown: (html: string) => string;
  setContent: (content: string) => void;
}

export function useEditorModeManager({
  editorRef,
  wysiwygRef,
  isSyncingRef,
  lastSyncContentRef,
  activeView,
  activeMobileTab,
  isKeyboardOpen,
  widgetPos,
  toolbarIconSize,
  setActiveFormats,
  saveVisualSelection,
  restoreVisualSelection,
  syncCursorMarkdownToVisual,
  syncCursorVisualToMarkdown,
  htmlToMarkdown,
  setContent,
}: UseEditorModeManagerProps) {
  const [editorMode, setEditorMode] = useState<'visual' | 'markdown'>(() => {
    return (localStorage.getItem('steem_editor_mode') as 'visual' | 'markdown') || 'markdown';
  });

  const cursorPositionRef = useRef<{ start: number; end: number } | null>(null);
  const isTransitioningModeRef = useRef<boolean>(false);
  const hasRestoredInitialCursorRef = useRef(false);

  const saveCursorPosition = useCallback(() => {
    if (isTransitioningModeRef.current || isSyncingRef.current) return;
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      if (start === null || end === null || start === undefined || end === undefined) return;
      const pos = { start, end };
      cursorPositionRef.current = pos;
      try {
        localStorage.setItem('steem_editor_cursor', JSON.stringify(pos));
      } catch (err) {
        console.warn('Failed to save cursor position:', err);
      }

      // Sync content and Zustand store (in-memory only, disk persistence is debounced)
      const text = editorRef.current.value;
      const rowColPos = getRowColFromOffset(text, start);
      useEditorStore.getState().setCursor(rowColPos);
      useEditorStore.getState().setSelection(start, end);

      if (editorMode === 'markdown') {
        const caretPos = start;
        const selEnd = end;

        const lineStart = text.lastIndexOf('\n', caretPos - 1) + 1;
        const lineEnd = text.indexOf('\n', caretPos);
        const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;

        const currentLine = text.substring(lineStart, actualLineEnd);
        const caretInLine = caretPos - lineStart;
        const selEndInLine = Math.min(actualLineEnd, selEnd) - lineStart;

        const newFormats = {
          bold: isInsideTagInLine(currentLine, caretInLine, '**', selEndInLine),
          italic: isInsideTagInLine(currentLine, caretInLine, '*', selEndInLine),
          code: isInsideTagInLine(currentLine, caretInLine, '`', selEndInLine),
          strikethrough: isInsideTagInLine(currentLine, caretInLine, '~~', selEndInLine),
          sub: isInsideTagInLine(currentLine, caretInLine, '<sub>', selEndInLine),
          sup: isInsideTagInLine(currentLine, caretInLine, '<sup>', selEndInLine),
          phishy: isInsideTagInLine(currentLine, caretInLine, '<div class="phishy">', selEndInLine)
        };

        setActiveFormats((prev: any) => {
          if (
            prev.bold === newFormats.bold &&
            prev.italic === newFormats.italic &&
            prev.code === newFormats.code &&
            prev.strikethrough === newFormats.strikethrough &&
            prev.sub === newFormats.sub &&
            prev.sup === newFormats.sup &&
            prev.phishy === newFormats.phishy
          ) {
            return prev;
          }
          return newFormats;
        });
      }
    }
  }, [editorMode, editorRef, isSyncingRef, setActiveFormats]);

  const numIconSize = typeof toolbarIconSize === 'number' ? toolbarIconSize : (toolbarIconSize === 'large' ? 24 : toolbarIconSize === 'small' ? 16 : 20);

  const restoreMarkdownCursorAndScroll = useCallback((retryCount = 0, forceScrollToCaret = false) => {
    if (!editorRef.current) {
      if (retryCount < 15) {
        setTimeout(() => restoreMarkdownCursorAndScroll(retryCount + 1, forceScrollToCaret), 30);
      }
      return;
    }

    try {
      const ta = editorRef.current;
      const textVal = useEditorStore.getState().content;
      
      // Ensure the textarea has the correct value
      if (ta.value !== textVal) {
        ta.value = textVal;
      }

      // Get saved cursor position
      let start = 0;
      let end = 0;
      if (cursorPositionRef.current) {
        start = cursorPositionRef.current.start;
        end = cursorPositionRef.current.end;
      } else {
        const saved = localStorage.getItem('steem_editor_cursor');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
            start = parsed.start;
            end = parsed.end;
            cursorPositionRef.current = parsed;
          }
        }
      }

      const safeStart = Math.min(Math.max(0, start), textVal.length);
      const safeEnd = Math.min(Math.max(0, end), textVal.length);

      isSyncingRef.current = true;
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(safeStart, safeEnd);

      // Sync to Zustand store
      const rowColPos = getRowColFromOffset(textVal, safeStart);
      useEditorStore.getState().setCursor(rowColPos);
      useEditorStore.getState().setSelection(safeStart, safeEnd);

      // Restore scroll position
      const savedScroll = localStorage.getItem('steem_editor_scroll');
      if (!forceScrollToCaret && savedScroll !== null) {
        const scrollTop = Number(savedScroll);
        if (!isNaN(scrollTop) && scrollTop > 0) {
          ta.scrollTop = scrollTop;
        } else {
          // Fallback to scroll calculating from caretY
          const clone = ta.cloneNode() as HTMLTextAreaElement;
          clone.style.visibility = 'hidden';
          clone.style.position = 'absolute';
          clone.style.overflow = 'hidden';
          clone.style.height = '0px';
          clone.style.width = ta.clientWidth + 'px';
          clone.style.padding = window.getComputedStyle(ta).padding;
          clone.style.paddingBottom = '0px';
          clone.style.font = window.getComputedStyle(ta).font;
          clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;
          clone.style.boxSizing = 'border-box';
          clone.value = textVal.substring(0, safeStart);
          document.body.appendChild(clone);
          
          const caretY = clone.scrollHeight;
          document.body.removeChild(clone);
          ta.scrollTop = calculateCaretScrollTop(caretY, ta.clientHeight, {
            isMobile: window.innerWidth < 1024,
            isKeyboardOpen,
            widgetPos,
            toolbarIconSize: numIconSize,
          });
        }
      } else {
        // Compute from caretY
        const clone = ta.cloneNode() as HTMLTextAreaElement;
        clone.style.visibility = 'hidden';
        clone.style.position = 'absolute';
        clone.style.overflow = 'hidden';
        clone.style.height = '0px';
        clone.style.width = ta.clientWidth + 'px';
        clone.style.padding = window.getComputedStyle(ta).padding;
        clone.style.paddingBottom = '0px';
        clone.style.font = window.getComputedStyle(ta).font;
        clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;
        clone.style.boxSizing = 'border-box';
        clone.value = textVal.substring(0, safeStart);
        document.body.appendChild(clone);
        
        const caretY = clone.scrollHeight;
        document.body.removeChild(clone);
        ta.scrollTop = calculateCaretScrollTop(caretY, ta.clientHeight, {
          isMobile: window.innerWidth < 1024,
          isKeyboardOpen,
          widgetPos,
          toolbarIconSize: numIconSize,
        });
      }

      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    } catch (e) {
      console.warn('restoreMarkdownCursorAndScroll failed:', e);
      isSyncingRef.current = false;
    }
  }, [editorRef, isSyncingRef, isKeyboardOpen, widgetPos, numIconSize]);

  // Automatic Cursor & Scroll Position Restoration after page reload
  useEffect(() => {
    if (hasRestoredInitialCursorRef.current) return;

    const getPos = () => {
      if (cursorPositionRef.current) return cursorPositionRef.current;
      try {
        const saved = localStorage.getItem('steem_editor_cursor');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
            cursorPositionRef.current = parsed;
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved cursor in restoration effect', e);
      }
      return null;
    };

    if (editorMode === 'markdown') {
      hasRestoredInitialCursorRef.current = true;
      restoreMarkdownCursorAndScroll();
    } else if (editorMode === 'visual' && wysiwygRef.current) {
      hasRestoredInitialCursorRef.current = true;
      const timer = setTimeout(async () => {
        const pos = getPos();
        if (pos) {
          useEditorStore.getState().setSelection(pos.start, pos.end);
          await syncCursorMarkdownToVisual();
          if (wysiwygRef.current) {
            wysiwygRef.current.focus();
          }
        } else if (wysiwygRef.current) {
          wysiwygRef.current.focus();
        }

        const savedScroll = localStorage.getItem('steem_editor_scroll');
        if (savedScroll !== null && wysiwygRef.current) {
          const scrollTop = Number(savedScroll);
          if (!isNaN(scrollTop) && scrollTop > 0) {
            wysiwygRef.current.scrollTop = scrollTop;
          }
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [editorMode, syncCursorMarkdownToVisual, restoreMarkdownCursorAndScroll, wysiwygRef]);

  const handleSetEditorMode = useCallback((mode: 'visual' | 'markdown') => {
    if (editorMode === mode) return;

    isTransitioningModeRef.current = true;
    hasRestoredInitialCursorRef.current = true;
    localStorage.setItem('steem_editor_mode', mode);

    // Immediately reset active formats to prevent phantom button highlighting during transition
    setActiveFormats({
      bold: false,
      italic: false,
      code: false,
      strikethrough: false,
      sub: false,
      sup: false,
      phishy: false
    });

    if (mode === 'visual') {
      let start = 0;
      let end = 0;
      let val = useEditorStore.getState().content;

      if (editorRef.current) {
        val = editorRef.current.value;
        start = editorRef.current.selectionStart ?? 0;
        end = editorRef.current.selectionEnd ?? start;
      } else if (cursorPositionRef.current) {
        start = cursorPositionRef.current.start;
        end = cursorPositionRef.current.end;
      }

      const pos = getRowColFromOffset(val, start);
      const cursorObj = { start, end };
      cursorPositionRef.current = cursorObj;
      try {
        localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorObj));
      } catch {
        /* ignore storage error */
      }

      useEditorStore.setState({
        content: val,
        cursor: pos,
        selectionStart: start,
        selectionEnd: end
      });

      saveCursorPosition();

      // Update lastSyncContentRef so background useEffect won't trigger another innerHTML wipe
      lastSyncContentRef.current = val;
      setEditorMode('visual');

      setTimeout(async () => {
        try {
          await syncCursorMarkdownToVisual();
          if (wysiwygRef.current) {
            wysiwygRef.current.focus({ preventScroll: true });
            saveVisualSelection();
          }
        } finally {
          setTimeout(() => {
            isTransitioningModeRef.current = false;
          }, 300);
        }
      }, 50);
    } else {
      saveVisualSelection();
      isSyncingRef.current = true;
      const syncResult = syncCursorVisualToMarkdown();

      // Always synchronize when switching from visual to markdown code
      if (syncResult && syncResult.md) {
        if (syncResult.md !== useEditorStore.getState().content) {
          setContent(syncResult.md);
        }
      } else if (wysiwygRef.current) {
        const md = htmlToMarkdown(wysiwygRef.current.innerHTML);
        if (md !== useEditorStore.getState().content) {
          setContent(md);
        }
      }
      localStorage.removeItem('steem_editor_scroll');
      setEditorMode('markdown');

      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            restoreMarkdownCursorAndScroll(0, true);
          } finally {
            setTimeout(() => {
              isTransitioningModeRef.current = false;
              isSyncingRef.current = false;
            }, 250);
          }
        }, 50);
      });
    }
  }, [
    editorMode,
    saveCursorPosition,
    syncCursorMarkdownToVisual,
    syncCursorVisualToMarkdown,
    saveVisualSelection,
    setContent,
    restoreMarkdownCursorAndScroll,
    editorRef,
    wysiwygRef,
    isSyncingRef,
    lastSyncContentRef,
    htmlToMarkdown,
    setActiveFormats
  ]);

  // Save cursor position when unmounting or switching view
  useEffect(() => {
    return () => saveCursorPosition();
  }, [saveCursorPosition]);

  useEffect(() => {
    if (activeView === 'editor' && activeMobileTab === 'editor') {
      if (isTransitioningModeRef.current) return;
      setTimeout(() => {
        if (isTransitioningModeRef.current) return;
        if (editorMode === 'visual') {
          restoreVisualSelection();
        } else {
          restoreMarkdownCursorAndScroll();
          return;
        }
        if (editorRef.current) {
          const cursor = useEditorStore.getState().cursor;
          if (cursor) {
            const text = editorRef.current.value;
            const offset = getOffsetFromRowCol(text, cursor);
            
            isSyncingRef.current = true;
            
            const ta = editorRef.current;
            ta.focus();
            ta.setSelectionRange(offset, offset);
            
            const clone = ta.cloneNode() as HTMLTextAreaElement;
            clone.style.visibility = 'hidden';
            clone.style.position = 'absolute';
            clone.style.overflow = 'hidden';
            clone.style.height = '0px';
            clone.style.width = ta.clientWidth + 'px';
            clone.style.padding = window.getComputedStyle(ta).padding;
            clone.style.paddingBottom = '0px';
            clone.style.font = window.getComputedStyle(ta).font;
            clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;
            clone.style.boxSizing = 'border-box';
            clone.value = text.substring(0, offset);
            document.body.appendChild(clone);
            
            const caretY = clone.scrollHeight;
            document.body.removeChild(clone);
            
            ta.scrollTop = calculateCaretScrollTop(caretY, ta.clientHeight, {
              isMobile: window.innerWidth < 1024,
              isKeyboardOpen,
              widgetPos,
              toolbarIconSize: numIconSize,
            });
            
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 100);
          } else {
            isSyncingRef.current = false;
          }
        } else {
          isSyncingRef.current = false;
        }
      }, 150);
    } else {
      saveVisualSelection();
      saveCursorPosition();
      isSyncingRef.current = false;
    }
  }, [
    activeView,
    activeMobileTab,
    editorMode,
    saveCursorPosition,
    restoreVisualSelection,
    saveVisualSelection,
    restoreMarkdownCursorAndScroll,
    isKeyboardOpen,
    widgetPos,
    toolbarIconSize,
    editorRef,
    isSyncingRef
  ]);

  return {
    editorMode,
    setEditorMode,
    cursorPositionRef,
    isTransitioningModeRef,
    saveCursorPosition,
    restoreMarkdownCursorAndScroll,
    handleSetEditorMode,
  };
}
