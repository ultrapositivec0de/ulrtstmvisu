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
  { id: 'sans', label: 'Inter Sans', family: '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'roboto', label: 'Roboto', family: '"Roboto", "Segoe UI", ui-sans-serif, system-ui, sans-serif' },
  { id: 'open-sans', label: 'Open Sans', family: '"Open Sans", "Segoe UI", ui-sans-serif, sans-serif' },
  { id: 'montserrat', label: 'Montserrat', family: '"Montserrat", ui-sans-serif, system-ui, sans-serif' },
  { id: 'poppins', label: 'Poppins', family: '"Poppins", ui-sans-serif, system-ui, sans-serif' },
  { id: 'lato', label: 'Lato', family: '"Lato", ui-sans-serif, system-ui, sans-serif' },
  { id: 'rubik', label: 'Rubik', family: '"Rubik", ui-sans-serif, system-ui, sans-serif' },
  { id: 'ubuntu', label: 'Ubuntu', family: '"Ubuntu", "Segoe UI", ui-sans-serif, sans-serif' },
  { id: 'kanit', label: 'Kanit', family: '"Kanit", ui-sans-serif, system-ui, sans-serif' },
  { id: 'work-sans', label: 'Work Sans', family: '"Work Sans", ui-sans-serif, system-ui, sans-serif' },
  { id: 'serif', label: 'Merriweather', family: '"Merriweather", Georgia, Cambria, "Times New Roman", Times, serif' },
  { id: 'lora', label: 'Lora', family: '"Lora", Georgia, Cambria, "Times New Roman", Times, serif' },
  { id: 'playfair', label: 'Playfair', family: '"Playfair Display", Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'JetBrains Mono', family: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { id: 'fira', label: 'Fira Code', family: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { id: 'source-code', label: 'Source Code Pro', family: '"Source Code Pro", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { id: 'outfit', label: 'Outfit', family: '"Outfit", ui-sans-serif, system-ui, sans-serif' },
  { id: 'grotesk', label: 'Space Grotesk', family: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif' },
  { id: 'comfortaa', label: 'Comfortaa', family: '"Comfortaa", "Comic Sans MS", cursive, sans-serif' },
  { id: 'oswald', label: 'Oswald', family: '"Oswald", "Arial Narrow", ui-sans-serif, sans-serif' },
  { id: 'raleway', label: 'Raleway', family: '"Raleway", ui-sans-serif, system-ui, sans-serif' },
];

export type UiScalePreset = 'compact' | 'normal' | 'large' | 'touch' | 'custom';

export interface UiScaleConfig {
  headerIconSize: number;
  headerHeight: number;
  galleryIconSize: number;
  toolbarIconSize: number;
}

export const UI_SCALE_PRESETS: Record<Exclude<UiScalePreset, 'custom'>, UiScaleConfig> = {
  compact: {
    headerIconSize: 16,
    headerHeight: 50,
    galleryIconSize: 14,
    toolbarIconSize: 16,
  },
  normal: {
    headerIconSize: 18,
    headerHeight: 56,
    galleryIconSize: 16,
    toolbarIconSize: 20,
  },
  large: {
    headerIconSize: 20,
    headerHeight: 62,
    galleryIconSize: 18,
    toolbarIconSize: 24,
  },
  touch: {
    headerIconSize: 22,
    headerHeight: 68,
    galleryIconSize: 20,
    toolbarIconSize: 26,
  },
};

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

  // UI Scale & Sizing states
  const [uiScalePreset, setUiScalePreset] = useState<UiScalePreset>(() => {
    const saved = localStorage.getItem('steem_ui_scale_preset') as UiScalePreset | null;
    if (saved && (saved in UI_SCALE_PRESETS || saved === 'custom')) {
      return saved;
    }
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);
    return isMobile ? 'touch' : 'normal';
  });

  const [headerIconSize, setHeaderIconSize] = useState<number>(() => {
    const saved = localStorage.getItem('steem_ui_header_icon_size');
    if (saved) return parseInt(saved, 10);
    const preset = (localStorage.getItem('steem_ui_scale_preset') as UiScalePreset) || (typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches) ? 'touch' : 'normal');
    return (preset in UI_SCALE_PRESETS ? UI_SCALE_PRESETS[preset as keyof typeof UI_SCALE_PRESETS].headerIconSize : 18);
  });

  const [headerHeightAuto, setHeaderHeightAuto] = useState<boolean>(() => {
    const saved = localStorage.getItem('steem_ui_header_height_auto');
    return saved !== null ? saved === 'true' : true;
  });

  const [headerHeight, setHeaderHeight] = useState<number>(() => {
    const saved = localStorage.getItem('steem_ui_header_height');
    if (saved) return parseInt(saved, 10);
    const preset = (localStorage.getItem('steem_ui_scale_preset') as UiScalePreset) || (typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches) ? 'touch' : 'normal');
    return (preset in UI_SCALE_PRESETS ? UI_SCALE_PRESETS[preset as keyof typeof UI_SCALE_PRESETS].headerHeight : 56);
  });

  const [galleryIconSize, setGalleryIconSize] = useState<number>(() => {
    const saved = localStorage.getItem('steem_ui_gallery_icon_size');
    if (saved) return parseInt(saved, 10);
    const preset = (localStorage.getItem('steem_ui_scale_preset') as UiScalePreset) || (typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches) ? 'touch' : 'normal');
    return (preset in UI_SCALE_PRESETS ? UI_SCALE_PRESETS[preset as keyof typeof UI_SCALE_PRESETS].galleryIconSize : 16);
  });

  const [toolbarIconSize, setToolbarIconSize] = useState<number>(() => {
    const saved = localStorage.getItem('steem_toolbar_icon_size');
    return saved ? parseInt(saved, 10) : 20;
  });

  const applyUiScalePreset = (preset: UiScalePreset) => {
    setUiScalePreset(preset);
    localStorage.setItem('steem_ui_scale_preset', preset);
    if (preset !== 'custom') {
      const config = UI_SCALE_PRESETS[preset];
      setHeaderIconSize(config.headerIconSize);
      setHeaderHeight(config.headerHeight);
      setGalleryIconSize(config.galleryIconSize);
      setToolbarIconSize(config.toolbarIconSize);
    }
  };

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
    localStorage.setItem('steem_ui_scale_preset', uiScalePreset);
  }, [uiScalePreset]);

  useEffect(() => {
    localStorage.setItem('steem_ui_header_icon_size', String(headerIconSize));
  }, [headerIconSize]);

  useEffect(() => {
    localStorage.setItem('steem_ui_header_height', String(headerHeight));
  }, [headerHeight]);

  useEffect(() => {
    localStorage.setItem('steem_ui_header_height_auto', String(headerHeightAuto));
  }, [headerHeightAuto]);

  useEffect(() => {
    localStorage.setItem('steem_ui_gallery_icon_size', String(galleryIconSize));
  }, [galleryIconSize]);

  useEffect(() => {
    localStorage.setItem('steem_toolbar_icon_size', String(toolbarIconSize));
  }, [toolbarIconSize]);

  useEffect(() => {
    localStorage.setItem('steem_wysiwyg_spacing', String(wysiwygSpacing));
  }, [wysiwygSpacing]);

  // Update CSS variables for theme color, font, font size, toolbar sizing, UI scaling, and WYSIWYG spacing
  useEffect(() => {
    const theme = activeAssortment.find(t => t.name === themeColor) || activeAssortment[0];
    document.documentElement.style.setProperty('--accent-color', theme.rgb);
    document.documentElement.style.setProperty('--accent-hex', theme.hex);
    
    const font = fontOptions.find(f => f.id === editorFont) || fontOptions[0];
    document.documentElement.style.setProperty('--font-editor', font.family);
    document.documentElement.style.setProperty('--editor-font-size', `${editorFontSize}px`);

    // UI Scale tokens
    const computedHeaderHeight = headerHeightAuto 
      ? Math.max(48, headerIconSize + 36)
      : headerHeight;
    const computedHeaderBtnSize = Math.max(32, headerIconSize + 14);

    document.documentElement.style.setProperty('--header-icon-size', `${headerIconSize}px`);
    document.documentElement.style.setProperty('--header-btn-size', `${computedHeaderBtnSize}px`);
    document.documentElement.style.setProperty('--header-height', `${computedHeaderHeight}px`);
    document.documentElement.style.setProperty('--gallery-icon-size', `${galleryIconSize}px`);

    document.documentElement.style.setProperty('--toolbar-icon-size', `${toolbarIconSize}px`);
    document.documentElement.style.setProperty('--toolbar-btn-size', `${toolbarIconSize + 16}px`);
    document.documentElement.style.setProperty('--toolbar-btn-font-size', `${Math.round(toolbarIconSize * 0.85)}px`);
    document.documentElement.style.setProperty('--wysiwyg-spacing', `${wysiwygSpacing}px`);
  }, [
    themeColor, 
    activeAssortment, 
    editorFont, 
    fontOptions, 
    editorFontSize, 
    toolbarIconSize, 
    wysiwygSpacing,
    headerIconSize,
    headerHeight,
    headerHeightAuto,
    galleryIconSize
  ]);

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
    // UI Scaling
    uiScalePreset,
    setUiScalePreset,
    applyUiScalePreset,
    headerIconSize,
    setHeaderIconSize,
    headerHeight,
    setHeaderHeight,
    headerHeightAuto,
    setHeaderHeightAuto,
    galleryIconSize,
    setGalleryIconSize,
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
