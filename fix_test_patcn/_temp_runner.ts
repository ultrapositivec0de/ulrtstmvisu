
import {
  detectTableDelimiter,
  parseDelimitedTextToTable,
  convertMatrixToMarkdownTable,
  convertMatrixToHtmlTable,
  formatImportedTable
} from '../src/utils/tableOperations';

console.log('1. Testing delimiter detection...');
const tabData = "Name\tAge\tCity\nAlice\t25\tKyiv\nBob\t30\tLviv";
if (detectTableDelimiter(tabData.split('\n')) !== '\t') throw new Error('Tab detection failed');

const csvData = 'Item,"Price, USD",Qty\nBook,15.5,2\nPen,2.0,10';
if (detectTableDelimiter(csvData.split('\n')) !== ',') throw new Error('CSV detection failed');

const pipeData = '| Col1 | Col2 |\n| Val1 | Val2 |';
if (detectTableDelimiter(pipeData.split('\n')) !== '|') throw new Error('Pipe detection failed');
console.log(' Delimiter detection passed.');

console.log('2. Testing CSV quote normalization...');
const parsedCsv = parseDelimitedTextToTable(csvData);
if (!parsedCsv || parsedCsv.rows.length !== 3) throw new Error('CSV rows length mismatch');
if (parsedCsv.rows[0][1] !== 'Price, USD') throw new Error('CSV quoted cell failed: ' + parsedCsv.rows[0][1]);
console.log(' CSV quotes passed.');

console.log('3. Testing Markdown table generation...');
const mdTable = convertMatrixToMarkdownTable([
  ['Header 1', 'Header 2'],
  ['Row 1', 'Value | with pipe']
]);
if (!mdTable.includes('| Header 1 | Header 2 |')) throw new Error('Header mismatch');
if (!mdTable.includes('| --- | --- |')) throw new Error('Separator mismatch');
if (!mdTable.includes('Value \\| with pipe')) throw new Error('Pipe escaping mismatch');
console.log(' Markdown table generation passed.');

console.log('4. Testing HTML table generation...');
const htmlTable = convertMatrixToHtmlTable([
  ['H1', 'H2'],
  ['D1', 'D2']
]);
if (!htmlTable.includes('<th>H1</th>')) throw new Error('HTML th mismatch');
if (!htmlTable.includes('<td>D1</td>')) throw new Error('HTML td mismatch');
console.log(' HTML table generation passed.');

console.log('5. Testing formatImportedTable end-to-end...');
const endToEndMd = formatImportedTable(tabData, 'markdown');
if (!endToEndMd || !endToEndMd.includes('| Alice | 25 | Kyiv |')) throw new Error('End-to-end Markdown failed');

const endToEndHtml = formatImportedTable(tabData, 'html');
if (!endToEndHtml || !endToEndHtml.includes('<td>Alice</td>')) throw new Error('End-to-end HTML failed');
console.log(' End-to-end formatting passed.');

console.log('\n ALL TABLE OPERATIONS TESTS PASSED SUCCESSFULLY! ');
