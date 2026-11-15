import { useState, useRef, useCallback, useEffect } from 'react';

export const STORAGE_KEY_FLOAT_CONFIG = 'steem_float_config';
export const DEFAULT_FLOAT_TOOLS = ['B', 'I', 'sub', 'sup', 'Img', 'Gallery', 'Caption', 'Mentions', 'Table', 'Separator', 'HR'];

interface UseFloatingWidgetStateProps {
  isKeyboardOpen?: boolean;
  isWidgetMenuOpen?: boolean;
}

export function useFloatingWidgetState({
  isKeyboardOpen = false,
  isWidgetMenuOpen = false,
}: UseFloatingWidgetStateProps = {}) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const lastKeyboardToggleTimeRef = useRef<number>(0);

  const [widgetPos, setWidgetPos] = useState<'floating' | 'bottom' | 'hidden'>(() => {
    if (typeof localStorage === 'undefined') return 'bottom';
    const saved = localStorage.getItem('steem_widget_pos');
    if (saved === 'bottom' || saved === 'hidden' || saved === 'floating') return saved;
    return 'bottom';
  });

  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null);

  const [widgetOpacity, setWidgetOpacity] = useState(() => {
    if (typeof localStorage === 'undefined') return 1.0;
    const saved = localStorage.getItem('widget_opacity');
    return saved !== null ? Number(saved) : 1.0;
  });

  const [widgetNoBorder, setWidgetNoBorder] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    const saved = localStorage.getItem('widget_no_border');
    return saved === null ? true : saved === 'true';
  });

  const [enabledTools, setEnabledTools] = useState<string[]>(() => {
    if (typeof localStorage === 'undefined') return DEFAULT_FLOAT_TOOLS;
    const saved = localStorage.getItem(STORAGE_KEY_FLOAT_CONFIG);
    try {
      const initial = saved ? JSON.parse(saved) : DEFAULT_FLOAT_TOOLS;
      const filtered = (Array.isArray(initial) ? Array.from(new Set(initial)) : DEFAULT_FLOAT_TOOLS).filter(
        (tool: any) => tool !== 'Grid',
      );
      return filtered.length > 0 ? filtered : DEFAULT_FLOAT_TOOLS;
    } catch {
      return DEFAULT_FLOAT_TOOLS;
    }
  });

  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');
  const [lockedToolsWidth, setLockedToolsWidth] = useState<number | null>(null);

  useEffect(() => {
    lastKeyboardToggleTimeRef.current = Date.now();
  }, [isKeyboardOpen]);

  useEffect(() => {
    if (isWidgetMenuOpen && widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setMenuDirection(rect.top < 350 ? 'down' : 'up');
    }
  }, [isWidgetMenuOpen]);

  const showWidget = useCallback(
    (x: number, y: number) => {
      if (widgetPos === 'hidden') return;
      if (widgetPos !== 'floating') {
        if (!isWidgetVisible) setIsWidgetVisible(true);
        return;
      }
      setFloatingPos({ x, y });
      if (!isWidgetVisible) setIsWidgetVisible(true);
    },
    [widgetPos, isWidgetVisible],
  );

  const handleWidgetAction = useCallback((actionFn: (e?: React.MouseEvent) => void, e?: React.MouseEvent) => {
    if (Date.now() - lastKeyboardToggleTimeRef.current < 250) {
      return;
    }
    actionFn(e);
  }, []);

  const toggleTool = useCallback(
    (key: string) => {
      setEnabledTools(prev => {
        const newTools = prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key];
        try {
          localStorage.setItem(STORAGE_KEY_FLOAT_CONFIG, JSON.stringify(newTools));
        } catch (e) {
          console.debug(e);
        }
        return newTools;
      });
    },
    [],
  );

  const moveTool = useCallback(
    (key: string, dir: 'up' | 'down') => {
      setEnabledTools(prev => {
        const idx = prev.indexOf(key);
        if (idx === -1) return prev;
        const newTools = [...prev];
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newTools.length) return prev;
        [newTools[idx], newTools[targetIdx]] = [newTools[targetIdx], newTools[idx]];
        try {
          localStorage.setItem(STORAGE_KEY_FLOAT_CONFIG, JSON.stringify(newTools));
        } catch (e) {
          console.debug(e);
        }
        return newTools;
      });
    },
    [],
  );

  return {
    widgetRef,
    widgetPos,
    setWidgetPos,
    isWidgetVisible,
    setIsWidgetVisible,
    floatingPos,
    setFloatingPos,
    widgetOpacity,
    setWidgetOpacity,
    widgetNoBorder,
    setWidgetNoBorder,
    enabledTools,
    setEnabledTools,
    menuDirection,
    setMenuDirection,
    lockedToolsWidth,
    setLockedToolsWidth,
    showWidget,
    handleWidgetAction,
    toggleTool,
    moveTool,
  };
}
