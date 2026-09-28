import React, { useState, useEffect, useMemo } from 'react';
import { TOCHeadingItem } from './types';
import { getMarked, DOM_PURIFY_CONFIG } from '../../utils/markdownParser';
import DOMPurify from 'dompurify';
import { Tag } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DocReaderContentProps {
  title: string;
  tags?: string;
  content: string;
  headings: TOCHeadingItem[];
  isDarkMode?: boolean;
  visualStyle?: string;
  editorFontSize?: number;
  wysiwygSpacing?: number;
  beautifyEnabled?: boolean;
}

const cacheRefGlobal = new Map<string, string>();

export const DocReaderContent = React.memo<DocReaderContentProps>(({
  title,
  tags,
  content,
  headings: _headings,
  isDarkMode = true,
  visualStyle = 'dark',
  editorFontSize = 16,
  wysiwygSpacing = 1.6,
  beautifyEnabled = false
}) => {
  const [renderedHtml, setRenderedHtml] = useState<string>(() => {
    if (!content) return '';
    return cacheRefGlobal.get(content) || '';
  });
  const contentContainerRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!content) {
      setRenderedHtml('');
      return;
    }

    const cached = cacheRefGlobal.get(content);
    if (cached) {
      setRenderedHtml(cached);
      return;
    }

    let isMounted = true;
    const processMarkdown = async () => {
      try {
        const markedInstance = getMarked();
        const parsed = await markedInstance.parse(content);
        const parsedHtml = typeof parsed === 'string' ? parsed : content;
        let headingIdx = 0;
        const finalHtml = parsedHtml.replace(/<h([1-6])([^>]*)>(.*?)<\/h\1>/gi, (_match, level, attrs, innerText) => {
          const rawText = innerText.replace(/<[^>]+>/g, '').trim();
          const slug = rawText ? rawText.toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '-').slice(0, 30) : '';
          const id = `heading-${headingIdx++}-${slug}`;
          return `<h${level}${attrs} id="${id}">${innerText}</h${level}>`;
        });
        const sanitized = (DOMPurify.sanitize(finalHtml, DOM_PURIFY_CONFIG as any) as unknown) as string;
        cacheRefGlobal.set(content, sanitized);
        if (isMounted) {
          setRenderedHtml(sanitized);
        }
      } catch (err) {
        console.warn('DocReader markdown parse error:', err);
        if (isMounted) {
          const fallback = (DOMPurify.sanitize(content, DOM_PURIFY_CONFIG as any) as unknown) as string;
          cacheRefGlobal.set(content, fallback);
          setRenderedHtml(fallback);
        }
      }
    };

    processMarkdown();
    return () => {
      isMounted = false;
    };
  }, [content]);

  // Width class based on global beautifyEnabled
  const widthClass = useMemo(() => {
    return beautifyEnabled ? 'max-w-4xl mx-auto' : 'w-full max-w-none';
  }, [beautifyEnabled]);

  // Theme prose classes matching global app theme
  const themeProseClasses = useMemo(() => {
    if (visualStyle === 'neon') {
      return 'prose prose-invert prose-cyan';
    }
    if (isDarkMode) {
      return 'prose prose-invert prose-cyan prose-headings:text-slate-100 text-slate-300';
    }
    return 'prose prose-slate prose-headings:text-slate-900 text-slate-800';
  }, [visualStyle, isDarkMode]);

  const tagList = useMemo(() => {
    if (!tags) return [];
    return tags.trim().split(/\s+/).filter(Boolean);
  }, [tags]);

  return (
    <article 
      className={cn(
        "w-full px-4 sm:px-8 py-8 sm:py-12 transition-all selection:bg-cyan-500/30",
        widthClass
      )}
      style={{
        fontSize: `${editorFontSize}px`,
        lineHeight: wysiwygSpacing
      }}
    >
      {/* Header: Title & Tags */}
      <header className="mb-8 pb-6 border-b border-slate-700/40">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-3 leading-tight break-words [overflow-wrap:anywhere] hyphens-auto">
          {title || 'Документ без назви'}
        </h1>

        {tagList.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs opacity-80">
            <Tag size={13} className="shrink-0 text-cyan-400" />
            {tagList.map(tag => (
              <span 
                key={tag} 
                className="px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Render */}
      {content ? (
        <div 
          ref={contentContainerRef}
          className={cn(
            "doc-reader-body markdown-body max-w-none break-words [overflow-wrap:anywhere] hyphens-auto",
            "[&_h1]:scroll-mt-20 [&_h2]:scroll-mt-20 [&_h3]:scroll-mt-20 [&_h4]:scroll-mt-20 [&_h5]:scroll-mt-20 [&_h6]:scroll-mt-20",
            "[&_h1]:break-words [&_h1]:[overflow-wrap:anywhere] [&_h1]:hyphens-auto",
            "[&_h2]:break-words [&_h2]:[overflow-wrap:anywhere] [&_h2]:hyphens-auto",
            "[&_h3]:break-words [&_h3]:[overflow-wrap:anywhere] [&_h3]:hyphens-auto",
            "[&_h4]:break-words [&_h4]:[overflow-wrap:anywhere] [&_h4]:hyphens-auto",
            "[&_h5]:break-words [&_h5]:[overflow-wrap:anywhere] [&_h5]:hyphens-auto",
            "[&_h6]:break-words [&_h6]:[overflow-wrap:anywhere] [&_h6]:hyphens-auto",
            "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-4 [&_img]:object-contain",
            themeProseClasses
          )}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <div className="py-16 text-center opacity-40 text-sm italic">
          Документ порожній. Перейдіть до режиму редагування або оберіть чернетку.
        </div>
      )}
    </article>
  );
});

