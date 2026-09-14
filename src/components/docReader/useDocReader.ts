import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DocReaderSettings, DocReaderSource, TOCHeadingItem } from './types';

const DEFAULT_SETTINGS: DocReaderSettings = {
  fontSize: 18,
  lineHeight: 1.75,
  theme: 'dark',
  width: 'medium',
  font: 'sans',
  showTOC: false,
  showProgress: true,
  autoHideToolbar: false
};

const STORAGE_SETTINGS_KEY = 'steem_doc_reader_settings';

interface UseDocReaderProps {
  currentEditorContent: string;
  currentEditorTitle: string;
  currentEditorTags?: string;
  drafts?: any[];
  onLoadIntoEditor?: (title: string, tags: string, content: string) => void;
  onSwitchToEditMode?: (mode?: 'visual' | 'markdown') => void;
}

export function useDocReader({
  currentEditorContent,
  currentEditorTitle,
  currentEditorTags = '',
  drafts = [],
  onLoadIntoEditor,
  onSwitchToEditMode
}: UseDocReaderProps) {
  // 1. Settings state with persistence
  const [settings, setSettings] = useState<DocReaderSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse doc reader settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = useCallback((newSettings: Partial<DocReaderSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save doc reader settings:', e);
      }
      return updated;
    });
  }, []);

  // 2. Active reading source
  const [source, setSource] = useState<DocReaderSource>(() => ({
    title: currentEditorTitle || 'Документ без назви',
    content: currentEditorContent || '',
    tags: currentEditorTags,
    type: 'current'
  }));

  // Sync with current editor content if user is viewing 'current' source
  useEffect(() => {
    if (source.type === 'current') {
      setSource(prev => ({
        ...prev,
        title: currentEditorTitle || 'Документ без назви',
        content: currentEditorContent || '',
        tags: currentEditorTags
      }));
    }
  }, [currentEditorContent, currentEditorTitle, currentEditorTags, source.type]);

  // 3. Select source helpers
  const selectCurrentDocument = useCallback(() => {
    setSource({
      title: currentEditorTitle || 'Документ без назви',
      content: currentEditorContent || '',
      tags: currentEditorTags,
      type: 'current'
    });
  }, [currentEditorContent, currentEditorTitle, currentEditorTags]);

  const selectDraft = useCallback((draft: any) => {
    if (!draft) return;
    setSource({
      id: draft.id,
      title: draft.title || 'Чернетка без назви',
      content: draft.content || '',
      tags: draft.tags || '',
      type: 'draft',
      updatedAt: draft.updatedAt || draft.createdAt
    });
  }, []);

  const selectLocalFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const title = file.name.replace(/\.[^/.]+$/, '');
      setSource({
        title,
        content,
        type: 'file',
        fileName: file.name,
        updatedAt: file.lastModified
      });
    };
    reader.readAsText(file);
  }, []);

  // 4. Extract TOC Headings from source content
  const headings = useMemo<TOCHeadingItem[]>(() => {
    if (!source.content) return [];
    const items: TOCHeadingItem[] = [];
    const lines = source.content.split('\n');

    let headingIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Markdown headings (# Heading)
      const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (mdMatch) {
        const level = mdMatch[1].length;
        const rawText = mdMatch[2].replace(/[#*_`~[\]]/g, '').trim();
        if (rawText) {
          const id = `heading-${headingIdx++}-${rawText.toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '-').slice(0, 30)}`;
          items.push({ id, level, text: rawText, index: i });
        }
        continue;
      }

      // HTML headings (<h1>..<h6>)
      const htmlMatch = line.match(/^<h([1-6])[^>]*>(.*?)<\/h\1>/i);
      if (htmlMatch) {
        const level = parseInt(htmlMatch[1], 10);
        const rawText = htmlMatch[2].replace(/<[^>]+>/g, '').trim();
        if (rawText) {
          const id = `heading-${headingIdx++}-${rawText.toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '-').slice(0, 30)}`;
          items.push({ id, level, text: rawText, index: i });
        }
      }
    }

    return items;
  }, [source.content]);

  // 5. Reading statistics
  const stats = useMemo(() => {
    const rawText = (source.content || '').replace(/<[^>]*>/g, ' ').replace(/[#*_`~[\]]/g, ' ');
    const words = rawText.trim().split(/\s+/).filter(Boolean).length;
    const chars = rawText.length;
    // Average reading speed ~ 200 words/min
    const readTimeMinutes = Math.max(1, Math.ceil(words / 200));

    return {
      words,
      chars,
      readTimeMinutes
    };
  }, [source.content]);

  // 6. Scroll Progress and active heading tracking
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Find active heading in view
    if (headings.length > 0) {
      const headingElements = headings
        .map(h => ({ id: h.id, el: document.getElementById(h.id) }))
        .filter((item): item is { id: string; el: HTMLElement } => item.el !== null);

      let currentActiveId: string | null = null;
      for (const item of headingElements) {
        const rect = item.el.getBoundingClientRect();
        if (rect.top <= 160) {
          currentActiveId = item.id;
        } else {
          break;
        }
      }
      if (currentActiveId) {
        setActiveHeadingId(prev => (prev === currentActiveId ? prev : currentActiveId));
      }
    }
  }, [headings]);

  const scrollToHeading = useCallback((headingId: string) => {
    const el = document.getElementById(headingId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeadingId(headingId);
    }
  }, []);

  // 7. Load into editor and switch to edit mode
  const handleEditCurrentSource = useCallback((targetMode: 'visual' | 'markdown' = 'visual') => {
    if (source.type !== 'current' && onLoadIntoEditor) {
      onLoadIntoEditor(source.title, source.tags || '', source.content);
    }
    if (onSwitchToEditMode) {
      onSwitchToEditMode(targetMode);
    }
  }, [source, onLoadIntoEditor, onSwitchToEditMode]);

  return {
    source,
    settings,
    updateSettings,
    selectCurrentDocument,
    selectDraft,
    selectLocalFile,
    headings,
    stats,
    scrollProgress,
    activeHeadingId,
    scrollContainerRef,
    handleScroll,
    scrollToHeading,
    handleEditCurrentSource,
    drafts
  };
}
