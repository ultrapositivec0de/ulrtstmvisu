import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor" contenteditable="true"></div></body></html>');
const window = dom.window;
const document = window.document;

function isCaretAtStartOfBlock(container: HTMLElement, range: Range): boolean {
  // Check if everything before caret in container is empty
  const preRange = document.createRange();
  preRange.setStart(container, 0);
  preRange.setEnd(range.startContainer, range.startOffset);
  const textBefore = (preRange.cloneContents().textContent || '').replace(/[\u200B\s\n]/g, '');
  return textBefore.length === 0;
}

function isCaretAtEndOfBlock(container: HTMLElement, range: Range): boolean {
  // Check if everything after caret in container is empty
  const postRange = document.createRange();
  postRange.setStart(range.endContainer, range.endOffset);
  postRange.setEnd(container, container.childNodes.length);
  const textAfter = (postRange.cloneContents().textContent || '').replace(/[\u200B\s\n]/g, '');
  return textAfter.length === 0;
}

console.log('Testing Caret Detection helper:');
const p = document.createElement('p');
p.innerHTML = 'Hello world';
document.getElementById('editor')!.appendChild(p);

const textNode = p.firstChild as Text;
const rStart = document.createRange();
rStart.setStart(textNode, 0);
rStart.collapse(true);
console.log('At start of "Hello world":', isCaretAtStartOfBlock(p, rStart)); // true

const rMid = document.createRange();
rMid.setStart(textNode, 5);
rMid.collapse(true);
console.log('In middle of "Hello world":', isCaretAtStartOfBlock(p, rMid)); // false

const rEnd = document.createRange();
rEnd.setStart(textNode, 11);
rEnd.collapse(true);
console.log('At end of "Hello world":', isCaretAtEndOfBlock(p, rEnd)); // true
