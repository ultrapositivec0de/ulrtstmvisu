import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { marked } from 'marked';
marked.use({ breaks: true, gfm: true });

// Let's test with various Steem markdown contents:
const tests = [
  'Simple paragraph\n\nSecond paragraph',
  'Three lines\n\n\nWith two empty lines between',
  'Paragraph before list\n\n- Item 1\n- Item 2\n\nParagraph after list',
  'Quote test\n\n> This is a blockquote\n> With second line\n\nParagraph after',
  '<div class="phishy">\nRed warning message\n</div>\n\nRegular text',
  '<div class="pull-left">\nLeft aligned content\n</div>\n\n<div class="pull-right">\nRight aligned content\n</div>',
  'Table test\n\n| Col 1 | Col 2 |\n| --- | --- |\n| A | B |\n\nAfter table',
];

console.log('Testing markdown parsing without loss:');
for (const t of tests) {
  // Pre-protect 3+ newlines:
  const protectedMd = t.replace(/\n{3,}/g, (match) => {
    const extraCount = match.length - 2;
    return '\n\n' + '<p class="editor-blank-line"><br></p>\n\n'.repeat(extraCount);
  });
  const html = marked.parse(protectedMd) as string;
  console.log(`\nInput: ${JSON.stringify(t)}`);
  console.log(`HTML: ${html.replace(/\n+/g, ' ').substring(0, 100)}...`);
}
