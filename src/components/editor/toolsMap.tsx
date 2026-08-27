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
}: CreateToolsMapProps): Record<string, { label: string | React.ReactNode; action: (e?: React.MouseEvent) => void }> {
  return {
    'B': { label: 'B', action: () => fmt('**') },
    'I': { label: 'I', action: () => fmt('*') },
    'S': { label: '~~', action: () => fmt('~~') },
    'sub': { label: 'sub', action: () => fmt('<sub>', '</sub>') },
    'sup': { label: 'sup', action: () => fmt('<sup>', '</sup>') },
    'H1': { label: 'H1', action: () => fmtLine('# ') },
    'H2': { label: 'H2', action: () => fmtLine('## ') },
    'H3': { label: 'H3', action: () => fmtLine('### ') },
    'Link': { label: <LinkIcon size={20} />, action: handleLink },
    'Quote': { label: <Quote size={20} />, action: () => fmtLine('> ') },
    'List': { label: '•', action: () => fmtLine('- ') },
    'Num': { label: '1.', action: () => fmtLine('1. ') },
    'Task': { label: '☑', action: () => fmtLine('- [ ] ') },
    'Table': {
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
    'Separator': { label: <SplitSquareHorizontal size={20} />, action: () => insertAtCursor('| Head |\n| --- |\n', 'end') },
    'Import': { label: <TableIcon size={20} />, action: () => importTable() },
    'Code': { label: <Code size={20} />, action: () => fmt('```\n', '\n```') },
    'Inline': { label: <Terminal size={20} />, action: () => fmt('`') },
    'Indent': {
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
    'Esc': { label: '\\', action: () => fmt('\\', '') },
    'HR': { label: '—', action: () => insertAtCursor('\n\n---\n\n') },
    'Color': { label: <span className="text-red-500 font-bold text-lg">A</span>, action: () => fmt('<div class="phishy">', '</div>') },
    'Caption': {
      label: t('captionShort'),
      action: async () => {
        const url = await promptDialog(t('urlPrompt'));
        if (!url) return;
        const cap = await promptDialog(t('caption'), '');
        insertAtCursor(`<center>\n\n| <center>![image](${url})</center> |\n|:---:|\n| <center><sub>${cap || ' ✍️ '}</sub></center> |\n\n</center>\n`);
      }
    },
    'Left': { label: '⬅', action: () => fmt('<div class="text-left">\n', '\n</div>') },
    'Center': { label: 'Центр', action: () => fmt('<center>\n', '\n</center>') },
    'Right': { label: '➡', action: () => fmt('<div class="text-right">\n', '\n</div>') },
    'Justify': { label: 'Вирів', action: () => fmt('<div class="text-justify">\n', '\n</div>') },
    'Grid': {
      label: 'Сітка',
      action: () => insertAtCursor(`<div class="pull-left">\n${t('leftContent')}\n</div>\n<div class="pull-right">\n${t('rightContent')}\n</div>\n<div class="clearfix"></div>\n`)
    },
    'Templates': { label: <FileText size={20} />, action: () => setActiveModal('templates') },
    'Mentions': {
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
      label: <ImageIcon size={20} />,
      action: () => {
        fileInputRef.current?.click();
      }
    },
    'Gallery': {
      label: <Images size={20} />,
      action: () => {
        setIsMiniGalleryOpen(prev => !prev);
      }
    }
  };
}
