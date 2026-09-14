import { marked } from 'marked';

// Test function to check if an offset in markdown is inside a "technical syntax zone"
export function isOffsetInTechnicalZone(markdown: string, offset: number): { inTechnicalZone: boolean; zoneType?: string; safeOffset?: number } {
  if (offset < 0 || offset > markdown.length) {
    return { inTechnicalZone: false };
  }

  // 1. Check if inside an HTML tag `<...>`
  const lastLt = markdown.lastIndexOf('<', offset);
  const nextGt = markdown.indexOf('>', offset);
  if (lastLt !== -1 && (nextGt !== -1 || offset === markdown.length)) {
    // Check if there's no '>' between lastLt and offset, and no '<' between offset and nextGt
    const textBetween = markdown.substring(lastLt, nextGt !== -1 ? nextGt + 1 : markdown.length);
    // Simple verification that this looks like an HTML tag: <tag ...> or </tag> or <!---->
    if (/^<[!/]?[a-zA-Z0-9_-]+(\s+[^>]*)?>?$/.test(textBetween)) {
      return { 
        inTechnicalZone: true, 
        zoneType: 'html_tag',
        safeOffset: nextGt !== -1 ? nextGt + 1 : lastLt
      };
    }
  }

  // 2. Check line-specific technical zones
  const lineStart = markdown.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = markdown.indexOf('\n', offset);
  const actualLineEnd = lineEnd === -1 ? markdown.length : lineEnd;
  const currentLine = markdown.substring(lineStart, actualLineEnd);
  const colInLine = offset - lineStart;

  // 2a. Table separator row: | --- | --- | or |:---|---:|
  if (/^\|?(\s*:?-+:?\s*\|?)+\s*$/.test(currentLine.trim()) && currentLine.includes('-')) {
    return { 
      inTechnicalZone: true, 
      zoneType: 'table_separator',
      safeOffset: lineStart // Or handle via fallback mapping
    };
  }

  // 2b. Table border pipe '|' in table rows
  if ((currentLine.trim().startsWith('|') || currentLine.trim().endsWith('|')) && currentLine.includes('|')) {
    // Check if cursor is directly on '|' or pipe delimiter
    if (colInLine >= 0 && colInLine < currentLine.length && currentLine[colInLine] === '|') {
      return {
        inTechnicalZone: true,
        zoneType: 'table_pipe',
        safeOffset: offset + 1 < markdown.length ? offset + 1 : offset
      };
    }
  }

  // 2c. Markdown code fence: ``` or ~~~
  if (/^\s*(```|~~~)/.test(currentLine)) {
    return {
      inTechnicalZone: true,
      zoneType: 'code_fence',
      safeOffset: actualLineEnd + 1 <= markdown.length ? actualLineEnd + 1 : lineStart
    };
  }

  // 2d. Horizontal Rule: ---, ***, ___
  if (/^\s*([-*_]\s*){3,}\s*$/.test(currentLine)) {
    return {
      inTechnicalZone: true,
      zoneType: 'horizontal_rule',
      safeOffset: actualLineEnd + 1 <= markdown.length ? actualLineEnd + 1 : lineStart
    };
  }

  // 2e. Inside Markdown Link/Image URL: [text](http...|...) or ![alt](http...|...)
  const beforeInLine = currentLine.substring(0, colInLine);
  const afterInLine = currentLine.substring(colInLine);
  const lastOpenParen = beforeInLine.lastIndexOf('](');
  if (lastOpenParen !== -1) {
    const nextCloseParen = afterInLine.indexOf(')');
    if (nextCloseParen !== -1) {
      return {
        inTechnicalZone: true,
        zoneType: 'markdown_link_url',
        safeOffset: lineStart + lastOpenParen
      };
    }
  }

  return { inTechnicalZone: false };
}

// Quick tests
const md = `
# Title

<div class="phishy">
Hello world
</div>

| Col 1 | Col 2 |
| --- | --- |
| Val 1 | Val 2 |

[link](https://steemit.com)
\`\`\`javascript
const x = 1;
\`\`\`
---
`;

console.log('Testing HTML tag (<div class="phishy">):', isOffsetInTechnicalZone(md, md.indexOf('phishy')));
console.log('Testing Table separator (| --- | --- |):', isOffsetInTechnicalZone(md, md.indexOf('| --- |') + 3));
console.log('Testing Table pipe (|):', isOffsetInTechnicalZone(md, md.indexOf('| Col 1')));
console.log('Testing Markdown link URL:', isOffsetInTechnicalZone(md, md.indexOf('https://')));
console.log('Testing Code fence (```javascript):', isOffsetInTechnicalZone(md, md.indexOf('```javascript') + 3));
console.log('Testing Regular text (Hello world):', isOffsetInTechnicalZone(md, md.indexOf('world')));
