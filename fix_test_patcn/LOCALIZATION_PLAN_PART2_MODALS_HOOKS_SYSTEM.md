# План локалізації — Частина 2: Модальні вікна, Системні хуки, Сповіщення та Верифікація

> **Принцип виконання**: Цей файл охоплює другу половину переходу на глобальну локалізацію (`src/components/modals/*`, `src/hooks/*`, `src/components/common/*`, `src/App.tsx`). Під час роботи над цією частиною достатньо читати лише цей файл плану, що економить контекст та обчислювальні ресурси.
> **Мовний пріоритет**: Усі нові ключі синхронізуються та заповнюються насамперед для **української (`uk.ts`)** та **англійської (`en.ts`)** мов.

---

## Етап 2.1: Основні модальні вікна налаштувань та публікації

### 1. `src/components/modals/SettingsModal.tsx` (63 точки заміни)
- Усунути всі 31 тернарні вирази `lang === 'uk' ? ... : ...`, 16 захардкоджених рядків та 14 фолбеків `|| '...'`:
  - **Вкладка Загальні / Вигляд**:
    - Розміри шрифту: `fontSizeSmall` ("Дрібний" / "Small"), `fontSizeNormal` ("Стандарт" / "Normal"), `fontSizeLarge` ("Великий" / "Large").
    - Позиція віджета: `posBottomLock` ("🔒 Внизу" / "🔒 Bottom"), `posFloatingBalloon` ("🎈 Плаваючий" / "🎈 Floating"), `posHidden` ("🚫 Вимкнено" / "🚫 Hidden").
    - Підписи та описи перемикачів: `performanceDesc`, `trafficDesc`, `exifDesc`, `autoSaveIntervalLabel`, `previewSyncModeLabel`.
  - **Вкладка Інструменти / Віджет**:
    - Назви та підказки кнопок форматування у списку сортування.
  - **Вкладка Сховище / Бекап**:
    - Повідомлення про експорт/імпорт ZIP-архіву, очищення кешу та скидання налаштувань.

### 2. `src/components/modals/PublishModal.tsx` (37 точок заміни)
- Усунути 23 тернарні вирази `lang === 'uk' ? ... : ...` та 10 захардкоджених рядків:
  - **Планувальник публікацій (Schedule)**:
    - Ключі часу: `scheduleTimeInPast` ("Час у минулому (опублікується зараз)" / "Time is in the past (will publish now)"), `scheduleDaysShort` ("дн." / "d"), `scheduleHoursShort` ("год." / "h"), `scheduleMinsShort` ("хв." / "m"), `scheduledForLabel` ("Заплановано на: {date} (через {duration})" / "Scheduled for: {date} (in {duration})").
  - **Керування тегами та спільнотами**:
    - Діалоги та помилки валідації тегів: `promptNewQuickTag` ("Введіть новий тег для швидкого вибору:" / "Enter new tag for quick-add:"), `errTagMustStartWithLetter` ("Помилка: тег має починатися з літери!" / "Error: tag must start with a letter!"), `errTagInvalidChars`, `errMaxTagsReached`.
  - **Бенефіціари та параметри винагород**:
    - Підказки часток винагороди, списку черги публікацій та вибору спільноти.

---

## Етап 2.2: Інші модальні вікна (`src/components/modals/*`)

### 1. `TemplatesModal.tsx` (21 точка)
- Перенести у `uk.ts` / `en.ts`:
  - `templateNameRequired` ("Вкажіть назву шаблону!" / "Please enter a template name!"), `saveAsNewTemplateTitle` ("Зберегти як новий шаблон" / "Save as new template"), `templateNameLabel` ("Назва шаблону" / "Template name"), `templateNamePlaceholder` ("Наприклад: Мій підпис, Звіт, Привітання..." / "E.g.: My signature, Report, Greeting..."), `templatePurposeLabel` ("Призначення та тип шаблону" / "Template purpose & type"), `templateTypePost` ("Шаблон допису" / "Post template"), `templateTypePostDesc` ("Замінює весь поточний вміст, заголовок та теги допису." / "Replaces entire current content, title, and post tags."), `templateTypeSnippet` ("Фрагмент тексту (Сніпет)" / "Text snippet"), `templateTypeSnippetDesc` ("Вставляється у поточну позицію курсора без видалення тексту." / "Inserts at current cursor position without replacing text.").

### 2. `AboutModal.tsx` (21 точка) та `PwaInstructionsModal.tsx` (10 точок)
- **`AboutModal.tsx`**:
  - Додати відсутні ключі: `architectRole` ("Архітектор" / "Architect"), `techDevRole` ("Технічна розробка" / "Technical Development"), описи технологічного стеку та посилань, прибрати всі `t('...') || '...'`.
- **`PwaInstructionsModal.tsx`**:
  - Додати ключ `pwaDesktopTitle` ("💻 Комп'ютер (Chrome / Edge / Brave)" / "💻 Desktop (Chrome / Edge / Brave)") та синхронізувати всі кроки інструкції (`pwaIosStep1`, `pwaIosStep2`, `pwaAndroidStep1`, `pwaAndroidStep2`, `pwaDesktopStep1`, `close`) у `uk.ts` та `en.ts`.

### 3. Допоміжні модальні вікна (`KeysModal.tsx`, `AppModals.tsx`, `QuickStyleMenu.tsx`, `TagGroupsModal.tsx`, `DraftsModal.tsx`, `MentionsModal.tsx`, `SystemDialogModal.tsx`, `TagPresetsModal.tsx`, `BaseModal.tsx`, `AccountPromptModal.tsx`, `SplitPostModal.tsx`)
- Замінити захардкоджені атрибути:
  - `BaseModal.tsx`: `aria-label="Close modal"` -> `aria-label={t('close')}` (або переданий проп).
  - `QuickStyleMenu.tsx`: `title="Settings Hub"` -> `t('settingsHubTitle')`, `subtitle="Personalize experience"` -> `t('settingsHubSubtitle')`.
  - `TagGroupsModal.tsx` та `TagPresetsModal.tsx`: `title="Pin tag to quick Selection"` -> `t('pinTagQuickSelect')`.
  - Прибрати всі інлайн-фолбеки `|| '...'` після перевірки наявності ключів у `uk.ts` та `en.ts`.

---

## Етап 2.3: Системні хуки, Тости, ErrorBoundary та `App.tsx`

### 1. Хуки (`src/hooks/*`)
- **`useSteemGallery.ts`**:
  - Локалізувати статуси: `verifyingPin` ("🔑 Перевірка PIN-коду..." / "🔑 Verifying PIN code..."), `uploadAttemptLabel` ("спроба {attempt}" / "attempt {attempt}"), `uploadRetryMsg` ("⚠️ Спроба {attempt} не вдалася ({error}). Повтор через {seconds}с..." / "⚠️ Attempt {attempt} failed ({error}). Retrying in {seconds}s...").
  - *(Примітка: таблиці транслітерації кирилиці у `useSteemGallery.ts`, `usePublishingManager.ts` та `useSteemQueue.ts` залишаються без змін, оскільки це алгоритмічні дані).*
- **`useAppBackup.ts`**:
  - Перенести діалог підтвердження очищення кешу `confirmClearCachePrompt` та повідомлення `cacheClearedSuccess` у `uk.ts` / `en.ts`.
- **`useEditorFormat.ts`**:
  - Замінити плейсхолдер `'Червоний текст'` на локалізований ключ `redTextPlaceholder` ("Червоний текст" / "Red text").

### 2. Сповіщення, ErrorBoundary та `App.tsx`
- **`NotificationToast.tsx`**:
  - Ключі: `newReplyLabel` ("Нова відповідь" / "New reply"), `viewBtn` ("ПЕРЕГЛЯНУТИ" / "VIEW"), `dismissBtn` ("ЗАКРИТИ" / "DISMISS"), `closeNotificationAria` ("Закрити сповіщення" / "Close notification").
- **`ErrorBoundary.tsx`**:
  - Використати `getTranslation(lang, ...)` для `uiErrorTitle` ("Сталася помилка інтерфейсу" / "Interface error occurred"), `uiErrorUnknown` ("Невідома помилка під час рендерингу." / "Unknown error during rendering."), `uiErrorResetBtn` ("Скинути локальні дані та перезавантажити" / "Reset local data and reload").
- **`App.tsx`**:
  - Замінити 3 тернарні вирази (`tagAlreadyPinned`, `tagPinnedSuccess`, `livePreviewDisabledHint`) на ключі з `uk.ts` та `en.ts`.

---

## Етап 2.4: Фінальна автоматична перевірка
- Запустити `npx tsx fix_test_patcn/audit_localization.ts` для підтвердження:
  1. Відсутності розбіжностей між `uk.ts` та `en.ts` (`missing vs uk: 0`).
  2. Відсутності захардкоджених UI-рядків та конструкцій `lang === 'uk' ? ... : ...` у компонентах і хуках.
- Перевірити збірку через `compile_applet` та `lint_applet`.
