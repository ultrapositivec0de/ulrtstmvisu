/* eslint-disable no-control-regex */
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { marked } from 'marked';
marked.use({ breaks: true, gfm: true });

function customHtmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // Let's test the block joining logic
  const blockResults: string[] = [];

  const convertNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.nodeValue || '').replace(/\u200B/g, '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    let inner = '';
    el.childNodes.forEach((c) => {
      inner += convertNode(c);
    });

    if (tag === 'br') return '\n';
    return inner;
  };

  Array.from(body.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()) return;
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'p' || tag === 'div') {
        const textWithoutMarkers = el.textContent?.replace(/[\u200B\x01\x02\s\n]/g, '') || '';
        if (textWithoutMarkers === '') {
          blockResults.push(''); // empty line
          return;
        }
      }
    }
    const nodeText = convertNode(child).trim();
    blockResults.push(nodeText);
  });

  // Now join blocks:
  // Non-empty block followed by non-empty block: \n\n
  // Each empty block in between adds 1 extra \n
  let md = '';
  let pendingNewlines = 0;
  for (let i = 0; i < blockResults.length; i++) {
    const item = blockResults[i];
    if (item === '') {
      if (md.length > 0) {
        pendingNewlines++;
      }
    } else {
      if (md.length === 0) {
        md = item;
      } else {
        // Base separation between blocks is \n\n (2 newlines)
        // Plus 1 newline for each empty block in between
        const newlines = '\n'.repeat(2 + pendingNewlines);
        md += newlines + item;
        pendingNewlines = 0;
      }
    }
  }

  return md;
}

function testRoundTrip(mdInput: string) {
  console.log('\n--- Original Markdown ---');
  console.log(JSON.stringify(mdInput));

  // Markdown -> WYSIWYG HTML
  const protectedMd = mdInput.replace(/\n{3,}/g, (match) => {
    const extraCount = match.length - 2;
    return '\n\n' + '<p class="editor-blank-line"><br></p>\n\n'.repeat(extraCount);
  });
  const html = marked.parse(protectedMd) as string;
  console.log('HTML produced:\n', html.trim());

  // HTML -> Markdown
  const roundtripMd = customHtmlToMarkdown(html);
  console.log('Roundtrip Markdown:');
  console.log(JSON.stringify(roundtripMd));

  const isMatch = mdInput.trim() === roundtripMd.trim();
  console.log('Is exact match:', isMatch);
}

testRoundTrip('Line 1\n\nLine 2');
testRoundTrip('Line 1\n\n\nLine 2');
testRoundTrip('Line 1\n\n\n\nLine 2');

