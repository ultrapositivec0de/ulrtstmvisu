# План глобальної локалізації проєкту (i18n Migration Plan)

Цей документ містить результати автоматизованого аудиту кодової бази (`fix_test_patcn/audit_localization.ts`) та покроковий план перенесення всіх локальних/захардкоджених підписів, кнопок, підказок і повідомлень до глобальної системи локалізації (`src/locales/`).

---

## 1. Зведені результати скриптованого аудиту

Аудит просканував усі робочі `.ts` та `.tsx` файли проєкту (за винятком таблиць транслітерації та фізичних розкладок клавіатури) та словники у `src/locales/` (`uk.ts`, `en.ts`, `es.ts`, `ko.ts`).

### Виявлені категорії проблем (усього 441 входження у 60 файлах):
1. **Прямі захардкоджені українські рядки (`264` входження)**:
   - Повністю нелокалізовані підсистеми, створені нещодавно: `AudioControlWidget.tsx` (11), `AudioPresetsModal.tsx` (23), `src/services/audio/presets/*.ts` (34), `DocReaderSettingsMenu.tsx` (20), `DocReaderSourceDrawer.tsx` (16), `DocReaderToolbar.tsx` (8), `DocReaderTOC.tsx` (6), `useDocReader.ts` (5), `DocReaderContent.tsx` (3).
   - Модальні вікна та сповіщення: `TemplatesModal.tsx` (18), `SettingsModal.tsx` (16), `EditorPane.tsx` (16), `AboutModal.tsx` (13), `PublishModal.tsx` (10), `usePublishingManager.ts` (7), `useSteemQueue.ts` (7), `Header.tsx` (5), `NotificationToast.tsx` (3), `ErrorBoundary.tsx` (3).
   - Довідкові/контентні модулі: `src/data/changelog.ts` (23), `src/data/communities.ts` (1).
2. **Бінарні тернарні перевірки `lang === 'uk' ? '...' : '...'` (`74` входження)**:
   - Ігнорують інші мови (`es`, `ko`) та розмивають єдине джерело перекладів.
   - Найбільше у: `SettingsModal.tsx` (31), `PublishModal.tsx` (23), `EditorPane.tsx` (11), `TamedWidget.tsx` (3), `App.tsx` (3), `useAppBackup.ts` (2), `PreviewPane.tsx` (1).
3. **Запасні рядки `t('key') || 'Захардкоджений текст'` (`77` входжень)**:
   - Використовуються як тимчасовий фолбек у компонентах (`SettingsModal.tsx` — 14, `PwaInstructionsModal.tsx` — 9, `AboutModal.tsx` — 7, `KeysModal.tsx` — 7, `Header.tsx` — 5, `Sidebar.tsx` — 5, `AppModals.tsx` — 5 тощо).
   - **9 ключів**, що викликаються через `t('...')`, взагалі відсутні навіть у базовому `uk.ts`: `importBackup`, `exportBackup`, `success`, `usernameDesc`, `add`, `noMentions`, `noTagGroups`, `galleryGrid`, `textPlaceholder`.
4. **Захардкоджені англійські UI-атрибути (`title`, `placeholder`, `aria-label`) (`26` входжень)**:
   - `Header.tsx` (`title="Center"`, `title="Justify"`), `EditorPane.tsx`, `QuickStyleMenu.tsx`, `TagPresetsModal.tsx`, `TableSelectorPopup.tsx`, `BaseModal.tsx` (`aria-label="Close modal"`), `AccountPromptModal.tsx`.
5. **Розсинхронізація мовних словників (`src/locales/`)**:
   - `uk.ts`: **553** ключі.
   - `en.ts`: **507** ключів (**46 ключів відсутні** порівняно з `uk.ts`).
   - `es.ts`: **500** ключів (**54 ключі відсутні** порівняно з `uk.ts`).
   - `ko.ts`: **500** ключів (**54 ключі відсутні** порівняно з `uk.ts`).

---

## 2. Покроковий план реалізації переведення на глобальну локалізацію

### Етап 1: Синхронізація базових словників (`src/locales/uk.ts`, `en.ts`, `es.ts`, `ko.ts`)
- Додати у `uk.ts` 9 відсутніх ключів, які вже використовуються через `t(...)` (`importBackup`, `exportBackup`, `success`, `usernameDesc`, `add`, `noMentions`, `noTagGroups`, `galleryGrid`, `textPlaceholder`).
- Додати всі 46 відсутніх ключів у `en.ts` та 54 відсутні ключі у `es.ts` і `ko.ts`, щоб усі 4 мовні словники мали 100% ідентичний набір ключів.
- Очистити зайві конструкції `t('key') || '...'` у компонентах, де ключі вже гарантовано присутні в усіх словниках.

### Етап 2: Локалізація панелей редактора, хедера та плаваючого віджета
- **`src/components/editor/EditorPane.tsx` (31 входження)**:
  - Перенести підписи кнопок та підказки (`Читання`, `Зміст`, `Джерело`, режими синхронізації, меню інтервалів, лічильники `WPM` / швидкості читання) у глобальні словники.
- **`src/components/editor/TamedWidget.tsx` (6), `PreviewPane.tsx` (1), `toolsMap.tsx` (2), `TableSelectorPopup.tsx` (2), `LineComponent.tsx` (1)**:
  - Замінити всі `lang === 'uk' ? ... : ...` та захардкоджені підказки на виклики `t(...)`.
- **`src/components/header/Header.tsx` (16) та `Sidebar.tsx` (6)**:
  - Перенести захардкоджені заголовки (`Сповіщення`, `нових`, `Очистити`, `Порожньо`, `title="Center"`, `title="Justify"`) у словники.

### Етап 3: Повна локалізація режиму читання (`src/components/docReader/*`)
- Охоплює файли: `DocReaderSettingsMenu.tsx` (20), `DocReaderSourceDrawer.tsx` (16), `DocReaderToolbar.tsx` (8), `DocReaderTOC.tsx` (6), `useDocReader.ts` (5), `DocReaderContent.tsx` (3).
- Перенести назви тем читання (`Папір`, `Сепія`, `Ніч`), ширини колонки (`Книга`, `Стандарт`, `Повна`), сімейств шрифтів, панелі джерел документа, змісту (TOC) та підказок інструментів до `src/locales/*`.

### Етап 4: Локалізація аудіо-підсистеми та звукових пресетів (`src/components/audio/*`, `src/services/audio/*`)
- Охоплює файли: `AudioControlWidget.tsx` (11), `AudioPresetsModal.tsx` (23), `src/services/audio/presets.ts` (9), `src/services/audio/presets/*.ts` (15 файлів пресетів), `useTypingSound.ts` (1).
- Перенести всі елементи керування звуком (`Звук клавіш`, `Гучність`, `Екранний тач / кнопки`, `Оптимізація швидкості (WPM)`, `Швидкий вибір`, повідомлення імпорту/експорту JSON пресетів) до `src/locales/*`.
- Для пресетів (`presets/*.ts` та категорій у `presets.ts`) додати ключі локалізації назв і описів (`preset_<id>_name`, `preset_<id>_desc`, `preset_cat_<id>`), щоб назви та описи пресетів автоматично відображалися обраною мовою інтерфейсу.

### Етап 5: Локалізація модальних вікон (`src/components/modals/*`)
- **`SettingsModal.tsx` (63 входження)**:
  - Замінити всі 31 тернарні вирази `lang === 'uk' ? ... : ...` та 16 захардкоджених рядків (позиції віджета, розміри шрифту, описи налаштувань, бекапи) на ключі `t(...)`.
- **`PublishModal.tsx` (37 входжень)**:
  - Перенести форматування часу розкладу (`дн.`, `год.`, `хв.`, `Заплановано на:`), повідомлення валідації тегів та підказки у глобальні словники з підтримкою параметрів (`{days}`, `{hours}`, `{mins}`).
- **`TemplatesModal.tsx` (21), `AboutModal.tsx` (21), `PwaInstructionsModal.tsx` (10), `KeysModal.tsx` (8), `AppModals.tsx` (5), `QuickStyleMenu.tsx` (3), `TagGroupsModal.tsx` (3), `DraftsModal.tsx` (2), `MentionsModal.tsx` (2), `SystemDialogModal.tsx` (2), `TagPresetsModal.tsx` (2), `BaseModal.tsx` (1), `AccountPromptModal.tsx` (1), `SplitPostModal.tsx` (1)**:
  - Перенести всі заголовки, підказки, плейсхолдери та тексти кнопок у `src/locales/*`.

### Етап 6: Локалізація системних хуків, тостів та довідкових даних (`src/hooks/*`, `src/components/common/*`, `src/data/*`)
- **Хуки (`usePublishingManager.ts`, `useSteemGallery.ts`, `useSteemQueue.ts`, `useAppBackup.ts`, `useEditorFormat.ts`, `useReaderBlockchainActions.ts`)**:
  - Замінити захардкоджені статуси публікації (`Перевірка PIN-коду...`, повідомлення черги, помилки форматування та бекапу) на виклики глобального словника `getTranslation(lang, key)`.
- **Компоненти `NotificationToast.tsx` (4) та `ErrorBoundary.tsx` (3)**:
  - Локалізувати системні тости та екран аварійного відновлення (`ErrorBoundary`).
- **Довідкові дані (`src/data/changelog.ts`, `src/data/communities.ts`)**:
  - За потреби перевести опис спільнот та записи історії змін (`changelog.ts`) на багатомовну структуру або ключі локалізації.

### Етап 7: Автоматична верифікація
- Повторний запуск `npx tsx fix_test_patcn/audit_localization.ts` після кожного етапу для контролю зменшення кількості нелокалізованих рядків до `0` та перевірки 100% синхронізації ключів між `uk`, `en`, `es`, `ko`.
