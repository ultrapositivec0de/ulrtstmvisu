import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="wysiwyg" contenteditable="true"></div></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { marked } from 'marked';
import { htmlToMarkdown } from '../src/lib/editorSync';
marked.use({ breaks: true, gfm: true });

console.log('--- TEST 1: User enters text inside <div class="pull-left"> and presses backspace/enter ---');
const md1 = `<div class="pull-left">\nSome text\n</div>\n\nNext paragraph`;
const html1 = marked.parse(md1) as string;
console.log('Parsed HTML 1:\n', html1);

// What happens in htmlToMarkdown if inner is empty or only whitespace?
const doc1 = new dom.window.DOMParser().parseFromString('<div class="pull-left"><br></div><p>Next paragraph</p>', 'text/html');
const res1 = htmlToMarkdown(doc1.body.innerHTML);
console.log('htmlToMarkdown when pull-left has only <br>:\n', JSON.stringify(res1));

// Test 2: phishy tag
console.log('\n--- TEST 2: Phishy tag with paragraphs ---');
const md2 = `<div class="phishy">\nParagraph 1\n\nParagraph 2\n</div>`;
const html2 = marked.parse(md2) as string;
console.log('Parsed HTML 2:\n', html2);

// Test 3: What if someone deletes content inside phishy tag?
const doc2 = new dom.window.DOMParser().parseFromString('<div class="phishy"></div>', 'text/html');
console.log('htmlToMarkdown on empty phishy div:\n', JSON.stringify(htmlToMarkdown(doc2.body.innerHTML)));

const doc2b = new dom.window.DOMParser().parseFromString('<p><span class="phishy"></span></p>', 'text/html');
console.log('htmlToMarkdown on empty phishy span:\n', JSON.stringify(htmlToMarkdown(doc2b.body.innerHTML)));

// Test 4: What if someone has text next to a link or image?
console.log('\n--- TEST 4: Link / Image inline editing ---');
const md4 = `Text before [Click here](https://example.com) text after`;
const html4 = marked.parse(md4) as string;
console.log('Parsed HTML 4:\n', html4);

// Test 5: What if table spacer or empty paragraph?
console.log('\n--- TEST 5: Table spacer empty check ---');
const doc5 = new dom.window.DOMParser().parseFromString('<p class="table-spacer top-spacer" data-empty="true"><br></p><table><tr><td>A</td></tr></table>', 'text/html');
console.log('htmlToMarkdown with table spacer:\n', JSON.stringify(htmlToMarkdown(doc5.body.innerHTML)));
