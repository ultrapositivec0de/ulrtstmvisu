import React from 'react';
import { cn } from '../../lib/utils';
import { useEditorStore } from '../../store';
import { useLightboxStore } from '../../store/lightboxStore';
import { normalizeHtmlForVisualEditor } from '../../utils/markdownParser';

export interface WysiwygCanvasProps {
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  isSyncingRef: React.RefObject<boolean>;
  handleWysiwygBeforeInput: (e: any) => void;
  handleWysiwygKeyDown: (e: any) => void;
  isImageAndProxyUrl: (url: string) => boolean;
  insertHtmlAtCursor: (html: string) => void;
  updateContentFromWysiwyg: (forceImmediate?: boolean) => void;
  htmlToMarkdown: (html: string) => string;
  convertBareImageUrlsToMarkdown: (text: string) => string;
  getMarked: () => any;
  updateWysiwygEmptyStatus: (el: HTMLDivElement | null) => void;
  scrollCaretIntoView?: (block?: ScrollLogicalPosition) => void;
  saveVisualSelection: () => void;
  setIsEditorFocused: (focused: boolean) => void;
  showWidget: (clientX: number, clientY: number) => void;
  widgetPos: 'bottom' | 'floating' | 'hidden';
  setIsWidgetVisible: (v: boolean) => void;
  handleWysiwygScroll: () => void;
  visualStyle: string;
  neonTextColored: boolean;
  beautifyEnabled: boolean;
  bottomSpacingClass: string;
  t: (key: any) => string;
}

export const WysiwygCanvas: React.FC<WysiwygCanvasProps> = React.memo(({
  wysiwygRef,
  isSyncingRef,
  handleWysiwygBeforeInput,
  handleWysiwygKeyDown,
  isImageAndProxyUrl,
  insertHtmlAtCursor,
  updateContentFromWysiwyg,
  htmlToMarkdown,
  convertBareImageUrlsToMarkdown,
  getMarked,
  updateWysiwygEmptyStatus,
  scrollCaretIntoView,
  saveVisualSelection,
  setIsEditorFocused,
  showWidget,
  widgetPos,
  setIsWidgetVisible,
  handleWysiwygScroll,
  visualStyle,
  neonTextColored,
  beautifyEnabled,
  bottomSpacingClass,
  t,
}) => {
  return (
    <div
      ref={wysiwygRef}
      contentEditable
      suppressContentEditableWarning
      onBeforeInput={handleWysiwygBeforeInput}
      onKeyDown={handleWysiwygKeyDown}
      onPaste={async (e) => {
        e.preventDefault();
        
        const htmlData = e.clipboardData.getData('text/html');
        const textData = e.clipboardData.getData('text/plain');
        
        if (!textData && !htmlData) return;

        // Convert current spacer to standard paragraph before pasting if selection is inside
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const anchorNode = sel.anchorNode;
          if (anchorNode) {
            const parentEl = anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as Element) : anchorNode.parentElement;
            const spacerEl = parentEl?.closest('.table-spacer, [data-placeholder], [data-empty]');
            if (spacerEl) {
              spacerEl.removeAttribute('data-empty');
              spacerEl.removeAttribute('data-placeholder');
              spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
            }
          }
        }
        
        if (textData) {
          const trimmedText = textData.trim();
          if (isImageAndProxyUrl(trimmedText)) {
            const imgHtml = `<img src="${trimmedText}" alt="image">`;
            if (!document.execCommand('insertHTML', false, imgHtml)) {
              insertHtmlAtCursor(imgHtml);
            }
            updateContentFromWysiwyg();
            return;
          }
        }

        const m = getMarked();
        if (!m) return;

        let finalHtml = '';
        
        if (htmlData) {
          const md = htmlToMarkdown(htmlData);
          finalHtml = await m.parse(md);
        } else if (textData) {
          const processed = convertBareImageUrlsToMarkdown(textData);
          finalHtml = await m.parse(processed);
        }
        
        if (finalHtml) {
          finalHtml = normalizeHtmlForVisualEditor(finalHtml.trim());
          if (finalHtml.startsWith('<p>') && finalHtml.endsWith('</p>') && (finalHtml.match(/<p>/g) || []).length === 1) {
            finalHtml = finalHtml.substring(3, finalHtml.length - 4);
          }
          
          if (!document.execCommand('insertHTML', false, finalHtml)) {
            insertHtmlAtCursor(finalHtml as string);
          }

          if (wysiwygRef.current) {
            wysiwygRef.current.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((el) => {
              const txt = el.textContent || '';
              if (txt.trim() !== '' || el.children.length > 1 || (el.children.length === 1 && el.firstElementChild?.tagName !== 'BR')) {
                el.removeAttribute('data-empty');
                el.removeAttribute('data-placeholder');
                el.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
              }
            });
          }

          updateContentFromWysiwyg();
        }
      }}
      onInput={(e) => {
        if (isSyncingRef.current) return;
        const target = e.target as HTMLDivElement;
        updateWysiwygEmptyStatus(target);

        target.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((spacerEl) => {
          const isTop = spacerEl === target.firstElementChild && spacerEl.classList.contains('top-spacer');
          const isBottom = spacerEl === target.lastElementChild && spacerEl.classList.contains('bottom-spacer');
          const textStr = spacerEl.textContent || '';
          const hasContent = textStr.trim() !== '' || spacerEl.children.length > 1 || (spacerEl.children.length === 1 && spacerEl.firstElementChild?.tagName !== 'BR');
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

        const blockTags = ['TABLE'];

        const firstEl = target.firstElementChild;
        if (firstEl && blockTags.includes(firstEl.tagName) && !firstEl.classList.contains('top-spacer')) {
          if (!target.querySelector('.top-spacer')) {
            const pBefore = document.createElement('p');
            pBefore.className = 'table-spacer top-spacer';
            pBefore.setAttribute('data-empty', 'true');
            pBefore.setAttribute('data-placeholder', t('newParagraphPlaceholder'));
            pBefore.innerHTML = '<br>';
            target.insertBefore(pBefore, firstEl);
          }
        }

        const lastEl = target.lastElementChild;
        if (lastEl && blockTags.includes(lastEl.tagName) && !lastEl.classList.contains('bottom-spacer')) {
          if (!target.querySelector('.bottom-spacer')) {
            const pAfter = document.createElement('p');
            pAfter.className = 'table-spacer bottom-spacer';
            pAfter.setAttribute('data-empty', 'true');
            pAfter.setAttribute('data-placeholder', t('newParagraphPlaceholder'));
            pAfter.innerHTML = '<br>';
            target.appendChild(pAfter);
          }
        }

        // Use the unified sync function from useWysiwygSync hook
        updateContentFromWysiwyg(false);
        if (scrollCaretIntoView) {
          requestAnimationFrame(() => {
            scrollCaretIntoView('nearest');
          });
        }
      }}
      onFocus={() => {
        setIsEditorFocused(true);
        saveVisualSelection();
        if (widgetPos !== 'hidden') setIsWidgetVisible(true);
      }}
      onBlur={() => {
        setIsEditorFocused(false);
        updateContentFromWysiwyg(true);
      }}
      onScroll={handleWysiwygScroll}
      onMouseUp={(e) => {
        showWidget(e.clientX, e.clientY);
        saveVisualSelection();
      }}
      onKeyUp={() => {
        updateWysiwygEmptyStatus(wysiwygRef.current);
        saveVisualSelection();
        if (scrollCaretIntoView) {
          requestAnimationFrame(() => {
            scrollCaretIntoView('nearest');
          });
        }
      }}
      onClick={(e) => {
        const trg = e.target as HTMLElement;
        // Prevent accidental link navigation on wrapped images inside contenteditable
        if (trg.tagName === 'IMG' || trg.closest('img')) {
          const anchor = trg.closest('a');
          if (anchor) {
            e.preventDefault();
          }
        }

        const spacer = trg.closest?.('.table-spacer, [data-placeholder], [data-empty]') as HTMLElement | null;
        if (spacer && wysiwygRef.current?.contains(spacer)) {
          spacer.removeAttribute('data-empty');
          spacer.removeAttribute('data-placeholder');
          spacer.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
          
          if (!spacer.innerHTML || spacer.innerHTML.trim() === '') {
            spacer.innerHTML = '<br>';
          }
          
          const s = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(spacer);
          range.collapse(true);
          s?.removeAllRanges();
          s?.addRange(range);
          
          updateContentFromWysiwyg();
          return;
        }

        updateWysiwygEmptyStatus(wysiwygRef.current);
        saveVisualSelection();
      }}
      onDoubleClick={(e) => {
        const trg = e.target as HTMLElement;
        const img = trg.tagName === 'IMG' ? (trg as HTMLImageElement) : trg.closest('img');
        if (img && img.src) {
          e.preventDefault();
          e.stopPropagation();
          useLightboxStore.getState().openLightbox(img.src, img.alt || '');
        }
      }}
      className={cn(
        "relative flex-1 w-full bg-transparent text-base outline-none overflow-y-auto custom-scrollbar editor-font prose prose-invert prose-cyan max-w-none wysiwyg-editor break-words overscroll-contain",
        (visualStyle === 'neon' && neonTextColored) ? "text-cyan-400 font-normal" : "text-slate-300",
        beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-4xl mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-4 pt-4 lg:px-6 lg:pt-6",
        bottomSpacingClass
      )}
      data-is-empty={useEditorStore.getState().content.trim() === '' ? 'true' : undefined}
      data-placeholder-title={t('visualTitlePlaceholder')}
      data-placeholder-body={t('visualBodyPlaceholder')}
      style={{ minHeight: '200px' }}
    />
  );
});

WysiwygCanvas.displayName = 'WysiwygCanvas';
export default WysiwygCanvas;
