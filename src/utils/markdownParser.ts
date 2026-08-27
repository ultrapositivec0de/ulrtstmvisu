import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { convertBareImageUrlsToMarkdown } from '../lib/editorSync';

export const DOM_PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'hr', 'br', 'span', 'strike', 'sup', 'sub', 'center'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'className', 'style', 'title', 'target', 'rel', 'referrerpolicy'],
  ADD_CLASSES: {
    div: ['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center', 'clearfix', 'phishy', 'text-blue', 'text-green'],
    p: ['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center', 'clearfix', 'phishy', 'text-blue', 'text-green'],
    span: ['phishy', 'text-blue', 'text-green'],
    img: ['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center']
  }
};

export const getMarked = () => {
  // In modern marked (v4+), we should use marked.use()
  if (marked && (marked as any).use) {
    (marked as any).use({
      breaks: true,
      gfm: true,
      mangle: false,
      headerIds: false
    });
  } else if (marked && (marked as any).setOptions) {
    (marked as any).setOptions({
      breaks: true,
      gfm: true
    });
  }

  return {
    parse: async (text: string) => {
      if (!marked || !marked.parse) return text;
      try {
        // Normalize line endings
        let normalizedText = text.replace(/\r\n/g, '\n');

        // Prevent non-table text from being merged into preceding tables
        const strictTableLines = [];
        const lines = normalizedText.split('\n');
        let inTable = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const isSeparator = /^[\s|:-]+$/.test(line) && line.includes('-') && line.includes('|');
          
          if (isSeparator && i > 0 && lines[i-1].includes('|')) {
            inTable = true;
            strictTableLines.push(line);
            continue;
          }
          
          if (inTable) {
            if (line.trim() === '') {
              inTable = false;
            } else if (!line.includes('|')) {
              strictTableLines.push('');
              inTable = false;
            }
          }
          
          strictTableLines.push(line);
        }
        normalizedText = strictTableLines.join('\n');

        // Preserve consecutive blank lines (3 or more newlines) outside of code blocks
        normalizedText = normalizedText.replace(/(```[\s\S]*?```|`[^`\n]*`)|(\n{3,})/g, (match, code, newlines) => {
          if (code) return code;
          const count = newlines.length - 2;
          return '\n\n' + Array(count).fill('<br>').join('') + '\n\n';
        });

        // Prevent distinct list blocks separated by blank lines from merging into a single list; generate a real break/paragraph so cursor can be placed between them
        let prevLists = '';
        while (prevLists !== normalizedText) {
          prevLists = normalizedText;
          normalizedText = normalizedText.replace(/(```[\s\S]*?```|`[^`\n]*`)|(^|\n)([\t ]*(?:[-*+]|\d+\.)[^\n]+)(\n\s*\n)([\t ]*(?:[-*+]|\d+\.)[^\n]+)/g, (match, code, pre, item1, newlines, item2) => {
            if (code) return code;
            return `${pre || ''}${item1}\n\n<br>\n\n${item2}`;
          });
        }

        // Prevent distinct tables separated by blank lines from sticking together; generate a real break/paragraph so cursor can be placed between them
        let prevTables = '';
        while (prevTables !== normalizedText) {
          prevTables = normalizedText;
          normalizedText = normalizedText.replace(/(```[\s\S]*?```|`[^`\n]*`)|(\|[^\n]+\|)(\n\s*\n)(\|[^\n]+\|)/g, (match, code, row1, newlines, row2) => {
            if (code) return code;
            return `${row1}\n\n<br>\n\n${row2}`;
          });
        }

        let textWithImageMarkdown = convertBareImageUrlsToMarkdown(normalizedText);
        
        // Preprocess to convert markdown images inside pull-left/pull-right divs or center tags to <img> tags
        textWithImageMarkdown = textWithImageMarkdown.replace(/(<div[^>]*class="[^"]*pull-(?:left|right)[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/gi, (m, open, htmlContent, close) => {
          const processedContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
          return open + processedContent + close;
        });
        textWithImageMarkdown = textWithImageMarkdown.replace(/(<div[^>]*class='[^']*pull-(?:left|right)[^']*'[^>]*>)([\s\S]*?)(<\/div>)/gi, (m, open, htmlContent, close) => {
          const processedContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
          return open + processedContent + close;
        });
        textWithImageMarkdown = textWithImageMarkdown.replace(/(<center[^>]*>)([\s\S]*?)(<\/center>)/gi, (m, open, htmlContent, close) => {
          const processedContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
          return open + processedContent + close;
        });

        // marked.parse can be sync or async
        let html = await marked.parse(textWithImageMarkdown);
        
        // Map image titles representing alignment classes to actual class attributes
        html = html.replace(/<img([^>]*)title="([^"]+)"([^>]*)/gi, (m, p1, title, p2) => {
          if (['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center'].includes(title)) {
            const hasClass = p1.includes('class="') || p2.includes('class="');
            if (hasClass) {
              return m;
            } else {
              return `<img${p1}class="${title}" title="${title}"${p2}`;
            }
          }
          return m;
        });

        if (DOMPurify) {
          return DOMPurify.sanitize(html, DOM_PURIFY_CONFIG as any) as unknown as string;
        }
        return html;
      } catch (e) {
        console.error('Markdown parse error:', e);
        return text;
      }
    }
  };
};
