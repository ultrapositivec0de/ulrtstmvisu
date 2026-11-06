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

    // Cache management
    if (postHtmlCache.size > MAX_CACHE_SIZE) {
      const firstKey = postHtmlCache.keys().next().value;
      if (firstKey) postHtmlCache.delete(firstKey);
    }
    postHtmlCache.set(cacheKey, sanitized);

    return sanitized;
  } catch (err) {
    console.warn('formatPostHtml error:', err);
    const fallback = (DOMPurify.sanitize(textToParse, DOM_PURIFY_CONFIG as any) as unknown) as string;
    return fallback;
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
