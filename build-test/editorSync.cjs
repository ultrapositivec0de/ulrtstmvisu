"use strict";
/**
 * Utility functions for bidirectional synchronization between Markdown
 * state and HTML rich editor content, customized for Steem layout formats.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToMarkdown = htmlToMarkdown;
exports.isImageAndProxyUrl = isImageAndProxyUrl;
exports.convertBareImageUrlsToMarkdown = convertBareImageUrlsToMarkdown;
function applyInlineFormat(inner, open, close) {
    if (!inner)
        return '';
    // Split by newline to avoid stretching formatting tags across block elements/paragraphs
    const lines = inner.split('\n');
    const formattedLines = lines.map(line => {
        if (!line.trim()) {
            return line; // keep whitespace and empty lines as-is
        }
        // Extract leading and trailing whitespace
        const leadingMatch = line.match(/^(\s*)/);
        const trailingMatch = line.match(/(\s*)$/);
        const leading = leadingMatch ? leadingMatch[1] : '';
        const trailing = trailingMatch ? trailingMatch[1] : '';
        const core = line.substring(leading.length, line.length - trailing.length);
        if (!core) {
            return line;
        }
        return leading + open + core + close + trailing;
    });
    return formattedLines.join('\n');
}
function htmlToMarkdown(html) {
    if (!html)
        return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    const convertNode = (node, insideList = false, insideTable = false) => {
        if (node.nodeType === Node.TEXT_NODE) {
            let val = (node.nodeValue || '').replace(/\u200B/g, '');
            if (node.parentElement && !['pre', 'code'].includes(node.parentElement.tagName.toLowerCase())) {
                if (node.previousSibling && node.previousSibling.nodeName.toLowerCase() === 'br') {
                    val = val.replace(/^\r?\n/, '');
                }
            }
            if (!val.trim()) {
                const parentTag = node.parentElement?.tagName.toLowerCase();
                if (parentTag && ['body', 'div', 'blockquote', 'center', 'ul', 'ol', 'table', 'tbody', 'thead', 'tr'].includes(parentTag)) {
                    return '';
                }
            }
            return val;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }
        const el = node;
        const tag = el.tagName.toLowerCase();
        let inner = '';
        el.childNodes.forEach(child => {
            inner += convertNode(child, insideList || tag === 'ul' || tag === 'ol', insideTable || tag === 'table');
        });
        switch (tag) {
            case 'h1': return `\n# ${inner.trim()}\n`;
            case 'h2': return `\n## ${inner.trim()}\n`;
            case 'h3': return `\n### ${inner.trim()}\n`;
            case 'h4': return `\n#### ${inner.trim()}\n`;
            case 'h5': return `\n##### ${inner.trim()}\n`;
            case 'h6': return `\n###### ${inner.trim()}\n`;
            case 'strong':
            case 'b': return applyInlineFormat(inner, '**', '**');
            case 'em':
            case 'i': return applyInlineFormat(inner, '*', '*');
            case 'strike':
            case 'del':
            case 's': return applyInlineFormat(inner, '~~', '~~');
            case 'sub': return applyInlineFormat(inner, '<sub>', '</sub>');
            case 'sup': return applyInlineFormat(inner, '<sup>', '</sup>');
            case 'span': {
                const id = el.id || '';
                if (id === 'steem_cursor_start')
                    return '\x01';
                if (id === 'steem_cursor_end')
                    return '\x02';
                const className = el.className || '';
                if (className.includes('phishy')) {
                    return applyInlineFormat(inner, '<span class="phishy">', '</span>');
                }
                return inner;
            }
            case 'center': return `\n<center>\n${inner.trim()}\n</center>\n`;
            case 'blockquote': return `\n> ${inner.trim().replace(/\n/g, '\n> ')}\n`;
            case 'pre': {
                const codeElement = el.querySelector('code');
                const codeContent = codeElement ? codeElement.innerText : el.innerText;
                return `\n\`\`\`\n${codeContent.trim()}\n\`\`\`\n`;
            }
            case 'code': {
                if (el.parentElement?.tagName.toLowerCase() === 'pre')
                    return inner;
                return applyInlineFormat(inner, '`', '`');
            }
            case 'br': {
                return '\n';
            }
            case 'a': {
                const href = el.getAttribute('href') || '';
                const trimmedInner = inner.trim();
                // If it's a bare auto-link that is an image, we can optionally make it an image embed
                if (isImageAndProxyUrl(href)) {
                    if (trimmedInner === href || trimmedInner === '' || trimmedInner === 'image') {
                        return `![image](${href})`;
                    }
                }
                return `[${inner}](${href})`;
            }
            case 'img': {
                const src = el.getAttribute('src') || '';
                const alt = el.getAttribute('alt') || '';
                const className = el.getAttribute('class') || '';
                return className ? `![${alt}](${src} "${className}")` : `![${alt}](${src})`;
            }
            case 'li': {
                // Check for checklist elements
                const checkbox = el.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    const isChecked = checkbox.checked;
                    const cleanText = inner.replace(/\[\s?[xX]?\s?\]/g, '').trim();
                    return `- [${isChecked ? 'x' : ' '}] ${cleanText}\n`;
                }
                if (inner.trim().startsWith('[ ]')) {
                    return `- [ ] ${inner.trim().substring(3).trim()}\n`;
                }
                else if (inner.trim().startsWith('[x]') || inner.trim().startsWith('[X]')) {
                    return `- [x] ${inner.trim().substring(3).trim()}\n`;
                }
                return `- ${inner.trim()}\n`;
            }
            case 'ul': return `\n${inner.trim()}\n`;
            case 'ol': {
                let olText = '';
                let count = 1;
                el.childNodes.forEach(child => {
                    if (child.nodeName.toLowerCase() === 'li') {
                        const childText = convertNode(child, true, insideTable).replace(/^-\s*/, '').trim();
                        olText += `${count}. ${childText}\n`;
                        count++;
                    }
                });
                return `\n${olText.trim()}\n`;
            }
            case 'table': {
                if (el.getAttribute('data-format') === 'html') {
                    return `\n${el.outerHTML}\n`;
                }
                const rows = [];
                const thead = el.querySelector('thead');
                const tbody = el.querySelector('tbody') || el;
                const convertCell = (cell) => {
                    let cellMd = '';
                    cell.childNodes.forEach(child => {
                        cellMd += convertNode(child, false, true);
                    });
                    // Replace newlines with <br> to not break the Markdown table row
                    return cellMd.replace(/\n/g, '<br>').replace(/^(<br>|\s)+/, '').replace(/(<br>|\s)+$/, '') || ' ';
                };
                const headerRow = thead ? thead.querySelector('tr') : el.querySelector('tr');
                const headerCells = headerRow ? Array.from(headerRow.querySelectorAll('th, td')) : [];
                const headers = headerCells.map(c => convertCell(c));
                const bodyRows = Array.from(tbody.querySelectorAll('tr')).filter((tr) => tr !== headerRow && (!thead || !thead.contains(tr)));
                for (let r = 0; r < bodyRows.length; r++) {
                    const cells = Array.from(bodyRows[r].querySelectorAll('td, th')).map(c => convertCell(c));
                    if (cells.length > 0) {
                        rows.push(cells);
                    }
                }
                if (headers.length === 0 && rows.length > 0) {
                    const colCount = rows[0].length;
                    for (let c = 0; c < colCount; c++)
                        headers.push(`Col ${c + 1}`);
                }
                if (headers.length > 0) {
                    let tableMd = '\n| ' + headers.join(' | ') + ' |\n';
                    tableMd += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
                    rows.forEach(row => {
                        const paddedRow = [...row];
                        while (paddedRow.length < headers.length)
                            paddedRow.push(' ');
                        tableMd += '| ' + paddedRow.slice(0, headers.length).join(' | ') + ' |\n';
                    });
                    return tableMd;
                }
                return inner;
            }
            case 'tr':
            case 'thead':
            case 'tbody':
            case 'th':
            case 'td': {
                return inner;
            }
            case 'div':
            case 'p': {
                const className = el.className || '';
                if (className.includes('pull-left')) {
                    return `\n<div class="pull-left">\n${inner.trim()}\n</div>\n`;
                }
                else if (className.includes('pull-right')) {
                    return `\n<div class="pull-right">\n${inner.trim()}\n</div>\n`;
                }
                else if (className.includes('clearfix')) {
                    return `\n<div class="clearfix"></div>\n`;
                }
                else if (className.includes('text-justify')) {
                    return `\n<div class="text-justify">\n${inner.trim()}\n</div>\n`;
                }
                else if (className.includes('text-right')) {
                    return `\n<div class="text-right">\n${inner.trim()}\n</div>\n`;
                }
                else if (className.includes('text-center')) {
                    return `\n<div class="text-center">\n${inner.trim()}\n</div>\n`;
                }
                else if (className.includes('phishy')) {
                    return `\n<div class="phishy">${inner.trim()}</div>\n`;
                }
                if (inner.trim() === '') {
                    return inner.length > 0 ? inner : '';
                }
                // We do not trim \n here because they might be from <br> tags meant to preserve spacing
                return `\n${inner}\n`;
            }
            default: return inner;
        }
    };
    let md = '';
    body.childNodes.forEach(node => {
        md += convertNode(node);
    });
    return md
        .replace(/\u200B/g, '')
        .replace(/\r\n/g, '\n')
        .trim();
}
function isImageAndProxyUrl(url) {
    const cleanUrl = url.trim().toLowerCase();
    // Standard extensions
    if (/\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff)(\?.*)?$/i.test(cleanUrl))
        return true;
    // Steemit, Ecency, and Hive image proxy domains
    if (/^https?:\/\/steemitimages\.com\//i.test(cleanUrl))
        return true;
    if (/^https?:\/\/images\.hive\.blog\//i.test(cleanUrl))
        return true;
    if (/^https?:\/\/images\.ecency\.com\//i.test(cleanUrl))
        return true;
    // Specific steemitimages upload hash pattern (e.g. https://steemitimages.com/DQm...)
    if (/^https?:\/\/steemitimages\.com\/[A-Za-z0-9_-]+/i.test(cleanUrl))
        return true;
    return false;
}
function convertBareImageUrlsToMarkdown(text) {
    if (!text)
        return '';
    // Find URL-like matches starting with HTTP or HTTPS
    const urlRegex = /(?:https?:\/\/)[^\s<>"')]+(?:\([^\s)]+\)|[^\s`!@#$^*()_+={}[\]:;'".,<>?~\\|])*/gi;
    return text.replace(urlRegex, (match, index) => {
        // Avoid double matching or matching inside Markdown link syntax [alt](url)
        const before = text.substring(Math.max(0, index - 4), index);
        const after = text.substring(index + match.length, index + match.length + 2);
        // Avoid HTML attribute values like src="..."
        const beforeLong = text.substring(Math.max(0, index - 25), index);
        if (beforeLong.includes('src="') ||
            beforeLong.includes("src='") ||
            beforeLong.includes('href="') ||
            beforeLong.includes("href='") ||
            beforeLong.includes('url(')) {
            return match;
        }
        // Already in standard markdown bracket format (url)
        if (before.endsWith('](') && after.startsWith(')')) {
            return match;
        }
        // Part of image markdown syntax ![]() or []()
        if (before.endsWith('![') || before.endsWith('[') || after.startsWith(']')) {
            return match;
        }
        if (isImageAndProxyUrl(match)) {
            return `![image](${match})`;
        }
        return match;
    });
}
