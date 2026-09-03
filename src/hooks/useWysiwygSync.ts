import { useRef, useCallback } from 'react';
import { useEditorStore, getRowColFromOffset } from '../store';
import { htmlToMarkdown } from '../lib/editorSync';
import { processContentForSteem } from './useSteemQueue';
import { getMarked } from '../utils/markdownParser';
import { getNodePath, getNodeByPath } from '../utils/domUtils';

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strikethrough: boolean;
  sub: boolean;
  sup: boolean;
  phishy: boolean;
}

export const findDomPositionForMarkdownOffset = (
  container: HTMLElement,
  markdown: string,
  offset: number
): { node: Node; offset: number } | null => {
  if (!container) return null;
  const lines = markdown.split('\n');
  let lineIdx = 0;
  let colIdx = 0;
  let acc = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length;
    if (acc + lineLen >= offset || i === lines.length - 1) {
      lineIdx = i;
      colIdx = Math.max(0, offset - acc);
      break;
    }
    acc += lineLen + 1;
  }

  const rawLine = lines[lineIdx] || '';

  // Check if current line is part of a markdown table (contains pipe separators)
  const isTableRow = rawLine.trim().startsWith('|') || (rawLine.includes('|') && rawLine.trim().endsWith('|'));
  if (isTableRow) {
    // Identify which table this belongs to and the row index
    let tableIndex = 0;
    let rowInTable = 0;
    let inTable = false;
    let isHeaderDivider = false;

    for (let i = 0; i <= lineIdx; i++) {
      const curLine = lines[i].trim();
      const curIsTable = curLine.startsWith('|') || (curLine.includes('|') && curLine.endsWith('|'));
      if (curIsTable) {
        if (!inTable) {
          inTable = true;
          rowInTable = 0;
          tableIndex++;
        } else {
          rowInTable++;
        }
        if (i === lineIdx) {
          isHeaderDivider = /^\|?(\s*:?-+:?\s*\|?)+\s*$/.test(curLine);
        }
      } else {
        inTable = false;
      }
    }

    const allDomTables = Array.from(container.querySelectorAll('table'));
    const targetTable = allDomTables[tableIndex - 1] || allDomTables[0];
    if (targetTable) {
      const allTrs = Array.from(targetTable.querySelectorAll('tr'));
      let targetTrIdx: number;
      if (isHeaderDivider) {
        targetTrIdx = 0;
      } else if (rowInTable >= 2) {
        targetTrIdx = rowInTable - 1;
      } else {
        targetTrIdx = rowInTable;
      }
      const targetTr = allTrs[Math.min(targetTrIdx, allTrs.length - 1)] || allTrs[0];

      if (targetTr) {
        const pipeParts = rawLine.split('|');
        const cellSegments: { cellIdx: number; startCol: number; endCol: number; raw: string }[] = [];
        let curRunningCol = 0;
        for (let p = 0; p < pipeParts.length; p++) {
          const part = pipeParts[p];
          const segStart = curRunningCol;
          const segEnd = curRunningCol + part.length;
          curRunningCol = segEnd + 1; // +1 for '|'

          if (p === 0 && rawLine.startsWith('|')) continue;
          if (p === pipeParts.length - 1 && rawLine.endsWith('|') && part === '') continue;

          cellSegments.push({
            cellIdx: cellSegments.length,
            startCol: segStart,
            endCol: segEnd,
            raw: part
          });
        }

        let matchedCellIdx = 0;
        let offsetInCell = 0;

        for (const seg of cellSegments) {
          if (colIdx >= seg.startCol && colIdx <= seg.endCol) {
            matchedCellIdx = seg.cellIdx;
            const leadingSpaces = (seg.raw.match(/^\s*/)?.[0] || '').length;
            const rawOffset = Math.max(0, colIdx - seg.startCol - leadingSpaces);
            const textBeforeCol = seg.raw.substring(leadingSpaces, leadingSpaces + rawOffset);
            offsetInCell = textBeforeCol
              .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
              .replace(/\[([^\]]*)\]\(.*$/g, '$1')
              .replace(/[[\]]/g, '')
              .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
              .replace(/(\*\*|__|\*|_|~~|`)/g, '')
              .replace(/<[/]?[^>]+>/g, '').length;
            break;
          }
        }

        const domCells = Array.from(targetTr.querySelectorAll('th, td'));
        const targetCell = domCells[Math.min(matchedCellIdx, domCells.length - 1)] || domCells[0];

        if (targetCell) {
          let charAcc = 0;
          let foundNode: Node | null = null;
          let foundOffset = 0;
          let lastTextNode: Node | null = null;
          let lastTextLen = 0;

          const walkCell = (node: Node) => {
            if (foundNode) return;
            if (node.nodeType === Node.TEXT_NODE) {
              lastTextNode = node;
              const text = node.nodeValue || '';
              const len = text.length;
              lastTextLen = len;
              if (charAcc + len >= offsetInCell) {
                foundNode = node;
                foundOffset = Math.max(0, Math.min(offsetInCell - charAcc, len));
              } else {
                charAcc += len;
              }
            } else {
              for (const child of Array.from(node.childNodes)) {
                walkCell(child);
                if (foundNode) break;
              }
            }
          };

          walkCell(targetCell);

          if (foundNode) {
            return { node: foundNode, offset: foundOffset };
          } else if (lastTextNode) {
            return { node: lastTextNode, offset: lastTextLen };
          }
          return { node: targetCell, offset: 0 };
        }
      }
    }
  }

  // Determine the paragraph block in Markdown (continuous non-blank lines around lineIdx)
  let blockStartLine = lineIdx;
  while (blockStartLine > 0 && lines[blockStartLine - 1].trim() !== '') {
    blockStartLine--;
  }
  let blockEndLine = lineIdx;
  while (blockEndLine < lines.length - 1 && lines[blockEndLine + 1].trim() !== '') {
    blockEndLine++;
  }

  const prefixMatch = rawLine.match(/^(#{1,6}\s+|[-*+]\s+(\[[ xX]\]\s+)?|\d+\.\s+|>\s*)/);
  const prefixLen = prefixMatch ? prefixMatch[0].length : 0;

  const stripPairedMarkdown = (str: string): string => {
    return str
      .replace(/(\*\*\*|___)(.*?)\1/g, '$2')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/(~~)(.*?)\1/g, '$2')
      .replace(/(`)(.*?)\1/g, '$2')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\(.*$/g, '$1')
      .replace(/[[\]]/g, '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[/]?[^>]+>/g, '');
  };

  // Calculate exact offset within the multi-line paragraph block in DOM
  let targetOffsetInBlock = 0;
  for (let l = blockStartLine; l < lineIdx; l++) {
    const curL = lines[l];
    const pMatch = curL.match(/^(#{1,6}\s+|[-*+]\s+(\[[ xX]\]\s+)?|\d+\.\s+|>\s*)/);
    const pLen = pMatch ? pMatch[0].length : 0;
    const strippedL = stripPairedMarkdown(curL.substring(pLen));
    targetOffsetInBlock += strippedL.length + 1; // +1 for the <br> or soft line break
  }

  const rawBeforeCursor = rawLine.substring(prefixLen, colIdx);
  const inLineOffset = stripPairedMarkdown(rawBeforeCursor).length;

  targetOffsetInBlock += inLineOffset;

  const cleanLineText = stripPairedMarkdown(rawLine.substring(prefixLen)).trim();

  const blocks = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6, li, p, blockquote, td, th, pre'));
  if (blocks.length === 0) {
    if (container.firstChild) {
      return { node: container.firstChild, offset: 0 };
    }
    return { node: container, offset: 0 };
  }

  let targetBlock: Element;

  if (cleanLineText === '') {
    const idealIdx = Math.min(blocks.length - 1, Math.floor((lineIdx / Math.max(1, lines.length)) * blocks.length));
    let bestBlock = blocks[idealIdx];
    let minDiff = 9999;
    blocks.forEach((b, idx) => {
      const isBlockEmpty = (b.textContent || '').trim() === '';
      if (isBlockEmpty) {
        const diff = Math.abs(idx - idealIdx);
        if (diff < minDiff) {
          minDiff = diff;
          bestBlock = b;
        }
      }
    });
    targetBlock = bestBlock;
  } else {
    const candidates: { block: Element; index: number; score: number }[] = [];
    const idealIdx = Math.min(blocks.length - 1, Math.floor((lineIdx / Math.max(1, lines.length)) * blocks.length));

    blocks.forEach((b, idx) => {
      const bText = (b.textContent || '').trim();
      if (bText && (bText.includes(cleanLineText) || cleanLineText.includes(bText))) {
        // Weighted score: heavily prioritize position proximity to avoid false positives with repetitive tags
        const posDiff = Math.abs(idx - idealIdx);
        const lenDiff = Math.abs(bText.length - cleanLineText.length);
        const score = posDiff * 10 + lenDiff;
        candidates.push({ block: b, index: idx, score });
      }
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.score - b.score);
      targetBlock = candidates[0].block;
    } else {
      targetBlock = blocks[idealIdx];
    }
  }

  if (!targetBlock) return { node: container, offset: 0 };

  let charAcc = 0;
  let foundNode: Node | null = null;
  let foundOffset = 0;
  let lastTextNode: Node | null = null;
  let lastTextLen = 0;

  const walk = (node: Node) => {
    if (foundNode) return;
    if (node.nodeType === Node.TEXT_NODE) {
      lastTextNode = node;
      const text = node.nodeValue || '';
      const len = text.length;
      lastTextLen = len;
      if (charAcc + len >= targetOffsetInBlock) {
        foundNode = node;
        foundOffset = Math.max(0, Math.min(targetOffsetInBlock - charAcc, len));
      } else {
        charAcc += len;
      }
    } else if (node.nodeName.toLowerCase() === 'br') {
      charAcc += 1;
    } else {
      for (const child of Array.from(node.childNodes)) {
        walk(child);
        if (foundNode) break;
      }
    }
  };

  walk(targetBlock);

  if (!foundNode) {
    if (lastTextNode) {
      return { node: lastTextNode, offset: lastTextLen };
    }
    return { node: targetBlock, offset: 0 };
  }

  return { node: foundNode, offset: foundOffset };
};

export interface UseWysiwygSyncOptions {
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  editorMode: 'markdown' | 'visual';
  isEditorFocused?: boolean;
  onDemandSyncEnabled?: boolean;
  scrollCaretIntoView: (block?: ScrollLogicalPosition) => void;
  cursorPositionRef: React.MutableRefObject<{ start: number; end: number } | null>;
  isSyncingRef: React.MutableRefObject<boolean>;
  wysiwygLocalBackupTimeoutRef: React.MutableRefObject<any>;
  wysiwygSyncTimeoutRef: React.MutableRefObject<any>;
  setActiveFormatsRef?: React.MutableRefObject<any>;
  t: (key: any) => string;
}

export function useWysiwygSync(options: UseWysiwygSyncOptions) {
  const {
    wysiwygRef,
    editorMode,
    onDemandSyncEnabled = false,
    scrollCaretIntoView,
    cursorPositionRef,
    isSyncingRef,
    wysiwygLocalBackupTimeoutRef,
    wysiwygSyncTimeoutRef,
    setActiveFormatsRef,
    t,
  } = options;

  const setContent = useEditorStore((state) => state.setContent);
  const savedVisualRangeRef = useRef<Range | null>(null);
  const lastSyncContentRef = useRef<string>(useEditorStore.getState().content);
  const hasInitializedRef = useRef(false);

  const saveVisualSelection = useCallback(() => {
    if (editorMode !== 'visual') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
      try {
        const range = sel.getRangeAt(0);
        if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
          savedVisualRangeRef.current = range.cloneRange();

          if (setActiveFormatsRef?.current) {
            let curr: Node | null = range.startContainer;
            let isBold = false;
            let isItalic = false;
            let isCode = false;
            let isStrike = false;
            let isSub = false;
            let isSup = false;
            let isPhishy = false;

            while (curr && curr !== wysiwygRef.current) {
              if (curr.nodeType === Node.ELEMENT_NODE) {
                const el = curr as HTMLElement;
                const tag = el.tagName.toLowerCase();
                if (tag === 'b' || tag === 'strong') isBold = true;
                if (tag === 'i' || tag === 'em') isItalic = true;
                if (tag === 'code') isCode = true;
                if (tag === 'strike' || tag === 'del' || tag === 's') isStrike = true;
                if (tag === 'sub') isSub = true;
                if (tag === 'sup') isSup = true;
                if (el.classList.contains('phishy')) isPhishy = true;

                const fw = el.style?.fontWeight || '';
                if (fw === 'bold' || fw === 'bolder' || parseInt(fw, 10) >= 600) isBold = true;
                const fs = el.style?.fontStyle || '';
                if (fs === 'italic' || fs === 'oblique') isItalic = true;
                const td = el.style?.textDecoration || '';
                if (td.includes('line-through')) isStrike = true;
              }
              curr = curr.parentNode;
            }

            let queryBold = false;
            let queryItalic = false;
            let queryStrike = false;
            let querySub = false;
            let querySup = false;
            const isWysiwygFocused =
              document.activeElement &&
              (document.activeElement === wysiwygRef.current || wysiwygRef.current.contains(document.activeElement));
            if (isWysiwygFocused) {
              try {
                queryBold = document.queryCommandState('bold');
                queryItalic = document.queryCommandState('italic');
                queryStrike = document.queryCommandState('strikeThrough');
                querySub = document.queryCommandState('subscript');
                querySup = document.queryCommandState('superscript');
              } catch (err) {
                console.warn('queryCommandState failed:', err);
              }
            }

            const newFormats = {
              bold: isBold || (isWysiwygFocused ? queryBold : false),
              italic: isItalic || (isWysiwygFocused ? queryItalic : false),
              code: isCode,
              strikethrough: isStrike || (isWysiwygFocused ? queryStrike : false),
              sub: isSub || (isWysiwygFocused ? querySub : false),
              sup: isSup || (isWysiwygFocused ? querySup : false),
              phishy: isPhishy,
            };

            setActiveFormatsRef.current((prev: any) => {
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
        } else if (setActiveFormatsRef?.current) {
          setActiveFormatsRef.current((prev: any) => {
            if (!prev.bold && !prev.italic && !prev.code && !prev.strikethrough && !prev.sub && !prev.sup && !prev.phishy) {
              return prev;
            }
            return {
              bold: false,
              italic: false,
              code: false,
              strikethrough: false,
              sub: false,
              sup: false,
              phishy: false,
            };
          });
        }
      } catch (e) {
        console.warn('saveVisualSelection error:', e);
      }
    }
  }, [editorMode, wysiwygRef, setActiveFormatsRef]);

  const restoreVisualSelection = useCallback(
    (shouldExpandWord = false) => {
      if (savedVisualRangeRef.current && wysiwygRef.current) {
        try {
          const range = savedVisualRangeRef.current.cloneRange();

          if (shouldExpandWord && range.collapsed) {
            const node = range.startContainer;
            const offset = range.startOffset;

            if (node && node.nodeType === Node.TEXT_NODE) {
              const textValue = node.nodeValue || '';
              const wordBoundaryRegex = /[\s\n.,!?;:"'()[\]{}*~`<>#_]/;

              let start = offset;
              let end = offset;

              while (start > 0 && !wordBoundaryRegex.test(textValue[start - 1])) {
                start--;
              }
              while (end < textValue.length && !wordBoundaryRegex.test(textValue[end])) {
                end++;
              }

              if (start < end) {
                range.setStart(node, start);
                range.setEnd(node, end);
                savedVisualRangeRef.current = range.cloneRange();
              }
            }
          }

          const sel = window.getSelection();
          if (sel) {
            if (document.activeElement !== wysiwygRef.current) {
              wysiwygRef.current.focus({ preventScroll: true });
            }
            sel.removeAllRanges();
            sel.addRange(range);

            const startNode = range.startContainer;
            if (startNode) {
              scrollCaretIntoView('nearest');

              const images = wysiwygRef.current.querySelectorAll('img');
              images.forEach((img) => {
                if (!img.complete) {
                  img.addEventListener('load', () => scrollCaretIntoView('nearest'), { once: true });
                }
              });

              setTimeout(() => scrollCaretIntoView('nearest'), 100);
              setTimeout(() => scrollCaretIntoView('nearest'), 300);
            }
          }
        } catch (e) {
          console.warn('Could not restore selection:', e);
        }
      }
    },
    [scrollCaretIntoView, wysiwygRef]
  );

  const focusVisualEditorEnd = useCallback(() => {
    if (wysiwygRef.current) {
      wysiwygRef.current.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (sel) {
        try {
          const range = document.createRange();
          range.selectNodeContents(wysiwygRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          savedVisualRangeRef.current = range.cloneRange();
        } catch (e) {
          console.warn('Could not focus end of visual editor:', e);
        }
      }
    }
  }, [wysiwygRef]);

  const isWysiwygContentEmpty = (el: HTMLElement | null): boolean => {
    if (!el) return true;
    if (el.querySelector('img, table, iframe, hr, pre, blockquote, ul, ol, video, audio')) {
      return false;
    }
    const rawText = el.textContent || '';
    const cleanText = rawText.replace(/[\u200B-\u200D\uFEFF\r\n\t\s\u00A0]/g, '');
    return cleanText.length === 0;
  };

  const updateWysiwygEmptyStatus = useCallback(
    (targetEl?: HTMLElement | null) => {
      const el = targetEl || wysiwygRef.current;
      if (!el) return;
      const empty = isWysiwygContentEmpty(el);
      if (empty) {
        if (el.getAttribute('data-is-empty') !== 'true') {
          el.setAttribute('data-is-empty', 'true');
        }
      } else {
        if (el.hasAttribute('data-is-empty')) {
          el.removeAttribute('data-is-empty');
        }
      }
    },
    [wysiwygRef]
  );

  const updateContentFromWysiwyg = useCallback(
    (forceImmediate = false) => {
      if (!wysiwygRef.current || !hasInitializedRef.current) return;
      updateWysiwygEmptyStatus(wysiwygRef.current);
      const html = wysiwygRef.current.innerHTML;

      // Safety check: if editor is empty but store has content, and we just started, ignore
      const storeContent = useEditorStore.getState().content;
      if (isWysiwygContentEmpty(wysiwygRef.current) && storeContent.trim() !== '' && !forceImmediate) {
        console.warn('Prevented accidental store wipe: Editor is empty but store has content.');
        return;
      }

      if (wysiwygSyncTimeoutRef.current) clearTimeout(wysiwygSyncTimeoutRef.current);

      const doSync = () => {
        if (!wysiwygRef.current) return;
        const currentHtml = wysiwygRef.current.innerHTML;
        const md = htmlToMarkdown(currentHtml);
        const currentContent = useEditorStore.getState().content;
        if (md !== currentContent) {
          lastSyncContentRef.current = md;
          setContent(md);
          try {
            localStorage.setItem('steem_autosave_temp', md);
            sessionStorage.setItem('steem_autosave_temp', md);
          } catch (e) {
            console.debug(e);
          }
          saveVisualSelection();
        }
      };

      if (forceImmediate) {
        doSync();
      } else {
        wysiwygSyncTimeoutRef.current = setTimeout(doSync, 300) as any;
      }
    },
    [
      saveVisualSelection,
      setContent,
      updateWysiwygEmptyStatus,
      wysiwygRef,
      wysiwygSyncTimeoutRef,
    ]
  );

  const syncWysiwygToContentIfVisual = useCallback(() => {
    if (editorMode === 'visual' && wysiwygRef.current && hasInitializedRef.current) {
      const html = wysiwygRef.current.innerHTML;
      const storeContent = useEditorStore.getState().content;
      
      // Safety check for mode switching
      if (isWysiwygContentEmpty(wysiwygRef.current) && storeContent.trim() !== '') {
        console.warn('Prevented accidental store wipe during mode switch.');
        return storeContent;
      }

      const md = htmlToMarkdown(html);
      if (md !== storeContent) {
        lastSyncContentRef.current = md;
        setContent(md);
        try {
          localStorage.setItem('steem_autosave_temp', md);
          sessionStorage.setItem('steem_autosave_temp', md);
        } catch (e) {
          console.debug(e);
        }
        return md;
      }
    }
    return useEditorStore.getState().content;
  }, [editorMode, setContent, wysiwygRef]);

  const getVisualSelectionHtml = useCallback(() => {
    if (savedVisualRangeRef.current && wysiwygRef.current) {
      try {
        const range = savedVisualRangeRef.current;
        if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
          const clonedSelection = range.cloneContents();
          const div = document.createElement('div');
          div.appendChild(clonedSelection);
          return div.innerHTML;
        }
      } catch (e) {
        console.warn('Could not extract visual selection:', e);
      }
    }
    return '';
  }, [wysiwygRef]);

  const syncCursorMarkdownToVisual = useCallback(async () => {
    try {
      if (!wysiwygRef.current) return;

      const pos = cursorPositionRef.current;
      let textContent = useEditorStore.getState().content;
      if (!textContent.endsWith('\n')) {
        textContent += '\n';
      }

      const m = getMarked();
      if (!m) return;

      const MARKER_START = '\uE000';
      const MARKER_END = '\uE001';
      let textWithMarkers = textContent;

      if (pos) {
        const safeStart = Math.max(0, Math.min(pos.start, textContent.length));
        const safeEnd = Math.max(0, Math.min(pos.end, textContent.length));
        if (safeStart === safeEnd) {
          textWithMarkers = textContent.slice(0, safeStart) + MARKER_START + textContent.slice(safeStart);
        } else {
          const first = Math.min(safeStart, safeEnd);
          const second = Math.max(safeStart, safeEnd);
          textWithMarkers =
            textContent.slice(0, first) +
            MARKER_START +
            textContent.slice(first, second) +
            MARKER_END +
            textContent.slice(second);
        }
      }

      const processed = processContentForSteem(textWithMarkers);
      let rawHtml = await m.parse(processed);

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawHtml;

      tempDiv.querySelectorAll('div.phishy, div.text-blue, div.text-green').forEach((div) => {
        div.querySelectorAll(':scope > p').forEach((p) => {
          while (p.firstChild) {
            div.insertBefore(p.firstChild, p);
          }
          div.removeChild(p);
        });
      });

      tempDiv.querySelectorAll('li > p:only-child').forEach((p) => {
        const parent = p.parentNode;
        if (parent) {
          while (p.firstChild) {
            parent.insertBefore(p.firstChild, p);
          }
          parent.removeChild(p);
        }
      });

      Array.from(tempDiv.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          tempDiv.replaceChild(p, node);
        }
      });

      tempDiv.querySelectorAll('ul, ol, table, thead, tbody, tr').forEach((parent) => {
        Array.from(parent.childNodes).forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()) {
            parent.removeChild(child);
          }
        });
      });

      const blockTags = ['TABLE'];

      tempDiv.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((spacerEl) => {
        const isTop = spacerEl === tempDiv.firstElementChild && spacerEl.classList.contains('top-spacer');
        const isBottom = spacerEl === tempDiv.lastElementChild && spacerEl.classList.contains('bottom-spacer');
        const text = spacerEl.textContent || '';
        const hasContent =
          text.trim() !== '' ||
          spacerEl.children.length > 1 ||
          (spacerEl.children.length === 1 && spacerEl.firstElementChild?.tagName !== 'BR');
        if (!isTop && !isBottom) {
          spacerEl.removeAttribute('data-empty');
          spacerEl.removeAttribute('data-placeholder');
          spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
        } else if (hasContent) {
          spacerEl.removeAttribute('data-empty');
          spacerEl.removeAttribute('data-placeholder');
          spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
        }
      });

      const firstEl = tempDiv.firstElementChild;
      if (firstEl && blockTags.includes(firstEl.tagName) && !firstEl.classList.contains('top-spacer')) {
        if (!tempDiv.querySelector('.top-spacer')) {
          const pBefore = document.createElement('p');
          pBefore.className = 'table-spacer top-spacer';
          pBefore.setAttribute('data-empty', 'true');
          pBefore.setAttribute('data-placeholder', t('newParagraphPlaceholder'));
          pBefore.innerHTML = '<br>';
          tempDiv.insertBefore(pBefore, firstEl);
        }
      }

      const lastEl = tempDiv.lastElementChild;
      if (lastEl && blockTags.includes(lastEl.tagName) && !lastEl.classList.contains('bottom-spacer')) {
        if (!tempDiv.querySelector('.bottom-spacer')) {
          const pAfter = document.createElement('p');
          pAfter.className = 'table-spacer bottom-spacer';
          pAfter.setAttribute('data-empty', 'true');
          pAfter.setAttribute('data-placeholder', t('newParagraphPlaceholder'));
          pAfter.innerHTML = '<br>';
          tempDiv.appendChild(pAfter);
        }
      }

      rawHtml = tempDiv.innerHTML;

      const trimmedRaw = rawHtml.trim();
      if (trimmedRaw === '') {
        rawHtml = '<p><br></p>';
      }

      isSyncingRef.current = true;
      wysiwygRef.current.innerHTML = rawHtml;
      lastSyncContentRef.current = useEditorStore.getState().content;
      hasInitializedRef.current = true;
      isSyncingRef.current = false;

      if (pos) {
        const range = document.createRange();
        let rangeSet = false;

        let foundStartNode: Node | null = null;
        let foundStartOffset = 0;
        let foundEndNode: Node | null = null;
        let foundEndOffset = 0;

        const walker = document.createTreeWalker(wysiwygRef.current, NodeFilter.SHOW_TEXT);
        let currentNode = walker.nextNode();
        while (currentNode) {
          const val = currentNode.nodeValue || '';
          const sIdx = val.indexOf(MARKER_START);
          const eIdx = val.indexOf(MARKER_END);

          if (sIdx !== -1 || eIdx !== -1) {
            let cleanVal = val;
            if (sIdx !== -1) {
              foundStartNode = currentNode;
              foundStartOffset = sIdx;
              cleanVal = cleanVal.replace(MARKER_START, '');
            }
            if (eIdx !== -1) {
              foundEndNode = currentNode;
              foundEndOffset = sIdx !== -1 && sIdx < eIdx ? eIdx - 1 : eIdx;
              cleanVal = cleanVal.replace(MARKER_END, '');
            }
            currentNode.nodeValue = cleanVal;
          }
          currentNode = walker.nextNode();
        }

        if (foundStartNode) {
          range.setStart(foundStartNode, foundStartOffset);
          if (foundEndNode) {
            range.setEnd(foundEndNode, foundEndOffset);
          } else {
            range.collapse(true);
          }
          rangeSet = true;
        } else {
          const startTarget = findDomPositionForMarkdownOffset(wysiwygRef.current, textContent, pos.start);
          const endTarget =
            pos.start !== pos.end ? findDomPositionForMarkdownOffset(wysiwygRef.current, textContent, pos.end) : startTarget;

          if (startTarget && endTarget) {
            range.setStart(startTarget.node, startTarget.offset);
            range.setEnd(endTarget.node, endTarget.offset);
            rangeSet = true;
          } else if (startTarget) {
            range.setStart(startTarget.node, startTarget.offset);
            range.collapse(true);
            rangeSet = true;
          }
        }

        if (rangeSet) {
          wysiwygRef.current.focus();
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
            savedVisualRangeRef.current = range.cloneRange();

            if (pos) {
              useEditorStore.getState().setSelection(pos.start, pos.end);
              const rowColPos = getRowColFromOffset(useEditorStore.getState().content, pos.start);
              useEditorStore.getState().setCursor(rowColPos);
            }

            wysiwygRef.current.focus({ preventScroll: true });

            scrollCaretIntoView('center');

            const images = wysiwygRef.current.querySelectorAll('img');
            images.forEach((img) => {
              if (!img.complete) {
                img.addEventListener('load', () => scrollCaretIntoView('center'), { once: true });
              }
            });

            const restoreSel = () => {
              if (wysiwygRef.current && savedVisualRangeRef.current) {
                const curSel = window.getSelection();
                if (curSel) {
                  curSel.removeAllRanges();
                  curSel.addRange(savedVisualRangeRef.current);
                }
              }
            };

            setTimeout(() => {
              restoreSel();
              scrollCaretIntoView('center');
            }, 50);
            setTimeout(() => {
              restoreSel();
              scrollCaretIntoView('center');
            }, 150);
            setTimeout(() => {
              restoreSel();
              scrollCaretIntoView('center');
            }, 350);
            setTimeout(() => scrollCaretIntoView('center'), 600);
          }
        }
      } else {
        wysiwygRef.current.focus();
      }
    } catch (e) {
      console.warn('syncCursorMarkdownToVisual error:', e);
    }
  }, [cursorPositionRef, isSyncingRef, scrollCaretIntoView, t, wysiwygRef]);

  const syncCursorVisualToMarkdown = useCallback(() => {
    try {
      let range: Range | null = null;
      const sel = window.getSelection();
      if (
        sel &&
        sel.rangeCount > 0 &&
        wysiwygRef.current &&
        wysiwygRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)
      ) {
        range = sel.getRangeAt(0);
      } else if (
        savedVisualRangeRef.current &&
        wysiwygRef.current &&
        wysiwygRef.current.contains(savedVisualRangeRef.current.commonAncestorContainer)
      ) {
        range = savedVisualRangeRef.current;
      }

      if (range && wysiwygRef.current) {
        const clonedWysiwyg = wysiwygRef.current.cloneNode(true) as HTMLElement;

        const pathStart = getNodePath(wysiwygRef.current, range.startContainer);
        const pathEnd = getNodePath(wysiwygRef.current, range.endContainer);

        if (pathStart && pathEnd) {
          const clonedStartNode = getNodeByPath(clonedWysiwyg, pathStart);
          const clonedEndNode = getNodeByPath(clonedWysiwyg, pathEnd);

          if (clonedStartNode && clonedEndNode) {
            try {
              if (clonedStartNode === clonedEndNode && clonedStartNode.nodeType === Node.TEXT_NODE) {
                const text = clonedStartNode.nodeValue || '';
                const sOff = Math.min(range.startOffset, text.length);
                const eOff = Math.min(range.endOffset, text.length);
                clonedStartNode.nodeValue = text.slice(0, sOff) + '\x01' + text.slice(sOff, eOff) + '\x02' + text.slice(eOff);
              } else {
                if (clonedEndNode.nodeType === Node.TEXT_NODE) {
                  const text = clonedEndNode.nodeValue || '';
                  const eOff = Math.min(range.endOffset, text.length);
                  clonedEndNode.nodeValue = text.slice(0, eOff) + '\x02' + text.slice(eOff);
                } else {
                  const idx = Math.min(range.endOffset, clonedEndNode.childNodes.length);
                  clonedEndNode.insertBefore(document.createTextNode('\x02'), clonedEndNode.childNodes[idx] || null);
                }

                if (clonedStartNode.nodeType === Node.TEXT_NODE) {
                  const text = clonedStartNode.nodeValue || '';
                  const sOff = Math.min(range.startOffset, text.length);
                  clonedStartNode.nodeValue = text.slice(0, sOff) + '\x01' + text.slice(sOff);
                } else {
                  const idx = Math.min(range.startOffset, clonedStartNode.childNodes.length);
                  clonedStartNode.insertBefore(document.createTextNode('\x01'), clonedStartNode.childNodes[idx] || null);
                }
              }

              clonedWysiwyg
                .querySelectorAll('.table-controls, .col-resizer, .row-resizer, [data-ignore-sync]')
                .forEach((el) => el.remove());

              clonedWysiwyg.querySelectorAll('.table-spacer, [data-placeholder]').forEach((spacer) => {
                if (
                  (spacer.textContent || '').trim() === '' &&
                  (!spacer.children.length || (spacer.children.length === 1 && spacer.firstElementChild?.tagName === 'BR'))
                ) {
                  spacer.className = '';
                  spacer.removeAttribute('data-placeholder');
                  spacer.removeAttribute('data-empty');
                }
              });

              const htmlWithMarkers = clonedWysiwyg.innerHTML;
              const rawMd = htmlToMarkdown(htmlWithMarkers);

              const startIdx = rawMd.indexOf('\x01');
              const cleanMdAfterStart = rawMd.replace('\x01', '');
              const endIdx = cleanMdAfterStart.indexOf('\x02');

              if (startIdx !== -1 && endIdx !== -1) {
                const cleanMd = cleanMdAfterStart.replace('\x02', '');
                const pos = { start: startIdx, end: endIdx };
                cursorPositionRef.current = pos;
                localStorage.setItem('steem_editor_cursor', JSON.stringify(pos));

                const rowColPos = getRowColFromOffset(cleanMd, startIdx);
                useEditorStore.getState().setCursor(rowColPos);
                useEditorStore.getState().setSelection(startIdx, endIdx);
                return { start: startIdx, end: endIdx, md: cleanMd };
              } else if (startIdx !== -1) {
                const cleanMd = cleanMdAfterStart;
                const pos = { start: startIdx, end: startIdx };
                cursorPositionRef.current = pos;
                localStorage.setItem('steem_editor_cursor', JSON.stringify(pos));

                const rowColPos = getRowColFromOffset(cleanMd, startIdx);
                useEditorStore.getState().setCursor(rowColPos);
                useEditorStore.getState().setSelection(startIdx, startIdx);
                return { start: startIdx, end: endIdx, md: cleanMd };
              }
            } catch (e) {
              console.warn('Failed to apply range on cloned DOM', e);
            }
          }
        }
      }
    } catch (e) {
      console.warn('syncCursorVisualToMarkdown error:', e);
    }
    return null;
  }, [cursorPositionRef, wysiwygRef]);

  return {
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
  };
}
