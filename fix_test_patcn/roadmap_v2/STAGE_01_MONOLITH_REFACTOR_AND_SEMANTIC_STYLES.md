# Етап 1: Завершення глобального рефакторингу монолітів та семантична уніфікація стилів

**Рейтинг**:
- **Важливість**: Критична
- **Складність**: Висока
- **Ресурсна вартість**: Висока
- **Залежності**: Етап 0

---

## Мета етапу
1. Розбити великі мультидоменні модулі на компактні підмодулі за орієнтовним порогом `~350–400` рядків (з дозволеними винятками для словників, чистих таблиць пресетів, цілісних парсерів та нерозривних рушіїв), забезпечивши чисту архітектуру перед впровадженням нових функцій.
2. Замінити `1 602` жорстко зашитих палітрових класів (`bg-slate-*`, `text-slate-*`, `border-slate-*`, `text-white`, `bg-white`) та `97` інлайнових стилів у `58` компонентах на єдину систему семантичних CSS-токенів, усунувши > 100 `!important` правил у `src/index.css`.

---

## Цільові модулі для декомпозиції

### Блок A: Редакторські хуки та оркестрація (пріоритет 1)
1. `src/hooks/useEditorFormat.ts` (`1 597` рядків) -> винести в `src/hooks/editor/formatting/`:
   - `useMarkdownFormatActions.ts` (списки, заголовки, посилання, цитати, код)
   - `useWysiwygFormatActions.ts` (DOM/Selection трансформації)
   - `useTableFormatActions.ts` (вставка та редагування таблиць)
   - `useMediaInsertActions.ts` (обгортка вставки зображень, вирівнювання `pull-left`/`pull-right`)
2. `src/hooks/useEditorEvents.ts` (`1 521` рядок) -> винести в `src/hooks/editor/events/`:
   - `useEditorKeyboardShortcuts.ts`
   - `useEditorClipboardPaste.ts`
   - `useEditorScrollAndCaretSync.ts`
3. `src/hooks/useWysiwygSync.ts` (`1 063` рядки) -> розділити на:
   - `src/utils/editor/wysiwygDomSerializer.ts` (чисті функції Markdown <-> HTML)
   - `src/hooks/editor/useWysiwygCursorBridge.ts`
4. `src/hooks/useAppWorkspaceSuite.ts` (`687` рядків) + `src/hooks/useModalsProps.ts` (`478` рядків) -> перевести спільний UI-стан у типізовані Zustand-стори (`editorUiStore.ts`, `modalStore.ts`) замість прокидання великих об'єктів пропсів.

### Блок B: Важкі модальні вікна та компоненти інтерфейсу
1. `src/components/modals/SettingsModal.tsx` (`1 473` рядки) -> рознести по вкладках у `src/components/modals/settings/`:
   - `SettingsAppearanceTab.tsx` (теми, шрифти, масштаб UI)
   - `SettingsEditorAudioTab.tsx` (налаштування редактора, звуковий рушій)
   - `SettingsAiKeysTab.tsx` (Pexels/Gemini ключі)
   - `SettingsCacheAndStorageTab.tsx` (експорт/імпорт резервних копій + CacheManager)
   - `SettingsAboutDiagnosticsTab.tsx`
2. `src/components/modals/PublishModal.tsx` (`1 097` рядків) -> розділити на `src/components/modals/publish/`:
   - `PublishAccountSelector.tsx`
   - `PublishTagsAndBeneficiaries.tsx`
   - `PublishScheduleSection.tsx`
   - `PublishMetadataOptions.tsx`
3. `src/components/modals/KeysModal.tsx` (`752` рядки) -> винести логіку форм додавання акаунту та індикатора Vault-стану в `src/components/modals/keys/`.
4. `src/components/header/Header.tsx` (`790` рядків) та `src/components/sidebar/Sidebar.tsx` (`747` рядків) -> виділити підменю дій та панелі інструментів у `src/components/header/*` і `src/components/sidebar/*`.
5. `src/components/editor/TamedWidget.tsx` (`651` рядок), `EditorPane.tsx` (`598`), `EditorTopBar.tsx` (`580`), `CodeEditor.tsx` (`555`).

### Блок C: Модулі Reader & Audio Engine
1. `src/components/reader/ReaderSettingsView.tsx` (`1 069`), `ReaderFeedView.tsx` (`1 033`), `ReaderCurationView.tsx` (`963`), `ReaderInboxDrawer.tsx` (`775`), `Reader.tsx` (`758`), `ReaderTopHeader.tsx` (`559`) -> розбити картки дописів, фільтри тегів, панель кураторського звіту та форму коментарів у `src/components/reader/cards/`, `src/components/reader/curation/`, `src/components/reader/settings/`.
2. `src/services/audio/SoundSynthEngine.ts` (`1 222`) та `useTypingSound.ts` (`721`) -> винести мапи пресетів у `src/services/audio/presets/`, а WebAudio осцилятори/ноди в `src/services/audio/nodes/`.

---

## Аудит та уніфікація стилів (CSS Tokens Migration)

- [ ] **Крок 1.1 — Розширення реєстру семантичних токенів у `src/index.css`**:
  - Визначити повний контракт токенів поверхонь, станів і меж:
    - `--bg-main`, `--bg-sidebar`, `--bg-card`, `--bg-card-hover`, `--bg-elevated`, `--bg-input`, `--bg-overlay-surface`
    - `--text-main`, `--text-secondary`, `--text-muted`, `--text-on-accent`
    - `--border-color`, `--border-subtle`, `--border-focus`
    - `--modal-bg`, `--modal-border`, `--modal-header-border`, `--modal-shadow`
    - `--scrollbar-thumb`, `--scrollbar-thumb-hover`
  - Зареєструвати `@theme` / семантичні утилітні класи (`surface-main`, `surface-sidebar`, `surface-card`, `surface-input`, `text-primary`, `text-muted-token`, `border-token`), щоб компоненти не писали `style={{...}}`.
- [ ] **Крок 1.2 — Пакетна міграція топ-компонентів (58 файлів, 1 602 класи)**:
  - Хвиля 1 (найбільш насичені): `EditorTopBar.tsx` (159), `Header.tsx` (125), `ReaderCurationView.tsx` (119), `ReaderSettingsView.tsx` (116), `Sidebar.tsx` (109), `ReaderFeedView.tsx` (100), `ReaderTopHeader.tsx` (100).
  - Хвиля 2: `ReaderInboxDrawer.tsx` (69), `TamedWidget.tsx` (61), `ReaderQuickPanel.tsx` (43), `DocReader*` (143 сумарно), `ImageItem.tsx` (39), `AboutModal.tsx` (39), `ImageLightboxModal.tsx` (31), `CachedImagesPanel.tsx` (28), `TableSelectorPopup.tsx` (27).
  - Хвиля 3: решта 40+ файлів та інлайнові `style={{...}}` блоки (залишити в `style` виключно динамічні математичні координати).
- [ ] **Крок 1.3 — Розбиття `src/index.css` (960 рядків) та видалення `!important` костилів**:
  - Виділити модулі CSS у `src/styles/`: `tokens.css`, `themes.css`, `markdown.css`, `wysiwyg.css`, `reader.css`, `animations.css` з імпортом у `src/index.css`.
  - Видалити всі блоки `.theme-light .bg-slate-*`, `.theme-light .text-slate-*`, `.theme-neon .bg-slate-*` з `!important`.
  - Залишити в `@media` та глобальних правилах тільки чисті семантичні змінні.

---

## Критерії приймання
- Усі мультидоменні модулі декомпозовано; файли, що перевищують орієнтовний поріг `~400` рядків, мають чітко обґрунтовану єдину відповідальність (словник, пресети, цілісний парсер або рушій стану без змішування UI й бізнес-логіки).
- Повторний скрипт-аудит показує `0` жорстких `bg-slate-*` / `text-slate-*` / `border-slate-*` у UI-компонентах та `0` `!important` палітрових перевизначень у `src/index.css`.
- Візуальне порівняння тем Dark, Light та Neon підтверджує ідентичну або вищу якість контрасту на Desktop та Mobile.
