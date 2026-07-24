/**
 * Web Worker for offloading heavy editor operations from the main UI thread.
 * Handles text statistics (raw & clean counts) and document processing.
 */

export interface WorkerInputMessage {
  id: string;
  type: 'CALCULATE_STATS' | 'PROCESS_BARE_IMAGES';
  payload: {
    text: string;
  };
}

export interface WorkerOutputMessage {
  id: string;
  type: 'CALCULATE_STATS_RESULT' | 'PROCESS_BARE_IMAGES_RESULT';
  payload: any;
}

self.onmessage = (e: MessageEvent<WorkerInputMessage>) => {
  const { id, type, payload } = e.data;
  if (!payload || typeof payload.text !== 'string') return;

  if (type === 'CALCULATE_STATS') {
    const text = payload.text;

    // 1. Raw Stats Calculation
    const rawWords = text.trim() ? text.trim().split(/\s+/).length : 0;
    const rawChars = text.length;

    // 2. Clean Stats Calculation (Stripping footers, HTML, links, images, blockquotes, markdown syntax)
    let cleanText = text.replace(/<hr>[\s\S]*?Photo by[\s\S]*?<\/footer>/gi, ' Attribution ');
    cleanText = cleanText.replace(/<hr>[\s\S]*?Source:[\s\S]*?<\/footer>/gi, ' Source ');
    cleanText = cleanText.replace(/<[^>]*>/g, ' ');
    cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    cleanText = cleanText.replace(/!\[([^\]]*)\]\([^)]+\)/g, (_, alt) => {
      return alt.split(/\s+/).slice(0, 3).join(' ');
    });
    cleanText = cleanText.split('\n').filter(line => !line.trim().startsWith('>')).join('\n');
    cleanText = cleanText.replace(/[#*`_~]/g, '');

    const cleanWords = cleanText.trim() ? cleanText.trim().split(/\s+/).length : 0;
    const cleanChars = cleanText.length;

    self.postMessage({
      id,
      type: 'CALCULATE_STATS_RESULT',
      payload: {
        rawStats: { words: rawWords, chars: rawChars },
        cleanStats: { words: cleanWords, chars: cleanChars }
      }
    } as WorkerOutputMessage);
  } else if (type === 'PROCESS_BARE_IMAGES') {
    const text = payload.text;
    const urlRegex = /(?:https?:\/\/)[^\s<>"')]+(?:\([^\s)]+\)|[^\s`!@#$^*()_+={}[\]:;'".,<>?~\\|])*/gi;

    const processedText = text.replace(urlRegex, (match, index) => {
      const before = text.substring(Math.max(0, index - 4), index);
      const after = text.substring(index + match.length, index + match.length + 2);
      const beforeLong = text.substring(Math.max(0, index - 25), index);

      if (
        beforeLong.includes('src="') ||
        beforeLong.includes("src='") ||
        beforeLong.includes('href="') ||
        beforeLong.includes("href='") ||
        beforeLong.includes('url(')
      ) {
        return match;
      }
      if (before.endsWith('](') && after.startsWith(')')) return match;
      if (before.endsWith('![') || before.endsWith('[') || after.startsWith(']')) return match;

      const cleanUrl = match.trim().toLowerCase();
      const isImg =
        /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff)(\?.*)?$/i.test(cleanUrl) ||
        /^https?:\/\/steemitimages\.com\//i.test(cleanUrl) ||
        /^https?:\/\/images\.hive\.blog\//i.test(cleanUrl) ||
        /^https?:\/\/images\.ecency\.com\//i.test(cleanUrl);

      if (isImg) {
        return `![image](${match})`;
      }
      return match;
    });

    self.postMessage({
      id,
      type: 'PROCESS_BARE_IMAGES_RESULT',
      payload: { text: processedText }
    } as WorkerOutputMessage);
  }
};
