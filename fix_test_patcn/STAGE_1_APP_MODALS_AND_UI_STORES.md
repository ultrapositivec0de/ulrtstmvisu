# Етап 1: Декомпозиція App.tsx та Винесення Модального Шару

## 1. Мета та Контекст
- Скоротити розмір монолітного `src/App.tsx` (1,885 рядків) до ~300-400 рядків чистого оркестратора.
- Звільнити компонент від 30+ розрізнених хуків `useState`, що відповідають за модальні вікна та UI-стани, перевівши їх у `useModalStore` та `useAppUIStore`.
- **Складність:** Середня (Medium complexity — вимагає збереження точних пропсів для діалогів).
- **Оцінка холостого ходу (контекст):** Зниження з ~18,700 токенів на кожне читання до ~3,000 токенів.

---

## 2. Мікрокроки реалізації

### Мікрокрок 1.1: Створення хоста модальних вікон (`src/components/modals/AppModalsHost.tsx`)
- Створити окремий ізольований компонент-хост, який підписується на `useModalStore`.
- Перенести з `App.tsx` рендеринг:
  - Settings Modal (з табами: загальні, галерея, сейф, ключі, про програму)
  - Publish Modal & Steem Queue Confirmation
  - Steem Auth / Key Login Modal
  - Audio Presets & Typing Sound Modal
  - Drafts / History Modal
  - Table Selector Popup
  - MiniGallery & Pexels Image Search Drawer
  - Import / Export JSON Backups Dialog
- Всі модалки використовують глобальні токени (`--modal-bg`, `--modal-border`, `BaseModal`) згідно з `RULE[AGENTS_md]`.

### Мікрокрок 1.2: Підключення `useAppUIStore` у `App.tsx`
- Перенести глобальні стани перегляду:
  - `activeMobileTab` ('editor' | 'preview')
  - `isWidgetVisible`, `widgetPos`, `widgetOpacity`, `widgetNoBorder`
  - `splitWords`, `syncScrollEnabled`, `isLivePreviewEnabled`
  - `performanceMode`
- Очистити `App.tsx` від прокидання колбеків відкриття/закриття через 5 рівнів компонентів.

### Мікрокрок 1.3: Виділення екранів (`EditorScreen.tsx` та `ReaderScreen.tsx`)
- Створити `src/components/screens/EditorScreen.tsx`:
  - Об'єднує робочу область редактора (EditorPane, PreviewPane/DocReader, Header, TamedWidget).
- Створити `src/components/screens/ReaderScreen.tsx`:
  - Ізолює перегляд глобальної стрічки/читача Steem Reader, передаючи параметри активного допису без перевантаження кореневого стану `App.tsx`.
- `App.tsx` тепер лише перемикає активний екран залежно від маршруту/режиму (`targetReaderPost`).

### Мікрокрок 1.4: Тестування та перевірка збірки
- Запуск `compile_applet` та `lint_applet`.
- Перевірка відкриття кожної модалки через глобальний стор без регресій.

---

## 3. Результати Виконання Етапу 1 [ВИКОНАНО]
1. Створено `src/components/modals/AppModalsHost.tsx` — централізований хост для всіх діалогів, статусів, аудіо-пресетів, табличних спливаючих вікон та сповіщень.
2. Створено `src/components/screens/ReaderScreen.tsx` — автономна ізоляція контейнера Steem Reader.
3. Створено `src/components/screens/EditorScreen.tsx` — автономний контейнер робочої області редактора (сайдбар, редактор, прев'ю, мобільний тулбар, статистика).
4. Рефакторинг `src/App.tsx`:
   - Видалено все пряме масивне рендерення модалок та панелей.
   - Підключено типізовані пакети пропсів `modalsProps`, `sidebarProps`, `editorPaneProps`.
   - Очищено невикористані імпорти.
5. Верифікація:
   - `compile_applet`: **Build succeeded**
   - `lint_applet`: **0 errors**, 8 warnings (попередні застарілі директиви)

