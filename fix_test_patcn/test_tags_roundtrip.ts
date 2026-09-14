import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { marked } from 'marked';
import { htmlToMarkdown } from '../src/lib/editorSync';
marked.use({ breaks: true, gfm: true });

const testCases = [
  {
    name: 'pull-left with markdown inside',
    input: `<div class="pull-left">\n\n**Bold text** and *italic*\n\n</div>`
  },
  {
    name: 'pull-left without blank lines',
    input: `<div class="pull-left">\n**Bold text** and *italic*\n</div>`
  },
  {
    name: 'center with image and caption',
    input: `<center>\n\n![Image](https://example.com/pic.jpg)\n*Photo Caption*\n\n</center>`
  },
  {
    name: 'div with multiple paragraphs',
    input: `<div class="text-justify">\n\nFirst paragraph here.\n\nSecond paragraph here.\n\n</div>`
  },
  {
    name: 'inline tags b and i',
    input: `Start <b>bold text</b> and <i>italic</i> end`
  }
];

for (const tc of testCases) {
  console.log(`\n=== ${tc.name} ===`);
  const html = marked.parse(tc.input);
  console.log('HTML:\n', html);
  const backToMd = htmlToMarkdown(html as string);
  console.log('Back to MD:\n', JSON.stringify(backToMd));
}
