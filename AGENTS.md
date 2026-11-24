# Agent Instructions & Project Rules

## Temporary Scripts & Diagnostic Files
- **Directory**: `./fix_test_patcn/`
- **Rule**: All temporary scripts, test files, fix scripts, patches, search tools, or diagnostic utilities (e.g., `test-*.ts`, `fix-*.cjs`, `patch_*.ts`, `find_*.ts`, etc.) **MUST** be created inside the `./fix_test_patcn/` directory.
- **Root Cleanliness**: Do not create temporary test, fix, or patch files directly in the root directory (`/`). Keep the project root clean and dedicated exclusively to primary application files, configuration, and source code.
- **Persistence**: Do **NOT** delete any files, scripts, or directories inside `./fix_test_patcn/` unless the user explicitly instructs you to do so. These files must be preserved for historical, diagnostic, and audit reference.

## Global Design Tokens, Modal Architecture & Viewport Standards
- **Global Design Tokens**: All modal windows, drawers, popups, and floating overlays MUST rely strictly on global CSS design tokens defined in `:root` / `src/index.css` (e.g., `--modal-bg`, `--modal-border`, `--modal-radius`, `--modal-shadow`, `--safe-top`, `--safe-bottom`, `--app-bottom-total`, `--active-footer-height`, `--header-height`). Never hardcode ad-hoc pixel offsets, absolute heights, or conflicting backdrop shades.
- **Header & Viewport Stability**: Modals and floating strips (e.g., Mini-Gallery, TamedWidget) MUST NOT cause the `#main-header` or main viewport to scroll or shift vertically.
  - All modal dialogs must use `BaseModal` and guarantee `window.scrollTo(0, 0)` on open and input focus.
  - Floating and modal backdrops must enforce `overscroll-behavior: contain` / `touch-action: none` on non-scrollable containers to prevent rubber-band drag on touch devices.
  - Dropdown menus and popup panels in the Header must be bounded by `max-w-[calc(100vw-1rem)]` with `flex-wrap` where applicable to prevent horizontal document overflow on narrow mobile viewports.

## Global Localization & Translation Standards (i18n)
- **Single Source of Truth (`src/locales/`)**: All UI strings, button labels, titles, tooltips, placeholders, aria-labels, notifications, dialog prompts, and descriptions across all menus, modals, widgets, hooks, and sub-packages MUST be stored in the global localization dictionaries (`src/locales/uk.ts`, `src/locales/en.ts`, `src/locales/es.ts`, `src/locales/ko.ts`) and accessed via `t('key')` or `getTranslation(lang, 'key')`.
- **No Hardcoded Strings or Inline Fallbacks**: Never hardcode Ukrainian or English UI strings directly in `.tsx` / `.ts` components, hooks, or services. Never use inline binary language checks (`lang === 'uk' ? '...' : '...'`) or inline fallback strings (`t('key') || '...'`) that bypass non-Ukrainian/non-English locales (`es`, `ko`, etc.).
- **Multi-Locale Synchronization**: Whenever a new UI element, menu, modal, audio preset, or feature is created or updated, every new translation key MUST be added simultaneously to all active locale dictionaries (`uk`, `en`, `es`, `ko`) so `TranslationKey` types remain strictly synchronized.

## Modular Architecture & File Structure Standards
- **Feature-Sliced Directory Organization**: Organize code strictly by domain inside `src/components/<domain>/`, `src/hooks/<domain>/`, `src/services/<domain>/`, `src/store/`, and `src/utils/`. Never dump new components, hooks, or business logic directly into root `src/` or inflate existing top-level UI containers.
- **Module Size Guideline (350–400 LOC Soft Threshold)**: Target **<= 350–400 lines** per component, hook, or service module. Crossing 400 lines acts as a review trigger to split mixed responsibilities into sub-components, helpers, or domain sub-hooks. **Allowed Exceptions**: larger modules (typically 450–800+ lines) remain acceptable without artificial splitting when they represent: (1) flat declarative dictionaries/data (`src/locales/*.ts`, `changelog.ts`, preset/theme tables), (2) tightly coupled single-invariant state machines, parsers, or synchronization engines (e.g., `useWysiwygSync`, `SoundSynthEngine` core) where splitting causes prop-drilling or cyclic imports, or (3) cohesive protocol/transaction adapters.
- **State & Layer Boundaries**:
  - Shared cross-view state belongs in dedicated domain Zustand stores (`src/store/<domain>Store.ts`).
  - Blockchain RPC calls, Web Crypto encryption, and IndexedDB persistence belong strictly inside `src/services/` or `src/lib/`—never embedded inside JSX components.
  - UI components must remain declarative, delegating orchestration to typed hooks or service facades.
- **Clean Source Tree**: Keep `src/` free of backup files (`.bak`, `.backup_*`, `.step*.bak`) or raw `.txt` code chunks. Temporary artifacts and planning docs belong exclusively inside `./fix_test_patcn/`.

## Semantic Styling & Theme Isolation Standards
- **Zero Hardcoded Palette Classes**: Never use raw Tailwind palette classes (`bg-slate-*`, `text-slate-*`, `border-slate-*`, `bg-white`, or generic `text-white` outside explicit primary accent buttons) or ad-hoc inline `style={{ color/background }}` values inside components.
- **CSS Custom Properties First**: All surfaces, text, borders, inputs, and overlays MUST consume semantic CSS variables (`--bg-main`, `--bg-sidebar`, `--bg-card`, `--bg-input`, `--text-main`, `--text-muted`, `--border-color`, `--accent`, `--modal-bg`, `--modal-border`) defined in `src/index.css`.
- **No `!important` Theme Overrides**: New themes and visual presets must operate solely by swapping root CSS variable sets cleanly without adding `!important` CSS specificity overrides.
- **Dark / AMOLED Surface Discipline**: High-contrast dark and AMOLED themes must preserve strictly dark elevated cards and controls—never render jarring solid-white fill blocks inside dark/AMOLED views.

## Cryptographic Vault Separation
- **Strict Domain Separation**: Daily Posting/Image signing credentials (`SecurityService`) and private Active/Owner financial keys MUST reside in physically separate IndexedDB containers with zero shared key derivation material.
- **Per-Account Active Key Isolation**: Each financial account stored in the hidden private operations wallet MUST be encrypted independently with its own dedicated salt and user-supplied PIN/passphrase (never sharing one master key across distinct financial accounts), with short auto-lock timeouts and explicit zero-liability disclaimers.

## Documentation, Copy & Roadmap Discipline
- **Neutral Technical Terminology**: Avoid words denoting physical harm or non-living states across documentation, comments, logs, and UI strings; use neutral engineering terms (e.g., «архівні», «невикористовувані», «застарілі», «залишкові файли»).
- **Roadmap Execution Tracking**: Multi-stage development follows `./fix_test_patcn/roadmap_v2/00_MASTER_ROADMAP_CHECKLIST.md` and its `STAGE_XX_*.md` specifications. Mark stage checkboxes only after automated verification (`npm run lint`, `npm run build`, and platform checks) passes.

