import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).Node = dom.window.Node;
(global as any).HTMLElement = dom.window.HTMLElement;

import { marked } from 'marked';

function preprocessMarkdownTablesAndQuotes(normalizedText: string): string {
  // Prevent non-table text from being merged into preceding tables (both standalone and inside blockquotes)
  const strictTableLines: string[] = [];
  const lines = normalizedText.split('\n');
  let inTable = false;
  let tableQuotePrefix = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is within a blockquote (e.g. "> " or ">> ")
    const quoteMatch = line.match(/^(\s*(?:>\s*)+)/);
    const prefix = quoteMatch ? quoteMatch[1] : '';
    const content = line.slice(prefix.length);

    const isSeparator = /^[\s|:-]+$/.test(content) && content.includes('-') && content.includes('|');
    
    if (isSeparator && i > 0) {
      const prevLine = lines[i - 1];
      const prevQuoteMatch = prevLine.match(/^(\s*(?:>\s*)+)/);
      const prevPrefix = prevQuoteMatch ? prevQuoteMatch[1] : '';
      const prevContent = prevLine.slice(prevPrefix.length);
      
      if (prevContent.includes('|')) {
        inTable = true;
        tableQuotePrefix = prefix;
        strictTableLines.push(line);
        continue;
      }
    }

    if (inTable) {
      if (content.trim() === '') {
        inTable = false;
        tableQuotePrefix = '';
      } else if (!content.includes('|')) {
        // Table ended, but there is following text immediately without a blank separator line
        // Insert appropriate empty separator line to terminate the table cleanly
        strictTableLines.push(tableQuotePrefix ? tableQuotePrefix.trimEnd() : '');
        inTable = false;
        tableQuotePrefix = '';
      }
    }

    strictTableLines.push(line);
  }
  
  let result = strictTableLines.join('\n');

  // Prevent distinct tables separated by blank lines from sticking together (standalone and quoted)
  let prevTables = '';
  while (prevTables !== result) {
    prevTables = result;
    result = result.replace(
      /(```[\s\S]*?```|`[^`\n]*`)|((?:(?:>\s*)*)\|[^\n]+\|)(\n(?:\s*(?:>\s*)*\n)+)((?:(?:>\s*)*)\|[^\n]+\|)/g,
      (match, code, row1, newlines, row2) => {
        if (code) return code;
        const qMatch = row1.match(/^(\s*(?:>\s*)+)/);
        const prefix = qMatch ? qMatch[1] : '';
        return `${row1}\n${prefix}\n${prefix}<br>\n${prefix}\n${row2}`;
      }
    );
  }

  return result;
}

async function test() {
  marked.use({ gfm: true, breaks: true });

  const rawMd = `> | H1 | H2 |
> | --- | --- |
> | C1 | C2 |
> Outro quote`;

  console.log('--- Raw input ---:\n', rawMd);
  const preprocessed = preprocessMarkdownTablesAndQuotes(rawMd);
  console.log('--- Preprocessed ---:\n', preprocessed);
  const html = await marked.parse(preprocessed);
  console.log('--- Parsed HTML ---:\n', html);

  const twoTablesQuote = `> | T1 H1 | T1 H2 |
> | --- | --- |
> | 1 | 2 |
>
> | T2 H1 | T2 H2 |
> | --- | --- |
> | 3 | 4 |`;

  console.log('\n--- Two tables in quote input ---');
  const prep2 = preprocessMarkdownTablesAndQuotes(twoTablesQuote);
  console.log('--- Preprocessed 2 ---:\n', prep2);
  const html2 = await marked.parse(prep2);
  console.log('--- Parsed HTML 2 ---:\n', html2);
}

test().catch(console.error);
