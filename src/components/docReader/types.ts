export type DocReaderTheme = 'paper' | 'sepia' | 'dark' | 'oled' | 'nord';
export type DocReaderWidth = 'narrow' | 'medium' | 'full';
export type DocReaderFont = 'sans' | 'serif' | 'mono';

export interface TOCHeadingItem {
  id: string;
  level: number;
  text: string;
  index: number;
}

export interface DocReaderSource {
  id?: string;
  title: string;
  content: string;
  tags?: string;
  type: 'current' | 'draft' | 'file';
  fileName?: string;
  updatedAt?: number;
}

export interface DocReaderSettings {
  fontSize: number; // e.g. 18
  lineHeight: number; // e.g. 1.7
  theme: DocReaderTheme;
  width: DocReaderWidth;
  font: DocReaderFont;
  showTOC: boolean;
  showProgress: boolean;
  autoHideToolbar: boolean;
}
