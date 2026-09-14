export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const APP_CHANGELOG: ChangelogEntry[] = [
  {
    version: "v4.8.5",
    date: "2026-09-14",
    changes: [
      "Technical Syntax Protection & Caret Safety: Prevented accidental markdown formatting injection and marker pollution inside HTML tags, markdown table separator rows, code fences, and link URLs.",
      "Bidirectional Table & Block Cursor Synchronization: Enhanced cursor marker preservation across DOM and Markdown transformations to ensure caret positioning remains accurate without losing syntax or dropping characters.",
      "Masked Format Parser: Upgraded markdown delimiter matching with syntax masking to isolate raw formatting marks from URLs and HTML tag attributes."
    ]
  },
  {
    version: "v4.8.4",
    date: "2026-09-14",
    changes: [
      "Crystal Bell (FM Synthesis) Acoustic Refinement: Integrated master studio dynamics compressor and limiter to prevent high-frequency intermodulation distortion; implemented acoustic register differentiation across octaves (C4–E4 singing bowl resonance, G4–C5 singing bell, D5–C6 crystal chime with airy 2.76x harmonic sparkle) and dynamic FM modulation envelope.",
      "Organic Water Drops (Liquid Cavitation Model): Replaced mechanical tone sweep with physical dual-formant cavity resonance (1.48x secondary harmonic), non-linear pitch rise with soft bubble detachment tail, and warm 2800 Hz low-pass filtering for soft, organic droplet acoustics.",
      "Authentic Geiger Counter Radiation Clicks: Replaced tonal oscillation with ultra-short (2.5–3.5 ms) electrostatic ionization discharge micro-spikes and bandpass filtering (4800–6500 Hz) for genuine dry Geiger-Müller counter clicks.",
      "Master Audio Pipeline Anti-Clipping: Added studio-grade DynamicsCompressorNode to master bus for pristine polyphonic voice summation during rapid typing.",
      "Cross-Platform Release Synchronization: Synchronized version across package.json, Tauri, Cargo.toml, Service Worker cache, metadata, and application settings."
    ]
  },
  {
    version: "v4.8.3",
    date: "2026-09-13",
    changes: [
      "Автентичний FM-синтез Crystal Bell (FM Дзвіночки): усунено пропуск клавіш при швидкому наборі (скасовано ліміт блокування поліфонії), впроваджено постійний індекс модуляції 0.5x та м'яку криву гучності для усунення різких піків; точне гармонійне чергування пентатоніки (C4–C6) без дисонансів.",
      "Реалістичний Geiger Counter (Дозиметр): переведено на високочастотну гостру трикутну хвилю з випадковою девіацією (1800–2500 Гц) та мікроімпульсною обвідною для автентичного сухого тріску дозиметра без змазування шумовими буферами.",
      "Water Drops (Краплі води / Bubbles): точна фізична модель кавітації з експоненційним зльотом частоти у 1.8 раза за 50 мс та швидким природним згасанням краплі.",
      "Звукова семантика дій клавіш: спадний акустичний жест для Backspace (ковзання 280 -> 90 Гц) та ревербераційний дзвоник (1450 Гц) для Enter.",
      "Оптимізація інтерфейсу: віджет звуку прибрано з верхнього хедера і збережено виключно на робочій панелі перемикання режимів редактора."
    ]
  },
  {
    version: "v4.8.2",
    date: "2026-09-13",
    changes: [
      "Audio Typing Synth (Акустичний супровід набору тексту): процедурний Web Audio API синтезатор клавіш без використання сторонніх файлів та мережевого трафіку. Підтримує фізичні клавіатури, віртуальні сенсорні клавіатури смартфонів (touch/IME beforeinput) та тач-кнопки.",
      "Zero-GC архітектура та енергозбереження: пулінг аудіо-нод без навантаження на Garbage Collector, кешовані буфери шуму, авто-призупинення аудіоканалу (suspend) через 4 сек бездіяльності для збереження заряду батареї. Усталено вимкнено для повної тиші на старті.",
      "6 автентичних процедурних пресетів: Cherry MX Blue, Vintage Typewriter, Deep Thock, Cyber Neon, Water Bubble, Soft Chiclet із підтримкою детермінованого 32-бітного хешування pitch-shift для кожної літери, кирилиці, латиниці, пробілу, Enter та Backspace.",
      "Менеджер пресетів та система обраних (Favorites ⭐): фільтрація за обраними пресетами, живий тест (preview), повзунок гучності, імпорт власних JSON-пресетів та завантаження еталонного шаблону для кастомізації.",
      "Швидкий віджет керування: доступний в один клік у хедері та безпосередньо на панелі режимів редактора з миттєвим увімкненням/вимкненням та спливаючим меню швидких налаштувань."
    ]
  },
  {
    version: "v4.8.1",
    date: "2026-09-13",
    changes: [
      "Адаптивний хедер та захист від накладання іконок: на компактних екранах випадаючий список інструментів форматування (\"T\") перенесено до лівої групи поруч із перемикачем режимів редактора. Виключено накладання на дзвіночок сповіщень та праве меню дій.",
      "Віконний режим для модальних діалогів: повністю вимкнено глуху заливку та розмиття фону. Робочий простір і редактор тепер залишаються повністю видимими під діалоговими вікнами.",
      "Захист цілісності тегів (Tag Integrity): клавіша Backspace більше не видаляє теги (списки, цитати, червоний/синій/зелений текст, вирівнювання), поки всередині залишається хоч один символ.",
      "Безпечне видалення порожніх рядків: виправлено випадкове видалення тексту при натисканні Backspace/Delete на межах між параграфами та списками.",
      "Точна синхронізація порожніх рядків між Markdown і WYSIWYG без схлопування потрійних переносів (\\n\\n\\n) та без втрати відступів автора."
    ]
  },
  {
    version: "v4.8.0",
    date: "2026-09-03",
    changes: [
      "Оптимізація нижнього відступу редактора на ПК та оновлення залежностей (glob, yaeti/event-target-shim)."
    ]
  },
  {
    version: "v4.7.9",
    date: "2026-09-03",
    changes: [
      "Автоматичне прокручування тексту та каретки над віджетом (toolbar) у ПК та нативному режимі Tauri (WebKitGTK/Linux).",
      "Точний розрахунок положення курсора getExactCaretYInTextarea та динамічний bottom clearance у CodeEditor та WYSIWYG.",
      "Вихід з кольорових блоків тексту (phishy/blue/green) та inline-тегів у WYSIWYG та Code редакторах при натисканні Enter.",
      "PWA Service Worker: Оновлено кеш до версії v4.7.9 для гарантованого оновлення статики у браузерах.",
      "Cross-Platform Release Sync: Синхронізація версії застосунку v4.7.9 на всіх рівнях (Tauri, Neutralino, Web)."
    ]
  },
  {
    version: "v4.7.7",
    date: "2026-08-28",
    changes: [
      "Виправлення позиціонування віджету та скролінгу під час вставки таблиць."
    ]
  },
  {
    version: "v4.7.5",
    date: "2026-08-28",
    changes: [
      "PWA Cache-First & Instant UI Shell Launch, Offline Asset Strategy & Cross-Platform Version Sync"
    ]
  },
  {
    version: "v4.7.4",
    date: "2026-08-28",
    changes: [
      "WYSIWYG State Persistence Hardening: Resolved visual editor state desynchronization upon page refresh and abrupt browser closure using Zustand v5 subscribeWithSelector middleware.",
      "Synchronous Flush & Unload Lifecycle: Added pagehide and document visibilitychange listeners alongside beforeunload to guarantee immediate visual DOM-to-markdown storage flushes.",
      "Optimized Debounce & Blur Synchronization: Replaced legacy multi-second delay with a responsive 300ms debounce and immediate onBlur markdown sync.",
      "Cross-Platform Release Sync: Synchronized application version to v4.7.4 across Web, Tauri, Neutralino, and Steem blockchain broadcasting metadata."
    ]
  },
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

export const getChangelogText = () =>
  "SteemEditor Pro Updates:\n\n" +
  APP_CHANGELOG.map(
    log => `${log.version} (${log.date})\n` + log.changes.map(c => `- ${c}`).join('\n')
  ).join('\n\n');
