import { create } from 'zustand';

interface EditorState {
  lines: string[];
  cursor: { row: number; col: number } | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  setLines: (lines: string[]) => void;
  updateLine: (index: number, newText: string) => void;
  setCursor: (cursor: { row: number; col: number } | null) => void;
  setSelection: (start: number | null, end: number | null) => void;
  
  content: string;
  setContent: (content: string) => void;
  stats: { words: number; chars: number };
  cleanStats: { words: number; chars: number };
  setStats: (stats: { words: number; chars: number }, cleanStats: { words: number; chars: number }) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  lines: [],
  cursor: null,
  selectionStart: null,
  selectionEnd: null,
  content: '',
  stats: { words: 0, chars: 0 },
  cleanStats: { words: 0, chars: 0 },
  setStats: (stats, cleanStats) => set({ stats, cleanStats }),
  setLines: (lines) => set({ lines, content: lines.join('\n') }),
  updateLine: (index, newText) => set((state) => {
    const newLines = [...state.lines];
    newLines[index] = newText;
    return { lines: newLines, content: newLines.join('\n') };
  }),
  setCursor: (cursor) => set({ cursor }),
  setSelection: (start, end) => set({ selectionStart: start, selectionEnd: end }),
  setContent: (content) => set({ content })
}));

export function getRowColFromOffset(text: string, offset: number) {
  let row = 0;
  let lastNewline = -1;
  const len = Math.min(offset, text.length);
  for (let i = 0; i < len; i++) {
    if (text[i] === '\n') {
      row++;
      lastNewline = i;
    }
  }
  return {
    row,
    col: len - (lastNewline + 1)
  };
}

export function getOffsetFromRowCol(text: string, cursor: { row: number; col: number }) {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < cursor.row; i++) {
    if (i < lines.length) {
      offset += lines[i].length + 1; // +1 for '\n'
    }
  }
  return offset + cursor.col;
}

