import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).DOMParser = dom.window.DOMParser;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { marked } from 'marked';
import { htmlToMarkdown } from '../src/lib/editorSync';

// Configure marked as done in the app: breaks: true, gfm: true
marked.use({ breaks: true, gfm: true });

function testSync(title: string, inputMd: string) {
  console.log(`\n==================================================`);
  console.log(`TEST: ${title}`);
  console.log(`==================================================`);
  console.log('Original MD (raw):', JSON.stringify(inputMd));

  const html = marked.parse(inputMd) as string;
  console.log('HTML from marked.parse():');
  console.log(html.trim());

  const backToMd = htmlToMarkdown(html);
  console.log('Roundtrip back to MD (raw):', JSON.stringify(backToMd));

  const matches = inputMd === backToMd;
  console.log('Match 1:1?:', matches ? '✅ EXACT MATCH' : '❌ MISMATCH');
  if (!matches) {
    console.log('Diff:');
    console.log('  Input lines count :', inputMd.split('\n').length);
    console.log('  Output lines count:', backToMd.split('\n').length);
  }
}

// Test cases for empty lines and spacing
testSync('Single line break', 'Line 1\nLine 2');
testSync('Standard paragraph break (1 empty line)', 'Line 1\n\nLine 2');
testSync('Two empty lines between paragraphs', 'Line 1\n\n\nLine 2');
testSync('Three empty lines between paragraphs', 'Line 1\n\n\n\nLine 2');
testSync('Trailing empty lines', 'Line 1\n\n');
testSync('Leading empty lines', '\n\nLine 1');
testSync('Empty line inside blockquote', '> Quote 1\n>\n> Quote 2');
testSync('Custom div tags (phishy)', '<div class="phishy">\nAlert text\n</div>');
testSync('Center tags with paragraph', '<center>\nCentered text\n</center>\n\nNext line');
testSync('Bold tag formatting with spaces', '**Bold text**\n\nRegular text');
testSync('HTML table vs Markdown table', '| Col 1 | Col 2 |\n| --- | --- |\n| Val 1 | Val 2 |');
