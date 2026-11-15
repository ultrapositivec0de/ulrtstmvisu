import { useEffect } from 'react';
import { useEditorStore } from '../store';
import { htmlToMarkdown } from '../lib/editorSync';
import { Idiomorph } from 'idiomorph';
import DOMPurify from 'dompurify';
import { DOM_PURIFY_CONFIG } from '../utils/markdownParser';
import { processContentForSteem } from './useSteemQueue';

export interface UseEditorShortcutsAndAutosaveProps {
  editorMode: 'visual' | 'markdown' | 'reading';
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  previewPaneRef: React.RefObject<HTMLDivElement | null>;
  savedVisualRangeRef: React.MutableRefObject<Range | null>;
  cursorPositionRef: React.MutableRefObject<{ start: number; end: number } | null>;
  hasLoadedRef: React.MutableRefObject<boolean>;
  isFirstRender: React.MutableRefObject<boolean>;
  activeTableRef: React.MutableRefObject<HTMLTableElement | null>;
  activeTableRowRef: React.MutableRefObject<HTMLTableRowElement | null>;
  activeTableCellRef: React.MutableRefObject<HTMLTableCellElement | null>;
  setActiveTable: (t: HTMLTableElement | null) => void;
  setActiveTableRow: (r: HTMLTableRowElement | null) => void;
  setActiveTableCell: (c: HTMLTableCellElement | null) => void;
  saveVisualSelection: () => void;
  saveCursorPosition: () => void;
  saveLargeStorage: (key: string, val: string) => void;
  STORAGE_KEY_AUTOSAVE: string;
  isLivePreviewEnabled: boolean;
  syncScrollEnabled: boolean;
  lang: string;
  getMarked: () => any;
  t: (key: any) => string;
}

export function useEditorShortcutsAndAutosave({
  editorMode,
  editorRef,
  wysiwygRef,
  previewPaneRef,
  savedVisualRangeRef,
  cursorPositionRef,
  hasLoadedRef,
  isFirstRender,
  activeTableRef,
  activeTableRowRef,
  activeTableCellRef,
  setActiveTable,
  setActiveTableRow,
  setActiveTableCell,
  saveVisualSelection,
  saveCursorPosition,
  saveLargeStorage,
  STORAGE_KEY_AUTOSAVE,
  isLivePreviewEnabled,
  syncScrollEnabled,
  lang,
  getMarked,
  t,
}: UseEditorShortcutsAndAutosaveProps) {
  // 1. Selection change listener
  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorMode === 'visual') {
        saveVisualSelection();
        if (wysiwygRef.current) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            try {
              const range = sel.getRangeAt(0);
              if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
                savedVisualRangeRef.current = range.cloneRange();
                
                let node: Node | null = range.commonAncestorContainer;
                if (node.nodeType === 3) node = node.parentNode;
                const table = ((node as Element)?.closest?.('table') as HTMLTableElement) || null;
                const row = ((node as Element)?.closest?.('tr') as HTMLTableRowElement) || null;
                const cell = ((node as Element)?.closest?.('td, th') as HTMLTableCellElement) || null;

                if (activeTableRef.current !== table) {
                  activeTableRef.current = table;
                  setActiveTable(table);
                }
                if (activeTableRowRef.current !== row) {
                  activeTableRowRef.current = row;
                  setActiveTableRow(row);
                }
                if (activeTableCellRef.current !== cell) {
                  activeTableCellRef.current = cell;
                  setActiveTableCell(cell);
                }
              } else {
                if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
                if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
                if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
              }
            } catch {
              if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
              if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
              if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
            }
          } else {
            if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
            if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
            if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
          }
        }
      } else if (editorMode === 'markdown') {
        saveCursorPosition();
        if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
        if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
        if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editorMode, saveVisualSelection, saveCursorPosition, activeTableRef, activeTableRowRef, activeTableCellRef, setActiveTable, setActiveTableRow, setActiveTableCell, savedVisualRangeRef, wysiwygRef]);

  // 2. Debounced persistence for auto-save
  useEffect(() => {
    let timer: any;
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      if (state.content !== prevState.content) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (hasLoadedRef.current) {
            saveLargeStorage(STORAGE_KEY_AUTOSAVE, state.content);
            if (cursorPositionRef.current) {
              try {
                localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorPositionRef.current));
              } catch (err) {
                console.debug(err);
              }
            }
          }
        }, 350);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [saveLargeStorage, cursorPositionRef, hasLoadedRef, STORAGE_KEY_AUTOSAVE]);

  // 3. Synchronous flush on page reload / unload / visibility hidden
  useEffect(() => {
    const flushSave = () => {
      if (!hasLoadedRef.current) return;

      try {
        if (editorMode === 'markdown' && editorRef.current) {
          const val = editorRef.current.value;
          if (val !== undefined && val !== null) {
            useEditorStore.setState({ content: val });
            saveLargeStorage(STORAGE_KEY_AUTOSAVE, val);
          }
        } else if (editorMode === 'visual' && wysiwygRef.current) {
          const md = htmlToMarkdown(wysiwygRef.current.innerHTML);
          if (md !== undefined && md !== null) {
            useEditorStore.setState({ content: md });
            saveLargeStorage(STORAGE_KEY_AUTOSAVE, md);
          }
        }
      } catch (err) {
        console.debug('Autosave flush on unload failed:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    };

    window.addEventListener('beforeunload', flushSave);
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushSave);
      window.removeEventListener('pagehide', flushSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [editorMode, saveLargeStorage, editorRef, wysiwygRef, hasLoadedRef, STORAGE_KEY_AUTOSAVE]);

  // 4. Update live preview pane HTML morphing
  useEffect(() => {
    const preview = previewPaneRef.current;
    if (!isLivePreviewEnabled) {
      if (preview && !preview.querySelector('svg.opacity-40')) {
        preview.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2 py-12 text-center select-none">
          <svg class="w-8 h-8 opacity-40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <p>${t('livePreviewDisabledHint')}</p>
        </div>`;
      }
      return;
    }

    const updatePreview = async () => {
      const m = getMarked();
      if (!m) {
        if (preview) {
          Idiomorph.morph(preview, `<p class="text-slate-500 italic">${t('loadingParser')}</p>`, { morphStyle: 'innerHTML' });
        }
        return;
      }
      try {
        const mdContent = useEditorStore.getState().content;
        const processed = processContentForSteem(mdContent);
        let finalHtml = (await m.parse(processed)) as string;
        finalHtml = finalHtml.replace(/<img /g, '<img referrerpolicy="no-referrer" loading="lazy" ');
        
        let isAtBottom = false;
        if (preview) {
          isAtBottom = preview.scrollHeight > 0 && preview.scrollHeight - preview.scrollTop - preview.clientHeight <= 20;
        }
        
        const purifiedHtml = DOMPurify ? (DOMPurify.sanitize(finalHtml, DOM_PURIFY_CONFIG as any) as unknown as string) : (finalHtml as unknown as string);
        
        if (preview) {
          Idiomorph.morph(preview, purifiedHtml, { morphStyle: 'innerHTML' });
          if (syncScrollEnabled && isAtBottom) {
            requestAnimationFrame(() => {
              preview.scrollTop = preview.scrollHeight;
            });
          }
        }
      } catch (e) {
        console.error("Marked parse error", e);
        if (preview) {
          Idiomorph.morph(preview, `<p class="text-red-500">${t('previewError')}</p>`, { morphStyle: 'innerHTML' });
        }
      }
    };

    if (isFirstRender.current) {
      isFirstRender.current = false;
      updatePreview();
      return;
    }

    let timer: any;
    if (!isLivePreviewEnabled) updatePreview(); 
    else {
      timer = setTimeout(updatePreview, 300);
    }
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      if (state.content !== prevState.content) {
        if (editorMode === 'visual') return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(updatePreview, 300);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [t, syncScrollEnabled, isLivePreviewEnabled, lang, editorMode, previewPaneRef, getMarked, isFirstRender]);
}
