import { getMarked, DOM_PURIFY_CONFIG } from './markdownParser';
import DOMPurify from 'dompurify';

export interface PostFormatOptions {
  loadImages?: boolean;
  addHeadingIds?: boolean;
  imageBlockedPlaceholder?: string;
  truncateLength?: number;
}

const postHtmlCache = new Map<string, string>();
const MAX_CACHE_SIZE = 150;

function getCacheKey(body: string, options?: PostFormatOptions): string {
  const loadImages = options?.loadImages !== false ? '1' : '0';
  const addHeadings = options?.addHeadingIds ? '1' : '0';
  const trunc = options?.truncateLength || 0;
  return `${loadImages}:${addHeadings}:${trunc}:${body.length}:${body.slice(0, 80)}`;
}

/**
 * Unwraps Steemit/Hive/Ecency image resize proxy prefixes (e.g. https://steemitimages.com/640x0/https://...)
 * to preserve and copy the full canonical image URL including filename.
 */
export function getCanonicalImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const proxyMatch = trimmed.match(
    /^https?:\/\/(?:steemitimages\.com|images\.hive\.blog|images\.ecency\.com)\/\d+x\d+\/(https?:\/\/.+)$/i
  );
  if (proxyMatch && proxyMatch[1]) {
    return proxyMatch[1];
  }
  return trimmed;
}

export async function copyTextWithFallback(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Wraps sanitized <pre> code blocks in native <details>/<summary> collapsible containers
 * with horizontal scrolling so mobile layouts never overflow and large/frequent code blocks auto-collapse.
 */
export function enhanceCodeBlocksInHtml(
  html: string,
  labels?: { codeLabel?: string; linesUnit?: string }
): string {
  if (!html || !html.includes('<pre')) return html;
  if (typeof DOMParser === 'undefined') return html;

  try {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const pres = Array.from(doc.body.querySelectorAll('pre')).filter(
      (pre) => !pre.closest('details.steem-code-block')
    );
    if (pres.length === 0) return html;

    const totalBlocks = pres.length;
    const codeLabel = labels?.codeLabel || 'CODE';
    const linesUnit = labels?.linesUnit || 'L';

    pres.forEach((pre) => {
      const text = (pre.textContent || '').replace(/\r\n/g, '\n');
      const trimmedEnd = text.replace(/\n+$/, '');
      const lineCount = trimmedEnd ? trimmedEnd.split('\n').length : 1;
      const charCount = trimmedEnd.length;

      const codeEl = pre.querySelector('code');
      const langClass = Array.from(codeEl?.classList || []).find((c) => c.startsWith('language-'));
      const langName = langClass ? langClass.replace('language-', '').toUpperCase() : codeLabel;

      const shouldAutoCollapse = totalBlocks > 2 || lineCount > 8 || charCount > 350;

      const details = doc.createElement('details');
      details.className = 'steem-code-block';
      if (!shouldAutoCollapse) {
        details.setAttribute('open', '');
      }

      const summary = doc.createElement('summary');
      summary.className = 'steem-code-summary';

      const leftSpan = doc.createElement('span');
      leftSpan.className = 'steem-code-meta';

      const chevronSpan = doc.createElement('span');
      chevronSpan.className = 'steem-code-chevron';
      chevronSpan.textContent = '▸';

      const langSpan = doc.createElement('span');
      langSpan.className = 'steem-code-lang';
      langSpan.textContent = langName;

      const countSpan = doc.createElement('span');
      countSpan.className = 'steem-code-lines';
      countSpan.textContent = `${lineCount} ${linesUnit}`;

      leftSpan.appendChild(chevronSpan);
      leftSpan.appendChild(langSpan);
      leftSpan.appendChild(countSpan);

      const hintSpan = doc.createElement('span');
      hintSpan.className = 'steem-code-toggle-hint';

      summary.appendChild(leftSpan);
      summary.appendChild(hintSpan);

      const scrollDiv = doc.createElement('div');
      scrollDiv.className = 'steem-code-scroll';

      pre.parentNode?.insertBefore(details, pre);
      scrollDiv.appendChild(pre);
      details.appendChild(summary);
      details.appendChild(scrollDiv);
    });

    return doc.body.innerHTML;
  } catch (err) {
    console.warn('enhanceCodeBlocksInHtml error:', err);
    return html;
  }
}

/**
 * Formats post body markdown/HTML into sanitized HTML string.
 * Supports caching, custom image blocking, heading IDs with slugs, and DOMPurify.
 */
export async function formatPostHtml(
  body: string,
  options?: PostFormatOptions
): Promise<string> {
  if (!body) return '';

  const cacheKey = getCacheKey(body, options);
  const cached = postHtmlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let textToParse = body;
  if (options?.truncateLength && options.truncateLength > 0 && textToParse.length > options.truncateLength) {
    textToParse = textToParse.slice(0, options.truncateLength) + '...';
  }

  try {
    const markedInstance = getMarked();
    const parsed = await markedInstance.parse(textToParse);
    let html = typeof parsed === 'string' ? parsed : textToParse;

    // Optional heading IDs for Table of Contents navigation
    if (options?.addHeadingIds) {
      let headingIdx = 0;
      html = html.replace(/<h([1-6])([^>]*)>(.*?)<\/h\1>/gi, (_match, level, attrs, innerText) => {
        const rawText = innerText.replace(/<[^>]+>/g, '').trim();
        const slug = rawText ? rawText.toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '-').slice(0, 30) : '';
        const id = `heading-${headingIdx++}-${slug}`;
        return `<h${level}${attrs} id="${id}">${innerText}</h${level}>`;
      });
    }

    // Image loading blocker for traffic saving or performance mode
    if (options?.loadImages === false) {
      const placeholder = options.imageBlockedPlaceholder || '<div class="image-blocked-placeholder">Image hidden</div>';
      html = html.replace(/<img[^>]*>/gi, placeholder);
    }

    // Secure referrerpolicy on all external images
    html = html.replace(/<img /gi, '<img referrerpolicy="no-referrer" ');

    // Sanitize with strict whitelist
    const sanitized = (DOMPurify.sanitize(html, DOM_PURIFY_CONFIG as any) as unknown) as string;
    const enhanced = enhanceCodeBlocksInHtml(sanitized);

    // Cache management
    if (postHtmlCache.size > MAX_CACHE_SIZE) {
      const firstKey = postHtmlCache.keys().next().value;
      if (firstKey) postHtmlCache.delete(firstKey);
    }
    postHtmlCache.set(cacheKey, enhanced);

    return enhanced;
  } catch (err) {
    console.warn('formatPostHtml error:', err);
    const fallback = (DOMPurify.sanitize(textToParse, DOM_PURIFY_CONFIG as any) as unknown) as string;
    return enhanceCodeBlocksInHtml(fallback);
  }
}

/**
 * Fast synchronous fallback formatting if async parse cannot wait
 */
export function formatPostHtmlSync(
  body: string,
  options?: PostFormatOptions
): string {
  if (!body) return '';
  const cacheKey = getCacheKey(body, options);
  const cached = postHtmlCache.get(cacheKey);
  if (cached) return cached;

  let textToParse = body;
  if (options?.truncateLength && options.truncateLength > 0 && textToParse.length > options.truncateLength) {
    textToParse = textToParse.slice(0, options.truncateLength) + '...';
  }

  // Basic fallback sanitization
  return (DOMPurify.sanitize(textToParse, DOM_PURIFY_CONFIG as any) as unknown) as string;
}

export function getWordCounts(body: string): { clean: number; dirty: number } {
  if (!body) return { clean: 0, dirty: 0 };
  const dirtyWords = body.trim().split(/\s+/).length;
  // Strip Markdown links, images
  const noMdLinks = body
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "");
  // Strip HTML
  const noHtml = noMdLinks.replace(/<[^>]*>/g, " ");
  // Strip special characters except alphanumeric, cyrillic, punctuation inside words
  const cleanText = noHtml
    .replace(/[^\w\u0400-\u04FF]+ /g, " ")
    .replace(/ [^\w\u0400-\u04FF]+/g, " ")
    .trim();
  const cleanWords = cleanText
    ? cleanText.split(/\s+/).filter((w) => w.length > 0).length
    : 0;
  return { clean: cleanWords, dirty: dirtyWords };
}
