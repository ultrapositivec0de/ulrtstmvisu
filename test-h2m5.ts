import { JSDOM } from 'jsdom';
const dom = new JSDOM();
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).document = dom.window.document;

import { htmlToMarkdown } from './src/lib/editorSync.ts';

console.log("Empty:", JSON.stringify(htmlToMarkdown("")));
console.log("Spaces:", JSON.stringify(htmlToMarkdown("   ")));
console.log("Zero Width Space:", JSON.stringify(htmlToMarkdown("\u200B")));
console.log("Empty P:", JSON.stringify(htmlToMarkdown("<p></p>")));
console.log("P with BR:", JSON.stringify(htmlToMarkdown("<p><br></p>")));
console.log("Div with BR:", JSON.stringify(htmlToMarkdown("<div><br></div>")));
console.log("BR only:", JSON.stringify(htmlToMarkdown("<br>")));
console.log("NBSP:", JSON.stringify(htmlToMarkdown("<p>&nbsp;</p>")));
console.log("NBSP spaces:", JSON.stringify(htmlToMarkdown("&nbsp;  &nbsp;")));
