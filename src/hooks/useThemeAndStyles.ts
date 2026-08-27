import { useState, useMemo, useEffect } from 'react';

export interface ThemeOption {
  name: string;
  rgb: string;
  hex: string;
}

export interface FontOption {
  id: string;
  label: string;
  family: string;
}

export const THEME_ASSORTMENT: ThemeOption[] = [
  { name: 'cyan', rgb: '6 182 212', hex: '#06b6d4' },
  { name: 'blue', rgb: '59 130 246', hex: '#3b82f6' },
  { name: 'indigo', rgb: '99 102 241', hex: '#6366f1' },
  { name: 'violet', rgb: '139 92 246', hex: '#8b5cf6' },
  { name: 'purple', rgb: '168 85 247', hex: '#a855f7' },
  { name: 'pink', rgb: '236 72 153', hex: '#ec4899' },
  { name: 'rose', rgb: '244 63 94', hex: '#f43f5e' },
  { name: 'red', rgb: '239 68 68', hex: '#ef4444' },
  { name: 'orange', rgb: '249 115 22', hex: '#f97316' },
  { name: 'amber', rgb: '245 158 11', hex: '#f59e0b' },
  { name: 'yellow', rgb: '234 179 8', hex: '#eab308' },
  { name: 'lime', rgb: '132 204 22', hex: '#84cc16' },
  { name: 'emerald', rgb: '16 185 129', hex: '#10b981' },
  { name: 'teal', rgb: '20 184 166', hex: '#14b8a6' },
];

export const NEON_ASSORTMENT: ThemeOption[] = [
  { name: 'cyan-cyber', rgb: '0 255 255', hex: '#00ffff' },
  { name: 'magenta-cyber', rgb: '255 0 255', hex: '#ff00ff' },
  { name: 'electric-blue', rgb: '112 0 255', hex: '#7000ff' },
  { name: 'neon-green', rgb: '57 255 20', hex: '#39ff14' },
  { name: 'neon-yellow', rgb: '255 255 0', hex: '#ffff00' },
  { name: 'neon-orange', rgb: '255 110 0', hex: '#ff6e00' },
  { name: 'neon-red', rgb: '255 49 49', hex: '#ff3131' },
  { name: 'hot-pink', rgb: '255 105 180', hex: '#ff69b4' },
];

export const FONT_OPTIONS: FontOption[] = [
  { id: 'sans', label: 'Inter Sans', family: '"Inter", sans-serif' },
  { id: 'roboto', label: 'Roboto', family: '"Roboto", sans-serif' },
  { id: 'open-sans', label: 'Open Sans', family: '"Open Sans", sans-serif' },
  { id: 'montserrat', label: 'Montserrat', family: '"Montserrat", sans-serif' },
  { id: 'poppins', label: 'Poppins', family: '"Poppins", sans-serif' },
  { id: 'lato', label: 'Lato', family: '"Lato", sans-serif' },
  { id: 'rubik', label: 'Rubik', family: '"Rubik", sans-serif' },
  { id: 'ubuntu', label: 'Ubuntu', family: '"Ubuntu", sans-serif' },
  { id: 'kanit', label: 'Kanit', family: '"Kanit", sans-serif' },
  { id: 'work-sans', label: 'Work Sans', family: '"Work Sans", sans-serif' },
  { id: 'serif', label: 'Merriweather', family: '"Merriweather", serif' },
  { id: 'lora', label: 'Lora', family: '"Lora", serif' },
  { id: 'playfair', label: 'Playfair', family: '"Playfair Display", serif' },
  { id: 'mono', label: 'JetBrains Mono', family: '"JetBrains Mono", monospace' },
  { id: 'fira', label: 'Fira Code', family: '"Fira Code", monospace' },
  { id: 'source-code', label: 'Source Code Pro', family: '"Source Code Pro", monospace' },
  { id: 'outfit', label: 'Outfit', family: '"Outfit", sans-serif' },
  { id: 'grotesk', label: 'Space Grotesk', family: '"Space Grotesk", sans-serif' },
  { id: 'comfortaa', label: 'Comfortaa', family: '"Comfortaa", cursive' },
  { id: 'oswald', label: 'Oswald', family: '"Oswald", sans-serif' },
  { id: 'raleway', label: 'Raleway', family: '"Raleway", sans-serif' },
];

export function useThemeAndStyles() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('steem_dark_mode') !== 'false');
  const [visualStyle, setVisualStyle] = useState<'standard' | 'neon'>(() => (localStorage.getItem('steem_visual_style') as 'standard' | 'neon') || 'standard');
  const [neonTextColored, setNeonTextColored] = useState(() => localStorage.getItem('steem_neon_text_colored') !== 'false');

  const [themeColor, setThemeColor] = useState<string>(localStorage.getItem('steem_theme_color') || 'cyan');
  const [editorFont, setEditorFont] = useState<string>(localStorage.getItem('steem_editor_font') || 'sans');
  const [editorFontSize, setEditorFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('steem_editor_font_size');
    return saved ? parseInt(saved, 10) : 16;
  });
  const [toolbarIconSize, setToolbarIconSize] = useState<number>(() => {
    const saved = localStorage.getItem('steem_toolbar_icon_size');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [wysiwygSpacing, setWysiwygSpacing] = useState<number>(() => {
    const saved = localStorage.getItem('steem_wysiwyg_spacing');
    return saved ? parseInt(saved, 10) : 6;
  });
  const [isSpacingMenuOpen, setIsSpacingMenuOpen] = useState(false);

  const themeAssortment = useMemo(() => THEME_ASSORTMENT, []);
  const neonAssortment = useMemo(() => NEON_ASSORTMENT, []);
  const fontOptions = useMemo(() => FONT_OPTIONS, []);

  const activeAssortment = useMemo(() => {
    return visualStyle === 'neon' ? neonAssortment : themeAssortment;
  }, [visualStyle, neonAssortment, themeAssortment]);

  // Persist states to localStorage
  useEffect(() => {
    localStorage.setItem('steem_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('steem_visual_style', visualStyle);
  }, [visualStyle]);

  useEffect(() => {
    localStorage.setItem('steem_neon_text_colored', String(neonTextColored));
  }, [neonTextColored]);

  useEffect(() => {
    localStorage.setItem('steem_theme_color', themeColor);
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem('steem_editor_font', editorFont);
  }, [editorFont]);

  useEffect(() => {
    localStorage.setItem('steem_editor_font_size', String(editorFontSize));
  }, [editorFontSize]);

  useEffect(() => {
    localStorage.setItem('steem_toolbar_icon_size', String(toolbarIconSize));
  }, [toolbarIconSize]);

  useEffect(() => {
    localStorage.setItem('steem_wysiwyg_spacing', String(wysiwygSpacing));
  }, [wysiwygSpacing]);

  // Update CSS variables for theme color, font, font size, toolbar sizing, and WYSIWYG spacing
  useEffect(() => {
    const theme = activeAssortment.find(t => t.name === themeColor) || activeAssortment[0];
    document.documentElement.style.setProperty('--accent-color', theme.rgb);
    document.documentElement.style.setProperty('--accent-hex', theme.hex);
    
    const font = fontOptions.find(f => f.id === editorFont) || fontOptions[0];
    document.documentElement.style.setProperty('--font-editor', font.family);
    document.documentElement.style.setProperty('--editor-font-size', `${editorFontSize}px`);

    document.documentElement.style.setProperty('--toolbar-icon-size', `${toolbarIconSize}px`);
    document.documentElement.style.setProperty('--toolbar-btn-size', `${toolbarIconSize + 16}px`);
    document.documentElement.style.setProperty('--toolbar-btn-font-size', `${Math.round(toolbarIconSize * 0.85)}px`);
    document.documentElement.style.setProperty('--wysiwyg-spacing', `${wysiwygSpacing}px`);
  }, [themeColor, activeAssortment, editorFont, fontOptions, editorFontSize, toolbarIconSize, wysiwygSpacing]);

  return {
    isDarkMode,
    setIsDarkMode,
    visualStyle,
    setVisualStyle,
    neonTextColored,
    setNeonTextColored,
    themeColor,
    setThemeColor,
    editorFont,
    setEditorFont,
    editorFontSize,
    setEditorFontSize,
    toolbarIconSize,
    setToolbarIconSize,
    wysiwygSpacing,
    setWysiwygSpacing,
    isSpacingMenuOpen,
    setIsSpacingMenuOpen,
    themeAssortment,
    neonAssortment,
    activeAssortment,
    fontOptions,
  };
}
