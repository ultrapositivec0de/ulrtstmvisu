import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { marked } from 'marked';
marked.use({ breaks: true, gfm: true });

const md = `<div class="phishy">\nFirst line of warning\n\nSecond line of warning\n</div>`;
const rawHtml = marked.parse(md) as string;

console.log('Marked output:');
console.log(rawHtml);

const tempDiv = dom.window.document.createElement('div');
tempDiv.innerHTML = rawHtml;

// Run the exact code from useWysiwygSync.ts lines 685-713:
tempDiv.querySelectorAll('div.phishy, div.text-blue, div.text-green').forEach((div) => {
  const cls = div.classList.contains('phishy')
    ? 'phishy'
    : div.classList.contains('text-blue')
    ? 'text-blue'
    : 'text-green';
  const paragraphs = Array.from(div.querySelectorAll(':scope > p'));
  if (paragraphs.length > 0) {
    paragraphs.forEach((p) => {
      const span = dom.window.document.createElement('span');
      span.className = cls;
      while (p.firstChild) {
        span.appendChild(p.firstChild);
      }
      p.appendChild(span);
      div.parentNode?.insertBefore(p, div);
    });
    div.parentNode?.removeChild(div); // <--- LOOK HERE!
  } else {
    const p = dom.window.document.createElement('p');
    const span = dom.window.document.createElement('span');
    span.className = cls;
    while (div.firstChild) {
      span.appendChild(div.firstChild);
    }
    p.appendChild(span);
    div.parentNode?.replaceChild(p, div);
  }
});

console.log('\nResulting DOM innerHTML after useWysiwygSync transformation:');
console.log(tempDiv.innerHTML);
