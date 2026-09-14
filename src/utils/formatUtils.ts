export interface FormatRange {
  formatKey: 'bold' | 'italic' | 'code' | 'strikethrough' | 'sub' | 'sup' | 'phishy';
  openTag: string;
  closeTag: string;
  openIdx: number;
  closeIdx: number;
  contentStart: number;
  contentEnd: number;
}

export interface TechnicalZoneCheck {
  inTechnicalZone: boolean;
  zoneType?: 'html_tag' | 'table_separator' | 'table_pipe' | 'code_fence' | 'horizontal_rule' | 'markdown_link_url';
  safeOffset?: number;
}

/**
 * Checks whether an offset in markdown text is inside a technical syntax zone
 * where injecting cursor markers or applying inline markdown formatting would
 * corrupt the syntax (e.g. inside HTML tags, table separators, code fences, etc.)
 */
export function isOffsetInTechnicalZone(markdown: string, offset: number): TechnicalZoneCheck {
  if (offset < 0 || offset > markdown.length) {
    return { inTechnicalZone: false };
  }

  // 1. Check if inside an HTML tag `<...>`
  const lastLt = markdown.lastIndexOf('<', offset);
  const nextGt = markdown.indexOf('>', offset);
  if (lastLt !== -1 && (nextGt !== -1 || offset === markdown.length)) {
    const textBetween = markdown.substring(lastLt, nextGt !== -1 ? nextGt + 1 : markdown.length);
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
      safeOffset: lineStart
    };
  }

  // 2b. Table border pipe '|' in table rows
  if ((currentLine.trim().startsWith('|') || currentLine.trim().endsWith('|')) && currentLine.includes('|')) {
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

export function getAllFormatRangesInLine(line: string): FormatRange[] {
  const ranges: FormatRange[] = [];
  if (!line) return ranges;

  // Mask positions that are inside HTML tags or markdown link URLs or code spans so delimiter checks don't misfire
  const isIgnored = new Array(line.length).fill(false);

  // 1. Mark HTML tags <...>
  let inLt = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '<' && (i === 0 || line[i - 1] !== '\\')) {
      inLt = i;
    } else if (line[i] === '>' && inLt !== -1) {
      for (let j = inLt; j <= i; j++) isIgnored[j] = true;
      inLt = -1;
    }
  }

  // 2. Mark Markdown link URLs: ](...)
  let linkParenStart = -1;
  for (let i = 0; i < line.length - 1; i++) {
    if (line[i] === ']' && line[i + 1] === '(' && (i === 0 || line[i - 1] !== '\\')) {
      linkParenStart = i + 1;
    } else if (line[i] === ')' && linkParenStart !== -1) {
      for (let j = linkParenStart; j <= i; j++) isIgnored[j] = true;
      linkParenStart = -1;
    }
  }

  // 1. Paired HTML-like tags: <sub>, <sup>, <div class="phishy">, <span class="phishy">
  const htmlPairs: Array<{ formatKey: 'sub' | 'sup' | 'phishy'; openTag: string; closeTag: string }> = [
    { formatKey: 'sub', openTag: '<sub>', closeTag: '</sub>' },
    { formatKey: 'sup', openTag: '<sup>', closeTag: '</sup>' },
    { formatKey: 'phishy', openTag: '<div class="phishy">', closeTag: '</div>' },
    { formatKey: 'phishy', openTag: '<span class="phishy">', closeTag: '</span>' },
    { formatKey: 'phishy', openTag: "<div class='phishy'>", closeTag: '</div>' },
    { formatKey: 'phishy', openTag: "<span class='phishy'>", closeTag: '</span>' },
  ];

  for (const { formatKey, openTag, closeTag } of htmlPairs) {
    const oLen = openTag.length;
    const cLen = closeTag.length;
    let s = 0;
    while (s < line.length) {
      const oIdx = line.indexOf(openTag, s);
      if (oIdx === -1) break;
      if (oIdx > 0 && line[oIdx - 1] === '\\') {
        s = oIdx + oLen;
        continue;
      }
      const cIdx = line.indexOf(closeTag, oIdx + oLen);
      if (cIdx === -1) break;
      if (cIdx > 0 && line[cIdx - 1] === '\\') {
        s = cIdx + cLen;
        continue;
      }
      ranges.push({
        formatKey,
        openTag,
        closeTag,
        openIdx: oIdx,
        closeIdx: cIdx,
        contentStart: oIdx + oLen,
        contentEnd: cIdx,
      });
      s = cIdx + cLen;
    }
  }

  // 2. Inline code: `...`
  const codeIdxs: number[] = [];
  let cSearch = 0;
  while (cSearch < line.length) {
    const idx = line.indexOf('`', cSearch);
    if (idx === -1) break;
    if ((idx === 0 || line[idx - 1] !== '\\') && !isIgnored[idx]) {
      codeIdxs.push(idx);
    }
    cSearch = idx + 1;
  }
  for (let i = 0; i < codeIdxs.length; i += 2) {
    if (i + 1 < codeIdxs.length) {
      const startCode = codeIdxs[i];
      const endCode = codeIdxs[i + 1];
      ranges.push({
        formatKey: 'code',
        openTag: '`',
        closeTag: '`',
        openIdx: startCode,
        closeIdx: endCode,
        contentStart: startCode + 1,
        contentEnd: endCode,
      });
      for (let j = startCode; j <= endCode; j++) isIgnored[j] = true;
    }
  }

  // 3. Strikethrough: ~~...~~
  const strikeIdxs: number[] = [];
  let sSearch = 0;
  while (sSearch < line.length) {
    const idx = line.indexOf('~~', sSearch);
    if (idx === -1) break;
    if ((idx === 0 || line[idx - 1] !== '\\') && !isIgnored[idx] && !isIgnored[idx + 1]) {
      strikeIdxs.push(idx);
    }
    sSearch = idx + 2;
  }
  for (let i = 0; i < strikeIdxs.length; i += 2) {
    if (i + 1 < strikeIdxs.length) {
      ranges.push({
        formatKey: 'strikethrough',
        openTag: '~~',
        closeTag: '~~',
        openIdx: strikeIdxs[i],
        closeIdx: strikeIdxs[i + 1],
        contentStart: strikeIdxs[i] + 2,
        contentEnd: strikeIdxs[i + 1],
      });
    }
  }

  // 4. Asterisks: single (*), double (**), triple (***), and empty tags (**, ****, ******)
  const starRuns: Array<{ start: number; end: number; len: number }> = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '*' && !isIgnored[i]) {
      if (i > 0 && line[i - 1] === '\\') {
        i++;
        continue;
      }
      const rStart = i;
      while (i < line.length && line[i] === '*' && !isIgnored[i]) {
        i++;
      }
      starRuns.push({ start: rStart, end: i, len: i - rStart });
    } else {
      i++;
    }
  }

  for (const r of starRuns) {
    if (r.len === 6) {
      ranges.push({
        formatKey: 'bold',
        openTag: '***',
        closeTag: '***',
        openIdx: r.start,
        closeIdx: r.start + 3,
        contentStart: r.start + 3,
        contentEnd: r.start + 3,
      });
      ranges.push({
        formatKey: 'italic',
        openTag: '***',
        closeTag: '***',
        openIdx: r.start,
        closeIdx: r.start + 3,
        contentStart: r.start + 3,
        contentEnd: r.start + 3,
      });
    } else if (r.len === 4) {
      ranges.push({
        formatKey: 'bold',
        openTag: '**',
        closeTag: '**',
        openIdx: r.start,
        closeIdx: r.start + 2,
        contentStart: r.start + 2,
        contentEnd: r.start + 2,
      });
    }
  }

  const tripleStars = starRuns.filter(r => r.len === 3);
  for (let k = 0; k < tripleStars.length; k += 2) {
    if (k + 1 < tripleStars.length) {
      ranges.push({
        formatKey: 'bold',
        openTag: '***',
        closeTag: '***',
        openIdx: tripleStars[k].start,
        closeIdx: tripleStars[k + 1].start,
        contentStart: tripleStars[k].start + 3,
        contentEnd: tripleStars[k + 1].start,
      });
      ranges.push({
        formatKey: 'italic',
        openTag: '***',
        closeTag: '***',
        openIdx: tripleStars[k].start,
        closeIdx: tripleStars[k + 1].start,
        contentStart: tripleStars[k].start + 3,
        contentEnd: tripleStars[k + 1].start,
      });
    }
  }

  const doubleStars = starRuns.filter(r => r.len === 2);
  for (let k = 0; k < doubleStars.length; k += 2) {
    if (k + 1 < doubleStars.length) {
      ranges.push({
        formatKey: 'bold',
        openTag: '**',
        closeTag: '**',
        openIdx: doubleStars[k].start,
        closeIdx: doubleStars[k + 1].start,
        contentStart: doubleStars[k].start + 2,
        contentEnd: doubleStars[k + 1].start,
      });
    }
  }

  const singleStars = starRuns.filter(r => r.len === 1);
  for (let k = 0; k < singleStars.length; k += 2) {
    if (k + 1 < singleStars.length) {
      ranges.push({
        formatKey: 'italic',
        openTag: '*',
        closeTag: '*',
        openIdx: singleStars[k].start,
        closeIdx: singleStars[k + 1].start,
        contentStart: singleStars[k].start + 1,
        contentEnd: singleStars[k + 1].start,
      });
    }
  }

  // 5. Underscores: _..._ (italic), __...__ (bold), ___...___ (bold & italic)
  const underRuns: Array<{ start: number; end: number; len: number }> = [];
  let j = 0;
  while (j < line.length) {
    if (line[j] === '_' && !isIgnored[j]) {
      if (j > 0 && line[j - 1] === '\\') {
        j++;
        continue;
      }
      const rStart = j;
      while (j < line.length && line[j] === '_' && !isIgnored[j]) {
        j++;
      }
      underRuns.push({ start: rStart, end: j, len: j - rStart });
    } else {
      j++;
    }
  }

  for (const r of underRuns) {
    if (r.len === 6) {
      ranges.push({
        formatKey: 'bold',
        openTag: '___',
        closeTag: '___',
        openIdx: r.start,
        closeIdx: r.start + 3,
        contentStart: r.start + 3,
        contentEnd: r.start + 3,
      });
      ranges.push({
        formatKey: 'italic',
        openTag: '___',
        closeTag: '___',
        openIdx: r.start,
        closeIdx: r.start + 3,
        contentStart: r.start + 3,
        contentEnd: r.start + 3,
      });
    } else if (r.len === 4) {
      ranges.push({
        formatKey: 'bold',
        openTag: '__',
        closeTag: '__',
        openIdx: r.start,
        closeIdx: r.start + 2,
        contentStart: r.start + 2,
        contentEnd: r.start + 2,
      });
    }
  }

  const tripleUnders = underRuns.filter(r => r.len === 3);
  for (let k = 0; k < tripleUnders.length; k += 2) {
    if (k + 1 < tripleUnders.length) {
      ranges.push({
        formatKey: 'bold',
        openTag: '___',
        closeTag: '___',
        openIdx: tripleUnders[k].start,
        closeIdx: tripleUnders[k + 1].start,
        contentStart: tripleUnders[k].start + 3,
        contentEnd: tripleUnders[k + 1].start,
      });
      ranges.push({
        formatKey: 'italic',
        openTag: '___',
        closeTag: '___',
        openIdx: tripleUnders[k].start,
        closeIdx: tripleUnders[k + 1].start,
        contentStart: tripleUnders[k].start + 3,
        contentEnd: tripleUnders[k + 1].start,
      });
    }
  }

  const doubleUnders = underRuns.filter(r => r.len === 2);
  for (let k = 0; k < doubleUnders.length; k += 2) {
    if (k + 1 < doubleUnders.length) {
      ranges.push({
        formatKey: 'bold',
        openTag: '__',
        closeTag: '__',
        openIdx: doubleUnders[k].start,
        closeIdx: doubleUnders[k + 1].start,
        contentStart: doubleUnders[k].start + 2,
        contentEnd: doubleUnders[k + 1].start,
      });
    }
  }

  const singleUnders = underRuns.filter(r => r.len === 1);
  for (let k = 0; k < singleUnders.length; k += 2) {
    if (k + 1 < singleUnders.length) {
      ranges.push({
        formatKey: 'italic',
        openTag: '_',
        closeTag: '_',
        openIdx: singleUnders[k].start,
        closeIdx: singleUnders[k + 1].start,
        contentStart: singleUnders[k].start + 1,
        contentEnd: singleUnders[k + 1].start,
      });
    }
  }

  return ranges;
}

export function isInsideTagInLine(line: string, caretPosInLine: number, openTag: string, selEndInLine: number = caretPosInLine): boolean {
  let key: FormatRange['formatKey'] = 'bold';
  if (openTag === '*' || openTag === 'italic' || openTag === '_') key = 'italic';
  else if (openTag === '**' || openTag === 'bold' || openTag === '__') key = 'bold';
  else if (openTag === '`' || openTag === 'code') key = 'code';
  else if (openTag === '~~' || openTag === 'strikethrough') key = 'strikethrough';
  else if (openTag === '<sub>' || openTag === 'sub') key = 'sub';
  else if (openTag === '<sup>' || openTag === 'sup') key = 'sup';
  else if (openTag === '<div class="phishy">' || openTag === 'phishy') key = 'phishy';

  const ranges = getAllFormatRangesInLine(line).filter(r => r.formatKey === key);
  if (caretPosInLine === selEndInLine) {
    return ranges.some(r => caretPosInLine >= r.contentStart && caretPosInLine <= r.contentEnd);
  }
  return ranges.some(r => caretPosInLine >= r.contentStart && selEndInLine <= r.contentEnd);
}

export function getActiveFormatRangeInLine(line: string, caretInLine: number): FormatRange | null {
  const ranges = getAllFormatRangesInLine(line);
  const matching = ranges.filter(r => caretInLine >= r.contentStart && caretInLine <= r.contentEnd);
  if (matching.length === 0) return null;
  matching.sort((a, b) => (a.contentEnd - a.contentStart) - (b.contentEnd - b.contentStart));
  return matching[0];
}
