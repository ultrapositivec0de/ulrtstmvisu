import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).HTMLInputElement = dom.window.HTMLInputElement;
(global as any).DOMParser = dom.window.DOMParser;

import createDOMPurify from 'dompurify';
(global as any).DOMPurify = createDOMPurify(dom.window);

import { htmlToMarkdown } from '../src/lib/editorSync';
import { getMarked } from '../src/utils/markdownParser';

async function runEndToEndTests() {
  const parser = getMarked();

  console.log('=== TEST 1: Real htmlToMarkdown with Nested Table in TD ===');
  const nestedTableHtml = `<table>
  <thead>
    <tr><th>Main Col 1</th><th>Main Col 2</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <table>
          <thead><tr><th>Sub A</th><th>Sub B</th></tr></thead>
          <tbody><tr><td>Data 1</td><td>Data 2</td></tr></tbody>
        </table>
      </td>
      <td>Text with math pipe: x | y = z</td>
    </tr>
  </tbody>
</table>`;

  const md1 = htmlToMarkdown(nestedTableHtml);
  console.log('Generated Markdown:\n', md1);

  const parsed1 = await parser.parse(md1);
  console.log('Re-parsed HTML from Markdown:\n', parsed1);

  const doc1 = new (dom.window as any).DOMParser().parseFromString(parsed1, 'text/html');
  const outerTable = doc1.querySelector('table');
  const innerTable = outerTable?.querySelector('table');
  const outerCols = outerTable?.querySelector('thead > tr')?.children.length;
  const innerCols = innerTable?.querySelector('thead > tr')?.children.length;

  console.log('Outer Table found:', !!outerTable);
  console.log('Inner Table found:', !!innerTable);
  console.log('Outer Cols:', outerCols);
  console.log('Inner Cols:', innerCols);

  if (outerCols === 2 && innerCols === 2) {
    console.log('>>> TEST 1 PASSED! <<<');
  } else {
    throw new Error('TEST 1 FAILED');
  }

  console.log('\n=== TEST 2: Real Blockquote with Table followed by text ===');
  const quoteWithTableHtml = `<blockquote>
  <p>Header paragraph in quote</p>
  <table>
    <thead><tr><th>Q Col 1</th><th>Q Col 2</th></tr></thead>
    <tbody><tr><td>Q Val 1</td><td>Q Val 2</td></tr></tbody>
  </table>
  <p>Footer paragraph in quote</p>
</blockquote>`;

  const md2 = htmlToMarkdown(quoteWithTableHtml);
  console.log('Generated Blockquote Markdown:\n', md2);

  const parsed2 = await parser.parse(md2);
  console.log('Re-parsed Blockquote HTML:\n', parsed2);

  const doc2 = new (dom.window as any).DOMParser().parseFromString(parsed2, 'text/html');
  const bq = doc2.querySelector('blockquote');
  const bqTable = bq?.querySelector('table');
  const bqP = bq?.querySelectorAll('p');

  console.log('Blockquote found:', !!bq);
  console.log('Blockquote Table found:', !!bqTable);
  console.log('Blockquote Paragraphs count:', bqP?.length);

  if (bq && bqTable && bqP?.length === 2) {
    console.log('>>> TEST 2 PASSED! <<<');
  } else {
    throw new Error('TEST 2 FAILED');
  }

  console.log('\n=== TEST 3: Pure Markdown input with Table in Blockquote ===');
  const rawMarkdownInQuote = `> Intro note
> | T Col 1 | T Col 2 |
> |---|---|
> | Val 1 | Val 2 |
> Subsequent note without blank line`;

  const parsed3 = await parser.parse(rawMarkdownInQuote);
  console.log('Parsed Raw Markdown in Quote:\n', parsed3);

  const doc3 = new (dom.window as any).DOMParser().parseFromString(parsed3, 'text/html');
  const bq3 = doc3.querySelector('blockquote');
  const bqTable3 = bq3?.querySelector('table');
  const bqRows3 = bqTable3?.querySelectorAll('tbody tr');
  const bqP3 = bq3?.querySelectorAll('p');

  console.log('Blockquote 3 found:', !!bq3);
  console.log('Blockquote 3 Table found:', !!bqTable3);
  console.log('Table 3 tbody rows count (should be 1, not 2):', bqRows3?.length);
  console.log('Paragraphs in Blockquote 3 count (should be 2):', bqP3?.length);

  if (bq3 && bqTable3 && bqRows3?.length === 1 && bqP3?.length === 2) {
    console.log('>>> TEST 3 PASSED! <<<');
  } else {
    throw new Error('TEST 3 FAILED');
  }
}

runEndToEndTests().catch(err => {
  console.error(err);
  process.exit(1);
});
