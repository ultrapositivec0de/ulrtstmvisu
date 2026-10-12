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
