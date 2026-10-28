# Stage 2 Execution Plan: Notifications & Quick Tools Parity

## Overview
Stage 2 addresses two critical requirements from the user request:
1. **Task 2: Action Notifications Optimization & Deduplication**
   - **Root Cause Analysis**:
     - Status messages (`pubLog`) currently lack a unified lifecycle timer when set directly via `setPubLog` (e.g., during blockchain publishing, file uploads, errors), causing notifications to get stuck indefinitely until manually dismissed.
     - Redundant duplicate display occurs when `activeModal === 'publish'` shows the message inside the modal footer, and when the modal closes after 2s, the exact same message immediately triggers the global banner on the main viewport.
     - Dual dispatches occur in image upload callbacks where both `notify()` and `setPubLog()` are triggered simultaneously.
     - Viewport collision: Notification banner currently sits top-center, potentially clipping under the fixed header or obscuring quick actions.
   - **Solution**:
     - Create a robust `NotificationManager` / auto-dismiss scheduler in `App.tsx` ensuring a 3.5s - 4.5s auto-dismiss (4000ms default) for success/error/info notifications, and a 20s safety timeout for loading states.
     - Deduplication: When `notify(msg, type)` receives an identical active message and type, refresh its timer without stacking or jarring re-mounts.
     - In `PublishModal`: Clear or bypass duplicate re-triggering upon modal close when publishing completes.
     - In `useSteemGallery`: Eliminate dual `config.notify()` + `config.setPubLog()` invocations.
     - Position & Viewport:
       - On Desktop: Top-right corner (`top: calc(var(--header-height, 3.5rem) + env(safe-area-inset-top, 0px) + 0.75rem)`, `right: 1.5rem`), strictly below header (`z-[260]`).
       - On Mobile: Top-center with safe margins, high z-index, clear background with border and dismiss button.

2. **Task 8: Header vs TamedWidget Quick Tools Parity**
   - **Root Cause Analysis**:
     - `Header.tsx` only had a hardcoded subset of formatting buttons (missing `sub`, `sup`, `List`, `Num`, `Task`, `Esc`, `Caption`, `Img`, `Gallery`).
     - `Header.tsx` used a fallback table import instead of `TOOLS_MAP['Table']` selector popup.
     - In the mobile quick tools dropdown (`showMobileToolsOpen`), the same tools were also absent.
   - **Solution**:
     - Pass `toolsMap={TOOLS_MAP}` reliably from `App.tsx` into `<Header />`.
     - In `Header.tsx`:
       - Add all missing tools (`sub`, `sup`, `List`, `Num`, `Task`, `Esc`, `Caption`, `Img`, `Gallery`) to both the desktop scrollable tools toolbar and the mobile tools dropdown.
       - Wire all actions directly to `TOOLS_MAP[key].action(e)`.
       - Add localized tooltips across all 4 locales (`uk`, `en`, `es`, `ko`).

## Execution Steps
1. Add new i18n translation keys across `uk.ts`, `en.ts`, `es.ts`, `ko.ts` for any missing tool titles (`subscript`, `superscript`, `listBullet`, `listOrdered`, `listTask`, `escapeChar`, `insertLocalImage`) - [COMPLETED]
2. Update notification dispatch & timer management in `src/App.tsx`, optimizing deduplication, auto-dismiss (3.8s), and top-right / mobile placement - [COMPLETED]
3. Fix duplicate notification dispatch in `useSteemGallery.ts` and ensure smooth upload progress toasts - [COMPLETED]
4. Prevent duplicate post-publish notification flashes in `PublishModal.tsx` and `usePublishingManager.ts` - [COMPLETED]
5. Enhance `Header.tsx` to achieve 100% quick tools parity with `TamedWidget.tsx` (desktop toolbar + mobile dropdown) - [COMPLETED]
6. Verify build and types with `compile_applet` and `lint_applet` - [COMPLETED: Build succeeded, 0 errors]
