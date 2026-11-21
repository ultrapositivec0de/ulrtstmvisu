import React, { useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useEditorStore } from '../../store';
import { useLightboxStore } from '../../store/lightboxStore';
import { normalizeHtmlForVisualEditor } from '../../utils/markdownParser';
import { hydrateCachedImagesInContainer, restoreCanonicalUrl } from '../../services/imageCacheDb';

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

const escapeHtmlText = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const plainTextToParagraphHtml = (text: string) => {
  const normalized = text.replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n{2,}/);
  return blocks
    .map((block) => `<p>${escapeHtmlText(block).replace(/\n/g, '<br>') || '<br>'}</p>`)
    .join('');
};

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
  const lastPasteTimeRef = useRef<number>(0);

  useEffect(() => {
    const el = wysiwygRef.current;
    if (!el) return;

    const runHydration = () => {
      hydrateCachedImagesInContainer(el, { cacheOnLoad: false }).catch(() => {});
    };

    runHydration();
    const observer = new MutationObserver(() => {
      runHydration();
    });
    observer.observe(el, { childList: true, subtree: true });

    const onCacheUpdated = () => runHydration();
    window.addEventListener('steem-image-cache-updated', onCacheUpdated);
    return () => {
      observer.disconnect();
      window.removeEventListener('steem-image-cache-updated', onCacheUpdated);
    };
  }, [wysiwygRef]);

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

        lastPasteTimeRef.current = Date.now();

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
            updateContentFromWysiwyg(false);
            return;
          }
        }

        const isLargePaste = (textData?.length || 0) > 1200 || (htmlData?.length || 0) > 2500;
        if (isLargePaste) {
          // Yield a frame so Android keyboard/clipboard overlay finishes dismissing without freezing UI
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }

        let finalHtml = '';

        // Fast path for large plain-text pastes without Markdown tokens or URLs
        const hasMarkdownOrUrls =
          !!textData && /([*_`#>[\]!~|]|https?:\/\/|^[\t ]*[-*+\d]+\.)/m.test(textData);

        if (!htmlData && textData && !hasMarkdownOrUrls) {
          finalHtml = plainTextToParagraphHtml(textData);
        } else {
          const m = getMarked();
          if (!m) return;

          if (htmlData) {
            const md = htmlToMarkdown(htmlData);
            finalHtml = await m.parse(md);
          } else if (textData) {
            const processed = convertBareImageUrlsToMarkdown(textData);
            finalHtml = await m.parse(processed);
          }
        }
        
        if (finalHtml) {
          finalHtml = normalizeHtmlForVisualEditor(finalHtml.trim());
          if (finalHtml.startsWith('<p>') && finalHtml.endsWith('</p>') && (finalHtml.match(/<p>/g) || []).length === 1) {
            finalHtml = finalHtml.substring(3, finalHtml.length - 4);
          }

          lastPasteTimeRef.current = Date.now();
          if (!document.execCommand('insertHTML', false, finalHtml)) {
            insertHtmlAtCursor(finalHtml as string);
          }

          if (wysiwygRef.current && wysiwygRef.current.querySelector('.table-spacer, [data-empty]')) {
            wysiwygRef.current.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((el) => {
              const txt = el.textContent || '';
              if (txt.trim() !== '' || el.children.length > 1 || (el.children.length === 1 && el.firstElementChild?.tagName !== 'BR')) {
                el.removeAttribute('data-empty');
                el.removeAttribute('data-placeholder');
                el.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
              }
            });
          }

          // Always schedule debounced sync (never force immediate double-serialization on paste)
          updateContentFromWysiwyg(false);
        }
      }}
      onInput={(e) => {
        if (isSyncingRef.current) return;
        const target = e.target as HTMLDivElement;
        updateWysiwygEmptyStatus(target);

        if (target.getElementsByClassName('table-spacer').length > 0 || target.querySelector('[data-empty]')) {
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
        }

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
        if (
          scrollCaretIntoView &&
          !document.hidden &&
          Date.now() - lastPasteTimeRef.current >= 350
        ) {
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
        if (
          scrollCaretIntoView &&
          !document.hidden &&
          Date.now() - lastPasteTimeRef.current >= 350
        ) {
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
          const canonical = restoreCanonicalUrl(img.getAttribute('data-canonical-src') || img.src);
          useLightboxStore.getState().openLightbox(canonical, img.alt || '');
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
