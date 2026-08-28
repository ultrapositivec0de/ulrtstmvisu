import { useCallback } from 'react';
import { useEditorStore } from '../store';
import { calculateVisibleEditorHeight } from '../lib/viewportLayout';
import { isImageAndProxyUrl } from '../lib/editorSync';
import { getActiveFormatRangeInLine } from '../utils/formatUtils';
import { ActiveFormats } from './useWysiwygSync';

export interface UseEditorEventsOptions {
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  previewPaneRef: React.RefObject<HTMLDivElement | null>;
  savedVisualRangeRef: React.MutableRefObject<Range | null>;

  syncScrollEnabled: boolean;
  isKeyboardOpen: boolean;
  keyboardOffset?: number;
  widgetPos: any;
  toolbarIconSize: number;
  isWidgetVisible: boolean;
  isWidgetMenuOpen: boolean;
  setIsWidgetVisible: (visible: boolean) => void;

  activeFormats: ActiveFormats;
  setActiveFormats: React.Dispatch<React.SetStateAction<ActiveFormats>>;

  saveCursorPosition: () => void;
  updateContentFromWysiwygRef: React.MutableRefObject<((forceImmediate?: boolean) => void) | null>;
  fmt: (marker: string) => void;
  handleLink: () => void;
  insertHtmlAtCursor: (html: string) => void;
  handleIndent: () => void;
}

export function useEditorEvents(options: UseEditorEventsOptions) {
  const {
    editorRef,
    wysiwygRef,
    previewPaneRef,
    savedVisualRangeRef,
    syncScrollEnabled,
    isKeyboardOpen,
    keyboardOffset,
    widgetPos,
    toolbarIconSize,
    isWidgetVisible,
    isWidgetMenuOpen,
    setIsWidgetVisible,
    activeFormats,
    setActiveFormats,
    saveCursorPosition,
    updateContentFromWysiwygRef,
    fmt,
    handleLink,
    insertHtmlAtCursor,
    handleIndent,
  } = options;

  const setContent = useEditorStore((state) => state.setContent);

  const updateContentFromWysiwyg = useCallback(
    (forceImmediate = false) => {
      if (updateContentFromWysiwygRef.current) {
        updateContentFromWysiwygRef.current(forceImmediate);
      }
    },
    [updateContentFromWysiwygRef]
  );

  const scrollCaretIntoView = useCallback(
    (block: ScrollLogicalPosition = 'center') => {
      const editor = wysiwygRef.current;
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      if (!editor.contains(r.commonAncestorContainer)) return;

      let rect = r.getBoundingClientRect();
      let hasValidRect = rect && (rect.width > 0 || rect.height > 0);

      if (!hasValidRect) {
        const marker = document.createElement('span');
        marker.innerHTML = '&#8203;';
        const tempRange = r.cloneRange();
        tempRange.collapse(true);
        try {
          tempRange.insertNode(marker);
          rect = marker.getBoundingClientRect();
          hasValidRect = rect && (rect.width > 0 || rect.height > 0);
        } catch {
          // ignore
        } finally {
          marker.remove();
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }

      if (hasValidRect) {
        const editorRect = editor.getBoundingClientRect();
        const caretTop = rect.top - editorRect.top;
        const visibleHeight = calculateVisibleEditorHeight(editorRect.height, {
          isMobile: window.innerWidth < 1024,
          isKeyboardOpen,
          keyboardOffset,
          widgetPos,
          toolbarIconSize,
        });

        if (block === 'center') {
          const targetY = editor.scrollTop + caretTop - visibleHeight / 2 + rect.height / 2;
          editor.scrollTo({ top: Math.max(0, targetY), behavior: 'auto' });
        } else if (block === 'nearest') {
          if (caretTop < 10) {
            editor.scrollBy({ top: caretTop - 20, behavior: 'auto' });
          } else if (caretTop + rect.height > visibleHeight) {
            editor.scrollBy({ top: caretTop + rect.height - visibleHeight + 20, behavior: 'auto' });
          }
        }
      }
    },
    [wysiwygRef, isKeyboardOpen, keyboardOffset, widgetPos, toolbarIconSize]
  );

  const handleEditorScroll = useCallback(() => {
    if (editorRef.current) {
      localStorage.setItem('steem_editor_scroll', String(editorRef.current.scrollTop));
    }
    if (!syncScrollEnabled) return;
    const editor = editorRef.current;
    const preview = previewPaneRef.current;
    if (editor && preview) {
      const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    }
  }, [editorRef, previewPaneRef, syncScrollEnabled]);

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        if (!editorRef.current) return;
        const textarea = editorRef.current;
        const text = textarea.value;
        const caretPos = textarea.selectionStart;

        const lineStart = text.lastIndexOf('\n', caretPos - 1) + 1;
        const lineEnd = text.indexOf('\n', caretPos);
        const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
        const currentLine = text.slice(lineStart, actualLineEnd);
        const caretInLine = caretPos - lineStart;

        // 1. Identify quote or list prefix
        const quoteMatch = currentLine.match(/^(\s*>+\s*)/);
        const unorderedListMatch = currentLine.match(/^(\s*[-*+]\s+(?:\[[ xX]\]\s+)?)/);
        const orderedListMatch = currentLine.match(/^(\s*)(\d+)([.)]\s+)/);

        const cleanLineTrimmed = currentLine.trim();

        // Check if this line is an empty list or quote item
        const isEmptyUnorderedList =
          cleanLineTrimmed === '-' ||
          cleanLineTrimmed === '*' ||
          cleanLineTrimmed === '+' ||
          cleanLineTrimmed === '- [ ]' ||
          cleanLineTrimmed === '- [x]' ||
          cleanLineTrimmed === '- [X]';
        const isEmptyOrderedList =
          orderedListMatch && (cleanLineTrimmed === `${orderedListMatch[2]}.` || cleanLineTrimmed === `${orderedListMatch[2]}`);
        const isEmptyQuote = cleanLineTrimmed === '>';

        if (isEmptyUnorderedList || isEmptyOrderedList || isEmptyQuote) {
          e.preventDefault();
          const before = text.slice(0, lineStart);
          const after = text.slice(actualLineEnd);
          const newText = before + '\n' + after;
          const newCaretPos = lineStart + 1;
          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true });
            editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
          return;
        }

        let listPrefix = '';
        if (quoteMatch) {
          listPrefix = quoteMatch[0];
        } else if (unorderedListMatch) {
          listPrefix = unorderedListMatch[0];
          if (listPrefix.includes('[x]')) listPrefix = listPrefix.replace('[x]', '[ ]');
          else if (listPrefix.includes('[X]')) listPrefix = listPrefix.replace('[X]', '[ ]');
        } else if (orderedListMatch) {
          const indent = orderedListMatch[1];
          const num = parseInt(orderedListMatch[2], 10);
          const delimiter = orderedListMatch[3];
          listPrefix = indent + (num + 1) + delimiter;
        }

        // 2. Check if caret is inside an active inline formatting tag in the current line
        const activeRange = getActiveFormatRangeInLine(currentLine, caretInLine);

        if (activeRange) {
          e.preventDefault();
          const { openTag, closeTag, openIdx, closeIdx, contentStart, contentEnd, formatKey } = activeRange;
          const insideText = currentLine.slice(contentStart, contentEnd);

          const trimmedInside = insideText.trim();
          const leadingSpaces = insideText.slice(0, insideText.length - insideText.trimStart().length);
          const trailingSpaces = insideText.slice(insideText.trimEnd().length);

          // Case A: Empty formatting tag -> cancel formatting and start clean line
          if (trimmedInside.length === 0) {
            const beforeTag = currentLine.slice(0, openIdx);
            const afterTag = currentLine.slice(closeIdx + closeTag.length);
            const cleanedCurrentLine = beforeTag + insideText + afterTag;

            const beforeDoc = text.slice(0, lineStart);
            const afterDoc = text.slice(actualLineEnd);

            const newText = beforeDoc + cleanedCurrentLine + '\n' + listPrefix + afterDoc;
            const newCaretPos = lineStart + cleanedCurrentLine.length + 1 + listPrefix.length;

            setContent(newText);
            setActiveFormats((prev) => ({ ...prev, [formatKey]: false }));
            setTimeout(() => {
              if (!editorRef.current) return;
              editorRef.current.focus({ preventScroll: true });
              editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
              saveCursorPosition();
            }, 0);
            return;
          }

          // Case B: Caret is at the end of formatted content -> close tag tightly and continue onto new line
          if (caretInLine >= contentEnd) {
            const beforeTag = currentLine.slice(0, openIdx);
            const afterTag = currentLine.slice(closeIdx + closeTag.length);

            const beforeDoc = text.slice(0, lineStart);
            const afterDoc = text.slice(actualLineEnd);

            const line1 = beforeTag + leadingSpaces + openTag + trimmedInside + closeTag + trailingSpaces + afterTag;
            const line2 = listPrefix + openTag + closeTag;
            const newText = beforeDoc + line1 + '\n' + line2 + afterDoc;
            const newCaretPos = lineStart + line1.length + 1 + listPrefix.length + openTag.length;

            setContent(newText);
            setTimeout(() => {
              if (!editorRef.current) return;
              editorRef.current.focus({ preventScroll: true });
              editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
              saveCursorPosition();
            }, 0);
            return;
          }

          // Case C: Caret is in the middle of formatted text -> split tags cleanly and tightly
          if (caretInLine > contentStart && caretInLine < contentEnd) {
            const textBeforeCaretInTag = currentLine.slice(openIdx + openTag.length, caretInLine);
            const textAfterCaretInTag = currentLine.slice(caretInLine, closeIdx);
            const beforeTag = currentLine.slice(0, openIdx);
            const afterTag = currentLine.slice(closeIdx + closeTag.length);

            const lead1 = textBeforeCaretInTag.slice(0, textBeforeCaretInTag.length - textBeforeCaretInTag.trimStart().length);
            const trail1 = textBeforeCaretInTag.slice(textBeforeCaretInTag.trimEnd().length);
            const trim1 = textBeforeCaretInTag.trim();
            const line1 = trim1
              ? beforeTag + lead1 + openTag + trim1 + closeTag + trail1
              : beforeTag + textBeforeCaretInTag;

            const lead2 = textAfterCaretInTag.slice(0, textAfterCaretInTag.length - textAfterCaretInTag.trimStart().length);
            const trail2 = textAfterCaretInTag.slice(textAfterCaretInTag.trimEnd().length);
            const trim2 = textAfterCaretInTag.trim();
            const line2 = trim2
              ? listPrefix + lead2 + openTag + trim2 + closeTag + trail2 + afterTag
              : listPrefix + openTag + closeTag + textAfterCaretInTag + afterTag;

            const beforeDoc = text.slice(0, lineStart);
            const afterDoc = text.slice(actualLineEnd);

            const newText = beforeDoc + line1 + '\n' + line2 + afterDoc;
            const newCaretPos = lineStart + line1.length + 1 + listPrefix.length + (trim2 ? lead2.length + openTag.length : openTag.length);

            setContent(newText);
            setTimeout(() => {
              if (!editorRef.current) return;
              editorRef.current.focus({ preventScroll: true });
              editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
              saveCursorPosition();
            }, 0);
            return;
          }
        }

        // 3. Handle default list/quote continuation
        if (listPrefix) {
          e.preventDefault();
          const before = text.slice(0, caretPos);
          const after = text.slice(caretPos);
          const newText = before + '\n' + listPrefix + after;
          const newCaretPos = caretPos + 1 + listPrefix.length;
          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true });
            editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
          return;
        }
      }
    },
    [editorRef, saveCursorPosition, setContent, setActiveFormats]
  );

  const tryHeadingEnterBreakout = useCallback(
    (shiftKey: boolean = false): boolean => {
      if (shiftKey) return false;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !wysiwygRef.current) return false;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (!node) return false;

      let headingEl: HTMLElement | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
      while (headingEl && headingEl !== wysiwygRef.current && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(headingEl.tagName)) {
        headingEl = headingEl.parentElement;
      }

      if (!headingEl || headingEl === wysiwygRef.current) return false;
      const parent = headingEl.parentNode;
      if (!parent) return false;

      const headingText = (headingEl.textContent || '').replace(/[\u200B\s\n]/g, '');

      // Case 1: Heading is completely empty -> turn into standard paragraph
      if (headingText === '') {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        parent.replaceChild(p, headingEl);

        const newRange = document.createRange();
        newRange.selectNodeContents(p);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedVisualRangeRef.current = newRange.cloneRange();
        if (wysiwygRef.current) wysiwygRef.current.focus({ preventScroll: true });
        updateContentFromWysiwyg();
        return true;
      }

      // Case 2: Check if cursor is at the end, beginning, or middle
      const marker = document.createElement('span');
      marker.id = 'temp-heading-marker';
      try {
        range.insertNode(marker);

        const hasText = (n: Node): boolean => {
          if (n.nodeType === Node.TEXT_NODE) {
            return (n.nodeValue?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
          }
          if (n.nodeType === Node.ELEMENT_NODE) {
            const el = n as HTMLElement;
            if (el.tagName === 'BR' || el.id === 'temp-heading-marker') return false;
            return (el.textContent?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
          }
          return false;
        };

        // Scan left from marker
        let isLeftEmpty = true;
        let currLeft: Node | null = marker;
        while (currLeft && currLeft !== headingEl) {
          let sib = currLeft.previousSibling;
          while (sib) {
            if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') break;
            if (hasText(sib)) {
              isLeftEmpty = false;
              break;
            }
            sib = sib.previousSibling;
          }
          if (!isLeftEmpty || (currLeft.previousSibling && (currLeft.previousSibling as HTMLElement).tagName === 'BR')) break;
          currLeft = currLeft.parentNode;
        }

        // Scan right from marker
        let isRightEmpty = true;
        let currRight: Node | null = marker;
        while (currRight && currRight !== headingEl) {
          let sib = currRight.nextSibling;
          while (sib) {
            if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') break;
            if (hasText(sib)) {
              isRightEmpty = false;
              break;
            }
            sib = sib.nextSibling;
          }
          if (!isRightEmpty || (currRight.nextSibling && (currRight.nextSibling as HTMLElement).tagName === 'BR')) break;
          currRight = currRight.parentNode;
        }

        // Find direct child of heading containing the marker
        let directChild: Node | null = marker;
        while (directChild && directChild.parentNode !== headingEl) {
          directChild = directChild.parentNode;
        }

        if (directChild) {
          const childs: Node[] = Array.from(headingEl.childNodes);
          const directIndex = childs.indexOf(directChild);
          const leftChildren = directIndex > 0 ? childs.slice(0, directIndex) : [];
          const rightChildren = directIndex + 1 < childs.length ? childs.slice(directIndex + 1) : [];

          // Clean trailing/leading <br>
          while (
            leftChildren.length > 0 &&
            leftChildren[leftChildren.length - 1].nodeType === Node.ELEMENT_NODE &&
            (leftChildren[leftChildren.length - 1] as HTMLElement).tagName === 'BR'
          ) {
            leftChildren.pop();
          }
          while (
            rightChildren.length > 0 &&
            rightChildren[0].nodeType === Node.ELEMENT_NODE &&
            (rightChildren[0] as HTMLElement).tagName === 'BR'
          ) {
            rightChildren.shift();
          }

          // If at the end of the heading: create <p><br></p> AFTER heading
          if (isRightEmpty) {
            headingEl.innerHTML = '';
            if (leftChildren.length > 0) {
              leftChildren.forEach((c) => headingEl!.appendChild(c));
            } else {
              headingEl.innerHTML = '<br>';
            }

            const p = document.createElement('p');
            p.innerHTML = '<br>';
            parent.insertBefore(p, headingEl.nextSibling);

            const newRange = document.createRange();
            newRange.selectNodeContents(p);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            savedVisualRangeRef.current = newRange.cloneRange();
            if (wysiwygRef.current) wysiwygRef.current.focus({ preventScroll: true });
            updateContentFromWysiwyg();
            return true;
          }

          // If at the beginning of the heading: create <p><br></p> BEFORE heading, stay in heading
          if (isLeftEmpty) {
            headingEl.innerHTML = '';
            if (rightChildren.length > 0) {
              rightChildren.forEach((c) => headingEl!.appendChild(c));
            } else {
              headingEl.innerHTML = '<br>';
            }

            const p = document.createElement('p');
            p.innerHTML = '<br>';
            parent.insertBefore(p, headingEl);

            const newRange = document.createRange();
            newRange.selectNodeContents(headingEl);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            savedVisualRangeRef.current = newRange.cloneRange();
            if (wysiwygRef.current) wysiwygRef.current.focus({ preventScroll: true });
            updateContentFromWysiwyg();
            return true;
          }

          // If in the middle of the heading: split into two headings
          const leftHeading = headingEl;
          const rightHeading = document.createElement(leftHeading.tagName.toLowerCase());
          rightHeading.className = leftHeading.className;

          leftHeading.innerHTML = '';
          leftChildren.forEach((c) => leftHeading.appendChild(c));

          rightHeading.innerHTML = '';
          if (rightChildren.length > 0) {
            rightChildren.forEach((c) => rightHeading.appendChild(c));
          } else {
            rightHeading.innerHTML = '<br>';
          }

          parent.insertBefore(rightHeading, leftHeading.nextSibling);

          const newRange = document.createRange();
          newRange.selectNodeContents(rightHeading);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedVisualRangeRef.current = newRange.cloneRange();
          if (wysiwygRef.current) wysiwygRef.current.focus({ preventScroll: true });
          updateContentFromWysiwyg();
          return true;
        }
      } catch (err) {
        console.warn('Heading breakout error:', err);
      } finally {
        if (marker.parentNode) {
          marker.parentNode.removeChild(marker);
        }
      }
      return false;
    },
    [wysiwygRef, savedVisualRangeRef, updateContentFromWysiwyg]
  );

  const handleWysiwygBeforeInput = useCallback(
    (e: any) => {
      if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
        if (tryHeadingEnterBreakout(false)) {
          e.preventDefault();
        }
      }
    },
    [tryHeadingEnterBreakout]
  );

  const handleWysiwygKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isMod = e.ctrlKey || e.metaKey;

      if (e.key === 'Tab') {
        e.preventDefault();
        handleIndent();
        return;
      }

      // 1. Single Enter on Heading breakout
      if ((e.key === 'Enter' || e.keyCode === 13) && !isMod && !e.shiftKey) {
        if (tryHeadingEnterBreakout(e.shiftKey)) {
          e.preventDefault();
          return;
        }
      }

      if ((e.key === ' ' || e.key === 'Enter') && !isMod) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
          const node = sel.focusNode;
          if (node && node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            const offset = sel.focusOffset;
            const headText = text.substring(0, offset);
            const words = headText.split(/[\s\n]/);
            const lastWord = words[words.length - 1];
            if (lastWord && isImageAndProxyUrl(lastWord.trim())) {
              e.preventDefault();
              const trimmedWord = lastWord.trim();
              const beforeWord = headText.substring(0, headText.length - lastWord.length);
              const afterCursor = text.substring(offset);

              node.nodeValue = beforeWord;

              const img = document.createElement('img');
              img.src = trimmedWord;
              img.alt = 'image';

              const parent = node.parentNode;
              if (parent) {
                const nextSib = node.nextSibling;
                parent.insertBefore(img, nextSib);

                const spacer = e.key === ' ' ? '\u00A0' : '\n';
                const suffixNode = document.createTextNode(spacer + afterCursor);
                parent.insertBefore(suffixNode, img.nextSibling);

                const newRange = document.createRange();
                newRange.setStart(suffixNode, 1);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);

                updateContentFromWysiwyg();
                return;
              }
            }
          }
        }
      }

      if (e.key === ' ' && !isMod) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
          const node = sel.focusNode;
          if (node && node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            const offset = sel.focusOffset;
            if (offset === text.length) {
              let format = null;
              if (text === '#') format = '<h1>';
              else if (text === '##') format = '<h2>';
              else if (text === '###') format = '<h3>';
              else if (text === '####') format = '<h4>';
              else if (text === '>') format = 'blockquote';

              if (text === '-') {
                e.preventDefault();
                node.textContent = '';
                document.execCommand('insertUnorderedList', false);
                return;
              } else if (text === '1.') {
                e.preventDefault();
                node.textContent = '';
                document.execCommand('insertOrderedList', false);
                return;
              } else if (format) {
                e.preventDefault();
                node.textContent = '';
                document.execCommand('formatBlock', false, format);
                return;
              }
            }
          }
        }
      }

      // Formatting keyboard shortcuts
      if (isMod) {
        if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          fmt('**');
          return;
        }
        if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          fmt('*');
          return;
        }
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          handleLink();
          return;
        }
      }

      if (e.shiftKey && isMod) {
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault();
          fmt('~~');
          return;
        }
        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          fmt('`');
          return;
        }
      }

      // On-the-fly markdown shortcut expander
      if (e.key === ' ') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const startNode = range.startContainer;

          if (startNode.nodeType === Node.TEXT_NODE) {
            const textValue = startNode.nodeValue || '';
            const offset = range.startOffset;
            const headText = textValue.substring(0, offset);

            let match = false;
            let blockTag = '';
            let cmd = '';

            if (headText === '#') {
              blockTag = 'h1';
              match = true;
            } else if (headText === '##') {
              blockTag = 'h2';
              match = true;
            } else if (headText === '###') {
              blockTag = 'h3';
              match = true;
            } else if (headText === '####') {
              blockTag = 'h4';
              match = true;
            } else if (headText === '>') {
              blockTag = 'blockquote';
              match = true;
            } else if (headText === '-' || headText === '*') {
              cmd = 'insertUnorderedList';
              match = true;
            } else if (headText === '1.') {
              cmd = 'insertOrderedList';
              match = true;
            } else if (headText === '- [ ]') {
              blockTag = 'checklist';
              match = true;
            }

            if (match) {
              e.preventDefault();

              // Remove the characters before space
              startNode.nodeValue = textValue.substring(offset);

              if (cmd) {
                document.execCommand(cmd, false);
              } else if (blockTag === 'checklist') {
                insertHtmlAtCursor('<ul class="task-list"><li><input type="checkbox" style="margin-right: 0.5rem;" /> </li></ul>');
              } else if (blockTag === 'blockquote') {
                document.execCommand('formatBlock', false, '<blockquote>');
                // Ensure there is a block element inside
                const sel2 = window.getSelection();
                if (sel2 && sel2.rangeCount > 0) {
                  let curr = sel2.getRangeAt(0).startContainer;
                  if (curr.nodeType === Node.TEXT_NODE) curr = curr.parentNode as Node;
                  if ((curr as HTMLElement).tagName === 'BLOCKQUOTE') {
                    document.execCommand('formatBlock', false, '<p>');
                  }
                }
              } else if (blockTag) {
                document.execCommand('formatBlock', false, `<${blockTag}>`);
              }

              updateContentFromWysiwyg();
            }
          }
        }
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
          const range = sel.getRangeAt(0);
          let current: Node | null = range.startContainer;
          if (current.nodeType === Node.TEXT_NODE) current = current.parentNode;
          const spacer = (current as Element)?.closest?.('.table-spacer, [data-placeholder], [data-empty]');
          if (spacer && wysiwygRef.current.contains(spacer)) {
            spacer.removeAttribute('data-empty');
            spacer.removeAttribute('data-placeholder');
            spacer.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
          }
        }
      }

      // Check if we are inside a table cell when pressing Enter
      if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
          const range = sel.getRangeAt(0);
          let current: Node | null = range.startContainer;
          if (current.nodeType === Node.TEXT_NODE) current = current.parentNode;

          const spacer = (current as Element)?.closest?.('.table-spacer, [data-placeholder], [data-empty]');
          if (spacer && wysiwygRef.current.contains(spacer)) {
            e.preventDefault();
            spacer.removeAttribute('data-empty');
            spacer.removeAttribute('data-placeholder');
            spacer.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
            document.execCommand('insertParagraph');
            updateContentFromWysiwyg();
            return;
          }

          const tableCell = (current as Element)?.closest?.('td, th');
          if (tableCell && wysiwygRef.current.contains(tableCell)) {
            e.preventDefault();
            document.execCommand('insertLineBreak');

            updateContentFromWysiwyg();
            return;
          }
        }
      }

      // Press Enter on empty line to break out of formatting containers (quotes, centered text, etc)
      if (e.key === 'Enter' && !e.shiftKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
          const range = sel.getRangeAt(0);
          const node: Node | null = range.startContainer;

          if (node) {
            // Find the block container we might want to escape
            let escapeTarget: HTMLElement | null =
              node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
            while (
              escapeTarget &&
              escapeTarget !== wysiwygRef.current &&
              !['BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'CENTER'].includes(escapeTarget.tagName) &&
              !(
                escapeTarget.tagName === 'DIV' &&
                Array.from(escapeTarget.classList).some((c) => c.startsWith('text-') || c.startsWith('pull-') || c === 'phishy')
              )
            ) {
              escapeTarget = escapeTarget.parentElement;
            }

            if (escapeTarget && escapeTarget !== wysiwygRef.current) {
              // Insert a temporary marker to check the neighborhood
              const marker = document.createElement('span');
              marker.id = 'temp-caret-marker';
              try {
                range.insertNode(marker);

                const hasText = (n: Node): boolean => {
                  if (n.nodeType === Node.TEXT_NODE) {
                    return (n.nodeValue?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
                  }
                  if (n.nodeType === Node.ELEMENT_NODE) {
                    const el = n as HTMLElement;
                    if (el.tagName === 'BR' || el.id === 'temp-caret-marker') return false;
                    return (el.textContent?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
                  }
                  return false;
                };

                // Scan left for any text on the current line
                let isLeftEmpty = true;
                let currLeft: Node | null = marker;
                while (currLeft && currLeft !== escapeTarget) {
                  let sib = currLeft.previousSibling;
                  while (sib) {
                    if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') {
                      break; // stopped by line break
                    }
                    if (hasText(sib)) {
                      isLeftEmpty = false;
                      break;
                    }
                    sib = sib.previousSibling;
                  }
                  if (!isLeftEmpty || (currLeft.previousSibling && (currLeft.previousSibling as HTMLElement).tagName === 'BR')) {
                    break;
                  }
                  currLeft = currLeft.parentNode;
                }

                // Scan right for any text on the current line
                let isRightEmpty = true;
                let currRight: Node | null = marker;
                while (currRight && currRight !== escapeTarget) {
                  let sib = currRight.nextSibling;
                  while (sib) {
                    if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') {
                      break; // stopped by line break
                    }
                    if (hasText(sib)) {
                      isRightEmpty = false;
                      break;
                    }
                    sib = sib.nextSibling;
                  }
                  if (!isRightEmpty || (currRight.nextSibling && (currRight.nextSibling as HTMLElement).tagName === 'BR')) {
                    break;
                  }
                  currRight = currRight.parentNode;
                }
                if (isLeftEmpty && isRightEmpty) {
                  e.preventDefault();

                  const rLeft = document.createRange();
                  rLeft.setStart(escapeTarget, 0);
                  rLeft.setEndBefore(marker);
                  const leftFrag = rLeft.cloneContents();

                  const rRight = document.createRange();
                  rRight.setStartAfter(marker);
                  rRight.setEnd(escapeTarget, escapeTarget.childNodes.length);
                  const rightFrag = rRight.cloneContents();

                  if (
                    leftFrag.lastChild &&
                    leftFrag.lastChild.nodeType === Node.ELEMENT_NODE &&
                    (leftFrag.lastChild as HTMLElement).tagName === 'BR'
                  ) {
                    leftFrag.removeChild(leftFrag.lastChild);
                  }
                  if (
                    rightFrag.firstChild &&
                    rightFrag.firstChild.nodeType === Node.ELEMENT_NODE &&
                    (rightFrag.firstChild as HTMLElement).tagName === 'BR'
                  ) {
                    rightFrag.removeChild(rightFrag.firstChild);
                  }

                  const checkFragHasContent = (frag: DocumentFragment) => {
                    if ((frag.textContent || '').replace(/[\u200B\s\n]/g, '').length > 0) return true;
                    if (frag.querySelector('img, iframe, video, td, th, hr')) return true;
                    return false;
                  };

                  const leftHasContent = checkFragHasContent(leftFrag);
                  const rightHasContent = checkFragHasContent(rightFrag);

                  const p = document.createElement('p');
                  p.innerHTML = '<br>';
                  const parentNode = escapeTarget.parentNode;
                  if (parentNode) {
                    if (leftHasContent && rightHasContent) {
                      const rightBlock = document.createElement(escapeTarget.tagName.toLowerCase());
                      rightBlock.className = escapeTarget.className;
                      escapeTarget.innerHTML = '';
                      escapeTarget.appendChild(leftFrag);
                      rightBlock.appendChild(rightFrag);
                      parentNode.insertBefore(rightBlock, escapeTarget.nextSibling);
                      parentNode.insertBefore(p, rightBlock);
                    } else if (leftHasContent) {
                      escapeTarget.innerHTML = '';
                      escapeTarget.appendChild(leftFrag);
                      parentNode.insertBefore(p, escapeTarget.nextSibling);
                    } else if (rightHasContent) {
                      escapeTarget.innerHTML = '';
                      escapeTarget.appendChild(rightFrag);
                      parentNode.insertBefore(p, escapeTarget);
                    } else {
                      parentNode.replaceChild(p, escapeTarget);
                    }
                    // Focus the new paragraph
                    const newRange = document.createRange();
                    newRange.selectNodeContents(p);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                    savedVisualRangeRef.current = newRange.cloneRange();
                    p.focus();

                    updateContentFromWysiwyg();
                    return;
                  }
                }
              } catch (err) {
                console.warn('Unified escape breakout error:', err);
              } finally {
                if (marker.parentNode) {
                  marker.parentNode.removeChild(marker);
                }
              }
            }
          }

          let blockNode = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
          while (
            blockNode &&
            blockNode !== wysiwygRef.current &&
            !['P', 'DIV', 'BLOCKQUOTE', 'LI', 'CENTER', 'PRE'].includes(blockNode.tagName)
          ) {
            blockNode = blockNode.parentElement;
          }

          if (blockNode && blockNode !== wysiwygRef.current) {
            const textContent = blockNode.textContent?.replace(/\u200B/g, '').trim();
            if (textContent === '' || textContent === undefined) {
              // Check if the empty block has formatting elements inside it or active formats
              const formattingTags = ['B', 'STRONG', 'I', 'EM', 'STRIKE', 'S', 'CODE', 'SUB', 'SUP', 'SPAN'];
              const hasFormattingElements = Array.from(blockNode.querySelectorAll('*')).some((el) =>
                formattingTags.includes(el.tagName)
              );
              const hasActiveFormats =
                activeFormats.bold ||
                activeFormats.italic ||
                activeFormats.strikethrough ||
                activeFormats.sub ||
                activeFormats.sup ||
                activeFormats.code ||
                activeFormats.phishy;

              if (hasFormattingElements || hasActiveFormats) {
                // Clear formatting by resetting innerHTML to a single <br>
                blockNode.innerHTML = '<br>';

                // Reset browser formatting states
                try {
                  if (document.queryCommandState('bold')) document.execCommand('bold', false);
                  if (document.queryCommandState('italic')) document.execCommand('italic', false);
                  if (document.queryCommandState('strikeThrough')) document.execCommand('strikeThrough', false);
                  if (document.queryCommandState('subscript')) document.execCommand('subscript', false);
                  if (document.queryCommandState('superscript')) document.execCommand('superscript', false);
                } catch (err) {
                  console.warn('Failed to clear commands:', err);
                }

                setActiveFormats({
                  bold: false,
                  italic: false,
                  code: false,
                  strikethrough: false,
                  sub: false,
                  sup: false,
                  phishy: false,
                });
              }

              let curr: HTMLElement | null = blockNode as HTMLElement;
              let containerToEscape: HTMLElement | null = null;
              while (curr && curr !== wysiwygRef.current) {
                if (
                  ['BLOCKQUOTE', 'PRE', 'CENTER', 'UL', 'OL'].includes(curr.tagName) ||
                  (curr.tagName === 'DIV' &&
                    Array.from(curr.classList).some((c) => c.startsWith('text-') || c.startsWith('pull-') || c === 'phishy'))
                ) {
                  containerToEscape = curr;
                  break;
                }
                curr = curr.parentNode as HTMLElement;
              }

              if (containerToEscape || hasFormattingElements || hasActiveFormats) {
                e.preventDefault();

                const p = document.createElement('p');
                p.innerHTML = '<br>';

                const targetParent = containerToEscape ? containerToEscape.parentNode : blockNode.parentNode;
                const targetSibling = containerToEscape ? containerToEscape.nextSibling : blockNode.nextSibling;

                if (targetSibling) {
                  targetParent?.insertBefore(p, targetSibling);
                } else {
                  targetParent?.appendChild(p);
                }

                if (containerToEscape) {
                  const containerTextContent = containerToEscape.textContent?.replace(/\u200B/g, '').trim();
                  if (!containerTextContent) {
                    containerToEscape.parentNode?.removeChild(containerToEscape);
                  } else if (blockNode !== containerToEscape && containerToEscape.contains(blockNode)) {
                    blockNode.parentNode?.removeChild(blockNode);
                  }
                }

                const newRange = document.createRange();
                newRange.selectNodeContents(p);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);

                if (wysiwygRef.current) {
                  updateContentFromWysiwyg();
                }
                return;
              }
            }
          }
        }
      }

      if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !wysiwygRef.current) return;
        const range = sel.getRangeAt(0);

        let current: Node | null = range.startContainer;
        if (current.nodeType === Node.TEXT_NODE) current = current.parentNode;

        const isListItem = (current as Element)?.closest?.('li');
        if (isListItem && wysiwygRef.current.contains(isListItem)) {
          return;
        }

        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          try {
            document.execCommand('defaultParagraphSeparator', false, 'p');
          } catch {
            /* ignore */
          }
          document.execCommand('insertParagraph');

          // Ensure it created a p, not a div
          setTimeout(() => {
            if (!wysiwygRef.current) return;
            const sel2 = window.getSelection();
            if (sel2 && sel2.rangeCount > 0) {
              let node = sel2.focusNode;
              while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
              if (node && (node as HTMLElement).tagName === 'DIV' && !(node as HTMLElement).className) {
                // It created a naked DIV instead of P
                const p = document.createElement('p');
                p.innerHTML = (node as HTMLElement).innerHTML || '<br>';
                if (node.parentNode) node.parentNode.replaceChild(p, node);
                const r = document.createRange();
                r.selectNodeContents(p);
                r.collapse(false);
                sel2.removeAllRanges();
                sel2.addRange(r);
              }
            }
            updateContentFromWysiwyg();
          }, 0);
          return;
        } else {
          e.preventDefault();
          document.execCommand('insertLineBreak');
          updateContentFromWysiwyg();
          if (window.scrollY !== 0 || window.scrollX !== 0) {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
          }
          scrollCaretIntoView('nearest');
          requestAnimationFrame(() => {
            if (window.scrollY !== 0 || window.scrollX !== 0) {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
            }
            scrollCaretIntoView('nearest');
          });
          return;
        }
      }
    },
    [
      handleIndent,
      tryHeadingEnterBreakout,
      updateContentFromWysiwyg,
      fmt,
      handleLink,
      insertHtmlAtCursor,
      wysiwygRef,
      activeFormats,
      setActiveFormats,
      scrollCaretIntoView,
      savedVisualRangeRef,
    ]
  );

  return {
    scrollCaretIntoView,
    handleEditorScroll,
    handleEditorKeyDown,
    tryHeadingEnterBreakout,
    handleWysiwygBeforeInput,
    handleWysiwygKeyDown,
  };
}
