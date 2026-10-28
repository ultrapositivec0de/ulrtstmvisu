import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).DOMParser = dom.window.DOMParser;

import { marked } from 'marked';

function testBlockquoteConversion(inner: string): string {
  const processedInner = inner.replace(/^\n+|\n+$/g, '');
  if (!processedInner) return '';
  const lines = processedInner.split('\n');
  const quotedLines = lines.map(line => {
    return line.trim() ? `> ${line}` : '>';
  });
  return `\n${quotedLines.join('\n')}\n`;
}

async function run() {
  marked.use({ gfm: true, breaks: true });

  const innerContent = `First paragraph of quote

| H1 | H2 |
| --- | --- |
| C1 | C2 |

Second paragraph of quote`;

  const md = testBlockquoteConversion(innerContent);
  console.log('Generated Markdown:\n', md);
  const html = await marked.parse(md);
  console.log('Parsed HTML:\n', html);

  console.log('--- Nested blockquote test ---');
  const innerNested = testBlockquoteConversion('Nested level 2');
  const outerNested = testBlockquoteConversion(`Outer before\n${innerNested}\nOuter after`);
  console.log('Nested Markdown:\n', outerNested);
  const htmlNested = await marked.parse(outerNested);
  console.log('Parsed Nested HTML:\n', htmlNested);
}

run().catch(console.error);
