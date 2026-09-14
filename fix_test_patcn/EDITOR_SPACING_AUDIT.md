# Editor Text & Layout Spacing Audit

Generated: 2026-09-10T08:18:32.946Z

## File: `src/components/common/GlobalEditorStyles.tsx` (28 occurrences)

| Line | Category | Snippet |
|---|---|---|
| 43 | Editor Specific Spacing | `.wysiwyg-editor, .wysiwyg-editor *, #main-editor {` |
| 47 | Editor Specific Spacing | `.wysiwyg-editor strong, .wysiwyg-editor b, #main-editor strong, #main-editor b {` |
| 85 | Editor Specific Spacing | `.wysiwyg-editor p,` |
| 86 | Editor Specific Spacing | `.wysiwyg-editor ul,` |
| 87 | Editor Specific Spacing | `.wysiwyg-editor ol,` |
| 88 | Editor Specific Spacing | `.wysiwyg-editor h1,` |
| 89 | Editor Specific Spacing | `.wysiwyg-editor h2,` |
| 90 | Editor Specific Spacing | `.wysiwyg-editor h3,` |
| 91 | Editor Specific Spacing | `.wysiwyg-editor h4,` |
| 92 | Editor Specific Spacing | `.wysiwyg-editor h5,` |
| 93 | Editor Specific Spacing | `.wysiwyg-editor h6,` |
| 94 | Editor Specific Spacing | `.wysiwyg-editor,` |
| 99 | Editor Specific Spacing | `.wysiwyg-editor blockquote,` |
| 100 | Editor Specific Spacing | `.wysiwyg-editor pre {` |
| 101 | CSS Spacing Property | `margin-top: var(--wysiwyg-spacing, 18px) !important;` |
| 102 | CSS Spacing Property | `margin-bottom: var(--wysiwyg-spacing, 18px) !important;` |
| 104 | Editor Specific Spacing | `.wysiwyg-editor table,` |
| 105 | Editor Specific Spacing | `.wysiwyg-editor img {` |
| 106 | CSS Spacing Property | `margin-top: var(--wysiwyg-spacing, 18px) !important;` |
| 107 | CSS Spacing Property | `margin-bottom: var(--wysiwyg-spacing, 18px) !important;` |
| 124 | Editor Specific Spacing | `.prose img {` |
| 128 | Editor Specific Spacing | `.wysiwyg-editor table {` |
| 134 | Editor Specific Spacing | `.wysiwyg-editor th, .wysiwyg-editor td {` |
| 141 | Editor Specific Spacing | `.wysiwyg-editor th {` |
| 148 | Editor Specific Spacing | `.wysiwyg-editor th:empty::before, .wysiwyg-editor td:empty::before {` |
| 159 | Editor Specific Spacing | `.wysiwyg-editor th:focus, .wysiwyg-editor td:focus {` |
| 167 | CSS Spacing Property | `margin-bottom: 1rem;` |
| 173 | CSS Spacing Property | `margin-bottom: 1rem;` |

## File: `src/components/editor/EditorPane.tsx` (29 occurrences)

| Line | Category | Snippet |
|---|---|---|
| 35 | Editor Specific Spacing | `beautifyEnabled: boolean;` |
| 38 | Editor Specific Spacing | `wysiwygSpacing: number;` |
| 79 | Editor Specific Spacing | `setBeautifyEnabled: (val: boolean) => void;` |
| 82 | Editor Specific Spacing | `setWysiwygSpacing: (val: number) => void;` |
| 157 | Editor Specific Spacing | `beautifyEnabled,` |
| 160 | Editor Specific Spacing | `wysiwygSpacing,` |
| 199 | Editor Specific Spacing | `setBeautifyEnabled,` |
| 202 | Editor Specific Spacing | `setWysiwygSpacing,` |
| 412 | Editor Specific Spacing | `const next = !beautifyEnabled;` |
| 413 | Editor Specific Spacing | `setBeautifyEnabled(next);` |
| 414 | State / Prop | `localStorage.setItem('steem_beautify', String(next));` |
| 424 | Editor Specific Spacing | `beautifyEnabled` |
| 428 | Editor Specific Spacing | `title={beautifyEnabled ? t('beautifyActiveTitle') : t('enableBeautifyTitle')}` |
| 430 | Editor Specific Spacing | `<Sparkles size={12} className={cn(beautifyEnabled ? "text-cyan-400" : "text-slate-500")} />` |
| 434 | State / Prop | `{t('beautify')}` |
| 436 | Editor Specific Spacing | `{beautifyEnabled && (` |
| 547 | Editor Specific Spacing | `const next = !beautifyEnabled;` |
| 548 | Editor Specific Spacing | `setBeautifyEnabled(next);` |
| 549 | State / Prop | `localStorage.setItem('steem_beautify', String(next));` |
| 553 | Editor Specific Spacing | `beautifyEnabled` |
| 560 | Editor Specific Spacing | `beautifyEnabled ? "left-[18px]" : "left-0.5"` |
| 572 | Editor Specific Spacing | `{wysiwygSpacing}px` |
| 588 | Editor Specific Spacing | `setWysiwygSpacing(p.id);` |
| 593 | Editor Specific Spacing | `wysiwygSpacing === p.id` |
| 608 | Editor Specific Spacing | `value={wysiwygSpacing}` |
| 611 | Editor Specific Spacing | `setWysiwygSpacing(val);` |
| 749 | Editor Specific Spacing | `beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-[clamp(40rem,60vw,80rem)] mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-3 pt` |
| 942 | Editor Specific Spacing | `"relative flex-1 w-full bg-transparent text-base outline-none overflow-y-auto custom-scrollbar transition-colors duration-700 editor-font pr` |
| 944 | Editor Specific Spacing | `beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-4xl mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-4 pt-4 lg:px-6 lg:pt-6",` |

## File: `src/components/editor/PreviewPane.tsx` (1 occurrences)

| Line | Category | Snippet |
|---|---|---|
| 80 | Editor Specific Spacing | `"flex-1 p-8 overflow-y-auto prose prose-invert prose-cyan max-w-none custom-scrollbar markdown-body",` |

## File: `src/hooks/useEditorModeManager.ts` (2 occurrences)

| Line | Category | Snippet |
|---|---|---|
| 201 | Editor Specific Spacing | `clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;` |
| 226 | Editor Specific Spacing | `clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;` |

## File: `src/index.css` (115 occurrences)

| Line | Category | Snippet |
|---|---|---|
| 58 | Editor Specific Spacing | `.wysiwyg-editor {` |
| 307 | CSS Spacing Property | `.pull-left { float: left; margin-right: 1.5rem; margin-bottom: 1rem; max-width: 50%; }` |
| 308 | CSS Spacing Property | `.pull-right { float: right; margin-left: 1.5rem; margin-bottom: 1rem; max-width: 50%; }` |
| 318 | Editor Specific Spacing | `.markdown-body, .wysiwyg-editor {` |
| 338 | Editor Specific Spacing | `.wysiwyg-editor > p,` |
| 339 | Editor Specific Spacing | `.wysiwyg-editor > ul,` |
| 340 | Editor Specific Spacing | `.wysiwyg-editor > ol,` |
| 341 | Editor Specific Spacing | `.wysiwyg-editor > h1,` |
| 342 | Editor Specific Spacing | `.wysiwyg-editor > h2,` |
| 343 | Editor Specific Spacing | `.wysiwyg-editor > h3,` |
| 344 | Editor Specific Spacing | `.wysiwyg-editor > h4,` |
| 345 | Editor Specific Spacing | `.wysiwyg-editor > h5,` |
| 346 | Editor Specific Spacing | `.wysiwyg-editor > h6,` |
| 347 | Editor Specific Spacing | `.wysiwyg-editor > blockquote,` |
| 348 | Editor Specific Spacing | `.wysiwyg-editor > pre,` |
| 349 | Editor Specific Spacing | `.wysiwyg-editor > table,` |
| 350 | Editor Specific Spacing | `.wysiwyg-editor > hr,` |
| 351 | Editor Specific Spacing | `.wysiwyg-editor > img,` |
| 352 | Editor Specific Spacing | `.wysiwyg-editor > .table-spacer,` |
| 353 | Editor Specific Spacing | `.wysiwyg-editor > div,` |
| 354 | Editor Specific Spacing | `.wysiwyg-editor > center {` |
| 358 | Editor Specific Spacing | `.markdown-body h1, .wysiwyg-editor h1 {` |
| 361 | CSS Spacing Property | `margin-top: 1.5rem !important;` |
| 362 | CSS Spacing Property | `margin-bottom: 0.75rem !important;` |
| 366 | Editor Specific Spacing | `.markdown-body h2, .wysiwyg-editor h2 {` |
| 369 | CSS Spacing Property | `margin-top: 1.25rem !important;` |
| 370 | CSS Spacing Property | `margin-bottom: 0.5rem !important;` |
| 372 | Editor Specific Spacing | `.markdown-body h3, .wysiwyg-editor h3 {` |
| 375 | CSS Spacing Property | `margin-top: 1rem !important;` |
| 376 | CSS Spacing Property | `margin-bottom: 0.5rem !important;` |
| 378 | Editor Specific Spacing | `.markdown-body p, .wysiwyg-editor p {` |
| 379 | CSS Spacing Property | `margin-top: 0 !important;` |
| 380 | CSS Spacing Property | `margin-bottom: 0.85rem !important;` |
| 381 | CSS Spacing Property | `line-height: 1.6 !important;` |
| 384 | Editor Specific Spacing | `.wysiwyg-editor p:empty,` |
| 385 | Editor Specific Spacing | `.wysiwyg-editor p:has(> br:only-child) {` |
| 388 | Editor Specific Spacing | `.markdown-body ul, .wysiwyg-editor ul {` |
| 390 | CSS Spacing Property | `padding-left: 1.5rem !important;` |
| 391 | CSS Spacing Property | `margin-top: 0.5rem !important;` |
| 392 | CSS Spacing Property | `margin-bottom: 0.85rem !important;` |
| 394 | Editor Specific Spacing | `.markdown-body ol, .wysiwyg-editor ol {` |
| 396 | CSS Spacing Property | `padding-left: 1.5rem !important;` |
| 397 | CSS Spacing Property | `margin-top: 0.5rem !important;` |
| 398 | CSS Spacing Property | `margin-bottom: 0.85rem !important;` |
| 400 | Editor Specific Spacing | `.markdown-body li, .wysiwyg-editor li {` |
| 401 | CSS Spacing Property | `margin-top: 0 !important;` |
| 402 | CSS Spacing Property | `margin-bottom: 0 !important;` |
| 403 | CSS Spacing Property | `padding-left: 0.25rem !important;` |
| 404 | CSS Spacing Property | `line-height: 1.5 !important;` |
| 406 | Editor Specific Spacing | `.markdown-body li > p, .wysiwyg-editor li > p {` |
| 411 | Editor Specific Spacing | `.wysiwyg-editor li > ul, .wysiwyg-editor li > ol {` |
| 412 | CSS Spacing Property | `margin-top: 0 !important;` |
| 413 | CSS Spacing Property | `margin-bottom: 0 !important;` |
| 415 | Editor Specific Spacing | `.markdown-body blockquote, .wysiwyg-editor blockquote {` |
| 417 | CSS Spacing Property | `padding-left: 1rem !important;` |
| 419 | CSS Spacing Property | `margin-top: 0.5rem !important;` |
| 420 | CSS Spacing Property | `margin-bottom: 0.85rem !important;` |
| 422 | Editor Specific Spacing | `.markdown-body code, .wysiwyg-editor code { @apply bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-400; }` |
| 423 | Editor Specific Spacing | `.markdown-body pre, .wysiwyg-editor pre { @apply bg-slate-900 p-4 rounded-xl mb-4 overflow-x-auto border border-slate-800; }` |
| 424 | Editor Specific Spacing | `.markdown-body pre code, .wysiwyg-editor pre code { @apply bg-transparent p-0 text-slate-300; }` |
| 425 | Editor Specific Spacing | `.markdown-body table, .wysiwyg-editor table { @apply w-full border-collapse mb-4; max-width: 100%; overflow-x: auto; }` |
| 426 | Editor Specific Spacing | `.markdown-body th, .markdown-body td, .wysiwyg-editor th, .wysiwyg-editor td { @apply border border-slate-800 p-2 text-left; }` |
| 427 | Editor Specific Spacing | `.markdown-body th, .wysiwyg-editor th { @apply bg-slate-900 font-bold; }` |
| 428 | Editor Specific Spacing | `.markdown-body img, .wysiwyg-editor img { @apply rounded-xl max-w-full h-auto object-contain; max-height: 500px; }` |
| 429 | Editor Specific Spacing | `.markdown-body hr, .wysiwyg-editor hr { @apply border-slate-800 my-8; }` |
| 430 | Editor Specific Spacing | `.markdown-body a, .wysiwyg-editor a { @apply text-cyan-400 hover:underline; }` |
| 433 | Editor Specific Spacing | `.theme-light .markdown-body, .theme-light .wysiwyg-editor { color: var(--text-main); }` |
| 434 | Editor Specific Spacing | `.theme-light .markdown-body h1, .theme-light .wysiwyg-editor h1,` |
| 435 | Editor Specific Spacing | `.theme-light .markdown-body h2, .theme-light .wysiwyg-editor h2,` |
| 436 | Editor Specific Spacing | `.theme-light .markdown-body h3, .theme-light .wysiwyg-editor h3 { color: #0f172a; border-color: #cbd5e1; }` |
| 437 | Editor Specific Spacing | `.theme-light .markdown-body blockquote, .theme-light .wysiwyg-editor blockquote { border-color: #cbd5e1; color: var(--text-muted); }` |
| 438 | Editor Specific Spacing | `.theme-light .markdown-body code, .theme-light .wysiwyg-editor code { background-color: #e2e8f0; color: var(--accent); }` |
| 439 | Editor Specific Spacing | `.theme-light .markdown-body pre, .theme-light .wysiwyg-editor pre { background-color: #f1f5f9; border-color: #cbd5e1; }` |
| 440 | Editor Specific Spacing | `.theme-light .markdown-body pre code, .theme-light .wysiwyg-editor pre code { background-color: transparent; color: #0f172a; }` |
| 441 | Editor Specific Spacing | `.theme-light .markdown-body hr, .theme-light .wysiwyg-editor hr { border-color: #cbd5e1; }` |
| 442 | Editor Specific Spacing | `.theme-light .markdown-body th, .theme-light .wysiwyg-editor th,` |
| 443 | Editor Specific Spacing | `.theme-light .markdown-body td, .theme-light .wysiwyg-editor td { border-color: #cbd5e1; }` |
| 444 | Editor Specific Spacing | `.theme-light .markdown-body th, .theme-light .wysiwyg-editor th { background-color: #f8fafc; color: #0f172a; }` |
| 465 | Editor Specific Spacing | `.wysiwyg-editor {` |
| 469 | Editor Specific Spacing | `.wysiwyg-editor sub, .markdown-body sub {` |
| 472 | CSS Spacing Property | `line-height: 0 !important;` |
| 474 | Editor Specific Spacing | `.wysiwyg-editor table {` |
| 482 | Editor Specific Spacing | `.wysiwyg-editor th, .wysiwyg-editor td {` |
| 490 | Editor Specific Spacing | `.wysiwyg-editor td:focus, .wysiwyg-editor th:focus {` |
| 495 | Editor Specific Spacing | `.wysiwyg-editor th {` |
| 500 | Editor Specific Spacing | `.wysiwyg-editor img {` |
| 513 | Editor Specific Spacing | `.wysiwyg-editor img:hover {` |
| 518 | Editor Specific Spacing | `.wysiwyg-editor .pull-left, .markdown-body .pull-left {` |
| 521 | CSS Spacing Property | `margin-bottom: 1rem;` |
| 524 | Editor Specific Spacing | `.wysiwyg-editor .pull-right, .markdown-body .pull-right {` |
| 527 | CSS Spacing Property | `margin-bottom: 1rem;` |
| 530 | Editor Specific Spacing | `.wysiwyg-editor .clearfix, .markdown-body .clearfix {` |
| 533 | Editor Specific Spacing | `.wysiwyg-editor .text-center {` |
| 536 | Editor Specific Spacing | `.wysiwyg-editor .text-justify {` |
| 539 | Editor Specific Spacing | `.theme-light .wysiwyg-editor sub {` |
| 544 | Editor Specific Spacing | `.theme-light .wysiwyg-editor sub::before {` |
| 547 | Editor Specific Spacing | `.theme-light .wysiwyg-editor th, .theme-light .wysiwyg-editor td {` |
| 550 | Editor Specific Spacing | `.theme-light .wysiwyg-editor th {` |
| 554 | Editor Specific Spacing | `.wysiwyg-editor[data-is-empty="true"]::before,` |
| 555 | Editor Specific Spacing | `.wysiwyg-editor:empty::before {` |
| ... | ... | ... (15 more) |

