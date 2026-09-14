import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor" contenteditable="true"></div></body></html>');
const window = dom.window;
const document = window.document;

const editor = document.getElementById('editor')!;
editor.innerHTML = '<p>Paragraph 1</p><p id="emptyP"><br></p><ul id="myList"><li>Item 1</li><li>Item 2</li></ul>';

console.log('Initial editor HTML:\n', editor.innerHTML);

// Simulate Backspace on #emptyP
const emptyP = document.getElementById('emptyP')!;
const prevSibling = emptyP.previousElementSibling as HTMLElement;
const nextSibling = emptyP.nextElementSibling as HTMLElement;

// Safely remove emptyP
emptyP.remove();

console.log('After safe remove emptyP:\n', editor.innerHTML);
console.log('Previous paragraph intact:', prevSibling.textContent === 'Paragraph 1');
console.log('List intact:', nextSibling.id === 'myList' && nextSibling.querySelectorAll('li').length === 2);
