import { JSDOM } from 'jsdom';
const dom = new JSDOM();
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).document = dom.window.document;

import { htmlToMarkdown } from './src/lib/editorSync.ts';

console.log("Combo1:", JSON.stringify(htmlToMarkdown('<div><br></div><p class="table-spacer bottom-spacer" data-empty="true" data-placeholder="..."><br></p>')));
console.log("Combo2:", JSON.stringify(htmlToMarkdown('<br><p class="table-spacer bottom-spacer" data-empty="true" data-placeholder="..."><br></p>')));
