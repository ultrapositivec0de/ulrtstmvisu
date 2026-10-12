# План локалізації — Частина 1: Словники (`uk`, `en`), Редактор, Читання та Аудіо-синтезатор

> **Принцип виконання**: Цей файл охоплює першу половину переходу на глобальну локалізацію (`src/locales/uk.ts` та `src/locales/en.ts`). Під час виконання цієї частини агенту достатньо читати лише цей файл плану, без завантаження другої частини.
> **Мовний пріоритет**: Усі нові та відсутні ключі додаються й синхронізуються насамперед для **української (`uk.ts`)** та **англійської (`en.ts`)** мов (щоб не перевантажувати контекст і ресурси), із безпечним фолбеком у `getTranslation(lang, key)`.

---

## Етап 1.1: Синхронізація базових словників (`src/locales/uk.ts` та `src/locales/en.ts`)

### 1. Додати у `src/locales/uk.ts` (9 ключів, які вже викликаються через `t()`, але відсутні у словнику):
- `importBackup`: `"Імпортувати бекап (.zip)"`
- `exportBackup`: `"Експортувати бекап (.zip)"`
- `success`: `"Успішно"`
- `usernameDesc`: `"Вкажіть ваш обліковий запис Steem для публікацій через Keychain, завантаження сповіщень та коментарів"`
- `add`: `"Додати"`
- `noMentions`: `"Немає збережених згадувань"`
- `noTagGroups`: `"Немає збережених груп тегів"`
- `galleryGrid`: `"Сітка галереї"`
- `textPlaceholder`: `"Введіть текст..."`

### 2. Додати у `src/locales/en.ts` 46 відсутніх ключів (для 100% паритету з `uk.ts`):
- Системні та діалогові: `error`, `search`, `light`, `dark`, `systemDialogAlert`, `systemDialogConfirm`, `systemDialogPrompt`, `working`, `ready`, `saved`, `load`
- Вітальне вікно та інформація: `welcomeTitle`, `welcomeDesc`, `saveAndStart`, `skipForNow`, `github`, `copyright`, `allSettings`, `performanceDesc`
- Віджет та оформлення: `dragToReorder`, `transparent`, `borderless`, `showInWidget`, `hideInWidget`, `opacity`, `noBorder`, `widgetNoBorder`, `resetWidget`, `clearfixDesc`, `splitSuccess`, `importTableSuccess`
- Шаблони та згадки: `saveTemplate`, `templatesEmpty`, `saveAsTemplate`, `confirmDeleteTemplate`, `templateSaved`, `templateDeleted`, `mentionUsername`, `saveMention`, `mentionAdded`, `mentionDeleted`, `confirmDeleteMention`
- Галерея та API: `pexelsKeyRequired`, `pixabayKeyRequired`, `unsplashKeyRequired`, `pixabayError`, `unsplashError`, `pixabayKey`, `unsplashKey`, `enableThumbnails`, `caption`, `addCaption`, `typeHere`, `image`, `description`

---

## Етап 1.2: Панелі редактора, Хедер та Сайдбар

### 1. `src/components/editor/EditorPane.tsx` (31 точка заміни)
- Перенести у `uk.ts` / `en.ts` та замінити на `t(...)`:
  - Кнопки режиму читання: `docReaderOpenTitle` ("Перейти в повноцінний режим читання документа" / "Open full document reader mode"), `docReaderBtn` ("Читання" / "Reader"), `docReaderTocTitle` ("Зміст / Структура документа" / "Table of Contents / Structure"), `docReaderTocBtn` ("Зміст" / "TOC"), `docReaderSourceTitle` ("Джерело документа (Чернетки / Файли)" / "Document Source (Drafts / Files)"), `docReaderSourceBtn` ("Джерело" / "Source").
  - Індикатор синхронізації: `syncOptimizedTitle`, `syncRealtimeTitle`, `syncIdle`, `syncActive`.
  - Меню інтервалів (`isSpacingMenuOpen`): `spacingMenuTitle`, `lineSpacingLabel`, `paragraphSpacingLabel`, `toolbarIconSizeLabel`, `spacingCompact`, `spacingNormal`, `spacingRelaxed`, `sizeSmall`, `sizeMedium`, `sizeLarge`.
  - Нижня панель статистики та WPM: `wpmTooltip` ("Швидкість набору (слів за хвилину)" / "Typing speed (words per minute)"), `wpmUnit` ("сл/хв" / "WPM"), `readingTimeUnit` ("хв читання" / "min read").

### 2. `src/components/editor/TamedWidget.tsx`, `PreviewPane.tsx`, `toolsMap.tsx`, `TableSelectorPopup.tsx`, `LineComponent.tsx`
- `TamedWidget.tsx`: замінити `lang === 'uk' ? ... : ...` для кнопок `🔒 Внизу` (`posBottomLock`), `🎈 Плаваючий` (`posFloatingBalloon`), `🚫 Вимкнено` (`posHidden`) та підказки налаштувань віджета.
- `PreviewPane.tsx`: локалізувати `toggleLivePreviewTitle` ("Увімкнути/вимкнути прев'ю перегляду" / "Enable/Disable Live Preview").
- `toolsMap.tsx`: локалізувати назви інструментів, що залишилися українською.
- `TableSelectorPopup.tsx` та `LineComponent.tsx`: локалізувати `placeholder` (`textPlaceholder`) та підказки вибору розміру таблиці.

### 3. `src/components/header/Header.tsx` (16 точок) та `src/components/sidebar/Sidebar.tsx` (6 точок)
- `Header.tsx`:
  - Замінити `title="Center"` -> `t('alignCenter')`, `title="Justify"` -> `t('alignJustify')`, `title="Tools"` -> `t('editorTools')`, `title="Files"` -> `t('filesMenu')`.
  - Панель сповіщень: `notificationsTitle` ("Сповіщення" / "Notifications"), `newNotificationsCount` ("нових" / "new"), `clearNotifications` ("Очистити" / "Clear"), `notificationsEmpty` ("Порожньо" / "Empty"), `viewNotification` ("ПЕРЕГЛЯНУТИ" / "VIEW").
- `Sidebar.tsx`:
  - Замінити інлайн-підказки режимів сітки (`layoutColTitle`, `layoutColTableTitle`, `layoutGrid2Title` тощо) на виклики `t(...)` та прибрати фолбеки `|| '...'`.

---

## Етап 1.3: Повна локалізація режиму читання (`src/components/docReader/*`)

Охоплює 6 файлів (`DocReaderSettingsMenu.tsx`, `DocReaderSourceDrawer.tsx`, `DocReaderToolbar.tsx`, `DocReaderTOC.tsx`, `useDocReader.ts`, `DocReaderContent.tsx`):
- **`DocReaderSettingsMenu.tsx`**:
  - Ключі тем: `readerThemePaper` ("Папір" / "Paper"), `readerThemeSepia` ("Сепія" / "Sepia"), `readerThemeDark` ("Ніч" / "Night").
  - Ключі ширини: `readerWidthNarrow` ("Книга" / "Book"), `readerWidthNarrowDesc` ("65ch (вузька)" / "65ch (narrow)"), `readerWidthMedium` ("Стандарт" / "Standard"), `readerWidthMediumDesc` ("85ch (комфортна)" / "85ch (comfortable)"), `readerWidthFull` ("Повна" / "Full"), `readerWidthFullDesc` ("100% ширини" / "100% width").
  - Ключі шрифтів та інтервалів: `readerFontSans`, `readerFontSerif`, `readerFontMono`, `readerSettingsTitle`, `readerColorTheme`, `readerColumnWidth`, `readerFontFamily`, `readerFontSize`, `readerLineHeight`, `readerDecrease`, `readerIncrease`, `readerShowProgress`.
- **`DocReaderSourceDrawer.tsx` та `useDocReader.ts`**:
  - Ключі: `readerSourcesTitle`, `readerClosePanel`, `readerCurrentInReader`, `readerUntitledDoc`, `readerUntitledDraft`, `readerEditThisText`, `readerMainEditor`, `readerCurrentDocInEditor`, `readerSyncedWithEditor`, `readerLocalFiles`, `readerOpenFileDisk`, `readerSupportedFormats`, `readerSavedDrafts`, `readerNoSavedDrafts`.
  - Усунути крихку перевірку `target.closest('button')?.title?.includes('Джерело')` на користь перевірки стабільного атрибута `data-drawer-trigger="source"`.
- **`DocReaderToolbar.tsx`, `DocReaderTOC.tsx`, `DocReaderContent.tsx`**:
  - Ключі панелі інструментів рідера та змісту (`readerChangeSourceTitle`, `readerTocTitle`, `readerAppearanceTitle`, `readerFullscreenEnter`, `readerFullscreenExit`, `readerEditBtn`, `readerCloseTitle`, `readerTocSearchPlaceholder`, `readerTocEmpty`, `readerTocNoMatch`, `readerDocEmpty`).
  - Замінити `target.closest('button')?.title?.includes('Зміст')` на `data-drawer-trigger="toc"`.

---

## Етап 1.4: Аудіо-віджет та синтезатор клавіш (`src/components/audio/*`, `src/services/audio/*`)

### 1. `src/components/audio/AudioControlWidget.tsx` (11 точок) та `src/components/modals/AudioPresetsModal.tsx` (23 точки)
- Ключі:
  - `audioToggleOnTitle`, `audioToggleOffTitle`, `audioShortLabel` ("Звук" / "Sound"), `audioMenuTitle` ("Налаштування звуку та швидкий вибір пресетів" / "Sound settings & quick preset selector").
  - `audioKeySoundTitle`, `audioVolume`, `audioTouchButtons`, `audioWpmOpt`, `audioQuickSelect`, `audioPresetsCount`, `audioPreviewBtnTitle`, `audioAllPresetsBtn`.
  - Модальне вікно `AudioPresetsModal.tsx`: `audioModalTitle`, `audioModalSubtitle`, `audioEnabled`, `audioDisabled`, `audioImportSuccess`, `audioImportValidationError`, `audioImportJsonError`, `audioAllCategory`, `audioExportPreset`, `audioImportPreset`, `audioDeleteCustomPreset`, `audioActiveBadge`.

### 2. Назви та описи звукових пресетів (`src/services/audio/presets.ts` та `src/services/audio/presets/*.ts`)
- Додати у `uk.ts` та `en.ts` ключі категорій (`audioCat_mechanical`, `audioCat_retro`, `audioCat_scifi`, `audioCat_organic`, `audioCat_musical`, `audioCat_custom`) та ключі назв і описів для всіх 15 пресетів (`audioPreset_<id>_name`, `audioPreset_<id>_desc`), щоб при перемиканні мови інтерфейсу між UK та EN усі назви та описи пресетів відображалися відповідною мовою.
