import { htmlToMarkdown } from '../src/lib/editorSync';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).NodeFilter = dom.window.NodeFilter;

const tableHtml = `<table>
  <thead><tr><th>Col 1</th><th>Col 2</th></tr></thead>
  <tbody>
    <tr><td>\x01Cell 1\x02</td><td>Cell 2</td></tr>
  </tbody>
</table>`;

const md = htmlToMarkdown(tableHtml);
console.log('Generated Markdown with markers:');
console.log(md);
console.log('startIdx in md:', md.indexOf('\x01'));
console.log('endIdx in md:', md.indexOf('\x02'));
