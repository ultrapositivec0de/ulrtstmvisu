import { getMarked } from '../src/utils/markdownParser';
import { processContentForSteem } from '../src/hooks/useSteemQueue';
import { getAllFormatRangesInLine, isInsideTagInLine } from '../src/utils/formatUtils';

async function testMarkdownToVisualWithTable() {
  const tableMd = `Here is text before

| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |

Here is text after`;

  console.log('--- Test 1: Caret in table separator line ---');
  const lines = tableMd.split('\n');
  // Line 3 is '| --- | --- |'
  const offsetInSeparator = tableMd.indexOf('| --- | --- |') + 5; // right in '---'
  
  const MARKER_START = '\uE000';
  const MARKER_END = '\uE001';

  // Naive insertion:
  const brokenMd = tableMd.slice(0, offsetInSeparator) + MARKER_START + tableMd.slice(offsetInSeparator);
  console.log('Broken MD with naive marker in separator:\n', brokenMd);
  
  const m = getMarked();
  if (m) {
    const parsedBroken = await m.parse(processContentForSteem(brokenMd));
    console.log('\nParsed HTML with naive marker (Notice if table failed to parse into <table>):\n', parsedBroken);
    const hasTable = parsedBroken.includes('<table');
    console.log('Does parsed HTML contain <table>?', hasTable);
  }
}

testMarkdownToVisualWithTable().catch(console.error);
