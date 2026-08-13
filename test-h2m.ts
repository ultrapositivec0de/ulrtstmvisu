import { JSDOM } from 'jsdom';
const dom = new JSDOM();
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).document = dom.window.document;

import { htmlToMarkdown } from './src/lib/editorSync.ts';

console.log("Empty:", JSON.stringify(htmlToMarkdown("")));
console.log("BR:", JSON.stringify(htmlToMarkdown("<br>")));
console.log("P BR:", JSON.stringify(htmlToMarkdown("<p><br></p>")));
console.log("Spacer:", JSON.stringify(htmlToMarkdown('<p class="table-spacer bottom-spacer" data-empty="true" data-placeholder="&crarr; End of post..."><br></p>')));
console.log("Div BR:", JSON.stringify(htmlToMarkdown("<div><br></div>")));
