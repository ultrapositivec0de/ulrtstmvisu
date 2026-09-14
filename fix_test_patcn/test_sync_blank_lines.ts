import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { marked } from 'marked';
marked.use({ breaks: true, gfm: true });

// If markdown has 3 newlines (\n\n\n) or more, how can we preserve it when going to WYSIWYG?
// If we pre-process markdown before marked:
// Whenever there are 3 or more newlines (e.g., \n\n\n = 1 empty line + 1 extra empty line):
// We can replace extra blank lines with an explicit empty paragraph or placeholder that marked renders as <p><br></p>!
function markdownToWysiwygHtml(md: string): string {
  // Replace 3 or more consecutive newlines with placeholder or <p><br></p>
  // \n\n is 1 paragraph break (0 extra blank lines)
  // \n\n\n is 1 extra blank line
  // \n\n\n\n is 2 extra blank lines
  const protectedMd = md.replace(/\n{3,}/g, (match) => {
    const extraBlankLinesCount = match.length - 2;
    // Each extra blank line can be represented as an empty paragraph in HTML
    return '\n\n' + '<p class="editor-blank-line"><br></p>\n\n'.repeat(extraBlankLinesCount);
  });

  const rawHtml = marked.parse(protectedMd) as string;
  return rawHtml;
}

console.log('--- TEST 1: 1 paragraph break (2 newlines) ---');
console.log(markdownToWysiwygHtml('Line 1\n\nLine 2').trim());

console.log('\n--- TEST 2: 2 paragraph breaks (3 newlines = 1 blank line between) ---');
console.log(markdownToWysiwygHtml('Line 1\n\n\nLine 2').trim());

console.log('\n--- TEST 3: 3 paragraph breaks (4 newlines = 2 blank lines between) ---');
console.log(markdownToWysiwygHtml('Line 1\n\n\n\nLine 2').trim());
