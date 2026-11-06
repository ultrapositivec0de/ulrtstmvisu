# Етап 0: Резервне копіювання та Базова Модульна Архітектура Zustand

## 1. Мета та Контекст
- Забезпечити 100% збереження робочого стану системи через резервні копії ключових монолітів.
- Розгорнути розширювану модульну структуру Zustand-сховищ (`src/store/` або `src/stores/`), яка підтримуватиме як поточні вимоги (модалки, інтерфейс, редактор), так і майбутні потреби (рідер, аудіо, профіль користувача, черга публікацій).
- **Складність:** Низька (Low risk, foundation step).
- **Оцінка холостого ходу (контекст):** ~500-800 токенів на підключення одного стору.

---

## 2. Мікрокроки реалізації

### Мікрокрок 0.1: Створення контрольних бекапів (Backup Verification)
- Створити актуальні копії:
  - `src/App.tsx.backup_pre_refactor`
  - `src/components/editor/EditorPane.tsx.backup_pre_refactor`
  - `src/components/Reader.tsx.backup_pre_refactor`
- Зафіксувати статус у репозиторії без впливу на збірку.

### Мікрокрок 0.2: Організація модульної архітектури Zustand (`src/stores/`)
- Перевірити існуючий `src/stores/useHistoryStore.ts` та уніфікувати структуру:
  ```
  src/stores/
  ├── index.ts                # Централізований експорт усіх сторів та селекторів
  ├── useModalStore.ts        # Керування відкриттям/закриттям усіх модалок та попапів
  ├── useAppUIStore.ts        # Мобільні таби, позиції панелей, теми, масштабування
  ├── useEditorStore.ts       # Стан виділення, режим фокусу, інструменти редактора
  ├── useReaderStore.ts       # Підготовчий зріз для рідера (поточний допис, фільтри)
  └── [future] useProfileStore.ts / useAudioStore.ts
  ```
- Кожен стор проектується з дотриманням селекторної оптимізації (shallow re-renders) та строгої типізації TypeScript.

### Мікрокрок 0.3: Створення `useModalStore.ts`
- Винести керування станом модальних діалогів:
  - `isSettingsOpen`, `settingsTab`
  - `isPublishOpen`, `pubLog`
  - `isAuthOpen`
  - `isAudioPresetsModalOpen`
  - `isTableSelectorOpen`, `tableSelectorPos`
  - `isMiniGalleryOpen`, `isPexelsOpen`
  - `isMentionsOpen`, `isDraftsOpen`
- Методи: `openModal(name, params)`, `closeModal(name)`, `closeAllModals()`.

### Мікрокрок 0.4: Перевірка валідності та збірки
- Запуск `compile_applet` та `lint_applet` для гарантування відсутності помилок типізації.
