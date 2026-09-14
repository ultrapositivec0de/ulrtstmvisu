import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { marked } from 'marked';
import { htmlToMarkdown } from '../src/lib/editorSync';
marked.use({ breaks: true, gfm: true });

function inspectTagSync(title: string, mdInput: string, editAction?: (doc: Document) => void) {
  console.log(`\n==================================================`);
  console.log(`TEST TAG: ${title}`);
  console.log(`==================================================`);
  console.log('Original MD:');
  console.log(JSON.stringify(mdInput));

  const initialHtml = marked.parse(mdInput) as string;
  console.log('Parsed HTML:');
  console.log(initialHtml);

  const doc = new dom.window.DOMParser().parseFromString(initialHtml, 'text/html');

  if (editAction) {
    editAction(doc);
    console.log('Modified HTML:');
    console.log(doc.body.innerHTML);
  }

  const resultMd = htmlToMarkdown(doc.body.innerHTML);
  console.log('Result MD:');
  console.log(JSON.stringify(resultMd));
  console.log('Result MD Display:\n' + resultMd);
}

// 1. User writes raw HTML div pull-left
inspectTagSync('Raw div pull-left with text', '<div class="pull-left">\nSome text inside\n</div>\n\nParagraph outside');

// 2. Editing text inside pull-left: user types or edits near closing tag
inspectTagSync('User edits text inside pull-left', '<div class="pull-left">\nSome text inside\n</div>', (doc) => {
  const div = doc.body.querySelector('.pull-left');
  if (div) {
    div.innerHTML = 'New edited text';
  }
});

// 3. User deletes all text inside tag
inspectTagSync('User deletes text inside tag', '<div class="pull-left">\nSome text inside\n</div>', (doc) => {
  const div = doc.body.querySelector('.pull-left');
  if (div) {
    div.innerHTML = '<br>'; // what browser does when deleting text inside a container
  }
});

// 4. Phishy alert block
inspectTagSync('Phishy alert block', '<div class="phishy">\nImportant message\n</div>');

// 5. Center tag
inspectTagSync('Center tag with image', '<center>\n![image](https://example.com/pic.jpg)\n</center>');

// 6. Inline HTML: <b>text</b> vs **text**
inspectTagSync('Inline HTML b tag', 'Here is <b>bold word</b> in sentence');
