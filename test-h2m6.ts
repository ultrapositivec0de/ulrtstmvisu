import { JSDOM } from 'jsdom';
const dom = new JSDOM();
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).document = dom.window.document;

import { htmlToMarkdown } from './src/lib/editorSync.ts';

console.log("P with spaces:", JSON.stringify(htmlToMarkdown("<p>   </p>")));
console.log("P with newline:", JSON.stringify(htmlToMarkdown("<p>\n</p>")));
