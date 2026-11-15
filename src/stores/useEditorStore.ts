import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface EditorStats {
  words: number;
  chars: number;
}

export interface CursorPosition {
  row: number;
  col: number;
}

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strikethrough: boolean;
  sub: boolean;
  sup: boolean;
  phishy: boolean;
}

export interface EditorState {
  lines: string[];
  cursor: CursorPosition | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  setLines: (lines: string[]) => void;
  updateLine: (index: number, newText: string) => void;
  setCursor: (cursor: CursorPosition | null) => void;
  setSelection: (start: number | null, end: number | null) => void;
  
  content: string;
  setContent: (content: string) => void;
  stats: EditorStats;
  cleanStats: EditorStats;
  setStats: (stats: EditorStats, cleanStats: EditorStats) => void;
  
  wpm: number;
  setWpm: (wpm: number) => void;
  
  currentLang: string;
  setCurrentLang: (lang: string) => void;

  // View & formatting preferences
  isLivePreviewEnabled: boolean;
  setIsLivePreviewEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  toggleLivePreview: () => void;

  syncScrollEnabled: boolean;
  setSyncScrollEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;

  beautifyEnabled: boolean;
  setBeautifyEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;

  activeFormats: ActiveFormats;
  setActiveFormats: (formats: Partial<ActiveFormats> | ((prev: ActiveFormats) => ActiveFormats)) => void;
}

const DEFAULT_ACTIVE_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  code: false,
  strikethrough: false,
  sub: false,
  sup: false,
  phishy: false,
};

const getInitialContent = () => {
  try {
    return localStorage.getItem('steem_autosave_temp') || sessionStorage.getItem('steem_autosave_temp') || '';
  } catch {
    return '';
  }
};

const getInitialLang = () => {
  try {
    return localStorage.getItem('steem_language') || 'uk';
  } catch {
    return 'uk';
  }
};

const getInitialLivePreview = () => {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem('steem_live_preview_enabled') === 'true';
};

const getInitialSyncScroll = () => {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem('steem_sync_scroll') !== 'false';
};

const getInitialBeautify = () => {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem('steem_beautify') !== 'false';
};

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set) => ({
    lines: [],
    cursor: null,
    selectionStart: null,
    selectionEnd: null,
    content: getInitialContent(),
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
    setContent: (content) => set({ content }),
    wpm: 0,
    setWpm: (wpm) => set({ wpm }),
    currentLang: getInitialLang(),
    setCurrentLang: (currentLang) => set({ currentLang }),

    isLivePreviewEnabled: getInitialLivePreview(),
    setIsLivePreviewEnabled: (action) =>
      set((state) => {
        const next = typeof action === 'function' ? action(state.isLivePreviewEnabled) : action;
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('steem_live_preview_enabled', String(next));
          } catch (e) {
            console.debug(e);
          }
        }
        return { isLivePreviewEnabled: next };
      }),
    toggleLivePreview: () =>
      set((state) => {
        const next = !state.isLivePreviewEnabled;
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('steem_live_preview_enabled', String(next));
          } catch (e) {
            console.debug(e);
          }
        }
        return { isLivePreviewEnabled: next };
      }),

    syncScrollEnabled: getInitialSyncScroll(),
    setSyncScrollEnabled: (action) =>
      set((state) => {
        const next = typeof action === 'function' ? action(state.syncScrollEnabled) : action;
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('steem_sync_scroll', String(next));
          } catch (e) {
            console.debug(e);
          }
        }
        return { syncScrollEnabled: next };
      }),

    beautifyEnabled: getInitialBeautify(),
    setBeautifyEnabled: (action) =>
      set((state) => {
        const next = typeof action === 'function' ? action(state.beautifyEnabled) : action;
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('steem_beautify', String(next));
          } catch (e) {
            console.debug(e);
          }
        }
        return { beautifyEnabled: next };
      }),

    activeFormats: DEFAULT_ACTIVE_FORMATS,
    setActiveFormats: (formatsOrFn) =>
      set((state) => {
        const next = typeof formatsOrFn === 'function'
          ? formatsOrFn(state.activeFormats)
          : { ...state.activeFormats, ...formatsOrFn };
        if (next === state.activeFormats) return state;
        const keys = Object.keys(state.activeFormats) as Array<keyof ActiveFormats>;
        if (keys.every((k) => state.activeFormats[k] === next[k])) {
          return state;
        }
        return { activeFormats: next };
      }),
  }))
);

export function getRowColFromOffset(text: string, offset: number): CursorPosition {
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
    col: len - (lastNewline + 1),
  };
}

export function getOffsetFromRowCol(text: string, cursor: CursorPosition): number {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < cursor.row; i++) {
    if (i < lines.length) {
      offset += lines[i].length + 1; // +1 for '\n'
    }
  }
  return offset + cursor.col;
}
