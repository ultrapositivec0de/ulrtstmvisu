import { useCallback, useState } from 'react';
import { useEditorStore } from '../store';
import { getMarked } from '../utils/markdownParser';
import { getAllFormatRangesInLine, FormatRange } from '../utils/formatUtils';


export interface EditorFormatConfig {
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  savedVisualRangeRef: React.MutableRefObject<Range | null>;
  focusVisualEditorEnd: () => void;
  saveCursorPosition: () => void;
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  editorMode: 'visual' | 'markdown';
  getSelectionOrWord: () => { text: string; s: number; e: number };
  getVisualSelectionHtml: () => string | null;
  restoreVisualSelection: (shouldExpandWord?: boolean) => void;
  updateContentFromWysiwyg: (forceImmediate?: boolean) => void;
  promptDialog: (message: string, defaultValue?: string, title?: string, inputType?: "text" | "password") => Promise<string | null>;
  t: (key: any) => string;
  scrollCaretIntoView?: (block?: ScrollLogicalPosition) => void;
}

export function useEditorFormat(config: EditorFormatConfig) {
  const {
    editorRef,
    wysiwygRef,
    editorMode,
    getSelectionOrWord,
    getVisualSelectionHtml,
    restoreVisualSelection,
    updateContentFromWysiwyg,
    promptDialog,
    t,
    savedVisualRangeRef,
    focusVisualEditorEnd,
    saveCursorPosition,
    scrollCaretIntoView
  } = config;

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    code: false,
    strikethrough: false,
    sub: false,
    sup: false,
    phishy: false
  });

const insertHtmlAtCursor = useCallback((html: string) => {
    if (!wysiwygRef.current) return;
    if (savedVisualRangeRef.current && wysiwygRef.current.contains(savedVisualRangeRef.current.commonAncestorContainer)) {
      restoreVisualSelection(false);
    } else {
      focusVisualEditorEnd();
    }
    let insertedInSelection = false;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const processedHtml = html;
        const el = document.createElement('div');
        el.innerHTML = processedHtml;
        const frag = document.createDocumentFragment();
        let node: Node | null;
        let lastNode: Node | null = null;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        let cursorNode: Node | null = null;
        let cursorOffset = 0;
        const findEmptyInline = (root: Node): HTMLElement | null => {
          if (root.nodeType === Node.ELEMENT_NODE) {
            const el = root as HTMLElement;
            const inlineTags = ['b', 'strong', 'i', 'em', 'sub', 'sup', 'strike', 'span', 'code'];
            if (inlineTags.includes(el.tagName.toLowerCase())) {
              if (el.innerHTML === '' || el.innerHTML === '\u200B') {
                return el;
              }
            }
          }
          if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            for (let i = 0; i < root.childNodes.length; i++) {
              const found = findEmptyInline(root.childNodes[i]);
              if (found) return found;
            }
          }
          return null;
        };
        const emptyEl = findEmptyInline(frag);
        if (emptyEl) {
          const zwsp = document.createTextNode('\u200B');
          emptyEl.appendChild(zwsp);
          cursorNode = zwsp;
          cursorOffset = 1;
        }
        range.insertNode(frag);
        if (cursorNode) {
          range.setStart(cursorNode, cursorOffset);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          savedVisualRangeRef.current = range.cloneRange();
        } else if (lastNode) {
          if (lastNode.nodeType === Node.ELEMENT_NODE && lastNode.parentNode) {
            const zwsp = document.createTextNode('\u200B');
            lastNode.parentNode.insertBefore(zwsp, lastNode.nextSibling);
            range.setStart(zwsp, 1);
            cursorNode = zwsp; 
          } else {
            range.setStartAfter(lastNode);
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          savedVisualRangeRef.current = range.cloneRange(); 
        }
        insertedInSelection = true;
        if (wysiwygRef.current) {
          wysiwygRef.current.focus({ preventScroll: true });
          const targetNode = cursorNode || lastNode;
          if (targetNode) {
            const el = targetNode.nodeType === Node.TEXT_NODE ? targetNode.parentElement : targetNode as HTMLElement;
            if (el && el !== wysiwygRef.current) {
              const doScroll = () => {
                if (scrollCaretIntoView) {
                  scrollCaretIntoView('nearest');
                } else {
                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              };
              
              doScroll();
              const images = wysiwygRef.current.querySelectorAll('img');
              images.forEach(img => {
                if (!img.complete) {
                  img.addEventListener('load', () => {
                    if (wysiwygRef.current && wysiwygRef.current.contains(el)) {
                      doScroll();
                    }
                  }, { once: true });
                }
              });
              setTimeout(() => {
                if (wysiwygRef.current && wysiwygRef.current.contains(el)) {
                  doScroll();
                  wysiwygRef.current.focus({ preventScroll: true });
                }
              }, 100);
            }
          }
        }
      }
    }
    if (!insertedInSelection && wysiwygRef.current) {
      const processedHtml = html;
      wysiwygRef.current.innerHTML += processedHtml;
      wysiwygRef.current.focus({ preventScroll: true });
    }
    updateContentFromWysiwyg();
  }, [restoreVisualSelection, focusVisualEditorEnd, updateContentFromWysiwyg, savedVisualRangeRef, wysiwygRef]);

  const insertAtCursor = useCallback((text: string, selectionMode: 'end' | 'select' = 'end') => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      const runParse = async () => {
        const m = getMarked();
        if (m) {
          const html = await m.parse(text);
          insertHtmlAtCursor(html);
        } else {
          insertHtmlAtCursor(text);
        }
      };
      runParse();
      return;
    }

    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const scrollTop = editorRef.current.scrollTop;
    const scrollLeft = editorRef.current.scrollLeft;
    
    const finalText = text;

    const newContent = content.substring(0, start) + finalText + content.substring(end);
    useEditorStore.getState().setContent(newContent);
    
    setTimeout(() => {
      if (!editorRef.current) return;
      if (selectionMode === 'select') {
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start, start + finalText.length);
      } else {
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start + finalText.length, start + finalText.length);
      }
      editorRef.current.scrollTop = scrollTop;
      editorRef.current.scrollLeft = scrollLeft;
    }, 0);
  }, [ editorMode, insertHtmlAtCursor]);

  const handleMarkdownFormat = useCallback((tag: string, closeTag: string = tag) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const text = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let formatKey: 'bold' | 'italic' | 'code' | 'strikethrough' | 'sub' | 'sup' | 'phishy' = 'bold';
    if (tag === '*') formatKey = 'italic';
    else if (tag === '`') formatKey = 'code';
    else if (tag === '~~') formatKey = 'strikethrough';
    else if (tag === '<sub>') formatKey = 'sub';
    else if (tag === '<sup>') formatKey = 'sup';
    else if (tag === '<div class="phishy">') formatKey = 'phishy';

    textarea.focus();

    if (start !== end) {
      const selectedText = text.slice(start, end);
      const before = text.slice(0, start);
      const after = text.slice(end);

      const leadingSpaces = selectedText.slice(0, selectedText.length - selectedText.trimStart().length);
      const trailingSpaces = selectedText.slice(selectedText.trimEnd().length);
      const trimmedSelection = selectedText.trim();

      if (trimmedSelection.length > 0) {
        const newText = before + leadingSpaces + tag + trimmedSelection + closeTag + trailingSpaces + after;
        useEditorStore.getState().setContent(newText);
        
        const newStart = start + leadingSpaces.length + tag.length;
        const newEnd = newStart + trimmedSelection.length;
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true });
          editorRef.current.setSelectionRange(newStart, newEnd);
          saveCursorPosition();
        }, 0);
        return;
      }
    }

    const caretPos = start;
    const lineStart = text.lastIndexOf('\n', caretPos - 1) + 1;
    const lineEnd = text.indexOf('\n', caretPos);
    const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
    const currentLine = text.substring(lineStart, actualLineEnd);
    const caretInLine = caretPos - lineStart;

    const ranges = getAllFormatRangesInLine(currentLine);
    const matchingRanges = ranges.filter(r => r.formatKey === formatKey && caretInLine >= r.openIdx && caretInLine <= r.closeIdx + r.closeTag.length);
    matchingRanges.sort((a, b) => (a.closeIdx - a.openIdx) - (b.closeIdx - b.openIdx));
    const matchingRange = matchingRanges[0] || null;

    if (matchingRange) {
      const { openIdx, closeIdx, contentStart, contentEnd, openTag, closeTag: cTag } = matchingRange;
      const insideText = currentLine.slice(contentStart, contentEnd);
      const trimmedInside = insideText.trim();
      const leadingSpaces = insideText.slice(0, insideText.length - insideText.trimStart().length);
      const trailingSpaces = insideText.slice(insideText.trimEnd().length);

      // 1. If tag is empty or only whitespace (e.g. *|* or **   **), remove it completely
      if (trimmedInside.length === 0) {
        const beforeTag = currentLine.slice(0, openIdx);
        const afterTag = currentLine.slice(closeIdx + cTag.length);
        const newLine = beforeTag + insideText + afterTag;
        const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
        const newCaretPos = lineStart + openIdx + leadingSpaces.length;

        useEditorStore.getState().setContent(newText);
        setActiveFormats(prev => ({ ...prev, [formatKey]: false }));
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true });
          editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
        return;
      }

      // 2. If caret is at or after the end of formatted content (e.g. **іаві| ** or ** іаві **|), exit/finish format and jump out
      if (caretInLine >= contentEnd || caretInLine >= closeIdx) {
        const beforeTag = currentLine.slice(0, openIdx);
        const afterTag = currentLine.slice(closeIdx + cTag.length);
        const normalizedTag = leadingSpaces + openTag + trimmedInside + cTag + trailingSpaces;
        const newLine = beforeTag + normalizedTag + afterTag;
        const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
        const newCaretPos = lineStart + beforeTag.length + normalizedTag.length;

        useEditorStore.getState().setContent(newText);
        setActiveFormats(prev => ({ ...prev, [formatKey]: false }));
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true });
          editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
        return;
      }

      // 3. Otherwise, unwrap the format tags from the surrounding text
      const beforeTag = currentLine.slice(0, openIdx);
      const afterTag = currentLine.slice(closeIdx + cTag.length);

      const newLine = beforeTag + insideText + afterTag;
      const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
      const newCaretPos = lineStart + openIdx + (caretInLine - (openIdx + openTag.length));

      useEditorStore.getState().setContent(newText);
      setActiveFormats(prev => ({ ...prev, [formatKey]: false }));
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true });
        editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
        saveCursorPosition();
      }, 0);
      return;
    }

    // 4. We are NOT inside this format tag. Check if caret is inside a word to wrap it.
    let wordStart = caretInLine;
    let wordEnd = caretInLine;
    while (wordStart > 0 && /\w|[\u0400-\u04FF]/.test(currentLine[wordStart - 1])) {
      wordStart--;
    }
    while (wordEnd < currentLine.length && /\w|[\u0400-\u04FF]/.test(currentLine[wordEnd])) {
      wordEnd++;
    }
    const word = currentLine.slice(wordStart, wordEnd);

    if (word.length > 0 && caretInLine >= wordStart && caretInLine <= wordEnd) {
      const beforeWord = currentLine.slice(0, wordStart);
      const afterWord = currentLine.slice(wordEnd);
      const newLine = beforeWord + tag + word + closeTag + afterWord;
      const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
      const newCaretPos = lineStart + wordStart + tag.length + (caretInLine - wordStart);

      useEditorStore.getState().setContent(newText);
      setActiveFormats(prev => ({ ...prev, [formatKey]: true }));
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true });
        editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
        saveCursorPosition();
      }, 0);
    } else {
      // Insert empty pair e.g. *|*
      const beforeCaret = currentLine.slice(0, caretInLine);
      const afterCaret = currentLine.slice(caretInLine);
      const newLine = beforeCaret + tag + closeTag + afterCaret;
      const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
      const newCaretPos = lineStart + caretInLine + tag.length;

      useEditorStore.getState().setContent(newText);
      setActiveFormats(prev => ({ ...prev, [formatKey]: true }));
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true });
        editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
        saveCursorPosition();
      }, 0);
    }
  }, [saveCursorPosition]);

  const fmt = useCallback((prefix: string, suffix: string = prefix) => {
    if (editorMode === 'visual') {
      if (!wysiwygRef.current) return;

      let formatKey: 'bold' | 'italic' | 'strikethrough' | 'sub' | 'sup' | 'code' | 'phishy' | null = null;
      if (prefix === '**') formatKey = 'bold';
      else if (prefix === '*') formatKey = 'italic';
      else if (prefix === '~~') formatKey = 'strikethrough';
      else if (prefix === '<sub>') formatKey = 'sub';
      else if (prefix === '<sup>') formatKey = 'sup';
      else if (prefix === '`') formatKey = 'code';
      else if (prefix === '<div class="phishy">') formatKey = 'phishy';

      const isFormatActive = formatKey ? activeFormats[formatKey] : false;

      let isCollapsed = false;
      let range: Range | null = null;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && wysiwygRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        range = sel.getRangeAt(0);
        isCollapsed = sel.isCollapsed || range.collapsed;
      } else if (savedVisualRangeRef.current && wysiwygRef.current.contains(savedVisualRangeRef.current.commonAncestorContainer)) {
        range = savedVisualRangeRef.current;
        isCollapsed = range.collapsed;
        restoreVisualSelection(false);
      } else {
        focusVisualEditorEnd();
        const curSel = window.getSelection();
        if (curSel && curSel.rangeCount > 0) {
          range = curSel.getRangeAt(0);
          isCollapsed = true;
        }
      }

      // 1. If format is active AND cursor is collapsed, we handle EXITING/DEACTIVATING the format.
      // We should jump out of the active element instead of stripping the formatting from the whole word.
      if (isCollapsed && isFormatActive && formatKey && range) {
        let activeElement: HTMLElement | null = null;
        let temp = range.startContainer as Node | null;
        while (temp && temp !== wysiwygRef.current) {
          if (temp.nodeType === Node.ELEMENT_NODE) {
            const tagName = (temp as HTMLElement).tagName.toUpperCase();
            if (formatKey === 'bold' && (tagName === 'STRONG' || tagName === 'B')) {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'italic' && (tagName === 'EM' || tagName === 'I')) {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'strikethrough' && (tagName === 'STRIKE' || tagName === 'DEL' || tagName === 'S')) {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'sub' && tagName === 'SUB') {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'sup' && tagName === 'SUP') {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'code' && tagName === 'CODE') {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'phishy' && (tagName === 'SPAN' || tagName === 'DIV') && (temp as HTMLElement).classList.contains('phishy')) {
              activeElement = temp as HTMLElement;
              break;
            }
          }
          temp = temp.parentNode;
        }

        if (activeElement) {
          const cleanText = (activeElement.textContent || '').replace(/[\u200B\s\n]/g, '');
          const parent = activeElement.parentNode;

          if (cleanText === '' && parent) {
            // Tag was empty or only had zero-width spaces -> remove empty element completely
            const zwsp = document.createTextNode('\u200B');
            parent.insertBefore(zwsp, activeElement);
            parent.removeChild(activeElement);

            const newRange = document.createRange();
            newRange.setStart(zwsp, 1);
            newRange.setEnd(zwsp, 1);

            const currentSel = window.getSelection();
            if (currentSel) {
              currentSel.removeAllRanges();
              currentSel.addRange(newRange);
            }
            if (wysiwygRef.current) {
              wysiwygRef.current.focus({ preventScroll: true });
            }
            savedVisualRangeRef.current = newRange.cloneRange();
            setActiveFormats(prev => ({ ...prev, [formatKey!]: false }));
            updateContentFromWysiwyg();
            return;
          }

          if (parent) {
            // Step out of active element to type plain text continuously
            const zwsp = document.createTextNode('\u200B');
            parent.insertBefore(zwsp, activeElement.nextSibling);

            const newRange = document.createRange();
            newRange.setStart(zwsp, 1);
            newRange.setEnd(zwsp, 1);

            const currentSel = window.getSelection();
            if (currentSel) {
              currentSel.removeAllRanges();
              currentSel.addRange(newRange);
            }

            if (wysiwygRef.current) {
              wysiwygRef.current.focus({ preventScroll: true });
            }

            savedVisualRangeRef.current = newRange.cloneRange();
            setActiveFormats(prev => ({ ...prev, [formatKey!]: false }));
            updateContentFromWysiwyg();
            return;
          }
        }
      }

      // 2. Determine if we should expand the word when RESTORING selection.
      // We only expand the word if:
      // - The cursor is collapsed
      // - The format is NOT currently active (we want to apply it to an existing word)
      // - The cursor is strictly inside a word (not at the start or end of a word or at a space)
      let shouldExpandWord = false;
      if (isCollapsed && range && !isFormatActive) {
        const node = range.startContainer;
        const offset = range.startOffset;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const textValue = node.nodeValue || '';
          const wordBoundaryRegex = /[\s\n.,!?;:"'()[\]{}*~`<>#_]/;
          let wStart = offset;
          let wEnd = offset;
          while (wStart > 0 && !wordBoundaryRegex.test(textValue[wStart - 1])) {
            wStart--;
          }
          while (wEnd < textValue.length && !wordBoundaryRegex.test(textValue[wEnd])) {
            wEnd++;
          }

          // Only expand if cursor is strictly inside/adjacent to word, and not at the very end of the text node
          if (wStart < wEnd && offset > wStart && offset < wEnd) {
            shouldExpandWord = true;
          }
        }
      }

      // 3. If cursor is collapsed and not inside a word to expand, activate continuous formatted typing!
      if (isCollapsed && !shouldExpandWord && formatKey && range) {
        let tagToCreate = '';
        if (formatKey === 'bold') tagToCreate = 'strong';
        else if (formatKey === 'italic') tagToCreate = 'em';
        else if (formatKey === 'strikethrough') tagToCreate = 'del';
        else if (formatKey === 'sub') tagToCreate = 'sub';
        else if (formatKey === 'sup') tagToCreate = 'sup';
        else if (formatKey === 'code') tagToCreate = 'code';
        else if (formatKey === 'phishy') tagToCreate = 'span';

        if (tagToCreate) {
          const el = document.createElement(tagToCreate);
          if (formatKey === 'phishy') {
            el.className = 'phishy';
          }
          const zwsp = document.createTextNode('\u200B');
          el.appendChild(zwsp);

          range.deleteContents();
          range.insertNode(el);

          const newRange = document.createRange();
          newRange.setStart(zwsp, 1);
          newRange.setEnd(zwsp, 1);

          const currentSel = window.getSelection();
          if (currentSel) {
            currentSel.removeAllRanges();
            currentSel.addRange(newRange);
          }

          if (wysiwygRef.current) {
            wysiwygRef.current.focus({ preventScroll: true });
          }

          savedVisualRangeRef.current = newRange.cloneRange();
          setActiveFormats(prev => ({ ...prev, [formatKey!]: true }));
          updateContentFromWysiwyg();
          return;
        }
      }

      restoreVisualSelection(shouldExpandWord);

      let command = '';
      if (prefix === '**') command = 'bold';
      else if (prefix === '*') command = 'italic';
      else if (prefix === '~~') command = 'strikeThrough';
      else if (prefix === '<sub>') command = 'subscript';
      else if (prefix === '<sup>') command = 'superscript';

      if (command) {
        document.execCommand(command, false);
        const selAfter = window.getSelection();
        if (selAfter && selAfter.rangeCount > 0 && shouldExpandWord) {
          selAfter.collapseToEnd();
          savedVisualRangeRef.current = selAfter.getRangeAt(0).cloneRange();
          updateContentFromWysiwyg();
          return;
        }
      } else {
        if (prefix === '`') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<code>${text}</code>`);
          if (!text) {
            setActiveFormats(prev => ({ ...prev, code: true }));
          }
        } else if (prefix === '```\n') {
          const text = getVisualSelectionHtml() || 'code block';
          insertHtmlAtCursor(`<pre><code>${text}</code></pre>`);
        } else if (prefix === '<div class="phishy">') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<span class="phishy">${text}</span>`);
          if (!text) {
            setActiveFormats(prev => ({ ...prev, phishy: true }));
          }
        } else if (prefix.includes('text-left') || prefix === '<div class="text-left">\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<div class="text-left">${text}</div>`);
        } else if (prefix.includes('text-right') || prefix === '<div class="text-right">\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<div class="text-right">${text}</div>`);
        } else if (prefix.includes('text-justify') || prefix === '<div class="text-justify">\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<div class="text-justify">${text}</div>`);
        } else if (prefix.includes('<center>') || prefix === '<center>\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<center>${text}</center>`);
        } else {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`${prefix}${text}${suffix}`);
        }
      }
      updateContentFromWysiwyg();
      return;
    }

    if (!editorRef.current) return;

    if (prefix === '**' || prefix === '*' || prefix === '`' || prefix === '~~' || prefix === '<sub>' || prefix === '<sup>' || prefix === '<div class="phishy">') {
      handleMarkdownFormat(prefix, suffix);
      return;
    }

    const range = getSelectionOrWord();
    
    if (range.text.length === 0) {
      const textToInsert = prefix + suffix;
      const newContent = useEditorStore.getState().content.substring(0, range.s) + textToInsert + useEditorStore.getState().content.substring(range.e);
      useEditorStore.getState().setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(range.s + prefix.length, range.s + prefix.length);
      }, 0);
    } else {
      const leadingSpaces = range.text.slice(0, range.text.length - range.text.trimStart().length);
      const trailingSpaces = range.text.slice(range.text.trimEnd().length);
      const trimmed = range.text.trim();
      const newText = trimmed ? (leadingSpaces + prefix + trimmed + suffix + trailingSpaces) : (prefix + suffix);
      const newContent = useEditorStore.getState().content.substring(0, range.s) + newText + useEditorStore.getState().content.substring(range.e);
      useEditorStore.getState().setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); 
        editorRef.current.setSelectionRange(range.s + leadingSpaces.length + prefix.length, range.s + leadingSpaces.length + prefix.length + trimmed.length);
      }, 0);
    }
  }, [ getSelectionOrWord, editorMode, insertHtmlAtCursor, getVisualSelectionHtml, restoreVisualSelection, handleMarkdownFormat, updateContentFromWysiwyg, activeFormats]);

  const fmtLine = useCallback((prefix: string) => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      restoreVisualSelection(true);
      if (prefix === '# ') {
        document.execCommand('formatBlock', false, '<h1>');
      } else if (prefix === '## ') {
        document.execCommand('formatBlock', false, '<h2>');
      } else if (prefix === '### ') {
        document.execCommand('formatBlock', false, '<h3>');
      } else if (prefix === '> ') {
        document.execCommand('formatBlock', false, '<blockquote>');
      } else if (prefix === '- ') {
        document.execCommand('insertUnorderedList', false);
      } else if (prefix === '1. ') {
        document.execCommand('insertOrderedList', false);
      } else if (prefix === '- [ ] ') {
        insertHtmlAtCursor('<ul class="task-list"><li><input type="checkbox" style="margin-right: 0.5rem;" /> Task</li></ul>');
      } else {
        const text = getVisualSelectionHtml();
        insertHtmlAtCursor(`${prefix}${text}`);
      }
      updateContentFromWysiwyg();
      return;
    }

    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    
    if (start === end) {
      const lastNewline = content.lastIndexOf('\n', start - 1) + 1;
      const newContent = content.substring(0, lastNewline) + prefix + content.substring(lastNewline);
      useEditorStore.getState().setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    } else {
      // Multi-line selection
      const selectedText = content.substring(start, end);
      const lines = selectedText.split('\n');
      const newText = lines.map(line => line.trim() ? prefix + line : line).join('\n');
      const newContent = content.substring(0, start) + newText + content.substring(end);
      useEditorStore.getState().setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start, start + newText.length);
      }, 0);
    }
  }, [ editorMode, insertHtmlAtCursor, getVisualSelectionHtml, restoreVisualSelection, updateContentFromWysiwyg]);

  const handleLink = useCallback(async () => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      restoreVisualSelection(true);
      const selectionHtml = getVisualSelectionHtml() || '';
      const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(selectionHtml.trim());
      
      if (isUrl) {
        const label = await promptDialog(t('linkPrompt'), "");
        if (label !== null) {
          const cleanLabel = label.trim() || selectionHtml;
          insertHtmlAtCursor(`<a href="${selectionHtml.trim()}">${cleanLabel}</a>`);
        }
      } else {
        const url = await promptDialog(t('urlPrompt'), "https://");
        if (url) {
          document.execCommand('createLink', false, url);
          updateContentFromWysiwyg();
        }
      }
      return;
    }

    const selection = getSelectionOrWord();
    const trimmed = selection.text.trim();
    const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(trimmed);
    
    if (isUrl) {
      const label = await promptDialog(t('linkPrompt'), "");
      if (label !== null) {
        const newText = label ? `[${label}](${trimmed})` : `[${trimmed}](${trimmed})`;
        const newContent = content.substring(0, selection.s) + newText + content.substring(selection.e);
        useEditorStore.getState().setContent(newContent);
      }
    } else {
      const url = await promptDialog(t('urlPrompt'), "https://");
      if (url) fmt('[', `](${url})`);
    }
  }, [ t, getSelectionOrWord, fmt, promptDialog, editorMode, restoreVisualSelection, getVisualSelectionHtml, insertHtmlAtCursor, updateContentFromWysiwyg]);

  const handleIndent = useCallback(() => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      restoreVisualSelection(false);
      const sel = window.getSelection();
      let insideList = false;
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        insideList = !!(node as HTMLElement)?.closest?.('li, ul, ol');
      }
      
      if (insideList) {
        document.execCommand('indent', false);
      } else {
        insertHtmlAtCursor('&nbsp;&nbsp;&nbsp;&nbsp;');
      }
      updateContentFromWysiwyg();
      return;
    }
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    const lines = selectedText.split('\n');
    const newText = lines.map(line => '    ' + line).join('\n');
    const newContent = content.substring(0, start) + newText + content.substring(end);
    useEditorStore.getState().setContent(newContent);
  }, [ editorMode, restoreVisualSelection, updateContentFromWysiwyg, insertHtmlAtCursor]);

  return {
    activeFormats,
    setActiveFormats,
    insertHtmlAtCursor,
    insertAtCursor,
    handleMarkdownFormat,
    fmt,
    fmtLine,
    handleLink,
    handleIndent
  };
}
