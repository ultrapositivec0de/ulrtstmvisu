/**
 * Pure utility functions for table parsing, normalization, and generation
 */

export interface ParsedTableData {
  rows: string[][];
  maxCols: number;
  delimiter: string;
}

/**
 * Detects the most consistent delimiter in raw text (tabs, semicolons, commas, or pipes)
 */
export function detectTableDelimiter(lines: string[]): string {
  const delimiters = ['\t', ';', ',', '|'];
  let bestDelimiter = '\t';
  let maxConsistency = -1;

  delimiters.forEach(d => {
    const colCounts = lines.map(l => l.split(d).length);
    const avg = colCounts.reduce((a, b) => a + b, 0) / colCounts.length;
    if (avg > 1.1) {
      const mostFrequent = colCounts.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const frequency = Math.max(...Object.values(mostFrequent));
      if (frequency > maxConsistency) {
        maxConsistency = frequency;
        bestDelimiter = d;
      }
    }
  });

  return bestDelimiter;
}

/**
 * Parses raw text input into a normalized matrix of cells
 */
export function parseDelimitedTextToTable(rawText: string): ParsedTableData | null {
  if (!rawText || !rawText.trim()) return null;

  const lines = rawText.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return null;

  const bestDelimiter = detectTableDelimiter(lines);

  const rows = lines.map(line => {
    let parts: string[];
    if (bestDelimiter === '|') {
      const trimmedLine = line.trim();
      parts = trimmedLine.split('|').map(p => p.trim());
      if (parts[0] === '') parts.shift();
      if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
    } else if (bestDelimiter === ',') {
      const partsArray: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          partsArray.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      partsArray.push(current.trim());
      parts = partsArray;
    } else {
      parts = line.split(bestDelimiter).map(p => p.trim());
    }
    return parts;
  });

  const maxCols = Math.max(...rows.map(r => r.length), 1);

  const normalizedRows = rows.map(r => {
    const newRow = [...r];
    while (newRow.length < maxCols) {
      newRow.push('');
    }
    if (newRow.length > maxCols) {
      return newRow.slice(0, maxCols);
    }
    return newRow;
  });

  return {
    rows: normalizedRows,
    maxCols,
    delimiter: bestDelimiter,
  };
}

/**
 * Converts a matrix of cells into a Markdown table string
 */
export function convertMatrixToMarkdownTable(rows: string[][]): string {
  if (!rows || rows.length === 0) return '';
  let resultTable = '';

  rows.forEach((cols, i) => {
    const cleanCols = cols.map(c => {
      return c.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br/>').trim();
    });
    resultTable += '| ' + cleanCols.join(' | ') + ' |\n';
    if (i === 0) {
      resultTable += '| ' + cleanCols.map(() => '---').join(' | ') + ' |\n';
    }
  });

  return resultTable;
}

/**
 * Converts a matrix of cells into an HTML table string
 */
export function convertMatrixToHtmlTable(rows: string[][]): string {
  if (!rows || rows.length === 0) return '';
  let resultTable = '<table data-format="html" style="width:100%">\n';

  rows.forEach((cols, i) => {
    resultTable += '  <tr>\n';
    cols.forEach(col => {
      const tag = i === 0 ? 'th' : 'td';
      resultTable += `    <${tag}>${col}</${tag}>\n`;
    });
    resultTable += '  </tr>\n';
  });
  resultTable += '</table>';

  return resultTable;
}

/**
 * Transforms raw text to table markup in either Markdown or HTML format
 */
export function formatImportedTable(
  rawText: string,
  format: 'markdown' | 'html' = 'markdown',
): string | null {
  const parsed = parseDelimitedTextToTable(rawText);
  if (!parsed) return null;

  if (format === 'markdown') {
    return convertMatrixToMarkdownTable(parsed.rows);
  } else {
    return convertMatrixToHtmlTable(parsed.rows);
  }
}
