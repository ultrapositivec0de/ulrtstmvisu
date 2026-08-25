import ExifReader from 'exifreader';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Bold, Italic, Strikethrough, 
  Quote, Link as LinkIcon, 
  Table as TableIcon, Minus, AlignCenter, 
  AlignJustify, Image as ImageIcon, Settings, RefreshCw,
  Save, FolderOpen, FileText, AtSign, Rocket, 
  Trash2, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Eye, EyeOff, Edit3, Plus, ShieldCheck, Key,
  Search, List as ListIcon, Lock, LayoutGrid, Maximize2, Minimize2, Calendar, Tags, Shield, Bell, ArrowRight, Clock,
  Code, Terminal, Indent, Layers, CheckCircle, PlusCircle, Check, AlignLeft, AlignRight, Rows, Columns, PanelLeft, PanelRight, PanelLeftClose, PanelLeftOpen, Moon, Sun, FilePlus, Zap, MoveVertical, Info, Globe, FileUp, FileDown, Copy, SplitSquareHorizontal, Type, Download, Sparkles, Images
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
// @ts-ignore
import { Idiomorph } from 'idiomorph';
import { cn } from './lib/utils';
import { getClient, callWithFallback, probeNodes } from './lib/steem';
import { Draft, Template, ImageItem, AuthType, TagGroup, Language, QueueItem, SteemPost, SteemNotification } from './types';
import { Buffer } from 'buffer';
import { SecurityService } from './services/securityService';
import { PexelsService, PexelsPhoto } from './services/pexelsService';
import { CodeEditor } from './components/CodeEditor';
import { useEditorStore, getOffsetFromRowCol, getRowColFromOffset } from './store';
import ImageItemComp from './components/ImageItem';
import ExternalImageItem from './components/ExternalImageItem';
import Reader from './components/Reader';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { htmlToMarkdown, convertBareImageUrlsToMarkdown, isImageAndProxyUrl } from './lib/editorSync';
import { useEditorWorker } from './hooks/useEditorWorker';
import { useVisualViewport } from './hooks/useVisualViewport';
import { translations, AVAILABLE_LANGUAGES, getTranslation, type TranslationKey } from './locales';
import { COMMUNITIES, COMMON_TAGS } from './data/communities';

// Detect native environment (Tauri / Android Wrapper)
// const IS_NATIVE = typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).AndroidBridge || navigator.userAgent.includes('SteemEditorNative'));

// Ensure Buffer is available globally for some libraries
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

const DOM_PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'hr', 'br', 'span', 'strike', 'sup', 'sub', 'center'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'className', 'style', 'title', 'target', 'rel', 'referrerpolicy'],
  ADD_CLASSES: {
    div: ['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center', 'clearfix', 'phishy', 'text-blue', 'text-green'],
    p: ['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center', 'clearfix', 'phishy', 'text-blue', 'text-green'],
    span: ['phishy', 'text-blue', 'text-green'],
    img: ['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center']
  }
};

// Access libraries
const getMarked = () => {
  // In modern marked (v4+), we should use marked.use()
  if (marked && (marked as any).use) {
    (marked as any).use({
      breaks: true,
      gfm: true,
      mangle: false,
      headerIds: false
    });
  } else if (marked && (marked as any).setOptions) {
    (marked as any).setOptions({
      breaks: true,
      gfm: true
    });
  }

  return {
    parse: async (text: string) => {
      if (!marked || !marked.parse) return text;
      try {
        // Normalize line endings
        let normalizedText = text.replace(/\r\n/g, '\n');

        // Prevent non-table text from being merged into preceding tables
        const strictTableLines = [];
        const lines = normalizedText.split('\n');
        let inTable = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const isSeparator = /^[\s|:-]+$/.test(line) && line.includes('-') && line.includes('|');
          
          if (isSeparator && i > 0 && lines[i-1].includes('|')) {
            inTable = true;
            strictTableLines.push(line);
            continue;
          }
          
          if (inTable) {
            if (line.trim() === '') {
              inTable = false;
            } else if (!line.includes('|')) {
              strictTableLines.push('');
              inTable = false;
            }
          }
          
          strictTableLines.push(line);
        }
        normalizedText = strictTableLines.join('\n');

        // Preserve consecutive blank lines (3 or more newlines) outside of code blocks
        normalizedText = normalizedText.replace(/(```[\s\S]*?```|`[^`\n]*`)|(\n{3,})/g, (match, code, newlines) => {
          if (code) return code;
          const count = newlines.length - 2;
          return '\n\n' + Array(count).fill('<br>').join('') + '\n\n';
        });

        // Prevent distinct list blocks separated by blank lines from merging into a single list; generate a real break/paragraph so cursor can be placed between them
        let prevLists = '';
        while (prevLists !== normalizedText) {
          prevLists = normalizedText;
          normalizedText = normalizedText.replace(/(```[\s\S]*?```|`[^`\n]*`)|(^|\n)([\t ]*(?:[-*+]|\d+\.)[^\n]+)(\n\s*\n)([\t ]*(?:[-*+]|\d+\.)[^\n]+)/g, (match, code, pre, item1, newlines, item2) => {
            if (code) return code;
            return `${pre || ''}${item1}\n\n<br>\n\n${item2}`;
          });
        }

        // Prevent distinct tables separated by blank lines from sticking together; generate a real break/paragraph so cursor can be placed between them
        let prevTables = '';
        while (prevTables !== normalizedText) {
          prevTables = normalizedText;
          normalizedText = normalizedText.replace(/(```[\s\S]*?```|`[^`\n]*`)|(\|[^\n]+\|)(\n\s*\n)(\|[^\n]+\|)/g, (match, code, row1, newlines, row2) => {
            if (code) return code;
            return `${row1}\n\n<br>\n\n${row2}`;
          });
        }

        let textWithImageMarkdown = convertBareImageUrlsToMarkdown(normalizedText);
        
        // Preprocess to convert markdown images inside pull-left/pull-right divs or center tags to <img> tags
        textWithImageMarkdown = textWithImageMarkdown.replace(/(<div[^>]*class="[^"]*pull-(?:left|right)[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/gi, (m, open, htmlContent, close) => {
          const processedContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
          return open + processedContent + close;
        });
        textWithImageMarkdown = textWithImageMarkdown.replace(/(<div[^>]*class='[^']*pull-(?:left|right)[^']*'[^>]*>)([\s\S]*?)(<\/div>)/gi, (m, open, htmlContent, close) => {
          const processedContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
          return open + processedContent + close;
        });
        textWithImageMarkdown = textWithImageMarkdown.replace(/(<center[^>]*>)([\s\S]*?)(<\/center>)/gi, (m, open, htmlContent, close) => {
          const processedContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
          return open + processedContent + close;
        });

        // marked.parse can be sync or async
        let html = await marked.parse(textWithImageMarkdown);
        
        // Map image titles representing alignment classes to actual class attributes
        html = html.replace(/<img([^>]*)title="([^"]+)"([^>]*)/gi, (m, p1, title, p2) => {
          if (['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center'].includes(title)) {
            const hasClass = p1.includes('class="') || p2.includes('class="');
            if (hasClass) {
              return m;
            } else {
              return `<img${p1}class="${title}" title="${title}"${p2}`;
            }
          }
          return m;
        });

        if (DOMPurify) {
          return DOMPurify.sanitize(html, DOM_PURIFY_CONFIG as any) as unknown as string;
        }
        return html;
      } catch (e) {
        console.error('Markdown parse error:', e);
        return text;
      }
    }
  };
};
// --- Constants ---
const STORAGE_KEY_DRAFTS = 'steem_drafts_v2';
const STORAGE_KEY_TEMPLATES = 'steem_templates_v2';
const STORAGE_KEY_USERS = 'steem_users_v2';
const STORAGE_KEY_AUTOSAVE = 'steem_autosave_temp';
const STORAGE_KEY_FLOAT_CONFIG = 'steem_float_config';
const STORAGE_KEY_IMAGES = 'steem_uploaded_images_v2';
const STORAGE_KEY_QUEUE = 'steem_queue_v2';

const DEFAULT_FLOAT_TOOLS = ['B', 'I', 'sub', 'sup', 'Img', 'Gallery', 'Caption', 'Mentions', 'Table', 'Separator', 'Grid', 'HR'];

// --- Components ---

const IconButton = ({ 
  icon: Icon, 
  onClick, 
  title, 
  className, 
  active = false 
}: { 
  icon: any, 
  onClick: (e?: React.MouseEvent | any) => void, 
  title?: string, 
  className?: string,
  active?: boolean
}) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault()}
    title={title}
    className={cn(
      "p-2 rounded-md transition-all duration-200 flex items-center justify-center shrink-0",
      "hover:bg-slate-700/50 active:scale-95",
      active ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400",
      className
    )}
  >
    <Icon className="w-[clamp(1rem,1.1vw,1.25rem)] h-[clamp(1rem,1.1vw,1.25rem)]" />
  </button>
);

const APP_CHANGELOG = [
  {
    version: "v4.6.8",
    date: "2026-08-25",
    changes: [
      "Android & Mobile Viewport Precision: Enhanced caret positioning and scroll boundary calculation to ensure text and caret always stay clearly visible above the floating toolbar widget.",
      "Dynamic Widget Sizing Support: Implemented dynamic bottom offset calculations adjusting automatically to customizable toolbar icon sizes, virtual keyboard states, and safe area insets.",
      "Editor Scroll & Padding: Optimized bottom padding across Markdown and WYSIWYG editors for seamless scrolling on mobile and Android app packaging.",
      "Visual Editor Guide Placeholders: Added multilingual informative placeholders for the visual editor (title on first line auto-detection & main body content guidance).",
      "Build & Packaging Enhancements: Updated allowScripts security policy format and enhanced web release archive naming with dynamic semver tagging.",
      "Cross-Platform Release Sync: Synchronized application version to v4.6.8 across Web, Tauri, Neutralino, and Steem blockchain broadcasting metadata."
    ]
  },
  {
    version: "v4.6.6",
    date: "2026-08-24",
    changes: [
      "Cross-platform release synchronization and system improvements."
    ]
  },
  {
    version: "v4.6.4",
    date: "2026-08-22",
    changes: [
      "PWA Installation Guidance: Added floating promotion banner with direct installation triggers and step-by-step PWA setup instructions for iOS, Android, and Desktop.",
      "Native Desktop & Neutralino Safeguards: Implemented safe fullscreen guards for Neutralino.js and Tauri desktop runtimes, preventing HTML5 event conflicts.",
      "Cross-Platform Release Sync: Synchronized application version to v4.6.4 across Web, Tauri, Neutralino, and Steem blockchain broadcasting metadata."
    ]
  },
  {
    version: "v4.6.1",
    date: "2026-08-22",
    changes: [
      "Production Cursor Sync & Tag Stability: Hardened markdown-to-visual cursor restoration across production builds and WebViews. Optimized zero-width sentinel tracking and positional distance scoring to seamlessly handle unclosed formatting tags (**1**, **2**) amidst repetitive blocks.",
      "Android Viewport & Toolbar Clearance: Expanded bottom scrolling padding in mobile visual and code modes to ensure continuous typing visibility above the floating widget.",
      "Cross-Platform Release Sync: Synchronized application version to v4.6.1 across Web, Tauri, Neutralino, and Steem blockchain broadcasting metadata."
    ]
  },
  {
    version: "v4.6.0",
    date: "2026-08-20",
    changes: [
      "Bidirectional Cursor & Spacing Sync: Fixed formatting block positioning with accurate multi-line offset calculations so cursor doesn't jump to the top line in styled blocks (**1**, **2**, **3**).",
      "Empty Line Preservation: Eliminated geometric line multiplication when switching between Visual and Markdown modes with cursor on empty lines.",
      "Tauri & Neutralino Desktop Release Sync: Synchronized desktop application manifests and configuration files to v4.6.0."
    ]
  },
  {
    version: "v4.5.9",
    date: "2026-08-20",
    changes: [
      "Mobile Formatting Bar Alignment: Fixed mobile formatting widget position on Android devices to stay firmly visible and accessible above the virtual keyboard and bottom navigation bar without hiding during active typing.",
      "Viewport & Keyboard Offset Optimization: Enhanced visual editor scroll management and responsive keyboard offset handling in fullscreen and standard modes.",
      "Editor Bottom Padding Expansion: Expanded bottom margin during typing to ensure smooth scrolling and avoid content occlusion behind the floating toolbar.",
      "Workspace Organization: Moved temporary scripts, patches, and diagnostic tools to the dedicated ./fix_test_patcn/ directory for root cleanliness."
    ]
  },
  {
    version: "v4.5.8",
    date: "2026-08-14",
    changes: [
      "Vault PIN & Upload Retry Handling: Fixed issue in native environments where canceling or failing PIN authorization froze image uploading. File input references are now automatically cleared and PIN re-attempts are handled seamlessly.",
      "Smart Gallery Account Selection: Automatically selects available Vault accounts for image uploads when Keychain is unavailable, removing unnecessary manual dropdown switches.",
      "Account Selector Visual Refinement: Enhanced account selection dropdowns with clear authentication badges (Vault key vs Keychain) and consistent dark-theme styling.",
      "Store Import Optimization: Refactored and optimized state store imports across modules to eliminate inefficient dependencies and ensure clean module coupling.",
      "Template Refinements: Upgraded and streamlined built-in post templates for enhanced markdown structure and readability.",
      "Immersive Fullscreen Actions: Enhanced full-screen rendering, ensuring all dropdowns, modal dialogs, and widget action menus display correctly and remain fully accessible without clipping.",
      "Neon Theme Text Highlighting: Added custom neon text colorization support in visual mode, paired with a dedicated toolbar toggle to enable or disable it on demand.",
      "Precise Caret & Spacer Management: Refined visual editor cursor placement and block spacer generation (around tables, blockquotes, centers, and iframes) to prevent unexpected jumps and ensure smooth, natural typing.",
      "Babel & Build Stability: Configured Vite React plugin with compact optimizations for high-performance builds across large source files."
    ]
  },
  {
    version: "v4.4.4",
    date: "2026-08-10",
    changes: [
      "Babel Optimization: Configured Vite React plugin to use compact code generation, preventing deoptimization warnings for large files.",
      "Agent String Upgrade: Changed default App Agent string to ultrasteemeditor/4.4.4 for proper version tracking on the Steem blockchain.",
      "Zip Compression Migration: Replaced legacy 'jszip' with ultra-lightweight 'fflate' for much faster and lighter ZIP package operations.",
      "Modern Metadata Extraction: Integrated 'exifreader' (v4.38.1) for secure, client-side extraction of camera and shooting parameters from uploaded images.",
      "Dependencies & Engine Upgrade: Migrated to @blazeapps/dsteem (v0.12.2), upgraded TypeScript to ^7.0.2, and React to version 19.",
      "Cleaned Up Dependencies: Uninstalled legacy/unused packages including dsteem, jszip, postcss, autoprefixer, core-js, bytebuffer, exif-parser, eslint-plugin-react, and babel-plugin-transform-remove-console to minimize bundle size and remove deprecated overhead.",
      "Linter Cleanup: Addressed and removed strict linter override comments in Reader.tsx."
    ]
  },
  {
    version: "v4.3.9",
    date: "2026-08-02",
    changes: [
      "Customizable Font Size: Added a new precise font size control in the toolbar settings dropdown.",
      "Responsive Typography: Connected the selected font size directly to the editor's visual output for instantaneous scaling without page reloads.",
      "UI Refinement: Grouped font size presets alongside a numeric input and range slider for maximal control."
    ]
  },
  {
    version: "v4.3.8",
    date: "2026-07-23",
    changes: [
      "Multi-Threaded Parsing Engine: Integrated Web Workers (useEditorWorker) to offload heavy Markdown-to-HTML and HTML-to-Markdown conversions, preventing UI freezes even with 200k+ lines of text.",
      "Ultra Steem Editor Branding: Successfully rebranded the application to Ultra Steem Editor, reflecting its high-performance professional focus.",
      "Interface Polish: Refined list rendering (ul/li) in the WYSIWYG editor, eliminating unwanted vertical margins and fixing indentation inconsistencies.",
      "Extreme Performance Mode: Enhanced Performance Mode to completely bypass Framer Motion animations and heavy CSS transitions for absolute zero-latency writing.",
      "Repository Optimization: Organized the project root by moving 50+ legacy fix/diagnostic scripts into a structured /tets_and_fix directory.",
      "Large File Stability: Improved document handling in the browser cache and local synchronization layers for maximum reliability."
    ]
  },
  {
    version: "v3.9.9",
    date: "2026-07-18",
    changes: [
      "Gallery Minimization: Added support for collapsing the gallery view to save space.",
      "Dynamic Editor Expansion: Expanded the text input area on the main screen for a more comfortable editing experience.",
      "Developer Branding: Removed specific community/author branding from the application info panel."
    ]
  },
  {
    version: "v3.8.0",
    date: "2026-07-16",
    changes: [
      "Progressive Web App (PWA) Support: Added support for installing Steem Editor Pro directly on devices (Android, iOS, Windows, macOS) for faster startup times and fully offline-capable operations.",
      "Service Worker Caching: Implemented sw.js to automatically manage local caching of HTML, CSS, fonts, and icons, enabling reliable offline startup and content editing.",
      "Unified Install Experience: Added a conditional PWA Install button in the header with a pulsing notification indicator, alongside a dedicated PWA Install tab in the settings modal with detailed platform compatibility instructions."
    ]
  },
  {
    version: "v3.7.3",
    date: "2026-07-15",
    changes: [
      "Direct Layout Popover: Added a high-accessibility inline Spacing and Icon Size controller right next to the sync toggles in the editor header, eliminating the need to dig into the global settings menu.",
      "Perfect Theme Adaptation: Refactored the synchronization headers, status badges, and tabs to completely support dynamic light and dark theme colors, resolving light-theme visual consistency issues.",
      "Intelligent Breakpoint Visibility: Enhanced responsive layout constraints from `sm` to `md` for editor status labels to completely prevent text overlaps and crowded toolbar layouts on medium-sized screens."
    ]
  },
  {
    version: "v3.7.2",
    date: "2026-07-15",
    changes: [
      "Custom Sizing and Spacing Engine: Added user-configurable controls for toolbar icon sizes and WYSIWYG paragraph spacing, with local storage persistence and presets (Compact, Balanced, Normal, Spacious) to minimize visual discrepancy between Code and Visual modes.",
      "Light Theme Compatibility Optimization: Upgraded the synchronization header overlays, status badges, and tabs to dynamically adapt colors in Light and Dark modes, preventing dark-theme-only visual artifacts.",
      "Responsive Layout Overlap Prevention: Improved breakpoints for real-time status indicators and editor pane controls to prevent content squeezing and visual overlap on smaller screens.",
      "Zero-Transparency Floating UI: Eliminated transparency and alpha blending from the primary floating tools widget and its sub-dropdown settings, improving readability and significantly easing browser composting workloads.",
      "No-Blur Performance Layout: Removed backdrop blurs, transition delays, and nested box-shadow effects from main overlays, side menus, and table controls to minimize GPU paint times.",
      "Optimized Solid Containers: Reconfigured the preview panel background and toolbars as completely solid opaque surfaces to optimize sub-pixel layout rendering and eliminate flickering pixels on rapid text input."
    ]
  },
  {
    version: "v3.7.1",
    date: "2026-07-15",
    changes: [
      "State Preservation Across Reloads: Persisted the active editor mode in localStorage, so users who prefer typing in Markdown Code mode stay in that mode upon reloading or returning to the page.",
      "Visual Stale-Flag Protocol: Introduced an intelligent stale-flag (steem_visual_html_is_stale) mechanism that invalidates cached raw HTML whenever the user modifies raw Markdown content in Code mode. This ensures that switching back to Visual mode or refreshing the page correctly translates and loads the fresh edits, completely preventing data loss.",
      "Zustand-Cascading Synchronization: Optimized the reactive state pipeline, ensuring that any asynchronous content changes gracefully cascade through the debounced save engine regardless of the active view pane."
    ]
  },
  {
    version: "v3.7.0",
    date: "2026-07-14",
    changes: [
      "Visual-to-Code Sync Controller: Replaced the complex Settings gear dropdown menu with a single, highly intuitive Real-Time Sync Toggle (RefreshCw icon) on the WYSIWYG toolbar.",
      "Two-Tier Synchronization: Real-Time Sync (Active/Immediate HTML-to-Markdown) and Background Sync (Default/Lag-Free debounced background sync engine on idle or switch) to guarantee maximum writing performance.",
      "O(1) Spacer Optimization: Replaced expensive DOM queries (querySelectorAll) with high-performance O(1) direct relative traversal under the cursor (via .closest() and lastElementChild checks).",
      "CSS Containment Geometry: Added 'contain: layout style' to all block elements in the WYSIWYG editor to isolate element geometry and prevent full-document browser reflows during typing."
    ]
  },
  {
    version: "v3.6.5",
    date: "2026-07-12",
    changes: [
      "Precision Cursor Synchronization: Rewrote scrolling logic when switching from Code to Visual editor by mathematically calculating the exact Y-pixel coordinate of the caret and centering the exact line perfectly.",
      "Accurate Visual-to-Markdown Cursor Restoration: Rebuilt the switching cursor algorithm to calculate exact text wrapping dimensions and restore the exact vertical scroll coordinate, eliminating under-scrolling.",
      "Refined Widget Clearance: Decreased the bottom margin between the editor and the docked widget to 85px, eliminating the excessive blank strip while keeping a clean 13px gap above the floating UI."
    ]
  },
  {
    version: "v3.6.1",
    date: "2026-07-10",
    changes: [
      "GPU Resource Optimization: Refactored heavy CSS effects, including conditional backdrop-blur and transparency, to dynamically disable/simplify on performance-limited modes. This significantly reduces GPU load and enhances responsiveness on lower-end devices.",
      "Fixed: Resolved issue with cursor position saving, ensuring consistent behavior in both directions.",
      "Scroll Optimization: Eliminated scroll jumping in Markdown mode and added a comfortable typing gap above the floating widget."
    ]
  },
  {
    version: "v3.6.0",
    date: "2026-07-05",
    changes: [
      "Active Formatting in Widget: Connected the active format states (Bold, Italic, Strikethrough, Subscript, Superscript, Inline Code, and Color block) to the buttons on the floating widget panel, providing instant visual feedback on active text formatting.",
      "Localized WYSIWYG Spacers: Implemented automatic generation of top and bottom visual placeholders/spacers around complex elements with language-aware guide messages.",
      "Unified Block/Tag Breakout: Refined block container escape mechanism for BLOCKQUOTE, headings, and code blocks.",
      "Smart Space Trimming on Formatting Exit: Added automatic cleanup of inner margins for formatting tags to prevent rendering glitches.",
      "Code Editor Scroll Jumping: Fixed issue where inserting Markdown tables or custom presets would scroll the container back to the top.",
      "Enhanced WYSIWYG Spacer Styling: Polished spacer visual appearance for improved editor clarity."
    ]
  },
  {
    version: "v3.5.0",
    date: "2026-05-24",
    changes: [
      "Universal Markdown Export: Drafts are now exported as a ZIP archive of .md files for better compatibility.",
      "Smart Table Padding: Automatically ensures blank lines around tables to prevent rendering breaks in external readers.",
      "Enhanced Single Export: Individual post downloads now include titles as H1 and tags as metadata.",
      "ZIP Restore Support: Drafts can be restored directly from ZIP archives containing Markdown files.",
      "Cleaner Interface: Removed legacy JSON backup options in favor of universal Markdown standard."
    ]
  },
  {
    version: "v3.3.0",
    date: "2026-05-22",
    changes: [
      "Vote Logging System: Record all curation activities with permlinks and authors.",
      "Export Curation Report: Professional Markdown download for your curation logs.",
      "Fixed React warnings (uncontrolled components) in Editor and Reader.",
      "Enhanced Optimistic UI for vote results in the Curation Feed.",
      "Persistent state for curation logs stored in LocalStorage."
    ]
  },
  {
    version: "v3.2.3",
    date: "2026-05-22",
    changes: [
      "Added publishing option to dynamically remove the first line (title) from the broadcasted post.",
      "Temporarily disabled heavy external font resources to dramatically reduce network load.",
      "Improved Ukrainian Transliterator rules for specific letter combinations and symbols.",
      "Enhanced UI responsiveness in the Feed Reader with a compact layout for mobile and desktop.",
      "Refined regex patterns for Steemit @mention extraction, securely filtering standard URLs.",
      "Introduced an internal application Changelog tracking dashboard."
    ]
  },
  {
    version: "v3.2.0",
    date: "2026-05-20",
    changes: [
      "Deployed fully integrated Feed Reader module for viewing Steem posts.",
      "Enabled on-chain operations: commenting and upvoting directly from the app.",
      "Implemented advanced Tag Groups and Presets system for faster curation."
    ]
  },
  {
    version: "v3.1.0",
    date: "2026-05-18",
    changes: [
      "Introduced Web Crypto (AES-GCM) Secured Vault for Steem private keys.",
      "Added mandatory PIN protection for active session security.",
      "Implemented multi-account switching and secure credential storage via IndexedDB."
    ]
  },
  {
    version: "v3.0.0",
    date: "2026-05-15",
    changes: [
      "Major UI/UX overhaul to the \"Platinum\" dark theme with Tailwind CSS.",
      "Integrated complete Ukrainian language localization alongside English.",
      "Added Floating Widget toolbox for quick formatting access."
    ]
  },
  {
    version: "v2.5.0",
    date: "2026-05-10",
    changes: [
      "Built comprehensive Gallery system with local IndexedDB chunked storage.",
      "Added Markdown templates and persistent auto-saving Drafts engine.",
      "Real-time character, word, and reading-time analytics integration."
    ]
  },
  {
    version: "v1.0.0",
    date: "2026-05-01",
    changes: [
      "Initial release of SteemEditor core with Github Flavored Markdown.",
      "Built-in live preview and basic Steem blockchain broadcast capabilities via dsteem."
    ]
  }
];

const getChangelogText = () => "SteemEditor Pro Updates:\n\n" + APP_CHANGELOG.map(log => 
  `${log.version} (${log.date})\n` + log.changes.map(c => `- ${c}`).join('\n')
).join('\n\n');

interface FormatRange {
  formatKey: 'bold' | 'italic' | 'code' | 'strikethrough' | 'sub' | 'sup' | 'phishy';
  openTag: string;
  closeTag: string;
  openIdx: number;
  closeIdx: number;
  contentStart: number;
  contentEnd: number;
}

function getAllFormatRangesInLine(line: string): FormatRange[] {
  const ranges: FormatRange[] = [];
  if (!line) return ranges;

  // 1. Paired HTML-like tags: <sub>, <sup>, <div class="phishy">, <span class="phishy">
  const htmlPairs: Array<{ formatKey: 'sub' | 'sup' | 'phishy'; openTag: string; closeTag: string }> = [
    { formatKey: 'sub', openTag: '<sub>', closeTag: '</sub>' },
    { formatKey: 'sup', openTag: '<sup>', closeTag: '</sup>' },
    { formatKey: 'phishy', openTag: '<div class="phishy">', closeTag: '</div>' },
    { formatKey: 'phishy', openTag: '<span class="phishy">', closeTag: '</span>' },
  ];

  for (const { formatKey, openTag, closeTag } of htmlPairs) {
    const oLen = openTag.length;
    const cLen = closeTag.length;
    let s = 0;
    while (s < line.length) {
      const oIdx = line.indexOf(openTag, s);
      if (oIdx === -1) break;
      if (oIdx > 0 && line[oIdx - 1] === '\\') {
        s = oIdx + oLen;
        continue;
      }
      const cIdx = line.indexOf(closeTag, oIdx + oLen);
      if (cIdx === -1) break;
      if (cIdx > 0 && line[cIdx - 1] === '\\') {
        s = cIdx + cLen;
        continue;
      }
      ranges.push({
        formatKey,
        openTag,
        closeTag,
        openIdx: oIdx,
        closeIdx: cIdx,
        contentStart: oIdx + oLen,
        contentEnd: cIdx,
      });
      s = cIdx + cLen;
    }
  }

  // 2. Inline code: `...`
  const codeIdxs: number[] = [];
  let cSearch = 0;
  while (cSearch < line.length) {
    const idx = line.indexOf('`', cSearch);
    if (idx === -1) break;
    if (idx === 0 || line[idx - 1] !== '\\') {
      codeIdxs.push(idx);
    }
    cSearch = idx + 1;
  }
  for (let i = 0; i < codeIdxs.length; i += 2) {
    if (i + 1 < codeIdxs.length) {
      ranges.push({
        formatKey: 'code',
        openTag: '`',
        closeTag: '`',
        openIdx: codeIdxs[i],
        closeIdx: codeIdxs[i + 1],
        contentStart: codeIdxs[i] + 1,
        contentEnd: codeIdxs[i + 1],
      });
    }
  }

  // 3. Strikethrough: ~~...~~
  const strikeIdxs: number[] = [];
  let sSearch = 0;
  while (sSearch < line.length) {
    const idx = line.indexOf('~~', sSearch);
    if (idx === -1) break;
    if (idx === 0 || line[idx - 1] !== '\\') {
      strikeIdxs.push(idx);
    }
    sSearch = idx + 2;
  }
  for (let i = 0; i < strikeIdxs.length; i += 2) {
    if (i + 1 < strikeIdxs.length) {
      ranges.push({
        formatKey: 'strikethrough',
        openTag: '~~',
        closeTag: '~~',
        openIdx: strikeIdxs[i],
        closeIdx: strikeIdxs[i + 1],
        contentStart: strikeIdxs[i] + 2,
        contentEnd: strikeIdxs[i + 1],
      });
    }
  }

  // 4. Asterisks: single (*), double (**), triple (***), and empty tags (**, ****, ******)
  const starRuns: Array<{ start: number; end: number; len: number }> = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '*') {
      if (i > 0 && line[i - 1] === '\\') {
        i++;
        continue;
      }
      const rStart = i;
      while (i < line.length && line[i] === '*') {
        i++;
      }
      starRuns.push({ start: rStart, end: i, len: i - rStart });
    } else {
      i++;
    }
  }

  for (const r of starRuns) {
    if (r.len === 6) {
      ranges.push({
        formatKey: 'bold',
        openTag: '***',
        closeTag: '***',
        openIdx: r.start,
        closeIdx: r.start + 3,
        contentStart: r.start + 3,
        contentEnd: r.start + 3,
      });
      ranges.push({
        formatKey: 'italic',
        openTag: '***',
        closeTag: '***',
        openIdx: r.start,
        closeIdx: r.start + 3,
        contentStart: r.start + 3,
        contentEnd: r.start + 3,
      });
    } else if (r.len === 4) {
      ranges.push({
        formatKey: 'bold',
        openTag: '**',
        closeTag: '**',
        openIdx: r.start,
        closeIdx: r.start + 2,
        contentStart: r.start + 2,
        contentEnd: r.start + 2,
      });
    }
  }

  const tripleStars = starRuns.filter(r => r.len === 3);
  for (let k = 0; k < tripleStars.length; k += 2) {
    if (k + 1 < tripleStars.length) {
      ranges.push({
        formatKey: 'bold',
        openTag: '***',
        closeTag: '***',
        openIdx: tripleStars[k].start,
        closeIdx: tripleStars[k + 1].start,
        contentStart: tripleStars[k].start + 3,
        contentEnd: tripleStars[k + 1].start,
      });
      ranges.push({
        formatKey: 'italic',
        openTag: '***',
        closeTag: '***',
        openIdx: tripleStars[k].start,
        closeIdx: tripleStars[k + 1].start,
        contentStart: tripleStars[k].start + 3,
        contentEnd: tripleStars[k + 1].start,
      });
    }
  }

  const doubleStars = starRuns.filter(r => r.len === 2);
  for (let k = 0; k < doubleStars.length; k += 2) {
    if (k + 1 < doubleStars.length) {
      ranges.push({
        formatKey: 'bold',
        openTag: '**',
        closeTag: '**',
        openIdx: doubleStars[k].start,
        closeIdx: doubleStars[k + 1].start,
        contentStart: doubleStars[k].start + 2,
        contentEnd: doubleStars[k + 1].start,
      });
    }
  }

  const singleStars = starRuns.filter(r => r.len === 1);
  for (let k = 0; k < singleStars.length; k += 2) {
    if (k + 1 < singleStars.length) {
      ranges.push({
        formatKey: 'italic',
        openTag: '*',
        closeTag: '*',
        openIdx: singleStars[k].start,
        closeIdx: singleStars[k + 1].start,
        contentStart: singleStars[k].start + 1,
        contentEnd: singleStars[k + 1].start,
      });
    }
  }

  // 5. Underscores: _..._ (italic), __...__ (bold), ___...___ (bold & italic)
  const underRuns: Array<{ start: number; end: number; len: number }> = [];
  let j = 0;
  while (j < line.length) {
    if (line[j] === '_') {
      if (j > 0 && line[j - 1] === '\\') {
        j++;
        continue;
      }
      const rStart = j;
      while (j < line.length && line[j] === '_') {
        j++;
      }
      underRuns.push({ start: rStart, end: j, len: j - rStart });
    } else {
      j++;
    }
  }

  for (const r of underRuns) {
    if (r.len === 6) {
      ranges.push({
        formatKey: 'bold',
        openTag: '___',
        closeTag: '___',
        openIdx: r.start,
        closeIdx: r.start + 3,
        contentStart: r.start + 3,
        contentEnd: r.start + 3,
      });
      ranges.push({
        formatKey: 'italic',
        openTag: '___',
        closeTag: '___',
        openIdx: r.start,
        closeIdx: r.start + 3,
        contentStart: r.start + 3,
        contentEnd: r.start + 3,
      });
    } else if (r.len === 4) {
      ranges.push({
        formatKey: 'bold',
        openTag: '__',
        closeTag: '__',
        openIdx: r.start,
        closeIdx: r.start + 2,
        contentStart: r.start + 2,
        contentEnd: r.start + 2,
      });
    }
  }

  const tripleUnders = underRuns.filter(r => r.len === 3);
  for (let k = 0; k < tripleUnders.length; k += 2) {
    if (k + 1 < tripleUnders.length) {
      ranges.push({
        formatKey: 'bold',
        openTag: '___',
        closeTag: '___',
        openIdx: tripleUnders[k].start,
        closeIdx: tripleUnders[k + 1].start,
        contentStart: tripleUnders[k].start + 3,
        contentEnd: tripleUnders[k + 1].start,
      });
      ranges.push({
        formatKey: 'italic',
        openTag: '___',
        closeTag: '___',
        openIdx: tripleUnders[k].start,
        closeIdx: tripleUnders[k + 1].start,
        contentStart: tripleUnders[k].start + 3,
        contentEnd: tripleUnders[k + 1].start,
      });
    }
  }

  const doubleUnders = underRuns.filter(r => r.len === 2);
  for (let k = 0; k < doubleUnders.length; k += 2) {
    if (k + 1 < doubleUnders.length) {
      ranges.push({
        formatKey: 'bold',
        openTag: '__',
        closeTag: '__',
        openIdx: doubleUnders[k].start,
        closeIdx: doubleUnders[k + 1].start,
        contentStart: doubleUnders[k].start + 2,
        contentEnd: doubleUnders[k + 1].start,
      });
    }
  }

  const singleUnders = underRuns.filter(r => r.len === 1);
  for (let k = 0; k < singleUnders.length; k += 2) {
    if (k + 1 < singleUnders.length) {
      ranges.push({
        formatKey: 'italic',
        openTag: '_',
        closeTag: '_',
        openIdx: singleUnders[k].start,
        closeIdx: singleUnders[k + 1].start,
        contentStart: singleUnders[k].start + 1,
        contentEnd: singleUnders[k + 1].start,
      });
    }
  }

  return ranges;
}

function isInsideTagInLine(line: string, caretPosInLine: number, openTag: string, selEndInLine: number = caretPosInLine): boolean {
  let key: FormatRange['formatKey'] = 'bold';
  if (openTag === '*' || openTag === 'italic' || openTag === '_') key = 'italic';
  else if (openTag === '**' || openTag === 'bold' || openTag === '__') key = 'bold';
  else if (openTag === '`' || openTag === 'code') key = 'code';
  else if (openTag === '~~' || openTag === 'strikethrough') key = 'strikethrough';
  else if (openTag === '<sub>' || openTag === 'sub') key = 'sub';
  else if (openTag === '<sup>' || openTag === 'sup') key = 'sup';
  else if (openTag === '<div class="phishy">' || openTag === 'phishy') key = 'phishy';

  const ranges = getAllFormatRangesInLine(line).filter(r => r.formatKey === key);
  if (caretPosInLine === selEndInLine) {
    return ranges.some(r => caretPosInLine >= r.contentStart && caretPosInLine <= r.contentEnd);
  }
  return ranges.some(r => caretPosInLine >= r.contentStart && selEndInLine <= r.contentEnd);
}

function getActiveFormatRangeInLine(line: string, caretInLine: number): FormatRange | null {
  const ranges = getAllFormatRangesInLine(line);
  const matching = ranges.filter(r => caretInLine >= r.contentStart && caretInLine <= r.contentEnd);
  if (matching.length === 0) return null;
  matching.sort((a, b) => (a.contentEnd - a.contentStart) - (b.contentEnd - b.contentStart));
  return matching[0];
}

// Helper functions for path-based DOM node tracking
function getNodePath(root: Node, target: Node): number[] | null {
  if (root === target) return [];
  for (let i = 0; i < root.childNodes.length; i++) {
    const path = getNodePath(root.childNodes[i], target);
    if (path) return [i, ...path];
  }
  return null;
}

function getNodeByPath(root: Node, path: number[]): Node | null {
  let curr = root;
  for (const idx of path) {
    if (!curr.childNodes || idx >= curr.childNodes.length) return null;
    curr = curr.childNodes[idx];
  }
  return curr;
}

function MobileStatsBar({ visualStyle, isDarkMode, t }: any) {
  const stats = useEditorStore(state => state.stats);
  const cleanStats = useEditorStore(state => state.cleanStats);
  return (
    <div className={cn(
      "lg:hidden flex items-center justify-between px-4 py-2 border-b text-[10px] font-medium uppercase tracking-widest shrink-0 transition-colors",
      visualStyle === 'neon' ? "bg-slate-950 border-slate-800/80 text-slate-400" : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-600")
    )}>
      <div className="flex gap-4 items-center">
        <span>{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span>{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
      </div>
    </div>
  );
}

function DesktopStatsFooter({ t }: any) {
  const stats = useEditorStore(state => state.stats);
  const cleanStats = useEditorStore(state => state.cleanStats);
  return (
    <footer className="hidden lg:flex h-8 border-t border-slate-800 bg-slate-900 items-center px-4 justify-between text-[10px] font-medium text-slate-500 uppercase tracking-widest">
      <div className="flex gap-4 items-center">
        <span>{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span>{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>{t('autosaveActive')}</span>
      </div>
    </footer>
  );
}

function ReadingTimeBadge({ splitWords, t }: any) {
  const stats = useEditorStore(state => state.stats);
  return (
    <span className="flex items-center gap-1 text-cyan-500 font-bold uppercase tracking-widest text-[10px]">
      <Clock size={10} className="inline" />
      {Math.ceil((stats?.words || 0) / (splitWords || 300))} {t('minRead')}
    </span>
  );
}

function App() {
  // --- State ---
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'editor' | 'reader'>('editor');
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('steem_lang');
    if (saved && (translations[saved] || AVAILABLE_LANGUAGES.some(l => l.code === saved))) return saved;
    const browserLang = navigator?.language?.slice(0, 2);
    if (browserLang && (translations[browserLang] || AVAILABLE_LANGUAGES.some(l => l.code === browserLang))) return browserLang;
    return 'uk';
  });

  const t = useCallback((key: TranslationKey) => getTranslation(lang, key), [lang]);

  const contentForPublish = useEditorStore(state => activeModal === 'publish' ? state.content : '');
  const setContent = useEditorStore(state => state.setContent);
  const stats = useEditorStore(state => state.stats);
  const [splitWords, setSplitWords] = useState(300);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [widgetOpacity, setWidgetOpacity] = useState(() => {
    const saved = localStorage.getItem('widget_opacity');
    return saved !== null ? Number(saved) : 1.0;
  });
  const [widgetNoBorder, setWidgetNoBorder] = useState(() => {
    const saved = localStorage.getItem('widget_no_border');
    return saved === null ? true : saved === 'true';
  });
  const [images, setImages] = useState<ImageItem[]>([]);
  const isImagesLoaded = useRef(false);
  const [sourceInput, setSourceInput] = useState('');
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [tableSelectorPos, setTableSelectorPos] = useState<{x: number, y: number, direction: 'up' | 'down'} | null>(null);
  const [tableHover, setTableHover] = useState({ r: 0, c: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditorFullScreen, setIsEditorFullScreen] = useState(false);
  const { viewportHeight: vvHeight, keyboardOffset, isKeyboardOpen } = useVisualViewport();
  const previewRef = useRef<HTMLDivElement>(null);

  const isTauriEnv = () => typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
  const isNeutralinoEnv = () => typeof window !== 'undefined' && ('Neutralino' in window || !!(window as any).Neutralino);

  const toggleFullScreen = () => {
    setIsFullScreen(prev => {
      const next = !prev;
      if (isTauriEnv()) {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          getCurrentWindow().setFullscreen(next).catch(() => {});
        }).catch(() => {});
      } else if (isNeutralinoEnv()) {
        try {
          const neu = (window as any).Neutralino;
          if (neu?.window) {
            if (next) {
              neu.window.setFullScreen().catch(() => {});
            } else {
              neu.window.exitFullScreen().catch(() => {});
            }
          }
        } catch (e) {
          console.warn('[Neutralino Fullscreen error]', e);
        }
      } else {
        // Only in standard web browser / PWA use HTML5 Fullscreen
        if (next) {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        }
      }
      return next;
    });
  };

  const toggleEditorFullScreen = () => {
    // Pure in-app distraction-free editor mode: toggle internal state without interfering with OS window
    setIsEditorFullScreen(prev => !prev);
  };

  useEffect(() => {
    // Only listen to HTML5 fullscreen changes in pure web mode
    const handleFullscreenChange = () => {
      if (isTauriEnv() || isNeutralinoEnv()) return; // Do not let webkit HTML5 events interfere with native desktop window state
      const isNativeFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (!isNativeFs) {
        setIsFullScreen(false);
        // Do not arbitrarily close in-app editor fullscreen
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    probeNodes();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        const isTauri = isTauriEnv();
        const isNeu = isNeutralinoEnv();
        
        if (isFullScreen) {
          setIsFullScreen(false);
          if (isTauri) {
             import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().setFullscreen(false).catch(() => {}));
          } else if (isNeu) {
             try { (window as any).Neutralino?.window?.exitFullScreen().catch(() => {}); } catch { /* ignore neutralino error */ }
          } else if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } else {
          setIsFullScreen(true);
          if (isTauri) {
             import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().setFullscreen(true).catch(() => {}));
          } else if (isNeu) {
             try { (window as any).Neutralino?.window?.setFullScreen().catch(() => {}); } catch { /* ignore neutralino error */ }
          } else if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        if (showTableSelector) {
          setShowTableSelector(false);
          return;
        }
        if (isWidgetMenuOpen) {
          setIsWidgetMenuOpen(false);
          return;
        }
        if (activeModal) {
          setActiveModal(null);
          return;
        }
        
        if (isEditorFullScreen) {
          setIsEditorFullScreen(false);
          return;
        }
        if (isFullScreen) {
          setIsFullScreen(false);
          if (isTauriEnv()) {
             import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().setFullscreen(false).catch(() => {}));
          } else if (isNeutralinoEnv()) {
             try { (window as any).Neutralino?.window?.exitFullScreen().catch(() => {}); } catch { /* ignore neutralino error */ }
          } else if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          return;
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showTableSelector, isWidgetMenuOpen, activeModal, isEditorFullScreen, isFullScreen]);

  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'markdown'>(() => {
    return (localStorage.getItem('steem_editor_mode') as 'visual' | 'markdown') || 'visual';
  });
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    code: false,
    strikethrough: false,
    sub: false,
    sup: false,
    phishy: false
  });
  const [floatingPos, setFloatingPos] = useState<{ x: number, y: number } | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_QUEUE);
    return saved ? JSON.parse(saved) : [];
  });
  const [scheduledTime, setScheduledTime] = useState('');
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [isGallerySettingsCollapsed, setIsGallerySettingsCollapsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [gallerySearch, setGallerySearch] = useState('');
  const [galleryView, setGalleryView] = useState<'grid' | 'list'>('grid');
  const [galleryMode, setGalleryMode] = useState<'local' | 'pexels' | 'unsplash' | 'pixabay'>('local');
  const [pexelsApiKey, setPexelsApiKey] = useState<string | null>(null);
  const [pixabayApiKey, setPixabayApiKey] = useState<string | null>(() => localStorage.getItem('steem_pixabay_key'));
  const [unsplashAccessKey, setUnsplashAccessKey] = useState<string | null>(() => localStorage.getItem('steem_unsplash_access_key'));
  
  const [pexelsPage, setPexelsPage] = useState(1);
  const [pexelsResults, setPexelsResults] = useState<any[]>(() => {
    const cached = localStorage.getItem('steem_gallery_cache_results');
    if (!cached) return [];
    try {
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set();
      return parsed.filter(p => {
        const key = p.id + p.source;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch { return []; }
  });
  const [isSearchingPexels, setIsSearchingPexels] = useState(false);
  
  const [performanceMode, setPerformanceMode] = useState(() => localStorage.getItem('steem_performance_mode') !== 'false');

  const saveLargeStorage = useCallback((key: string, val: string) => {
    try {
      localStorage.setItem(key, val);
    } catch (e) {
      console.warn(`LocalStorage quota exceeded for ${key} (large document):`, e);
      try {
        sessionStorage.setItem(key, val);
      } catch (err) {
        console.warn('SessionStorage quota exceeded as well:', err);
      }
    }
  }, []);

  const getMotionConfig = useCallback((custom?: { initial?: any; animate?: any; exit?: any }) => {
    if (performanceMode) {
      return {
        initial: false,
        animate: custom?.animate || { opacity: 1, scale: 1, y: 0, x: 0 },
        exit: false as any,
        transition: { duration: 0 }
      };
    }
    return {
      initial: custom?.initial || { opacity: 0, y: 10, scale: 0.95 },
      animate: custom?.animate || { opacity: 1, y: 0, scale: 1 },
      exit: custom?.exit || { opacity: 0, y: 10, scale: 0.95 },
      transition: { duration: 0.15 }
    };
  }, [performanceMode]);

  const getSidebarMotionConfig = useCallback(() => {
    if (performanceMode) {
      return {
        initial: false,
        animate: { x: 0, opacity: 1 },
        exit: false as any,
        transition: { duration: 0 }
      };
    }
    return {
      initial: { x: -300, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -300, opacity: 0 },
      transition: { duration: 0.3 }
    };
  }, [performanceMode]);
  const [tempPexelsKey, setTempPexelsKey] = useState('');
  const [tempPixabayKey, setTempPixabayKey] = useState('');
  const [tempUnsplashAccessKey, setTempUnsplashAccessKey] = useState('');
  const [savePexelsUnencrypted, setSavePexelsUnencrypted] = useState(() => {
    return localStorage.getItem('steem_pexels_unencrypted') === 'true';
  });
  
  const [gridWithCaptions, setGridWithCaptions] = useState(false);
  const [singleCaptionAlign, setSingleCaptionAlign] = useState<'center' | 'left' | 'right'>('center');
  const [gridLayout, setGridLayout] = useState<'col' | 'col-table' | 'row' | 'grid-2' | 'col-img-text' | 'col-text-img'>('col');

  const [pexelsSettings, setPexelsSettings] = useState(() => {
    const saved = localStorage.getItem('steem_pexels_settings');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && typeof parsed === 'object') ? parsed : {
        withAttribution: true,
        linkEmbedded: true
      };
    } catch {
      return {
        withAttribution: true,
        linkEmbedded: true
      };
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const lastWidth = useRef(window.innerWidth);
  const [widgetPos, setWidgetPos] = useState<'floating' | 'bottom' | 'hidden'>(() => {
    const saved = localStorage.getItem('steem_widget_pos');
    if (saved === 'bottom' || saved === 'hidden' || saved === 'floating') return saved;
    return 'bottom';
  });
  const [enabledTools, setEnabledTools] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FLOAT_CONFIG);
    try {
      const initial = saved ? JSON.parse(saved) : DEFAULT_FLOAT_TOOLS;
      return Array.isArray(initial) ? Array.from(new Set(initial)) : DEFAULT_FLOAT_TOOLS;
    } catch {
      return DEFAULT_FLOAT_TOOLS;
    }
  });

  // Configure marked for Steem-like behavior
  useEffect(() => {
    if (marked && (marked as any).use) {
      (marked as any).use({ breaks: true, gfm: true });
    }
  }, []);
  

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('steem_dark_mode') !== 'false');
  const [visualStyle, setVisualStyle] = useState<'standard' | 'neon'>(() => (localStorage.getItem('steem_visual_style') as 'standard' | 'neon') || 'standard');
  const [neonTextColored, setNeonTextColored] = useState(() => localStorage.getItem('steem_neon_text_colored') !== 'false');
  const [syncScrollEnabled, setSyncScrollEnabled] = useState(() => localStorage.getItem('steem_sync_scroll') !== 'false');
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(() => localStorage.getItem('steem_gallery_collapsed') === 'true');
  const [isLivePreviewEnabled, setIsLivePreviewEnabled] = useState(() => localStorage.getItem('steem_live_preview_enabled') === 'true');

  useEffect(() => {
    localStorage.setItem('steem_neon_text_colored', String(neonTextColored));
  }, [neonTextColored]);

  useEffect(() => {
    localStorage.setItem('steem_gallery_collapsed', String(isGalleryCollapsed));
  }, [isGalleryCollapsed]);

  useEffect(() => {
    localStorage.setItem('steem_live_preview_enabled', String(isLivePreviewEnabled));
  }, [isLivePreviewEnabled]);
  const [settingsTab, setSettingsTab] = useState<'general' | 'gallery' | 'vault' | 'keys' | 'about' | 'pwa'>('general');
  const [systemDialog, setSystemDialog] = useState<{
    type: 'confirm' | 'prompt' | 'alert',
    inputType?: 'text' | 'password',
    title: string,
    message: string,
    resolve: (val: any) => void,
    defaultValue?: string,
    placeholder?: string
  } | null>(null);

  useEffect(() => {
    if (activeModal === null && !systemDialog) {
      setTimeout(() => {
        editorRef.current?.focus();
      }, 100);
    }
  }, [activeModal, systemDialog]);

  const confirmDialog = useCallback((message: string, title?: string) => {
    return new Promise<boolean>((resolve) => {
      setSystemDialog({ 
        type: 'confirm', 
        title: title || t('confirm'), 
        message, 
        resolve 
      });
    });
  }, [t]);

  const promptDialog = useCallback((message: string, defaultValue: string = "", title?: string, inputType?: "text" | "password") => {
    return new Promise<string | null>((resolve) => {
      setSystemDialog({ 
        type: 'prompt', 
        title: title || t('link'), 
        message, 
        resolve, 
        defaultValue,
        inputType 
      });
    });
  }, [t]);

  const [tableImportText, setTableImportText] = useState('');
  const [tableImportFormat, setTableImportFormat] = useState<'markdown' | 'html'>('markdown');

  // Memoized filtered lists to reduce processing during each render
  const filteredLocalImages = useMemo(() => {
    return images.filter(img => img.name.toLowerCase().includes(gallerySearch.toLowerCase()));
  }, [images, gallerySearch]);

  const isFirstRender = useRef(true);

  // Update preview HTML when content or marked changes
  useEffect(() => {
    const preview = previewPaneRef.current;
    if (!isLivePreviewEnabled) {
      if (preview && !preview.querySelector('svg.opacity-40')) {
        preview.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2 py-12 text-center select-none">
          <svg class="w-8 h-8 opacity-40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <p>${lang === 'uk' ? "Прев'ю вимкнено для економії ресурсів.<br>Натисніть кнопку з оком, щоб увімкнути знову." : "Live Preview disabled to save resources.<br>Click the eye icon to enable again."}</p>
        </div>`;
      }
      return;
    }

    const updatePreview = async () => {
      const m = getMarked();
      if (!m) {
        if (preview) {
          Idiomorph.morph(preview, `<p class="text-slate-500 italic">${t('loadingParser')}</p>`, { morphStyle: 'innerHTML' });
        }
        return;
      }
      try {
        const mdContent = useEditorStore.getState().content;
        const processed = processContentForSteem(mdContent);
        let finalHtml = (await m.parse(processed)) as string;
        
        // Add referrerpolicy="no-referrer" and loading="lazy" to all img tags for better compatibility and massive GPU/CPU savings
        finalHtml = finalHtml.replace(/<img /g, '<img referrerpolicy="no-referrer" loading="lazy" ');
        
        let isAtBottom = false;
        if (preview) {
          isAtBottom = preview.scrollHeight > 0 && preview.scrollHeight - preview.scrollTop - preview.clientHeight <= 20;
        }
        
        const purifiedHtml = DOMPurify ? (DOMPurify.sanitize(finalHtml, DOM_PURIFY_CONFIG as any) as unknown as string) : (finalHtml as unknown as string);
        
        if (preview) {
          Idiomorph.morph(preview, purifiedHtml, { morphStyle: 'innerHTML' });
          
          if (syncScrollEnabled && isAtBottom) {
            requestAnimationFrame(() => {
              preview.scrollTop = preview.scrollHeight;
            });
          }
        }
      } catch (e) {
        console.error("Marked parse error", e);
        if (preview) {
          Idiomorph.morph(preview, `<p class="text-red-500">${t('previewError')}</p>`, { morphStyle: 'innerHTML' });
        }
      }
    };

    if (isFirstRender.current) {
      isFirstRender.current = false;
      updatePreview();
      return;
    }

    let timer: any;
    
    // Trigger update immediately if needed, or wait for next changes
    if (!isLivePreviewEnabled) updatePreview(); 
    else {
      timer = setTimeout(updatePreview, 300);
    }
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      if (state.content !== prevState.content) {
        // Skip expensive markdown preview parsing/morphing in background while user types in visual editor
        if (editorMode === 'visual') return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(updatePreview, 300);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [t, syncScrollEnabled, isLivePreviewEnabled, lang, editorMode]);
   const [templates, setTemplates] = useState<Template[]>([]);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'post' | 'snippet'>('snippet');
  const [templateFilter, setTemplateFilter] = useState<'all' | 'post' | 'snippet'>('all');
  const [mentions, setMentions] = useState<string[]>([]);
  const [newMention, setNewMention] = useState('');
  
  // Auth & Publish
  const [authType, setAuthType] = useState<AuthType | 'VAULT'>(() => {
    if (typeof window !== 'undefined' && !(window as any).steem_keychain) {
      return 'VAULT';
    }
    return 'KEYCHAIN';
  });
  const [username, setUsername] = useState(() => localStorage.getItem('steem_username') || '');
  const [selectedVaultUser, setSelectedVaultUser] = useState('');
  const [showAccountPrompt, setShowAccountPrompt] = useState(() => !localStorage.getItem('steem_username'));
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('steem_notif_enabled') !== 'false');
  
  const [notifications, setNotifications] = useState<SteemNotification[]>([]);
  const [rawNotifications, setRawNotifications] = useState<any[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState<SteemNotification | null>(null);
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [showMobileToolsOpen, setShowMobileToolsOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileTools1, setShowMobileTools1] = useState(false);
  const [showMobileTools2, setShowMobileTools2] = useState(false);
  const [showQuickFontSizePopover, setShowQuickFontSizePopover] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('.mobile-tools-container') && 
        !target.closest('.font-size-popover-container') &&
        !target.closest('.notification-container') &&
        !target.closest('.lang-menu-container') &&
        !target.closest('.widget-settings-container') &&
        !target.closest('.steem-widget-container')
      ) {
        setShowMobileTools1(false);
        setShowMobileTools2(false);
        setShowMobileToolsOpen(false);
        setShowQuickFontSizePopover(false);
        setShowNotificationList(false);
        setShowLangMenu(false);
      }
    };
    if (showMobileTools1 || showMobileTools2 || showMobileToolsOpen || showQuickFontSizePopover || showNotificationList || showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileTools1, showMobileTools2, showMobileToolsOpen, showQuickFontSizePopover, showNotificationList, showLangMenu]);

  const [targetReaderPost, setTargetReaderPost] = useState<{ author: string, permlink: string, commentAuthor?: string, commentPermlink?: string } | null>(null);
  const [mutedUsers, setMutedUsers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('steem_muted_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const visibleNotifications = useMemo(() => {
    return notifications.filter(n => !mutedUsers.includes(n.author) && (!n.parent_author || !mutedUsers.includes(n.parent_author)));
  }, [notifications, mutedUsers]);
  const lastFetchedNotificationTime = useRef<string | null>(localStorage.getItem('steem_last_notif_time'));

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    
    try {
        const saved = localStorage.getItem('steem_hidden_replies');
        const hiddenSet = new Set<string>(saved ? JSON.parse(saved) : []);
        rawNotifications.forEach(r => hiddenSet.add(r.permlink));
        localStorage.setItem('steem_hidden_replies', JSON.stringify(Array.from(hiddenSet).slice(-200)));
    } catch (e) {
        console.error("Failed to mark all as read", e);
    }

    window.dispatchEvent(new Event('steem_mark_all_read'));
  };

  const currentUser = authType === 'VAULT' ? selectedVaultUser : username;

  // Persistence
  useEffect(() => {
    localStorage.setItem('steem_username', username);
  }, [username]);

  useEffect(() => {
    localStorage.setItem('steem_notif_enabled', String(notifEnabled));
  }, [notifEnabled]);

  // Fetch muted users globally
  useEffect(() => {
    if (!currentUser) {
      setMutedUsers([]);
      return;
    }

    const fetchMuted = async () => {
      try {
        const result = await callWithFallback('condenser_api.get_following', [currentUser, '', 'ignore', 1000]);
        if (result && Array.isArray(result)) {
          const fetched = result.map((f: any) => f.following);
          setMutedUsers(fetched);
          localStorage.setItem('steem_muted_users', JSON.stringify(fetched));
        }
      } catch (err) {
        console.warn("Failed to fetch muted users globally:", err);
      }
    };

    fetchMuted();
    const interval = setInterval(fetchMuted, 300000); // 5 mins
    return () => clearInterval(interval);
  }, [currentUser]);

  // Poll for notifications
  useEffect(() => {
    if (!currentUser || !notifEnabled) return;

    const fetchNotifs = async () => {
      try {
        let readerConfig: any = null;
        try {
          const saved = localStorage.getItem('steem_reader_config_v1');
          if (saved) readerConfig = JSON.parse(saved);
        } catch {
          // ignore
        }
        
        if (readerConfig && readerConfig.autoShowInbox === false) {
           return;
        }

        let results: any[] = await callWithFallback('bridge.get_account_posts', {
          sort: 'replies',
          account: currentUser,
          limit: 50
        }).catch(() => null);

        if (results && Array.isArray(results)) {
          results = results.filter(p => p.author !== currentUser && p.parent_author === currentUser);
        }

        if (!results) {
          // Fallback if bridge is not available
          const state: any = await callWithFallback('condenser_api.get_state', [`/@${currentUser}/recent-replies`]).catch(() => null);
          if (state && state.content) {
            results = Object.values(state.content);
            results = results.filter((p: any) => p.author !== currentUser && p.parent_author === currentUser);
            results.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
            results = results.slice(0, 50);
          }
        }

        if (results && Array.isArray(results) && results.length > 0) {
          
          let filteredResults = results.filter(r => !mutedUsers.includes(r.author));
          
          if (readerConfig) {
             if (readerConfig.onlyWhitelist && readerConfig.whiteList && readerConfig.whiteList.length > 0) {
                filteredResults = filteredResults.filter((r: any) => readerConfig.whiteList.includes(r.author));
             } else if (readerConfig.blackList && readerConfig.blackList.length > 0) {
                filteredResults = filteredResults.filter((r: any) => !readerConfig.blackList.includes(r.author));
             }
             if (readerConfig.excludeMuted && readerConfig.mutedUsers) {
               filteredResults = filteredResults.filter((r: any) => !readerConfig.mutedUsers.includes(r.author));
             }
          }
          
          setRawNotifications(filteredResults);
          
          if (filteredResults.length === 0) return;

          const newNotifs: SteemNotification[] = filteredResults.map(r => ({
            id: r.permlink,
            type: 'reply',
            author: r.author,
            permlink: r.permlink,
            parent_author: r.parent_author,
            parent_permlink: r.parent_permlink,
            body: r.body,
            timestamp: r.created,
            isRead: false
          }));

          const newest = newNotifs[0];
          if (lastFetchedNotificationTime.current && newest.timestamp > lastFetchedNotificationTime.current) {
            // Save state for persistence across reloads
            localStorage.setItem('steem_last_notif_time', newest.timestamp);
            setShowNotificationPopup(newest);
            setTimeout(() => setShowNotificationPopup(null), 10000);
          }
          lastFetchedNotificationTime.current = newest.timestamp;
          setNotifications(prev => {
             const existingIds = new Set(prev.map(n => n.id));
             const batch = [...prev];
             newNotifs.forEach(n => {
               if (!existingIds.has(n.id)) batch.unshift(n);
             });
             return batch.slice(0, 50);
          });
        }
      } catch (err) {
        console.warn("Notification poll failed:", err);
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000); // 60s
    return () => clearInterval(interval);
  }, [currentUser, notifEnabled, mutedUsers]);

  const [vaultPin, setVaultPin] = useState('');
  const [isVaultInitialized, setIsVaultInitialized] = useState(false);
  const [vaultAccounts, setVaultAccounts] = useState<string[]>([]);
  const [isSMenuOpen, setIsSMenuOpen] = useState(false);
  const [beautifyEnabled, setBeautifyEnabled] = useState(() => localStorage.getItem('steem_beautify') !== 'false');
  
  const themeAssortment = useMemo(() => [
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
  ], []);

  const neonAssortment = useMemo(() => [
    { name: 'cyan-cyber', rgb: '0 255 255', hex: '#00ffff' },
    { name: 'magenta-cyber', rgb: '255 0 255', hex: '#ff00ff' },
    { name: 'electric-blue', rgb: '112 0 255', hex: '#7000ff' },
    { name: 'neon-green', rgb: '57 255 20', hex: '#39ff14' },
    { name: 'neon-yellow', rgb: '255 255 0', hex: '#ffff00' },
    { name: 'neon-orange', rgb: '255 110 0', hex: '#ff6e00' },
    { name: 'neon-red', rgb: '255 49 49', hex: '#ff3131' },
    { name: 'hot-pink', rgb: '255 105 180', hex: '#ff69b4' },
  ], []);

  const activeAssortment = useMemo(() => visualStyle === 'neon' ? neonAssortment : themeAssortment, [visualStyle, neonAssortment, themeAssortment]);

  const fontOptions = useMemo(() => [
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
  ], []);

  const [imageUploadAccount, setImageUploadAccount] = useState('');
  const [showVaultSetup, setShowVaultSetup] = useState(false);
  const [vaultSetupWif, setVaultSetupWif] = useState('');
  const [vaultSetupPin, setVaultSetupPin] = useState('');
  const [pubTitle, setPubTitle] = useState('');
  const [removeTitleLine, setRemoveTitleLine] = useState(() => localStorage.getItem('steem_remove_title_line') !== 'false');
  const [pubTags, setPubTags] = useState('');
  const [appAgent, setAppAgent] = useState(localStorage.getItem('steem_app_agent') || 'ultrasteemeditor/4.6.8');
  const [rewardType, setRewardType] = useState<'SP' | '50' | '0'>( (localStorage.getItem('steem_reward_type') as any) || '50');
  const [beneficiaries, setBeneficiaries] = useState<{account: string, weight: number}[]>([]);
  const [benName, setBenName] = useState('');
  const [benWeight, setBenWeight] = useState('5');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showAdvancedPublish, setShowAdvancedPublish] = useState(false);
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
  const [isExifEnabled, setIsExifEnabled] = useState(() => localStorage.getItem('steem_exif_enabled') === 'true');
  const [pubLog, setPubLog] = useState<{ msg: string, type: 'success' | 'error' | 'loading' | null }>({ msg: '', type: null });

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

  const getExifTableFromBlob = async (file: File | Blob): Promise<string> => {
    if (!isExifEnabled) return '';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = ExifReader.load(arrayBuffer);
      if (!tags) return '';

      const make = tags['Make']?.description || '';
      const model = tags['Model']?.description || '';
      const fNumber = tags['FNumber']?.description ? `f/${tags['FNumber'].description}` : '';
      const iso = tags['ISOSpeedRatings']?.description ? `ISO ${tags['ISOSpeedRatings'].description}` : '';
      const shutter = tags['ExposureTime']?.description || '';
      const focal = tags['FocalLength']?.description || '';

      if (!make && !model && !iso) return '';

      let table = '\n| Param | Camera Info |\n| --- | --- |\n';
      if (make || model) table += `| 📸 | ${make} ${model} |\n`;
      if (fNumber) table += `| 🔘 | ${fNumber} |\n`;
      if (shutter) table += `| ⏲️ | ${shutter} |\n`;
      if (iso) table += `| 🎞️ | ${iso} |\n`;
      if (focal) table += `| 🔍 | ${focal} |\n`;
      
      return table + '\n';
    } catch (e) {
      console.error('Exif error:', e);
      return '';
    }
  };

  useEffect(() => {
    if (activeModal === 'publish') {
      if (typeof window !== 'undefined' && !(window as any).steem_keychain) {
        setAuthType('VAULT');
      }
      if (!pubTitle) {
        const content = useEditorStore.getState().content;
        const firstLine = content.split('\n')[0].replace(/[#*`]/g, '').trim();
        if (firstLine) setPubTitle(firstLine.substring(0, 70));
      }
    }
  }, [activeModal, pubTitle]);

  useEffect(() => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    if (!hasKeychain && vaultAccounts.length > 0) {
      if (!imageUploadAccount || !vaultAccounts.includes(imageUploadAccount)) {
        setImageUploadAccount(selectedVaultUser || vaultAccounts[0]);
      }
    }
  }, [vaultAccounts, selectedVaultUser, imageUploadAccount]);

  const extractMentions = (text: string) => {
    // 1. Remove markdown links [Label](url)
    // 2. Remove standard URLs
    // 3. Remove what looks like a path or query part of a URL (if still some left)
    const cleanText = text
      .replace(/\[.*?\]\(.*?\)/g, ' ')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/[a-z0-9.-]+\/[a-z0-9.-]+/gi, ' ');
      
    const matches = cleanText.match(/@([a-z0-9.-]+)/gi);
    if (!matches) return [];
    
    return Array.from(new Set(matches.map(m => m.substring(1).toLowerCase())))
      .filter(m => /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(m))
      .filter(m => !m.includes('.') || m.split('.').every(p => p.length >= 1));
  };

  const createPermlinkUA = (title: string): string => {
    let text = title.toLowerCase().trim();
    text = text.replace(/зг/g, 'zgh'); // Правило "зг"
    const specialStart: Record<string, string> = { 'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya' };
    const specialMid: Record<string, string> = { 'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya' };
    const standardMap: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
        'з': 'z', 'и': 'y', 'і': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', '’': '', "'": '', 'ʼ': ''
    };
    const result = text.split(/([\s-]+)/).map(part => {
        if (/[\s-]+/.test(part)) return part;
        let word = "";
        for (let i = 0; i < part.length; i++) {
            const char = part[i];
            if (i === 0 && specialStart[char]) word += specialStart[char];
            else if (i > 0 && specialMid[char]) word += specialMid[char];
            else if (standardMap[char] !== undefined) word += standardMap[char];
            else word += char;
        }
        return word;
    }).join('');
    
    return result
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 150) || 'post-' + Math.random().toString(36).substring(2, 7);
  };
  const sanitizeFilename = (name: string): string => {
    const ukrToLatin: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
      'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
      'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ь': '', 'ю': 'yu', 'я': 'ya', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E',
      'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
      'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
    };
    
    const parts = name.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';
    const base = parts.join('.');
    const result = base.split('').map(char => ukrToLatin[char] || char).join('');
    
    return result
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_.-]/g, '')
      .substring(0, 40) + (ext ? '.' + ext : '');
  };

  const notify = useCallback((msg: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setPubLog({ msg, type });
    if (type !== 'loading') {
      const timeout = type === 'success' ? 3000 : 5000;
      setTimeout(() => {
        setPubLog(prev => prev.msg === msg ? { msg: '', type: null } : prev);
      }, timeout);
    } else {
      // Auto-clear loading after 15s to prevent stuck notifications
      setTimeout(() => {
        setPubLog(prev => prev.type === 'loading' && prev.msg === msg ? { msg: '', type: null } : prev);
      }, 15000);
    }
  }, []);

  // --- PWA States ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    }
    return false;
  });
  const [showPwaBanner, setShowPwaBanner] = useState(() => {
    try {
      return localStorage.getItem('steem_pwa_banner_dismissed') !== 'true';
    } catch {
      return true;
    }
  });
  const [showPwaInstructionsModal, setShowPwaInstructionsModal] = useState(false);

  useEffect(() => {
    // Check standalone mode dynamically
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      if (isStandalone) {
        setIsPwaInstalled(true);
      }
    };
    checkStandalone();

    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('PWA Service Worker registration failed:', err);
        });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      setShowPwaBanner(false);
      notify(t('pwaInstalled'), 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [t, notify]);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA installation user outcome: ${outcome}`);
        if (outcome === 'accepted') {
          setIsPwaInstalled(true);
          setDeferredPrompt(null);
          setShowPwaBanner(false);
          notify(t('pwaInstalled'), 'success');
        }
        return;
      } catch (err) {
        console.error('Failed to trigger PWA installation:', err);
      }
    }

    if (isPwaInstalled) {
      notify(t('pwaAlreadyInstalled'), 'success');
    } else {
      setShowPwaInstructionsModal(true);
    }
  };
  const [isUnlocked, setIsUnlocked] = useState(!SecurityService.isLocked());
  const [isTextWrapEnabled, setIsTextWrapEnabled] = useState(() => {
    const saved = localStorage.getItem('steem_text_wrap');
    return saved !== null ? saved === 'true' : true;
  });
  const [isTrafficOptimized, setIsTrafficOptimized] = useState(() => {
    return localStorage.getItem('steem_traffic_optimized') === 'true';
  });
  const [imageInsertFormat, setImageInsertFormat] = useState<'html' | 'markdown'>(() => {
    return (localStorage.getItem('steem_image_format') as 'html' | 'markdown') || 'html';
  });
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  
  const [tagGroups, setTagGroups] = useState<TagGroup[]>(() => {
    const saved = localStorage.getItem('steem_tag_groups');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingContext, setLoadingContext] = useState<Set<string>>(new Set());
  const [draftFilter, setDraftFilter] = useState<'all' | 'working' | 'ready'>('all');

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<{start: number, end: number} | null>(null);
  const isTransitioningModeRef = useRef<boolean>(false);
  const previewPaneRef = useRef<HTMLDivElement>(null);

  const [onDemandSyncEnabled, setOnDemandSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('steem_on_demand_sync');
    return saved !== null ? saved === 'true' : true;
  });
  const wysiwygSyncTimeoutRef = useRef<number | null>(null);
  const wysiwygLocalBackupTimeoutRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  const toggleLivePreview = useCallback(() => {
    const nextVal = !isLivePreviewEnabled;
    if (editorMode === 'markdown' && editorRef.current) {
      const val = editorRef.current.value;
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      const pos = getRowColFromOffset(val, start);
      useEditorStore.setState({
        content: val,
        cursor: pos,
        selectionStart: start,
        selectionEnd: end
      });
    }
    setIsLivePreviewEnabled(nextVal);
  }, [isLivePreviewEnabled, editorMode]);

  useEffect(() => {
    return () => {
      if (wysiwygSyncTimeoutRef.current) {
        clearTimeout(wysiwygSyncTimeoutRef.current);
      }
      if (wysiwygLocalBackupTimeoutRef.current) {
        clearTimeout(wysiwygLocalBackupTimeoutRef.current);
      }
    };
  }, []);

  const [bookStructure] = useState<{ id: string; title: string; chapters: { id: string; title: string; note?: string }[] }[]>(() => {
    const saved = localStorage.getItem('steem_book_structure');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        title: 'Розділ 1: Вступ і Концепція',
        chapters: [
          { id: '1-1', title: 'Глава 1.1: Перші Кроки', note: 'Огляд структури та головний посил' },
          { id: '1-2', title: 'Глава 1.2: Основна Мета', note: 'Опис і аналіз ваших ідей' }
        ]
      },
      {
        id: '2',
        title: 'Розділ 2: Експерименти та Практика',
        chapters: [
          { id: '2-1', title: 'Глава 2.1: Детальний опис', note: 'Корисне форматування та посилання' }
        ]
      }
    ];
  });

  // Save book structure
  useEffect(() => {
    localStorage.setItem('steem_book_structure', JSON.stringify(bookStructure));
  }, [bookStructure]);


  const wysiwygRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef<boolean>(false);

  const savedVisualRangeRef = useRef<Range | null>(null);

  const saveVisualSelection = useCallback(() => {
    if (editorMode !== 'visual') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
      try {
        const range = sel.getRangeAt(0);
        if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
          savedVisualRangeRef.current = range.cloneRange();

          // Sync active formats in real-time in visual mode
          let curr: Node | null = range.startContainer;
          let isBold = false;
          let isItalic = false;
          let isCode = false;
          let isStrike = false;
          let isSub = false;
          let isSup = false;
          let isPhishy = false;

          while (curr && curr !== wysiwygRef.current) {
            if (curr.nodeType === Node.ELEMENT_NODE) {
              const el = curr as HTMLElement;
              const tag = el.tagName.toLowerCase();
              if (tag === 'b' || tag === 'strong') isBold = true;
              if (tag === 'i' || tag === 'em') isItalic = true;
              if (tag === 'code') isCode = true;
              if (tag === 'strike' || tag === 'del' || tag === 's') isStrike = true;
              if (tag === 'sub') isSub = true;
              if (tag === 'sup') isSup = true;
              if (el.classList.contains('phishy')) isPhishy = true;

              const fw = el.style?.fontWeight || '';
              if (fw === 'bold' || fw === 'bolder' || parseInt(fw, 10) >= 600) isBold = true;
              const fs = el.style?.fontStyle || '';
              if (fs === 'italic' || fs === 'oblique') isItalic = true;
              const td = el.style?.textDecoration || '';
              if (td.includes('line-through')) isStrike = true;
            }
            curr = curr.parentNode;
          }

          // Check browser's queryCommandState ONLY if the activeElement is inside wysiwyg or wysiwyg is active
          let queryBold = false;
          let queryItalic = false;
          let queryStrike = false;
          let querySub = false;
          let querySup = false;
          const isWysiwygFocused = document.activeElement && (document.activeElement === wysiwygRef.current || wysiwygRef.current.contains(document.activeElement));
          if (isWysiwygFocused) {
            try {
              queryBold = document.queryCommandState('bold');
              queryItalic = document.queryCommandState('italic');
              queryStrike = document.queryCommandState('strikeThrough');
              querySub = document.queryCommandState('subscript');
              querySup = document.queryCommandState('superscript');
            } catch (err) {
              console.warn('queryCommandState failed:', err);
            }
          }

          const newFormats = {
            bold: isBold || (isWysiwygFocused ? queryBold : false),
            italic: isItalic || (isWysiwygFocused ? queryItalic : false),
            code: isCode,
            strikethrough: isStrike || (isWysiwygFocused ? queryStrike : false),
            sub: isSub || (isWysiwygFocused ? querySub : false),
            sup: isSup || (isWysiwygFocused ? querySup : false),
            phishy: isPhishy
          };

          setActiveFormats(prev => {
            if (
              prev.bold === newFormats.bold &&
              prev.italic === newFormats.italic &&
              prev.code === newFormats.code &&
              prev.strikethrough === newFormats.strikethrough &&
              prev.sub === newFormats.sub &&
              prev.sup === newFormats.sup &&
              prev.phishy === newFormats.phishy
            ) {
              return prev; // No change, React will completely skip re-rendering
            }
            return newFormats;
          });
        } else {
          setActiveFormats(prev => {
            if (!prev.bold && !prev.italic && !prev.code && !prev.strikethrough && !prev.sub && !prev.sup && !prev.phishy) {
              return prev;
            }
            return {
              bold: false,
              italic: false,
              code: false,
              strikethrough: false,
              sub: false,
              sup: false,
              phishy: false
            };
          });
        }
      } catch (e) {
        console.warn('Could not save selection:', e);
      }
    }
  }, [editorMode]);


  const scrollCaretIntoView = useCallback((block: ScrollLogicalPosition = 'center') => {
      const editor = wysiwygRef.current;
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      if (!editor.contains(r.commonAncestorContainer)) return;
      
      let rect = r.getBoundingClientRect();
      let hasValidRect = rect && (rect.width > 0 || rect.height > 0);
      
      if (!hasValidRect) {
          const marker = document.createElement('span');
          marker.innerHTML = '&#8203;';
          const tempRange = r.cloneRange();
          tempRange.collapse(true);
          try {
              tempRange.insertNode(marker);
              rect = marker.getBoundingClientRect();
              hasValidRect = rect && (rect.width > 0 || rect.height > 0);
          } catch {
              // ignore
          } finally {
              marker.remove();
              sel.removeAllRanges();
              sel.addRange(r);
          }
      }
      
      if (hasValidRect) {
          const editorRect = editor.getBoundingClientRect();
          const caretTop = rect.top - editorRect.top;
          const isMobileScreen = window.innerWidth < 1024;
          const dynamicWidgetHeight = toolbarIconSize + 24; // dynamically scales with icon size (12-32px -> 36-56px + padding)
          const bottomReserved = isMobileScreen 
              ? (isKeyboardOpen ? (dynamicWidgetHeight + 45) : (dynamicWidgetHeight + 90)) 
              : (widgetPos === 'bottom' ? (dynamicWidgetHeight + 60) : 40);
          const visibleHeight = Math.max(100, editorRect.height - bottomReserved);
          
          if (block === 'center') {
              const targetY = editor.scrollTop + caretTop - (visibleHeight / 2) + (rect.height / 2);
              editor.scrollTo({ top: Math.max(0, targetY), behavior: 'auto' });
          } else if (block === 'nearest') {
              if (caretTop < 10) {
                  editor.scrollBy({ top: caretTop - 20, behavior: 'auto' });
              } else if (caretTop + rect.height > visibleHeight) {
                  editor.scrollBy({ top: caretTop + rect.height - visibleHeight + 20, behavior: 'auto' });
              }
          }
      }
  }, [isKeyboardOpen, widgetPos, toolbarIconSize]);

  const restoreVisualSelection = useCallback((shouldExpandWord = false) => {
    if (savedVisualRangeRef.current && wysiwygRef.current) {
      try {
        const range = savedVisualRangeRef.current.cloneRange();
        
        if (shouldExpandWord && range.collapsed) {
          const node = range.startContainer;
          const offset = range.startOffset;
          
          if (node && node.nodeType === Node.TEXT_NODE) {
            const textValue = node.nodeValue || '';
            const wordBoundaryRegex = /[\s\n.,!?;:"'()[\]{}*~`<>#_]/;
            
            let start = offset;
            let end = offset;
            
            while (start > 0 && !wordBoundaryRegex.test(textValue[start - 1])) {
              start--;
            }
            while (end < textValue.length && !wordBoundaryRegex.test(textValue[end])) {
              end++;
            }
            
            if (start < end) {
              range.setStart(node, start);
              range.setEnd(node, end);
              savedVisualRangeRef.current = range.cloneRange();
            }
          }
        }

        const sel = window.getSelection();
        if (sel) {
          if (document.activeElement !== wysiwygRef.current) {
            wysiwygRef.current.focus({ preventScroll: true });
          }
          sel.removeAllRanges();
          sel.addRange(range);
          
          const startNode = range.startContainer;
          if (startNode) {
             scrollCaretIntoView('nearest');
             
             const images = wysiwygRef.current.querySelectorAll('img');
             images.forEach(img => {
               if (!img.complete) {
                 img.addEventListener('load', () => scrollCaretIntoView('nearest'), { once: true });
               }
             });
             
             setTimeout(() => scrollCaretIntoView('nearest'), 100);
             setTimeout(() => scrollCaretIntoView('nearest'), 300);
          }
        }
      } catch (e) {
        console.warn('Could not restore selection:', e);
      }
    }
  }, [scrollCaretIntoView]);

  const focusVisualEditorEnd = useCallback(() => {
    if (wysiwygRef.current) {
      wysiwygRef.current.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (sel) {
        try {
          const range = document.createRange();
          range.selectNodeContents(wysiwygRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          savedVisualRangeRef.current = range.cloneRange();
        } catch (e) {
          console.warn('Could not focus end of visual editor:', e);
        }
      }
    }
  }, []);

  const isWysiwygContentEmpty = (el: HTMLElement | null): boolean => {
    if (!el) return true;
    if (el.querySelector('img, table, iframe, hr, pre, blockquote, ul, ol, video, audio')) {
      return false;
    }
    const rawText = el.textContent || '';
    const cleanText = rawText.replace(/[\u200B-\u200D\uFEFF\r\n\t\s\u00A0]/g, '');
    return cleanText.length === 0;
  };

  const updateWysiwygEmptyStatus = useCallback((targetEl?: HTMLElement | null) => {
    const el = targetEl || wysiwygRef.current;
    if (!el) return;
    const empty = isWysiwygContentEmpty(el);
    if (empty) {
      if (el.getAttribute('data-is-empty') !== 'true') {
        el.setAttribute('data-is-empty', 'true');
      }
    } else {
      if (el.hasAttribute('data-is-empty')) {
        el.removeAttribute('data-is-empty');
      }
    }
  }, []);

  const lastSyncContentRef = useRef<string>(useEditorStore.getState().content);

  const updateContentFromWysiwyg = useCallback((forceImmediate = false) => {
    if (!wysiwygRef.current) return;
    updateWysiwygEmptyStatus(wysiwygRef.current);
    const html = wysiwygRef.current.innerHTML;
    
    if (onDemandSyncEnabled && !forceImmediate) {
      if (wysiwygLocalBackupTimeoutRef.current) clearTimeout(wysiwygLocalBackupTimeoutRef.current);
      wysiwygLocalBackupTimeoutRef.current = setTimeout(() => {
        localStorage.setItem('steem_autosave_temp_visual_html', html);
      }, 2000) as any;
      
      if (wysiwygSyncTimeoutRef.current) clearTimeout(wysiwygSyncTimeoutRef.current);
      wysiwygSyncTimeoutRef.current = setTimeout(() => {
        const md = htmlToMarkdown(html);
        const currentContent = useEditorStore.getState().content;
        if (md !== currentContent) {
          lastSyncContentRef.current = md;
          setContent(md);
          saveVisualSelection();
        }
      }, 5000) as any;
    } else {
      const md = htmlToMarkdown(html);
      lastSyncContentRef.current = md;
      setContent(md);
    }
  }, [onDemandSyncEnabled, saveVisualSelection, setContent, updateWysiwygEmptyStatus]);

  const syncWysiwygToContentIfVisual = useCallback(() => {
    if (editorMode === 'visual' && wysiwygRef.current) {
      const md = htmlToMarkdown(wysiwygRef.current.innerHTML);
      if (md !== useEditorStore.getState().content) {
        lastSyncContentRef.current = md;
        setContent(md);
        return md;
      }
    }
    return useEditorStore.getState().content;
  }, [editorMode, setContent]);

  // Helper function to insert HTML at visual editor's selection/cursor point
  const insertHtmlAtCursor = useCallback((html: string) => {
    if (!wysiwygRef.current) return;

    // Restore saved range or focus end of the editor
    if (savedVisualRangeRef.current && wysiwygRef.current.contains(savedVisualRangeRef.current.commonAncestorContainer)) {
      restoreVisualSelection(false);
    } else {
      focusVisualEditorEnd();
    }

    let insertedInSelection = false;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        
        // Append editable placeholder spacer after block structures for better cursor selection
        const processedHtml = html;
        
        const el = document.createElement('div');
        el.innerHTML = processedHtml;
        
        const frag = document.createDocumentFragment();
        let node: Node | null;
        let lastNode: Node | null = null;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        
        // Check if there is an empty inline element that we just inserted so we can place the cursor inside it
        let cursorNode: Node | null = null;
        let cursorOffset = 0;

        // Traverse the fragment to find the innermost empty inline element (like b, strong, i, em, sub, sup, strike, span, code)
        const findEmptyInline = (root: Node): HTMLElement | null => {
          if (root.nodeType === Node.ELEMENT_NODE) {
            const el = root as HTMLElement;
            const inlineTags = ['b', 'strong', 'i', 'em', 'sub', 'sup', 'strike', 'span', 'code'];
            if (inlineTags.includes(el.tagName.toLowerCase())) {
              if (el.innerHTML === '' || el.innerHTML === '\u200B') {
                return el;
              }
            }
          }
          if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            for (let i = 0; i < root.childNodes.length; i++) {
              const found = findEmptyInline(root.childNodes[i]);
              if (found) return found;
            }
          }
          return null;
        };

        const emptyEl = findEmptyInline(frag);
        if (emptyEl) {
          const zwsp = document.createTextNode('\u200B');
          emptyEl.appendChild(zwsp);
          cursorNode = zwsp;
          cursorOffset = 1;
        }

        range.insertNode(frag);
        
        if (cursorNode) {
          range.setStart(cursorNode, cursorOffset);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          savedVisualRangeRef.current = range.cloneRange();
        } else if (lastNode) {
          if (lastNode.nodeType === Node.ELEMENT_NODE && lastNode.parentNode) {
            const zwsp = document.createTextNode('\u200B');
            lastNode.parentNode.insertBefore(zwsp, lastNode.nextSibling);
            range.setStart(zwsp, 1);
            cursorNode = zwsp; // Update targetNode for scrolling
          } else {
            range.setStartAfter(lastNode);
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          savedVisualRangeRef.current = range.cloneRange(); // Save updated range
        }
        insertedInSelection = true;

        // Regain focus and scroll to the insertion point
        if (wysiwygRef.current) {
          wysiwygRef.current.focus({ preventScroll: true });
          const targetNode = cursorNode || lastNode;
          if (targetNode) {
            const el = targetNode.nodeType === Node.TEXT_NODE ? targetNode.parentElement : targetNode as HTMLElement;
            if (el && el !== wysiwygRef.current) {
              const scrollElIntoEditor = (targetEl: HTMLElement) => {
                if (!wysiwygRef.current) return;
                const container = wysiwygRef.current;
                const elRect = targetEl.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
                  container.scrollTop += (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
                }
              };
              
              scrollElIntoEditor(el);

              // Keep cursor aligned if there are loading images that shift layout heights
              const images = wysiwygRef.current.querySelectorAll('img');
              images.forEach(img => {
                if (!img.complete) {
                  img.addEventListener('load', () => {
                    if (wysiwygRef.current && wysiwygRef.current.contains(el)) {
                      scrollElIntoEditor(el);
                    }
                  }, { once: true });
                }
              });

              // Fallbacks for deferred loading or style calculations
              setTimeout(() => {
                if (wysiwygRef.current && wysiwygRef.current.contains(el)) {
                  scrollElIntoEditor(el);
                  wysiwygRef.current.focus({ preventScroll: true });
                }
              }, 100);
              setTimeout(() => {
                if (wysiwygRef.current && wysiwygRef.current.contains(el)) {
                  scrollElIntoEditor(el);
                  wysiwygRef.current.focus({ preventScroll: true });
                }
              }, 300);
            }
          }
        }
      }
    }
    
    if (!insertedInSelection && wysiwygRef.current) {
      const processedHtml = html;
      wysiwygRef.current.innerHTML += processedHtml;
      wysiwygRef.current.focus({ preventScroll: true });
    }
    
    updateContentFromWysiwyg();
  }, [restoreVisualSelection, focusVisualEditorEnd, updateContentFromWysiwyg]);

  // Helper to extract highlighted HTML selected by user in the visual editor
  const getVisualSelectionHtml = useCallback(() => {
    if (savedVisualRangeRef.current && wysiwygRef.current) {
      try {
        const range = savedVisualRangeRef.current;
        if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
          const clonedSelection = range.cloneContents();
          const div = document.createElement('div');
          div.appendChild(clonedSelection);
          return div.innerHTML;
        }
      } catch (e) {
        console.warn('Could not extract visual selection:', e);
      }
    }
    return '';
  }, []);

  const findDomPositionForMarkdownOffset = (container: HTMLElement, markdown: string, offset: number): { node: Node, offset: number } | null => {
    if (!container) return null;
    const lines = markdown.split('\n');
    let lineIdx = 0;
    let colIdx = 0;
    let acc = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLen = lines[i].length;
      if (acc + lineLen >= offset || i === lines.length - 1) {
        lineIdx = i;
        colIdx = Math.max(0, offset - acc);
        break;
      }
      acc += lineLen + 1;
    }
    
    const rawLine = lines[lineIdx] || '';

    // Check if current line is part of a markdown table (contains pipe separators)
    const isTableRow = rawLine.trim().startsWith('|') || (rawLine.includes('|') && rawLine.trim().endsWith('|'));
    if (isTableRow) {
      // Identify which table this belongs to and the row index
      let tableIndex = 0;
      let rowInTable = 0;
      let inTable = false;
      let isHeaderDivider = false;

      for (let i = 0; i <= lineIdx; i++) {
        const curLine = lines[i].trim();
        const curIsTable = curLine.startsWith('|') || (curLine.includes('|') && curLine.endsWith('|'));
        if (curIsTable) {
          if (!inTable) {
            inTable = true;
            rowInTable = 0;
            tableIndex++;
          } else {
            rowInTable++;
          }
          if (i === lineIdx) {
            isHeaderDivider = /^\|?(\s*:?-+:?\s*\|?)+\s*$/.test(curLine);
          }
        } else {
          inTable = false;
        }
      }

      const allDomTables = Array.from(container.querySelectorAll('table'));
      const targetTable = allDomTables[tableIndex - 1] || allDomTables[0];
      if (targetTable) {
        const allTrs = Array.from(targetTable.querySelectorAll('tr'));
        let targetTrIdx: number;
        if (isHeaderDivider) {
          targetTrIdx = 0;
        } else if (rowInTable >= 2) {
          targetTrIdx = rowInTable - 1;
        } else {
          targetTrIdx = rowInTable;
        }
        const targetTr = allTrs[Math.min(targetTrIdx, allTrs.length - 1)] || allTrs[0];

        if (targetTr) {
          const pipeParts = rawLine.split('|');
          const cellSegments: { cellIdx: number; startCol: number; endCol: number; raw: string }[] = [];
          let curRunningCol = 0;
          for (let p = 0; p < pipeParts.length; p++) {
            const part = pipeParts[p];
            const segStart = curRunningCol;
            const segEnd = curRunningCol + part.length;
            curRunningCol = segEnd + 1; // +1 for '|'

            if (p === 0 && rawLine.startsWith('|')) continue;
            if (p === pipeParts.length - 1 && rawLine.endsWith('|') && part === '') continue;

            cellSegments.push({
              cellIdx: cellSegments.length,
              startCol: segStart,
              endCol: segEnd,
              raw: part
            });
          }

          let matchedCellIdx = 0;
          let offsetInCell = 0;

          for (const seg of cellSegments) {
            if (colIdx >= seg.startCol && colIdx <= seg.endCol) {
              matchedCellIdx = seg.cellIdx;
              const leadingSpaces = (seg.raw.match(/^\s*/)?.[0] || '').length;
              const rawOffset = Math.max(0, colIdx - seg.startCol - leadingSpaces);
              const textBeforeCol = seg.raw.substring(leadingSpaces, leadingSpaces + rawOffset);
              offsetInCell = textBeforeCol
                .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
                .replace(/\[([^\]]*)\]\(.*$/g, '$1')
                .replace(/[[\]]/g, '')
                .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
                .replace(/(\*\*|__|\*|_|~~|`)/g, '')
                .replace(/<[/]?[^>]+>/g, '').length;
              break;
            }
          }

          const domCells = Array.from(targetTr.querySelectorAll('th, td'));
          const targetCell = domCells[Math.min(matchedCellIdx, domCells.length - 1)] || domCells[0];

          if (targetCell) {
            let charAcc = 0;
            let foundNode: Node | null = null;
            let foundOffset = 0;
            let lastTextNode: Node | null = null;
            let lastTextLen = 0;

            const walkCell = (node: Node) => {
              if (foundNode) return;
              if (node.nodeType === Node.TEXT_NODE) {
                lastTextNode = node;
                const text = node.nodeValue || '';
                const len = text.length;
                lastTextLen = len;
                if (charAcc + len >= offsetInCell) {
                  foundNode = node;
                  foundOffset = Math.max(0, Math.min(offsetInCell - charAcc, len));
                } else {
                  charAcc += len;
                }
              } else {
                for (const child of Array.from(node.childNodes)) {
                  walkCell(child);
                  if (foundNode) break;
                }
              }
            };

            walkCell(targetCell);

            if (foundNode) {
              return { node: foundNode, offset: foundOffset };
            } else if (lastTextNode) {
              return { node: lastTextNode, offset: lastTextLen };
            }
            return { node: targetCell, offset: 0 };
          }
        }
      }
    }

    // Determine the paragraph block in Markdown (continuous non-blank lines around lineIdx)
    let blockStartLine = lineIdx;
    while (blockStartLine > 0 && lines[blockStartLine - 1].trim() !== '') {
      blockStartLine--;
    }
    let blockEndLine = lineIdx;
    while (blockEndLine < lines.length - 1 && lines[blockEndLine + 1].trim() !== '') {
      blockEndLine++;
    }

    const prefixMatch = rawLine.match(/^(#{1,6}\s+|[-*+]\s+(\[[ xX]\]\s+)?|\d+\.\s+|>\s*)/);
    const prefixLen = prefixMatch ? prefixMatch[0].length : 0;
    
    const stripPairedMarkdown = (str: string): string => {
      return str
        .replace(/(\*\*\*|___)(.*?)\1/g, '$2')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/(~~)(.*?)\1/g, '$2')
        .replace(/(`)(.*?)\1/g, '$2')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\(.*$/g, '$1')
        .replace(/[[\]]/g, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/<[/]?[^>]+>/g, '');
    };

    // Calculate exact offset within the multi-line paragraph block in DOM
    let targetOffsetInBlock = 0;
    for (let l = blockStartLine; l < lineIdx; l++) {
      const curL = lines[l];
      const pMatch = curL.match(/^(#{1,6}\s+|[-*+]\s+(\[[ xX]\]\s+)?|\d+\.\s+|>\s*)/);
      const pLen = pMatch ? pMatch[0].length : 0;
      const strippedL = stripPairedMarkdown(curL.substring(pLen));
      targetOffsetInBlock += strippedL.length + 1; // +1 for the <br> or soft line break
    }

    const rawBeforeCursor = rawLine.substring(prefixLen, colIdx);
    const inLineOffset = stripPairedMarkdown(rawBeforeCursor).length;

    targetOffsetInBlock += inLineOffset;
    
    const cleanLineText = stripPairedMarkdown(rawLine.substring(prefixLen)).trim();
    
    const blocks = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6, li, p, blockquote, td, th, pre'));
    if (blocks.length === 0) {
      if (container.firstChild) {
        return { node: container.firstChild, offset: 0 };
      }
      return { node: container, offset: 0 };
    }
    
    let targetBlock: Element;
    
    if (cleanLineText === '') {
      const idealIdx = Math.min(blocks.length - 1, Math.floor((lineIdx / Math.max(1, lines.length)) * blocks.length));
      let bestBlock = blocks[idealIdx];
      let minDiff = 9999;
      blocks.forEach((b, idx) => {
        const isBlockEmpty = (b.textContent || '').trim() === '';
        if (isBlockEmpty) {
          const diff = Math.abs(idx - idealIdx);
          if (diff < minDiff) {
            minDiff = diff;
            bestBlock = b;
          }
        }
      });
      targetBlock = bestBlock;
    } else {
      const candidates: { block: Element, index: number, score: number }[] = [];
      const idealIdx = Math.min(blocks.length - 1, Math.floor((lineIdx / Math.max(1, lines.length)) * blocks.length));
      
      blocks.forEach((b, idx) => {
        const bText = (b.textContent || '').trim();
        if (bText && (bText.includes(cleanLineText) || cleanLineText.includes(bText))) {
          // Weighted score: heavily prioritize position proximity to avoid false positives with repetitive tags
          const posDiff = Math.abs(idx - idealIdx);
          const lenDiff = Math.abs(bText.length - cleanLineText.length);
          const score = (posDiff * 10) + lenDiff;
          candidates.push({ block: b, index: idx, score });
        }
      });
      
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.score - b.score);
        targetBlock = candidates[0].block;
      } else {
        targetBlock = blocks[idealIdx];
      }
    }
    
    if (!targetBlock) return { node: container, offset: 0 };
    
    let charAcc = 0;
    let foundNode: Node | null = null;
    let foundOffset = 0;
    let lastTextNode: Node | null = null;
    let lastTextLen = 0;
    
    const walk = (node: Node) => {
      if (foundNode) return;
      if (node.nodeType === Node.TEXT_NODE) {
        lastTextNode = node;
        const text = node.nodeValue || '';
        const len = text.length;
        lastTextLen = len;
        if (charAcc + len >= targetOffsetInBlock) {
          foundNode = node;
          foundOffset = Math.max(0, Math.min(targetOffsetInBlock - charAcc, len));
        } else {
          charAcc += len;
        }
      } else if (node.nodeName.toLowerCase() === 'br') {
        charAcc += 1;
      } else {
        for (const child of Array.from(node.childNodes)) {
          walk(child);
          if (foundNode) break;
        }
      }
    };
    
    walk(targetBlock);
    
    if (!foundNode) {
      if (lastTextNode) {
        return { node: lastTextNode, offset: lastTextLen };
      }
      return { node: targetBlock, offset: 0 };
    }
    
    return { node: foundNode, offset: foundOffset };
  };

  const syncCursorMarkdownToVisual = useCallback(async () => {
    try {
      if (!wysiwygRef.current) return;
      
      const pos = cursorPositionRef.current;
      let textContent = useEditorStore.getState().content;
      if (!textContent.endsWith('\n')) {
        textContent += '\n';
      }
      
      const m = getMarked();
      if (!m) return;

      const MARKER_START = '\uE000';
      const MARKER_END = '\uE001';
      let textWithMarkers = textContent;

      if (pos) {
        const safeStart = Math.max(0, Math.min(pos.start, textContent.length));
        const safeEnd = Math.max(0, Math.min(pos.end, textContent.length));
        if (safeStart === safeEnd) {
          textWithMarkers = textContent.slice(0, safeStart) + MARKER_START + textContent.slice(safeStart);
        } else {
          const first = Math.min(safeStart, safeEnd);
          const second = Math.max(safeStart, safeEnd);
          textWithMarkers = textContent.slice(0, first) + MARKER_START + textContent.slice(first, second) + MARKER_END + textContent.slice(second);
        }
      }

      const processed = processContentForSteem(textWithMarkers);
      let rawHtml = await m.parse(processed);
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawHtml;

      // Convert inline-intended divs back to spans for the visual editor
      tempDiv.querySelectorAll('div.phishy, div.text-blue, div.text-green').forEach(div => {
         const span = document.createElement('span');
         span.className = div.className;
         span.innerHTML = div.innerHTML;
         if (div.parentNode) div.parentNode.replaceChild(span, div);
      });

      // Normalize any loose paragraphs inside list items
      tempDiv.querySelectorAll('li > p:only-child').forEach(p => {
         const parent = p.parentNode;
         if (parent) {
            while (p.firstChild) {
               parent.insertBefore(p.firstChild, p);
            }
            parent.removeChild(p);
         }
      });

      // Normalize bare <br> tags at root level into paragraphs
      Array.from(tempDiv.childNodes).forEach(node => {
         if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            tempDiv.replaceChild(p, node);
         }
      });

      // Clean up formatting whitespace text nodes inside lists and tables so they do not create phantom gaps
      tempDiv.querySelectorAll('ul, ol, table, thead, tbody, tr').forEach(parent => {
        Array.from(parent.childNodes).forEach(child => {
          if (child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()) {
            parent.removeChild(child);
          }
        });
      });
      
      const blockTags = ['TABLE'];

      // Clean up any orphan or non-boundary spacers
      tempDiv.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((spacerEl) => {
         const isTop = spacerEl === tempDiv.firstElementChild && spacerEl.classList.contains('top-spacer');
         const isBottom = spacerEl === tempDiv.lastElementChild && spacerEl.classList.contains('bottom-spacer');
         const text = spacerEl.textContent || '';
         const hasContent = text.trim() !== '' || spacerEl.children.length > 1 || (spacerEl.children.length === 1 && spacerEl.firstElementChild?.tagName !== 'BR');
         if (!isTop && !isBottom) {
            spacerEl.removeAttribute('data-empty');
            spacerEl.removeAttribute('data-placeholder');
            spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
         } else if (hasContent) {
            spacerEl.removeAttribute('data-empty');
            spacerEl.removeAttribute('data-placeholder');
            spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
         }
      });

      // 1. One Top Spacer at the very top of the editor if the first element is a table
      const firstEl = tempDiv.firstElementChild;
      if (firstEl && blockTags.includes(firstEl.tagName) && !firstEl.classList.contains('top-spacer')) {
         if (!tempDiv.querySelector('.top-spacer')) {
            const pBefore = document.createElement('p');
            pBefore.className = 'table-spacer top-spacer';
            pBefore.setAttribute('data-empty', 'true');
            pBefore.setAttribute('data-placeholder', t('newParagraphPlaceholder'));
            pBefore.innerHTML = '<br>';
            tempDiv.insertBefore(pBefore, firstEl);
         }
      }
      
      // 2. One Bottom Spacer at the very bottom of the editor ONLY if last element is a table
      const lastEl = tempDiv.lastElementChild;
      if (lastEl && blockTags.includes(lastEl.tagName) && !lastEl.classList.contains('bottom-spacer')) {
         if (!tempDiv.querySelector('.bottom-spacer')) {
            const pAfter = document.createElement('p');
            pAfter.className = 'table-spacer bottom-spacer';
            pAfter.setAttribute('data-empty', 'true');
            pAfter.setAttribute('data-placeholder', t('newParagraphPlaceholder'));
            pAfter.innerHTML = '<br>';
            tempDiv.appendChild(pAfter);
         }
      }
      
      rawHtml = tempDiv.innerHTML;
      
      // We rely on CSS padding instead of inserting <p><br></p> after block elements
      const trimmedRaw = rawHtml.trim();
      if (trimmedRaw === '') {
        rawHtml = '<p><br></p>';
      }
      
      isSyncingRef.current = true;
      wysiwygRef.current.innerHTML = rawHtml;
      lastSyncContentRef.current = useEditorStore.getState().content;
      isSyncingRef.current = false;
      
      if (pos) {
        const range = document.createRange();
        let rangeSet = false;

        let foundStartNode: Node | null = null;
        let foundStartOffset = 0;
        let foundEndNode: Node | null = null;
        let foundEndOffset = 0;

        const walker = document.createTreeWalker(wysiwygRef.current, NodeFilter.SHOW_TEXT);
        let currentNode = walker.nextNode();
        while (currentNode) {
          const val = currentNode.nodeValue || '';
          const sIdx = val.indexOf(MARKER_START);
          const eIdx = val.indexOf(MARKER_END);

          if (sIdx !== -1 || eIdx !== -1) {
            let cleanVal = val;
            if (sIdx !== -1) {
              foundStartNode = currentNode;
              foundStartOffset = sIdx;
              cleanVal = cleanVal.replace(MARKER_START, '');
            }
            if (eIdx !== -1) {
              foundEndNode = currentNode;
              foundEndOffset = (sIdx !== -1 && sIdx < eIdx) ? eIdx - 1 : eIdx;
              cleanVal = cleanVal.replace(MARKER_END, '');
            }
            currentNode.nodeValue = cleanVal;
          }
          currentNode = walker.nextNode();
        }

        if (foundStartNode) {
          range.setStart(foundStartNode, foundStartOffset);
          if (foundEndNode) {
            range.setEnd(foundEndNode, foundEndOffset);
          } else {
            range.collapse(true);
          }
          rangeSet = true;
        } else {
          // Fallback if marker was inside a stripped tag
          const startTarget = findDomPositionForMarkdownOffset(wysiwygRef.current, textContent, pos.start);
          const endTarget = pos.start !== pos.end ? findDomPositionForMarkdownOffset(wysiwygRef.current, textContent, pos.end) : startTarget;
          
          if (startTarget && endTarget) {
            range.setStart(startTarget.node, startTarget.offset);
            range.setEnd(endTarget.node, endTarget.offset);
            rangeSet = true;
          } else if (startTarget) {
            range.setStart(startTarget.node, startTarget.offset);
            range.collapse(true);
            rangeSet = true;
          }
        }
        
        if (rangeSet) {
          wysiwygRef.current.focus();
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
            savedVisualRangeRef.current = range.cloneRange();
            
            if (pos) {
              useEditorStore.getState().setSelection(pos.start, pos.end);
              const rowColPos = getRowColFromOffset(useEditorStore.getState().content, pos.start);
              useEditorStore.getState().setCursor(rowColPos);
            }

            // Ensure element has active blinking cursor
            wysiwygRef.current.focus({ preventScroll: true });

            scrollCaretIntoView('center');
            
            const images = wysiwygRef.current.querySelectorAll('img');
            images.forEach(img => {
              if (!img.complete) {
                img.addEventListener('load', () => scrollCaretIntoView('center'), { once: true });
              }
            });
            
            const restoreSel = () => {
              if (wysiwygRef.current && savedVisualRangeRef.current) {
                const curSel = window.getSelection();
                if (curSel) {
                  curSel.removeAllRanges();
                  curSel.addRange(savedVisualRangeRef.current);
                }
              }
            };

            setTimeout(() => {
              restoreSel();
              scrollCaretIntoView('center');
            }, 50);
            setTimeout(() => {
              restoreSel();
              scrollCaretIntoView('center');
            }, 150);
            setTimeout(() => {
              restoreSel();
              scrollCaretIntoView('center');
            }, 350);
            setTimeout(() => scrollCaretIntoView('center'), 600);
          }
        }
      } else {
        wysiwygRef.current.focus();
      }
    } catch (e) {
      console.warn('syncCursorMarkdownToVisual error:', e);
    }
  }, [scrollCaretIntoView, t]);

  // Bidirectional sync: sync content to visual editor unless visual editor currently has focus
  useEffect(() => {
    if (isTransitioningModeRef.current) return;
    if (editorMode === 'visual' && wysiwygRef.current && !isEditorFocused && !wysiwygRef.current.contains(document.activeElement) && useEditorStore.getState().content !== lastSyncContentRef.current) {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        if (onDemandSyncEnabled) {
          const isStale = localStorage.getItem('steem_visual_html_is_stale') === 'true';
          const cachedHtml = localStorage.getItem('steem_autosave_temp_visual_html');
          if (cachedHtml && !isStale) {
            isSyncingRef.current = true;
            wysiwygRef.current.innerHTML = cachedHtml;
            lastSyncContentRef.current = useEditorStore.getState().content;
            isSyncingRef.current = false;
            return;
          }
        }
      }
      const renderHtml = async () => {
        const m = getMarked();
        const processed = processContentForSteem(useEditorStore.getState().content);
        if (m) {
          let rawHtml = await m.parse(processed);
          
          // Ensure block elements have spacers so users can arrow out
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = rawHtml;

          // Convert inline-intended divs back to spans for the visual editor
          tempDiv.querySelectorAll('div.phishy, div.text-blue, div.text-green').forEach(div => {
             const span = document.createElement('span');
             span.className = div.className;
             span.innerHTML = div.innerHTML;
             if (div.parentNode) div.parentNode.replaceChild(span, div);
          });

          // Normalize any loose paragraphs inside list items
          tempDiv.querySelectorAll('li > p:only-child').forEach(p => {
             const parent = p.parentNode;
             if (parent) {
                while (p.firstChild) {
                   parent.insertBefore(p.firstChild, p);
                }
                parent.removeChild(p);
             }
          });

          // Normalize bare <br> tags at root level into paragraphs
          Array.from(tempDiv.childNodes).forEach(node => {
             if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                tempDiv.replaceChild(p, node);
             }
          });

          // Clean up formatting whitespace text nodes inside lists and tables so they do not create phantom gaps
          tempDiv.querySelectorAll('ul, ol, table, thead, tbody, tr').forEach(parent => {
            Array.from(parent.childNodes).forEach(child => {
              if (child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()) {
                parent.removeChild(child);
              }
            });
          });
          
          const blockTags = ['TABLE'];

          // Clean up any orphan or non-boundary spacers
          tempDiv.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((spacerEl) => {
             const isTop = spacerEl === tempDiv.firstElementChild && spacerEl.classList.contains('top-spacer');
             const isBottom = spacerEl === tempDiv.lastElementChild && spacerEl.classList.contains('bottom-spacer');
             const text = spacerEl.textContent || '';
             const hasContent = text.trim() !== '' || spacerEl.children.length > 1 || (spacerEl.children.length === 1 && spacerEl.firstElementChild?.tagName !== 'BR');
             if (!isTop && !isBottom) {
                spacerEl.removeAttribute('data-empty');
                spacerEl.removeAttribute('data-placeholder');
                spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
             } else if (hasContent) {
                spacerEl.removeAttribute('data-empty');
                spacerEl.removeAttribute('data-placeholder');
                spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
             }
          });

          // 1. One Top Spacer at the very top of the editor if the first element is a block element
          const firstEl = tempDiv.firstElementChild;
          if (firstEl && blockTags.includes(firstEl.tagName) && !firstEl.classList.contains('top-spacer')) {
             if (!tempDiv.querySelector('.top-spacer')) {
                const pBefore = document.createElement('p');
                pBefore.className = 'table-spacer top-spacer';
                pBefore.setAttribute('data-empty', 'true');
                pBefore.setAttribute('data-placeholder', lang === 'uk' ? '↵ Новий параграф...' : lang === 'es' ? '↵ Nuevo párrafo...' : lang === 'ko' ? '↵ 새 문단...' : '↵ New paragraph...');
                pBefore.innerHTML = '<br>';
                tempDiv.insertBefore(pBefore, firstEl);
             }
          }
          
          // 2. One Bottom Spacer at the very bottom of the editor ONLY if last element is a block element
          const lastEl = tempDiv.lastElementChild;
          if (lastEl && blockTags.includes(lastEl.tagName) && !lastEl.classList.contains('bottom-spacer')) {
             if (!tempDiv.querySelector('.bottom-spacer')) {
                const pAfter = document.createElement('p');
                pAfter.className = 'table-spacer bottom-spacer';
                pAfter.setAttribute('data-empty', 'true');
                pAfter.setAttribute('data-placeholder', lang === 'uk' ? '↵ Новий параграф...' : lang === 'es' ? '↵ Nuevo párrafo...' : lang === 'ko' ? '↵ 새 문단...' : '↵ New paragraph...');
                pAfter.innerHTML = '<br>';
                tempDiv.appendChild(pAfter);
             }
          }
          
          rawHtml = tempDiv.innerHTML;
          
          // We rely on CSS padding instead of inserting <p><br></p> after block elements
          const trimmedRaw = rawHtml.trim();
          if (trimmedRaw === '') {
            rawHtml = '<p><br></p>';
          }
          if (wysiwygRef.current && lastSyncContentRef.current !== useEditorStore.getState().content && wysiwygRef.current.innerHTML !== rawHtml) {
            isSyncingRef.current = true;
            wysiwygRef.current.innerHTML = rawHtml;
            lastSyncContentRef.current = useEditorStore.getState().content;
            isSyncingRef.current = false;
            localStorage.setItem('steem_autosave_temp_visual_html', rawHtml);
            localStorage.setItem('steem_visual_html_is_stale', 'false');

            if (!hasRestoredInitialCursorRef.current) {
              hasRestoredInitialCursorRef.current = true;
              syncCursorMarkdownToVisual().then(() => {
                if (wysiwygRef.current) wysiwygRef.current.focus();
              });
            }
          }
        }
      };
      renderHtml();
    }
  }, [ editorMode, isEditorFocused, syncCursorMarkdownToVisual, lang, onDemandSyncEnabled]);

  // Keep visual editor empty placeholder state dynamically synchronized
  useEffect(() => {
    if (editorMode !== 'visual' || !wysiwygRef.current) return;
    const el = wysiwygRef.current;

    updateWysiwygEmptyStatus(el);

    const observer = new MutationObserver(() => {
      updateWysiwygEmptyStatus(el);
    });

    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [editorMode, updateWysiwygEmptyStatus]);

  // Load cursor position on start
  useEffect(() => {
     try {
        const savedCursor = localStorage.getItem('steem_editor_cursor');
        if (savedCursor) {
            const parsed = JSON.parse(savedCursor);
            cursorPositionRef.current = parsed;
            if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
              useEditorStore.getState().setSelection(parsed.start, parsed.end);
            }
        }
     } catch (e) {
        console.error("Failed to load cursor position", e);
     }
  }, []);

  const [isMiniGalleryOpen, setIsMiniGalleryOpen] = useState(false);
  const [justInsertedUrl, setJustInsertedUrl] = useState<string | null>(null);

  const hasRestoredInitialCursorRef = useRef(false);

  const saveCursorPosition = useCallback(() => {
     if (isTransitioningModeRef.current || isSyncingRef.current) return;
     if (editorRef.current) {
        const start = editorRef.current.selectionStart;
        const end = editorRef.current.selectionEnd;
        if (start === null || end === null || start === undefined || end === undefined) return;
        const pos = {
           start,
           end
        };
        cursorPositionRef.current = pos;
        try {
          localStorage.setItem('steem_editor_cursor', JSON.stringify(pos));
        } catch (err) {
          console.warn('Failed to save cursor position:', err);
        }

        // Sync content and Zustand store (in-memory only, disk persistence is debounced)
        const text = editorRef.current.value;
        const rowColPos = getRowColFromOffset(text, start);
        useEditorStore.getState().setCursor(rowColPos);
        useEditorStore.getState().setSelection(start, end);

        if (editorMode === 'markdown') {
          const caretPos = start;
          const selEnd = end;

          const lineStart = text.lastIndexOf('\n', caretPos - 1) + 1;
          const lineEnd = text.indexOf('\n', caretPos);
          const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;

          const currentLine = text.substring(lineStart, actualLineEnd);
          const caretInLine = caretPos - lineStart;
          const selEndInLine = Math.min(actualLineEnd, selEnd) - lineStart;

          const newFormats = {
            bold: isInsideTagInLine(currentLine, caretInLine, '**', selEndInLine),
            italic: isInsideTagInLine(currentLine, caretInLine, '*', selEndInLine),
            code: isInsideTagInLine(currentLine, caretInLine, '`', selEndInLine),
            strikethrough: isInsideTagInLine(currentLine, caretInLine, '~~', selEndInLine),
            sub: isInsideTagInLine(currentLine, caretInLine, '<sub>', selEndInLine),
            sup: isInsideTagInLine(currentLine, caretInLine, '<sup>', selEndInLine),
            phishy: isInsideTagInLine(currentLine, caretInLine, '<div class="phishy">', selEndInLine)
          };

          setActiveFormats(prev => {
            if (
              prev.bold === newFormats.bold &&
              prev.italic === newFormats.italic &&
              prev.code === newFormats.code &&
              prev.strikethrough === newFormats.strikethrough &&
              prev.sub === newFormats.sub &&
              prev.sup === newFormats.sup &&
              prev.phishy === newFormats.phishy
            ) {
              return prev;
            }
            return newFormats;
          });
        }
     }
  }, [editorMode]);

  const restoreMarkdownCursorAndScroll = useCallback((retryCount = 0, forceScrollToCaret = false) => {
    if (!editorRef.current) {
      if (retryCount < 15) {
        setTimeout(() => restoreMarkdownCursorAndScroll(retryCount + 1, forceScrollToCaret), 30);
      }
      return;
    }

    try {
      const ta = editorRef.current;
      const textVal = useEditorStore.getState().content;
      
      // Ensure the textarea has the correct value
      if (ta.value !== textVal) {
        ta.value = textVal;
      }

      // Get saved cursor position
      let start = 0;
      let end = 0;
      if (cursorPositionRef.current) {
        start = cursorPositionRef.current.start;
        end = cursorPositionRef.current.end;
      } else {
        const saved = localStorage.getItem('steem_editor_cursor');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
            start = parsed.start;
            end = parsed.end;
            cursorPositionRef.current = parsed;
          }
        }
      }

      const safeStart = Math.min(Math.max(0, start), textVal.length);
      const safeEnd = Math.min(Math.max(0, end), textVal.length);

      isSyncingRef.current = true;
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(safeStart, safeEnd);

      // Sync to Zustand store
      const rowColPos = getRowColFromOffset(textVal, safeStart);
      useEditorStore.getState().setCursor(rowColPos);
      useEditorStore.getState().setSelection(safeStart, safeEnd);

      // Restore scroll position
      const savedScroll = localStorage.getItem('steem_editor_scroll');
      if (!forceScrollToCaret && savedScroll !== null) {
        const scrollTop = Number(savedScroll);
        if (!isNaN(scrollTop) && scrollTop > 0) {
          ta.scrollTop = scrollTop;
        } else {
          // Fallback to scroll calculating from caretY
          const clone = ta.cloneNode() as HTMLTextAreaElement;
          clone.style.visibility = 'hidden';
          clone.style.position = 'absolute';
          clone.style.overflow = 'hidden';
          clone.style.height = '0px';
          clone.style.width = ta.clientWidth + 'px';
          clone.style.padding = window.getComputedStyle(ta).padding;
          clone.style.paddingBottom = '0px';
          clone.style.font = window.getComputedStyle(ta).font;
          clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;
          clone.style.boxSizing = 'border-box';
          clone.value = textVal.substring(0, safeStart);
          document.body.appendChild(clone);
          
          const caretY = clone.scrollHeight;
          document.body.removeChild(clone);
          const isMobileScreen = window.innerWidth < 1024;
          const dynamicWidgetHeight = toolbarIconSize + 24;
          const bottomReserved = isMobileScreen 
              ? (isKeyboardOpen ? (dynamicWidgetHeight + 45) : (dynamicWidgetHeight + 90)) 
              : (widgetPos === 'bottom' ? (dynamicWidgetHeight + 60) : 40);
          const visH = Math.max(100, ta.clientHeight - bottomReserved);
          ta.scrollTop = Math.max(0, caretY - (visH / 2));
        }
      } else {
        // Compute from caretY
        const clone = ta.cloneNode() as HTMLTextAreaElement;
        clone.style.visibility = 'hidden';
        clone.style.position = 'absolute';
        clone.style.overflow = 'hidden';
        clone.style.height = '0px';
        clone.style.width = ta.clientWidth + 'px';
        clone.style.padding = window.getComputedStyle(ta).padding;
        clone.style.paddingBottom = '0px';
        clone.style.font = window.getComputedStyle(ta).font;
        clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;
        clone.style.boxSizing = 'border-box';
        clone.value = textVal.substring(0, safeStart);
        document.body.appendChild(clone);
        
        const caretY = clone.scrollHeight;
        document.body.removeChild(clone);
        const isMobileScreen = window.innerWidth < 1024;
        const dynamicWidgetHeight = toolbarIconSize + 24;
        const bottomReserved = isMobileScreen 
            ? (isKeyboardOpen ? (dynamicWidgetHeight + 45) : (dynamicWidgetHeight + 90)) 
            : (widgetPos === 'bottom' ? (dynamicWidgetHeight + 60) : 40);
        const visH = Math.max(100, ta.clientHeight - bottomReserved);
        ta.scrollTop = Math.max(0, caretY - (visH / 2));
      }

      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    } catch (e) {
      console.warn('restoreMarkdownCursorAndScroll failed:', e);
      isSyncingRef.current = false;
    }
  }, [isKeyboardOpen, widgetPos, toolbarIconSize]);

  const syncCursorVisualToMarkdown = useCallback(() => {
    try {
      let range: Range | null = null;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && wysiwygRef.current && wysiwygRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        range = sel.getRangeAt(0);
      } else if (savedVisualRangeRef.current && wysiwygRef.current && wysiwygRef.current.contains(savedVisualRangeRef.current.commonAncestorContainer)) {
        range = savedVisualRangeRef.current;
      }

      if (range && wysiwygRef.current) {
        // Create an exact temporary clone to insert marker elements BEFORE any modifications
        const clonedWysiwyg = wysiwygRef.current.cloneNode(true) as HTMLElement;

        const pathStart = getNodePath(wysiwygRef.current, range.startContainer);
        const pathEnd = getNodePath(wysiwygRef.current, range.endContainer);
        
        if (pathStart && pathEnd) {
          const clonedStartNode = getNodeByPath(clonedWysiwyg, pathStart);
          const clonedEndNode = getNodeByPath(clonedWysiwyg, pathEnd);
          
          if (clonedStartNode && clonedEndNode) {
            try {
              if (clonedStartNode === clonedEndNode && clonedStartNode.nodeType === Node.TEXT_NODE) {
                  const text = clonedStartNode.nodeValue || '';
                  const sOff = Math.min(range.startOffset, text.length);
                  const eOff = Math.min(range.endOffset, text.length);
                  clonedStartNode.nodeValue = text.slice(0, sOff) + '\x01' + text.slice(sOff, eOff) + '\x02' + text.slice(eOff);
              } else {
                  if (clonedEndNode.nodeType === Node.TEXT_NODE) {
                      const text = clonedEndNode.nodeValue || '';
                      const eOff = Math.min(range.endOffset, text.length);
                      clonedEndNode.nodeValue = text.slice(0, eOff) + '\x02' + text.slice(eOff);
                  } else {
                      const idx = Math.min(range.endOffset, clonedEndNode.childNodes.length);
                      clonedEndNode.insertBefore(document.createTextNode('\x02'), clonedEndNode.childNodes[idx] || null);
                  }
                  
                  if (clonedStartNode.nodeType === Node.TEXT_NODE) {
                      const text = clonedStartNode.nodeValue || '';
                      const sOff = Math.min(range.startOffset, text.length);
                      clonedStartNode.nodeValue = text.slice(0, sOff) + '\x01' + text.slice(sOff);
                  } else {
                      const idx = Math.min(range.startOffset, clonedStartNode.childNodes.length);
                      clonedStartNode.insertBefore(document.createTextNode('\x01'), clonedStartNode.childNodes[idx] || null);
                  }
              }
              
              // Clean any auxiliary elements or indicators from the clone ONLY after markers are securely inserted
              clonedWysiwyg.querySelectorAll('.table-controls, .col-resizer, .row-resizer, [data-ignore-sync]').forEach(el => el.remove());
              
              clonedWysiwyg.querySelectorAll('.table-spacer, [data-placeholder]').forEach(spacer => {
                if ((spacer.textContent || '').trim() === '' && (!spacer.children.length || (spacer.children.length === 1 && spacer.firstElementChild?.tagName === 'BR'))) {
                  spacer.className = '';
                  spacer.removeAttribute('data-placeholder');
                  spacer.removeAttribute('data-empty');
                }
              });

              const htmlWithMarkers = clonedWysiwyg.innerHTML;
              const rawMd = htmlToMarkdown(htmlWithMarkers);
              
              const startIdx = rawMd.indexOf('\x01');
              const cleanMdAfterStart = rawMd.replace('\x01', '');
              const endIdx = cleanMdAfterStart.indexOf('\x02');
              
              if (startIdx !== -1 && endIdx !== -1) {
                const cleanMd = cleanMdAfterStart.replace('\x02', '');
                const pos = { start: startIdx, end: endIdx };
                cursorPositionRef.current = pos;
                localStorage.setItem('steem_editor_cursor', JSON.stringify(pos));
                
                // Sync to Zustand store
                const rowColPos = getRowColFromOffset(cleanMd, startIdx);
                useEditorStore.getState().setCursor(rowColPos);
                useEditorStore.getState().setSelection(startIdx, endIdx);
                return { start: startIdx, end: endIdx, md: cleanMd };
              } else if (startIdx !== -1) {
                const cleanMd = cleanMdAfterStart;
                const pos = { start: startIdx, end: startIdx };
                cursorPositionRef.current = pos;
                localStorage.setItem('steem_editor_cursor', JSON.stringify(pos));
                
                // Sync to Zustand store
                const rowColPos = getRowColFromOffset(cleanMd, startIdx);
                useEditorStore.getState().setCursor(rowColPos);
                useEditorStore.getState().setSelection(startIdx, startIdx);
                return { start: startIdx, end: startIdx, md: cleanMd };
              }
            } catch (e) {
              console.warn("Failed to apply range on cloned DOM", e);
            }
          }
        }
      }
    } catch (e) {
      console.warn('syncCursorVisualToMarkdown error:', e);
    }
    return null;
  }, []);

  // Automatic Cursor & Scroll Position Restoration after page reload
  useEffect(() => {
    if (hasRestoredInitialCursorRef.current) return;

    const getPos = () => {
      if (cursorPositionRef.current) return cursorPositionRef.current;
      try {
        const saved = localStorage.getItem('steem_editor_cursor');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
            cursorPositionRef.current = parsed;
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved cursor in restoration effect', e);
      }
      return null;
    };

    if (editorMode === 'markdown') {
      hasRestoredInitialCursorRef.current = true;
      restoreMarkdownCursorAndScroll();
    } else if (editorMode === 'visual' && wysiwygRef.current) {
      hasRestoredInitialCursorRef.current = true;
      const timer = setTimeout(async () => {
        const pos = getPos();
        if (pos) {
          useEditorStore.getState().setSelection(pos.start, pos.end);
          await syncCursorMarkdownToVisual();
          if (wysiwygRef.current) {
            wysiwygRef.current.focus();
          }
        } else if (wysiwygRef.current) {
          wysiwygRef.current.focus();
        }

        const savedScroll = localStorage.getItem('steem_editor_scroll');
        if (savedScroll !== null && wysiwygRef.current) {
          const scrollTop = Number(savedScroll);
          if (!isNaN(scrollTop) && scrollTop > 0) {
            wysiwygRef.current.scrollTop = scrollTop;
          }
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [editorMode, syncCursorMarkdownToVisual, restoreMarkdownCursorAndScroll]);

  const handleSetEditorMode = useCallback((mode: 'visual' | 'markdown') => {
    if (editorMode === mode) return;

    isTransitioningModeRef.current = true;
    hasRestoredInitialCursorRef.current = true;
    localStorage.setItem('steem_editor_mode', mode);

    // Immediately reset active formats to prevent phantom button highlighting during transition
    setActiveFormats({
      bold: false,
      italic: false,
      code: false,
      strikethrough: false,
      sub: false,
      sup: false,
      phishy: false
    });

    if (mode === 'visual') {
      let start = 0;
      let end = 0;
      let val = useEditorStore.getState().content;

      if (editorRef.current) {
        val = editorRef.current.value;
        start = editorRef.current.selectionStart ?? 0;
        end = editorRef.current.selectionEnd ?? start;
      } else if (cursorPositionRef.current) {
        start = cursorPositionRef.current.start;
        end = cursorPositionRef.current.end;
      }

      const pos = getRowColFromOffset(val, start);
      const cursorObj = { start, end };
      cursorPositionRef.current = cursorObj;
      try {
        localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorObj));
      } catch {
        /* ignore storage error */
      }

      useEditorStore.setState({
        content: val,
        cursor: pos,
        selectionStart: start,
        selectionEnd: end
      });

      saveCursorPosition();

      // Update lastSyncContentRef so background useEffect won't trigger another innerHTML wipe
      lastSyncContentRef.current = val;
      setEditorMode('visual');

      setTimeout(async () => {
        try {
          await syncCursorMarkdownToVisual();
          if (wysiwygRef.current) {
            wysiwygRef.current.focus({ preventScroll: true });
            saveVisualSelection();
          }
        } finally {
          setTimeout(() => {
            isTransitioningModeRef.current = false;
          }, 300);
        }
      }, 50);
    } else {
      saveVisualSelection();
      isSyncingRef.current = true;
      const syncResult = syncCursorVisualToMarkdown();

      // Always synchronize when switching from visual to markdown code
      if (syncResult && syncResult.md) {
        if (syncResult.md !== useEditorStore.getState().content) {
          setContent(syncResult.md);
        }
      } else if (wysiwygRef.current) {
        const md = htmlToMarkdown(wysiwygRef.current.innerHTML);
        if (md !== useEditorStore.getState().content) {
          setContent(md);
        }
      }
      localStorage.removeItem('steem_editor_scroll');
      setEditorMode('markdown');

      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            restoreMarkdownCursorAndScroll(0, true);
          } finally {
            setTimeout(() => {
              isTransitioningModeRef.current = false;
              isSyncingRef.current = false;
            }, 250);
          }
        }, 50);
      });
    }
  }, [editorMode, saveCursorPosition, syncCursorMarkdownToVisual, syncCursorVisualToMarkdown, saveVisualSelection, setContent, restoreMarkdownCursorAndScroll]);

  // Save cursor position when unmounting or switching view
  useEffect(() => {
    return () => saveCursorPosition();
  }, [saveCursorPosition]);

  useEffect(() => {
    if (activeView === 'editor' && activeMobileTab === 'editor') {
       if (isTransitioningModeRef.current) return;
       setTimeout(() => {
          if (isTransitioningModeRef.current) return;
          if (editorMode === 'visual') {
             restoreVisualSelection();
          } else {
             restoreMarkdownCursorAndScroll();
             return;
          }
          if (editorRef.current) {
             const cursor = useEditorStore.getState().cursor;
             if (cursor) {
               const text = editorRef.current.value;
               const offset = getOffsetFromRowCol(text, cursor);
               
               // Ensure we prevent user event handlers from overwriting while setting programmatic focus/selection
               isSyncingRef.current = true;
               
               // Cross-browser reliable cursor positioning
               const ta = editorRef.current;
               ta.focus();
               ta.setSelectionRange(offset, offset);
               
               // Robust Y-axis scroll calculation using a hidden clone
                const clone = ta.cloneNode() as HTMLTextAreaElement;
                clone.style.visibility = 'hidden';
                clone.style.position = 'absolute';
                clone.style.overflow = 'hidden';
                clone.style.height = '0px'; // Force scrollHeight to equal content height
                clone.style.width = ta.clientWidth + 'px';
                clone.style.padding = window.getComputedStyle(ta).padding;
                clone.style.paddingBottom = '0px'; // Ignore bottom padding for caret Y coord
                clone.style.font = window.getComputedStyle(ta).font;
                clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;
                clone.style.boxSizing = 'border-box';
                clone.value = text.substring(0, offset);
                document.body.appendChild(clone);
                
                const caretY = clone.scrollHeight;
                document.body.removeChild(clone);
                
                // Scroll so the caret is in the upper-middle of the visible screen above widget
                const isMobileScreen = window.innerWidth < 1024;
                const dynamicWidgetHeight = toolbarIconSize + 24;
                const bottomReserved = isMobileScreen 
                    ? (isKeyboardOpen ? (dynamicWidgetHeight + 45) : (dynamicWidgetHeight + 90)) 
                    : (widgetPos === 'bottom' ? (dynamicWidgetHeight + 60) : 40);
                const visH = Math.max(100, ta.clientHeight - bottomReserved);
                ta.scrollTop = Math.max(0, caretY - (visH / 2));
                
                // Reset sync flag after a brief timeout so that user actions are once again captured
                setTimeout(() => {
                  isSyncingRef.current = false;
                }, 100);
             } else {
               isSyncingRef.current = false;
             }
          } else {
             isSyncingRef.current = false;
          }
       }, 150);
    } else {
       saveVisualSelection();
       saveCursorPosition();
       isSyncingRef.current = false;
    }
  }, [activeView, activeMobileTab, editorMode, saveCursorPosition, restoreVisualSelection, saveVisualSelection, restoreMarkdownCursorAndScroll, isKeyboardOpen, widgetPos, toolbarIconSize]);

  useEffect(() => {
    if (isImagesLoaded.current) {
      localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
      localStorage.setItem('steem_editor_source_links', sourceInput);
      localStorage.setItem('steem_image_format', imageInsertFormat);
      localStorage.setItem('steem_text_wrap', String(isTextWrapEnabled));
    }
  }, [images, sourceInput, imageInsertFormat, isTextWrapEnabled]);

  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY_AUTOSAVE) || sessionStorage.getItem(STORAGE_KEY_AUTOSAVE);
    } catch (err) {
      console.debug(err);
    }
    if (saved) setContent(saved);
    
    const savedUser = localStorage.getItem('steem_username');
    if (savedUser) setUsername(savedUser);

    const savedTpls = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (savedTpls) setTemplates(JSON.parse(savedTpls));

    const savedMentions = localStorage.getItem(STORAGE_KEY_USERS);
    if (savedMentions) setMentions(Array.from(new Set(JSON.parse(savedMentions))));

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth !== lastWidth.current) {
        if (currentWidth < 1024) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
        lastWidth.current = currentWidth;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setContent]);

  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
  const [activeTableRow, setActiveTableRow] = useState<HTMLTableRowElement | null>(null);
  const [activeTableCell, setActiveTableCell] = useState<HTMLTableCellElement | null>(null);
  
  const activeTableRef = useRef<HTMLTableElement | null>(null);
  const activeTableRowRef = useRef<HTMLTableRowElement | null>(null);
  const activeTableCellRef = useRef<HTMLTableCellElement | null>(null);

  const [tableRect, setTableRect] = useState<DOMRect | null>(null);
  const [isTableMenuExpanded, setIsTableMenuExpanded] = useState(false);
  const [isTableMenuPinned, setIsTableMenuPinned] = useState(() => {
    return localStorage.getItem('steem_table_menu_pinned') === 'true';
  });

  const updateTableRect = useCallback(() => {
    if (activeTable) {
      setTableRect(activeTable.getBoundingClientRect());
    } else {
      setTableRect(null);
    }
  }, [activeTable]);

  useEffect(() => {
    updateTableRect();
    window.addEventListener('resize', updateTableRect);
    const scrollContainer = wysiwygRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateTableRect);
    }
    return () => {
      window.removeEventListener('resize', updateTableRect);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updateTableRect);
      }
    };
  }, [updateTableRect, activeTable]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorMode === 'visual') {
        saveVisualSelection();
        if (wysiwygRef.current) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            try {
              const range = sel.getRangeAt(0);
              if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
                savedVisualRangeRef.current = range.cloneRange();
                
                let node: Node | null = range.commonAncestorContainer;
                if (node.nodeType === 3) node = node.parentNode;
                const table = ((node as Element)?.closest?.('table') as HTMLTableElement) || null;
                const row = ((node as Element)?.closest?.('tr') as HTMLTableRowElement) || null;
                const cell = ((node as Element)?.closest?.('td, th') as HTMLTableCellElement) || null;

                if (activeTableRef.current !== table) {
                  activeTableRef.current = table;
                  setActiveTable(table);
                }
                if (activeTableRowRef.current !== row) {
                  activeTableRowRef.current = row;
                  setActiveTableRow(row);
                }
                if (activeTableCellRef.current !== cell) {
                  activeTableCellRef.current = cell;
                  setActiveTableCell(cell);
                }
              } else {
                if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
                if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
                if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
              }
            } catch {
              if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
              if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
              if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
            }
          } else {
            if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
            if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
            if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
          }
        }
      } else if (editorMode === 'markdown') {
        saveCursorPosition();
        if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
        if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
        if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editorMode, saveVisualSelection, saveCursorPosition]);

  useEffect(() => {
    // DEBOUNCED PERSISTENCE: Fast 350ms save to storage so state and cursor match without blocking UI thread during typing
    let timer: any;
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      if (state.content !== prevState.content) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, state.content);
          if (cursorPositionRef.current) {
            try {
              localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorPositionRef.current));
            } catch (err) {
              console.debug(err);
            }
          }
          if (editorMode === 'markdown') {
            try {
              localStorage.setItem('steem_visual_html_is_stale', 'true');
            } catch (err) {
              console.debug(err);
            }
          }
        }, 350);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [editorMode, saveLargeStorage]);

  // Synchronous flush on page reload / unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        if (editorMode === 'markdown' && editorRef.current) {
          const val = editorRef.current.value;
          useEditorStore.setState({ content: val });
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, val);
          saveCursorPosition();
        } else if (editorMode === 'visual' && wysiwygRef.current) {
          const html = wysiwygRef.current.innerHTML;
          try {
            localStorage.setItem('steem_autosave_temp_visual_html', html);
          } catch (err) {
            console.debug(err);
          }
          const md = htmlToMarkdown(html);
          useEditorStore.setState({ content: md });
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, md);
          saveVisualSelection();
          syncCursorVisualToMarkdown();
          if (cursorPositionRef.current) {
            try {
              localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorPositionRef.current));
            } catch (err) {
              console.debug(err);
            }
          }
        } else {
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, useEditorStore.getState().content);
          saveCursorPosition();
        }
      } catch (err) {
        console.warn('Error flushing autosave state before unload:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editorMode, saveCursorPosition, saveVisualSelection, syncCursorVisualToMarkdown, saveLargeStorage]);

  const handleEditorScroll = useCallback(() => {
    if (editorRef.current) {
      localStorage.setItem('steem_editor_scroll', String(editorRef.current.scrollTop));
    }
    if (!syncScrollEnabled) return;
    const editor = editorRef.current;
    const preview = previewPaneRef.current;
    if (editor && preview) {
      const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    }
  }, [syncScrollEnabled]);

  // OFF-THREAD WEB WORKER: Process stats and clean text metrics off the main UI thread!
  const handleWorkerStats = useCallback((rawStats: { words: number; chars: number }, cleanStatsResult: { words: number; chars: number }) => {
    useEditorStore.getState().setStats(rawStats, cleanStatsResult);
  }, []);

  useEditorWorker(handleWorkerStats);

  useEffect(() => {
    localStorage.setItem('steem_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('steem_tag_groups', JSON.stringify(tagGroups));
  }, [tagGroups]);

  // --- Logic ---
  const getSelectionOrWord = useCallback(() => {
    const content = useEditorStore.getState().content;
    if (!editorRef.current) return { s: 0, e: 0, text: '' };
    const s = editorRef.current.selectionStart;
    const e = editorRef.current.selectionEnd;
    if (s !== e) return { s, e, text: content.substring(s, e) };
    
    let start = s;
    let end = e;
    while (start > 0 && !/[\s\n]/.test(content[start - 1])) start--;
    while (end < content.length && !/[\s\n]/.test(content[end])) end++;
    return { s: start, e: end, text: content.substring(start, end) };
  }, []);

  const insertAtCursor = useCallback((text: string, selectionMode: 'end' | 'select' = 'end') => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      const runParse = async () => {
        const m = getMarked();
        if (m) {
          const html = await m.parse(text);
          insertHtmlAtCursor(html);
        } else {
          insertHtmlAtCursor(text);
        }
      };
      runParse();
      return;
    }

    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const scrollTop = editorRef.current.scrollTop;
    const scrollLeft = editorRef.current.scrollLeft;
    
    const finalText = text;

    const newContent = content.substring(0, start) + finalText + content.substring(end);
    setContent(newContent);
    
    setTimeout(() => {
      if (!editorRef.current) return;
      if (selectionMode === 'select') {
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start, start + finalText.length);
      } else {
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start + finalText.length, start + finalText.length);
      }
      editorRef.current.scrollTop = scrollTop;
      editorRef.current.scrollLeft = scrollLeft;
    }, 0);
  }, [ editorMode, insertHtmlAtCursor, setContent]);

  useEffect(() => {
    // Timer removed as per user request to hide only on typing
  }, [isEditorFocused, isWidgetVisible]);

  const widgetRef = useRef<HTMLDivElement>(null);
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');
  const [lockedToolsWidth, setLockedToolsWidth] = useState<number | null>(null);

  useEffect(() => {
    if (isWidgetMenuOpen && widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setMenuDirection(rect.top < 350 ? 'down' : 'up');
    }
  }, [isWidgetMenuOpen]);

  const showWidget = useCallback((x: number, y: number) => {
    if (widgetPos === 'hidden') return;
    if (widgetPos !== 'floating') {
      if (!isWidgetVisible) setIsWidgetVisible(true);
      return;
    }

    setFloatingPos({ x, y });
    if (!isWidgetVisible) setIsWidgetVisible(true);
  }, [widgetPos, isWidgetVisible]);

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    

    if (e.key === 'Enter') {
      if (!editorRef.current) return;
      const textarea = editorRef.current;
      const text = textarea.value;
      const caretPos = textarea.selectionStart;

      const lineStart = text.lastIndexOf('\n', caretPos - 1) + 1;
      const lineEnd = text.indexOf('\n', caretPos);
      const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
      const currentLine = text.slice(lineStart, actualLineEnd);
      const caretInLine = caretPos - lineStart;

      // 1. Identify quote or list prefix
      const quoteMatch = currentLine.match(/^(\s*>+\s*)/);
      const unorderedListMatch = currentLine.match(/^(\s*[-*+]\s+(?:\[[ xX]\]\s+)?)/);
      const orderedListMatch = currentLine.match(/^(\s*)(\d+)([.)]\s+)/);

      const cleanLineTrimmed = currentLine.trim();

      // Check if this line is an empty list or quote item
      const isEmptyUnorderedList = cleanLineTrimmed === '-' || cleanLineTrimmed === '*' || cleanLineTrimmed === '+' ||
        cleanLineTrimmed === '- [ ]' || cleanLineTrimmed === '- [x]' || cleanLineTrimmed === '- [X]';
      const isEmptyOrderedList = orderedListMatch && (cleanLineTrimmed === `${orderedListMatch[2]}.` || cleanLineTrimmed === `${orderedListMatch[2]}`);
      const isEmptyQuote = cleanLineTrimmed === '>';

      if (isEmptyUnorderedList || isEmptyOrderedList || isEmptyQuote) {
        e.preventDefault();
        const before = text.slice(0, lineStart);
        const after = text.slice(actualLineEnd);
        const newText = before + '\n' + after;
        const newCaretPos = lineStart + 1;
        setContent(newText);
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true });
          editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
        return;
      }

      let listPrefix = '';
      if (quoteMatch) {
        listPrefix = quoteMatch[0];
      } else if (unorderedListMatch) {
        listPrefix = unorderedListMatch[0];
        if (listPrefix.includes('[x]')) listPrefix = listPrefix.replace('[x]', '[ ]');
        else if (listPrefix.includes('[X]')) listPrefix = listPrefix.replace('[X]', '[ ]');
      } else if (orderedListMatch) {
        const indent = orderedListMatch[1];
        const num = parseInt(orderedListMatch[2], 10);
        const delimiter = orderedListMatch[3];
        listPrefix = indent + (num + 1) + delimiter;
      }

      // 2. Check if caret is inside an active inline formatting tag in the current line
      const activeRange = getActiveFormatRangeInLine(currentLine, caretInLine);

      if (activeRange) {
        e.preventDefault();
        const { openTag, closeTag, openIdx, closeIdx, contentStart, contentEnd, formatKey } = activeRange;
        const insideText = currentLine.slice(contentStart, contentEnd);
        const trimmedInside = insideText.trim();
        const leadingSpaces = insideText.slice(0, insideText.length - insideText.trimStart().length);
        const trailingSpaces = insideText.slice(insideText.trimEnd().length);

        // Case A: Empty formatting tag (e.g. *|* or **|** or **   **) -> cancel formatting and start clean line
        if (trimmedInside.length === 0) {
          const beforeTag = currentLine.slice(0, openIdx);
          const afterTag = currentLine.slice(closeIdx + closeTag.length);
          const cleanedCurrentLine = beforeTag + insideText + afterTag;

          const beforeDoc = text.slice(0, lineStart);
          const afterDoc = text.slice(actualLineEnd);

          const newText = beforeDoc + cleanedCurrentLine + '\n' + listPrefix + afterDoc;
          const newCaretPos = lineStart + cleanedCurrentLine.length + 1 + listPrefix.length;

          setContent(newText);
          setActiveFormats(prev => ({ ...prev, [formatKey]: false }));
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true });
            editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
          return;
        }

        // Case B: Caret is at the end of formatted content (e.g. *курсор текст|*) -> close tag tightly and continue onto new line
        if (caretInLine >= contentEnd) {
          const beforeTag = currentLine.slice(0, openIdx);
          const afterTag = currentLine.slice(closeIdx + closeTag.length);

          const beforeDoc = text.slice(0, lineStart);
          const afterDoc = text.slice(actualLineEnd);

          const line1 = beforeTag + leadingSpaces + openTag + trimmedInside + closeTag + trailingSpaces + afterTag;
          const line2 = listPrefix + openTag + closeTag;
          const newText = beforeDoc + line1 + '\n' + line2 + afterDoc;
          const newCaretPos = lineStart + line1.length + 1 + listPrefix.length + openTag.length;

          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true });
            editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
          return;
        }

        // Case C: Caret is in the middle of formatted text (e.g. *перша частина| друга частина*) -> split tags cleanly and tightly
        if (caretInLine > contentStart && caretInLine < contentEnd) {
          const textBeforeCaretInTag = currentLine.slice(openIdx + openTag.length, caretInLine);
          const textAfterCaretInTag = currentLine.slice(caretInLine, closeIdx);
          const beforeTag = currentLine.slice(0, openIdx);
          const afterTag = currentLine.slice(closeIdx + closeTag.length);

          const lead1 = textBeforeCaretInTag.slice(0, textBeforeCaretInTag.length - textBeforeCaretInTag.trimStart().length);
          const trail1 = textBeforeCaretInTag.slice(textBeforeCaretInTag.trimEnd().length);
          const trim1 = textBeforeCaretInTag.trim();
          const line1 = trim1 
            ? (beforeTag + lead1 + openTag + trim1 + closeTag + trail1) 
            : (beforeTag + textBeforeCaretInTag);

          const lead2 = textAfterCaretInTag.slice(0, textAfterCaretInTag.length - textAfterCaretInTag.trimStart().length);
          const trail2 = textAfterCaretInTag.slice(textAfterCaretInTag.trimEnd().length);
          const trim2 = textAfterCaretInTag.trim();
          const line2 = trim2 
            ? (listPrefix + lead2 + openTag + trim2 + closeTag + trail2 + afterTag) 
            : (listPrefix + openTag + closeTag + textAfterCaretInTag + afterTag);

          const beforeDoc = text.slice(0, lineStart);
          const afterDoc = text.slice(actualLineEnd);

          const newText = beforeDoc + line1 + '\n' + line2 + afterDoc;
          const newCaretPos = lineStart + line1.length + 1 + listPrefix.length + (trim2 ? (lead2.length + openTag.length) : openTag.length);

          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true });
            editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
          return;
        }
      }

      // 3. Handle default list/quote continuation
      if (listPrefix) {
        e.preventDefault();
        const before = text.slice(0, caretPos);
        const after = text.slice(caretPos);
        const newText = before + '\n' + listPrefix + after;
        const newCaretPos = caretPos + 1 + listPrefix.length;
        setContent(newText);
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true });
          editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
        return;
      }
    }
  }, [widgetPos, isWidgetVisible, isWidgetMenuOpen, saveCursorPosition, setContent]);

  const handleMarkdownFormat = useCallback((tag: string, closeTag: string = tag) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const text = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let formatKey: 'bold' | 'italic' | 'code' | 'strikethrough' | 'sub' | 'sup' | 'phishy' = 'bold';
    if (tag === '*') formatKey = 'italic';
    else if (tag === '`') formatKey = 'code';
    else if (tag === '~~') formatKey = 'strikethrough';
    else if (tag === '<sub>') formatKey = 'sub';
    else if (tag === '<sup>') formatKey = 'sup';
    else if (tag === '<div class="phishy">') formatKey = 'phishy';

    textarea.focus();

    if (start !== end) {
      const selectedText = text.slice(start, end);
      const before = text.slice(0, start);
      const after = text.slice(end);

      const leadingSpaces = selectedText.slice(0, selectedText.length - selectedText.trimStart().length);
      const trailingSpaces = selectedText.slice(selectedText.trimEnd().length);
      const trimmedSelection = selectedText.trim();

      if (trimmedSelection.length > 0) {
        const newText = before + leadingSpaces + tag + trimmedSelection + closeTag + trailingSpaces + after;
        setContent(newText);
        
        const newStart = start + leadingSpaces.length + tag.length;
        const newEnd = newStart + trimmedSelection.length;
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true });
          editorRef.current.setSelectionRange(newStart, newEnd);
          saveCursorPosition();
        }, 0);
        return;
      }
    }

    const caretPos = start;
    const lineStart = text.lastIndexOf('\n', caretPos - 1) + 1;
    const lineEnd = text.indexOf('\n', caretPos);
    const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
    const currentLine = text.substring(lineStart, actualLineEnd);
    const caretInLine = caretPos - lineStart;

    const ranges = getAllFormatRangesInLine(currentLine);
    const matchingRanges = ranges.filter(r => r.formatKey === formatKey && caretInLine >= r.openIdx && caretInLine <= r.closeIdx + r.closeTag.length);
    matchingRanges.sort((a, b) => (a.closeIdx - a.openIdx) - (b.closeIdx - b.openIdx));
    const matchingRange = matchingRanges[0] || null;

    if (matchingRange) {
      const { openIdx, closeIdx, contentStart, contentEnd, openTag, closeTag: cTag } = matchingRange;
      const insideText = currentLine.slice(contentStart, contentEnd);
      const trimmedInside = insideText.trim();
      const leadingSpaces = insideText.slice(0, insideText.length - insideText.trimStart().length);
      const trailingSpaces = insideText.slice(insideText.trimEnd().length);

      // 1. If tag is empty or only whitespace (e.g. *|* or **   **), remove it completely
      if (trimmedInside.length === 0) {
        const beforeTag = currentLine.slice(0, openIdx);
        const afterTag = currentLine.slice(closeIdx + cTag.length);
        const newLine = beforeTag + insideText + afterTag;
        const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
        const newCaretPos = lineStart + openIdx + leadingSpaces.length;

        setContent(newText);
        setActiveFormats(prev => ({ ...prev, [formatKey]: false }));
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true });
          editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
        return;
      }

      // 2. If caret is at or after the end of formatted content (e.g. **іаві| ** or ** іаві **|), exit/finish format and jump out
      if (caretInLine >= contentEnd || caretInLine >= closeIdx) {
        const beforeTag = currentLine.slice(0, openIdx);
        const afterTag = currentLine.slice(closeIdx + cTag.length);
        const normalizedTag = leadingSpaces + openTag + trimmedInside + cTag + trailingSpaces;
        const newLine = beforeTag + normalizedTag + afterTag;
        const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
        const newCaretPos = lineStart + beforeTag.length + normalizedTag.length;

        setContent(newText);
        setActiveFormats(prev => ({ ...prev, [formatKey]: false }));
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true });
          editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
        return;
      }

      // 3. Otherwise, unwrap the format tags from the surrounding text
      const beforeTag = currentLine.slice(0, openIdx);
      const afterTag = currentLine.slice(closeIdx + cTag.length);

      const newLine = beforeTag + insideText + afterTag;
      const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
      const newCaretPos = lineStart + openIdx + (caretInLine - (openIdx + openTag.length));

      setContent(newText);
      setActiveFormats(prev => ({ ...prev, [formatKey]: false }));
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true });
        editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
        saveCursorPosition();
      }, 0);
      return;
    }

    // 4. We are NOT inside this format tag. Check if caret is inside a word to wrap it.
    let wordStart = caretInLine;
    let wordEnd = caretInLine;
    while (wordStart > 0 && /\w|[\u0400-\u04FF]/.test(currentLine[wordStart - 1])) {
      wordStart--;
    }
    while (wordEnd < currentLine.length && /\w|[\u0400-\u04FF]/.test(currentLine[wordEnd])) {
      wordEnd++;
    }
    const word = currentLine.slice(wordStart, wordEnd);

    if (word.length > 0 && caretInLine >= wordStart && caretInLine <= wordEnd) {
      const beforeWord = currentLine.slice(0, wordStart);
      const afterWord = currentLine.slice(wordEnd);
      const newLine = beforeWord + tag + word + closeTag + afterWord;
      const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
      const newCaretPos = lineStart + wordStart + tag.length + (caretInLine - wordStart);

      setContent(newText);
      setActiveFormats(prev => ({ ...prev, [formatKey]: true }));
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true });
        editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
        saveCursorPosition();
      }, 0);
    } else {
      // Insert empty pair e.g. *|*
      const beforeCaret = currentLine.slice(0, caretInLine);
      const afterCaret = currentLine.slice(caretInLine);
      const newLine = beforeCaret + tag + closeTag + afterCaret;
      const newText = text.slice(0, lineStart) + newLine + text.slice(actualLineEnd);
      const newCaretPos = lineStart + caretInLine + tag.length;

      setContent(newText);
      setActiveFormats(prev => ({ ...prev, [formatKey]: true }));
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true });
        editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
        saveCursorPosition();
      }, 0);
    }
  }, [saveCursorPosition, setContent]);

  const fmt = useCallback((prefix: string, suffix: string = prefix) => {
    if (editorMode === 'visual') {
      let formatKey: 'bold' | 'italic' | 'strikethrough' | 'sub' | 'sup' | 'code' | 'phishy' | null = null;
      if (prefix === '**') formatKey = 'bold';
      else if (prefix === '*') formatKey = 'italic';
      else if (prefix === '~~') formatKey = 'strikethrough';
      else if (prefix === '<sub>') formatKey = 'sub';
      else if (prefix === '<sup>') formatKey = 'sup';
      else if (prefix === '`') formatKey = 'code';
      else if (prefix === '<div class="phishy">') formatKey = 'phishy';

      const isFormatActive = formatKey ? activeFormats[formatKey] : false;

      let isCollapsed = false;
      let range: Range | null = null;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        range = sel.getRangeAt(0);
        isCollapsed = sel.isCollapsed || range.collapsed;
      } else if (savedVisualRangeRef.current) {
        range = savedVisualRangeRef.current;
        isCollapsed = range.collapsed;
      }

      // 1. If format is active AND cursor is collapsed, we handle EXITING/DEACTIVATING the format.
      // We should jump out of the active element instead of stripping the formatting from the word.
      if (isCollapsed && isFormatActive && formatKey && range) {
        let activeElement: HTMLElement | null = null;
        let temp = range.startContainer as Node | null;
        while (temp && temp !== wysiwygRef.current) {
          if (temp.nodeType === Node.ELEMENT_NODE) {
            const tagName = (temp as HTMLElement).tagName.toUpperCase();
            if (formatKey === 'bold' && (tagName === 'STRONG' || tagName === 'B')) {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'italic' && (tagName === 'EM' || tagName === 'I')) {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'strikethrough' && (tagName === 'STRIKE' || tagName === 'DEL' || tagName === 'S')) {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'sub' && tagName === 'SUB') {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'sup' && tagName === 'SUP') {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'code' && tagName === 'CODE') {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'phishy' && (tagName === 'SPAN' || tagName === 'DIV') && (temp as HTMLElement).classList.contains('phishy')) {
              activeElement = temp as HTMLElement;
              break;
            }
          }
          temp = temp.parentNode;
        }

        if (activeElement) {
          let isAtEnd: boolean;
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const textContent = range.startContainer.textContent || '';
            const offset = range.startOffset;
            const remainingText = textContent.substring(offset);
            isAtEnd = /^[\u200B]*$/.test(remainingText);
          } else {
            isAtEnd = range.startContainer === activeElement && range.startOffset === activeElement.childNodes.length;
          }
          
          if (isAtEnd) {
            const parent = activeElement.parentNode;
            if (parent) {
              const zwsp = document.createTextNode('\u200B');
              parent.insertBefore(zwsp, activeElement.nextSibling);
              
              const newRange = document.createRange();
              newRange.setStart(zwsp, 1);
              newRange.setEnd(zwsp, 1);
              
              const currentSel = window.getSelection();
              if (currentSel) {
                currentSel.removeAllRanges();
                currentSel.addRange(newRange);
              }
              
              if (wysiwygRef.current) {
                wysiwygRef.current.focus({ preventScroll: true });
              }
              
              savedVisualRangeRef.current = newRange.cloneRange();
              
              setActiveFormats(prev => ({ ...prev, [formatKey!]: false }));
              updateContentFromWysiwyg();
              return;
            }
          }
        }
      }

      // 2. Determine if we should expand the word when RESTORING selection.
      // We only expand the word if:
      // - The cursor is collapsed
      // - The format is NOT currently active (we want to apply it to a word)
      // - The cursor is strictly inside a word (not at the start or end of a word or at a space)
      let shouldExpandWord = false;
      if (isCollapsed && range && !isFormatActive) {
        const node = range.startContainer;
        const offset = range.startOffset;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const textValue = node.nodeValue || '';
          const wordBoundaryRegex = /[\s\n.,!?;:"'()[\]{}*~`<>#_]/;
          let wStart = offset;
          let wEnd = offset;
          while (wStart > 0 && !wordBoundaryRegex.test(textValue[wStart - 1])) {
            wStart--;
          }
          while (wEnd < textValue.length && !wordBoundaryRegex.test(textValue[wEnd])) {
            wEnd++;
          }
          
          // Only expand if cursor is strictly inside/adjacent to word, and not at the very end of the text node (continuous typing)
          if (wStart < wEnd && offset > wStart && offset < wEnd) {
            shouldExpandWord = true;
          }
        }
      }

      restoreVisualSelection(shouldExpandWord);

      let command = '';
      if (prefix === '**') command = 'bold';
      else if (prefix === '*') command = 'italic';
      else if (prefix === '~~') command = 'strikeThrough';
      else if (prefix === '<sub>') command = 'subscript';
      else if (prefix === '<sup>') command = 'superscript';

      if (command) {
        if (isCollapsed) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0);
            const container = r.startContainer;
            let isEmpty = false;
            if (container.nodeType === Node.ELEMENT_NODE) {
               if ((container.textContent || '').replace(/[\u200B\s\n]/g, '') === '') isEmpty = true;
            } else if (container.nodeType === Node.TEXT_NODE) {
               if ((container.textContent || '').replace(/[\u200B\s\n]/g, '') === '') isEmpty = true;
            }
            if (isEmpty) {
              const zwsp = document.createTextNode('\u200B');
              r.insertNode(zwsp);
              r.setStart(zwsp, 1);
              r.setEnd(zwsp, 1);
              sel.removeAllRanges();
              sel.addRange(r);
            }
          }
        }
        document.execCommand(command, false);
        const selAfter = window.getSelection();
        if (selAfter && selAfter.rangeCount > 0 && shouldExpandWord) {
          selAfter.collapseToEnd();
          savedVisualRangeRef.current = selAfter.getRangeAt(0).cloneRange();
          updateContentFromWysiwyg();
          return;
        }
        const isCollapsedAfter = selAfter ? (selAfter.isCollapsed || (selAfter.rangeCount > 0 && selAfter.getRangeAt(0).collapsed)) : true;

        if (isCollapsedAfter) {
          // Toggle local state for immediate toolbar response
          let formatKeyToggle: 'bold' | 'italic' | 'strikethrough' | 'sub' | 'sup' = 'bold';
          if (command === 'italic') formatKeyToggle = 'italic';
          else if (command === 'strikeThrough') formatKeyToggle = 'strikethrough';
          else if (command === 'subscript') formatKeyToggle = 'sub';
          else if (command === 'superscript') formatKeyToggle = 'sup';
          
          setActiveFormats(prev => ({
            ...prev,
            [formatKeyToggle]: !prev[formatKeyToggle]
          }));
          
          if (wysiwygRef.current) {
            wysiwygRef.current.focus({ preventScroll: true });
          }
          return; // Skip updateContentFromWysiwyg to preserve typing command state
        }
      } else {
        if (prefix === '`') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<code>${text}</code>`);
          if (!text) {
            setActiveFormats(prev => ({ ...prev, code: true }));
          }
        } else if (prefix === '```\n') {
          const text = getVisualSelectionHtml() || 'code block';
          insertHtmlAtCursor(`<pre><code>${text}</code></pre>`);
        } else if (prefix === '<div class="phishy">') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<span class="phishy">${text}</span>`);
          if (!text) {
            setActiveFormats(prev => ({ ...prev, phishy: true }));
          }
        } else if (prefix.includes('text-left') || prefix === '<div class="text-left">\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<div class="text-left">${text}</div>`);
        } else if (prefix.includes('text-right') || prefix === '<div class="text-right">\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<div class="text-right">${text}</div>`);
        } else if (prefix.includes('text-justify') || prefix === '<div class="text-justify">\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<div class="text-justify">${text}</div>`);
        } else if (prefix.includes('<center>') || prefix === '<center>\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<center>${text}</center>`);
        } else {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`${prefix}${text}${suffix}`);
        }
      }
      updateContentFromWysiwyg();
      return;
    }

    if (!editorRef.current) return;

    if (prefix === '**' || prefix === '*' || prefix === '`' || prefix === '~~' || prefix === '<sub>' || prefix === '<sup>' || prefix === '<div class="phishy">') {
      handleMarkdownFormat(prefix, suffix);
      return;
    }

    const range = getSelectionOrWord();
    
    if (range.text.length === 0) {
      const textToInsert = prefix + suffix;
      const newContent = useEditorStore.getState().content.substring(0, range.s) + textToInsert + useEditorStore.getState().content.substring(range.e);
      setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(range.s + prefix.length, range.s + prefix.length);
      }, 0);
    } else {
      const leadingSpaces = range.text.slice(0, range.text.length - range.text.trimStart().length);
      const trailingSpaces = range.text.slice(range.text.trimEnd().length);
      const trimmed = range.text.trim();
      const newText = trimmed ? (leadingSpaces + prefix + trimmed + suffix + trailingSpaces) : (prefix + suffix);
      const newContent = useEditorStore.getState().content.substring(0, range.s) + newText + useEditorStore.getState().content.substring(range.e);
      setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); 
        editorRef.current.setSelectionRange(range.s + leadingSpaces.length + prefix.length, range.s + leadingSpaces.length + prefix.length + trimmed.length);
      }, 0);
    }
  }, [ getSelectionOrWord, editorMode, insertHtmlAtCursor, getVisualSelectionHtml, restoreVisualSelection, handleMarkdownFormat, updateContentFromWysiwyg, activeFormats, setContent]);

  const deleteActiveTableRow = useCallback(() => {
    if (activeTableRow && wysiwygRef.current && wysiwygRef.current.contains(activeTableRow)) {
      const table = activeTableRow.closest('table');
      activeTableRow.remove();
      if (table && (!table.textContent || table.textContent.trim() === '')) {
        table.remove();
        setActiveTable(null);
      }
      setActiveTableRow(null);
      setActiveTableCell(null);
      updateContentFromWysiwyg();
      setIsWidgetVisible(false);
    }
  }, [activeTableRow, updateContentFromWysiwyg]);

  const deleteActiveTableCol = useCallback(() => {
    if (activeTableCell && activeTable && wysiwygRef.current && wysiwygRef.current.contains(activeTableCell)) {
      const colIndex = (activeTableCell as HTMLTableCellElement).cellIndex;
      const rows = activeTable.querySelectorAll('tr');
      rows.forEach(row => {
        if (row.cells[colIndex]) {
          row.cells[colIndex].remove();
        }
      });
      
      if (activeTable.rows.length === 0 || (activeTable.rows[0] && activeTable.rows[0].cells.length === 0)) {
        activeTable.remove();
        setActiveTable(null);
        setActiveTableRow(null);
      }
      setActiveTableCell(null);
      
      updateContentFromWysiwyg();
      setIsWidgetVisible(false);
    }
  }, [activeTable, activeTableCell, updateContentFromWysiwyg]);

  const deleteActiveTable = useCallback(() => {
    if (activeTable && wysiwygRef.current && wysiwygRef.current.contains(activeTable)) {
      activeTable.remove();
      setActiveTable(null);
      setActiveTableRow(null);
      setActiveTableCell(null);
      updateContentFromWysiwyg();
      setIsWidgetVisible(false);
    }
  }, [activeTable, updateContentFromWysiwyg]);

  const fmtLine = useCallback((prefix: string) => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      restoreVisualSelection(true);
      if (prefix === '# ') {
        document.execCommand('formatBlock', false, '<h1>');
      } else if (prefix === '## ') {
        document.execCommand('formatBlock', false, '<h2>');
      } else if (prefix === '### ') {
        document.execCommand('formatBlock', false, '<h3>');
      } else if (prefix === '> ') {
        document.execCommand('formatBlock', false, '<blockquote>');
      } else if (prefix === '- ') {
        document.execCommand('insertUnorderedList', false);
      } else if (prefix === '1. ') {
        document.execCommand('insertOrderedList', false);
      } else if (prefix === '- [ ] ') {
        insertHtmlAtCursor('<ul class="task-list"><li><input type="checkbox" style="margin-right: 0.5rem;" /> Task</li></ul>');
      } else {
        const text = getVisualSelectionHtml();
        insertHtmlAtCursor(`${prefix}${text}`);
      }
      updateContentFromWysiwyg();
      return;
    }

    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    
    if (start === end) {
      const lastNewline = content.lastIndexOf('\n', start - 1) + 1;
      const newContent = content.substring(0, lastNewline) + prefix + content.substring(lastNewline);
      setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    } else {
      // Multi-line selection
      const selectedText = content.substring(start, end);
      const lines = selectedText.split('\n');
      const newText = lines.map(line => line.trim() ? prefix + line : line).join('\n');
      const newContent = content.substring(0, start) + newText + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start, start + newText.length);
      }, 0);
    }
  }, [ editorMode, insertHtmlAtCursor, getVisualSelectionHtml, restoreVisualSelection, updateContentFromWysiwyg, setContent]);

  const handleLink = useCallback(async () => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      restoreVisualSelection(true);
      const selectionHtml = getVisualSelectionHtml() || '';
      const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(selectionHtml.trim());
      
      if (isUrl) {
        const label = await promptDialog(t('linkPrompt'), "");
        if (label !== null) {
          const cleanLabel = label.trim() || selectionHtml;
          insertHtmlAtCursor(`<a href="${selectionHtml.trim()}">${cleanLabel}</a>`);
        }
      } else {
        const url = await promptDialog(t('urlPrompt'), "https://");
        if (url) {
          document.execCommand('createLink', false, url);
          updateContentFromWysiwyg();
        }
      }
      return;
    }

    const selection = getSelectionOrWord();
    const trimmed = selection.text.trim();
    const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(trimmed);
    
    if (isUrl) {
      const label = await promptDialog(t('linkPrompt'), "");
      if (label !== null) {
        const newText = label ? `[${label}](${trimmed})` : `[${trimmed}](${trimmed})`;
        const newContent = content.substring(0, selection.s) + newText + content.substring(selection.e);
        setContent(newContent);
      }
    } else {
      const url = await promptDialog(t('urlPrompt'), "https://");
      if (url) fmt('[', `](${url})`);
    }
  }, [ t, getSelectionOrWord, fmt, promptDialog, editorMode, restoreVisualSelection, getVisualSelectionHtml, insertHtmlAtCursor, updateContentFromWysiwyg, setContent]);

  const handleIndent = useCallback(() => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      restoreVisualSelection(false);
      const sel = window.getSelection();
      let insideList = false;
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        insideList = !!(node as HTMLElement)?.closest?.('li, ul, ol');
      }
      
      if (insideList) {
        document.execCommand('indent', false);
      } else {
        insertHtmlAtCursor('&nbsp;&nbsp;&nbsp;&nbsp;');
      }
      updateContentFromWysiwyg();
      return;
    }
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    const lines = selectedText.split('\n');
    const newText = lines.map(line => '    ' + line).join('\n');
    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);
  }, [ editorMode, restoreVisualSelection, updateContentFromWysiwyg, insertHtmlAtCursor, setContent]);

  const tryHeadingEnterBreakout = useCallback((shiftKey: boolean = false): boolean => {
    if (shiftKey) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !wysiwygRef.current) return false;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (!node) return false;

    let headingEl: HTMLElement | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    while (headingEl && headingEl !== wysiwygRef.current && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(headingEl.tagName)) {
      headingEl = headingEl.parentElement;
    }

    if (!headingEl || headingEl === wysiwygRef.current) return false;
    const parent = headingEl.parentNode;
    if (!parent) return false;

    const headingText = (headingEl.textContent || '').replace(/[\u200B\s\n]/g, '');

    // Case 1: Heading is completely empty -> turn into standard paragraph
    if (headingText === '') {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      parent.replaceChild(p, headingEl);

      const newRange = document.createRange();
      newRange.selectNodeContents(p);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedVisualRangeRef.current = newRange.cloneRange();
      if (wysiwygRef.current) wysiwygRef.current.focus({ preventScroll: true });
      updateContentFromWysiwyg();
      return true;
    }

    // Case 2: Check if cursor is at the end, beginning, or middle
    const marker = document.createElement('span');
    marker.id = 'temp-heading-marker';
    try {
      range.insertNode(marker);

      const hasText = (n: Node): boolean => {
        if (n.nodeType === Node.TEXT_NODE) {
          return (n.nodeValue?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
        }
        if (n.nodeType === Node.ELEMENT_NODE) {
          const el = n as HTMLElement;
          if (el.tagName === 'BR' || el.id === 'temp-heading-marker') return false;
          return (el.textContent?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
        }
        return false;
      };

      // Scan left from marker
      let isLeftEmpty = true;
      let currLeft: Node | null = marker;
      while (currLeft && currLeft !== headingEl) {
        let sib = currLeft.previousSibling;
        while (sib) {
          if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') break;
          if (hasText(sib)) { isLeftEmpty = false; break; }
          sib = sib.previousSibling;
        }
        if (!isLeftEmpty || (currLeft.previousSibling && (currLeft.previousSibling as HTMLElement).tagName === 'BR')) break;
        currLeft = currLeft.parentNode;
      }

      // Scan right from marker
      let isRightEmpty = true;
      let currRight: Node | null = marker;
      while (currRight && currRight !== headingEl) {
        let sib = currRight.nextSibling;
        while (sib) {
          if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') break;
          if (hasText(sib)) { isRightEmpty = false; break; }
          sib = sib.nextSibling;
        }
        if (!isRightEmpty || (currRight.nextSibling && (currRight.nextSibling as HTMLElement).tagName === 'BR')) break;
        currRight = currRight.parentNode;
      }

      // Find direct child of heading containing the marker
      let directChild: Node | null = marker;
      while (directChild && directChild.parentNode !== headingEl) {
        directChild = directChild.parentNode;
      }

      if (directChild) {
        const childs: Node[] = Array.from(headingEl.childNodes);
        const directIndex = childs.indexOf(directChild);
        const leftChildren = directIndex > 0 ? childs.slice(0, directIndex) : [];
        const rightChildren = directIndex + 1 < childs.length ? childs.slice(directIndex + 1) : [];

        // Clean trailing/leading <br>
        while (leftChildren.length > 0 && leftChildren[leftChildren.length - 1].nodeType === Node.ELEMENT_NODE && (leftChildren[leftChildren.length - 1] as HTMLElement).tagName === 'BR') {
          leftChildren.pop();
        }
        while (rightChildren.length > 0 && rightChildren[0].nodeType === Node.ELEMENT_NODE && (rightChildren[0] as HTMLElement).tagName === 'BR') {
          rightChildren.shift();
        }

        // If at the end of the heading: create <p><br></p> AFTER heading
        if (isRightEmpty) {
          headingEl.innerHTML = '';
          if (leftChildren.length > 0) {
            leftChildren.forEach(c => headingEl!.appendChild(c));
          } else {
            headingEl.innerHTML = '<br>';
          }

          const p = document.createElement('p');
          p.innerHTML = '<br>';
          parent.insertBefore(p, headingEl.nextSibling);

          const newRange = document.createRange();
          newRange.selectNodeContents(p);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedVisualRangeRef.current = newRange.cloneRange();
          if (wysiwygRef.current) wysiwygRef.current.focus({ preventScroll: true });
          updateContentFromWysiwyg();
          return true;
        }

        // If at the beginning of the heading: create <p><br></p> BEFORE heading, stay in heading
        if (isLeftEmpty) {
          headingEl.innerHTML = '';
          if (rightChildren.length > 0) {
            rightChildren.forEach(c => headingEl!.appendChild(c));
          } else {
            headingEl.innerHTML = '<br>';
          }

          const p = document.createElement('p');
          p.innerHTML = '<br>';
          parent.insertBefore(p, headingEl);

          const newRange = document.createRange();
          newRange.selectNodeContents(headingEl);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedVisualRangeRef.current = newRange.cloneRange();
          if (wysiwygRef.current) wysiwygRef.current.focus({ preventScroll: true });
          updateContentFromWysiwyg();
          return true;
        }

        // If in the middle of the heading: split into two headings
        const leftHeading = headingEl;
        const rightHeading = document.createElement(leftHeading.tagName.toLowerCase());
        rightHeading.className = leftHeading.className;

        leftHeading.innerHTML = '';
        leftChildren.forEach(c => leftHeading.appendChild(c));

        rightHeading.innerHTML = '';
        if (rightChildren.length > 0) {
          rightChildren.forEach(c => rightHeading.appendChild(c));
        } else {
          rightHeading.innerHTML = '<br>';
        }

        parent.insertBefore(rightHeading, leftHeading.nextSibling);

        const newRange = document.createRange();
        newRange.selectNodeContents(rightHeading);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedVisualRangeRef.current = newRange.cloneRange();
        if (wysiwygRef.current) wysiwygRef.current.focus({ preventScroll: true });
        updateContentFromWysiwyg();
        return true;
      }
    } catch (err) {
      console.warn('Heading breakout error:', err);
    } finally {
      if (marker.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    }
    return false;
  }, [updateContentFromWysiwyg]);

  const handleWysiwygBeforeInput = useCallback((e: any) => {
    if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
      if (tryHeadingEnterBreakout(false)) {
        e.preventDefault();
      }
    }
  }, [tryHeadingEnterBreakout]);

  const handleWysiwygKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMod = e.ctrlKey || e.metaKey;
    
    

    if (e.key === 'Tab') {
      e.preventDefault();
      handleIndent();
      return;
    }

    // 1. Single Enter on Heading breakout
    if ((e.key === 'Enter' || e.keyCode === 13) && !isMod && !e.shiftKey) {
      if (tryHeadingEnterBreakout(e.shiftKey)) {
        e.preventDefault();
        return;
      }
    }

    if ((e.key === ' ' || e.key === 'Enter') && !isMod) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        const node = sel.focusNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          const offset = sel.focusOffset;
          const headText = text.substring(0, offset);
          const words = headText.split(/[\s\n]/);
          const lastWord = words[words.length - 1];
          if (lastWord && isImageAndProxyUrl(lastWord.trim())) {
            e.preventDefault();
            const trimmedWord = lastWord.trim();
            const beforeWord = headText.substring(0, headText.length - lastWord.length);
            const afterCursor = text.substring(offset);
            
            node.nodeValue = beforeWord;
            
            const img = document.createElement('img');
            img.src = trimmedWord;
            img.alt = 'image';
            
            const parent = node.parentNode;
            if (parent) {
              const nextSib = node.nextSibling;
              parent.insertBefore(img, nextSib);
              
              const spacer = e.key === ' ' ? '\u00A0' : '\n';
              const suffixNode = document.createTextNode(spacer + afterCursor);
              parent.insertBefore(suffixNode, img.nextSibling);
              
              const newRange = document.createRange();
              newRange.setStart(suffixNode, 1);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              
              updateContentFromWysiwyg();
              return;
            }
          }
        }
      }
    }

    if (e.key === ' ' && !isMod) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        const node = sel.focusNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          const offset = sel.focusOffset;
          if (offset === text.length) {
            let format = null;
            if (text === '#') format = '<h1>';
            else if (text === '##') format = '<h2>';
            else if (text === '###') format = '<h3>';
            else if (text === '####') format = '<h4>';
            else if (text === '>') format = '<blockquote>';
            
            if (text === '-') {
                e.preventDefault();
                node.textContent = '';
                document.execCommand('insertUnorderedList', false);
                return;
            } else if (text === '1.') {
                e.preventDefault();
                node.textContent = '';
                document.execCommand('insertOrderedList', false);
                return;
            } else if (format) {
              e.preventDefault();
              node.textContent = '';
              document.execCommand('formatBlock', false, format);
              return;
            }
          }
        }
      }
    }

    // Formatting keyboard shortcuts
    if (isMod) {
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        fmt('**');
        return;
      }
      if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        fmt('*');
        return;
      }
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleLink();
        return;
      }
    }

    if (e.shiftKey && isMod) {
      if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        fmt('~~');
        return;
      }
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        fmt('`');
        return;
      }
    }
    
    // On-the-fly markdown shortcut expander
    if (e.key === ' ') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const startNode = range.startContainer;
        
        if (startNode.nodeType === Node.TEXT_NODE) {
          const textValue = startNode.nodeValue || '';
          const offset = range.startOffset;
          const headText = textValue.substring(0, offset);
          
          let match = false;
          let blockTag = '';
          let cmd = '';
          
          if (headText === '#') {
            blockTag = 'h1';
            match = true;
          } else if (headText === '##') {
            blockTag = 'h2';
            match = true;
          } else if (headText === '###') {
            blockTag = 'h3';
            match = true;
          } else if (headText === '####') {
            blockTag = 'h4';
            match = true;
          } else if (headText === '>') {
            blockTag = 'blockquote';
            match = true;
          } else if (headText === '-' || headText === '*') {
            cmd = 'insertUnorderedList';
            match = true;
          } else if (headText === '1.') {
            cmd = 'insertOrderedList';
            match = true;
          } else if (headText === '- [ ]') {
            blockTag = 'checklist';
            match = true;
          }
          
          if (match) {
            e.preventDefault();
            
            // Remove the characters before space
            startNode.nodeValue = textValue.substring(offset);
            
            if (cmd) {
              document.execCommand(cmd, false);
            } else if (blockTag === 'checklist') {
              insertHtmlAtCursor('<ul class="task-list"><li><input type="checkbox" style="margin-right: 0.5rem;" /> </li></ul>');
            } else if (blockTag === 'blockquote') {
              document.execCommand('formatBlock', false, '<blockquote>');
              // Ensure there is a block element inside
              const sel2 = window.getSelection();
              if (sel2 && sel2.rangeCount > 0) {
                 let curr = sel2.getRangeAt(0).startContainer;
                 if (curr.nodeType === Node.TEXT_NODE) curr = curr.parentNode as Node;
                 if ((curr as HTMLElement).tagName === 'BLOCKQUOTE') {
                    document.execCommand('formatBlock', false, '<p>');
                 }
              }
            } else if (blockTag) {
              document.execCommand('formatBlock', false, `<${blockTag}>`);
            }
            
            updateContentFromWysiwyg();
          }
        }
      }
    }
    
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
        const range = sel.getRangeAt(0);
        let current: Node | null = range.startContainer;
        if (current.nodeType === Node.TEXT_NODE) current = current.parentNode;
        const spacer = (current as Element)?.closest?.('.table-spacer, [data-placeholder], [data-empty]');
        if (spacer && wysiwygRef.current.contains(spacer)) {
          spacer.removeAttribute('data-empty');
          spacer.removeAttribute('data-placeholder');
          spacer.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
        }
      }
    }

    // Check if we are inside a table cell when pressing Enter
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
        const range = sel.getRangeAt(0);
        let current: Node | null = range.startContainer;
        if (current.nodeType === Node.TEXT_NODE) current = current.parentNode;
        
        const spacer = (current as Element)?.closest?.('.table-spacer, [data-placeholder], [data-empty]');
        if (spacer && wysiwygRef.current.contains(spacer)) {
          e.preventDefault();
          spacer.removeAttribute('data-empty');
          spacer.removeAttribute('data-placeholder');
          spacer.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
          document.execCommand('insertParagraph');
          updateContentFromWysiwyg();
          return;
        }
        
        const tableCell = (current as Element)?.closest?.('td, th');
        if (tableCell && wysiwygRef.current.contains(tableCell)) {
          e.preventDefault();
          document.execCommand('insertLineBreak');

          updateContentFromWysiwyg();
          return;
        }
      }
    }

    // Press Enter on empty line to break out of formatting containers (quotes, centered text, etc)
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
        const range = sel.getRangeAt(0);
        const node: Node | null = range.startContainer;
        
        if (node) {
          // Find the block container we might want to escape
          let escapeTarget: HTMLElement | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
          while (escapeTarget && escapeTarget !== wysiwygRef.current && 
                 !['BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'CENTER'].includes(escapeTarget.tagName) &&
                 !(escapeTarget.tagName === 'DIV' && Array.from(escapeTarget.classList).some(c => c.startsWith('text-') || c.startsWith('pull-') || c === 'phishy'))) {
            escapeTarget = escapeTarget.parentElement;
          }

          if (escapeTarget && escapeTarget !== wysiwygRef.current) {
            // Insert a temporary marker to check the neighborhood
            const marker = document.createElement('span');
            marker.id = 'temp-caret-marker';
            try {
              range.insertNode(marker);

              const hasText = (n: Node): boolean => {
                if (n.nodeType === Node.TEXT_NODE) {
                  return (n.nodeValue?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
                }
                if (n.nodeType === Node.ELEMENT_NODE) {
                  const el = n as HTMLElement;
                  if (el.tagName === 'BR' || el.id === 'temp-caret-marker') return false;
                  return (el.textContent?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
                }
                return false;
              };

              // Scan left for any text on the current line
              let isLeftEmpty = true;
              let currLeft: Node | null = marker;
              while (currLeft && currLeft !== escapeTarget) {
                let sib = currLeft.previousSibling;
                while (sib) {
                  if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') {
                    break; // stopped by line break
                  }
                  if (hasText(sib)) {
                    isLeftEmpty = false;
                    break;
                  }
                  sib = sib.previousSibling;
                }
                if (!isLeftEmpty || (currLeft.previousSibling && (currLeft.previousSibling as HTMLElement).tagName === 'BR')) {
                  break;
                }
                currLeft = currLeft.parentNode;
              }

              // Scan right for any text on the current line
              let isRightEmpty = true;
              let currRight: Node | null = marker;
              while (currRight && currRight !== escapeTarget) {
                let sib = currRight.nextSibling;
                while (sib) {
                  if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') {
                    break; // stopped by line break
                  }
                  if (hasText(sib)) {
                    isRightEmpty = false;
                    break;
                  }
                  sib = sib.nextSibling;
                }
                if (!isRightEmpty || (currRight.nextSibling && (currRight.nextSibling as HTMLElement).tagName === 'BR')) {
                  break;
                }
                currRight = currRight.parentNode;
              }
              if (isLeftEmpty && isRightEmpty) {
                e.preventDefault();
                
                const rLeft = document.createRange();
                rLeft.setStart(escapeTarget, 0);
                rLeft.setEndBefore(marker);
                const leftFrag = rLeft.cloneContents();
                
                const rRight = document.createRange();
                rRight.setStartAfter(marker);
                rRight.setEnd(escapeTarget, escapeTarget.childNodes.length);
                const rightFrag = rRight.cloneContents();

                if (leftFrag.lastChild && leftFrag.lastChild.nodeType === Node.ELEMENT_NODE && (leftFrag.lastChild as HTMLElement).tagName === 'BR') {
                  leftFrag.removeChild(leftFrag.lastChild);
                }
                if (rightFrag.firstChild && rightFrag.firstChild.nodeType === Node.ELEMENT_NODE && (rightFrag.firstChild as HTMLElement).tagName === 'BR') {
                  rightFrag.removeChild(rightFrag.firstChild);
                }
                
                const checkFragHasContent = (frag: DocumentFragment) => {
                   if ((frag.textContent || '').replace(/[\u200B\s\n]/g, '').length > 0) return true;
                   if (frag.querySelector('img, iframe, video, td, th, hr')) return true;
                   return false;
                };
                
                const leftHasContent = checkFragHasContent(leftFrag);
                const rightHasContent = checkFragHasContent(rightFrag);

                const p = document.createElement('p');
                p.innerHTML = '<br>';
                const parentNode = escapeTarget.parentNode;
                if (parentNode) {
                  if (leftHasContent && rightHasContent) {
                    const rightBlock = document.createElement(escapeTarget.tagName.toLowerCase());
                    rightBlock.className = escapeTarget.className;
                    escapeTarget.innerHTML = '';
                    escapeTarget.appendChild(leftFrag);
                    rightBlock.appendChild(rightFrag);
                    parentNode.insertBefore(rightBlock, escapeTarget.nextSibling);
                    parentNode.insertBefore(p, rightBlock);
                  } else if (leftHasContent) {
                    escapeTarget.innerHTML = '';
                    escapeTarget.appendChild(leftFrag);
                    parentNode.insertBefore(p, escapeTarget.nextSibling);
                  } else if (rightHasContent) {
                    escapeTarget.innerHTML = '';
                    escapeTarget.appendChild(rightFrag);
                    parentNode.insertBefore(p, escapeTarget);
                  } else {
                    parentNode.replaceChild(p, escapeTarget);
                  }
                    // Focus the new paragraph
                    const newRange = document.createRange();
                    newRange.selectNodeContents(p);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                    savedVisualRangeRef.current = newRange.cloneRange();
                    p.focus();

                    updateContentFromWysiwyg();
                    return;
                  }
              }
            } catch (err) {
              console.warn('Unified escape breakout error:', err);
            } finally {
              if (marker.parentNode) {
                marker.parentNode.removeChild(marker);
              }
            }
          }
        }

        let blockNode = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
        while (blockNode && blockNode !== wysiwygRef.current && !['P', 'DIV', 'BLOCKQUOTE', 'LI', 'CENTER', 'PRE'].includes(blockNode.tagName)) {
           blockNode = blockNode.parentElement;
        }

        if (blockNode && blockNode !== wysiwygRef.current) {
           const textContent = blockNode.textContent?.replace(/\u200B/g, '').trim();
           if (textContent === '' || textContent === undefined) {
               // Check if the empty block has formatting elements inside it or active formats
               const formattingTags = ['B', 'STRONG', 'I', 'EM', 'STRIKE', 'S', 'CODE', 'SUB', 'SUP', 'SPAN'];
               const hasFormattingElements = Array.from(blockNode.querySelectorAll('*')).some(el => 
                 formattingTags.includes(el.tagName)
               );
               const hasActiveFormats = activeFormats.bold || activeFormats.italic || activeFormats.strikethrough || activeFormats.sub || activeFormats.sup || activeFormats.code || activeFormats.phishy;
               
               if (hasFormattingElements || hasActiveFormats) {
                 // Clear formatting by resetting innerHTML to a single <br>
                 blockNode.innerHTML = '<br>';
                 
                 // Reset browser formatting states
                 try {
                   if (document.queryCommandState('bold')) document.execCommand('bold', false);
                   if (document.queryCommandState('italic')) document.execCommand('italic', false);
                   if (document.queryCommandState('strikeThrough')) document.execCommand('strikeThrough', false);
                   if (document.queryCommandState('subscript')) document.execCommand('subscript', false);
                   if (document.queryCommandState('superscript')) document.execCommand('superscript', false);
                 } catch (err) {
                   console.warn('Failed to clear commands:', err);
                 }
                 
                 setActiveFormats({
                   bold: false,
                   italic: false,
                   code: false,
                   strikethrough: false,
                   sub: false,
                   sup: false,
                   phishy: false
                 });
               }

               let curr: HTMLElement | null = blockNode as HTMLElement;
               let containerToEscape: HTMLElement | null = null;
               while (curr && curr !== wysiwygRef.current) {
                  if (['BLOCKQUOTE', 'PRE', 'CENTER', 'UL', 'OL'].includes(curr.tagName) || 
                      (curr.tagName === 'DIV' && Array.from(curr.classList).some(c => c.startsWith('text-') || c.startsWith('pull-') || c === 'phishy'))) {
                    containerToEscape = curr;
                    break;
                  }
                  curr = curr.parentNode as HTMLElement;
               }

               if (containerToEscape || hasFormattingElements || hasActiveFormats) {
                 e.preventDefault();
                 
                 const p = document.createElement('p');
                 p.innerHTML = '<br>';
                 
                 const targetParent = containerToEscape ? containerToEscape.parentNode : blockNode.parentNode;
                 const targetSibling = containerToEscape ? containerToEscape.nextSibling : blockNode.nextSibling;

                 if (targetSibling) {
                   targetParent?.insertBefore(p, targetSibling);
                 } else {
                   targetParent?.appendChild(p);
                 }
                 
                 if (containerToEscape) {
                   const containerTextContent = containerToEscape.textContent?.replace(/\u200B/g, '').trim();
                   if (!containerTextContent) {
                     containerToEscape.parentNode?.removeChild(containerToEscape);
                   } else if (blockNode !== containerToEscape && containerToEscape.contains(blockNode)) {
                     blockNode.parentNode?.removeChild(blockNode);
                   }
                 }
                 
                 const newRange = document.createRange();
                 newRange.selectNodeContents(p);
                 newRange.collapse(true);
                 sel.removeAllRanges();
                 sel.addRange(newRange);
                 
                 if (wysiwygRef.current) {
                   updateContentFromWysiwyg();
                 }
                 return;
               }
           }
        }
      }
    }

    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !wysiwygRef.current) return;
      const range = sel.getRangeAt(0);

      let current: Node | null = range.startContainer;
      if (current.nodeType === Node.TEXT_NODE) current = current.parentNode;
      
      const isListItem = (current as Element)?.closest?.('li');
      if (isListItem && wysiwygRef.current.contains(isListItem)) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* ignore */ }
        document.execCommand('insertParagraph');
        
        // Ensure it created a p, not a div (Chrome sometimes ignores defaultParagraphSeparator if inside div)
        setTimeout(() => {
           if (!wysiwygRef.current) return;
           const sel2 = window.getSelection();
           if (sel2 && sel2.rangeCount > 0) {
              let node = sel2.focusNode;
              while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
              if (node && ((node as HTMLElement).tagName === 'DIV') && !(node as HTMLElement).className) {
                  // It created a naked DIV instead of P
                  const p = document.createElement('p');
                  p.innerHTML = (node as HTMLElement).innerHTML || '<br>';
                  if (node.parentNode) node.parentNode.replaceChild(p, node);
                  const r = document.createRange();
                  r.selectNodeContents(p);
                  r.collapse(false);
                  sel2.removeAllRanges();
                  sel2.addRange(r);
              }
           }
           updateContentFromWysiwyg();
        }, 0);
        return;
      } else {
        e.preventDefault();
        document.execCommand('insertLineBreak');
        updateContentFromWysiwyg();
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        }
        scrollCaretIntoView('nearest');
        requestAnimationFrame(() => {
          if (window.scrollY !== 0 || window.scrollX !== 0) {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
          }
          scrollCaretIntoView('nearest');
        });
        return;
      }
    }
  }, [fmt, handleLink, insertHtmlAtCursor, widgetPos, isWidgetVisible, isWidgetMenuOpen, setIsWidgetVisible, updateContentFromWysiwyg, activeFormats, handleIndent, tryHeadingEnterBreakout, scrollCaretIntoView]);

  const importTable = useCallback(() => {
    setActiveModal('tableImport');
  }, []);

  const processTableImport = useCallback(() => {
    const data = tableImportText;
    if (!data) {
      setActiveModal(null);
      return;
    }

    // Split by lines, handle all newline types
    // We don't trim lines here because it would remove leading tabs (empty first cells)
    const lines = data.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) {
      setActiveModal(null);
      return;
    }

    // Detect delimiter
    const delimiters = ['\t', ';', ',', '|'];
    let bestDelimiter = '\t';
    let maxConsistency = -1;

    delimiters.forEach(d => {
      const colCounts = lines.map(l => l.split(d).length);
      const avg = colCounts.reduce((a, b) => a + b, 0) / colCounts.length;
      if (avg > 1.1) { // Reduced threshold to allow simple 2-col tables
        const mostFrequent = colCounts.reduce((acc, curr) => {
          acc[curr] = (acc[curr] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        const frequency = Math.max(...Object.values(mostFrequent));
        if (frequency > maxConsistency) {
          maxConsistency = frequency;
          bestDelimiter = d;
        }
      }
    });

    const rows = lines.map(line => {
      let parts: string[];
      if (bestDelimiter === '|') {
        // For Markdown tables, we trim the line itself but keep empty cells
        const trimmedLine = line.trim();
        parts = trimmedLine.split('|').map(p => p.trim());
        if (parts[0] === '') parts.shift();
        if (parts[parts.length - 1] === '') parts.pop();
      } else if (bestDelimiter === ',') {
        // Simple CSV parsing (handles quotes)
        const partsArray = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            partsArray.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        partsArray.push(current.trim());
        parts = partsArray;
      } else {
        // For TSV (Excel), we do NOT trim the line before split to keep \t at start
        parts = line.split(bestDelimiter).map(p => p.trim());
      }
      return parts;
    });

    // Determine the true number of columns (max found in any row to be safe)
    const maxCols = Math.max(...rows.map(r => r.length));
    
    // Normalize rows: ensure every row has exact same number of columns
    const normalizedRows = rows.map(r => {
      const newRow = [...r];
      while (newRow.length < maxCols) {
        newRow.push(''); // Pad missing cells
      }
      if (newRow.length > maxCols) {
        return newRow.slice(0, maxCols); // Crop extra
      }
      return newRow;
    });

    let resultTable = '';
    if (tableImportFormat === 'markdown') {
      normalizedRows.forEach((cols, i) => {
        const cleanCols = cols.map(c => {
          // Replace newlines with <br/> but try to avoid breaking markdown link syntax [text](url)
          // If a cell is purely a markdown link, we might want to keep it on one line.
          // For now, standard <br/> is mostly fine, but let's ensure we don't have leading/trailing garbage.
          return c.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br/>').trim();
        });
        resultTable += '| ' + cleanCols.join(' | ') + ' |\n';
        if (i === 0) {
          resultTable += '| ' + cleanCols.map(() => '---').join(' | ') + ' |\n';
        }
      });
    } else {
      resultTable = '<table data-format="html" style="width:100%">\n';
      normalizedRows.forEach((cols, i) => {
        resultTable += '  <tr>\n';
        cols.forEach(col => {
          const tag = i === 0 ? 'th' : 'td';
          resultTable += `    <${tag}>${col}</${tag}>\n`;
        });
        resultTable += '  </tr>\n';
      });
      resultTable += '</table>';
    }
    
    insertAtCursor(resultTable, 'end');
    setTableImportText('');
    setActiveModal(null);
    notify(t('importTableSuccess'), 'success');
  }, [tableImportText, insertAtCursor, tableImportFormat, t, notify]);

  const parseImages = useCallback((input: string) => {
    setSourceInput(input);
    const urlPattern = /(https?:\/\/[^[\]\s<>"'()]+?\.(?:jpg|jpeg|png|webp|gif|svg))/gi;
    const matches = input.match(urlPattern) || [];
    const uniqueUrls = Array.from(new Set(matches));
    
    setImages(prev => {
      const existingUrls = new Set(prev.map(img => img.url));
      const newImages = uniqueUrls.map(url => ({
        url,
        name: url.split('/').pop()?.split('?')[0] || 'image',
        selected: false
      })).filter(img => !existingUrls.has(img.url));
      
      const keptImages = prev.filter(img => uniqueUrls.includes(img.url));
      return [...keptImages, ...newImages];
    });
  }, []);

  const toggleImageSelection = (filteredIdx: number) => {
    const url = filteredLocalImages[filteredIdx]?.url;
    if (!url) return;
    setImages(prev => {
      const idx = prev.findIndex(i => i.url === url);
      if (idx === -1) return prev;
      const newImages = [...prev];
      newImages[idx] = { ...newImages[idx], selected: !newImages[idx].selected };
      return newImages;
    });
  };

  const moveImageLocal = (filteredIdx: number, direction: -1 | 1) => {
    const targetFilteredIdx = filteredIdx + direction;
    if (targetFilteredIdx < 0 || targetFilteredIdx >= filteredLocalImages.length) return;

    const url1 = filteredLocalImages[filteredIdx].url;
    const url2 = filteredLocalImages[targetFilteredIdx].url;

    setImages(prev => {
      const idx1 = prev.findIndex(i => i.url === url1);
      const idx2 = prev.findIndex(i => i.url === url2);
      if (idx1 === -1 || idx2 === -1) return prev;

      const newImages = [...prev];
      const temp = newImages[idx1];
      newImages[idx1] = newImages[idx2];
      newImages[idx2] = temp;
      return newImages;
    });
  };

  // Load data on mount
  const initVault = useCallback(async () => {
    const initialized = await SecurityService.isInitialized();
    setIsVaultInitialized(initialized);
    
    const accounts = await SecurityService.getAccounts();
    const usernames = Array.from(new Set(accounts.map(a => a.username)));
    setVaultAccounts(usernames);
    
    if (usernames.length > 0) {
      const firstUser = usernames[0];
      setSelectedVaultUser(prev => prev || firstUser);
      setUsername(prev => prev || firstUser);
    }
    
    const rawPxKey = localStorage.getItem('steem_pexels_key_raw');
    if (rawPxKey) {
      setPexelsApiKey(rawPxKey);
    } else {
      const pxKey = await SecurityService.getPexelsKey();
      if (pxKey) setPexelsApiKey(pxKey);
    }
    const encryptedPixabay = await SecurityService.getApiKey('pixabay');
    if (encryptedPixabay) setPixabayApiKey(encryptedPixabay);
    const encryptedUnsplashAccess = await SecurityService.getApiKey('unsplashAccess');
    if (encryptedUnsplashAccess) setUnsplashAccessKey(encryptedUnsplashAccess);
  }, []);

  useEffect(() => {
    initVault();

    // Load saved images and links
    const savedLinks = localStorage.getItem('steem_editor_source_links');
    if (savedLinks) {
      parseImages(savedLinks);
    } else {
      const savedImages = localStorage.getItem(STORAGE_KEY_IMAGES);
      if (savedImages) {
        try {
          const parsed = JSON.parse(savedImages);
          if (Array.isArray(parsed)) {
            setImages(parsed);
          }
        } catch (e) {
          console.error("Failed to load images", e);
        }
      }
    }

    // Додаємо невелику затримку перед активацією збереження
    setTimeout(() => {
      isImagesLoaded.current = true;
    }, 1000);

    SecurityService.setStatusCallback((unlocked) => {
      setIsUnlocked(unlocked);
    });

    const handleKeyboardResize = () => {
      // Prevents gallery/sidebar from closing when mobile keyboard pops up
      // Keyboard usually only affects height, not width
    };
    window.addEventListener('resize', handleKeyboardResize);
    
    return () => {
      SecurityService.setStatusCallback(() => {});
      window.removeEventListener('resize', handleKeyboardResize);
    };
  }, [parseImages, initVault]);

  useEffect(() => {
    localStorage.setItem('steem_pexels_settings', JSON.stringify(pexelsSettings));
  }, [pexelsSettings]);

  useEffect(() => {
    localStorage.setItem('steem_gallery_cache_results', JSON.stringify(pexelsResults));
  }, [pexelsResults]);

  const toggleGalleryMode = (mode: 'local' | 'pexels' | 'unsplash' | 'pixabay') => {
    setGalleryMode(mode);
    setGallerySearch('');
    // No longer clearing results here to support caching
  };

  const handleExternalSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) return;

    let apiKey = '';
    if (galleryMode === 'pexels') apiKey = pexelsApiKey || '';
    if (galleryMode === 'pixabay') apiKey = pixabayApiKey || '';
    if (galleryMode === 'unsplash') apiKey = unsplashAccessKey || '';

    if (!apiKey) {
      if (!isUnlocked && isVaultInitialized) {
        setVaultPin('');
        setActiveModal('unlock-pin');
        return;
      }
      const msg = galleryMode === 'pexels' ? t('pexelsKeyRequired') : 
                  galleryMode === 'pixabay' ? t('pixabayKeyRequired') : t('unsplashKeyRequired');
      notify(msg, 'error');
      return;
    }

    setIsSearchingPexels(true);
    try {
      let results: any[] = [];
      const trimmedKey = apiKey.trim();

      const fetchWithRetry = async (url: string, options: RequestInit) => {
        try {
          const resp = await fetch(url, options);
          if (resp.ok) return resp;
          throw new Error(`${resp.status} ${resp.statusText}`);
        } catch (err: any) {
          if (err.name === 'TypeError' || err.message.includes('fetch')) {
            // Try proxy as fallback if network/CORS error
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const proxyResp = await fetch(proxyUrl, options);
            if (proxyResp.ok) return proxyResp;
          }
          throw err;
        }
      };

      if (galleryMode === 'pexels') {
        const pRes = await PexelsService.searchPhotos(query, trimmedKey, page);
        results = pRes.map(p => ({
          id: p.id,
          url: p.src.large2x || p.src.large,
          thumb: performanceMode ? p.src.medium : (p.src.large2x || p.src.large),
          alt: p.alt || 'Pexels Photo',
          author: p.photographer,
          authorUrl: p.photographer_url,
          source: 'pexels'
        }));
      } else if (galleryMode === 'pixabay') {
        const url = `https://pixabay.com/api/?key=${trimmedKey}&q=${encodeURIComponent(query)}&page=${page}&image_type=photo&per_page=30`;
        const resp = await fetchWithRetry(url, {});
        const data = await resp.json();
        results = (data.hits || []).map((h: any) => ({
          id: h.id,
          url: h.largeImageURL,
          thumb: performanceMode ? h.webformatURL : h.largeImageURL,
          alt: h.tags || 'Pixabay Photo',
          author: h.user,
          authorUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
          source: 'pixabay'
        }));
      } else if (galleryMode === 'unsplash') {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=30&client_id=${trimmedKey}`;
        const resp = await fetchWithRetry(url, {});
        const data = await resp.json();
        results = (data.results || []).map((r: any) => ({
          id: r.id,
          url: r.urls.regular,
          thumb: performanceMode ? r.urls.small : r.urls.regular,
          alt: r.alt_description || 'Unsplash Photo',
          author: r.user.name,
          authorUrl: r.user.links.html,
          source: 'unsplash'
        }));
      }

      const mapped = results.map(r => ({ ...r, selected: false }));
      if (page === 1) setPexelsResults(mapped);
      else setPexelsResults(prev => {
        const existingIds = new Set(prev.map(p => p.id + p.source));
        const uniqueNew = mapped.filter(p => !existingIds.has(p.id + p.source));
        return [...prev, ...uniqueNew];
      });
      setPexelsPage(page);
    } catch (e: any) {
      console.error(e);
      notify(t('pexelsError'), 'error');
    } finally {
      setIsSearchingPexels(false);
    }
  };

  const shortenName = (name: string, max: number = 30) => {
    if (name.length <= max) return name;
    return name.substring(0, max) + '...';
  };

  const insertExternalImage = (photo: any, position: 'left' | 'right' | 'center' | 'plain') => {
    const url = photo.url.split('?')[0];
    const name = shortenName(photo.alt || 'Photo');
    const photographer = photo.author;
    const photographerUrl = photo.authorUrl;

    let attribution = '';
    if (pexelsSettings.withAttribution) {
      const source = (photo.source || 'pexels').toLowerCase();
      const sourceName = source === 'unsplash' ? 'Unsplash' : source === 'pixabay' ? 'Pixabay' : 'Pexels';
      attribution = `<div align="${singleCaptionAlign}"><sup>By <a href="${photographerUrl}">${photographer}</a> on <a href="https://${source}.com">${sourceName}</a></sup></div>`;
    }

    if (imageInsertFormat === 'markdown') {
      const externalLinkUrl = photo.pageURL || photo.url.split('?')[0];
      let md = `![${name}](${url})`;
      if (pexelsSettings.linkEmbedded) {
        md = `[${md}](${externalLinkUrl})`;
      }
      
      let finalMd: string;
      if (position === 'plain') {
        finalMd = md + (attribution ? '\n\n' + attribution : '');
      } else if (position === 'center') {
        finalMd = `<center>\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</center>`;
      } else {
        finalMd = `<div class="pull-${position}">\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</div>`;
      }

      if (!isTextWrapEnabled && (position === 'left' || position === 'right')) finalMd += '\n<div class="clearfix"></div>\n';
      insertAtCursor(finalMd);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      return;
    }

    const imgHtml = `<img src="${url}" alt="${name}">`;
    let html = '';
    if (position === 'plain') html = imgHtml + (attribution ? '<br/>' + attribution : '');
    else if (position === 'left' || position === 'right') html = `<div class="pull-${position}">${imgHtml}<br/>${attribution}</div>`;
    else if (position === 'center') html = `<center>${imgHtml}<br/>${attribution}</center>`;

    if (!isTextWrapEnabled && (position === 'left' || position === 'right')) html += '\n<div class="clearfix"></div>\n';
    insertAtCursor(html);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const insertImage = (url: string, name: string, position: 'left' | 'right' | 'center' | 'plain') => {
    const sName = shortenName(name);
    // Find exif if it exists in local gallery
    const localImg = images.find(i => i.url === url);
    const exifTable = localImg?.exif || '';
    
    let attribution = '';
    if (gridWithCaptions) {
      attribution = `<div align="${singleCaptionAlign}"><sup> ✍️ </sup></div>`;
    }

    if (imageInsertFormat === 'markdown') {
      const md = `![${sName}](${url})`;
      let finalMd: string;
      if (position === 'plain') {
        finalMd = md + (attribution ? '\n\n' + attribution : '');
      } else if (position === 'center') {
        finalMd = `<center>\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</center>`;
      } else {
        finalMd = `<div class="pull-${position}">\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</div>`;
      }

      if (!isTextWrapEnabled && (position === 'left' || position === 'right')) {
        finalMd += '\n<div class="clearfix"></div>\n';
      }

      insertAtCursor(finalMd + exifTable, 'end');
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      return;
    }

    const imgHtml = `<img src="${url}" alt="${sName}">`;
    let html = '';

    if (position === 'plain') {
      html = imgHtml + (attribution ? '<br/>' + attribution : '');
    } else if (position === 'left' || position === 'right') {
      html = `<div class="pull-${position}">${imgHtml}<br/>${attribution}</div>`;
    } else if (position === 'center') {
      html = `<center>${imgHtml}<br/>${attribution}</center>`;
    }

    if (!isTextWrapEnabled && (position === 'left' || position === 'right')) {
      html += '\n<div class="clearfix"></div>\n';
    }

    insertAtCursor(html + exifTable, 'end');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const insertGrid = () => {
    const selected = galleryMode === 'local' 
      ? images.filter(img => img.selected)
      : pexelsResults.filter(p => p.selected);

    if (selected.length === 0) return;
    
    let result = '';

    const getCaption = (item: any, index: number, isLocal: boolean, htmlMode: boolean = false) => {
      if (isLocal) return ` ✍️ `;
      
      const photo = item as any;
      const author = photo.photographer || item.author || 'Author';
      const source = (photo.source || 'pexels').toLowerCase();
      const authorUrl = photo.photographer_url || item.authorUrl || '#';
      
      // Officially capitalized
      const sourceName = source === 'unsplash' ? 'Unsplash' : source === 'pixabay' ? 'Pixabay' : 'Pexels';
      
      if (pexelsSettings.withAttribution) {
        if (htmlMode) {
           return `By <a href="${authorUrl}">${author}</a> on <a href="https://${source}.com">${sourceName}</a>`;
        }
        return `By [${author}](${authorUrl}) on [${sourceName}](https://${source}.com)`;
      }
      return ` ✍️ `;
    };

    const getMarkdownImg = (item: any, isLocal: boolean) => {
      if (isLocal) return `![${(item as ImageItem).name}](${item.url})`;
      const photo = item as PexelsPhoto;
      let url = photo.src?.large2x || photo.src?.large || item.url;
      if (url?.includes('?')) url = url.split('?')[0];
      return `![Photo by ${photo.photographer || item.author || 'Author'}](${url})`;
    };

    const getHtmlImg = (item: any, isLocal: boolean) => {
      if (isLocal) return `<img src="${item.url}" style="width:100%">`;
      const photo = item as PexelsPhoto;
      let url = photo.src?.large2x || photo.src?.large || item.url;
      if (url?.includes('?')) url = url.split('?')[0];
      return `<img src="${url}" style="width:100%">`;
    };

    const generateCell = (item: any, idx: number, isLocal: boolean, isHtml: boolean) => {
      const photo = item as any;
      const externalLinkUrl = item.url || item.pageURL || photo?.photographer_url || item.url;
      const shouldLink = pexelsSettings.linkEmbedded || !isLocal;
      
      const img = isHtml ? getHtmlImg(item, isLocal) : getMarkdownImg(item, isLocal);
      let wrapped = img;
      if (shouldLink && externalLinkUrl) {
        wrapped = isHtml ? `<a href="${externalLinkUrl}">${img}</a>` : `[${img}](${externalLinkUrl})`;
      }
      
      const shouldShowCaption = gridWithCaptions || (pexelsSettings.withAttribution && !isLocal);
      if (shouldShowCaption) {
        const cap = getCaption(item, idx, isLocal, isHtml);
        const capHtml = `<br/><div align="${singleCaptionAlign}"><sup>${cap}</sup></div>`;
        const capMd = `<br/><sub>${cap}</sub>`;
        return wrapped + (isHtml ? capHtml : capMd);
      }
      
      return wrapped;
    }

    if (gridLayout === 'col-img-text' || gridLayout === 'col-text-img') {
      const isImgFirst = gridLayout === 'col-img-text';
      if (imageInsertFormat === 'markdown') {
        const header = isImgFirst 
          ? `| ${t('image') || 'Зображення'} | ${t('description') || 'Опис'} |\n|---|---|\n`
          : `| ${t('description') || 'Опис'} | ${t('image') || 'Зображення'} |\n|---|---|\n`;
        let rows = '';
        selected.forEach((item, index) => {
          const imgCell = generateCell(item, index, galleryMode === 'local', false);
          const descCell = `${t('typeHere') || ' ✍️ '}`;
          rows += isImgFirst ? `| ${imgCell} | ${descCell} |\n` : `| ${descCell} | ${imgCell} |\n`;
        });
        result = '\n' + header + rows + '\n';
      } else {
        result = `<table style="width:100%">\n`;
        selected.forEach((item, index) => {
          const imgCell = generateCell(item, index, galleryMode === 'local', true);
          const descCell = `${t('typeHere') || ' ✍️ '}`;
          result += `  <tr>\n`;
          if (isImgFirst) {
            result += `    <td style="width:50%">${imgCell}</td>\n    <td style="width:50%">${descCell}</td>\n`;
          } else {
            result += `    <td style="width:50%">${descCell}</td>\n    <td style="width:50%">${imgCell}</td>\n`;
          }
          result += `  </tr>\n`;
        });
        result += `</table>\n\n`;
      }
    } else if (gridLayout === 'col') {
      // Column layout (stacked vertically blocks)
      result = '\n';
      selected.forEach((item, index) => {
        result += generateCell(item, index, galleryMode === 'local', imageInsertFormat === 'html') + '\n\n';
      });
    } else if (gridLayout === 'col-table') {
      if (imageInsertFormat === 'markdown') {
        result = '\n| |\n|---|\n';
        selected.forEach((item, index) => {
          result += `| ${generateCell(item, index, galleryMode === 'local', false)} |\n`;
        });
        result += '\n';
      } else {
        result = `<table style="width:100%">\n`;
        selected.forEach((item, index) => {
          result += `  <tr>\n    <td>${generateCell(item, index, galleryMode === 'local', true)}</td>\n  </tr>\n`;
        });
        result += `</table>\n\n`;
      }
    } else if (gridLayout === 'grid-2') {
      const cols = 2;
      if (imageInsertFormat === 'markdown') {
        const numCols = Math.min(selected.length, cols);
        const header = '|' + Array(numCols).fill(' ').join('|') + '|\n';
        const separator = '|' + Array(numCols).fill('---').join('|') + '|\n';
        result += '\n' + header + separator;

        for (let i = 0; i < selected.length; i += cols) {
          let row = '|';
          for (let j = 0; j < cols; j++) {
            const idx = i + j;
            if (idx < selected.length) {
              row += ` ${generateCell(selected[idx], idx, galleryMode === 'local', false)} |`;
            } else {
              row += ` |`;
            }
          }
          result += row + '\n';
        }
      } else {
        result = `<table style="width:100%">\n`;
        for (let i = 0; i < selected.length; i += cols) {
          result += `  <tr>\n`;
          for (let j = 0; j < cols; j++) {
            const idx = i + j;
            if (idx < selected.length) {
              result += `    <td style="width:${100/cols}%">${generateCell(selected[idx], idx, galleryMode === 'local', true)}</td>\n`;
            } else {
              result += `    <td style="width:${100/cols}%"></td>\n`;
            }
          }
          result += `  </tr>\n`;
        }
        result += `</table>\n\n`;
      }
    } else {
      // Row layout
      if (imageInsertFormat === 'markdown') {
        const header = '|' + selected.map(() => ' ').join('|') + '|\n';
        const separator = '|' + selected.map(() => '---').join('|') + '|\n';
        let row = '|';
        selected.forEach((item, index) => {
          row += ` ${generateCell(item, index, galleryMode === 'local', false)} |`;
        });
        result = '\n' + header + separator + row + '\n';
      } else {
        result = `<table style="width:100%">\n  <tr>`;
        selected.forEach((item, index) => {
          result += `\n    <td>${generateCell(item, index, galleryMode === 'local', true)}</td>`;
        });
        result += `\n  </tr>\n</table>\n\n`;
      }
    }
    
    if (galleryMode === 'local') {
      setImages(images.map(img => ({ ...img, selected: false })));
    } else {
      setPexelsResults(pexelsResults.map(p => ({ ...p, selected: false })));
    }
    
    if (!isTextWrapEnabled) {
      result += '\n<div class="clearfix"></div>\n';
    }
    
    insertAtCursor(result, 'end');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const processContentForSteem = (raw: string) => {
    return raw;
  };

  const performBroadcast = async (
    author: string, 
    title: string, 
    body: string, 
    tags: string, 
    auth: AuthType,
    rewardType: 'SP' | '50' | '0' = '50',
    beneficiaries: {account: string, weight: number}[] = []
  ) => {
    const finalBody = processContentForSteem(body);
    const tagsArray = tags.split(' ').map(t => t.trim()).filter(t => t);
    const parentPermlink = tagsArray[0] || 'blog';
    const permlink = createPermlinkUA(title);
    
    const meta = JSON.stringify({ 
      tags: tagsArray, 
      app: appAgent, 
      format: 'markdown' 
    });

    const options = {
      allow_curation_rewards: true,
      allow_votes: true,
      author: author,
      permlink: permlink,
      max_accepted_payout: rewardType === '0' ? '0.000 SBD' : '1000000.000 SBD',
      percent_steem_dollars: rewardType === 'SP' ? 0 : 10000,
      extensions: beneficiaries.length > 0 ? [[0, {
        beneficiaries: beneficiaries.sort((a, b) => a.account.localeCompare(b.account)).map(b => ({
          account: b.account,
          weight: Math.floor(b.weight * 100) // Steem weight is in percent * 100
        }))
      }]] : []
    };

    const client = getClient();
    if (!client) throw new Error("Steem client failed to initialize.");

    if (auth === 'KEYCHAIN') {
      return new Promise((resolve, reject) => {
        // @ts-ignore
        if (!window.steem_keychain) return reject(new Error(t('noKeychain')));
        // @ts-ignore
        window.steem_keychain.requestPost(author, title, finalBody, parentPermlink, '', meta, permlink, JSON.stringify(options), (res: any) => {
          if (res.success) resolve(res);
          else reject(new Error(res.message));
        });
      });
    } else {
      if (SecurityService.isLocked()) {
        let unlocked = false;
        let pinErrorMsg = '';
        let pinToTry = vaultPin;
        while (!unlocked) {
          const pin = pinToTry || await promptDialog(
            pinErrorMsg ? `${t('pinError')} (${pinErrorMsg}). ${t('enterPin')}` : t('enterPin'),
            '',
            undefined,
            'password'
          );
          pinToTry = '';
          if (!pin) throw new Error(t('pinRequired'));
          try {
            await SecurityService.unlock(pin);
            initVault();
            unlocked = true;
          } catch (e: any) {
            pinErrorMsg = e.message || 'Incorrect PIN';
            notify(`❌ ${pinErrorMsg}`, 'error');
          }
        }
      }
      const comment = {
        author,
        title,
        body: finalBody,
        parent_author: '',
        parent_permlink: parentPermlink,
        permlink,
        json_metadata: meta
      };
      return SecurityService.broadcastPost(client, comment, author, options);
    }
  };

  const handleSplitPost = () => {
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    if (!currentMarkdown.trim()) return;
    
    const lines = currentMarkdown.split('\n');
    const originalTitle = lines[0].replace(/[#*`]/g, '').trim() || t('untitled');
    const bodyLines = lines.slice(1);
    const bodyText = bodyLines.join('\n').trim();
    
    if (!bodyText) {
      notify(t('fillRequired'), 'error');
      return;
    }

    const tokens = bodyText.match(/\S+|\s+/g) || [];
    const targetWordsPerPart = splitWords || 300;
    const parts: string[] = [];
    
    let currentPartStr = '';
    let currentPartWordCount = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      currentPartStr += token;
      if (/\S+/.test(token)) {
        currentPartWordCount++;
      }
      
      let isBreak = false;
      if (currentPartWordCount >= targetWordsPerPart) {
         if (token.includes('\n\n') || token.includes('\n') || currentPartWordCount >= targetWordsPerPart + 50) {
            isBreak = true;
         }
      }
      
      if (isBreak) {
         parts.push(currentPartStr.trim());
         currentPartStr = '';
         currentPartWordCount = 0;
      }
    }
    
    if (currentPartStr.trim().length > 0) {
      if (parts.length > 0 && currentPartWordCount < 50) {
        parts[parts.length - 1] += '\n\n' + currentPartStr.trim();
      } else {
        parts.push(currentPartStr.trim());
      }
    }

    const existingDrafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
    const newDrafts: Draft[] = parts.map((partContent, index) => ({
      id: (Date.now() + index).toString(),
      title: `${originalTitle} №${index + 1}`,
      body: `# ${originalTitle} №${index + 1}\n\n${partContent}`,
      date: new Date().toLocaleString(),
      status: 'working',
      tags: pubTags
    }));

    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify([...newDrafts, ...existingDrafts]));
    notify(t('splitSuccess').replace('{count}', parts.length.toString()), 'success');
    setActiveModal(null);
  };

  const toggleTag = (tag: string) => {
    setPubTags(prev => {
      const tags = prev.split(' ').filter(t => t.trim());
      if (tags.includes(tag)) {
        return tags.filter(t => t !== tag).join(' ');
      }
      return [...tags, tag].join(' ');
    });
  };
  const handlePublish = async () => {
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    const lines = currentMarkdown.split('\n');
    const firstLine = lines[0].trim();
    let finalTitle = pubTitle;
    let actualContent = currentMarkdown;

    if (!finalTitle) {
      finalTitle = firstLine.replace(/[#*`]/g, '').trim().substring(0, 100);
    }
    
    if (removeTitleLine) {
      // Because we may have split newlines, let's remove the very first line of content
      actualContent = lines.slice(1).join('\n').trim();
    }

    const processedContent = processContentForSteem(actualContent);
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;

    if (!activeUser || !finalTitle || !pubTags) {
      setPubLog({ msg: t('fillRequired'), type: 'error' });
      return;
    }

    setPubLog({ msg: t('publishing'), type: 'loading' });
    
    try {
      await performBroadcast(activeUser, finalTitle, processedContent, pubTags, authType, rewardType, beneficiaries);
      setPubLog({ msg: t('publishedSuccess'), type: 'success' });
      setTimeout(() => setActiveModal(null), 2000);
    } catch (err: any) {
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
    }
  };

  const publishFromQueue = async (id: string) => {
    const item = queue.find(i => i.id === id);
    if (!item) return;

    setPubLog({ msg: `${t('publishing')} ${item.title}...`, type: 'loading' });
    
    try {
      const author = item.authType === 'VAULT' ? item.selectedVaultUser : item.username;
      await performBroadcast(author, item.title, item.body, item.tags, item.authType);
      
      const updated = queue.map(i => i.id === id ? { ...i, status: 'published' as const } : i);
      setQueue(updated);
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
      setPubLog({ msg: t('publishedSuccess'), type: 'success' });
    } catch (err: any) {
      const updated = queue.map(i => i.id === id ? { ...i, status: 'error' as const, error: err.message } : i);
      setQueue(updated);
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
    }
  };

  const addToQueue = () => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser || !pubTitle || !pubTags) {
      setPubLog({ msg: t('error'), type: 'error' });
      return;
    }
    
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    let actualContent = currentMarkdown;
    if (removeTitleLine) {
      const lines = currentMarkdown.split('\n');
      actualContent = lines.slice(1).join('\n').trim();
    }
    const processedContent = processContentForSteem(actualContent);

    const newItem: QueueItem = {
      id: Date.now().toString(),
      title: pubTitle,
      body: processedContent,
      tags: pubTags,
      authType,
      username: username,
      selectedVaultUser: selectedVaultUser,
      scheduledTime: scheduledTime,
      status: 'pending'
    };

    const updated = [...queue, newItem];
    setQueue(updated);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
    setPubLog({ msg: t('published'), type: 'success' });
    setTimeout(() => setActiveModal(null), 1000);
  };

  const saveDraft = (status: 'working' | 'ready' = 'working') => {
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    
    const title = currentMarkdown.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 50) || t('untitled');
    const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
    
    if (currentDraftId) {
      // Update existing draft
      const updated = drafts.map((d: Draft) => {
        if (d.id === currentDraftId) {
          return { ...d, title, body: currentMarkdown, date: new Date().toLocaleString(), status };
        }
        return d;
      });
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(updated));
    } else {
      // Create new draft
      const newId = Date.now().toString();
      const newDraft: Draft = {
        id: newId,
        title,
        body: currentMarkdown,
        date: new Date().toLocaleString(),
        status
      };
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify([newDraft, ...drafts]));
      setCurrentDraftId(newId);
    }
    notify(t('saveSuccess'));
  };

  const handleEditPost = (post: SteemPost) => {
    setPubTitle(post.title);
    setContent(post.body);
    setPubTags(JSON.parse(post.json_metadata || '{}').tags?.join(' ') || post.category);
    setActiveView('editor');
    notify(t('editor'), 'success');
  };

  const handleDeleteComment = async (author: string, permlink: string) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }
    
    try {
      setPubLog({ msg: 'Deleting...', type: 'loading' });
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      
      if (authType === 'VAULT') {
        await SecurityService.broadcastDeleteComment(client, activeUser, permlink);
      } else {
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestBroadcast(activeUser, [['delete_comment', { author: activeUser, permlink }]], 'Posting', (response: any) => {
            if (response.success) resolve(response);
            else reject(new Error(response.message));
          });
        });
      }
      setPubLog({ msg: 'Deleted successfully', type: 'success' });
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    } catch (err: any) {
      console.error(err);
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
      throw err;
    }
  };

  const handleUploadImageForReader = async (file: File): Promise<string> => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const uploadAuthType = imageUploadAccount ? 'VAULT' : (hasKeychain ? 'KEYCHAIN' : 'VAULT');
    let activeUser = imageUploadAccount || username || selectedVaultUser || (vaultAccounts.length > 0 ? vaultAccounts[0] : '');

    if (!activeUser) {
      if (uploadAuthType !== 'VAULT') {
        const inputUser = await promptDialog(t('username'));
        if (!inputUser) throw new Error("No username");
        activeUser = inputUser.replace('@', '');
        setUsername(activeUser);
        localStorage.setItem('steem_username', activeUser);
      } else {
         throw new Error("No Vault user selected.");
      }
    }
    
    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
      let unlocked = false;
      let pinErrorMsg = '';
      while (!unlocked) {
        const pass = await promptDialog(
          pinErrorMsg ? `${t('pinError')} (${pinErrorMsg}). ${t('enterPin')}` : t('enterPin'),
          '',
          undefined,
          'password'
        );
        if (!pass) throw new Error(t('pinRequired') || "Cancelled");
        try {
          await SecurityService.unlock(pass);
          initVault();
          unlocked = true;
        } catch (e: any) {
          pinErrorMsg = e.message || 'Incorrect PIN';
          notify(`❌ ${pinErrorMsg}`, 'error');
        }
      }
    }

    setPubLog({ msg: `Uploading ${file.name}...`, type: 'loading' });
    try {
      const sanitizedName = sanitizeFilename(file.name);
      const safeFile = new File([file], sanitizedName, { type: file.type });
      let signature = '';
      if (uploadAuthType === 'VAULT') {
        const arrayBuffer = await safeFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
        const dataToSign = Buffer.concat([prefix, fileBuffer]);
        signature = await SecurityService.signBuffer(dataToSign, activeUser);
      } else {
        signature = await SecurityService.signImageChallengeWithKeychain(safeFile, activeUser);
      }

      const formData = new FormData();
      formData.append("file", safeFile);
      const res = await fetch(`https://steemitimages.com/${activeUser}/${signature}`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server error " + res.status);
      const data = await res.json();
      return data.url || data.link || data.data?.url;
    } finally {
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    }
  };

  const handleReaderComment = async (parentAuthor: string, parentPermlink: string, body: string, editPermlink?: string) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }

    try {
      setPubLog({ msg: t('publishing'), type: 'loading' });
      const permlink = editPermlink || `re-${parentAuthor.replace(/\./g, '')}-${Date.now()}`;
      const meta = JSON.stringify({ tags: [], app: appAgent, format: 'markdown' });
      
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      const comment = {
        author: activeUser,
        title: '',
        body,
        parent_author: parentAuthor,
        parent_permlink: parentPermlink,
        permlink,
        json_metadata: meta
      };

      if (authType === 'KEYCHAIN') {
        if (!(window as any).steem_keychain) {
          throw new Error("Steem Keychain extension not found! Please install it.");
        }
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestPost(activeUser, '', body, parentPermlink, parentAuthor, meta, permlink, '', (res: any) => {
            if (res.success) resolve(res);
            else reject(new Error(res.message || "Keychain request failed"));
          });
        });
      } else {
        await SecurityService.broadcastPost(client, comment, activeUser);
      }
      
      notify(t('publishedSuccess'), 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setPubLog({ msg: '', type: null });
    }
  };

  const handleMuteUser = async (targetUser: string, mute: boolean = true) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }

    try {
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      
      const json = JSON.stringify(['follow', { follower: activeUser, following: targetUser, what: mute ? ['ignore'] : [''] }]);
      
      if (authType === 'KEYCHAIN') {
        if (!(window as any).steem_keychain) {
          throw new Error("Steem Keychain extension not found! Please install it.");
        }
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestCustomJson(activeUser, 'follow', 'Posting', json, 'mute', (res: any) => {
            if (res.success) resolve(res);
            else reject(new Error(res.message || "Keychain request failed"));
          });
        });
      } else {
        await SecurityService.broadcastCustomJson(client, {
          required_auths: [],
          required_posting_auths: [activeUser],
          id: 'follow',
          json: json
        }, activeUser);
      }
      notify(`Successfully ${mute ? 'muted' : 'unmuted'} @${targetUser}`, 'success');
      setMutedUsers(prev => {
        let next;
        if (mute) next = Array.from(new Set([...prev, targetUser]));
        else next = prev.filter(u => u !== targetUser);
        localStorage.setItem('steem_muted_users', JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      notify(err.message || String(err), 'error');
      throw err;
    }
  };

  const handleReaderVote = async (author: string, permlink: string, weight: number) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }

    const key = `${author}/${permlink}`;
    if (loadingContext.has(key)) return;
    setLoadingContext(prev => new Set(prev).add(key));

    try {
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      const vote = { voter: activeUser, author, permlink, weight };

      if (authType === 'KEYCHAIN') {
        if (!(window as any).steem_keychain) {
          throw new Error("Steem Keychain extension not found! Please install it.");
        }
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestVote(activeUser, permlink, author, weight, (res: any) => {
            if (res.success) resolve(res);
            else reject(new Error(res.message || "Keychain request failed"));
          });
        });
      } else {
        await SecurityService.broadcastVote(client, vote, activeUser);
      }
      notify(t('saveSuccess'), 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoadingContext(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // ... (inside the activeModal === 'drafts' block later)


  const toggleDraftStatus = (id: string) => {
    const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
    const updated = drafts.map((d: Draft) => {
      if (d.id === id) {
        return { ...d, status: d.status === 'ready' ? 'working' : 'ready' };
      }
      return d;
    });
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(updated));
    // Hack to re-render:
    const current = activeModal;
    setActiveModal(null);
    setTimeout(() => setActiveModal(current), 10);
  };

  const addMention = () => {
    const name = newMention.trim().replace('@', '');
    if (!name || mentions.includes(name)) return;
    const updated = [name, ...mentions];
    setMentions(updated);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
    setNewMention('');
  };

  const toggleTool = (key: string) => {
    const newTools = enabledTools.includes(key)
      ? enabledTools.filter(t => t !== key)
      : [...enabledTools, key];
    setEnabledTools(newTools);
    localStorage.setItem(STORAGE_KEY_FLOAT_CONFIG, JSON.stringify(newTools));
  };

  const moveTool = (key: string, dir: 'up' | 'down') => {
    const idx = enabledTools.indexOf(key);
    if (idx === -1) return;
    const newTools = [...enabledTools];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newTools.length) return;
    [newTools[idx], newTools[targetIdx]] = [newTools[targetIdx], newTools[idx]];
    setEnabledTools(newTools);
    localStorage.setItem(STORAGE_KEY_FLOAT_CONFIG, JSON.stringify(newTools));
  };

  const saveFileNatively = async (blob: Blob, defaultFilename: string, mimeType: string = 'text/plain') => {
    try {
      // 0. UNIVERSAL NATIVE HOOKS FOR TAURI / NEUTRALINO / ANDROID / LINUX WEBVIEW INTERCEPTION
      if (typeof window !== 'undefined') {
        const isText = mimeType.startsWith('text/') || mimeType.includes('json');
        let textData = '';
        let base64Data = '';
        
        if (isText) {
          textData = await blob.text();
        } else {
          const reader = new FileReader();
          base64Data = await new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1] || '');
            };
            reader.readAsDataURL(blob);
          });
        }

        // Dispatch CustomEvent for native webview listeners (Tauri, Neutralino, etc.)
        const nativeSaveEvent = new CustomEvent('nativeSaveFile', {
          detail: {
            filename: defaultFilename,
            mimeType,
            text: textData,
            base64: base64Data,
          }
        });
        window.dispatchEvent(nativeSaveEvent);

        // Also post message to window so webview container postMessage listeners can intercept it
        window.postMessage({
          type: 'nativeSaveFile',
          filename: defaultFilename,
          mimeType,
          text: textData,
          base64: base64Data,
        }, '*');

        // Check for specific NeuroLino custom bridge
        if ((window as any).NeuroLinoBridge?.saveFile) {
          (window as any).NeuroLinoBridge.saveFile(base64Data || btoa(textData), defaultFilename, mimeType);
        }
        
        // Check for webkit message handlers (iOS / macOS native WebView)
        if ((window as any).webkit?.messageHandlers?.saveFile?.postMessage) {
          (window as any).webkit.messageHandlers.saveFile.postMessage({
            filename: defaultFilename,
            mimeType,
            text: textData,
            base64: base64Data
          });
        }
      }

      // 1. NEUTRALINO.JS (Native desktop app runner)
      if (typeof window !== 'undefined' && (window as any).Neutralino) {
        const neu = (window as any).Neutralino;
        const ext = defaultFilename.split('.').pop() || '*';
        const filePath = await neu.os.showSaveDialog('Save File', {
          defaultPath: defaultFilename,
          filters: [{
            name: `${ext.toUpperCase()} Files`,
            extensions: [ext]
          }]
        });
        if (filePath) {
          if (mimeType.startsWith('text/')) {
            const text = await blob.text();
            await neu.filesystem.writeFile(filePath, text);
          } else {
            const buffer = await blob.arrayBuffer();
            await neu.filesystem.writeBinaryFile(filePath, buffer);
          }
          return true;
        }
        return false;
      }

      // 2. TAURI (Native desktop app runner)
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        try {
          let saveFn: any = null;
          let writeFn: any = null;

          try {
            const { save } = await import('@tauri-apps/plugin-dialog');
            const { writeFile } = await import('@tauri-apps/plugin-fs');
            saveFn = save;
            writeFn = writeFile;
          } catch {
            try {
              // @ts-ignore
              const { save } = await import(String('@tauri-apps/api/dialog'));
              // @ts-ignore
              const { writeFile } = await import(String('@tauri-apps/api/fs'));
              saveFn = save;
              writeFn = writeFile;
            } catch {
              const tauri = (window as any).__TAURI__;
              if (tauri.dialog?.save) saveFn = tauri.dialog.save;
              if (tauri.fs?.writeFile) writeFn = tauri.fs.writeFile;
            }
          }

          if (saveFn && writeFn) {
            const ext = defaultFilename.split('.').pop() || '*';
            try {
              const filePath = await saveFn({
                defaultPath: defaultFilename,
                filters: [{
                  name: 'Files',
                  extensions: [ext]
                }]
              });
              
              if (filePath) {
                const buffer = await blob.arrayBuffer();
                await writeFn(filePath, new Uint8Array(buffer));
                return true;
              } else if (typeof filePath === 'string') {
                // User explicitly cancelled dialog
                return false;
              }
            } catch (dialogErr) {
              console.debug("Tauri dialog.save not fully available on this platform, trying fallbacks:", dialogErr);
            }
          }
        } catch (tauriErr) {
          console.error("Tauri native save failed, trying fallback:", tauriErr);
        }
      }

      // 3. ANDROID NATIVE BRIDGE / Custom App Bridges
      if (typeof window !== 'undefined' && (window as any).AndroidBridge?.saveFile) {
        return new Promise<boolean>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            (window as any).AndroidBridge.saveFile(base64, defaultFilename, mimeType);
            resolve(true);
          };
          reader.readAsDataURL(blob);
        });
      }

      // 4. MODERN WEB FILE SYSTEM ACCESS API (showSaveFilePicker)
      // Works on modern desktop Chromium, allows direct file writing
      if (typeof window !== 'undefined' && typeof (window as any).showSaveFilePicker === 'function') {
        try {
          const ext = defaultFilename.split('.').pop() || 'md';
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [{
              description: `${ext.toUpperCase()} Documents`,
              accept: {
                [mimeType]: ['.' + ext]
              }
            }]
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return true;
        } catch (pickerErr: any) {
          if (pickerErr.name === 'AbortError') {
            return false;
          }
          console.warn("showSaveFilePicker failed or unsupported on this platform, falling back to download:", pickerErr);
        }
      }

      // 5. NATIVE SHARE FALLBACK FOR MOBILE (Android/iOS)
      if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
        try {
          const file = new File([blob], defaultFilename, { type: mimeType });
          if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
            try {
              await (navigator as any).share({
                files: [file],
                title: defaultFilename
              });
              return true;
            } catch (shareErr: any) {
              if (shareErr.name === 'AbortError') return false; // User cancelled
              console.warn("Share API failed, falling back to direct download:", shareErr);
            }
          }
        } catch (canShareErr) {
          console.debug("canShare error:", canShareErr);
        }
      }

      // 6. STANDARD WEB / MOBILE DOWNLOAD FALLBACK (Anchor element tag with deferred revoke)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      a.rel = 'noopener noreferrer';
      a.target = '_self';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          if (a.parentNode) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {
          /* ignore cleanup error */
        }
      }, 60000);
      return true;
    } catch (err: any) {
      console.error("All save operations failed, using fallback:", err);
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFilename;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            if (a.parentNode) document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch {
            /* ignore cleanup error */
          }
        }, 60000);
        return true;
      } catch (finalErr) {
        console.error("Critical download error:", finalErr);
        return false;
      }
    }
  };

  const handleClearCache = async () => {
    const confirmed = await confirmDialog(
      lang === 'uk' 
        ? "Очистити кеш переглянутих дописів, тимчасових списків та завантажених зображень? Ваші чернетки, шаблони та збережені ключі НЕ будуть видалені." 
        : "Clear cached posts, loaded lists, and temporary images? Your drafts, templates, and keys will NOT be deleted."
    );
    if (!confirmed) return;

    const cleared = true;
    
    // Clear Web LocalStorage caches (safe temporary keys only)
    localStorage.removeItem('steem_gallery_cache_results');
    localStorage.removeItem('steem_pexels_settings');
    localStorage.removeItem('steem_hidden_replies');
    
    // Clear session storage
    sessionStorage.clear();

    // Clear Service Worker / CacheStorage API caches if present (Web & PWA & WebView)
    if (typeof caches !== 'undefined') {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      } catch (cErr) {
        console.debug("CacheStorage clear skipped:", cErr);
      }
    }

    try {
      // Tauri Native Cache Clear
      const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__);
      if (isTauri) {
        let pathModule, fsModule;
        try {
          pathModule = await import('@tauri-apps/api/path');
          fsModule = await import('@tauri-apps/plugin-fs');
        } catch {
          try {
            // @ts-ignore
            pathModule = await import(String('@tauri-apps/api/path'));
            // @ts-ignore
            fsModule = await import(String('@tauri-apps/api/fs'));
          } catch {
            const tauri = (window as any).__TAURI__;
            if (tauri) {
              pathModule = tauri.path;
              fsModule = tauri.fs;
            }
          }
        }

        if (pathModule && fsModule) {
          try {
            const cacheDir = await pathModule.appCacheDir();
            const localDataDir = await pathModule.appLocalDataDir();

            const clearCachesInDir = async (dirToScan: string, isStrictlyCacheDir: boolean) => {
              try {
                const entries = await fsModule.readDir(dirToScan);
                for (const entry of entries) {
                  if (!entry.name) continue;
                  const lowerName = entry.name.toLowerCase();
                  
                  if (entry.isDirectory && (lowerName.includes('cache') || lowerName === 'fscacheddata')) {
                    const targetPath = await pathModule.join(dirToScan, entry.name);
                    try {
                      await fsModule.remove(targetPath, { recursive: true });
                    } catch (err: any) {
                      console.debug("Failed to remove cache path:", err);
                    }
                  } else if (entry.isDirectory && entry.name === 'EBWebView') {
                    const defaultPath = await pathModule.join(dirToScan, 'EBWebView', 'Default');
                    try {
                      const defEntries = await fsModule.readDir(defaultPath);
                      for (const defEntry of defEntries) {
                        if (defEntry.isDirectory && defEntry.name && defEntry.name.toLowerCase().includes('cache')) {
                          const targetPath = await pathModule.join(defaultPath, defEntry.name);
                          try {
                            await fsModule.remove(targetPath, { recursive: true });
                          } catch (err: any) {
                            console.debug("Failed to remove webview cache path:", err);
                          }
                        }
                      }
                    } catch (err: any) {
                      console.debug("Failed to read EBWebView path:", err);
                    }
                  } else if (isStrictlyCacheDir && entry.isDirectory && lowerName === 'webkit') {
                    const targetPath = await pathModule.join(dirToScan, entry.name);
                    try {
                      await fsModule.remove(targetPath, { recursive: true });
                    } catch (err: any) {
                      console.debug("Failed to remove webkit dir:", err);
                    }
                  }
                }
              } catch (err: any) {
                console.debug("Failed to scan cache directory:", err);
              }
            };

            await clearCachesInDir(cacheDir, cacheDir !== localDataDir);
            if (cacheDir !== localDataDir) {
              await clearCachesInDir(localDataDir, false);
            }
          } catch (pathErr) {
            console.debug("Tauri path resolution error:", pathErr);
          }
        }
      }

      if (cleared) {
        notify(lang === 'uk' ? "Кеш перегляду та зображень успішно очищено!" : "Cache cleared successfully!", "success");
      }
    } catch (err: any) {
      console.error(err);
      notify((t('nativeCacheError') || "Error") + ": " + err.message, "error");
    }
  };

  const exportBackup = async () => {
    try {
      const draftsRaw = localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]";
      const drafts = JSON.parse(draftsRaw);
      
      if (drafts.length === 0) {
        notify("No drafts to export", "success");
        return;
      }

      const zipData: Record<string, Uint8Array> = {};
      drafts.forEach((d: any) => {
        const safeTitle = (d.title || `draft-${d.id}`).replace(/[/\\?%*:|"<>]/g, '-');
        
        let content = "";
        if (d.title) content += `# ${d.title}\n\n`;
        
        content += d.body || "";
        
        // Add metadata at the bottom for convenience, separated by a horizontal rule
        if (d.tags || d.category) {
          content += `\n\n---\n- **Tags**: ${d.tags || ""}\n- **Category**: ${d.category || ""}\n`;
        }
        
        if (!content.endsWith("\n")) content += "\n";
        
        zipData[`${safeTitle}.md`] = strToU8(content);
      });
      
      const zipBuffer = zipSync(zipData);
      const blob = new Blob([zipBuffer], { type: 'application/zip' });
      const filename = `steem_drafts_md_${new Date().toISOString().split('T')[0]}.zip`;
      
      const saved = await saveFileNatively(blob, filename, 'application/zip');
      
      if (saved) {
        notify("Drafts exported as Markdown files in ZIP!", "success");
      }
    } catch (err: any) {
      notify("Error: " + err.message, "error");
    }
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      let importedDrafts: any[] = [];
      
      if (file.name.endsWith('.zip')) {
        const buffer = await file.arrayBuffer();
        const unzipped = unzipSync(new Uint8Array(buffer));
        
        // Try legacy/comprehensive format first
        if (unzipped['backup.json']) {
          const text = strFromU8(unzipped['backup.json']);
          const parsed = JSON.parse(text);
          if (parsed && parsed.drafts) {
            const draftsArr = typeof parsed.drafts === 'string' ? JSON.parse(parsed.drafts) : parsed.drafts;
            if (Array.isArray(draftsArr)) importedDrafts = draftsArr;
          }
        } else {
          // New format: iterate .md files
          const files = Object.keys(unzipped);
          const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('__MACOSX'));
          
          for (const filename of mdFiles) {
            const content = strFromU8(unzipped[filename]);
            const title = filename.split('/').pop()?.replace('.md', '') || 'Imported Draft';
            importedDrafts.push({
              id: Date.now() + Math.random(),
              title: title,
              body: content,
              tags: '',
              category: '',
              updatedAt: Date.now(),
              status: 'working'
            });
          }
        }
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          importedDrafts = parsed;
        } else if (parsed && parsed.drafts) {
          importedDrafts = typeof parsed.drafts === 'string' ? JSON.parse(parsed.drafts) : parsed.drafts;
        }
      }
      
      if (importedDrafts.length > 0) {
        localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(importedDrafts));
        notify(`${importedDrafts.length} drafts restored! Reloading...`, "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        notify("Invalid backup file or no drafts found", "error");
      }
    } catch (err: any) {
      notify("Error: " + err.message, "error");
    }
  };

  const downloadFile = async () => {
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    const lines = currentMarkdown.split('\n');
    const firstLine = lines[0]?.trim() || "";
    
    let derivedTitle = pubTitle;
    if (!derivedTitle) {
      derivedTitle = firstLine.replace(/[#*`]/g, '').trim().substring(0, 150);
    }
    
    let exportContent = "";
    // If we have a title but it's not and doesn't look like an H1 at the start, add it
    const hasH1 = firstLine.startsWith('# ');
    if (derivedTitle && !hasH1) {
      // Check if the title is already the first line text
      if (firstLine.replace(/[#*`]/g, '').trim() !== derivedTitle) {
        exportContent += `# ${derivedTitle}\n\n`;
      } else if (!firstLine.startsWith('#')) {
        // First line is the title but without #, let's wrap it nicely
        // (Actually, we'll just prepend the # to the content or let it be)
        // For simplicity, if first line IS the title but lacks #, we just add # to the start of processing
      }
    }
    
    exportContent += processContentForSteem(currentMarkdown);
    
    if (pubTags) {
      exportContent += `\n\n---\n- **Tags**: ${pubTags}\n`;
    }

    const fileBlob = new Blob([exportContent], {type: 'text/markdown'});
    
    const safeFilename = (derivedTitle || `steem-post-${Date.now()}`)
      .replace(/[/\\?%*:|"<>]/g, '-')
      .substring(0, 80)
      .trim();
      
    const fullFilename = `${safeFilename || 'steem-post'}.md`;
    
    const saved = await saveFileNatively(fileBlob, fullFilename, 'text/markdown');
    if (saved) {
      notify(`${t('fileExportSuccess')} (${fullFilename})`, 'success');
    }
  };

  const uploadExternalImage = async (url: string, fileName: string = 'image.jpg') => {
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const uploadAuthType = imageUploadAccount ? 'VAULT' : (hasKeychain ? 'KEYCHAIN' : 'VAULT');
    let activeUser = imageUploadAccount || username || selectedVaultUser || (vaultAccounts.length > 0 ? vaultAccounts[0] : '');
    
    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        notify(t('needVaultAccount'), 'error');
        setActiveModal('keys');
        return;
      } else {
        const inputUser = await promptDialog(t('username'));
        if (!inputUser) return;
        activeUser = inputUser.replace('@', '');
        setUsername(activeUser);
        localStorage.setItem('steem_username', activeUser);
      }
    }

    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
      let unlocked = false;
      let pinErrorMsg = '';
      while (!unlocked) {
        const pass = await promptDialog(
          pinErrorMsg ? `${t('pinError')} (${pinErrorMsg}). ${t('enterPin')}` : t('enterPin'),
          '',
          undefined,
          'password'
        );
        if (!pass) return;
        try {
          await SecurityService.unlock(pass);
          initVault();
          unlocked = true;
        } catch (e: any) {
          pinErrorMsg = e.message || 'Incorrect PIN';
          notify(`❌ ${pinErrorMsg}`, 'error');
        }
      }
    } else if (uploadAuthType === 'KEYCHAIN') {
      // @ts-ignore
      if (!window.steem_keychain) {
        notify(t('noKeychain'), 'error');
        return;
      }
    }

    setIsUploading(true);
    setPubLog({ msg: t('preparingUpload').replace('{name}', fileName), type: 'loading' });
    
    try {
      let blob: Blob;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        blob = await res.blob();
      } catch {
        setPubLog({ msg: t('proxyAttempt'), type: 'loading' });
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(t('proxyError'));
        blob = await res.blob();
      }

      const file = new File([blob], fileName, { type: blob.type });
      let signature = '';
      if (uploadAuthType === 'VAULT') {
        const arrayBuffer = await blob.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
        const dataToSign = Buffer.concat([prefix, fileBuffer]);
        signature = await SecurityService.signBuffer(dataToSign, activeUser);
      } else {
        signature = await SecurityService.signImageChallengeWithKeychain(file, activeUser);
      }

      const formData = new FormData();
      formData.append("file", file);
      const uploadUrl = `https://steemitimages.com/${activeUser}/${signature}`;
      const response = await fetch(uploadUrl, { method: "POST", body: formData });
      
      if (!response.ok) throw new Error(t('serverError') + response.status);
      const data = await response.json();
      const finalUrl = data.url || data.link || data.data?.url;
      
      if (finalUrl) {
        const newImg: ImageItem = { url: finalUrl, name: fileName, selected: false };
        setImages(prev => [newImg, ...prev]);
        setSourceInput(prev => finalUrl + "\n" + prev);
      }
    } catch (err: any) {
      console.error(err);
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    const files = Array.from(rawFiles);
    
    // Clear file input immediately so selecting the same file later always triggers onChange
    e.target.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    const hasKeychain = typeof window !== 'undefined' && !!(window as any).steem_keychain;
    const uploadAuthType = imageUploadAccount ? 'VAULT' : (hasKeychain ? 'KEYCHAIN' : 'VAULT');
    let activeUser = imageUploadAccount || username || selectedVaultUser || (vaultAccounts.length > 0 ? vaultAccounts[0] : '');
    
    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        notify(t('needVaultAccount'), 'error');
        setActiveModal('keys');
        return;
      } else {
        const inputUser = await promptDialog(t('username'));
        if (!inputUser) return;
        activeUser = inputUser.replace('@', '');
        setUsername(activeUser);
        localStorage.setItem('steem_username', activeUser);
      }
    }

    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
      let unlocked = false;
      let pinErrorMsg = '';
      while (!unlocked) {
        const pass = await promptDialog(
          pinErrorMsg ? `${t('pinError')} (${pinErrorMsg}). ${t('enterPin')}` : t('enterPin'),
          '',
          undefined,
          'password'
        );
        if (!pass) return;
        try {
          await SecurityService.unlock(pass);
          initVault();
          unlocked = true;
        } catch (e: any) {
          pinErrorMsg = e.message || 'Incorrect PIN';
          notify(`❌ ${pinErrorMsg}`, 'error');
        }
      }
    } else if (uploadAuthType === 'KEYCHAIN') {
      if (!(window as any).steem_keychain) {
        notify(t('noKeychain'), 'error');
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    
    // Спеціальна функція завантаження З ПРОГРЕСОМ для VAULT (XHR)
    const uploadVaultWithProgress = (file: File, signature: string, user: string, index: number): Promise<any> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        const uploadUrl = `https://steemitimages.com/${user}/${signature}`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setPubLog({ 
              msg: t('uploadProgress')
                .replace('{current}', (index + 1).toString())
                .replace('{total}', files.length.toString())
                .replace('{name}', `${file.name} (${percent}%)`), 
              type: 'loading' 
            });
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(t('serverError') + xhr.status));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.timeout = 300000; // Increased to 5 minutes for slow networks
        xhr.send(formData);
      });
    };

    // СТРОГА ПОСЛІДОВНА ЧЕРГА
    for (let i = 0; i < files.length; i++) {
      const originalFile = files[i];
      const sanitizedName = sanitizeFilename(originalFile.name);
      const file = new File([originalFile], sanitizedName, { type: originalFile.type });
      
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const exifTable = await getExifTableFromBlob(originalFile);

        let signature = '';
        if (uploadAuthType === 'VAULT') {
          const arrayBuffer = await file.arrayBuffer();
          const fileBuffer = Buffer.from(arrayBuffer);
          const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
          const dataToSign = Buffer.concat([prefix, fileBuffer]);
          
          let attempt = 0;
          let uploaded = false;
          while (attempt < 3 && !uploaded) {
            attempt++;
            try {
              setPubLog({ 
                msg: `[${i + 1}/${files.length}] ` + t('signingImage').replace('{name}', file.name) + (attempt > 1 ? ` (спроба ${attempt})` : ''), 
                type: 'loading' 
              });
              signature = await SecurityService.signBuffer(dataToSign, activeUser);
              const data = await uploadVaultWithProgress(file, signature, activeUser, i);
              const url = data.url || data.link || data.data?.url;
              if (url) {
                setImages(prev => [
                  ...prev.slice(0, i),
                  { url, name: file.name, selected: false, exif: exifTable },
                  ...prev.slice(i)
                ]);
                setSourceInput(prev => url + "\n" + prev);
                successCount++;
                uploaded = true;
                if (i === 0) {
                  insertImage(url, file.name, 'plain');
                }
              }
            } catch (err) {
              if (attempt >= 3) throw err;
              await new Promise(r => setTimeout(r, 1500 * attempt));
            }
          }
        } else {
          // ШЛЯХ KEYCHAIN: чистий fetch
          setPubLog({ 
            msg: `[${i + 1}/${files.length}] ` + t('uploadProgress').replace('{current}', (i + 1).toString()).replace('{total}', files.length.toString()).replace('{name}', file.name), 
            type: 'loading' 
          });

          signature = await SecurityService.signImageChallengeWithKeychain(file, activeUser);
          
          const formData = new FormData();
          formData.append("file", file);
          const resp = await fetch(`https://steemitimages.com/${activeUser}/${signature}`, { method: "POST", body: formData });
          if (!resp.ok) throw new Error(t('serverError') + resp.status);
          const data = await resp.json();
          const url = data.url || data.link || data.data?.url;
          if (url) {
            setImages(prev => [
              ...prev.slice(0, i),
              { url, name: file.name, selected: false, exif: exifTable },
              ...prev.slice(i)
            ]);
            setSourceInput(prev => url + "\n" + prev);
            successCount++;
            if (i === 0) {
              insertImage(url, file.name, 'plain');
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        setPubLog({ msg: `❌ ${t('fileError')} ${i + 1}: ${file.name} - ${err.message}`, type: 'error' });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (successCount > 0) {
      setPubLog({ 
        msg: t('uploadComplete').replace('{count}', successCount.toString()).replace('{total}', files.length.toString()), 
        type: 'success' 
      });
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
      if (files.length > 1) {
        setIsMiniGalleryOpen(true);
      }
    }
  };

  const TOOLS_MAP: Record<string, { label: string | React.ReactNode, action: (e?: React.MouseEvent) => void }> = {
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
    'Table': { label: <LayoutGrid size={20} />, action: (e?: React.MouseEvent) => {
      if (e) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const direction = rect.top > window.innerHeight / 2 ? 'up' : 'down';
        let x = rect.left;
        // ensure it's not offscreen (selector is ~220px wide)
        if (x + 220 > window.innerWidth) x = window.innerWidth - 240;
        setTableSelectorPos({ 
          x,
          y: direction === 'down' ? rect.bottom + 10 : window.innerHeight - rect.top + 10,
          direction
        });
        setShowTableSelector(prev => !prev);
        setTableHover({ r: 0, c: 0 });
      } else {
        insertAtCursor('| Header | Header |\n| --- | --- |\n| Cell | Cell |\n');
      }
    }},
    'Separator': { label: <SplitSquareHorizontal size={20} />, action: () => insertAtCursor('| Head |\n| --- |\n', 'end') },
    'Import': { label: <TableIcon size={20} />, action: () => importTable() },
    'Code': { label: <Code size={20} />, action: () => fmt('```\n', '\n```') },
    'Inline': { label: <Terminal size={20} />, action: () => fmt('`') },
    'Indent': { label: <Indent size={20} />, action: () => {
      if (!editorRef.current) return;
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      const selectedText = useEditorStore.getState().content.substring(start, end);
      const lines = selectedText.split('\n');
      const newText = lines.map(line => '    ' + line).join('\n');
      const newContent = useEditorStore.getState().content.substring(0, start) + newText + useEditorStore.getState().content.substring(end);
      setContent(newContent);
    }},
    'Esc': { label: '\\', action: () => fmt('\\', '') },
    'HR': { label: '—', action: () => insertAtCursor('\n\n---\n\n') },
    'Color': { label: <span className="text-red-500 font-bold text-lg">A</span>, action: () => fmt('<div class="phishy">', '</div>') },
    'Caption': { label: t('captionShort'), action: async () => {
      const url = await promptDialog(t('urlPrompt'));
      if (!url) return;
      const cap = await promptDialog(t('caption'), '');
      insertAtCursor(`<center>\n\n| <center>![image](${url})</center> |\n|:---:|\n| <center><sub>${cap || ' ✍️ '}</sub></center> |\n\n</center>\n`);
    }},
    'Left': { label: '⬅', action: () => fmt('<div class="text-left">\n', '\n</div>') },
    'Center': { label: 'Центр', action: () => fmt('<center>\n', '\n</center>') },
    'Right': { label: '➡', action: () => fmt('<div class="text-right">\n', '\n</div>') },
    'Justify': { label: 'Вирів', action: () => fmt('<div class="text-justify">\n', '\n</div>') },
    'Grid': { label: 'Сітка', action: () => insertAtCursor(`<div class="pull-left">\n${t('leftContent')}\n</div>\n<div class="pull-right">\n${t('rightContent')}\n</div>\n<div class="clearfix"></div>\n`) },
    'Templates': { label: <FileText size={20} />, action: () => setActiveModal('templates') },
    'Mentions': { label: <AtSign size={20} />, action: async () => {
      const extracted = extractMentions(contentForPublish);
      if (extracted.length === 0) {
        const name = await promptDialog(t('usernameNoAt'));
        if (name) insertAtCursor(`@${name}`);
      } else {
        const name = await promptDialog(`${t('mentionsList')}: ${extracted.join(', ')}\n${t('usernameNoAt')}`);
        if (name) insertAtCursor(`@${name}`);
      }
    }},
    'Img': { label: <ImageIcon size={20} />, action: () => {
      fileInputRef.current?.click();
    }},
    'Gallery': { label: <Images size={20} />, action: () => {
      setIsMiniGalleryOpen(prev => !prev);
    }}
  };

  // --- Render ---

  const TextWrapIcon = ({ size = 24, className = "" }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="5" width="8" height="8" rx="1" />
      <path d="M15 7h6" />
      <path d="M15 11h6" />
      <path d="M3 17h18" />
    </svg>
  );

  const ImageCaptionIcon = ({ size = 24, className = "" }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="4" width="18" height="11" rx="1" />
      <path d="M7 18h10" />
      <path d="M9 21h6" />
      {/* Sun/Mountain inside image */}
      <circle cx="8" cy="8" r="1.5" />
      <path d="M21 11l-4-4-5 5-2-2-7 7" />
    </svg>
  );

  const ShieldUserIcon = ({ size = 24, className = "" }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <g transform="matrix(1.1 0 0 1.1 -1.2 -1.2)">
        <path d="M12 22s9-4 9-10V5l-9-3-9 3v7c0 6 9 10 9 10" />
        <path d="M8 17a4 4 0 0 1 8 0" />
        <circle cx="12" cy="9.5" r="3" />
      </g>
    </svg>
  );

  return (
    <div className={cn(
      "flex flex-col w-full h-full relative font-sans overflow-hidden transition-colors duration-500 selection:bg-[rgb(var(--accent-color)/0.3)]",
      visualStyle === 'neon' ? "theme-neon bg-slate-950 text-cyan-400" : (isDarkMode ? "bg-slate-950 text-slate-100" : "theme-light bg-white text-slate-900 border-slate-200"),
      performanceMode && "perf-mode"
    )}>
      {/* Dynamic Theme Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --accent: var(--accent-hex);
          --accent-rgb: var(--accent-color);
        }
        ${visualStyle === 'neon' ? `
          .theme-neon h1, .theme-neon h2, .theme-neon h3 {
            text-shadow: 0 0 15px rgba(var(--accent-rgb), 0.6), 0 0 5px rgba(var(--accent-rgb), 0.4) !important;
          }
          .theme-neon .markdown-body h1, .theme-neon .markdown-body h2, .theme-neon .markdown-body h3 {
            border-bottom: 1px solid rgba(var(--accent-rgb), 0.3) !important;
          }
          .theme-neon button.bg-cyan-600, .theme-neon button.bg-cyan-500 {
            box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.5), 0 0 10px rgba(var(--accent-rgb), 0.3) !important;
            text-shadow: none !important;
          }
          .theme-neon .logo-s {
            text-shadow: 1px 1px 0 rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.8), 2px 2px 6px rgba(0,0,0,0.6);
            color: white !important;
            font-weight: 1000;
            -webkit-text-stroke: 0.3px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .theme-neon .neon-tab-glow {
            box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.4), 0 0 5px rgba(var(--accent-rgb), 0.2) !important;
            border: 1px solid rgba(var(--accent-rgb), 0.5) !important;
          }
          ${neonTextColored ? `
            .wysiwyg-editor, .wysiwyg-editor *, #main-editor {
              color: var(--accent) !important;
              caret-color: var(--accent) !important;
            }
            .wysiwyg-editor strong, .wysiwyg-editor b, #main-editor strong, #main-editor b {
              font-weight: 700 !important;
            }
          ` : ''}
        ` : ''}
        .bg-cyan-600, .bg-cyan-500 { background-color: var(--accent) !important; }
        .hover\\:bg-cyan-600:hover, .hover\\:bg-cyan-500:hover { background-color: var(--accent) !important; filter: brightness(0.9); }
        .text-cyan-400, .text-cyan-500 { color: var(--accent) !important; }
        .border-cyan-500, .border-cyan-400 { border-color: var(--accent) !important; }
        .from-cyan-500 { --tw-gradient-from: var(--accent) !important; }
        .to-blue-600 { --tw-gradient-to: var(--accent) !important; filter: brightness(1.1); }
        .shadow-cyan-500\\/20 { --tw-shadow-color: var(--accent) !important; }
        .shadow-cyan-900\\/20 { --tw-shadow-color: var(--accent) !important; opacity: 0.2; }
        .bg-cyan-500\\/10 { background-color: rgba(var(--accent-rgb), 0.1) !important; }
        .border-cyan-500\\/50 { border-color: rgba(var(--accent-rgb), 0.5) !important; }
        .hover\\:bg-cyan-500\\/10:hover { background-color: rgba(var(--accent-rgb), 0.1) !important; }
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing {
          animation: swing 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `}} />
      {/* Header / Toolbar */}
      <header 
        className="border-b border-slate-800 bg-slate-900 flex items-center px-2 sm:px-4 z-[200] relative shrink-0"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <div className="flex items-center gap-1.5 xs:gap-3 shrink-0">
          <div className="flex items-center gap-1 xs:gap-2">
            <button 
              onClick={() => setIsSMenuOpen(true)}
              className="w-8 h-8 xs:w-10 xs:h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg xs:rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all text-lg xs:text-xl"
            >
              <span className={cn("logo-s", visualStyle === 'neon' && "neon-icon-glow")}>S</span>
            </button>
            <div className="flex flex-col">
              <span className={cn("font-black text-xs xs:text-lg hidden sm:inline-block tracking-tighter leading-none shrink-0 italic", visualStyle === 'neon' && "neon-icon-glow")}>Steem<span className="text-cyan-400">Editor</span></span>
              <span className="text-[7px] xs:text-[9px] font-bold text-slate-500 tracking-widest uppercase hidden sm:block">Professional Pro</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5 xs:mx-1 hidden md:block" />

          {/* View Toggler */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0">
            <button 
              onClick={() => setActiveView('editor')}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1.5",
                activeView === 'editor' ? "bg-cyan-600 text-white shadow-none neon-tab-glow" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Edit3 size={16} className={cn(visualStyle === 'neon' && "neon-icon-glow")} /> <span className="hidden xs:inline">{t('editor')}</span>
            </button>
            <button 
              onClick={() => {
                setActiveView('reader');
                markAllAsRead();
              }}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1.5 relative",
                activeView === 'reader' ? "bg-cyan-600 text-white shadow-none neon-tab-glow" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Globe size={16} className={cn(visualStyle === 'neon' && "neon-icon-glow")} /> <span className="hidden xs:inline">{t('reader')}</span>
            </button>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block shrink-0" />

        {/* Center: Formatting Tools */}
        {activeView === 'editor' && (
          <div className="flex-1 min-w-0 px-1 flex items-center justify-start lg:justify-center relative group/tools">
            {/* Format menu trigger */}
            <div className="relative mobile-tools-container shrink-0 lg:hidden">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !showMobileToolsOpen;
                  setShowMobileToolsOpen(nextState);
                  if (nextState) {
                    setShowMobileTools1(false);
                    setShowMobileTools2(false);
                    setShowNotificationList(false);
                    setShowLangMenu(false);
                  }
                }}
                className="flex shrink-0 items-center justify-center bg-slate-800/30 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all gap-1.5 h-9"
                title={t('formatting') || "Formatting Tools"}
              >
                <Type size={16} className="shrink-0" />
                <ChevronDown size={14} className={cn("transition-transform duration-200 shrink-0", showMobileToolsOpen && "rotate-180")} />
              </button>

              {/* Tools Dropdown */}
              <div className={cn(
                "fixed top-14 left-2 right-2 sm:absolute sm:top-full sm:left-0 sm:right-auto mt-2 bg-slate-800 border border-slate-700 p-2.5 rounded-xl shadow-2xl z-[150] flex-col gap-2.5 max-w-[95vw] sm:w-max max-h-[75vh] overflow-y-auto custom-scrollbar mx-auto sm:mx-0",
                showMobileToolsOpen ? "flex" : "hidden"
              )}>
                {/* Group 1 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={Bold} onClick={() => { fmt('**'); setShowMobileToolsOpen(false); }} title={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
                  <IconButton icon={Italic} onClick={() => { fmt('*'); setShowMobileToolsOpen(false); }} title={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
                  <IconButton icon={Strikethrough} onClick={() => { fmt('~~'); setShowMobileToolsOpen(false); }} title={t('strike')} className="shrink-0 size-8" active={activeFormats.strikethrough} />
                </div>
                {/* Group 2 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { fmtLine('# '); setShowMobileToolsOpen(false); }} title={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { fmtLine('## '); setShowMobileToolsOpen(false); }} title={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { fmtLine('### '); setShowMobileToolsOpen(false); }} title={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
                </div>
                {/* Group 3 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={AlignLeft} onClick={() => { fmt('<div class="text-left">\n', '\n</div>'); setShowMobileToolsOpen(false); }} title={t('leftText')} className="shrink-0 size-8" />
                  <IconButton icon={AlignCenter} onClick={() => { fmt('<center>\n', '\n</center>'); setShowMobileToolsOpen(false); }} title="Center" className="shrink-0 size-8" />
                  <IconButton icon={AlignRight} onClick={() => { fmt('<div class="text-right">\n', '\n</div>'); setShowMobileToolsOpen(false); }} title={t('rightText')} className="shrink-0 size-8" />
                  <IconButton icon={AlignJustify} onClick={() => { fmt('<div class="text-justify">\n', '\n</div>'); setShowMobileToolsOpen(false); }} title="Justify" className="shrink-0 size-8" />
                </div>
                {/* Group 4 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={Quote} onClick={() => { fmtLine('> '); setShowMobileToolsOpen(false); }} title={t('quote')} className="shrink-0 size-8" />
                  <IconButton icon={LinkIcon} onClick={() => { handleLink(); setShowMobileToolsOpen(false); }} title={t('link')} className="shrink-0 size-8" />
                  <IconButton icon={Minus} onClick={() => { insertAtCursor('\n\n---\n\n', 'end'); setShowMobileToolsOpen(false); }} title={t('hr')} className="shrink-0 size-8" />
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { fmt('<div class="phishy">', '</div>'); setShowMobileToolsOpen(false); }} title={t('redText')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0 transition-colors", activeFormats.phishy ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50" : "text-red-500")}>A</button>
                </div>
                {/* Group 5 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  Code
                  <IconButton icon={Terminal} onClick={() => { fmt('`'); setShowMobileToolsOpen(false); }} title={t('inlineCode')} className="shrink-0 size-8 ml-auto" active={activeFormats.code} />
                  <IconButton icon={Code} onClick={() => { fmt('```\n', '\n```'); setShowMobileToolsOpen(false); }} title={t('codeBlock')} className="shrink-0 size-8" />
                  <IconButton icon={Indent} onClick={() => {
                    handleIndent();
                    setShowMobileToolsOpen(false);
                  }} title={t('indent')} className="shrink-0 size-8" />
                </div>
                {/* Group 6 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  {t('table')}
                  <IconButton icon={LayoutGrid} onClick={(e) => { TOOLS_MAP['Table']?.action(e); setShowMobileToolsOpen(false); }} title={t('table')} className="shrink-0 size-8 ml-auto" />
                  <IconButton icon={SplitSquareHorizontal} onClick={() => { insertAtCursor('| Head |\n| --- |\n', 'end'); setShowMobileToolsOpen(false); }} title="1 Col" className="shrink-0 size-8" />
                  <IconButton icon={TableIcon} onClick={() => { importTable(); setShowMobileToolsOpen(false); }} title={t('importTable')} className="shrink-0 size-8" />
                </div>
                {/* Group 7 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={AtSign} onClick={() => { setActiveModal('mentions'); setShowMobileToolsOpen(false); }} title={t('mentions')} className="shrink-0 size-8" />
                  <IconButton icon={FileText} onClick={() => { setActiveModal('templates'); setShowMobileToolsOpen(false); }} title={t('templates')} className="shrink-0 size-8" />
                </div>
              </div>
            </div>

            {/* Desktop Formatting Tools (Scrollable) */}
            <div className="hidden lg:flex flex-1 overflow-hidden relative"
              onWheel={(e) => {
                const container = e.currentTarget.querySelector('.tools-scroll-container');
                if (container && e.deltaY !== 0) container.scrollLeft += e.deltaY;
              }}
            >
              <div className="tools-scroll-container mx-auto flex items-center justify-start gap-1 bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap w-full lg:w-auto">
                <IconButton icon={Bold} onClick={() => fmt('**')} title={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
                <IconButton icon={Italic} onClick={() => fmt('*')} title={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
                <IconButton icon={Strikethrough} onClick={() => fmt('~~')} title={t('strike')} className="shrink-0 size-8" active={activeFormats.strikethrough} />
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmtLine('# ')} title={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmtLine('## ')} title={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmtLine('### ')} title={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <IconButton icon={AlignLeft} onClick={() => fmt('<div class="text-left">\n', '\n</div>')} title={t('leftText')} className="shrink-0 size-8" />
                <IconButton icon={AlignCenter} onClick={() => fmt('<center>\n', '\n</center>')} title="Center" className="shrink-0 size-8" />
                <IconButton icon={AlignRight} onClick={() => fmt('<div class="text-right">\n', '\n</div>')} title={t('rightText')} className="shrink-0 size-8" />
                <IconButton icon={AlignJustify} onClick={() => fmt('<div class="text-justify">\n', '\n</div>')} title="Justify" className="shrink-0 size-8" />
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <IconButton icon={Quote} onClick={() => fmtLine('> ')} title={t('quote')} className="shrink-0 size-8" />
                <IconButton icon={LinkIcon} onClick={handleLink} title={t('link')} className="shrink-0 size-8" />
                <IconButton icon={Minus} onClick={() => insertAtCursor('\n\n---\n\n', 'end')} title={t('hr')} className="shrink-0 size-8" />
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('<div class="phishy">', '</div>')} title={t('redText')} className={cn("size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black shrink-0 transition-colors", activeFormats.phishy ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50" : "text-red-500")}>A</button>
                <IconButton icon={Terminal} onClick={() => fmt('`')} title={t('inlineCode')} className="shrink-0 size-8" active={activeFormats.code} />
                <IconButton icon={Code} onClick={() => fmt('```\n', '\n```')} title={t('codeBlock')} className="shrink-0 size-8" />
                <IconButton icon={Indent} onClick={handleIndent} title={t('indent')} className="shrink-0 size-8" />
                <IconButton icon={LayoutGrid} onClick={(e) => TOOLS_MAP['Table']?.action(e)} title={t('table')} className="shrink-0 size-8" />
                <IconButton icon={SplitSquareHorizontal} onClick={() => insertAtCursor('| Head |\n| --- |\n', 'end')} title="1 Col" className="shrink-0 size-8" />
                <IconButton icon={TableIcon} onClick={importTable} title={t('importTable')} className="shrink-0 size-8" />
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <IconButton icon={AtSign} onClick={() => setActiveModal('mentions')} title={t('mentions')} className="shrink-0 size-8" />
                <IconButton icon={FileText} onClick={() => setActiveModal('templates')} title={t('templates')} className="shrink-0 size-8" />
              </div>
            </div>
          </div>
        )}

        <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block shrink-0" />

        {/* Right side: Notifications, Pub, etc */}
        <div className="flex items-center gap-1 xs:gap-1.5 shrink-0 ml-auto">
          <div className="relative notification-container shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const nextState = !showNotificationList;
                setShowNotificationList(nextState);
                if (nextState) {
                  setShowMobileToolsOpen(false);
                  setShowMobileTools1(false);
                  setShowMobileTools2(false);
                  setShowLangMenu(false);
                }
              }}
              className={cn(
                "size-8 xs:size-9 flex items-center justify-center rounded-xl transition-all relative",
                notifEnabled ? "bg-[rgb(var(--accent-color)/0.1)] text-[rgb(var(--accent-color))]" : "text-slate-500 hover:text-white"
              )}
            >
              <Bell size={18} className={cn(visibleNotifications.some(n => !n.isRead) ? "animate-swing" : "")} />
              {visibleNotifications.some(n => !n.isRead) && (
                <span className={cn(
                  "absolute top-0 right-0 w-3.5 h-3.5 rounded-full border border-slate-950 flex items-center justify-center animate-pulse z-10 text-[7px] text-black font-black bg-[rgb(var(--accent-color))]"
                )}>
                  {visibleNotifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotificationList && (
                <motion.div 
                  {...getMotionConfig()}
                  className="fixed top-14 left-2 right-2 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:origin-top-right sm:mt-2 sm:w-80 max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Сповіщення</h3>
                      <span className="text-[9px] text-slate-500 font-bold">{visibleNotifications.filter(n => !n.isRead).length} нових</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => setNotifEnabled(!notifEnabled)} className={cn("w-7 h-4 rounded-full relative transition-colors", notifEnabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700")}>
                          <div className={cn("absolute top-0.5 size-3 bg-white rounded-full transition-all", notifEnabled ? "left-3.5" : "left-0.5")} />
                       </button>
                       <button onClick={() => markAllAsRead()} className="p-1 text-slate-500 hover:text-white" title="Очистити"><Trash2 size={16} /></button>
                       <button onClick={() => setShowNotificationList(false)} className="p-1 text-slate-500 hover:text-white"><X size={18} /></button>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {visibleNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-[10px] uppercase font-black">Порожньо</div>
                    ) : (
                      <div className="divide-y divide-slate-800/30">
                        {visibleNotifications.map(n => (
                          <div key={n.id} className={cn("p-3 hover:bg-slate-800/30 transition-colors", !n.isRead && "bg-lime-400/5")}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-black text-white">@{n.author}</span>
                              {!n.isRead && <div className="w-1.5 h-1.5 bg-lime-400 rounded-full ml-auto" />}
                            </div>
                            <p className="text-[10px] text-slate-400 italic line-clamp-1 mb-1">{n.body}</p>
                            <button 
                              onClick={() => { 
                                setActiveView('reader'); 
                                setShowNotificationList(false);
                                setTargetReaderPost({ 
                                  author: n.parent_author || n.author, 
                                  permlink: n.parent_permlink || n.permlink,
                                  commentAuthor: n.author,
                                  commentPermlink: n.permlink
                                });
                              }}
                              className="text-[9px] font-black text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              ПЕРЕГЛЯНУТИ <ArrowRight size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          <div className="hidden md:flex items-center bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 shrink-0">
             <button 
                onClick={() => {
                  const next = !isDarkMode;
                  setIsDarkMode(next);
                  localStorage.setItem('steem_dark_mode', next.toString());
                }}
                className="p-1.5 text-slate-500 hover:text-white transition-all shrink-0"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <div className="relative shrink-0 lang-menu-container">
                 <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextState = !showLangMenu;
                      setShowLangMenu(nextState);
                      if (nextState) {
                        setShowMobileToolsOpen(false);
                        setShowMobileTools1(false);
                        setShowMobileTools2(false);
                        setShowNotificationList(false);
                      }
                    }}
                    className="flex items-center gap-1 bg-slate-900/50 px-1.5 py-1 rounded-lg text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all"
                 >
                    {lang}
                    <ChevronDown size={8} className={cn("transition-transform", showLangMenu && "rotate-180")} />
                 </button>
                 
                 <AnimatePresence>
                   {showLangMenu && (
                     <motion.div
                       initial={{ opacity: 0, y: 5, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 5, scale: 0.95 }}
                       className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[120px]"
                     >
                       {AVAILABLE_LANGUAGES.map(item => (
                         <button
                           key={item.code}
                           onClick={() => {
                             setLang(item.code);
                             localStorage.setItem('steem_lang', item.code);
                             setShowLangMenu(false);
                           }}
                           className={cn(
                             "flex items-center justify-between w-full text-left px-3 py-2 text-[10px] font-black uppercase transition-colors border-b last:border-0 border-slate-700/50 gap-2",
                             lang === item.code ? "bg-cyan-600/20 text-cyan-400" : "text-slate-400 hover:text-white hover:bg-slate-700"
                           )}
                         >
                           <span>{item.label}</span>
                           <span className="text-[9px] font-normal normal-case opacity-70">{item.nativeName}</span>
                         </button>
                       ))}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
          </div>

          <div className="relative shrink-0 z-50 mobile-tools-container">
             <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !showMobileTools1;
                  setShowMobileTools1(nextState);
                  if (nextState) {
                    setShowMobileTools2(false);
                    setShowMobileToolsOpen(false);
                    setShowNotificationList(false);
                    setShowLangMenu(false);
                  }
                }}
                className="lg:hidden flex items-center justify-center bg-slate-800/30 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all size-8 xs:size-9"
                title="Tools"
             >
                <Layers size={18} />
             </button>
             <div className={cn(
                "absolute lg:static top-full right-0 mt-2 lg:mt-0 bg-slate-800 lg:bg-slate-800/30 border border-slate-700 lg:border-slate-700/30 p-2 lg:p-1 rounded-xl shadow-2xl lg:shadow-none min-w-max flex-col lg:flex-row items-center gap-1 lg:gap-1.5 z-50",
                showMobileTools1 ? "flex" : "hidden lg:flex"
             )}>
                <IconButton icon={Layers} onClick={() => { setActiveModal('splitPost'); setShowMobileTools1(false); }} title={t('splitPost')} className="shrink-0 size-10" />
                <IconButton icon={ListIcon} onClick={() => { setActiveModal('queue'); setShowMobileTools1(false); }} title={t('queue')} className="shrink-0 size-10" />
                <IconButton icon={FolderOpen} onClick={() => { setActiveModal('drafts'); setShowMobileTools1(false); }} title={t('drafts')} className="shrink-0 size-10" />
                <div className="w-full lg:w-px h-px lg:h-5 bg-slate-700 my-1 lg:my-0 lg:mx-0.5 shrink-0" />
                <label className="w-10 h-10 bg-cyan-950/20 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center shadow-lg shadow-cyan-950/50" title={t('importMd') || 'Import MD'}>
                   <FileDown size={20} />
                   <input type="file" accept=".md,.txt" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if(f) {
                         const reader = new FileReader();
                         reader.onload = (ev) => {
                            const val = ev.target?.result as string;
                            const currentContent = useEditorStore.getState().content;
                            const newContent = currentContent ? currentContent + '\n\n' + val : val;
                            
                            useEditorStore.setState({ content: newContent });
                            
                            if (editorMode === 'markdown' && editorRef.current) {
                               editorRef.current.value = newContent;
                               editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
                            } else if (editorMode === 'visual') {
                               setContent(newContent);
                               if (wysiwygRef.current) {
                                  isSyncingRef.current = true;
                                  const getMarkedFn = getMarked;
                                  const m = getMarkedFn();
                                  if (m) {
                                     m.parse(newContent).then(parsed => {
                                        if (wysiwygRef.current) {
                                          wysiwygRef.current.innerHTML = parsed;
                                        }
                                        isSyncingRef.current = false;
                                     });
                                  } else {
                                     isSyncingRef.current = false;
                                  }
                               }
                            } else {
                               setContent(newContent);
                            }
                            
                            setShowMobileTools1(false);
                            e.target.value = '';
                         };
                         reader.readAsText(f);
                      }
                   }} />
                </label>
                <IconButton icon={FileUp} onClick={() => { downloadFile(); setShowMobileTools1(false); }} title={t('exportMd') || 'Export MD'} className="shrink-0 size-10 text-slate-400 hover:text-cyan-400" />
             </div>
          </div>

          <div className="relative shrink-0 z-40 mobile-tools-container">
             <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !showMobileTools2;
                  setShowMobileTools2(nextState);
                  if (nextState) {
                    setShowMobileTools1(false);
                    setShowMobileToolsOpen(false);
                    setShowNotificationList(false);
                    setShowLangMenu(false);
                  }
                }}
                className="lg:hidden flex items-center justify-center bg-slate-800/30 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all size-8 xs:size-9"
                title="Files"
             >
                <FilePlus size={18} />
             </button>
             <div className={cn(
                "absolute lg:static top-full right-0 mt-2 lg:mt-0 bg-slate-800 lg:bg-slate-800/30 border border-slate-700 lg:border-slate-700/30 p-2 lg:p-1 rounded-xl shadow-2xl lg:shadow-none min-w-max flex-col lg:flex-row items-stretch lg:items-center gap-1.5 z-40",
                showMobileTools2 ? "flex" : "hidden lg:flex"
             )}>
                <IconButton 
                  icon={FilePlus} 
                  onClick={async () => {
                    setShowMobileTools2(false);
                    if (useEditorStore.getState().content.trim() !== '') {
                      const saveFirst = await confirmDialog(t('saveDraftBeforeNew') || "Save draft before starting new?");
                      if (saveFirst) saveDraft();
                      else if (!await confirmDialog(t('confirmNewPost'))) return;
                    }
                    setPubTitle(''); setContent(''); setPubTags(''); setCurrentDraftId(null);
                    localStorage.removeItem('steem_autosave_temp_visual_html');
                    if (wysiwygRef.current) {
                      wysiwygRef.current.innerHTML = '<p><br></p>';
                      updateWysiwygEmptyStatus(wysiwygRef.current);
                    }
                  }} 
                  title={t('newPost')} 
                  className="shrink-0 size-10 flex mx-auto" 
                />
                <div className="w-full lg:w-px h-px lg:h-5 bg-slate-700 my-0.5 lg:my-0 lg:mx-0.5 shrink-0" />
                <div className="flex flex-col lg:flex-row lg:items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shrink-0">
                   <button onClick={() => { saveDraft('working'); setShowMobileTools2(false); }} className="px-3 lg:px-2 py-2 lg:py-1.5 hover:bg-slate-800 text-slate-300 border-b lg:border-b-0 lg:border-r border-slate-700 flex items-center justify-center lg:justify-start gap-1.5 text-[10px] lg:text-[9px] font-black uppercase transition-colors" title={t('saveDraft')}>
                     <Save size={20} /> 
                     <span className="lg:hidden xl:inline">{t('saveDraft')}</span>
                   </button>
                   <button onClick={() => { saveDraft('ready'); setShowMobileTools2(false); }} className={cn(
                     "px-3 lg:px-2 py-2 lg:py-1.5 flex items-center justify-center transition-colors hover:bg-[rgb(var(--accent-color)/0.1)] text-[rgb(var(--accent-color))] hover:text-[rgb(var(--accent-color))]"
                   )} title={t('ready')}>
                     <CheckCircle size={20} />
                   </button>
                </div>
             </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5 xs:mx-1 shrink-0" />

          <div className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 shrink-0">
            {!isPwaInstalled && !isTauriEnv() && !isNeutralinoEnv() && (
              <IconButton 
                icon={Download} 
                onClick={handleInstallPwa} 
                title={t('installApp') || "Встановити PWA"} 
                className="shrink-0 size-8 hidden lg:flex text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/80 active:scale-95 transition-transform" 
              />
            )}
            <IconButton icon={ShieldUserIcon} onClick={() => setActiveModal('keys')} title={t('keys')} className="shrink-0 size-8 flex" />
            <IconButton icon={Settings} onClick={() => { setSettingsTab('general'); setActiveModal('settings'); }} title={t('settings')} className="shrink-0 size-8 hidden lg:flex" />

            {activeView === 'editor' && (
              <IconButton icon={Rocket} onClick={() => setActiveModal('publish')} title={t('publish')} className={cn("shrink-0 size-8 bg-cyan-600 text-white hover:bg-cyan-500 border border-cyan-500/30 transition-all", performanceMode ? "shadow-none" : "shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95")} />
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className={cn("flex-1 overflow-hidden bg-slate-900 flex flex-col", activeView !== 'reader' && "hidden")}>
            <Reader 
              lang={lang}
              t={t}
              onEditPost={handleEditPost}
              onVote={handleReaderVote}
              onComment={handleReaderComment}
              onDeleteComment={handleDeleteComment}
              onUploadImage={handleUploadImageForReader}
              onUserUpdate={(u) => setUsername(u)}
              currentUser={authType === 'VAULT' ? selectedVaultUser : username}
              onMuteUser={handleMuteUser}
              mutedUsers={mutedUsers || []}
              targetReaderPost={targetReaderPost}
              rawInboxData={rawNotifications}
            />
        </div>
        <div className={cn("flex-1 overflow-hidden flex", activeView !== 'editor' && "hidden")}>
            {/* Sidebar */}
            <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside 
              {...getSidebarMotionConfig()}
              className={cn(
                "border-r border-slate-800 bg-slate-900 flex flex-col z-30 absolute lg:relative h-full pb-16 lg:pb-0 shadow-2xl lg:shadow-none transition-all duration-300 overflow-visible",
                isGalleryCollapsed ? "w-16" : "w-[clamp(20rem,25vw,30rem)]"
              )}
            >
              <div className="flex flex-col flex-1 overflow-hidden custom-scrollbar">
                <section className={cn("flex flex-col flex-1 min-h-0 overflow-hidden py-2", isGalleryCollapsed ? "px-1" : "px-4")}>
                  <div className={cn("flex items-center mb-3 shrink-0", isGalleryCollapsed ? "justify-center" : "justify-between")}>
                    {!isGalleryCollapsed && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('gallery')}</span>}
                    <button 
                      onClick={() => setIsGalleryCollapsed(!isGalleryCollapsed)}
                      className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title={isGalleryCollapsed ? t('expandGallery') : t('collapseGallery')}
                    >
                      {isGalleryCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                  </div>

                  {!isGalleryCollapsed && (
                    <>
                      <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2 shrink-0 overflow-x-auto no-scrollbar">
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggleGalleryMode('local')}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0",
                        galleryMode === 'local' ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      {t('gallery')}
                    </button>
                    <div className="w-px h-3 bg-slate-800 shrink-0" />
                    {[
                      { id: 'pexels', label: 'Pexels', key: pexelsApiKey },
                      { id: 'pixabay', label: 'Pixabay', key: pixabayApiKey },
                      { id: 'unsplash', label: 'Unsplash', key: unsplashAccessKey }
                    ].map(srv => (
                      <button 
                        key={srv.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => toggleGalleryMode(srv.id as any)}
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 shrink-0",
                          galleryMode === srv.id ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {srv.label}
                        {!srv.key && <Lock size={8} className="text-slate-600" />}
                      </button>
                    ))}
                    <div className="flex-1" />
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setGalleryView('grid')} 
                        className={cn("p-1 rounded", galleryView === 'grid' ? "text-cyan-400 bg-cyan-400/10" : "text-slate-600")}
                      >
                        <LayoutGrid size={14} />
                      </button>
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setGalleryView('list')} 
                        className={cn("p-1 rounded", galleryView === 'list' ? "text-cyan-400 bg-cyan-400/10" : "text-slate-600")}
                      >
                        <ListIcon size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 shrink-0">
                    {isGallerySettingsCollapsed && (
                      <div 
                        onClick={() => setIsGallerySettingsCollapsed(false)}
                        className="flex items-center justify-between mb-0.5 cursor-pointer group"
                      >
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none group-hover:text-cyan-400 transition-colors">{t('editorTools') || "Tools"}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsGallerySettingsCollapsed(false);
                          }}
                          className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-slate-500 transition-all"
                          title={t('settings')}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    )}
                  
                    <AnimatePresence>
                      {!isGallerySettingsCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="md:max-h-none overflow-y-auto custom-scrollbar pr-1 pb-1">
                            {galleryMode === 'local' ? (
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <button 
                                    onClick={() => {
                                      fileInputRef.current?.click();
                                      // if (window.innerWidth < 1024) setIsWidgetVisible(false); // Kept visible as requested
                                    }}
                                    disabled={isUploading}
                                    className="px-3 py-1.5 flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 border border-cyan-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0"
                                    title={t('insert')}
                                  >
                                    {isUploading ? (
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : <ImageIcon size={16} />}
                                    <span className="truncate">{t('insert')}</span>
                                  </button>

                                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                    <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                      <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'html' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>HTML</button>
                                      <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>MD</button>
                                    </div>
                                    <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                      <button onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))} className={cn("px-2 py-0.5 text-[8px] font-bold rounded uppercase transition-all", pexelsSettings.linkEmbedded ? "bg-slate-700 text-blue-400" : "text-slate-600 hover:text-slate-400")} title={t('linkInImg')}>LINK</button>
                                    </div>
                                    <button 
                                      onClick={() => setIsGallerySettingsCollapsed(true)}
                                      className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-cyan-400 transition-all ml-1 shrink-0"
                                      title={t('settings')}
                                    >
                                      <ChevronUp size={16} />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {(vaultAccounts.length > 0 || !(typeof window !== 'undefined' && (window as any).steem_keychain)) && (
                                    <div className="col-span-2 sm:col-span-3 flex items-center gap-2 p-1.5 bg-slate-800/80 rounded-xl border border-slate-700/80 shadow-sm">
                                      {vaultAccounts.length > 0 ? (
                                        <select 
                                          value={imageUploadAccount || ((typeof window !== 'undefined' && (window as any).steem_keychain) ? '' : (selectedVaultUser || vaultAccounts[0]))}
                                          onChange={(e) => setImageUploadAccount(e.target.value)}
                                          className="flex-1 bg-slate-900 text-[10px] text-cyan-400 font-bold outline-none cursor-pointer truncate px-2.5 py-1.5 rounded-lg border border-slate-700/80 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                          style={{ colorScheme: 'dark' }}
                                        >
                                          {(typeof window !== 'undefined' && (window as any).steem_keychain) && (
                                            <option value="" className="bg-slate-900 text-slate-300 py-1">
                                              🛡️ {username ? `@${username} (Keychain)` : '@keychain (default)'}
                                            </option>
                                          )}
                                          {vaultAccounts.map(acc => (
                                            <option key={acc} value={acc} className="bg-slate-900 text-slate-200 py-1">
                                              🔑 @{acc} (Vault) {!SecurityService.isLocked() ? '✓' : '🔒'}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <button 
                                          onClick={() => setActiveModal('keys')}
                                          className="flex-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg py-1.5 px-2.5 flex items-center justify-center gap-1.5 transition-all"
                                        >
                                          <Lock size={12} />
                                          <span>{t('addVaultKeyForUpload')}</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                  <p className="text-[8px] text-slate-500 truncate">
                                    {galleryMode === 'pexels' ? t('pexelsSearch') : 
                                    `Search ${galleryMode === 'unsplash' ? 'Unsplash' : 'Pixabay'}`}
                                  </p>
                                </div>
                                {pexelsResults.length > 0 && (
                                  <button 
                                    onClick={() => {
                                      setPexelsResults([]);
                                      notify(t('cacheCleared'));
                                    }}
                                    className="px-2 py-1.5 bg-slate-800/50 hover:bg-red-900/30 text-red-400 border border-red-900/20 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center shrink-0"
                                    title={t('clearCache')}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                <div className="flex items-center gap-1.5 shrink-0 ml-auto mr-0.5">
                                  <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                    <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'html' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>HTML</button>
                                    <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>MD</button>
                                  </div>
                                  <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                    <button onClick={() => setPexelsSettings((prev: any) => ({ ...prev, withAttribution: !prev.withAttribution }))} className={cn("px-1.5 py-0.5 text-[8px] font-bold rounded uppercase transition-all", pexelsSettings.withAttribution ? "bg-slate-700 text-green-400" : "text-slate-600 hover:text-slate-400")} title={t('attribution')}>ATTR</button>
                                    <button onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))} className={cn("px-1.5 py-0.5 text-[8px] font-bold rounded uppercase transition-all", pexelsSettings.linkEmbedded ? "bg-slate-700 text-blue-400" : "text-slate-600 hover:text-slate-400")} title={t('linkInImg')}>LINK</button>
                                  </div>
                                  <button 
                                    onClick={() => setIsGallerySettingsCollapsed(true)}
                                    className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-cyan-400 transition-all ml-1 shrink-0"
                                    title={t('settings')}
                                  >
                                    <ChevronUp size={16} />
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1.5 shrink-0">
                                  <button
                                    title={t('performanceDesc') || 'Вимикає деякі анімації'}
                                    onClick={() => {
                                      const next = !performanceMode;
                                      setPerformanceMode(next);
                                      localStorage.setItem('steem_performance_mode', next.toString());
                                    }}
                                    className={cn("flex justify-between items-center px-1.5 py-1 rounded border", performanceMode ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500")}
                                  >
                                    <span className="text-[9px] font-bold uppercase truncate">{t('performanceMode') || 'Perf'}</span>
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", performanceMode ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700")} />
                                  </button>

                                  <button
                                    onClick={() => {
                                      const newState = !isTrafficOptimized;
                                      setIsTrafficOptimized(newState);
                                      localStorage.setItem('steem_traffic_optimized', newState.toString());
                                    }}
                                    className={cn("flex justify-between items-center px-1.5 py-1 rounded border", isTrafficOptimized ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500")}
                                  >
                                    <span className="text-[9px] font-bold uppercase truncate">{t('trafficOptimization')?.substring(0, 6) || "Optim"}</span>
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isTrafficOptimized ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700")} />
                                  </button>

                                  <button
                                    onClick={() => {
                                      const newState = !isExifEnabled;
                                      setIsExifEnabled(newState);
                                      localStorage.setItem('steem_exif_enabled', newState.toString());
                                    }}
                                    className={cn("flex justify-between items-center px-1.5 py-1 rounded border", isExifEnabled ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500")}
                                  >
                                    <span className="text-[9px] font-bold uppercase truncate">{t('exifEnabled') || "EXIF"}</span>
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isExifEnabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700")} />
                                  </button>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-1.5 mb-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800/50 shrink-0 select-none">
                              <div className="flex items-center gap-1.5 w-full">
                                <button
                                  onClick={() => setIsTextWrapEnabled(!isTextWrapEnabled)}
                                  className={cn("flex items-center justify-center px-2 py-1.5 rounded-lg border transition-colors flex-1 min-w-0", isTextWrapEnabled ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300")}
                                  title={t('textWrap')}
                                >
                                  <TextWrapIcon size={15} className="shrink-0" />
                                </button>

                                <button
                                  onClick={() => setGridWithCaptions(!gridWithCaptions)}
                                  className={cn("flex items-center justify-center px-2 py-1.5 rounded-lg border transition-colors flex-1 min-w-0", gridWithCaptions ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300")}
                                  title={t('addCaption') || "Add Caption"}
                                >
                                  <ImageCaptionIcon size={15} className="shrink-0" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-1.5 w-full">
                                <div className="flex bg-slate-950/50 rounded-lg p-0.5 border border-slate-800/50 hover:border-slate-700/50 transition-colors shrink-0">
                                  {(['left', 'center', 'right'] as const).map(p => (
                                    <button
                                      key={p}
                                      onClick={() => setSingleCaptionAlign(p)}
                                      className={cn(
                                        "p-1.5 rounded transition-all", 
                                        singleCaptionAlign === p ? "bg-cyan-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300 active:scale-95"
                                      )}
                                    >
                                      {p === 'left' ? <AlignLeft size={15} /> : p === 'center' ? <AlignCenter size={15} /> : <AlignRight size={15} />}
                                    </button>
                                  ))}
                                </div>
                                <button 
                                  onClick={() => {
                                    insertGrid();
                                    // if (window.innerWidth < 1024) setIsWidgetVisible(false); // Kept visible as requested
                                  }}
                                  disabled={galleryMode === 'local' ? images.filter(i => i.selected).length === 0 : pexelsResults.filter(p => p.selected).length === 0}
                                  className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-cyan-900 disabled:opacity-50 border border-slate-700 hover:border-cyan-700 text-cyan-400 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 min-w-0"
                                  title={t('createGrid')}
                                >
                                  <LayoutGrid size={12} className="shrink-0" /> ({galleryMode === 'local' ? images.filter(i => i.selected).length : pexelsResults.filter(p => p.selected).length})
                                </button>
                              </div>

                              <div className="flex justify-between sm:justify-center bg-slate-950/50 rounded-lg p-0.5 border border-slate-800/50 hover:border-slate-700/50 transition-colors w-full overflow-x-auto no-scrollbar gap-0.5">
                                  {(['col', 'col-table', 'grid-2', 'row', 'col-img-text', 'col-text-img'] as const).map(l => (
                                    <button
                                      key={l}
                                      onClick={() => setGridLayout(l)}
                                      className={cn(
                                        "p-1.5 shrink-0 rounded transition-all flex-1 sm:flex-none flex justify-center", 
                                        gridLayout === l ? "bg-cyan-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300 active:scale-95"
                                      )}
                                      title={l === 'col' ? 'В стовпчик (не таблиця)' : l === 'col-table' ? 'Стовпчик в таблиці (зверху вниз)' : l === 'grid-2' ? 'Плитка (2x2)' : l === 'row' ? 'В один рядок (таблиця)' : l === 'col-img-text' ? 'Текст праворуч' : 'Текст ліворуч'}
                                    >
                                      {l === 'col' ? <ListIcon size={15} /> : l === 'col-table' ? <Rows size={15} /> : l === 'grid-2' ? <LayoutGrid size={15} /> : l === 'row' ? <Columns size={15} /> : l === 'col-img-text' ? <PanelLeft size={15} /> : <PanelRight size={15} />}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative mb-2 shrink-0">
                    <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      placeholder={
                        galleryMode === 'local' ? t('gallery') + "..." : 
                        galleryMode === 'pexels' ? t('pexelsSearch') + " (Enter)..." : 
                        `Search ${galleryMode === 'unsplash' ? 'Unsplash' : 'Pixabay'} (Enter)...`
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1 pl-7 pr-2 text-[10px] outline-none focus:ring-1 focus:ring-cyan-500"
                      value={gallerySearch}
                      onChange={e => setGallerySearch(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && galleryMode !== 'local') {
                          handleExternalSearch(gallerySearch);
                        }
                      }}
                    />
                    {galleryMode !== 'local' && isSearchingPexels && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="w-2.5 h-2.5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  </>
                  )}

                  <div className={cn(
                    "overflow-y-auto custom-scrollbar flex-1 min-h-0 px-1 mt-1",
                    !isGalleryCollapsed && galleryView === 'grid' ? "grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] auto-rows-min gap-3 content-start" : "flex flex-col gap-2"
                  )}>
                    {galleryMode === 'local' ? (
                      filteredLocalImages.map((img: ImageItem, idx: number) => (
                          <ImageItemComp
                            key={img.url + idx}
                            img={img}
                            idx={idx}
                            galleryView={galleryView}
                            isTrafficOptimized={isTrafficOptimized}
                            onToggle={toggleImageSelection}
                            onInsert={(url, name, pos) => {
                              insertImage(url, name, pos);
                              // if (window.innerWidth < 1024) setIsWidgetVisible(false); // Kept visible as requested
                            }}
                            onHost={uploadExternalImage}
                            onDelete={(i) => {
                              const url = filteredLocalImages[i]?.url;
                              if (url) setImages(prev => prev.filter(x => x.url !== url));
                            }}
                            onMoveLeft={idx > 0 ? (i) => moveImageLocal(i, -1) : undefined}
                            onMoveRight={idx < filteredLocalImages.length - 1 ? (i) => moveImageLocal(i, 1) : undefined}
                            t={t}
                            isCollapsed={isGalleryCollapsed}
                          />
                        ))
                    ) : (
                      pexelsResults.length > 0 ? (
                        pexelsResults.map((photo: any, idx: number) => (
                          <ExternalImageItem
                            key={photo.id + '-' + (photo.source || 'ext') + '-' + idx}
                            photo={photo}
                            idx={idx}
                            galleryView={galleryView}
                            onToggle={(i) => setPexelsResults(prev => prev.map((p, j) => i === j ? { ...p, selected: !p.selected } : p))}
                            onInsert={(photo, pos) => {
                              insertExternalImage(photo, pos);
                              // if (window.innerWidth < 1024) setIsWidgetVisible(false); // Kept visible as requested
                            }}
                            t={t}
                            isCollapsed={isGalleryCollapsed}
                          />
                        ))
                      ) : (
                        <div className={cn("flex flex-col items-center justify-center h-40 text-slate-600 gap-2", isGalleryCollapsed && "hidden")}>
                          <Search size={24} />
                          <p className="text-[10px] text-center">
                            {t('pexelsSearch')}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                  
                  {galleryMode !== 'local' && pexelsResults.length > 0 && !isSearchingPexels && !isGalleryCollapsed && (
                    <div className="mt-2 flex justify-center">
                      <button 
                        onClick={() => handleExternalSearch(gallerySearch, pexelsPage + 1)}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded-full transition-colors"
                      >
                        {t('loadMore')}
                      </button>
                    </div>
                  )}

                  {!isGalleryCollapsed && (
                  <div className="mt-2 shrink-0 border-t border-slate-800 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('links')}</span>
                      {(sourceInput || images.length > 0) && (
                        <button 
                          onClick={() => { setSourceInput(''); setImages([]); }}
                          className="text-[9px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={8} /> {t('clear')}
                        </button>
                      )}
                    </div>
                    <textarea 
                      className="w-full h-16 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-[9px] focus:ring-1 focus:ring-cyan-500 outline-none resize-none custom-scrollbar"
                      placeholder={t('pasteUrl')}
                      value={sourceInput}
                      onChange={e => parseImages(e.target.value)}
                    />
                  </div>
                  )}
                </section>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={cn(
          "flex-1 flex flex-col min-w-0 bg-slate-950 relative transition-all",
          (isEditorFullScreen || isFullScreen || isKeyboardOpen) ? "pb-0 lg:pb-0" : "pb-[calc(4rem+env(safe-area-inset-bottom,0px)+var(--browser-bottom-inset,0px))] lg:pb-0"
        )}>
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Pane */}
            <div 
              ref={editorPaneRef}
              style={isEditorFullScreen ? { 
                height: vvHeight ? `${vvHeight}px` : '100dvh',
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingLeft: 'env(safe-area-inset-left, 0px)',
                paddingRight: 'env(safe-area-inset-right, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
              } : {}}
              className={cn(
                "flex-1 flex flex-col min-w-0 border-r border-slate-800 transition-all relative",
                activeMobileTab !== 'editor' && "hidden lg:flex",
                isEditorFullScreen && "bg-slate-950 p-0 fixed inset-0 z-[250]"
              )}
            >
<MobileStatsBar visualStyle={visualStyle} isDarkMode={isDarkMode} t={t} />

              {/* Editor Mode Toggler Tabs */}
              <div className={cn(
                "flex items-center justify-between px-4 py-2 border-b shrink-0 select-none relative transition-colors",
                visualStyle === 'neon' ? "bg-slate-950 border-slate-800/80" : (isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex p-0.5 rounded-lg border shrink-0 shadow-inner transition-colors",
                    visualStyle === 'neon' ? "bg-slate-950 border-slate-800" : (isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-300")
                  )}>
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSetEditorMode('visual')}
                      className={cn(
                        "px-3 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors flex items-center gap-1.5",
                        editorMode === 'visual' 
                          ? "bg-cyan-600 text-white shadow-sm" 
                          : (isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-900")
                      )}
                    >
                      <Eye size={12} />
                      <span className={cn(
                        isLivePreviewEnabled ? "hidden xl:inline" : "hidden sm:inline"
                      )}>
                        {t('visualEditor')}
                      </span>
                    </button>
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSetEditorMode('markdown')}
                      className={cn(
                        "px-3 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors flex items-center gap-1.5",
                        editorMode === 'markdown' 
                          ? "bg-cyan-600 text-white shadow-sm" 
                          : (isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-900")
                      )}
                    >
                      <Terminal size={12} />
                      <span className={cn(
                        isLivePreviewEnabled ? "hidden xl:inline" : "hidden sm:inline"
                      )}>
                        {t('markdownCode')}
                      </span>
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={toggleEditorFullScreen}
                      className={cn(
                        "px-2 py-1 ml-1 rounded transition-colors flex items-center gap-1",
                        isEditorFullScreen 
                          ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400" 
                          : (isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-cyan-400 hover:bg-slate-800" : "text-slate-500 hover:text-cyan-600 hover:bg-slate-200")
                      )}
                      title={isEditorFullScreen ? t('exitFullscreen') : t('fullscreen')}
                    >
                      {isEditorFullScreen ? <Minimize2 size={12} className="text-white" /> : <Maximize2 size={12} />}
                      {isEditorFullScreen && (
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden xs:inline">
                          {t('exit')}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Real-time sync toggle (RefreshCw) */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !onDemandSyncEnabled;
                      setOnDemandSyncEnabled(next);
                      localStorage.setItem('steem_on_demand_sync', String(next));
                      notify(
                        next 
                           ? (lang === 'uk' ? "Увімкнено оптимізовану фонову синхронізацію (без затримок)" : "Optimized background sync enabled (lag-free)") 
                           : (lang === 'uk' ? "Увімкнено безперервну синхронізацію в реальному часі" : "Continuous real-time sync enabled"), 
                        "success"
                      );
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold",
                      !onDemandSyncEnabled 
                        ? (isDarkMode || visualStyle === 'neon' ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100/50") 
                        : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
                    )}
                    title={!onDemandSyncEnabled ? t('realtimeSyncActive') : t('enableRealtimeSync')}
                  >
                    <RefreshCw size={12} className={cn(!onDemandSyncEnabled ? "text-cyan-400" : "text-slate-500")} />
                    <span className={cn(
                      isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
                    )}>
                      {t('realtime')}
                    </span>
                    {!onDemandSyncEnabled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-color))] shrink-0" />
                    )}
                  </button>

                  {/* Live Preview Toggle */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleLivePreview}
                    className={cn(
                      "hidden lg:flex p-1.5 rounded-lg border transition-all items-center gap-1.5 text-[10px] sm:text-xs font-bold",
                      isLivePreviewEnabled 
                        ? (isDarkMode || visualStyle === 'neon' ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100/50") 
                        : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
                    )}
                    title={t('toggleLivePreview')}
                  >
                    {isLivePreviewEnabled ? <Eye size={12} className={cn(isDarkMode || visualStyle === 'neon' ? "text-cyan-400" : "text-cyan-600")} /> : <EyeOff size={12} className="text-slate-500" />}
                    <span className={cn(
                      isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
                    )}>
                      {lang === 'uk' ? 'Прев\'ю' : 'Preview'}
                    </span>
                  </button>

                  {/* Beautification Toggle */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !beautifyEnabled;
                      setBeautifyEnabled(next);
                      localStorage.setItem('steem_beautify', String(next));
                      notify(
                        next
                          ? (lang === 'uk' ? "Б'ютіфікацію увімкнено (покращене оформлення)" : "Beautification enabled (enhanced styling)")
                          : (lang === 'uk' ? "Б'ютіфікацію вимкнено" : "Beautification disabled"),
                        "success"
                      );
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold",
                      beautifyEnabled 
                        ? (isDarkMode || visualStyle === 'neon' ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100/50") 
                        : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
                    )}
                    title={beautifyEnabled ? t('beautifyActiveTitle') : t('enableBeautifyTitle')}
                  >
                    <Sparkles size={12} className={cn(beautifyEnabled ? "text-cyan-400" : "text-slate-500")} />
                    <span className={cn(
                      isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
                    )}>
                      {t('beautify')}
                    </span>
                    {beautifyEnabled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-color))] shrink-0" />
                    )}
                  </button>

                  {/* Neon Editor Text Color Toggle */}
                  {visualStyle === 'neon' && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const next = !neonTextColored;
                        setNeonTextColored(next);
                        notify(
                          next 
                            ? (lang === 'uk' ? "Кольоровий текст увімкнено" : "Colored text enabled") 
                            : (lang === 'uk' ? "Кольоровий текст вимкнено" : "Colored text disabled"), 
                          "success"
                        );
                      }}
                      className={cn(
                        "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold",
                        neonTextColored 
                          ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" 
                          : "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                      )}
                      title={neonTextColored ? t('colorTextActiveTitle') : t('enableColorTextTitle')}
                    >
                      <Type size={12} className={cn(neonTextColored ? "text-cyan-400" : "text-slate-500")} />
                      <span className={cn(
                        isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
                      )}>
                        {t('color')}
                      </span>
                      {neonTextColored && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-color))] shrink-0" />
                      )}
                    </button>
                  )}

                  {/* Visual Spacing and Icon Size Popover */}
                  <div className="relative">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setIsSpacingMenuOpen(!isSpacingMenuOpen)}
                      className={cn(
                        "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold relative",
                        isSpacingMenuOpen
                          ? "bg-cyan-600 text-white border-cyan-500 shadow-none"
                          : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
                      )}
                      title={t('spacingSettingsTitle')}
                    >
                      <MoveVertical size={12} />
                      <span className={cn(
                        isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
                      )}>
                        {t('spacing')}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isSpacingMenuOpen && (
                        <>
                          {/* Overlay click-away handler */}
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
                            onClick={() => setIsSpacingMenuOpen(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                              "absolute right-0 mt-2 w-64 rounded-xl border p-4 shadow-xl z-50 flex flex-col gap-4 select-none",
                              isDarkMode || visualStyle === 'neon' ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                            )}
                          >
                            <div className={cn(
                              "flex items-center justify-between border-b pb-2",
                              isDarkMode || visualStyle === 'neon' ? "border-slate-800" : "border-slate-100"
                            )}>
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                {t('layoutOptions')}
                              </span>
                              <button 
                                onClick={() => setIsSpacingMenuOpen(false)}
                                className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                              >
                                <X size={12} />
                              </button>
                            </div>

                            {/* Beautification Toggle inside Spacing popover */}
                            <div className={cn(
                              "flex items-center justify-between border-b pb-3",
                              isDarkMode || visualStyle === 'neon' ? "border-slate-800/60" : "border-slate-100"
                            )}>
                              <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-cyan-400" />
                                <div>
                                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                                    {lang === 'uk' ? "Б'ютіфікація" : "Beautification"}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-medium block">
                                    {t('enhancedStyling')}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const next = !beautifyEnabled;
                                  setBeautifyEnabled(next);
                                  localStorage.setItem('steem_beautify', String(next));
                                }}
                                className={cn(
                                  "w-9 h-5 rounded-full transition-all duration-300 relative border shrink-0",
                                  beautifyEnabled 
                                    ? "bg-cyan-600 border-cyan-500" 
                                    : (isDarkMode || visualStyle === 'neon' ? "bg-slate-800 border-slate-700" : "bg-slate-200 border-slate-300")
                                )}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-300",
                                  beautifyEnabled ? "left-[18px]" : "left-0.5"
                                )} />
                              </button>
                            </div>

                            {/* Spacing preset & slider */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {t('paragraphSpacing')}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded">
                                  {wysiwygSpacing}px
                                </span>
                              </div>
                              <div className={cn(
                                "grid grid-cols-4 gap-1 p-0.5 rounded-lg border",
                                isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60" : "bg-slate-50 border-slate-200"
                              )}>
                                {[
                                  { id: 6, label: t('spacingCompact') },
                                  { id: 14, label: t('spacingBalanced') },
                                  { id: 20, label: t('spacingNormal') },
                                  { id: 28, label: t('spacingSpacious') }
                                ].map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      setWysiwygSpacing(p.id);
                                      localStorage.setItem('steem_wysiwyg_spacing', String(p.id));
                                    }}
                                    className={cn(
                                      "py-1 px-0.5 rounded text-[9px] font-bold transition-all text-center truncate",
                                      wysiwygSpacing === p.id
                                        ? "bg-cyan-600 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
                                    )}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-[9px] text-slate-500 font-mono">0px</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="40"
                                  value={wysiwygSpacing}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setWysiwygSpacing(val);
                                    localStorage.setItem('steem_wysiwyg_spacing', String(val));
                                  }}
                                  className="flex-1 accent-cyan-500 bg-slate-800/60 h-1 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[9px] text-slate-500 font-mono">40px</span>
                              </div>
                            </div>

                             {/* Editor font size preset & slider */}
                            <div className={cn(
                              "space-y-2 border-t pt-3",
                              isDarkMode || visualStyle === 'neon' ? "border-slate-800/60" : "border-slate-100"
                            )}>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {t('fontSize')}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded">
                                  {editorFontSize}px
                                </span>
                              </div>
                              <div className={cn(
                                "grid grid-cols-4 gap-1 p-0.5 rounded-lg border",
                                isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60" : "bg-slate-50 border-slate-200"
                              )}>
                                {[
                                  { id: 14, label: t('fontSmall') },
                                  { id: 16, label: t('fontNormal') },
                                  { id: 18, label: t('fontLarge') },
                                  { id: 22, label: t('fontMax') }
                                ].map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      setEditorFontSize(p.id);
                                      localStorage.setItem('steem_editor_font_size', String(p.id));
                                    }}
                                    className={cn(
                                      "py-1 px-0.5 rounded text-[9px] font-bold transition-all text-center truncate",
                                      editorFontSize === p.id
                                        ? "bg-cyan-600 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
                                    )}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-[9px] text-slate-500 font-mono">12px</span>
                                <input
                                  type="range"
                                  min="12"
                                  max="32"
                                  value={editorFontSize}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setEditorFontSize(val);
                                    localStorage.setItem('steem_editor_font_size', String(val));
                                  }}
                                  className="flex-1 accent-cyan-500 bg-slate-800/60 h-1 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[9px] text-slate-500 font-mono">32px</span>
                              </div>
                            </div>

                            {/* Toolbar icon size preset & slider */}
                            <div className={cn(
                              "space-y-2 border-t pt-3",
                              isDarkMode || visualStyle === 'neon' ? "border-slate-800/60" : "border-slate-100"
                            )}>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {t('iconSize')}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded">
                                  {toolbarIconSize}px
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-500 font-mono">12px</span>
                                <input
                                  type="range"
                                  min="12"
                                  max="32"
                                  value={toolbarIconSize}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setToolbarIconSize(val);
                                    localStorage.setItem('steem_toolbar_icon_size', String(val));
                                  }}
                                  className="flex-1 accent-cyan-500 bg-slate-800/60 h-1 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[9px] text-slate-500 font-mono">32px</span>
                              </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>


              </div>

              {editorMode === 'markdown' ? (
                <CodeEditor
                  id="main-editor"
                  ref={editorRef}
                  onDemandSyncEnabled={onDemandSyncEnabled}
                  onChange={() => {
                    saveCursorPosition();
                    
                  }}
                  onSelect={saveCursorPosition}
                  onKeyUp={saveCursorPosition}
                  onClick={saveCursorPosition}
                  onScroll={handleEditorScroll}
                  onFocus={() => {
                    setIsEditorFocused(true);
                    saveCursorPosition();
                  }}
                  onBlur={() => {
                    saveCursorPosition();
                    setTimeout(() => setIsEditorFocused(false), 200);
                  }}
                  onKeyDown={handleEditorKeyDown}
                  onMouseUp={(e) => {
                    saveCursorPosition();
                    showWidget(e.clientX, e.clientY);
                  }}
                  className={cn(
                    "flex-1 w-full bg-transparent text-base outline-none resize-none custom-scrollbar transition-all duration-700 editor-font overscroll-contain",
                    (visualStyle === 'neon' && neonTextColored) ? "text-cyan-400 font-normal" : "text-slate-300",
                    beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-[clamp(40rem,60vw,80rem)] mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-3 pt-3 lg:px-6 lg:pt-6",
                    isKeyboardOpen 
                      ? "pb-44 mb-2 lg:pb-48 lg:mb-4" 
                      : (isEditorFullScreen || isFullScreen
                          ? "pb-44 mb-2 lg:pb-48 lg:mb-4"
                          : (widgetPos === 'bottom' ? "pb-44 mb-[5rem] lg:pb-48 lg:mb-20" : "pb-44 mb-[5rem] lg:pb-36 lg:mb-4"))
                  )}
                  placeholder={`${t('placeholder')}\n\n\n\n\nОМ АХ ХУМ СО ХА\n♡`}
                />
              ) : (
                <div
                  ref={wysiwygRef}
                  contentEditable
                  suppressContentEditableWarning
                  onBeforeInput={handleWysiwygBeforeInput}
                  onKeyDown={handleWysiwygKeyDown}
                  onPaste={async (e) => {
                    e.preventDefault();
                    
                    const htmlData = e.clipboardData.getData('text/html');
                    const textData = e.clipboardData.getData('text/plain');
                    
                    if (!textData && !htmlData) return;

                    // Convert current spacer to standard paragraph before pasting if selection is inside
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) {
                      const anchorNode = sel.anchorNode;
                      if (anchorNode) {
                        const parentEl = anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as Element) : anchorNode.parentElement;
                        const spacerEl = parentEl?.closest('.table-spacer, [data-placeholder], [data-empty]');
                        if (spacerEl) {
                          spacerEl.removeAttribute('data-empty');
                          spacerEl.removeAttribute('data-placeholder');
                          spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
                        }
                      }
                    }
                    
                    if (textData) {
                      const trimmedText = textData.trim();
                      if (isImageAndProxyUrl(trimmedText)) {
                        const imgHtml = `<img src="${trimmedText}" alt="image">`;
                        if (!document.execCommand('insertHTML', false, imgHtml)) {
                          insertHtmlAtCursor(imgHtml);
                        }
                        updateContentFromWysiwyg();
                        return;
                      }
                    }

                    const m = getMarked();
                    if (!m) return;

                    let finalHtml = '';
                    
                    if (htmlData) {
                      // Convert rich HTML to Markdown to strip out all inline styles, classes, colors, etc.
                      const md = htmlToMarkdown(htmlData);
                      finalHtml = await m.parse(md);
                    } else if (textData) {
                      // If only plain text exists, allow markdown parser to format it
                      const processed = convertBareImageUrlsToMarkdown(textData);
                      finalHtml = await m.parse(processed);
                    }
                    
                    if (finalHtml) {
                      // If the parsed HTML is just a single unwrapped paragraph, strip the <p> to insert cleanly inline
                      finalHtml = finalHtml.trim();
                      if (finalHtml.startsWith('<p>') && finalHtml.endsWith('</p>') && (finalHtml.match(/<p>/g) || []).length === 1) {
                        finalHtml = finalHtml.substring(3, finalHtml.length - 4);
                      }
                      
                      // Using execCommand ensures native browser block splitting and insertion handling
                      if (!document.execCommand('insertHTML', false, finalHtml)) {
                        insertHtmlAtCursor(finalHtml as string);
                      }

                      // Ensure any filled spacers lose their attributes
                      if (wysiwygRef.current) {
                        wysiwygRef.current.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((el) => {
                          const text = el.textContent || '';
                          if (text.trim() !== '' || el.children.length > 1 || (el.children.length === 1 && el.firstElementChild?.tagName !== 'BR')) {
                            el.removeAttribute('data-empty');
                            el.removeAttribute('data-placeholder');
                            el.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
                          }
                        });
                      }

                      updateContentFromWysiwyg();
                    }
                  }}
                  onInput={(e) => {
                    if (isSyncingRef.current) return;
                    const target = e.target as HTMLDivElement;
                    updateWysiwygEmptyStatus(target);

                    // Clean up non-boundary or filled spacers
                    target.querySelectorAll('.table-spacer, [data-placeholder], [data-empty]').forEach((spacerEl) => {
                      const isTop = spacerEl === target.firstElementChild && spacerEl.classList.contains('top-spacer');
                      const isBottom = spacerEl === target.lastElementChild && spacerEl.classList.contains('bottom-spacer');
                      const text = spacerEl.textContent || '';
                      const hasContent = text.trim() !== '' || spacerEl.children.length > 1 || (spacerEl.children.length === 1 && spacerEl.firstElementChild?.tagName !== 'BR');
                      if (!isTop && !isBottom) {
                        spacerEl.removeAttribute('data-empty');
                        spacerEl.removeAttribute('data-placeholder');
                        spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
                      } else if (hasContent) {
                        spacerEl.removeAttribute('data-empty');
                        spacerEl.removeAttribute('data-placeholder');
                        spacerEl.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
                      }
                    });

                    const blockTags = ['TABLE'];

                    // Ensure top spacer is added ONLY if first element is a special block element and no top-spacer exists
                    const firstEl = target.firstElementChild;
                    if (firstEl && blockTags.includes(firstEl.tagName) && !firstEl.classList.contains('top-spacer')) {
                      if (!target.querySelector('.top-spacer')) {
                        const pBefore = document.createElement('p');
                        pBefore.className = 'table-spacer top-spacer';
                        pBefore.setAttribute('data-empty', 'true');
                        pBefore.setAttribute('data-placeholder', lang === 'uk' ? '↵ Новий параграф...' : lang === 'es' ? '↵ Nuevo párrafo...' : lang === 'ko' ? '↵ 새 문단...' : '↵ New paragraph...');
                        pBefore.innerHTML = '<br>';
                        target.insertBefore(pBefore, firstEl);
                      }
                    }

                    // Ensure bottom spacer is added ONLY if last element is a block element and no bottom-spacer exists
                    const lastEl = target.lastElementChild;
                    if (lastEl && blockTags.includes(lastEl.tagName) && !lastEl.classList.contains('bottom-spacer')) {
                      if (!target.querySelector('.bottom-spacer')) {
                        const pAfter = document.createElement('p');
                        pAfter.className = 'table-spacer bottom-spacer';
                        pAfter.setAttribute('data-empty', 'true');
                        pAfter.setAttribute('data-placeholder', lang === 'uk' ? '↵ Новий параграф...' : lang === 'es' ? '↵ Nuevo párrafo...' : lang === 'ko' ? '↵ 새 문단...' : '↵ New paragraph...');
                        pAfter.innerHTML = '<br>';
                        target.appendChild(pAfter);
                      }
                    }

                    const html = target.innerHTML;
                    const syncDelay = onDemandSyncEnabled ? 4000 : 150;
                    const backupDelay = onDemandSyncEnabled ? 2000 : 800;

                    // Debounce local storage backup of raw HTML so typing remains 100% native and fluid
                    if (wysiwygLocalBackupTimeoutRef.current) {
                      clearTimeout(wysiwygLocalBackupTimeoutRef.current);
                    }
                    wysiwygLocalBackupTimeoutRef.current = setTimeout(() => {
                      localStorage.setItem('steem_autosave_temp_visual_html', html);
                    }, backupDelay) as any;
                    
                    // Delay HTML-to-Markdown conversion so typing stays 100% native and smooth.
                    // This ensures zero unnecessary CPU-heavy conversions during active typing.
                    if (wysiwygSyncTimeoutRef.current) {
                      clearTimeout(wysiwygSyncTimeoutRef.current);
                    }
                    wysiwygSyncTimeoutRef.current = setTimeout(() => {
                      const md = htmlToMarkdown(html);
                      if (md !== useEditorStore.getState().content) {
                        lastSyncContentRef.current = md;
                        setContent(md);
                        saveVisualSelection();
                      }
                    }, syncDelay) as any;
                  }}
                  onFocus={() => {
                    setIsEditorFocused(true);
                    saveVisualSelection();
                  }}
                  onBlur={() => {
                    setIsEditorFocused(false);
                    // Sync visual editor raw HTML immediately on blur for full safety
                    if (onDemandSyncEnabled && wysiwygRef.current) {
                      localStorage.setItem('steem_autosave_temp_visual_html', wysiwygRef.current.innerHTML);
                    }
                  }}
                  onScroll={() => {
                    if (wysiwygRef.current) {
                      localStorage.setItem('steem_editor_scroll', String(wysiwygRef.current.scrollTop));
                    }
                  }}
                  onMouseUp={(e) => {
                    showWidget(e.clientX, e.clientY);
                    saveVisualSelection();
                  }}
                  onKeyUp={() => {
                    updateWysiwygEmptyStatus(wysiwygRef.current);
                    saveVisualSelection();
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const spacer = target.closest?.('.table-spacer, [data-placeholder], [data-empty]') as HTMLElement | null;
                    if (spacer && wysiwygRef.current?.contains(spacer)) {
                      spacer.removeAttribute('data-empty');
                      spacer.removeAttribute('data-placeholder');
                      spacer.classList.remove('table-spacer', 'top-spacer', 'bottom-spacer');
                      
                      if (!spacer.innerHTML || spacer.innerHTML.trim() === '') {
                        spacer.innerHTML = '<br>';
                      }
                      
                      const sel = window.getSelection();
                      const range = document.createRange();
                      range.selectNodeContents(spacer);
                      range.collapse(true);
                      sel?.removeAllRanges();
                      sel?.addRange(range);
                      
                      updateContentFromWysiwyg();
                      return;
                    }

                    updateWysiwygEmptyStatus(wysiwygRef.current);
                    saveVisualSelection();
                  }}
                  className={cn(
                    "relative flex-1 w-full bg-transparent text-base outline-none overflow-y-auto custom-scrollbar transition-colors duration-700 editor-font prose prose-invert prose-cyan max-w-none wysiwyg-editor break-words overscroll-contain",
                    (visualStyle === 'neon' && neonTextColored) ? "text-cyan-400 font-normal" : "text-slate-300",
                    beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-4xl mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-4 pt-4 lg:px-6 lg:pt-6",
                    isKeyboardOpen 
                      ? "pb-44 mb-2 lg:pb-48 lg:mb-4" 
                      : (isEditorFullScreen || isFullScreen
                          ? "pb-44 mb-2 lg:pb-48 lg:mb-4"
                          : (widgetPos === 'bottom' ? "pb-44 mb-[5rem] lg:pb-48 lg:mb-20" : "pb-44 mb-[5rem] lg:pb-36 lg:mb-4"))
                  )}
                  data-is-empty={useEditorStore.getState().content.trim() === '' ? 'true' : undefined}
                  data-placeholder-title={t('visualTitlePlaceholder')}
                  data-placeholder-body={t('visualBodyPlaceholder')}
                  style={{ minHeight: '200px' }}
                />
              )}

              {/* Table Action Menu */}
              {activeTable && tableRect && editorMode === 'visual' && (
                <div 
                  className={cn("fixed z-[160] flex flex-col gap-1.5 p-1.5 rounded-xl",
                    isTableMenuExpanded || isTableMenuPinned ? "bg-slate-900 border border-slate-700/50 shadow-none" : "bg-transparent shadow-none"
                  )}
                  style={{
                    top: tableRect.top + 10,
                    left: Math.max(8, tableRect.left - 48),
                  }}
                  onMouseEnter={() => !isTableMenuPinned && setIsTableMenuExpanded(true)}
                  onMouseLeave={() => !isTableMenuPinned && setIsTableMenuExpanded(false)}
                >
                  {isTableMenuExpanded || isTableMenuPinned ? (
                    <>
                      <button 
                        onClick={() => {
                          const newPinned = !isTableMenuPinned;
                          setIsTableMenuPinned(newPinned);
                          localStorage.setItem('steem_table_menu_pinned', newPinned.toString());
                        }} 
                        className={cn("p-2 rounded-lg transition-colors flex items-center justify-center", isTableMenuPinned ? "text-cyan-400 bg-cyan-900/40" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                        title="Pin Menu"
                      >
                        <Settings size={16} />
                      </button>
                      <div className="h-px w-full bg-slate-800" />
                      <button onClick={deleteActiveTableRow} className="p-2 text-slate-400 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors flex items-center justify-center" title="Delete Row">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={deleteActiveTableCol} className="p-2 text-slate-400 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors flex items-center justify-center" title="Delete Column">
                        <Trash2 size={16} className="rotate-90" />
                      </button>
                      <button onClick={deleteActiveTable} className="p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors flex items-center justify-center" title="Delete Table">
                        <Trash2 size={18} />
                      </button>
                    </>
                  ) : (
                    <button 
                      className="p-2 text-slate-400 bg-slate-900 border border-slate-700/50 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shadow-none flex items-center justify-center" 
                      title="Table Settings"
                    >
                      <Settings size={18} className="opacity-70" />
                    </button>
                  )}
                </div>
              )}

              {/* Compact Mini-Gallery Strip */}
              <AnimatePresence>
                {isMiniGalleryOpen && images.length > 0 && !activeModal && (window.innerWidth >= 1024 || !isSidebarOpen) && (
                  <motion.div
                    key="mini-gallery-strip"
                    initial={{ opacity: 0, y: 15, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      bottom: window.innerWidth < 1024
                        ? (isKeyboardOpen 
                            ? `calc(${keyboardOffset > 0 ? keyboardOffset : 0}px + var(--toolbar-btn-size, 3rem) + 0.35rem)` 
                            : (isEditorFullScreen || isFullScreen
                                ? 'calc(env(safe-area-inset-bottom, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)'
                                : 'calc(4rem + env(safe-area-inset-bottom, 0px) + var(--toolbar-btn-size, 3rem) + 0.35rem)'))
                        : (widgetPos === 'bottom' ? 'calc(4.5rem)' : undefined)
                    }}
                    className={cn(
                      "z-[155] p-2 flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl transition-all",
                      window.innerWidth < 1024 
                        ? "fixed left-3 right-3 max-w-lg mx-auto" 
                        : "absolute left-4 right-4 max-w-2xl mx-auto"
                    )}
                  >
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                          <Images size={14} />
                          {t('miniGallery')} ({images.length})
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          • {t('tapToInsert')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2 py-0.5 text-[10px] font-bold bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-md flex items-center gap-1 transition-colors"
                          title="Upload more"
                        >
                          <Plus size={12} />
                          <span>+</span>
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setIsMiniGalleryOpen(false)}
                          className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                          title={t('close')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div 
                      className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth"
                      style={{ scrollbarWidth: 'none' }}
                    >
                      {images.map((img, idx) => (
                        <button
                          key={img.url || idx}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            insertImage(img.url, img.name, 'plain');
                            setJustInsertedUrl(img.url);
                            setTimeout(() => setJustInsertedUrl(null), 1200);
                          }}
                          className={cn(
                            "group relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border transition-all active:scale-95 focus:outline-none",
                            justInsertedUrl === img.url 
                              ? "border-emerald-400 ring-2 ring-emerald-400/50 scale-105" 
                              : "border-slate-700 hover:border-cyan-400"
                          )}
                          title={`${img.name} - ${t('tapToInsert')}`}
                        >
                          <img 
                            src={img.url} 
                            alt={img.name} 
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          {justInsertedUrl === img.url ? (
                            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex items-center justify-center text-emerald-400">
                              <Check size={18} className="stroke-[3]" />
                            </div>
                          ) : (
                            <div className="absolute bottom-0 inset-x-0 bg-slate-950/75 py-0.5 text-[8px] text-center text-slate-300 font-mono truncate px-0.5">
                              {idx + 1}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tamed Widget - With 3 distinct modes (hidden, bottom, floating) and fixed mobile positioning */}
              {isWidgetVisible && widgetPos !== 'hidden' && !activeModal && (window.innerWidth >= 1024 || !isSidebarOpen) && (
                  <div 
                    key="steem-widget"
                    ref={widgetRef}
                    style={(() => {
                      const style: React.CSSProperties = { 
                        opacity: 1.0 
                      };
                      
                      if (widgetPos === 'floating' && window.innerWidth >= 1024 && floatingPos && editorPaneRef.current) {
                        const rect = editorPaneRef.current.getBoundingClientRect();
                        style.position = 'fixed';
                        
                        // Width estimation for 8 tools + navigation + settings + paddings (~420px)
                        const widgetWidth = 400; 

                        // Standard floating
                        const leftBound = rect.left + 10;
                        const rightBound = rect.right - widgetWidth - 10;
                        style.left = Math.min(rightBound, Math.max(leftBound, floatingPos.x));
                        style.top = floatingPos.y < 150 ? floatingPos.y + 40 : floatingPos.y - 80;
                      } else if (window.innerWidth < 1024) {
                        style.position = 'fixed';
                        style.top = 'auto';
                        style.left = '0.5rem';
                        style.right = '0.5rem';
                        style.margin = '0 auto';
                        if (isKeyboardOpen) {
                          style.bottom = `calc(${keyboardOffset > 0 ? keyboardOffset : 0}px + var(--browser-bottom-inset, 0px) + 0.5rem)`;
                        } else if (isEditorFullScreen || isFullScreen) {
                          style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-bottom-inset, 0px) + 0.5rem)';
                        } else {
                          style.bottom = 'calc(4rem + env(safe-area-inset-bottom, 0px) + var(--browser-bottom-inset, 0px) + 0.5rem)';
                        }
                      }
                      
                      return style;
                    })()}
                    className={cn(
                      "steem-widget-container z-[150] p-1 flex items-center gap-1",
                      widgetNoBorder 
                        ? "shadow-none border-none border-transparent py-0 px-0 bg-slate-900"
                        : "bg-slate-900 border border-white/10 rounded-3xl p-1 shadow-none",
                      widgetPos === 'floating' && window.innerWidth >= 1024 
                        ? "fixed" 
                        : "fixed sm:absolute bottom-4 left-2 right-2 sm:left-4 sm:right-4 rounded-3xl mx-auto max-w-2xl"
                    )}
                  >
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => scrollRef.current?.scrollBy({ left: -100, behavior: 'smooth' })}
                      className="hidden lg:flex h-[var(--toolbar-btn-size,3rem)] px-1.5 items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <ChevronLeft size={20} className="w-[var(--toolbar-icon-size,1.25rem)] h-[var(--toolbar-icon-size,1.25rem)]" />
                    </button>

                    <div 
                      ref={scrollRef}
                      onWheel={(e) => {
                        if (scrollRef.current) {
                          if (e.deltaX !== 0) {
                            // Let native horizontal scrolling work
                            return;
                          }
                          // Translate vertical scrolling to horizontal
                          e.preventDefault();
                          scrollRef.current.scrollBy({ left: e.deltaY > 0 ? 50 : -50 });
                        }
                      }}
                      className="flex items-center flex-nowrap justify-start gap-1.5 overflow-x-auto custom-scrollbar scroll-smooth no-scrollbar px-1 py-0 w-full"
                      style={{ 
                        scrollbarWidth: 'none',
                        minWidth: isWidgetMenuOpen && lockedToolsWidth ? `${lockedToolsWidth}px` : undefined,
                        width: isWidgetMenuOpen && lockedToolsWidth ? `${lockedToolsWidth}px` : undefined
                      }}
                    >
                      {enabledTools.map((key) => {
                        const tool = TOOLS_MAP[key];
                        if (!tool) return null;
                        const isToolActive = 
                          key === 'B' ? activeFormats.bold :
                          key === 'I' ? activeFormats.italic :
                          key === 'S' ? activeFormats.strikethrough :
                          key === 'sub' ? activeFormats.sub :
                          key === 'sup' ? activeFormats.sup :
                          key === 'Inline' ? activeFormats.code :
                          key === 'Color' ? activeFormats.phishy :
                          false;
                        return (
                          <button 
                            key={key}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={tool.action} 
                            className={cn(
                              "toolbar-btn flex-shrink-0 flex items-center justify-center rounded-xl transition-colors font-bold",
                              isToolActive 
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-none"
                                : !widgetNoBorder 
                                  ? "bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-300 shadow-none"
                                  : "bg-transparent text-slate-400 hover:bg-slate-800"
                            )}
                          >
                            {tool.label}
                          </button>
                        );
                      })}
                    </div>

                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => scrollRef.current?.scrollBy({ left: 100, behavior: 'smooth' })}
                      className="hidden lg:flex h-[var(--toolbar-btn-size,3rem)] px-1.5 items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <ChevronRight size={20} className="w-[var(--toolbar-icon-size,1.25rem)] h-[var(--toolbar-icon-size,1.25rem)]" />
                    </button>

                    <div className="hidden lg:block w-px h-[calc(var(--toolbar-btn-size,3rem)-8px)] bg-slate-700/50 mx-1 flex-shrink-0" />
                    
                    <div className="relative widget-settings-container">
                      <button 
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isWidgetMenuOpen && scrollRef.current) {
                            setLockedToolsWidth(scrollRef.current.offsetWidth);
                          } else {
                            setTimeout(() => setLockedToolsWidth(null), 300); // Wait for transition
                          }
                          setIsWidgetMenuOpen(prev => !prev);
                        }} 
                        className={cn(
                          "toolbar-btn flex-shrink-0 flex items-center justify-center rounded-xl transition-all",
                          isWidgetMenuOpen ? "bg-cyan-600 text-white" : 
                          !widgetNoBorder ? "bg-slate-700 hover:bg-cyan-600 hover:text-white border border-slate-600/50" : "bg-transparent text-slate-400 hover:bg-white/10"
                        )}
                      >
                        <Settings size={20} />
                      </button>

                      <AnimatePresence mode="popLayout">
                        {isWidgetMenuOpen && (
                          <motion.div
                            key="widget-settings-menu"
                            initial={{ opacity: 0, y: menuDirection === 'down' ? -10 : 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className={cn(
                              "absolute right-0 w-72 border border-white/5 rounded-3xl overflow-hidden z-[160] flex flex-col bg-slate-900 shadow-none",
                              menuDirection === 'down' ? "top-full mt-3" : "bottom-full mb-3"
                            )}
                            style={{ 
                              maxHeight: widgetRef.current ? 
                                (menuDirection === 'up' 
                                  ? `${Math.max(200, widgetRef.current.getBoundingClientRect().top - 70)}px`
                                  : `${Math.max(200, window.innerHeight - widgetRef.current.getBoundingClientRect().bottom - 20)}px`) 
                                : '80vh' 
                            }}
                          >
                            <div className="p-4 border-b border-white/5 bg-slate-800/20 flex items-center justify-between shrink-0">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Zap size={16} className="text-cyan-400" /> {t('widgetSettings')}
                                </h3>
                                <button 
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => setLockedToolsWidth(null), 300);
                                    setIsWidgetMenuOpen(false);
                                  }} 
                                  className="p-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
                                >
                                  <X size={18} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar pb-8">
                              <div className="space-y-4">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('widgetOpacity')}</label>
                                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">{Math.round(widgetOpacity * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range" min="0.1" max="1" step="0.05" value={widgetOpacity}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setWidgetOpacity(val);
                                      localStorage.setItem('widget_opacity', val.toString());
                                    }}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 opacity-80 hover:opacity-100 transition-opacity"
                                  />
                                </div>

                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full transition-all duration-500", widgetNoBorder ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-slate-600")} />
                                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tight">{t('widgetNoBorder') || 'Без рамок'}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const next = !widgetNoBorder;
                                      setWidgetNoBorder(next);
                                      localStorage.setItem('widget_no_border', next.toString());
                                    }}
                                    className={cn(
                                      "w-9 h-5 rounded-full transition-all duration-300 relative",
                                      widgetNoBorder ? "bg-cyan-600" : "bg-slate-700"
                                    )}
                                  >
                                    <div className={cn(
                                      "absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300",
                                      widgetNoBorder ? "left-5" : "left-1"
                                    )} />
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">{t('widgetPos')}</label>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                      { id: 'bottom', label: lang === 'uk' ? 'ВНИЗУ' : 'BOTTOM' },
                                      { id: 'floating', label: lang === 'uk' ? 'ПЛАВАЮЧИЙ' : 'FLOAT' },
                                      { id: 'hidden', label: lang === 'uk' ? 'ВИМКН' : 'OFF' }
                                    ].map(pos => (
                                      <button
                                        key={pos.id}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          setWidgetPos(pos.id as any);
                                          localStorage.setItem('steem_widget_pos', pos.id);
                                        }}
                                        className={cn(
                                          "text-[9px] py-2 px-1 rounded-xl border transition-all duration-300 text-center font-bold tracking-tighter truncate",
                                          widgetPos === pos.id ? "bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-900/20" : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10"
                                        )}
                                      >
                                        {pos.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('activeToolsSort')}</label>
                                  <span className="text-[9px] text-slate-600 italic">Drag to sort</span>
                                </div>

                                <Reorder.Group 
                                  axis="y" 
                                  values={enabledTools} 
                                  onReorder={(newOrder) => {
                                    setEnabledTools(newOrder);
                                    localStorage.setItem('steem_enabled_tools', JSON.stringify(newOrder));
                                  }} 
                                  className="space-y-2"
                                >
                                  {enabledTools.map((key, idx) => (
                                    <Reorder.Item 
                                      key={key} 
                                      value={key}
                                      transition={{ duration: 0.1 }}
                                      dragListener={true}
                                      whileDrag={{ 
                                        scale: 1, 
                                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                                        borderColor: "rgba(6, 182, 212, 0.3)",
                                        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                                        zIndex: 200
                                      }}
                                      className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2.5 rounded-2xl cursor-grab active:cursor-grabbing hover:border-cyan-500/10 group relative"
                                    >
                                      <div className="flex items-center gap-3">
                                        <MoveVertical size={18} className="text-slate-600 group-hover:text-cyan-500 transition-colors" />
                                        <span className="text-[11px] font-bold text-slate-200">{TOOLS_MAP[key]?.label}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveTool(key, 'up');
                                          }}
                                          disabled={idx === 0}
                                          className="text-slate-500 hover:text-cyan-400 disabled:opacity-0 transition-all p-1"
                                        >
                                          <ChevronUp size={20} />
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveTool(key, 'down');
                                          }}
                                          disabled={idx === enabledTools.length - 1}
                                          className="text-slate-500 hover:text-cyan-400 disabled:opacity-0 transition-all p-1"
                                        >
                                          <ChevronDown size={20} />
                                        </button>
                                      </div>
                                    </Reorder.Item>
                                  ))}
                                </Reorder.Group>

                                <div className="grid grid-cols-4 gap-1.5 pt-2">
                                  {Object.keys(TOOLS_MAP).map(key => (
                                    <button
                                      key={`toggle-${key}`}
                                      onClick={() => toggleTool(key)}
                                      className={cn(
                                        "text-[9px] py-1.5 px-2 rounded-lg border text-center transition-all font-medium truncate",
                                        enabledTools.includes(key) 
                                          ? "bg-cyan-600/10 border-cyan-500/50 text-cyan-400" 
                                          : "bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700"
                                      )}
                                    >
                                      {key}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button 
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsWidgetVisible(false);
                      }} 
                      className={cn(
                        "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all lg:hidden",
                        !widgetNoBorder ? (performanceMode ? "bg-slate-700 hover:bg-red-600 hover:text-white border border-slate-600/50" : "bg-slate-700/50 hover:bg-red-600 hover:text-white border border-slate-600/50") : "bg-transparent text-slate-400 hover:bg-red-600/20 hover:text-red-400"
                      )}
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
            </div>

            {/* Preview Pane */}
            <div 
              ref={previewRef}
              className={cn(
                "flex-1 flex flex-col min-w-0 bg-slate-900 relative",
                activeMobileTab === 'preview' ? "flex" : "hidden",
                isLivePreviewEnabled ? "lg:flex" : "lg:hidden",
                isFullScreen && "bg-slate-950 p-4 lg:p-12 overflow-y-auto fixed top-0 left-0 right-0 z-[250]"
              )}
            >
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 gap-1 shrink-0">
                  <button
                    onClick={toggleLivePreview}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isLivePreviewEnabled ? "bg-cyan-600 text-white shadow-none" : "bg-red-950 text-red-400 border border-red-500/30"
                    )}
                    title={lang === 'uk' ? "Увімкнути/вимкнути прев'ю перегляду" : "Enable/Disable Live Preview"}
                  >
                    {isLivePreviewEnabled ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-0.5 my-auto" />
                  <button
                    onClick={() => setSyncScrollEnabled(!syncScrollEnabled)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      syncScrollEnabled ? "bg-cyan-600 text-white shadow-none" : "text-slate-500 hover:text-slate-300"
                    )}
                    title={t('syncScroll')}
                  >
                    <MoveVertical size={20} />
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-0.5 my-auto" />
                  <button 
                    onClick={toggleFullScreen}
                    className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                    title={t('fullScreen')}
                  >
                    {isFullScreen ? <X size={20} /> : <Maximize2 size={20} />}
                  </button>
                </div>
              </div>

              <div 
                className={cn(
                  "flex-1 p-8 overflow-y-auto prose prose-invert prose-cyan max-w-none custom-scrollbar markdown-body",
                  widgetPos === 'bottom' ? "mb-20 lg:mb-16 pb-24 lg:pb-28" : "pb-24 lg:pb-12",
                  isFullScreen && "max-w-4xl mx-auto"
                )}
                ref={previewPaneRef}
              />
            </div>
          </div>

          {/* Mobile Tabs - Merged into Bottom Nav below */}

          {/* Footer Status Bar - Hidden on mobile to save space for tabs */}
<DesktopStatsFooter t={t} />
        </main>
      </div>
  </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'unlock-pin' && (
          <div key="modal-unlock-pin" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-[240px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-none p-5 text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-600" />
              
              <div className="w-10 h-10 bg-cyan-600/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
                <Lock className="text-cyan-400" size={18} />
              </div>
              
              <h3 className="text-sm font-bold mb-1 text-slate-100 uppercase tracking-tight">{t('vaultLocked')}</h3>
              <p className="text-[10px] text-slate-500 mb-4">{t('enterPinPlaceholder')}</p>
              
              <input 
                autoFocus
                type="password"
                value={vaultPin}
                onChange={e => setVaultPin(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && vaultPin) {
                    try {
                      await SecurityService.unlock(vaultPin);
                      notify(t('vaultUnlocked'), 'success');
                      setVaultPin('');
                      setActiveModal(null);
                      initVault();
                    } catch (err: any) {
                      notify(t('pinError'), 'error');
                      setVaultPin('');
                      console.error(err);
                    }
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-center text-lg tracking-[0.5em] focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:tracking-normal placeholder:text-[10px] text-cyan-400 font-mono"
                placeholder="••••"
              />
              
              <div className="flex gap-2 mt-5">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-[10px] font-bold transition-all uppercase"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={async () => {
                    if (!vaultPin) return;
                    try {
                      await SecurityService.unlock(vaultPin);
                      notify(t('vaultUnlocked'), 'success');
                      setVaultPin('');
                      setActiveModal(null);
                      initVault();
                    } catch (err: any) {
                      notify(t('pinError'), 'error');
                      setVaultPin('');
                      console.error(err);
                    }
                  }}
                  className="flex-[2] py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-cyan-900/20 uppercase"
                >
                  {t('unlock')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'keys' && (
          <div key="modal-keys" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30 shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Key className="text-cyan-400" /> {t('vaultTitle')}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-sm text-cyan-100/70">
                  <p>{t('vaultWarning')}</p>
                </div>

                {!isVaultInitialized ? (
                  <div className="space-y-4 p-4 bg-slate-800/50 border border-cyan-500/30 rounded-xl">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{t('pinSetup')}</h3>
                    <p className="text-xs text-slate-400">{t('pinSetupDesc')}</p>
                    <input 
                      type="password" 
                      value={vaultSetupPin}
                      onChange={e => setVaultSetupPin(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder={t('enterNewPin')}
                    />
                    <button 
                      onClick={async () => {
                        if (vaultSetupPin.length < 4) {
                          notify(t('pinShort'), 'error');
                          return;
                        }
                        await SecurityService.setup(vaultSetupPin);
                        setVaultSetupPin('');
                        initVault();
                        notify(t('vaultInit'));
                      }}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      {t('createVault')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {!isUnlocked ? (
                      <div className="space-y-4 p-4 bg-slate-800/50 border border-yellow-500/30 rounded-xl">
                        <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest">{t('vaultLocked')}</h3>
                        <input 
                          type="password" 
                          value={vaultPin}
                          onChange={e => setVaultPin(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-yellow-500"
                          placeholder={t('enterPinPlaceholder')}
                        />
                        <button 
                          onClick={async () => {
                            try {
                              await SecurityService.unlock(vaultPin);
                              setVaultPin('');
                              initVault();
                            } catch (e: any) {
                              notify(e.message, 'error');
                            }
                          }}
                          className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          {t('unlockBtn')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('yourAccounts')}</h3>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => { SecurityService.lock(); initVault(); }}
                              className="text-[10px] font-bold text-yellow-500 hover:text-yellow-400 flex items-center gap-1"
                            >
                              <Lock size={16} /> {t('lock')}
                            </button>
                            <button 
                              onClick={() => setShowVaultSetup(!showVaultSetup)}
                              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              {showVaultSetup ? <X size={16} /> : <Plus size={16} />}
                              {showVaultSetup ? t('cancel') : t('addAccount')}
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {showVaultSetup && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 bg-slate-800/80 border border-cyan-500/30 rounded-xl space-y-3 mb-4">
                                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('newAccount')}</p>
                                <input 
                                  type="text" 
                                  value={username}
                                  onChange={e => setUsername(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                                  placeholder={t('usernameNoAt')}
                                />
                                <input 
                                  type="password" 
                                  value={vaultSetupWif}
                                  onChange={e => setVaultSetupWif(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                                  placeholder={t('postingKeyPlaceholder')}
                                />
                                  <button 
                                    onClick={async () => {
                                      if (!username || !vaultSetupWif) {
                                        notify(t('fillAll'), 'error');
                                        return;
                                      }
                                      try {
                                        await SecurityService.saveKey(username, vaultSetupWif);
                                        setVaultSetupWif('');
                                        setShowVaultSetup(false);
                                        initVault();
                                        notify(t('accountAdded'));
                                      } catch (e: any) {
                                        notify(e.message, 'error');
                                      }
                                    }}
                                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  {t('saveToVault')}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-2">
                          {vaultAccounts.length > 0 ? (
                            vaultAccounts.map(acc => (
                              <div key={acc} className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                                    {acc[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-200">@{acc}</p>
                                    <p className="text-[9px] text-green-500 uppercase tracking-wider">{t('protectedByMK')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={async () => {
                                      if (await confirmDialog(t('confirmDeleteAccount').replace('{acc}', acc))) {
                                        await SecurityService.deleteAccount(acc);
                                        initVault();
                                      }
                                    }}
                                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                    title={t('delete')}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 border-2 border-dashed border-slate-800 rounded-xl text-center">
                              <p className="text-xs text-slate-500">{t('vaultEmpty')}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-4">
                          <button 
                            onClick={async () => {
                              if (await confirmDialog(t('confirmResetVault'))) {
                                await SecurityService.clearAll();
                                initVault();
                              }
                            }}
                            className="text-[10px] text-red-500 hover:text-red-400 underline"
                          >
                            {t('resetVault')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <ImageIcon size={20} className="text-cyan-400" /> {t('additional')}
                  </h3>

                  <div className="flex flex-col gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">{t('performanceMode')}</span>
                        <span className="text-[10px] text-slate-500">{t('enableThumbnails')}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const next = !performanceMode;
                          setPerformanceMode(next);
                          localStorage.setItem('steem_performance_mode', next.toString());
                        }}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all relative",
                          performanceMode ? "bg-cyan-600" : "bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                          performanceMode ? "left-5" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('pexelsKey')}</label>
                        {!savePexelsUnencrypted && !isUnlocked && (
                          <span className="text-[8px] text-amber-500 flex items-center gap-1"><Lock size={8} /> Unlock Vault to save</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                          placeholder={pexelsApiKey ? "••••••••" : t('pexelsKey')}
                          value={tempPexelsKey}
                          onChange={e => setTempPexelsKey(e.target.value)}
                        />
                        <button 
                          onClick={async () => {
                            if (!tempPexelsKey.trim()) return;
                            try {
                              if (savePexelsUnencrypted) {
                                localStorage.setItem('steem_pexels_key_raw', tempPexelsKey.trim());
                              } else {
                                await SecurityService.savePexelsKey(tempPexelsKey.trim());
                              }
                              setPexelsApiKey(tempPexelsKey.trim());
                              setTempPexelsKey('');
                              notify(t('saveSuccess'));
                            } catch (err: any) {
                              notify(err.message, 'error');
                            }
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold"
                        >
                          {t('save')}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('pixabayKey')}</label>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                          placeholder={pixabayApiKey ? "••••••••" : t('pixabayKey')}
                          value={tempPixabayKey}
                          onChange={e => setTempPixabayKey(e.target.value)}
                        />
                        <button 
                          onClick={async () => {
                            if (!tempPixabayKey.trim()) return;
                            try {
                              if (savePexelsUnencrypted) {
                                localStorage.setItem('steem_pixabay_key', tempPixabayKey.trim());
                              } else {
                                await SecurityService.saveApiKey('pixabay', tempPixabayKey.trim());
                              }
                              setPixabayApiKey(tempPixabayKey.trim());
                              setTempPixabayKey('');
                              notify(t('saveSuccess'));
                            } catch (e: any) { notify(e.message, 'error') }
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold"
                        >
                          {t('save')}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('unsplashAccessKey')}</label>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                          placeholder={unsplashAccessKey ? "••••••••" : t('unsplashAccessKey')}
                          value={tempUnsplashAccessKey}
                          onChange={e => setTempUnsplashAccessKey(e.target.value)}
                        />
                        <button 
                          onClick={async () => {
                            if (!tempUnsplashAccessKey.trim()) return;
                            try {
                              if (savePexelsUnencrypted) {
                                localStorage.setItem('steem_unsplash_access_key', tempUnsplashAccessKey.trim());
                              } else {
                                await SecurityService.saveApiKey('unsplashAccess', tempUnsplashAccessKey.trim());
                              }
                              setUnsplashAccessKey(tempUnsplashAccessKey.trim());
                              setTempUnsplashAccessKey('');
                              notify(t('saveSuccess'));
                            } catch (e: any) { notify(e.message, 'error') }
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold"
                        >
                          {t('save')}
                        </button>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={savePexelsUnencrypted}
                        onChange={e => {
                          setSavePexelsUnencrypted(e.target.checked);
                          localStorage.setItem('steem_pexels_unencrypted', String(e.target.checked));
                        }}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
                      />
                      <span className="text-xs text-slate-400">{t('saveUnencrypted')}</span>
                    </label>

                    <div className="pt-2">
                       <button 
                         onClick={async () => {
                           if (await confirmDialog(t('confirmClearApiKeys') || "Очистити всі API ключі?")) {
                             setPexelsApiKey(null);
                             setPixabayApiKey(null);
                             setUnsplashAccessKey(null);
                             localStorage.removeItem('steem_pexels_key_raw');
                             localStorage.removeItem('steem_pixabay_key');
                             localStorage.removeItem('steem_unsplash_app_id');
                             localStorage.removeItem('steem_unsplash_access_key');
                             localStorage.removeItem('steem_unsplash_secret_key');
                             await SecurityService.clearAllApiKeys();
                             notify(t('keysCleared') || "API ключі очищено!");
                           }
                         }}
                         className="text-[10px] text-red-500 hover:text-red-400 underline"
                       >
                         {t('clearApiKeys') || "Очистити API ключі"}
                       </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    {t('done')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'publish' && (
          <div key="modal-publish" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Rocket className="text-cyan-400" /> {t('publishToSteem')}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              
              <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  <button 
                    onClick={() => setAuthType('KEYCHAIN')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all",
                      authType === 'KEYCHAIN' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <ShieldCheck size={18} /> Keychain
                    {typeof window !== 'undefined' && !(window as any).steem_keychain && (
                      <span className="text-[9px] font-normal opacity-60">({t('absent')})</span>
                    )}
                  </button>
                  <button 
                    onClick={() => setAuthType('VAULT')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all",
                      authType === 'VAULT' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Lock size={18} /> Vault (Ключ)
                  </button>
                </div>

                <div className="space-y-3">
                  {authType === 'VAULT' && (
                    <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      {!isVaultInitialized ? (
                        <div className="space-y-3 text-center py-2">
                          <p className="text-xs text-slate-400">{t('vaultNotConfigured')}</p>
                          <button 
                            onClick={() => setActiveModal('keys')}
                            className="text-xs font-bold text-cyan-400 hover:underline"
                          >
                            {t('setupVaultBtn')}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              isUnlocked ? "text-green-400" : "text-yellow-400"
                            )}>
                              <ShieldCheck size={18}/> {isUnlocked ? t('vaultUnlocked') : t('vaultLocked')}
                            </span>
                            <div className="flex gap-2">
                              {isUnlocked && (
                                <button 
                                  onClick={() => { SecurityService.lock(); setVaultPin(''); }}
                                  className="text-[10px] text-slate-400 hover:text-white"
                                >
                                  {t('lock')}
                                </button>
                              )}
                            </div>
                          </div>
                          {!isUnlocked && (
                            <div className="space-y-2">
                              <input 
                                type="password" 
                                value={vaultPin}
                                onChange={e => setVaultPin(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                                placeholder={t('enterPinPlaceholder')}
                              />
                              <button 
                                onClick={async () => {
                                  try {
                                    await SecurityService.unlock(vaultPin);
                                    setVaultPin('');
                                    initVault();
                                  } catch (e: any) {
                                    notify(e.message, 'error');
                                  }
                                }}
                                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all"
                              >
                                {t('unlockBtn')}
                              </button>
                            </div>
                          )}
                          {isUnlocked && (
                            <div className="space-y-2">
                              <select 
                                value={selectedVaultUser}
                                onChange={e => {
                                  setSelectedVaultUser(e.target.value);
                                  setUsername(e.target.value);
                                }}
                                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-mono"
                                style={{ colorScheme: 'dark' }}
                              >
                                <option value="" className="bg-slate-900 text-slate-400">{t('selectAccount')}</option>
                                {vaultAccounts.map(acc => (
                                  <option key={acc} value={acc} className="bg-slate-900 text-slate-200 py-1">@{acc}</option>
                                ))}
                              </select>
                              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-[11px] text-green-400 flex items-start gap-2">
                                <ShieldCheck size={20} className="shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold mb-0.5">{t('vaultActive')}</p>
                                  <p className="opacity-80">{t('vaultActiveDesc')}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {authType === 'KEYCHAIN' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t('username')}</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={username || ""}
                            onChange={e => setUsername(e.target.value)}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-mono"
                            placeholder={t('username')}
                          />
                          {(window as any).steem_keychain && !username && (
                             <button 
                              onClick={() => {
                                (window as any).steem_keychain.requestHandshake(() => {
                                  // Handshake done, but we usually want to just let them type or maybe try to get accounts?
                                  // Keychain doesn't expose accounts easily without interaction
                                  notify("Keychain detected. Enter your username.");
                                });
                              }}
                              className="px-3 bg-slate-800 border border-slate-700 rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors"
                              title="Keychain Detected"
                            >
                              <ShieldCheck size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {!(window as any).steem_keychain && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 flex items-start gap-2.5">
                          <Info size={18} className="shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            {lang === 'uk' 
                              ? 'Steem Keychain не знайдено. Рекомендуємо знайти його у магазинах розширень для браузерів ПК, а для мобільних — у відповідних маркетах застосунків.' 
                              : 'Steem Keychain not found. We recommend searching for it in browser extension stores for PC, and in app markets for mobile devices.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t('title')}</label>
                    <input 
                      type="text" 
                      value={pubTitle || ""}
                      onChange={e => setPubTitle(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      placeholder={t('title')}
                    />
                    <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" checked={removeTitleLine} onChange={(e) => { setRemoveTitleLine(e.target.checked); localStorage.setItem('steem_remove_title_line', e.target.checked.toString()); }} className="sr-only" />
                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", removeTitleLine ? "bg-cyan-500 border-cyan-500" : "border-slate-600 group-hover:border-slate-500")}>
                          {removeTitleLine && <Check size={12} className="text-white" />}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 group-hover:text-slate-300">{t('removeFirstLine') || 'Remove 1st line from post body'}</span>
                    </label>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-500 uppercase block">{t('tags')}</label>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setActiveModal('tagPresets')}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors flex items-center gap-1"
                        >
                          <LayoutGrid size={14} /> {t('communities')}
                        </button>
                        <button 
                          onClick={() => setActiveModal('tagGroups')}
                          className="text-[10px] text-slate-400 hover:text-slate-300 font-bold transition-colors"
                        >
                          + {t('tagGroups')}
                        </button>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={pubTags || ""}
                      onChange={e => setPubTags(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      placeholder={t('tagsPlaceholder')}
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {COMMON_TAGS.slice(0, 8).map(tag => (
                        <button 
                          key={tag}
                          onClick={() => setPubTags(prev => {
                            const existing = prev.split(' ').filter(t => t.trim());
                            if (existing.includes(tag)) return prev;
                            return [...existing, tag].join(' ');
                          })}
                          className={cn(
                            "text-[10px] px-2 py-1 rounded-full border transition-colors",
                            pubTags.includes(tag) 
                              ? "bg-cyan-600 border-cyan-500 text-white" 
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                          )}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reward Type - Moved Here */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t('rewardType')}</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['50', 'SP', '0'] as const).map(type => (
                        <button 
                          key={type}
                          onClick={() => {
                            setRewardType(type);
                            localStorage.setItem('steem_reward_type', type);
                          }}
                          className={cn(
                            "text-[9px] py-2 rounded-lg border transition-all font-bold uppercase",
                            rewardType === type ? "bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-900/40" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          {t(`rewards${type}` as any)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <button 
                      onClick={() => setShowAdvancedPublish(!showAdvancedPublish)}
                      className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-cyan-400 transition-colors"
                    >
                      {showAdvancedPublish ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      {t('beneficiaries')} & {t('schedule')}
                    </button>

                    <AnimatePresence>
                      {showAdvancedPublish && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          {/* Schedule */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar size={18} className="text-slate-500" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{t('schedule')}</span>
                            </div>
                            <input 
                              type="datetime-local" 
                              value={scheduledTime || ""}
                              onChange={e => setScheduledTime(e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded p-1 text-[10px] outline-none focus:ring-1 focus:ring-cyan-500 text-slate-300"
                            />
                          </div>

                          {/* Beneficiaries */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                              <div className="flex gap-2 flex-1">
                                <div className="space-y-1 flex-1">
                                  <label className="text-[8px] font-bold text-slate-500 uppercase px-1">{t('username')}</label>
                                  <input 
                                    type="text" 
                                    value={benName || ""}
                                    onChange={e => setBenName(e.target.value.toLowerCase().replace('@', ''))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] outline-none focus:ring-1 focus:ring-cyan-500"
                                    placeholder="nickname"
                                  />
                                </div>
                                <div className="space-y-1 w-16">
                                  <label className="text-[8px] font-bold text-slate-500 uppercase px-1">%</label>
                                  <input 
                                    type="number" 
                                    value={benWeight || "5"}
                                    onChange={e => setBenWeight(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] outline-none focus:ring-1 focus:ring-cyan-500 text-center"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button 
                                    onClick={() => {
                                      if (!benName) return;
                                      const weight = parseFloat(benWeight);
                                      if (isNaN(weight)) return;
                                      setBeneficiaries([...beneficiaries, { account: benName.trim(), weight }]);
                                      setBenName('');
                                    }}
                                    className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                                  >
                                    <Plus size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Fav Mentions Picker */}
                            {mentions.length > 0 && (
                              <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{t('mentions')}</label>
                                  <button onClick={() => setActiveModal('mentions')} className="text-[8px] text-cyan-400 hover:underline px-1 uppercase font-bold">Редагувати список</button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 min-h-[1rem]">
                                  {mentions.map(m => (
                                    <button
                                      key={m}
                                      onClick={() => {
                                        if (beneficiaries.some(b => b.account === m)) return;
                                        setBeneficiaries([...beneficiaries, { account: m, weight: 5 }]);
                                      }}
                                      disabled={beneficiaries.some(b => b.account === m)}
                                      className={cn(
                                        "text-[9px] px-2.5 py-1 rounded-full border transition-all font-medium",
                                        beneficiaries.some(b => b.account === m)
                                          ? "bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed"
                                          : "bg-cyan-500/5 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/40"
                                      )}
                                    >
                                      @{m}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Mentions in text Picker */}
                            {extractMentions(contentForPublish).filter(m => !mentions.includes(m)).length > 0 && (
                              <div className="px-1">
                                <span className="text-[8px] text-slate-600 uppercase font-bold mb-1 block opacity-60">{t('fromMentions')}:</span>
                                <div className="flex flex-wrap gap-1">
                                  {extractMentions(contentForPublish).filter(m => !mentions.includes(m)).map(m => (
                                    <button
                                      key={m}
                                      onClick={() => {
                                        if (beneficiaries.some(b => b.account === m)) return;
                                        setBeneficiaries([...beneficiaries, { account: m, weight: 5 }]);
                                      }}
                                      disabled={beneficiaries.some(b => b.account === m)}
                                      className={cn(
                                        "text-[8px] px-2 py-0.5 rounded border transition-all",
                                        beneficiaries.some(b => b.account === m)
                                          ? "bg-slate-800 border-slate-700 text-slate-600"
                                          : "bg-slate-800/50 border-slate-700 text-slate-500 hover:text-cyan-400"
                                      )}
                                    >
                                      @{m}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="space-y-1.5 pt-2">
                              <label className="text-[8px] font-bold text-slate-600 uppercase px-1">{t('beneficiaries')}</label>
                              {beneficiaries.map((b, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50 text-[10px] hover:border-slate-600 transition-colors">
                                  <span className="text-slate-200 font-bold tracking-tight">@{b.account}</span>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-lg border border-slate-700/50">
                                      <input 
                                        type="number"
                                        className="w-8 bg-transparent text-center outline-none text-cyan-400 font-mono text-[11px]"
                                        value={b.weight}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          if (isNaN(val)) return;
                                          setBeneficiaries(beneficiaries.map((ben, i) => i === idx ? { ...ben, weight: val } : ben));
                                        }}
                                      />
                                      <span className="text-slate-500 text-[9px] font-bold">%</span>
                                    </div>
                                    <button 
                                      onClick={() => setBeneficiaries(beneficiaries.filter((_, i) => i !== idx))}
                                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {beneficiaries.length === 0 && (
                                <div className="text-center py-4 bg-slate-800/20 rounded-xl border border-dashed border-slate-800 text-[10px] text-slate-600 italic">
                                  {t('noBeneficiaries')}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Signature Check - Simplified */}
                <div className="px-4 py-2 bg-slate-800/10 border border-slate-800 rounded-xl flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                   <div className="flex items-center gap-2">
                      <AtSign size={16} className={cn(
                        "transition-colors",
                        (contentForPublish.includes('✍️') || contentForPublish.includes('center') || contentForPublish.toLowerCase().includes('signature')) ? "text-green-500" : "text-slate-600"
                      )} />
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('signaturePolicy')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      { (contentForPublish.includes('✍️') || contentForPublish.includes('center') || contentForPublish.toLowerCase().includes('signature')) ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-yellow-600 font-bold uppercase italic">{t('signatureMissing')}.</span>
                          <X size={16} className="text-yellow-600 opacity-50" />
                        </div>
                      )}
                   </div>
                </div>

                {pubLog.type && (
                  <div className={cn(
                    "p-4 rounded-xl text-sm font-medium border animate-in fade-in slide-in-from-top-2",
                    pubLog.type === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" :
                    pubLog.type === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                    "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                  )}>
                    {pubLog.msg}
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex flex-col gap-2">
                <button 
                  onClick={handlePublish}
                  disabled={pubLog.type === 'loading'}
                  className={cn(
                    "w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 border border-cyan-500/20",
                    performanceMode ? "shadow-none" : "shadow-xl shadow-cyan-500/30 active:scale-[0.98]"
                  )}
                >
                  {pubLog.type === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Rocket size={20} className="stroke-[2.5px]" />}
                  {t('publish')}
                </button>
                <button 
                  onClick={addToQueue}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <ListIcon size={18} />
                  {t('addToQueue')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

          {/* Templates Modal */}
          {activeModal === 'templates' && (
            <div key="modal-templates" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/90"
                onClick={() => {
                  setActiveModal(null);
                  setIsAddingTemplate(false);
                }}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-none w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{t('templates')}</h2>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{templates.length} {t('saved') || 'збережено'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveModal(null);
                      setIsAddingTemplate(false);
                    }} 
                    className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                  {isAddingTemplate ? (
                    <div className="space-y-4 bg-slate-850/50 p-4 rounded-2xl border border-slate-700/50 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit3 size={16} className="text-cyan-400" />
                        <h3 className="font-bold text-slate-100 text-sm">Зберегти як новий шаблон</h3>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                          Назва шаблону
                        </label>
                        <input
                          type="text"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="Наприклад: Мій підпис, Звіт, Привітання..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                          Призначення та тип шаблону
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setNewTemplateType('post')}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              newTemplateType === 'post'
                                ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-400'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <FileText size={13} />
                              <span>Шаблон допису</span>
                            </div>
                            <p className="text-[9px] text-slate-450 mt-1.5 leading-relaxed">
                              Замінює весь поточний вміст, заголовок та теги допису.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNewTemplateType('snippet')}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              newTemplateType === 'snippet'
                                ? 'bg-amber-500/10 border-amber-500/60 text-amber-400'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <Edit3 size={13} />
                              <span>Вставка / Сніппет</span>
                            </div>
                            <p className="text-[9px] text-slate-450 mt-1.5 leading-relaxed">
                              Вставляє заготовлений текст у поточне місце курсору.
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingTemplate(false);
                            setNewTemplateName('');
                          }}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                        >
                          Скасувати
                        </button>
                        <button
                          type="button"
                          disabled={!newTemplateName.trim()}
                          onClick={() => {
                            if (!newTemplateName.trim()) {
                              notify('Вкажіть назву шаблону!');
                              return;
                            }
                            const newT: Template = {
                              id: Date.now().toString(),
                              name: newTemplateName.trim(),
                              content: useEditorStore.getState().content,
                              tags: pubTags,
                              title: pubTitle,
                              type: newTemplateType
                            };
                            const updated = [...templates, newT];
                            setTemplates(updated);
                            localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
                            notify(t('templateSaved'));
                            setIsAddingTemplate(false);
                            setNewTemplateName('');
                          }}
                          className={cn(
                            "flex-1 py-2 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5",
                            newTemplateName.trim()
                              ? "bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer border border-cyan-500/20"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-40",
                            newTemplateName.trim() && !performanceMode ? "shadow-xl shadow-cyan-500/20 active:scale-98" : "shadow-none"
                          )}
                        >
                          Зберегти
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mb-4">
                      <button 
                        onClick={() => {
                          setIsAddingTemplate(true);
                          setNewTemplateName('');
                          setNewTemplateType('snippet');
                        }}
                        className={cn(
                          "flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 border border-cyan-500/20",
                          performanceMode ? "shadow-none" : "shadow-xl shadow-cyan-500/20 hover:scale-[1.01] active:scale-95"
                        )}
                      >
                        <Plus size={18} className="stroke-[2.5px]" />
                        {t('saveAsTemplate')}
                      </button>
                    </div>
                  )}

                  {!isAddingTemplate && templates.length > 0 && (
                    <div className="flex border-b border-slate-800 mb-4 p-1 bg-slate-950/40 rounded-xl shrink-0">
                      <button
                        onClick={() => setTemplateFilter('all')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                          templateFilter === 'all'
                            ? 'bg-slate-800 text-cyan-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Всі ({templates.length})
                      </button>
                      <button
                        onClick={() => setTemplateFilter('post')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                          templateFilter === 'post'
                            ? 'bg-slate-800 text-cyan-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Шаблони допису ({templates.filter(t => t.type === 'post' || !t.type).length})
                      </button>
                      <button
                        onClick={() => setTemplateFilter('snippet')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                          templateFilter === 'snippet'
                            ? 'bg-slate-800 text-cyan-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Фрагменти ({templates.filter(t => t.type === 'snippet').length})
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {templates.length === 0 ? (
                      <div className="text-center py-10 text-slate-500">
                        <FileText size={40} className="mx-auto mb-4 opacity-20" />
                        <p>{t('templatesEmpty')}</p>
                      </div>
                    ) : (() => {
                      const filtered = templates.filter(tmp => {
                        if (templateFilter === 'post') return tmp.type === 'post' || !tmp.type;
                        if (templateFilter === 'snippet') return tmp.type === 'snippet';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                            <p className="text-xs">Немає шаблонів у цій категорії</p>
                          </div>
                        );
                      }

                      return filtered.map(tmp => {
                        const isSnippet = tmp.type === 'snippet';
                        return (
                          <div key={tmp.id} className="group p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl hover:border-cyan-500/50 transition-all">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-bold text-slate-200 text-xs sm:text-sm">{tmp.name}</h4>
                                <span className={`inline-block text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 ${
                                  isSnippet 
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                }`}>
                                  {isSnippet ? 'Фрагмент / Вставка' : 'Шаблон допису'}
                                </span>
                              </div>
                              <div className="flex gap-4 items-center pl-2">
                                <button 
                                  onClick={async () => {
                                    if (isSnippet) {
                                      insertAtCursor(tmp.content);
                                      notify('Фрагмент вставлено у місце курсору!');
                                      setActiveModal(null);
                                    } else {
                                      if (await confirmDialog('Замінити весь поточний допис цим шаблоном? Поточні дані (заголовок, текст, теги) буде втрачено.')) {
                                        setContent(tmp.content);
                                        if (tmp.tags) setPubTags(tmp.tags);
                                        if (tmp.title) setPubTitle(tmp.title);
                                        notify('Шаблон допису застосовано!');
                                        setActiveModal(null);
                                      }
                                    }
                                  }}
                                  className={`p-1.5 border rounded-lg transition-colors flex items-center justify-center ${
                                    isSnippet 
                                      ? 'hover:bg-amber-500/10 text-amber-500 border-amber-500/30' 
                                      : 'hover:bg-cyan-500/10 text-cyan-400 border-cyan-500/50'
                                  }`}
                                  title={isSnippet ? 'Вставити у курсор' : 'Застосувати шаблон'}
                                >
                                  {isSnippet ? <PlusCircle size={16} /> : <CheckCircle size={16} />}
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (await confirmDialog(t('confirmDeleteTemplate').replace('{name}', tmp.name))) {
                                      const updated = templates.filter(t => t.id !== tmp.id);
                                      setTemplates(updated);
                                      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(updated));
                                      notify(t('templateDeleted'));
                                    }
                                  }}
                                  className="p-1.5 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg transition-colors flex items-center justify-center"
                                  title="Видалити"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 mt-1 select-all font-mono text-[10px] leading-relaxed text-slate-400 max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap break-all">
                              {tmp.content}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        {activeModal === 'tagPresets' && (
          <div key="modal-tag-presets" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal('publish')}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full sm:max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[80vh]"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30 shrink-0">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Tags className="text-cyan-400" /> {t('tagPresets')}
                </h2>
                <button onClick={() => setActiveModal('publish')} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <LayoutGrid size={18} /> {t('communities')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {COMMUNITIES.map(comm => (
                      <div 
                        key={comm.id}
                        onClick={() => {
                          const allSelected = comm.tags.every(t => pubTags.includes(t));
                          if (allSelected) {
                            setPubTags(prev => {
                              const tags = prev.split(' ').filter(t => t.trim());
                              return tags.filter(t => !comm.tags.includes(t)).join(' ');
                            });
                          } else {
                            setPubTags(prev => {
                              const tags = prev.split(' ').filter(t => t.trim());
                              comm.tags.forEach(t => {
                                if (!tags.includes(t)) tags.push(t);
                              });
                              return tags.join(' ');
                            });
                          }
                        }}
                        className={cn(
                          "flex flex-col items-start p-4 border rounded-xl transition-all bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50",
                          comm.tags.every(t => pubTags.includes(t)) ? "border-cyan-500 bg-cyan-500/10" : (comm.tags.some(t => pubTags.includes(t)) && "border-cyan-500/50 bg-cyan-500/5")
                        )}
                      >
                        <span className="font-bold text-sm text-slate-200 mb-2">{comm.name}</span>
                        <div className="flex flex-wrap gap-1">
                          {comm.tags.map(tag => (
                            <button
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTag(tag);
                              }}
                              className={cn(
                                "text-[9px] px-2 py-0.5 rounded-full border transition-all",
                                pubTags.includes(tag)
                                  ? "bg-cyan-600 border-cyan-500 text-white"
                                  : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600"
                              )}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Plus size={18} /> {t('commonTags')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_TAGS.map(tag => (
                      <button 
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          pubTags.includes(tag) 
                            ? "bg-cyan-600 border-cyan-500 text-white" 
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                        )}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
                <button 
                  onClick={() => setPubTags('')}
                  className="px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  {t('clear')}
                </button>
                <button 
                  onClick={() => setActiveModal('publish')}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-sm transition-all"
                >
                  {t('done')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'splitPost' && (
          <div key="modal-split" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Layers className="text-cyan-400" /> {t('splitPost')}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {t('splitPostDesc')}
                </p>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-3">
                    <span>{t('minWordsPerPart') || 'Words per part'}</span>
                    <input 
                      type="number" 
                      value={splitWords} 
                      onChange={(e) => setSplitWords(Number(e.target.value))}
                      className="w-16 sm:w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white flex items-baseline gap-2">
                    {Math.ceil(stats.words / (splitWords || 300))}
                    <span className="text-xs text-slate-500 font-medium">{t('parts')}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-slate-800/30 border-t border-slate-800 flex gap-3">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold rounded-xl transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSplitPost}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98]"
                >
                  {t('splitBtn')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'drafts' && (
          <div key="modal-drafts" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <div className="flex flex-col">
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <FolderOpen className="text-cyan-400" /> {t('drafts')}
                  </h2>
                  <div className="flex gap-2 mt-2">
                    {(['all', 'working', 'ready'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setDraftFilter(f)}
                        className={cn(
                          "text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border transition-all",
                          draftFilter === f ? "bg-cyan-600 border-cyan-500 text-white" : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500"
                        )}
                      >
                        {t(f as any)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label 
                    className="p-1 sm:p-1.5 text-slate-500 hover:text-cyan-400 bg-slate-800/50 hover:bg-cyan-900/30 rounded border border-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center group cursor-pointer"
                    title="Імпортувати бекап чернеток"
                  >
                    <FileDown size={18} className="sm:size-[16px]" />
                    <input type="file" accept=".zip" className="hidden" onChange={importBackup} />
                  </label>
                  <button 
                    onClick={exportBackup}
                    className="p-1 sm:p-1.5 text-slate-500 hover:text-cyan-400 bg-slate-800/50 hover:bg-cyan-900/30 rounded border border-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center group"
                    title="Експортувати бекап чернеток"
                  >
                    <FileUp size={18} className="sm:size-[16px]" />
                  </button>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white p-1"><X size={18} className="sm:size-[20px]" /></button>
                </div>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
                {(() => {
                  const allDrafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
                  const filtered = allDrafts.filter((d: Draft) => draftFilter === 'all' || d.status === draftFilter);
                  
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>{t('noDrafts')}</p>
                      </div>
                    );
                  }

                  return filtered.map((draft: Draft) => (
                    <div 
                      key={draft.id}
                      className="group p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all cursor-pointer flex justify-between items-center"
                      onClick={async () => {
                        if (await confirmDialog(t('loadDraftConfirm'))) {
                          setContent(draft.body);
                          setPubTitle(draft.title);
                          setCurrentDraftId(draft.id);
                          localStorage.removeItem('steem_autosave_temp_visual_html');
                          
                          if (editorMode === 'visual' && wysiwygRef.current) {
                            isSyncingRef.current = true;
                            const m = getMarked();
                            if (m) {
                              const parsed = await m.parse(draft.body);
                              if (wysiwygRef.current) {
                                wysiwygRef.current.innerHTML = parsed;
                                localStorage.setItem('steem_autosave_temp_visual_html', parsed);
                                localStorage.setItem('steem_visual_html_is_stale', 'false');
                              }
                            }
                            isSyncingRef.current = false;
                          }
                          
                          setActiveModal(null);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-200 truncate">{draft.title}</h4>
                          {draft.status === 'ready' && (
                            <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded border border-green-500/30 uppercase font-bold tracking-tighter">
                              {t('ready')}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{draft.date}</p>
                      </div>
                      <div className="flex gap-1 items-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setContent(draft.body);
                            setPubTitle(draft.title);
                            setActiveModal('publish');
                          }}
                          title={t('publish')}
                          className="p-2 text-cyan-500 hover:bg-cyan-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Rocket size={20} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDraftStatus(draft.id);
                          }}
                          title={draft.status === 'ready' ? t('working') : t('ready')}
                          className={cn(
                            "p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                            draft.status === 'ready' ? "text-green-400 hover:bg-green-400/10" : "text-slate-500 hover:bg-slate-500/10"
                          )}
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirmDialog(t('delete') + '?')) {
                              const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
                              localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts.filter((d: Draft) => d.id !== draft.id)));
                              setActiveModal('drafts_refresh'); // Hack to re-render
                              setTimeout(() => setActiveModal('drafts'), 0);
                            }
                          }}
                          className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'mentions' && (
          <div key="modal-mentions" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <AtSign className="text-cyan-400" /> {t('mentions')}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMention}
                    onChange={e => setNewMention(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder={t('username')}
                  />
                  <button 
                    onClick={addMention}
                    className="p-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                  {mentions.map(user => (
                    <div key={user} className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 group">
                      <button 
                        onClick={() => { insertAtCursor(`@${user} `); setActiveModal(null); }}
                        className="text-sm font-bold hover:text-cyan-400 transition-colors"
                      >
                        @{user}
                      </button>
                      <button 
                        onClick={async () => {
                          if (await confirmDialog(t('delete') + '?')) {
                            const updated = mentions.filter(u => u !== user);
                            setMentions(updated);
                            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

          <AnimatePresence>
            {isSMenuOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/90"
                  onClick={() => setIsSMenuOpen(false)}
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }} 
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="relative bg-slate-900 border border-white/5 rounded-[2rem] shadow-none max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                    <div className="absolute top-0 right-0 p-4 z-10">
                      <button onClick={() => setIsSMenuOpen(false)} className="text-slate-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-none">
                        <span className={cn("logo-s", visualStyle === 'neon' && "neon-icon-glow")}>S</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight text-white leading-none">Settings <span className="text-cyan-400">Hub</span></h2>
                        <p className="text-slate-500 text-[10px] font-medium mt-1 uppercase tracking-widest">Personalize experience</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Theme Assortment */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Zap size={14} className="text-yellow-400" /> Interface Accent
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {activeAssortment.map(t => (
                            <button
                              key={t.name}
                              onClick={() => {
                                setThemeColor(t.name);
                                localStorage.setItem('steem_theme_color', t.name);
                              }}
                              className={cn(
                                "w-6 h-6 rounded-lg transition-all border flex items-center justify-center",
                                themeColor === t.name ? "border-[rgb(var(--accent-color))] scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                              )}
                            >
                              <div className="w-3 h-3 rounded-md" style={{ backgroundColor: t.hex }} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Configuration */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Edit3 size={14} className="text-cyan-400" /> Typography
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {fontOptions.map(f => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setEditorFont(f.id);
                                localStorage.setItem('steem_editor_font', f.id);
                              }}
                              className={cn(
                                "px-2 py-1 rounded-lg border text-center transition-all flex items-center gap-1.5",
                                editorFont === f.id ? "bg-[rgb(var(--accent-color)/0.1)] border-[rgb(var(--accent-color)/0.5)] text-[rgb(var(--accent-color))]" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/[0.08]"
                              )}
                              style={{ fontFamily: f.family }}
                            >
                              <span className="text-sm font-bold">Aa</span>
                              <span className="text-[9px] font-black uppercase tracking-widest">{f.label.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Beautification */}
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                            <Eye size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-200 block">Beautification</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Enhanced styling</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const next = !beautifyEnabled;
                            setBeautifyEnabled(next);
                            localStorage.setItem('steem_beautify', next.toString());
                          }}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all duration-500 relative",
                            beautifyEnabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-white shadow-xl transition-all duration-500",
                            beautifyEnabled ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <button 
                          onClick={() => {
                            setIsDarkMode(!isDarkMode);
                            localStorage.setItem('steem_dark_mode', (!isDarkMode).toString());
                            setVisualStyle('standard');
                            localStorage.setItem('steem_visual_style', 'standard');
                          }}
                          className={cn(
                            "py-4 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all",
                            visualStyle === 'standard' ? "bg-white/10 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                          )}
                        >
                          {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-indigo-400" />} 
                          {isDarkMode ? "Light" : "Dark"}
                        </button>
                        <button 
                          onClick={() => {
                            const next = visualStyle === 'neon' ? 'standard' : 'neon';
                            setVisualStyle(next);
                            localStorage.setItem('steem_visual_style', next);
                          }}
                          className={cn(
                            "py-4 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all",
                            visualStyle === 'neon' ? "bg-purple-600/20 text-purple-400 border border-purple-500/50" : "bg-white/5 text-slate-400 hover:bg-white/10"
                          )}
                        >
                          <Zap size={18} className={visualStyle === 'neon' ? "text-purple-400" : "text-slate-500"} /> Neon
                        </button>
                      </div>
                      <div className="pt-2 flex flex-col gap-2">
                        {!isPwaInstalled && !isTauriEnv() && !isNeutralinoEnv() && (
                          <button 
                            onClick={() => {
                              setIsSMenuOpen(false);
                              handleInstallPwa();
                            }}
                            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-3xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl shadow-cyan-600/20 text-center cursor-pointer"
                          >
                            <Download size={18} /> {t('installApp') || "Встановити додаток (PWA)"}
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setIsSMenuOpen(false);
                            setSettingsTab('general');
                            setActiveModal('settings');
                          }}
                          className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-3xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl shadow-cyan-600/20 text-center"
                        >
                          <Settings size={18} /> {t('advancedSettings')}
                        </button>
                        <a 
                          href="/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-3xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-600/20 text-center"
                        >
                          <Maximize2 size={18} /> {t('fullPreviewTesting')}
                        </a>
                        <button 
                          onClick={() => {
                            setIsSMenuOpen(false);
                            setActiveModal('about');
                          }}
                          className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-3xl text-sm font-black text-slate-300 flex items-center justify-center gap-3 transition-all"
                        >
                          <Info size={18} /> {t('about')}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* About Modal */}
          {activeModal === 'about' && (
            <div key="modal-about" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/90"
                onClick={() => setActiveModal(null)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-none p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <button 
                  onClick={() => setActiveModal(null)}
                  className="absolute top-6 right-6 text-slate-500 hover:text-white"
                >
                  <X size={24} />
                </button>

                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-cyan-500 rounded-2xl flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6 shadow-none">U</div>
                  <h2 className="text-3xl font-bold mb-2 tracking-tight">Ultra Steem <span className="text-cyan-400">Editor</span></h2>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-4">{t('aboutDesc')}</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                    <Shield size={14} /> Web Crypto AES-GCM Secured
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                  {/* Credits Section */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                       <CheckCircle size={18} /> {t('credits')}
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <div className="font-bold text-slate-200 mb-1 flex items-center gap-2">
                          <Zap size={18} className="text-yellow-400" /> {t('aiCredits')}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{t('aiTasks')}</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <div className="font-bold text-slate-200 mb-1 flex items-center gap-2">
                          <AtSign size={18} className="text-cyan-400" /> {t('humanCredits')}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{t('humanTasks')}</p>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-slate-500">{t('version')}</span>
                        <span className="bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-md font-mono font-bold">4.6.8</span>
                      </div>
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-slate-500">{t('license')}</span>
                        <span className="text-slate-300 font-bold">Apache 2.0</span>
                      </div>
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('appAgent')}</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={appAgent} 
                            onChange={(e) => {
                              setAppAgent(e.target.value);
                              localStorage.setItem('steem_app_agent', e.target.value);
                            }}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <p className="text-[9px] text-slate-600 italic">{t('appAgentDesc')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tech Stack Section */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <Terminal size={18} /> {t('packagesUsed')}
                      </h3>
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {[
                          { n: 'react', v: '19.0.0', d: 'Ядро інтерфейсу, реактивність та керування станом компонентів.' },
                          { n: '@blazeapps/dsteem', v: '0.12.2', d: 'Повноцінна клієнтська інтеграція з блокчейном Steem (транзакції, підписи, апвоути).' },
                          { n: 'motion', v: '13.1.0', d: 'Професійні та плавні анімації інтерфейсу для відмінного UX.' },
                          { n: 'marked', v: '18.0.7', d: 'Швидкісний і безпечний парсер Markdown розмітки в чистий HTML.' },
                          { n: 'dompurify', v: '3.4.13', d: 'Надійне очищення HTML від XSS-загроз при читанні стрічки дописів.' },
                          { n: 'lucide-react', v: '1.31.0', d: 'Набір сучасних та лаконічних векторних іконок для UI.' },
                          { n: 'buffer', v: '6.0.3', d: 'Поліфіл буфера для криптографічних підписів у браузерному оточенні.' },
                          { n: 'fflate', v: '0.8.3', d: 'Ультра-швидке та легковажне стиснення й розархівування чернеток у ZIP.' },
                          { n: 'exifreader', v: '4.38.1', d: 'Зчитування та аналіз метаданих EXIF з фотографій для параметрів зйомки.' },
                          { n: 'idb-keyval', v: '6.2.2', d: 'Надшвидке сховище автозбереження чернеток в IndexedDB браузера.' },
                          { n: 'idiomorph', v: '0.7.4', d: 'Інтелектуальне зіставлення (morphing) DOM для безшовної синхронізації без втрати фокусу й курсору.' },
                          { n: 'zustand', v: '5.0.14', d: 'Легковажне керування глобальним станом застосунку.' }
                        ].map(pkg => (
                          <div key={pkg.n} className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col gap-0.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-cyan-400 font-mono leading-none">{pkg.n}</span>
                              <span className="text-[8px] text-slate-500 font-mono font-bold">v.{pkg.v}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-normal">{pkg.d}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={() => window.open('https://github.com/ultrapositivecode/steem-editor-pro-react', '_blank')}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-700/50 group"
                      >
                         GitHub <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Changelog Section */}
                  <div className="col-span-1 md:col-span-2 space-y-4 pt-6 mt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                         <FileText size={18} /> Changelog & Updates
                       </h3>
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(getChangelogText());
                           const btn = document.getElementById('copy-log-btn');
                           if (btn) {
                             const orig = btn.innerText;
                             btn.innerText = "COPIED!";
                             setTimeout(() => btn.innerText = orig, 2000);
                           }
                         }}
                         id="copy-log-btn"
                         className="text-[9px] font-bold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest px-2 py-1 bg-slate-800/50 rounded flex gap-1 items-center"
                       >
                         <Copy size={10} /> COPY LOG
                       </button>
                    </div>
                    
                    <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-xl p-4">
                       {APP_CHANGELOG.map((log, index) => (
                         <div key={`${log.version}-${index}`} className={cn("space-y-2", index > 0 && "pt-3 border-t border-slate-800/50")}>
                           <div className="flex items-center gap-2">
                             <span className={cn("text-xs font-bold px-2 py-0.5 rounded", index === 0 ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 bg-slate-800")}>{log.version}</span>
                             <span className="text-[10px] text-slate-500">{log.date}</span>
                           </div>
                           <ul className={cn("text-sm list-inside list-disc space-y-2 pl-1", index === 0 ? "text-slate-300" : "text-slate-400 space-y-1")}>
                             {log.changes.map((change, i) => (
                               <li key={i}>{change}</li>
                             ))}
                           </ul>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        {activeModal === 'tagGroups' && (
          <div key="modal-tag-groups" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal('publish')}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Tags className="text-cyan-400" /> {t('tagGroups')}
                </h2>
                <button onClick={() => setActiveModal('publish')} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <button 
                  onClick={async () => {
                    const name = await promptDialog(t('addTagGroup'));
                    if (!name) return;
                    const tags = await promptDialog(t('tagsPlaceholder'));
                    if (!tags) return;
                    const newGroup: TagGroup = {
                      id: Date.now().toString(),
                      name,
                      tags: tags.split(/\s+/).filter(Boolean)
                    };
                    setTagGroups([...tagGroups, newGroup]);
                  }}
                  className="w-full py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors font-bold text-sm"
                >
                  {t('addTagGroup')}
                </button>
                <div className="space-y-2 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                  {tagGroups.map(group => (
                    <div key={group.id} className="p-3 bg-slate-800 rounded-lg group">
                      <div className="flex justify-between items-center mb-1">
                        <button 
                          onClick={() => {
                            const currentTags = pubTags.split(/\s+/).filter(Boolean);
                            const nextTags = [...currentTags];
                            group.tags.forEach(tag => {
                              if (!nextTags.includes(tag)) nextTags.push(tag);
                            });
                            setPubTags(nextTags.join(' '));
                          }}
                          className="font-bold text-sm hover:text-cyan-400 transition-colors"
                        >
                          {group.name} ({t('applyGroup')})
                        </button>
                        <button 
                          onClick={async () => {
                          if (await confirmDialog(t('delete') + '?')) {
                            setTagGroups(tagGroups.filter(g => g.id !== group.id));
                          }
                        }}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.tags.map(tag => (
                          <button 
                            key={tag}
                            onClick={() => {
                              const currentTags = pubTags.split(/\s+/).filter(Boolean);
                              if (currentTags.includes(tag)) {
                                setPubTags(currentTags.filter(t => t !== tag).join(' '));
                              } else {
                                setPubTags([...currentTags, tag].join(' '));
                              }
                            }}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded transition-colors",
                              pubTags.includes(tag) ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            )}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'queue' && (
          <div key="modal-queue" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ListIcon className="text-cyan-400" /> {t('queue')}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              <div className="p-6 space-y-4">
                {queue.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 italic">{t('queueEmpty')}</div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {queue.map((item) => (
                      <div key={item.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl group hover:border-cyan-500/30 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-slate-200 line-clamp-1">{item.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-400">@{item.authType === 'VAULT' ? item.selectedVaultUser : item.username}</span>
                              {item.scheduledTime && (
                                <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                                  <Calendar size={14} /> {new Date(item.scheduledTime).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                          onClick={async () => {
                            if (await confirmDialog(t('delete') + '?')) {
                              const updated = queue.filter(i => i.id !== item.id);
                              setQueue(updated);
                              localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
                            }
                          }}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                              item.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                              item.status === 'published' ? "bg-green-500/10 text-green-500" :
                              "bg-red-500/10 text-red-500"
                            )}>
                              {t(item.status)}
                            </span>
                          </div>
                          {item.status !== 'published' && (
                            <button 
                              onClick={() => publishFromQueue(item.id)}
                              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              <Rocket size={18} /> {t('publish')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === 'tableImport' && (
        <div key="modal-table" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90"
            onClick={() => setActiveModal(null)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden flex flex-col"
          >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TableIcon className="text-cyan-400" /> {t('importTableTitle')}
                </h2>
                <div className="flex items-center gap-2">
                  {tableImportText && (
                    <button 
                      onClick={() => setTableImportText('')}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 px-2 py-1"
                    >
                      <Trash2 size={16} /> {t('clear')}
                    </button>
                  )}
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
                </div>
              </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">{t('importTableDesc')}</p>
              <textarea 
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-cyan-500 custom-scrollbar resize-none"
                placeholder={t('importTablePlaceholder')}
                value={tableImportText}
                onChange={e => setTableImportText(e.target.value)}
                autoFocus
              />

              <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                <span className="text-xs font-bold text-slate-500 uppercase ml-2">{t('tableFormat')}</span>
                <div className="flex bg-slate-900 p-1 rounded-md gap-1">
                  <button 
                    onClick={() => setTableImportFormat('markdown')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded transition-all", 
                      tableImportFormat === 'markdown' ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Markdown
                  </button>
                  <button 
                    onClick={() => setTableImportFormat('html')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded transition-all", 
                      tableImportFormat === 'html' ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    HTML
                  </button>
                </div>
              </div>

              <button 
                onClick={processTableImport}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-900/20"
              >
                {t('importBtn')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      </AnimatePresence>

      <AnimatePresence>
        {activeModal === 'settings' && (
        <div key="modal-settings" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90"
            onClick={() => setActiveModal(null)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg bg-[var(--bg-sidebar)] border-[var(--border-color)] rounded-2xl shadow-none overflow-hidden container-theme"
          >
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-slate-800/10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
                <Settings className="text-cyan-400" /> {t('settings')}
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
            </div>
              <div className="flex border-b border-[var(--border-color)] bg-slate-800/10 overflow-x-auto no-scrollbar shrink-0">
                {(['general', 'gallery', 'vault', 'keys', 'about', 'pwa'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSettingsTab(tab)}
                    className={cn(
                      "px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                      settingsTab === tab 
                        ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
                    )}
                  >
                    {t(tab)}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {settingsTab === 'general' && (
                  <section className="space-y-6">
                    {/* Performance Mode */}
                    <div className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-700/50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg"><Zap size={18} /></div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{t('performanceMode')}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{t('performanceDesc') || 'Вимикає деякі анімації'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setPerformanceMode(!performanceMode)}
                        className={cn(
                          "w-10 h-5 rounded-full transition-all relative",
                          performanceMode ? "bg-cyan-600" : "bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                          performanceMode ? "left-6" : "left-1"
                        )} />
                      </button>
                    </div>

                    {/* Visual Style Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('appearance') || 'Style'}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setVisualStyle('standard');
                            localStorage.setItem('steem_visual_style', 'standard');
                          }}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2",
                            visualStyle === 'standard' ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg" : "bg-slate-900 border-slate-800 text-slate-50"
                          )}
                        >
                          <Sun size={14} /> {isDarkMode ? 'Dark' : 'Light'}
                        </button>
                        <button
                          onClick={() => {
                            setVisualStyle('neon');
                            localStorage.setItem('steem_visual_style', 'neon');
                          }}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2",
                            visualStyle === 'neon' ? "bg-purple-900/40 border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "bg-slate-900 border-slate-800 text-slate-50"
                          )}
                        >
                          <Zap size={14} /> Cyber Neon
                        </button>
                      </div>
                    </div>

                    {/* Neon Editor Text Color Toggle (Active only when Cyber Neon is enabled) */}
                    {visualStyle === 'neon' && (
                      <div className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-700/50 rounded-2xl transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg"><Type size={18} /></div>
                          <div>
                            <p className="text-sm font-bold text-slate-200">
                              {t('coloredEditorText')}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide leading-normal mt-0.5">
                              {t('coloredEditorTextDesc')}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setNeonTextColored(!neonTextColored)}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative shrink-0",
                            neonTextColored ? "bg-cyan-600" : "bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                            neonTextColored ? "left-6" : "left-1"
                          )} />
                        </button>
                      </div>
                    )}

                    {/* Font Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('font')}</label>
                      <div className="grid grid-cols-3 gap-2">
                         {[
                           { id: 'sans', label: t('fontSans'), class: 'font-sans' },
                           { id: 'serif', label: t('fontSerif'), class: 'font-serif' },
                           { id: 'mono', label: t('fontMono'), class: 'font-mono' }
                         ].map(f => (
                           <button 
                             key={f.id}
                             onClick={() => {
                               setEditorFont(f.id);
                               localStorage.setItem('steem_editor_font', f.id);
                             }}
                             className={cn(
                               "py-2 rounded-xl border text-xs transition-all",
                               editorFont === f.id ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg" : "bg-slate-900 border-slate-800 text-slate-500"
                             )}
                           >
                             <span className={f.class}>Aa</span>
                             <span className="ml-2">{f.label.split(' ')[0]}</span>
                           </button>
                         ))}
                      </div>
                    </div>

                    {/* Theme Colors */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('theme')}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'cyan', label: t('themeCyan'), color: '#06b6d4' },
                          { id: 'emerald', label: t('themeEmerald'), color: '#10b981' },
                          { id: 'orange', label: t('themeOrange'), color: '#f97316' },
                          { id: 'rose', label: t('themeRose'), color: '#f43f5e' }
                        ].map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => {
                              setThemeColor(theme.id);
                              localStorage.setItem('steem_theme_color', theme.id);
                            }}
                            className={cn(
                              "text-[9px] p-2 rounded-xl border transition-all text-center flex flex-col items-center gap-1.5",
                              themeColor === theme.id ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-900/10" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                            )}
                          >
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.color }} />
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Editor Options */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      {/* Widget Mode Selector */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('widgetPos') || 'Режим плаваючого віджета'}</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'bottom', label: lang === 'uk' ? '🔒 Внизу' : '🔒 Bottom' },
                            { id: 'floating', label: lang === 'uk' ? '🎈 Плаваючий' : '🎈 Floating' },
                            { id: 'hidden', label: lang === 'uk' ? '🚫 Вимкнено' : '🚫 Hidden' }
                          ].map(pos => (
                            <button
                              key={pos.id}
                              onClick={() => {
                                setWidgetPos(pos.id as any);
                                localStorage.setItem('steem_widget_pos', pos.id);
                              }}
                              className={cn(
                                "py-2 px-1 rounded-xl border text-[10px] font-bold uppercase transition-all text-center truncate",
                                widgetPos === pos.id 
                                  ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-900/10" 
                                  : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                              )}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          {t('syncScroll')}
                        </span>
                        <button 
                          onClick={() => {
                            const next = !syncScrollEnabled;
                            setSyncScrollEnabled(next);
                            localStorage.setItem('steem_sync_scroll', next.toString());
                          }}
                          className={cn(
                            "w-9 h-5 rounded-full transition-all relative",
                            syncScrollEnabled ? "bg-cyan-600" : "bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                            syncScrollEnabled ? "left-5" : "left-1"
                          )} />
                        </button>
                      </div>

                      {/* Custom Editor Font Size Control */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/40">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('fontSize')}
                          </label>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                            {editorFontSize} px
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
                          {[
                            { id: 14, label: lang === 'uk' ? "Дрібний" : "Small" },
                            { id: 16, label: lang === 'uk' ? "Стандарт" : "Normal" },
                            { id: 18, label: lang === 'uk' ? "Великий" : "Large" },
                            { id: 22, label: lang === 'uk' ? "Макс" : "Max" }
                          ].map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => {
                                setEditorFontSize(preset.id);
                                localStorage.setItem('steem_editor_font_size', String(preset.id));
                              }}
                              className={cn(
                                "py-1.5 px-1 rounded-lg text-[10px] font-semibold uppercase transition-all text-center truncate",
                                editorFontSize === preset.id 
                                  ? "bg-cyan-600 text-white shadow" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">12px</span>
                          <input
                            type="range"
                            min="12"
                            max="32"
                            value={editorFontSize}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setEditorFontSize(val);
                              localStorage.setItem('steem_editor_font_size', String(val));
                            }}
                            className="flex-1 accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">32px</span>
                        </div>
                      </div>

                      {/* Custom Toolbar Icon Size Control */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/40">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('iconSize')}
                          </label>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                            {toolbarIconSize} px
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
                          {[
                            { id: 14, label: lang === 'uk' ? "Дрібні" : "Small" },
                            { id: 20, label: lang === 'uk' ? "Стандарт" : "Normal" },
                            { id: 26, label: lang === 'uk' ? "Великі" : "Large" }
                          ].map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => {
                                setToolbarIconSize(preset.id);
                                localStorage.setItem('steem_toolbar_icon_size', String(preset.id));
                              }}
                              className={cn(
                                "py-1.5 px-2 rounded-lg text-[10px] font-semibold uppercase transition-all text-center",
                                toolbarIconSize === preset.id 
                                  ? "bg-cyan-600 text-white shadow" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">12px</span>
                          <input
                            type="range"
                            min="12"
                            max="32"
                            value={toolbarIconSize}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setToolbarIconSize(val);
                              localStorage.setItem('steem_toolbar_icon_size', String(val));
                            }}
                            className="flex-1 accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">32px</span>
                        </div>
                      </div>

                      {/* Custom Visual Editor Spacing Control */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/40">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('visualSpacing')}
                          </label>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                            {wysiwygSpacing} px
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
                          {[
                            { id: 6, label: lang === 'uk' ? "Компакт" : "Compact" },
                            { id: 14, label: lang === 'uk' ? "Збаланс" : "Balanced" },
                            { id: 20, label: lang === 'uk' ? "Стандарт" : "Normal" },
                            { id: 28, label: lang === 'uk' ? "Просторі" : "Spacious" }
                          ].map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => {
                                setWysiwygSpacing(preset.id);
                                localStorage.setItem('steem_wysiwyg_spacing', String(preset.id));
                              }}
                              className={cn(
                                "py-1.5 px-1 rounded-lg text-[10px] font-semibold uppercase transition-all text-center truncate",
                                wysiwygSpacing === preset.id 
                                  ? "bg-cyan-600 text-white shadow" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">0px</span>
                          <input
                            type="range"
                            min="0"
                            max="40"
                            value={wysiwygSpacing}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setWysiwygSpacing(val);
                              localStorage.setItem('steem_wysiwyg_spacing', String(val));
                            }}
                            className="flex-1 accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">40px</span>
                        </div>
                      </div>
                    </div>

                    {/* CACHE CLEAR (Visible in all platforms: Tauri, Android, PWA, Web) */}
                    <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Trash2 size={18} /></div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {t('clearAppCache')}
                          </h3>
                          <p className="text-[10px] text-slate-400 max-w-[200px] sm:max-w-[300px] leading-tight">
                            {lang === 'uk'
                              ? 'Очищує кеш зображень, завантажені списки та тимчасові файли. Чернетки, шаблони та ключі НЕ видаляються.'
                              : 'Clear images, loaded lists & temporary files. Drafts, templates, and keys will NOT be deleted.'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={handleClearCache}
                        className="px-4 py-2 bg-rose-600/80 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-900/20 shrink-0"
                      >
                        {t('clearAction')}
                      </button>
                    </div>
                  </section>
                )}

                {settingsTab === 'gallery' && (
                  <section className="space-y-6">
                    <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('gallerySettings') || "Gallery"}</label>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <span className="text-[10px] font-bold text-slate-400 block">{t('imageFormat')}</span>
                           <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg">
                              <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-1 text-[9px] rounded", imageInsertFormat === 'html' ? "bg-cyan-600 text-white" : "text-slate-500")}>HTML</button>
                              <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-1 text-[9px] rounded", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white" : "text-slate-500")}>MD</button>
                           </div>
                         </div>

                         <div className="space-y-2">
                           <span className="text-[10px] font-bold text-slate-400 block">{t('trafficOptimization')}</span>
                           <button 
                             onClick={() => setIsTrafficOptimized(!isTrafficOptimized)}
                             className={cn(
                               "w-full py-1 text-[9px] rounded font-bold border transition-all",
                               isTrafficOptimized ? "border-cyan-500 text-cyan-400 bg-cyan-400/5" : "border-slate-800 text-slate-600"
                             )}
                           >
                             {isTrafficOptimized ? "ON" : "OFF"}
                           </button>
                         </div>
                      </div>

                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('pexelsAttribution')}</span>
                           <button 
                            onClick={() => setPexelsSettings((prev: any) => ({ ...prev, withAttribution: !prev.withAttribution }))}
                            className={cn("w-8 h-4 rounded-full relative transition-all", pexelsSettings.withAttribution ? "bg-cyan-600" : "bg-slate-700")}
                           >
                              <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", pexelsSettings.withAttribution ? "left-4.5" : "left-0.5")} />
                           </button>
                         </div>
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('pexelsLink')}</span>
                           <button 
                            onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))}
                            className={cn("w-8 h-4 rounded-full relative transition-all", pexelsSettings.linkEmbedded ? "bg-cyan-600" : "bg-slate-700")}
                           >
                              <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", pexelsSettings.linkEmbedded ? "left-4.5" : "left-0.5")} />
                           </button>
                         </div>
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'vault' && (
                  <section className="space-y-6">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400">
                           <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{t('vaultSecurity')}</h4>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">
                            {isUnlocked ? t('sessionActive') : t('vaultClosed')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={async () => {
                            if (isUnlocked) SecurityService.lock();
                            else {
                               const pin = await promptDialog(t('enterPin'), '', undefined, 'password');
                               if (pin) {
                                 try {
                                   await SecurityService.unlock(pin);
                                   initVault();
                                 } catch {
                                   notify(t('error'), 'error');
                                 }
                               }
                            }
                          }}
                          className={cn(
                            "py-2 rounded-lg font-bold text-xs transition-all border",
                            isUnlocked ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-green-500/10 border-green-500/30 text-green-500"
                          )}
                        >
                           {isUnlocked ? t('lock') : t('unlock')}
                        </button>
                        <button 
                          onClick={async () => {
                            if (await confirmDialog(t('confirmResetVault'))) {
                               await SecurityService.clearAll();
                               initVault();
                               notify(t('saveSuccess'));
                            }
                          }}
                          className="py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg font-bold text-xs hover:bg-slate-700"
                        >
                           {t('confirmResetVault') || "Reset"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('accounts') || "Accounts"}</label>
                      <div className="space-y-2">
                        {vaultAccounts.map(acc => (
                          <div key={acc} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                            <span className="font-bold text-cyan-400">@{acc}</span>
                            <button 
                              onClick={async () => {
                                if (await confirmDialog(t('confirmDeleteAccount').replace('{acc}', acc))) {
                                   await SecurityService.deleteAccount(acc);
                                   initVault();
                                }
                              }}
                              className="p-1.5 text-slate-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'keys' && (
                  <section className="space-y-6">
                    <div className="space-y-4">
                       <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('pexelsKey')}</label>
                          <div className="relative">
                            <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                            <input 
                              type="password"
                              value={pexelsApiKey || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setPexelsApiKey(val);
                                if (!isUnlocked) {
                                   localStorage.setItem('steem_pexels_key_raw', val);
                                } else {
                                   await SecurityService.savePexelsKey(val);
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                              placeholder="Pexels API Key"
                            />
                          </div>
                          <p className="text-[9px] text-slate-600 leading-tight">
                            {isUnlocked ? "Stored securely in vault" : "Stored unencrypted in local storage"}
                          </p>
                       </div>

                       <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Pixabay</label>
                            <input 
                              type="password"
                              value={pixabayApiKey || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPixabayApiKey(val);
                                SecurityService.saveApiKey('pixabay', val);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Unsplash</label>
                            <input 
                              type="password"
                              value={unsplashAccessKey || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setUnsplashAccessKey(val);
                                SecurityService.saveApiKey('unsplashAccess', val);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                       </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'about' && (
                  <section className="space-y-6">
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
                       <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl mx-auto flex items-center justify-center text-cyan-400 font-black text-2xl shadow-xl shadow-cyan-500/10">S</div>
                       <div>
                         <h3 className="text-xl font-black tracking-tight">SteemEditor <span className="text-cyan-400">Pro</span></h3>
                         <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] pt-1">Version 4.6.8 "Quantum"</p>
                       </div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 pt-4 block border-t border-slate-800">Changelog & Updates</label>
                        <div className="mt-2 p-3 bg-slate-950 border border-cyan-500/20 rounded-xl text-left">
                          <p className="text-xs text-slate-300 font-medium">New in v4.6.8: Visual Editor Informative Placeholders, Dynamic Semver Web Release & allowScripts Policy Update</p>
                        </div>
                       
                       <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-xl p-3">
                         {APP_CHANGELOG.map((log, index) => (
                           <div key={`${log.version}-${index}`} className={cn("space-y-1", index > 0 && "pt-2 border-t border-slate-800/50")}>
                             <div className="flex items-center gap-2">
                               <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", index === 0 ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 bg-slate-800")}>{log.version}</span>
                               <span className="text-[9px] text-slate-500">{log.date}</span>
                             </div>
                             <ul className={cn("text-xs list-inside list-disc pl-1 leading-snug", index === 0 ? "text-slate-300 space-y-1.5" : "text-slate-400 space-y-1")}>
                               {log.changes.map((change, i) => (
                                 <li key={i}>{change}</li>
                                ))}
                             </ul>
                           </div>
                         ))}
                       </div>
                       
                       <div className="flex justify-end pt-1">
                         <button 
                           onClick={() => {
                             navigator.clipboard.writeText(getChangelogText());
                             const btn = document.getElementById('copy-changelog-btn');
                             if (btn) {
                               const orig = btn.innerText;
                               btn.innerText = "COPIED!";
                               setTimeout(() => btn.innerText = orig, 2000);
                             }
                           }}
                           id="copy-changelog-btn"
                           className="text-[9px] font-bold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest px-2 py-1 bg-slate-800/50 rounded flex gap-1 items-center"
                         >
                           <Copy size={10} /> COPY LOG
                         </button>
                       </div>
                    </div>

                    <div className="space-y-4 pt-2 text-left">
                       <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Пакетний Аудит (NPM Packages)</label>
                          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                             {[
                               { n: 'react', v: '19.0.0', d: 'Ядро інтерфейсу, реактивність та керування станом компонентів.' },
                               { n: '@blazeapps/dsteem', v: '0.12.2', d: 'Повноцінна клієнтська інтеграція з блокчейном Steem (транзакції, підписи, апвоути).' },
                               { n: 'motion', v: '13.1.0', d: 'Професійні та плавні анімації інтерфейсу для відмінного UX.' },
                               { n: 'marked', v: '18.0.7', d: 'Швидкісний і безпечний парсер Markdown розмітки в чистий HTML.' },
                               { n: 'dompurify', v: '3.4.13', d: 'Надійне очищення HTML від XSS-загроз при читанні стрічки дописів.' },
                               { n: 'lucide-react', v: '1.31.0', d: 'Набір сучасних та лаконічних векторних іконок для UI.' },
                               { n: 'buffer', v: '6.0.3', d: 'Поліфіл буфера для криптографічних підписів у браузерному оточенні.' },
                               { n: 'fflate', v: '0.8.3', d: 'Ультра-швидке та легковажне стиснення й розархівування чернеток у ZIP.' },
                               { n: 'exifreader', v: '4.38.1', d: 'Зчитування та аналіз метаданих EXIF з фотографій для параметрів зйомки.' },
                               { n: 'idb-keyval', v: '6.2.2', d: 'Надшвидке сховище автозбереження чернеток в IndexedDB браузера.' },
                               { n: 'idiomorph', v: '0.7.4', d: 'Інтелектуальне зіставлення (morphing) DOM для безшовної синхронізації без втрати фокусу й курсору.' },
                               { n: 'zustand', v: '5.0.14', d: 'Легковажне керування глобальним станом застосунку.' }
                             ].map(pkg => (
                               <div key={pkg.n} className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl flex flex-col gap-1 hover:border-slate-700/50 transition-all">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[11px] font-black text-cyan-400 font-mono leading-none">{pkg.n}</span>
                                     <span className="text-[9px] text-slate-500 font-mono font-bold">v.{pkg.v} (STABLE)</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-normal">{pkg.d}</p>
                               </div>
                             ))}
                          </div>
                       </div>

                       <p className="text-[9px] text-slate-600 italic px-2 text-center pt-2">Усі активи та залежності верифіковані в межах безпечного релізу Steem Editor Pro.</p>
                    </div>

                    <section className="space-y-4 border-t border-slate-800 pt-6">
                      <button 
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <ChevronDown className={cn("text-slate-500 transition-transform", showAdvancedSettings && "rotate-180")} size={20} />
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          <Terminal size={20} className="text-cyan-400" /> {t('advanced')}
                        </h3>
                      </button>

                      <AnimatePresence>
                        {showAdvancedSettings && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800 overflow-hidden"
                          >
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">{t('appAgent')}</label>
                              <input 
                                type="text" 
                                value={appAgent}
                                onChange={e => {
                                  setAppAgent(e.target.value);
                                  localStorage.setItem('steem_app_agent', e.target.value);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500"
                                placeholder="ultrasteemeditor/4.6.8"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>
                  </section>
                )}

                {settingsTab === 'pwa' && (
                  <section className="space-y-6">
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-cyan-500/20">S</div>
                      <div>
                        <h3 className="text-xl font-black tracking-tight">{t('pwaSupport')}</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] pt-1">{t('pwaPlatformSupport')}</p>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed text-left bg-slate-950 p-4 rounded-xl border border-slate-800/60">
                        {t('pwaInstallDesc')}
                      </p>

                      <div className="pt-2">
                        {isPwaInstalled ? (
                          <div className="py-3 px-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 font-bold text-xs flex items-center justify-center gap-2">
                            <CheckCircle size={16} />
                            {t('pwaAlreadyInstalled')}
                          </div>
                        ) : (
                          <div className="space-y-3">

                            <button
                              onClick={handleInstallPwa}
                              className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-95 cursor-pointer"
                            >
                              <Download size={16} />
                              {t('installApp')}
                            </button>
                            <button
                              onClick={() => setShowPwaInstructionsModal(true)}
                              className="w-full py-2 px-3 rounded-lg font-bold text-[11px] text-slate-400 hover:text-cyan-400 bg-slate-950 border border-slate-800/80 transition-colors cursor-pointer"
                            >
                              {t('pwaHowToInstall') || "Інструкція зі встановлення"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      <AnimatePresence>
        {pubLog.msg && !activeModal && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-8 lg:top-8 lg:bottom-auto lg:w-80 z-[100]"
            >
              <div className={cn(
                "p-4 rounded-2xl shadow-none border flex items-center gap-3 bg-slate-900",
                pubLog.type === 'success' ? "border-green-500/30 text-green-400" :
                pubLog.type === 'error' ? "border-red-500/30 text-red-400" :
                "border-cyan-500/30 text-cyan-400"
              )}>
                {pubLog.type === 'loading' && <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shrink-0" />}
                <p className="text-sm font-medium">{pubLog.msg}</p>
                <button onClick={() => setPubLog({ msg: '', type: null })} className="ml-auto text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Floating PWA Promotion Banner */}
      <AnimatePresence>
        {showPwaBanner && !isPwaInstalled && !isTauriEnv() && !isNeutralinoEnv() && !isEditorFullScreen && !isFullScreen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-[calc(5rem+var(--browser-bottom-inset,0px))] lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 z-[65] max-w-sm"
          >
            <div className="p-4 bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md shadow-cyan-500/20">
                  S
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white leading-tight">{t('pwaBannerTitle') || "Встановити Steem Editor"}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{t('pwaBannerDesc') || "Швидкий запуск з робочого столу та підтримка офлайн"}</p>
                </div>
                <button
                  onClick={() => {
                    setShowPwaBanner(false);
                    try { localStorage.setItem('steem_pwa_banner_dismissed', 'true'); } catch { /* ignore storage error */ }
                  }}
                  className="text-slate-500 hover:text-slate-300 p-1 -mr-1 -mt-1 transition-colors"
                  title={t('pwaBannerDismiss') || "Закрити"}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleInstallPwa}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  {t('pwaBannerInstall') || "Встановити"}
                </button>
                <button
                  onClick={() => {
                    setShowPwaBanner(false);
                    try { localStorage.setItem('steem_pwa_banner_dismissed', 'true'); } catch { /* ignore storage error */ }
                  }}
                  className="py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  {t('pwaBannerDismiss') || "Пізніше"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Step-by-Step Installation Instructions Modal */}
      <AnimatePresence>
        {showPwaInstructionsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPwaInstructionsModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 overflow-hidden space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400">
                    <Download size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{t('pwaHowToInstall') || "Як встановити додаток (PWA)"}</h3>
                    <p className="text-xs text-slate-400">{t('pwaPlatformSupport') || "Інструкції для всіх пристроїв"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPwaInstructionsModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-slate-300">
                {/* Direct Action Button if browser prompt is available */}
                {deferredPrompt && (
                  <button
                    onClick={() => {
                      setShowPwaInstructionsModal(false);
                      handleInstallPwa();
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Download size={18} />
                    {t('installApp') || "Встановити додаток зараз"}
                  </button>
                )}



                {/* iOS / Safari */}
                <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1.5">
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <span>📱 Apple iOS / Safari</span>
                  </div>
                  <p className="text-slate-400 pl-1">{t('pwaIosStep1') || "1. Натисніть кнопку 'Поділитися' (іконка зі стрілкою вгору) внизу або вгорі Safari."}</p>
                  <p className="text-slate-400 pl-1">{t('pwaIosStep2') || "2. Прокрутіть список вниз і виберіть 'На екран «Додому»'."}</p>
                </div>

                {/* Android / Chrome */}
                <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1.5">
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <span>🤖 Android / Chrome / Edge</span>
                  </div>
                  <p className="text-slate-400 pl-1">{t('pwaAndroidStep1') || "1. Натисніть меню браузера (іконка трьох крапок ⋮ у кутку)."}</p>
                  <p className="text-slate-400 pl-1">{t('pwaAndroidStep2') || "2. Виберіть пункт 'Встановити додаток' або 'Додати на головний екран'."}</p>
                </div>

                {/* Desktop */}
                <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1.5">
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <span>💻 Комп'ютер (Chrome / Edge / Brave)</span>
                  </div>
                  <p className="text-slate-400 pl-1">{t('pwaDesktopStep1') || "Натисніть значок встановлення ⊕ в правому кутку адресного рядка браузера."}</p>
                </div>
              </div>

              <button
                onClick={() => setShowPwaInstructionsModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                {t('close') || "Зрозуміло"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
        <nav 
          className={cn(
            "lg:hidden fixed left-0 right-0 bg-slate-900 border-t border-slate-800 grid grid-cols-5 items-center px-1 z-[70] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-200",
            (isEditorFullScreen || isFullScreen || isKeyboardOpen) ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
          )}
          style={{
            bottom: 'var(--browser-bottom-inset, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            height: 'calc(4rem + env(safe-area-inset-bottom, 0px))'
          }}
        >
          <button 
            onClick={() => setActiveMobileTab('editor')}
            className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", activeMobileTab === 'editor' ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
          >
            <Edit3 size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{t('text')}</span>
          </button>
          <button 
            onClick={() => setActiveMobileTab('preview')}
            className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", activeMobileTab === 'preview' ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
          >
            <Eye size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{t('preview')}</span>
          </button>
          
          <div className="relative flex justify-center items-center">
            <button 
              onClick={() => {
                if (!pubTitle) {
                  const firstLine = useEditorStore.getState().content.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 100);
                  setPubTitle(firstLine);
                }
                setActiveModal('publish');
              }}
              className="w-14 h-14 bg-cyan-600 text-white rounded-full shadow-lg shadow-cyan-900/40 active:scale-95 transition-all flex items-center justify-center border-4 border-slate-900 -mt-10 hover:bg-cyan-500"
            >
              <Rocket size={24} />
            </button>
          </div>

          <button 
            onClick={() => {
              setActiveMobileTab('editor');
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", isSidebarOpen ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
          >
            <ImageIcon size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{t('gallery')}</span>
          </button>
          <button 
            onClick={() => {
              setSettingsTab('general');
              setActiveModal('settings');
            }}
            className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", activeModal === 'settings' ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
          >
            <Settings size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{t('settings')}</span>
          </button>
        </nav>

        <style dangerouslySetInnerHTML={{ __html: `
        .toolbar-btn {
          width: var(--toolbar-btn-size, 3rem) !important;
          height: var(--toolbar-btn-size, 3rem) !important;
          font-size: var(--toolbar-btn-font-size, 1rem) !important;
        }
        .toolbar-btn svg {
          width: var(--toolbar-icon-size, 1.25rem) !important;
          height: var(--toolbar-icon-size, 1.25rem) !important;
        }
        
        .wysiwyg-editor p,
        .wysiwyg-editor ul,
        .wysiwyg-editor ol,
        .wysiwyg-editor h1,
        .wysiwyg-editor h2,
        .wysiwyg-editor h3,
        .wysiwyg-editor h4,
        .wysiwyg-editor h5,
        .wysiwyg-editor h6,
        .wysiwyg-editor,
        #main-editor textarea,
        .markdown-body {
          scroll-padding-bottom: 7rem !important;
        }
        .wysiwyg-editor blockquote,
        .wysiwyg-editor pre {
          margin-top: var(--wysiwyg-spacing, 18px) !important;
          margin-bottom: var(--wysiwyg-spacing, 18px) !important;
        }
        .wysiwyg-editor table,
        .wysiwyg-editor img {
          margin-top: var(--wysiwyg-spacing, 18px) !important;
          margin-bottom: var(--wysiwyg-spacing, 18px) !important;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        
        .prose img {
          border-radius: 0.75rem;
          margin: 1.5rem 0;
        }
        .wysiwyg-editor table {
          border-collapse: collapse;
          width: 100%;
          margin: 1.5rem 0;
          border: 1px dashed rgba(255, 255, 255, 0.15);
        }
        .wysiwyg-editor th, .wysiwyg-editor td {
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 10px 12px !important;
          min-width: 90px;
          height: 42px !important; /* height on table-cells serves as minimum height */
          position: relative;
        }
        .wysiwyg-editor th {
          background-color: rgba(255, 255, 255, 0.07);
          font-weight: 700;
          text-align: left;
          color: #22d3ee !important; /* cyan-400 */
        }
        /* Empty cells helper */
        .wysiwyg-editor th:empty::before, .wysiwyg-editor td:empty::before {
          useEditorStore.getState().content: "✎...";
          color: rgba(6, 182, 212, 0.45);
          font-size: 0.75rem;
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          font-style: italic;
        }
        .wysiwyg-editor th:focus, .wysiwyg-editor td:focus {
          outline: 2px solid #06b6d4 !important;
          outline-offset: -2px;
          background-color: rgba(6, 182, 212, 0.08) !important;
        }
        .pull-left {
          float: left;
          margin-right: 1.5rem;
          margin-bottom: 1rem;
          max-width: 45%;
        }
        .pull-right {
          float: right;
          margin-left: 1.5rem;
          margin-bottom: 1rem;
          max-width: 45%;
        }
        .text-center {
          text-align: center;
        }
        .text-justify {
          text-align: justify;
        }
        .clearfix::after {
          useEditorStore.getState().content: "";
          clear: both;
          display: table;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        multiple 
        onChange={handleFileUpload} 
      />
      {/* Account Prompt Overlay */}
      <AnimatePresence>
        {showAccountPrompt && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl shadow-none max-w-sm w-full p-6 sm:p-8 text-center max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-none">
                <AtSign size={32} className="text-white sm:size-[40px]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('welcomeTitle')}</h1>
              <p className="text-slate-400 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                {t('welcomeDesc')}
              </p>
              
              <div className="space-y-4 text-left">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">{t('usernameNoAt')}</label>
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                    placeholder="softpedia"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-bold placeholder:text-slate-700 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && setShowAccountPrompt(false)}
                  />
                </div>
                
                <button 
                  onClick={() => setShowAccountPrompt(false)}
                  className="w-full py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition-all active:scale-95 text-sm sm:text-base"
                >
                  {t('saveAndStart')}
                </button>
                <button 
                  onClick={() => setShowAccountPrompt(false)}
                  className="w-full text-[10px] sm:text-xs text-slate-500 hover:text-slate-300 font-medium py-2"
                >
                  {t('skipForNow')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications Popup */}
      <AnimatePresence>
        {showNotificationPopup && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50, x: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50, x: 50 }}
            className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-[200] max-w-sm w-auto sm:w-full bg-slate-900 border-2 border-lime-500 rounded-3xl shadow-[0_10px_50px_rgba(163,230,53,0.3)] p-5 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2">
              <button onClick={() => setShowNotificationPopup(null)} className="p-1.5 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-lime-500 text-black rounded-2xl shadow-[0_0_20px_rgba(163,230,53,0.6)]">
                <Bell size={22} className="animate-swing" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-lime-400 uppercase tracking-widest mb-1">Нова відповідь</p>
                <p className="text-sm font-bold text-white mb-1">@{showNotificationPopup.author}</p>
                <div 
                  className="text-xs text-slate-400 line-clamp-2 italic mb-4 bg-slate-950/50 p-2 rounded-xl border border-white/5"
                  dangerouslySetInnerHTML={{ __html: showNotificationPopup.body.substring(0, 100) }}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setActiveView('reader');
                      setShowNotificationPopup(null);
                      setNotifications(prev => prev.map(n => n.id === showNotificationPopup.id ? { ...n, isRead: true } : n));
                      setTargetReaderPost({ 
                        author: showNotificationPopup.parent_author || showNotificationPopup.author, 
                        permlink: showNotificationPopup.parent_permlink || showNotificationPopup.permlink,
                        commentAuthor: showNotificationPopup.author,
                        commentPermlink: showNotificationPopup.permlink
                      });
                    }}
                    className="flex-1 py-2.5 bg-lime-500 text-black text-xs font-black rounded-xl hover:bg-lime-400 transition-all active:scale-95 shadow-lg shadow-lime-900/20"
                  >
                    ПЕРЕГЛЯНУТИ
                  </button>
                  <button 
                    onClick={() => setShowNotificationPopup(null)}
                    className="px-4 py-2.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    ЗАКРИТИ
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Table Selector */}
      <AnimatePresence>
        {showTableSelector && tableSelectorPos && (
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowTableSelector(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: tableSelectorPos.direction === 'down' ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute bg-slate-900 border border-slate-700 shadow-2xl p-4 rounded-3xl"
              style={{
                left: tableSelectorPos.x,
                top: tableSelectorPos.direction === 'down' ? tableSelectorPos.y : undefined,
                bottom: tableSelectorPos.direction === 'up' ? tableSelectorPos.y : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insert Table</h3>
              </div>
              
              <div className="flex flex-col gap-2 mb-4 border-b border-slate-800 pb-3">
                <div className="flex justify-center gap-2 mb-2">
                  <button 
                    onClick={(e) => { e.preventDefault(); setTableImportFormat('markdown'); }}
                    className={cn("px-3 py-1 rounded text-xs font-bold transition-all", tableImportFormat === 'markdown' ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200")}
                  >Markdown</button>
                  <button 
                    onClick={(e) => { e.preventDefault(); setTableImportFormat('html'); }}
                    className={cn("px-3 py-1 rounded text-xs font-bold transition-all", tableImportFormat === 'html' ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200")}
                  >HTML</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      insertAtCursor(tableImportFormat === 'markdown' ? '| Head |\n| --- |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n  </tr>\n</table>\n');
                      setShowTableSelector(false);
                    }}
                    className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] rounded border border-purple-500/30 flex items-center justify-center transition-colors font-medium"
                  >
                     1 Col Separator
                  </button>
                  <button 
                    onClick={() => {
                      insertAtCursor(tableImportFormat === 'markdown' ? '| Head | Head |\n| --- | --- |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n    <th>Head</th>\n  </tr>\n</table>\n');
                      setShowTableSelector(false);
                    }}
                    className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] rounded border border-purple-500/30 flex items-center justify-center transition-colors font-medium"
                  >
                     2 Col Header
                  </button>
                  <button 
                    onClick={() => {
                      insertAtCursor(tableImportFormat === 'markdown' ? '| Head | Head |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n    <th>Head</th>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n</table>\n');
                      setShowTableSelector(false);
                    }}
                    className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] rounded border border-cyan-500/30 flex items-center justify-center transition-colors font-medium"
                  >
                     2x2 Table
                  </button>
                  <button 
                    onClick={() => {
                      insertAtCursor(tableImportFormat === 'markdown' ? '| Head | Head | Head |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n    <th>Head</th>\n    <th>Head</th>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n</table>\n');
                      setShowTableSelector(false);
                    }}
                    className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] rounded border border-cyan-500/30 flex items-center justify-center transition-colors font-medium"
                  >
                     3x3 Table
                  </button>
                </div>
              </div>

              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Or draw standard matrix</div>
              <div className="flex flex-col gap-1 items-center">
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {Array.from({ length: 10 }).map((_, colIndex) => {
                      const isHovered = rowIndex <= tableHover.r && colIndex <= tableHover.c;
                      return (
                        <div
                          key={colIndex}
                          onMouseEnter={() => setTableHover({ r: rowIndex, c: colIndex })}
                          onClick={() => {
                            const r = rowIndex; // 0 for header-only
                            const c = colIndex + 1;
                            let table = '| ' + Array.from({ length: c }).map(() => 'Head').join(' | ') + ' |\n';
                            table += '| ' + Array.from({ length: c }).map(() => '---').join(' | ') + ' |\n';
                            for (let i = 0; i < r; i++) {
                              table += '| ' + Array.from({ length: c }).map(() => 'Cell').join(' | ') + ' |\n';
                            }
                            insertAtCursor(table + '\n');
                            setShowTableSelector(false);
                          }}
                          className={cn(
                            "w-4 h-4 border border-slate-700 rounded-[2px] cursor-pointer transition-all",
                            isHovered 
                              ? (rowIndex === 0 ? "bg-purple-500/60 border-purple-400" : "bg-cyan-500/50 border-cyan-400") 
                              : (rowIndex === 0 ? "bg-slate-800/80 border-slate-600 border-b-2 shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10" : "bg-slate-800 hover:border-slate-500")
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              
              <div className="mt-3 text-center text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 py-1 rounded flex items-center justify-center gap-2">
                {tableHover.r === 0 ? (
                  <><span className="text-purple-400">{tableHover.c + 1} Cols</span> <span className="text-purple-400/70">(Header / Separator)</span></>
                ) : (
                  <><span className="text-cyan-400">{tableHover.c + 1} Cols</span> <span className="opacity-50">x</span> <span className="text-cyan-400">{tableHover.r + 1} Rows</span></>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
                <input 
                  type="number" min="0" max="50" 
                  title="Rows"
                  defaultValue="3"
                  id="customTableRowInput"
                  className="w-16 bg-slate-800 text-white text-[10px] p-1.5 rounded outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700" 
                />
                <span className="text-slate-500 self-center text-xs">x</span>
                <input 
                  type="number" min="1" max="50"
                  title="Cols" 
                  defaultValue="3"
                  id="customTableColInput"
                  className="w-16 bg-slate-800 text-white text-[10px] p-1.5 rounded outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700" 
                />
                <button 
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1"
                  onClick={() => {
                    const r = parseInt((document.getElementById('customTableRowInput') as HTMLInputElement)?.value || '3', 10);
                    const c = parseInt((document.getElementById('customTableColInput') as HTMLInputElement)?.value || '3', 10);
                    let table = '| ' + Array.from({ length: c }).map(() => 'Head').join(' | ') + ' |\n';
                    table += '| ' + Array.from({ length: c }).map(() => '---').join(' | ') + ' |\n';
                    for (let i = 0; i < r; i++) {
                      table += '| ' + Array.from({ length: c }).map(() => 'Cell').join(' | ') + ' |\n';
                    }
                    insertAtCursor(table + '\n');
                    setShowTableSelector(false);
                  }}
                >
                  <Plus size={10} /> Add
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SystemDialog */}
      <AnimatePresence>
        {systemDialog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-none w-full sm:max-w-md border border-slate-200 dark:border-slate-700 mx-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="p-4 sm:p-6 text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">{systemDialog.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{systemDialog.message}</p>
                
                {systemDialog.type === 'prompt' && (
                  <input
                    autoFocus
                    type={systemDialog.inputType || "text"}
                    defaultValue={systemDialog.defaultValue}
                    placeholder={systemDialog.placeholder}
                    className="w-full px-4 py-2 mb-6 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        systemDialog.resolve((e.target as HTMLInputElement).value);
                        setSystemDialog(null);
                      }
                      if (e.key === 'Escape') {
                        systemDialog.resolve(null);
                        setSystemDialog(null);
                      }
                    }}
                    id="system-dialog-input"
                  />
                )}
                
                <div className="flex justify-center sm:justify-end gap-3 font-bold">
                  {systemDialog.type !== 'alert' && (
                    <button 
                      onClick={() => {
                        systemDialog.resolve(null);
                        setSystemDialog(null);
                      }}
                      className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-xs"
                    >
                      {t('cancel') || 'Скасувати'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (systemDialog.type === 'prompt') {
                        const val = (document.getElementById('system-dialog-input') as HTMLInputElement)?.value;
                        systemDialog.resolve(val);
                      } else {
                        systemDialog.resolve(true);
                      }
                      setSystemDialog(null);
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30 text-xs sm:text-sm active:scale-95"
                  >
                    {systemDialog.type === 'alert' ? 'OK' : (t('confirm') || 'OK')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
