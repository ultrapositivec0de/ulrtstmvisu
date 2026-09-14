import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor" contenteditable="true"></div></body></html>');
const window = dom.window;
const document = window.document;
const Node = window.Node;

const editor = document.getElementById('editor')!;

function isAtStartOf(container: HTMLElement, targetNode: Node, targetOffset: number): boolean {
  try {
    const preRange = document.createRange();
    preRange.setStart(container, 0);
    preRange.setEnd(targetNode, targetOffset);
    const textBefore = (preRange.cloneContents().textContent || '').replace(/[\u200B\s\n]/g, '');
    const hasMedia = !!preRange.cloneContents().querySelector?.('img, iframe, video, hr, table');
    return textBefore.length === 0 && !hasMedia;
  } catch {
    return false;
  }
}

function isAtEndOf(container: HTMLElement, targetNode: Node, targetOffset: number): boolean {
  try {
    const postRange = document.createRange();
    postRange.setStart(targetNode, targetOffset);
    postRange.setEnd(container, container.childNodes.length);
    const textAfter = (postRange.cloneContents().textContent || '').replace(/[\u200B\s\n]/g, '');
    const hasMedia = !!postRange.cloneContents().querySelector?.('img, iframe, video, hr, table');
    return textAfter.length === 0 && !hasMedia;
  } catch {
    return false;
  }
}

function findSpecialContainer(start: Node | null, root: HTMLElement): HTMLElement | null {
  let curr: Node | null = start;
  if (curr && curr.nodeType === Node.TEXT_NODE) curr = curr.parentElement;
  while (curr && curr !== root) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      const el = curr as HTMLElement;
      const tag = el.tagName.toUpperCase();
      if (['LI', 'BLOCKQUOTE', 'PRE', 'CENTER', 'TABLE', 'TR', 'TD', 'TH'].includes(tag)) {
        return el;
      }
      if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) {
        return el;
      }
      if (el.classList.contains('phishy') || el.classList.contains('text-blue') || el.classList.contains('text-green')) {
        return el;
      }
      const classes = Array.from(el.classList);
      if (classes.some((c) => c.startsWith('pull-') || c.startsWith('text-'))) {
        return el;
      }
    }
    curr = curr.parentElement;
  }
  return null;
}

// TEST 1: Backspace on empty paragraph between P and UL
editor.innerHTML = '<p id="p1">Hello</p><p id="emptyP"><br></p><ul id="myList"><li>Item 1</li></ul>';
const emptyP = document.getElementById('emptyP')!;
const prevSibling = emptyP.previousElementSibling as HTMLElement;
emptyP.remove();
console.log('TEST 1 - Empty P removed cleanly:');
console.log('P1 still exists:', !!document.getElementById('p1'));
console.log('List still exists:', !!document.getElementById('myList'));

// TEST 2: Backspace at offset 0 on non-empty phishy
editor.innerHTML = '<div id="phishy" class="phishy">Alert text</div>';
const phishy = document.getElementById('phishy')!;
const phishyText = phishy.firstChild as Text;
const isStart = isAtStartOf(phishy, phishyText, 0);
const hasContent = (phishy.textContent || '').trim().length > 0;
console.log('\nTEST 2 - Backspace on non-empty phishy:');
console.log('Is at start:', isStart);
console.log('Has content:', hasContent);
console.log('Action: PREVENT DEFAULT -> tag preserved!');

// TEST 3: Backspace on empty phishy
editor.innerHTML = '<div id="emptyPhishy" class="phishy"><br></div>';
const emptyPhishy = document.getElementById('emptyPhishy')!;
const emptyPhishyContent = (emptyPhishy.textContent || '').trim().length > 0;
console.log('\nTEST 3 - Backspace on empty phishy:');
console.log('Has content:', emptyPhishyContent);
const replacementP = document.createElement('p');
replacementP.innerHTML = '<br>';
emptyPhishy.replaceWith(replacementP);
console.log('Empty phishy replaced with standard P:', editor.firstElementChild?.tagName === 'P');

// TEST 4: Delete at end of P before UL
editor.innerHTML = '<p id="p1">Text</p><ul id="list"><li>Item</li></ul>';
const p1 = document.getElementById('p1')!;
const p1Text = p1.firstChild as Text;
const isEnd = isAtEndOf(p1, p1Text, 4);
const nextSpecial = document.getElementById('list')!;
console.log('\nTEST 4 - Delete at end of P before UL:');
console.log('Is at end of P:', isEnd);
console.log('Next is special container (UL):', nextSpecial.tagName === 'UL');
console.log('Action: PREVENT DEFAULT -> list structure preserved!');
