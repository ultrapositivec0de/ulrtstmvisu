import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).HTMLInputElement = dom.window.HTMLInputElement;
(global as any).DOMParser = dom.window.DOMParser;

import { marked } from 'marked';

async function testParseCase3() {
  marked.use({ gfm: true, breaks: true });
  const md = `> Intro quote
> | H1 | H2 |
> | --- | --- |
> | C1 | C2 |
> Outro quote`;
  const html = await marked.parse(md);
  console.log('Parsed Case 3 HTML:\n', html);
}

testParseCase3().catch(console.error);
