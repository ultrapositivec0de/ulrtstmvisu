# 🗺 План рефакторингу (Кроки 2.5 - 2.9)

Цей файл створено для збереження контексту між сесіями. Завжди звіряйтеся з ним під час виконання наступних кроків.

**Крок 2.5: Екстракція `useEditorFormat` (Форматування та вставка тексту)** [ЗАВЕРШЕНО]
*   **Що перенесено:** Усі функції, які відповідають за маніпуляції з текстом (вставка тегів, робота з посиланнями, відступами).
*   **Створено:** `src/hooks/useEditorFormat.ts` (функції: `handleMarkdownFormat`, `fmt`, `fmtLine`, `insertAtCursor`, `insertHtmlAtCursor`, `handleLink`, `handleIndent`, `activeFormats`).

**Крок 2.6: Екстракція `useWysiwygSync` (Синхронізація Visual та Markdown режимів)** [ЗАВЕРШЕНО]
*   **Що перенесено:** Найскладнішу логіку редактора — синхронізацію курсорів, виділення (Selection API/DOM Range) та контенту між двома режимами.
*   **Створено:** `src/hooks/useWysiwygSync.ts` (функції: `syncWysiwygToContentIfVisual`, `syncCursorMarkdownToVisual`, `syncCursorVisualToMarkdown`, `updateContentFromWysiwyg`, `restoreVisualSelection`, `saveVisualSelection`, `getVisualSelectionHtml`, `findDomPositionForMarkdownOffset`).

**Крок 2.7: Екстракція `useEditorEvents` (Обробники подій та гарячих клавіш)** [ЗАВЕРШЕНО]
*   **Що перенесено:** Основні обробники клавіатури, прокрутки та специфічної поведінки при вводі тексту.
*   **Створено:** `src/hooks/useEditorEvents.ts` (функції: `handleEditorKeyDown`, `handleEditorScroll`, `handleWysiwygKeyDown`, `handleWysiwygBeforeInput`, `tryHeadingEnterBreakout`, `scrollCaretIntoView`).

**Крок 2.8: Екстракція `useAppUI` та `useDialogs` (Глобальний стан інтерфейсу)** [ЗАВЕРШЕНО]
*   **Що перенесено:** Управління модалками, діалоговими вікнами та загальним станом переглядів.
*   **Створено:** `src/hooks/useAppUI.ts` та `src/hooks/useDialogs.ts` (стани `activeModal`, `activeView`, `isSidebarOpen`, `isFullScreen`, `isEditorFullScreen`, `confirmDialog`, `promptDialog`, `systemDialog`, обробники fullscreen, Escape клавіш тощо).

**Крок 2.9: Екстракція `usePublishingManager` (Підготовка контенту до публікації)** [ЗАВЕРШЕНО]
*   **Що перенесено:** Підготовку контенту до трансляції в Steem, розбиття довгих постів (`handleSplitPost`), обробку тегів та публікацію.
*   **Створено:** `src/hooks/usePublishingManager.ts` (функції: `handlePublish`, `handleSplitPost`, `extractMentions`, `sanitizeFilename`, `handleAddToQueue`).
