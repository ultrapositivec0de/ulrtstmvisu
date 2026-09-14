import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { htmlToMarkdown } from '../src/lib/editorSync';

function testHtmlToMd(title: string, html: string) {
  console.log(`\n==================================================`);
  console.log(`TEST HTML: ${title}`);
  console.log(`==================================================`);
  console.log('HTML Input:');
  console.log(html);

  const md = htmlToMarkdown(html);
  console.log('Markdown Output (raw):', JSON.stringify(md));
  console.log('Markdown Output (display):');
  console.log(md);
}

// 1. Browser creates <p>Line 1</p><p><br></p><p>Line 2</p> (user pressed Enter twice in paragraph mode)
testHtmlToMd('Paragraph mode with empty paragraph', '<p>Line 1</p><p><br></p><p>Line 2</p>');

// 2. User pressed Enter multiple times in paragraph mode
testHtmlToMd('Multiple empty paragraphs', '<p>Line 1</p><p><br></p><p><br></p><p>Line 2</p>');

// 3. User pressed Enter in lineBreak mode (e.g. insertLineBreak creates <br>)
testHtmlToMd('Single paragraph with multiple br', '<p>Line 1<br><br>Line 2</p>');
testHtmlToMd('Single paragraph with 3 br', '<p>Line 1<br><br><br>Line 2</p>');

// 4. Div based editors (Chrome default without defaultParagraphSeparator)
testHtmlToMd('Div based with br', '<div>Line 1</div><div><br></div><div>Line 2</div>');
testHtmlToMd('Div based multiple empty divs', '<div>Line 1</div><div><br></div><div><br></div><div>Line 2</div>');

// 5. Naked text with <br>
testHtmlToMd('Naked text with br', 'Line 1<br><br>Line 2');
