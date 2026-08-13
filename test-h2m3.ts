import { JSDOM } from 'jsdom';
const dom = new JSDOM();
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).document = dom.window.document;

import { htmlToMarkdown } from './src/lib/editorSync.ts';

console.log("Empty P:", JSON.stringify(htmlToMarkdown('<p></p>')));
console.log("Empty Div:", JSON.stringify(htmlToMarkdown('<div></div>')));
console.log("Div with space:", JSON.stringify(htmlToMarkdown('<div> </div>')));
console.log("P with BR:", JSON.stringify(htmlToMarkdown('<p><br></p>')));
console.log("Just space:", JSON.stringify(htmlToMarkdown(' ')));
