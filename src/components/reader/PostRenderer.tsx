import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Tag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPostHtml, PostFormatOptions } from '../../utils/postFormatting';
import { useLightboxStore } from '../../store/lightboxStore';
import { useEditorStore } from '../../store';
import { getTranslation, TranslationKey } from '../../locales';

export interface PostRendererProps {
  body: string;
  title?: string;
  tags?: string;
  author?: string;
  created?: string;
  community?: string;
  permlink?: string;
  mode?: 'full' | 'feed-item' | 'preview';
  isDarkMode?: boolean;
  visualStyle?: string;
  fontSize?: number;
  fontWeight?: string | number;
  lineHeight?: number | string;
  maxWidth?: number | string;
  loadImages?: boolean;
  beautifyEnabled?: boolean;
  onImageClick?: (url: string, alt?: string) => void;
  onTagClick?: (tag: string) => void;
  onAuthorClick?: (author: string) => void;
  className?: string;
}

export const PostRenderer: React.FC<PostRendererProps> = React.memo(({
  body,
  title,
  tags,
  author,
  created: _created,
  community: _community,
  permlink: _permlink,
  mode = 'full',
  isDarkMode = true,
  visualStyle = 'dark',
  fontSize = 16,
  fontWeight = 'normal',
  lineHeight = 1.6,
  maxWidth,
  loadImages = true,
  beautifyEnabled = false,
  onImageClick,
  onTagClick,
  onAuthorClick,
  className,
}) => {
  const currentLang = useEditorStore(s => s.currentLang);
  const t = (key: TranslationKey) => getTranslation(currentLang, key);

  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const options: PostFormatOptions = {
      loadImages,
      addHeadingIds: mode === 'preview' || mode === 'full',
      truncateLength: mode === 'feed-item' ? 400 : undefined,
      imageBlockedPlaceholder: `<div class="image-blocked-placeholder py-3 px-4 bg-slate-800/40 border border-slate-700/50 rounded-xl text-center text-xs text-slate-400 italic">${t('imageHiddenBlocked')}</div>`
    };

    formatPostHtml(body, options).then(html => {
      if (isMounted) {
        setRenderedHtml(html);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [body, loadImages, mode, currentLang]);

  const tagList = useMemo(() => {
    if (!tags) return [];
    return tags.trim().split(/\s+/).filter(Boolean);
  }, [tags]);

  const themeProseClasses = useMemo(() => {
    if (visualStyle === 'neon') {
      return 'prose prose-invert prose-cyan';
    }
    if (isDarkMode) {
      return 'prose prose-invert prose-cyan prose-headings:text-slate-100 text-slate-300';
    }
    return 'prose prose-slate prose-headings:text-slate-900 text-slate-800';
  }, [visualStyle, isDarkMode]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Lightbox for image clicks
    const img = target.tagName === 'IMG' ? (target as HTMLImageElement) : target.closest('img');
    if (img && img.src) {
      e.preventDefault();
      e.stopPropagation();
      if (onImageClick) {
        onImageClick(img.src, img.alt || '');
      } else {
        useLightboxStore.getState().openLightbox(img.src, img.alt || '');
      }
      return;
    }

    // Anchor click handler
    const anchor = target.tagName === 'A' ? (target as HTMLAnchorElement) : target.closest('a');
    if (anchor && anchor.href) {
      const href = anchor.getAttribute('href') || '';
      // Tag link
      if (href.startsWith('/trending/') || href.startsWith('/created/') || href.startsWith('/hot/')) {
        const parts = href.split('/');
        const tag = parts[parts.length - 1];
        if (tag && onTagClick) {
          e.preventDefault();
          onTagClick(tag);
          return;
        }
      }
      // Author mention link
      if (href.startsWith('/@') || href.startsWith('@')) {
        const username = href.replace(/^(\/@|@)/, '');
        if (username && onAuthorClick) {
          e.preventDefault();
          onAuthorClick(username);
          return;
        }
      }
    }
  }, [onImageClick, onTagClick, onAuthorClick]);

  return (
    <article
      className={cn(
        "w-full transition-all selection:bg-cyan-500/30",
        mode === 'preview' && (beautifyEnabled ? "max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12" : "w-full max-w-none px-4 sm:px-8 py-8 sm:py-12"),
        mode === 'feed-item' && "px-0 py-1",
        mode === 'full' && "px-4 sm:px-6 py-6",
        className
      )}
      style={{
        fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
        fontWeight: fontWeight,
        lineHeight: lineHeight,
        maxWidth: maxWidth,
      }}
    >
      {/* Optional Title and Metadata for Preview / Full modes */}
      {(mode === 'preview' || (mode === 'full' && title)) && (
        <header className="mb-8 pb-6 border-b border-slate-700/40">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-3 leading-tight break-words [overflow-wrap:anywhere] hyphens-auto">
            {title || t('readerUntitledDoc')}
          </h1>

          {author && (
            <div className="flex items-center gap-2 mb-3 text-xs text-slate-400 font-medium">
              <span>@{author}</span>
            </div>
          )}

          {tagList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs opacity-80">
              <Tag size={13} className="shrink-0 text-cyan-400" />
              {tagList.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className="px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-medium hover:bg-cyan-900/60 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </header>
      )}

      {/* Post HTML Body */}
      {body ? (
        <div
          ref={containerRef}
          onClick={handleContentClick}
          className={cn(
            "post-renderer-body markdown-body max-w-none break-words [overflow-wrap:anywhere] hyphens-auto",
            "[&_h1]:scroll-mt-20 [&_h2]:scroll-mt-20 [&_h3]:scroll-mt-20 [&_h4]:scroll-mt-20 [&_h5]:scroll-mt-20 [&_h6]:scroll-mt-20",
            "[&_h1]:break-words [&_h1]:[overflow-wrap:anywhere] [&_h1]:hyphens-auto",
            "[&_h2]:break-words [&_h2]:[overflow-wrap:anywhere] [&_h2]:hyphens-auto",
            "[&_h3]:break-words [&_h3]:[overflow-wrap:anywhere] [&_h3]:hyphens-auto",
            "[&_h4]:break-words [&_h4]:[overflow-wrap:anywhere] [&_h4]:hyphens-auto",
            "[&_h5]:break-words [&_h5]:[overflow-wrap:anywhere] [&_h5]:hyphens-auto",
            "[&_h6]:break-words [&_h6]:[overflow-wrap:anywhere] [&_h6]:hyphens-auto",
            "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-4 [&_img]:object-contain [&_img]:cursor-zoom-in [&_img]:transition-transform hover:[&_img]:opacity-95",
            themeProseClasses
          )}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <div className="py-16 text-center opacity-40 text-sm italic">
          {t('readerEmptyDocHint')}
        </div>
      )}
    </article>
  );
});

PostRenderer.displayName = 'PostRenderer';
export default PostRenderer;
