# Changelog
## [2026-08-14] - Version 4.5.8 (ultrasteemeditor/4.5.8)
### Added
- **Store Import Optimization**: Refactored and optimized state store imports across modules to eliminate inefficient dependencies and ensure clean module coupling.
- **Template Refinements**: Upgraded and streamlined built-in post templates for enhanced markdown structure and readability.
- **Immersive Fullscreen Actions**: Enhanced full-screen rendering, ensuring all dropdowns, modal dialogs, and widget action menus display correctly and remain fully accessible without clipping.
- **Neon Theme Text Highlighting**: Added custom neon text colorization support in visual mode, paired with a dedicated toolbar toggle to enable or disable it on demand.
- **Precise Caret & Spacer Management**: Refined visual editor cursor placement and block spacer generation (around tables, blockquotes, centers, and iframes) to prevent unexpected jumps and ensure smooth, natural typing.
- **Babel & Build Stability**: Configured Vite React plugin with compact optimizations for high-performance builds across large source files.
- **App Identifier Integration**: Updated app agent string and version branding to `ultrasteemeditor/4.5.8` across the app interface, device info panel, and Steem blockchain broadcasting metadata.

### Fixed & Improved
- **Vault PIN & Upload Retry Workflow**: Resolved an issue in native runtime environments (e.g., AppImage / Linux) where canceling or failing PIN authorization froze image uploading. File input references are now automatically cleared, allowing immediate retry.
- **Automatic Account Selection for Gallery Uploads**: When Keychain is absent, the gallery upload manager automatically defaults to the active Vault account without requiring manual dropdown switches.
- **Account Dropdown Styling**: Enhanced account selection dropdowns with clear authentication badges (`🔑 Vault` vs `🛡️ Keychain`) and consistent dark-theme styling.

## [2026-08-10] - Version 4.4.4
### Added
- **Babel Optimization**: Configured Vite React plugin with `babel: { compact: true }` to resolve code generator deoptimization warnings for large files.
- **Agent string**: Changed default App Agent string to `ultrasteemeditor/4.4.4` for proper version tracking on the Steem blockchain.
- **Zip Compression Engine**: Added `fflate` (v0.8.3) for high-performance, ultra-lightweight ZIP archive operations.
- **Modern Metadata Extraction**: Added `exifreader` (v4.38.1) for secure, client-side extraction of camera parameters from uploaded images.
- **Steem Library Upgrade**: Added `@blazeapps/dsteem` (v0.12.2), migrating from the deprecated `dsteem` package for active maintenance and better performance.

### Changed
- **TypeScript Upgrade**: Upgraded TypeScript to version ^7.0.2.
- **React Upgrade**: Updated React and React-DOM to version 19.0.0.

### Removed
- **Unused Zip Library**: Removed `jszip` in favor of `fflate`.
- **Legacy CSS Tools**: Uninstalled `postcss` and `autoprefixer` (no longer strictly needed for Tailwind v4 integration via Vite).
- **Unused Polyfills**: Removed `core-js` dependency to prevent Babel from unintentionally injecting or importing unnecessary polyfills.
- **Unused Dev & Utility Packages**: Uninstalled `babel-plugin-transform-remove-console` and `eslint-plugin-react`.
- **Deprecated Helper Libraries**: Uninstalled legacy/unused helper libraries like `bytebuffer`, old `exif` / `exif-parser` packages, and the deprecated `dsteem` library, reducing overhead in favor of lightweight and modern solutions like `exifreader`.

### Fixed
- **Linter Warnings**: Addressed and removed strict linter override comments (`@typescript-eslint/no-use-before-define`, `react-hooks/set-state-in-effect`) in `Reader.tsx`.

## [2026-08-02] - Version 4.3.9
### Added
- **Customizable Font Size**: Added a new precise font size control in the toolbar settings dropdown.
- **Responsive Typography**: Connected the selected font size directly to the editor's visual output for instantaneous scaling without page reloads.
- **UI Refinement**: Grouped font size presets alongside a numeric input and range slider for maximal control.

## [2026-07-23] - Version 4.3.8
### Added
- **Multi-Threaded Parsing Engine**: Integrated `useEditorWorker` to offload Markdown-to-HTML and HTML-to-Markdown conversions to a dedicated Web Worker. This eliminates UI freezes during large document processing (up to 200k+ lines).
- **Ultra Steem Editor Branding**: Rebranded the application with a new identity, focused on high-performance professional editing.
### Changed
- **Interface Polish**: Optimized `ul`/`li` rendering in the WYSIWYG editor by removing unwanted vertical margins and fixing indentation inconsistencies.
- **Extreme Performance Mode**: Enhanced Performance Mode to completely bypass Framer Motion animations and heavy CSS transitions for a 0ms latency feel.
- **Repository Optimization**: Organized the project root by moving over 50 legacy diagnostic and fix scripts into a structured `/tets_and_fix` directory.
### Fixed
- **Large File Stability**: Improved handling of extremely large documents in the browser cache and local synchronization layers.

## [2026-07-18] - Version 3.9.9 "Quantum"
### Added
- **Gallery Minimization**: Added support for collapsing the gallery view to save space.
- **Dynamic Editor Expansion**: Expanded the text input area on the main screen for a more comfortable editing experience.
### Removed
- **Developer Branding**: Removed specific community/author branding from the application info panel.

## [2026-07-16] - Version 3.8.0
### Added
- **Progressive Web App (PWA) Support**: Added support for installing Steem Editor Pro directly on devices for faster startup times and fully offline-capable operations.
- **Service Worker Caching**: Implemented sw.js to automatically manage local caching of HTML, CSS, fonts, and icons.
- **Unified Install Experience**: Added a conditional PWA Install button in the header and a dedicated PWA Install tab in the settings modal.

## [2026-07-15] - Render Paint Optimizations & Solid Interface Architecture
### Added
- **Zero-Transparency Floating UI**: Eliminated transparency and alpha blending from the primary floating tools widget and its sub-dropdown settings, improving readability and significantly easing browser composting workloads.
- **No-Blur Performance Layout**: Removed backdrop blurs, transition delays, and nested box-shadow effects from main overlays, side menus, and table controls to minimize GPU paint times.
- **Optimized Solid Containers**: Reconfigured the preview panel background and toolbars as completely solid opaque surfaces to optimize sub-pixel layout rendering and eliminate flickering pixels on rapid text input.

## [2026-07-15] - State Integrity & Multi-Mode Auto-Save Reliability
### Added
- **Persistent Editor Mode**: Persisted the active editor mode (`editorMode`) in `localStorage` so users who prefer typing in Markdown Code mode stay in that mode upon reloading or returning to the page.
- **Visual Stale-Flag Protocol**: Introduced an intelligent stale-flag (`steem_visual_html_is_stale`) mechanism that invalidates cached raw HTML whenever the user modifies raw Markdown content in Code mode. This ensures that switching back to Visual mode or refreshing the page correctly translates and loads the fresh edits, completely preventing data loss.
- **Zustand-Cascading Synchronization**: Optimized the reactive state pipeline, ensuring that any asynchronous content changes gracefully cascade through the debounced save engine regardless of the active view pane.

## [2026-07-14] - Performance Optimization & Interface Streamlining
### Added
- **Visual-to-Code Sync Controller**: Replaced the complex Settings gear dropdown menu with a single, highly intuitive **Real-Time Sync Toggle (RefreshCw icon)** on the WYSIWYG toolbar.
- **Two-Tier Synchronization**: 
  - **Real-Time Sync (Active)**: Offers continuous, immediate synchronization of visual changes directly to markdown code.
  - **Background Sync (Inactive/Default)**: Utilizes an optimized, lag-free background debounced sync engine (triggering on save, export, mode switching, or idle timeouts) to guarantee maximum writing performance and smoothness on all devices.
- **Visual State Indicators**: Integrated high-contrast indicators on the toolbar to clearly represent the active mode (**REAL-TIME SYNC** vs **BACKGROUND SYNC**).

### Changed
- **O(1) Spacer Optimization**: Replaced expensive DOM queries (`querySelectorAll`) with high-performance O(1) checks. The editor now uses direct relative traversal (e.g., checking elements under the cursor via `.closest()` and verifying `lastElementChild`) to process formatting updates on the fly without traversing the whole DOM.
- **CSS Containment Geometry**: Added `contain: layout style` properties to all direct block-level children (`p`, `ul`, `ol`, headings `h1-h6`, `blockquote`, `pre`, `table`, `hr`, `img`, `.table-spacer`, `div`, `center`) of the WYSIWYG editor. This isolates each element's geometry, preventing the browser from recalculating the reflow and layout of the entire document while typing within a single block.

## [2026-07-12] - Advanced Scrolling & Editor Comfort
### Fixed
- **Code Editor Scroll Jumping**: Eliminated a bug where the native textarea would automatically scroll to the middle of the screen when typing or navigating via keyboard arrows (especially in Brave and Chrome).
- **Precision Cursor Synchronization**: Completely rewrote the scrolling logic when switching from Code to Visual editor. Instead of centering the parent paragraph (which caused long text blocks to appear scrolled away from the cursor), the editor now mathematically calculates the exact Y-pixel coordinate of the caret and sets the scroll position directly, keeping the exact line perfectly centered.
- **Refined Widget Clearance**: Decreased the bottom margin between the editor and the docked widget to 85px, eliminating the excessive blank strip while keeping a clean 13px gap above the UI.
- **Accurate Visual-to-Markdown Cursor Restoration**: Rebuilt the cursor sync algorithm to calculate exact text wrapping dimensions. The editor now reliably restores the exact vertical scroll coordinate when switching from Visual to Markdown mode, fixing the "under-scrolling" bug.

## [2026-07-10] - GPU & Performance Optimization

### Changed
- **GPU Resource Optimization**: Refactored heavy CSS effects, including conditional `backdrop-blur` and transparency, to dynamically disable/simplify on performance-limited modes. This significantly reduces GPU load and enhances responsiveness on lower-end devices.

## [2026-07-05] - Formatting Quality & WYSIWYG Spacer Comfort

### Added
- **Active Formatting in Widget**: Connected the active format states (Bold, Italic, Strikethrough, Subscript, Superscript, Inline Code, and Color block) to the buttons on the floating widget panel, providing instant visual feedback on active text formatting.
- **Localized WYSIWYG Spacers**: Implemented automatic generation of top and bottom visual placeholders/spacers around complex elements (tables, blocks, blockquotes, lists, etc.) with language-aware guide messages (e.g., Ukrainian: `↵ Початок допису...`, `↵ Кінець допису...`).

### Changed
- **Unified Block/Tag Breakout**: Refined the block container escape mechanism. Pressing Enter at the margins of `BLOCKQUOTE`, headings `H1-H6`, code blocks, or custom aligned elements seamlessly escapes or splits them into standard text paragraphs.
- **Smart Space Trimming on Formatting Exit**: Added a feature that detects trailing/leading spaces inside formatting tags (like `**bold**`, `*italic*`, etc.) when stepping out of them. The system automatically cleans up inner margins and shifts spaces outside the tags to prevent rendering glitches.

### Fixed
- **Code Editor Scroll Jumping**: Fixed an issue where inserting Markdown tables or other custom code-editor presets would scroll the editor container back to the top. The editor now perfectly preserves horizontal and vertical scroll offsets.
- **Enhanced WYSIWYG Spacer Styling**: Improved the visibility, padding, and focus outlines of table spacers in both dark and light modes.


## [2026-06-18] - Hybrid WYSIWYG Engine & Steem Reader Integration

### Added
- **Hybrid WYSIWYG Editor**: Built a custom, lightweight visual rich-text editor from scratch using a hybrid contenteditable model. Instead of bloated third-party modules, it compiles, synchronizes, and cleans HTML/Markdown instantly in two-way real-time.
- **Steem Reader Module**: Integrated an in-app reader interface to directly browse and read Steem posts/feeds. Features built-in DOM sanitization, clean typographic rendering, and smooth device-optimized layouts.
- **Visual Table & Layout Controls**: Added dedicated visual controls inside WYSIWYG to easily insert and manipulate tables, alignments, and custom layout dividers.

### Changed
- **Optimized Synchronizer**: Rewrote the HTML-to-Markdown parser for seamless transition between raw Markdown and rich-text editing, guaranteeing no loss of formatting metadata or special CSS styles.


## [2026-05-29] - Visual Polish & UI Responsiveness

### Added
- **UI Feedback**: Added active state indicators to tool controls for immediate user feedback.

### Fixed
- **Portrait Mode Layout**: Restructured tool panels to prevent UI element overlapping on smaller screens/portrait mode.
- **Button Feedback**: Fixed missing click feedback on secondary tool panel buttons.

## [2026-05-24] - Universal Markdown Export & Formatting

### Added
- **Universal Markdown Export**: Drafts are now exported as a ZIP archive of individual `.md` files. This ensures your data is readable by any text editor.
- **Smart Table Padding**: Added an engine that automatically manages whitespace around Markdown tables. No more broken tables in Steemit or other readers!
- **Enhanced Single Post Export**: Exporting the current work field now intelligently includes the title as an H1 heading and tags as structured metadata.
- **ZIP Restore Support**: Restoring backups now supports both legacy JSON and new Markdown ZIP formats.

### Changed
- **Pure Markdown Workflow**: Removed complex JSON-only backups to prioritize portability and readability.

## [2026-05-22] - Curation Logging & Stability

### Added
- **Vote Logging System**: New feature in Curation mode to record all upvotes (posts and comments) with permlinks, author nicknames, and weights.
- **Log Management**: Added "Clear" and "Export MD" buttons to the curation settings.
- **Export to Markdown**: Ability to download a professional `.md` report of curation activities.
- **Persistent Storage**: Data is stored in `LocalStorage`, surviving page reloads and tag changes.

### Fixed
- **Controlled Components Warnings**: Fixed multiple React "changing uncontrolled input to controlled" warnings by ensuring values are never `undefined` (using `|| ""`).
- **Optimistic UI for Curation**: Fixed a bug where voting in curation mode didn't update the local UI state of listed items.
- **Vote Logging Accuracy**: Improved identification of "Post" vs "Comment" in logs.
- **Batch Voting for Comments**: Ensured comments are properly processed and reflected in UI after voting.
