import React from 'react';
import {
  Link as LinkIcon,
  Quote,
  LayoutGrid,
  SplitSquareHorizontal,
  Table as TableIcon,
  Code,
  Terminal,
  Indent,
  FileText,
  AtSign,
  Image as ImageIcon,
  Images
} from 'lucide-react';
import { useEditorStore } from '../../store';

export interface ToolItem {
  id: string;
  title: string;
  label: string | React.ReactNode;
  action: (e?: React.MouseEvent) => void;
}

export interface CreateToolsMapProps {
  fmt: (before: string, after?: string) => void;
  fmtLine: (prefix: string) => void;
  handleLink: () => void;
  insertAtCursor: (text: string, cursorMode?: any, customEndStr?: string) => void;
  importTable: () => void;
  setTableSelectorPos: (pos: { x: number; y: number; direction: 'up' | 'down' }) => void;
  setShowTableSelector: React.Dispatch<React.SetStateAction<boolean>>;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  setContent: (content: string) => void;
  promptDialog: (title: string, defaultValue?: string) => Promise<string | null>;
  setActiveModal: (modal: any) => void;
  extractMentions: (content: string) => string[];
  contentForPublish: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setIsMiniGalleryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  t: (key: any) => string;
}

export function createToolsMap({
  fmt,
  fmtLine,
  handleLink,
  insertAtCursor,
  importTable,
  setTableSelectorPos,
  setShowTableSelector,
  editorRef,
  setContent,
  promptDialog,
  setActiveModal,
  extractMentions,
  contentForPublish,
  fileInputRef,
  setIsMiniGalleryOpen,
  t,
}: CreateToolsMapProps): Record<string, ToolItem> {
  return {
    'B': { id: 'B', title: t('bold'), label: 'B', action: () => fmt('**') },
    'I': { id: 'I', title: t('italic'), label: 'I', action: () => fmt('*') },
    'S': { id: 'S', title: t('strike'), label: '~~', action: () => fmt('~~') },
    'sub': { id: 'sub', title: t('subscript'), label: 'sub', action: () => fmt('<sub>', '</sub>') },
    'sup': { id: 'sup', title: t('superscript'), label: 'sup', action: () => fmt('<sup>', '</sup>') },
    'H1': { id: 'H1', title: t('h1'), label: 'H1', action: () => fmtLine('# ') },
    'H2': { id: 'H2', title: t('h2'), label: 'H2', action: () => fmtLine('## ') },
    'H3': { id: 'H3', title: t('h3'), label: 'H3', action: () => fmtLine('### ') },
    'Link': { id: 'Link', title: t('link'), label: <LinkIcon size={20} />, action: handleLink },
    'Quote': { id: 'Quote', title: t('quote'), label: <Quote size={20} />, action: () => fmtLine('> ') },
    'List': { id: 'List', title: t('listBullet'), label: '•', action: () => fmtLine('- ') },
    'Num': { id: 'Num', title: t('listOrdered'), label: '1.', action: () => fmtLine('1. ') },
    'Task': { id: 'Task', title: t('listTask'), label: '☑', action: () => fmtLine('- [ ] ') },
    'Table': {
      id: 'Table',
      title: t('table'),
      label: <LayoutGrid size={20} />,
      action: (e?: React.MouseEvent) => {
        if (e) {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const direction = rect.top > window.innerHeight / 2 ? 'up' : 'down';
          let x = rect.left;
          if (x + 220 > window.innerWidth) x = window.innerWidth - 240;
          setTableSelectorPos({ 
            x,
            y: direction === 'down' ? rect.bottom + 10 : window.innerHeight - rect.top + 10,
            direction
          });
          setShowTableSelector(prev => !prev);
        } else {
          insertAtCursor('| Header | Header |\n| --- | --- |\n| Cell | Cell |\n');
        }
      }
    },
    'Separator': { id: 'Separator', title: t('tableSelector1ColSep'), label: <SplitSquareHorizontal size={20} />, action: () => insertAtCursor('| Head |\n| --- |\n', 'end') },
    'Import': { id: 'Import', title: t('importTable'), label: <TableIcon size={20} />, action: () => importTable() },
    'Code': { id: 'Code', title: t('codeBlock'), label: <Code size={20} />, action: () => fmt('```\n', '\n```') },
    'Inline': { id: 'Inline', title: t('inlineCode'), label: <Terminal size={20} />, action: () => fmt('`') },
    'Indent': {
      id: 'Indent',
      title: t('indent'),
      label: <Indent size={20} />,
      action: () => {
        if (!editorRef.current) return;
        const start = editorRef.current.selectionStart;
        const end = editorRef.current.selectionEnd;
        const selectedText = useEditorStore.getState().content.substring(start, end);
        const lines = selectedText.split('\n');
        const newText = lines.map(line => '    ' + line).join('\n');
        const newContent = useEditorStore.getState().content.substring(0, start) + newText + useEditorStore.getState().content.substring(end);
        setContent(newContent);
      }
    },
    'Esc': { id: 'Esc', title: t('escapeChar'), label: '\\', action: () => fmt('\\', '') },
    'HR': { id: 'HR', title: t('hr'), label: '—', action: () => insertAtCursor('\n\n---\n\n') },
    'Color': { id: 'Color', title: t('redText'), label: <span className="text-red-500 font-bold text-lg">A</span>, action: () => fmt('<div class="phishy">', '</div>') },
    'Caption': {
      id: 'Caption',
      title: t('captionShort'),
      label: t('captionShort'),
      action: async () => {
        const url = await promptDialog(t('urlPrompt'));
        if (!url) return;
        const cap = await promptDialog(t('caption'), '');
        insertAtCursor(`<center>\n\n| <center>![image](${url})</center> |\n|:---:|\n| <center><sub>${cap || ' ✍️ '}</sub></center> |\n\n</center>\n`);
      }
    },
    'Left': { id: 'Left', title: t('leftText'), label: '⬅', action: () => fmt('<div class="text-left">\n', '\n</div>') },
    'Center': { id: 'Center', title: t('center'), label: t('toolAlignCenterShort'), action: () => fmt('<center>\n', '\n</center>') },
    'Right': { id: 'Right', title: t('rightText'), label: '➡', action: () => fmt('<div class="text-right">\n', '\n</div>') },
    'Justify': { id: 'Justify', title: t('justify'), label: t('toolAlignJustifyShort'), action: () => fmt('<div class="text-justify">\n', '\n</div>') },
    'Templates': { id: 'Templates', title: t('templates'), label: <FileText size={20} />, action: () => setActiveModal('templates') },
    'Mentions': {
      id: 'Mentions',
      title: t('mentions'),
      label: <AtSign size={20} />,
      action: async () => {
        const extracted = extractMentions(contentForPublish);
        if (extracted.length === 0) {
          const name = await promptDialog(t('usernameNoAt'));
          if (name) insertAtCursor(`@${name}`);
        } else {
          const name = await promptDialog(`${t('mentionsList')}: ${extracted.join(', ')}\n${t('usernameNoAt')}`);
          if (name) insertAtCursor(`@${name}`);
        }
      }
    },
    'Img': {
      id: 'Img',
      title: t('insertLocalImage'),
      label: <ImageIcon size={20} />,
      action: () => {
        fileInputRef.current?.click();
      }
    },
    'Gallery': {
      id: 'Gallery',
      title: t('miniGallery'),
      label: <Images size={20} />,
      action: () => {
        setIsMiniGalleryOpen(prev => !prev);
      }
    }
  };
}
