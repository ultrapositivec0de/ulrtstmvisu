# Звіт глибокого аудиту цілісності коду після рефакторингу (Stages A–H)

**Дата аудиту:** 2026-11-14  
**Обсяг перевірки:** 180 файлів `.ts` / `.tsx` у `src/` та порівняння з дорефакторним знімком `fix_test_patcn/App.tsx.pre_stage_a.bak` (1742 рядки → 330 рядків у `src/App.tsx`).  
**Діагностичні скрипти та сирі дані (збережено в `./fix_test_patcn/`):**
1. `fix_test_patcn/audit_refactoring_integrity.ts` → `fix_test_patcn/audit_refactoring_raw.json` (AST-сканування через TypeScript Compiler API: заглушки `() => {}` / `() => null` / identity, невідповідність деструктуризації пропсів, split-brain станів, паритет із `App.tsx.pre_stage_a.bak`).
2. `fix_test_patcn/audit_deep_wiring.ts` → `fix_test_patcn/audit_deep_wiring_raw.json` (перевірка повернень доменних хуків, зв’язування дочірніх модальних вікон у `AppModals.tsx`, трасування `activeFormats`).
3. `fix_test_patcn/audit_remaining_checks.ts` → `fix_test_patcn/audit_remaining_raw.json` (паритет `localStorage.getItem` / `setItem`, повна карта звернень до Zustand store-ів, перевірка fallback-ів у `useModalsProps.ts` і `HeaderProps`, аудит `addEventListener`).

---

## Короткий висновок (Executive Summary)

Під час модульної декомпозиції `App.tsx` у композиційні хуки (`useEditorCore`, `useWorkspaceServices`, `useAppWorkspaceSuite`, `useEditorPaneProps`, `useModalsProps`) частина пропсів була замінена тимчасовими заглушками, втрачена під час передачі між хуками або підключена до паралельних станів (split-brain між локальним `useState` та Zustand store).

Загалом виявлено:
- **3 критичні функціональні регресії** (повністю непрацюючі функції в UI).
- **3 проблеми розщеплення стану (Split-Brain)**, через які UI відображає застарілий стан або не реагує на зміни.
- **2 дефекти збереження налаштувань у `localStorage`** (зокрема друкарська помилка в ключі).
- **Кілька безпечних/мертвих заглушок і застарілих пропсів інтерфейсів**, які варто прибрати для чистоти архітектури.

*(Примітка: проблему кнопки логотипа `#header-logo-button` / `QuickStyleMenu` уже було виправлено до цього аудиту; повторна перевірка підтвердила, що її маршрутизація та кнопки всередині `QuickStyleMenu.tsx` працюють коректно.)*

---

## 1. Критичні зламані функції (Runtime Failures)

### 1.1. Повністю не працює вставка (Paste) тексту та HTML у візуальному режимі + 5 суміжних заглушок в `useEditorPaneProps.ts`
- **Локалізація:**
  - `src/hooks/useEditorPaneProps.ts:281-287, 293`
  - `src/components/editor/EditorPane.tsx:468-473, 556-557`
  - `src/components/editor/WysiwygCanvas.tsx:65-136`
- **Причина:** У функції `buildEditorPaneProps` (`src/hooks/useEditorPaneProps.ts`) замість реальних утиліт були зашиті порожні заглушки:
  - `getMarked: () => null` (рядок **286**)
  - `isImageAndProxyUrl: () => false` (рядок **281**)
  - `htmlToMarkdown: (html: string) => html` (рядок **284**)
  - `convertBareImageUrlsToMarkdown: (text: string) => text` (рядок **285**)
  - `setContent: () => {}` (рядок **287**)
  - `getMiniGalleryBottomStyle: () => undefined` (рядок **293** — не впливає на UI, бо `MiniGalleryStrip.tsx:5` імпортує функцію напряму)
- **Механізм поломки:**
  1. У `WysiwygCanvas.tsx:65-66` обробник `onPaste` викликає `e.preventDefault()`, блокуючи стандартну вставку браузера.
  2. На рядку **100-101** він виконує:
     ```ts
     const m = getMarked();
     if (!m) return;
     ```
     Оскільки `getMarked` завжди повертає `null`, функція **тихо завершує роботу**, і жоден текст чи HTML з буфера обміну не вставляється.
  3. Навіть після відновлення `getMarked`, через `isImageAndProxyUrl: () => false` вставка URL зображень/проксі не створить `<img>`, через `htmlToMarkdown: (html) => html` багатий HTML не очиститься через конвертер, а `convertBareImageUrlsToMarkdown: (text) => text` не перетворить голі посилання на зображення в Markdown.
  4. Заглушка `setContent: () => {}` передається у `TamedWidget` (`EditorPane.tsx:557`).
- **До рефакторингу (`App.tsx.pre_stage_a.bak:13, 16, 1460-1465`):** передавались реальні імпорти з `../lib/editorSync` (`htmlToMarkdown`, `convertBareImageUrlsToMarkdown`, `isImageAndProxyUrl`), `getMarked` з `../utils/markdownParser` та `setContent` з `useEditorStore`.

---

### 1.2. Повністю відключена кнопка вставки таблиці (`Table`) і спливаюче вікно `TableSelectorPopup`
- **Локалізація:**
  - `src/App.tsx:91, 103-104`
  - `src/hooks/useEditorCore.ts:233-275`
  - `src/hooks/useWorkspaceServices.ts:147, 357`
  - `src/hooks/useAppWorkspaceSuite.ts:637-638`
  - `src/components/editor/toolsMap.tsx:91`
  - `src/components/modals/AppModalsHost.tsx:175-183`
- **Причина:** Стан `[showTableSelector, setShowTableSelector] = useState(false)` створено в `src/App.tsx:91` і передано **тільки** у `useAppUI(...)` (для обробки клавіші `Escape`). Ні `useEditorCore`, ні `useWorkspaceServices`, ні `useAppWorkspaceSuite` його з `App.tsx` не отримують.
- **Механізм поломки:**
  1. `useWorkspaceServices.ts:147` намагається витягнути `setShowTableSelector` з `editorCore` і передає його у `createToolsMap` (рядок **357**).
  2. `useAppWorkspaceSuite.ts:637-638` передає `showTableSelector: editorCore.showTableSelector` і `setShowTableSelector: editorCore.setShowTableSelector` в `modalsHostProps`.
  3. Оскільки `useEditorCore` **не повертає** ці два поля, обидва значення дорівнюють `undefined`.
  4. Натискання кнопки таблиці в `Header` або `TamedWidget` викликає `setShowTableSelector(prev => !prev)` (`toolsMap.tsx:91`), що падає з помилкою `TypeError: setShowTableSelector is not a function`, а `<TableSelectorPopup>` отримує `showTableSelector={undefined}`.

---

### 1.3. Міні-галерея (`MiniGalleryStrip`) прив’язана не до того стану (ігнорує кнопку `Gallery` та кнопку закриття `X`)
- **Локалізація:**
  - `src/hooks/useWorkspaceEditorState.ts:57`
  - `src/hooks/useEditorPaneProps.ts:214`
  - `src/hooks/useAppWorkspaceSuite.ts:217-218, 370-444`
  - `src/components/editor/toolsMap.tsx:163`
  - `src/components/editor/EditorPane.tsx:509-511`
- **Причина:** У `useWorkspaceEditorState.ts:57` створено правильний стан `[isMiniGalleryOpen, setIsMiniGalleryOpen]`. Кнопка `'Gallery'` у `toolsMap.tsx:163` перемикає `setIsMiniGalleryOpen(prev => !prev)`, а кнопка закриття `X` у `MiniGalleryStrip` викликає `setIsMiniGalleryOpen(false)`. Проте:
  - `useAppWorkspaceSuite.ts:370-444` передає в `useEditorPaneProps` лише `setIsMiniGalleryOpen`, але **не передає** `isMiniGalleryOpen`.
  - `useEditorPaneProps.ts` взагалі не має `isMiniGalleryOpen` у `CompositeEditorPanePropsInput` і на рядку **214** жорстко підставляє:
    ```ts
    isMiniGalleryOpen: gallery.isGalleryCollapsed === false,
    ```
- **Наслідок:** Перемикання міні-галереї через тулбар (`TOOLS_MAP['Gallery']`) чи закриття через хрестик `MiniGalleryStrip` нічого не змінює — видимість смуги міні-галереї керується виключно тим, чи розгорнута галерея у бічному сайдбарі (`gallery.isGalleryCollapsed`).

---

## 2. Розщеплення стану ("Split-Brain") та розсинхронізація

### 2.1. `Header` → `setSettingsTab` пише в інший store, ніж читає `SettingsModal`
- **Локалізація:**
  - `src/hooks/useAppWorkspaceSuite.ts:502-555`
  - `src/components/header/Header.tsx:127, 172, 762`
  - `src/hooks/useWorkspaceEditorState.ts:64`
  - `src/stores/useAppUIStore.ts:13, 47`
- **Причина:** `headerProps` у `useAppWorkspaceSuite.ts` не передає `setSettingsTab` до `Header`. Через це `Header.tsx:172` падає на fallback `storeSetSettingsTab` із `useAppUIStore`. Водночас `AppModals` / `SettingsModal` отримують `settingsTab` і `setSettingsTab` з локального `useState` у `useWorkspaceEditorState.ts:64`.
- **Наслідок:** При кліку на іконку налаштувань (шестерню) у `Header.tsx:762` (`setSettingsTab('general'); setActiveModal('settings');`), змінюється мертве поле `useAppUIStore.settingsTab`, а `SettingsModal` відкривається на попередній вкладці (наприклад, `about` або `vault`).

---

### 2.2. Потрійне розщеплення `activeFormats` (індикатори форматування в `Header` не працюють, скидання при зміні режиму пише "в пустоту")
- **Локалізація:**
  - `src/hooks/useEditorCore.ts:64, 97, 259-260`
  - `src/hooks/useEditorFormat.ts:40, 1592-1593`
  - `src/hooks/useEditorModeManager.ts:118, 334`
  - `src/hooks/useAppWorkspaceSuite.ts:502-555`
  - `src/components/header/Header.tsx:128, 147, 330-335, 363, 406-411, 429`
  - `src/stores/useEditorStore.ts:145-151`
- **Причина:** Зараз існують 3 ізольовані копії `activeFormats`:
  1. **Копія А (`useEditorCore.ts:64`):** `const [activeFormatsState, setActiveFormatsState] = useState(...)` передається в `useEditorModeManager` (рядок 97). Коли `modeManager` скидає або оновлює активні формати при зміні режиму (`visual` ↔ `markdown` ↔ `reading`), він змінює саме `activeFormatsState`, який **ніхто більше не читає**.
  2. **Копія Б (`useEditorFormat.ts:40`):** `useEditorFormat` створює власний `[activeFormats, setActiveFormats]`, який отримують `wysiwygSync`, `editorEvents`, `EditorPane` і `TamedWidget`. Тому зміни з `modeManager` не доходять до `EditorPane`/`TamedWidget`.
  3. **Копія В (`useEditorStore.ts:145`):** Zustand store має `activeFormats: {}` і `setActiveFormats`, але `setActiveFormats` **ніде не викликається** (`unusedSetters`). Оскільки `headerProps` в `useAppWorkspaceSuite.ts` не передає `activeFormats` до `Header`, компонент `Header.tsx:147` бере значення зі стору (`{}`).
- **Наслідок:** У верхньому `Header` (як у десктопній панелі, так і в мобільному випадаючому меню інструментів) підсвічування активних тегів (`B`, `I`, `S`, `sub`, `sup`, `Color`, `Inline`) **завжди вимкнене**.

---

### 2.3. Паралельні стани в Zustand stores vs локальних `useState` (ризик подальшого роз’їзду)
Перевірка всіх store-ів (`src/store/*` та `src/stores/*`) показала такі дублікати:
- **`useEditorStore.ts` vs `useWorkspaceEditorState.ts`:**
  - `isLivePreviewEnabled` / `toggleLivePreview` / `setIsLivePreviewEnabled`
  - `syncScrollEnabled` / `setSyncScrollEnabled`
  - `beautifyEnabled` / `setBeautifyEnabled`
  Наразі `EditorPane` та `PreviewPane` отримують пропси з `editorState`, тому користуються ними, але мають fallback-и на `useEditorStore` (де значення не оновлюються).
- **`useModalStore.ts` vs `App.tsx` / `usePwaAndNotifications.ts` / `useWorkspaceEditorState.ts`:**
  - `isSMenuOpen` існує одночасно в `useModalStore` та `useWorkspaceEditorState` (синхронізовано обхідним шляхом у `Header.tsx:253-254` та `AppModals.tsx:576-580`).
  - Поля `showPwaBanner`, `showPwaInstructionsModal`, `isAudioPresetsModalOpen`, `isAccountPromptModalOpen`, `isTableSelectorOpen` у `useModalStore` не використовуються — замість них працюють локальні `useState`.
- **`useAppUIStore.ts`:** `settingsTab` (оновлюється тільки при кліку з `Header`, ніде не читається), `toggleSidebar` (не викликається).

---

## 3. Дефекти збереження стану в `localStorage`

### 3.1. Друкарська помилка в ключі `steem_ondemand_sync` vs `steem_on_demand_sync`
- **Локалізація:**
  - Читання: `src/hooks/useWorkspaceEditorState.ts:60` → `localStorage.getItem('steem_ondemand_sync')`
  - Запис: `src/components/editor/EditorTopBar.tsx:203` → `localStorage.setItem('steem_on_demand_sync', String(next))`
- **Наслідок:** При натисканні кнопки синхронізації на вимогу в `EditorTopBar` значення пишеться в один ключ, а при перезавантаженні сторінки читається інший. Налаштування завжди скидається у `false`.

### 3.2. Пропущене збереження при перемиканні окремих тумблерів
- **`PreviewPane.tsx:82` (`syncScrollEnabled`):** Клік на кнопку синхронної прокрутки в `PreviewPane` викликає лише `handleSetSyncScroll(!syncScroll)`, не записуючи `localStorage.setItem('steem_sync_scroll', ...)` (на відміну від `SettingsModal.tsx:397`, де запис є).
- **`SettingsModal.tsx:222` (`performanceMode`):** Клік по перемикачу Performance Mode у `SettingsModal` викликає `setPerformanceMode(!performanceMode)` без запису в `steem_performance_mode` (тоді як `Sidebar.tsx:436` та `KeysModal.tsx:578` роблять `localStorage.setItem`).
- **Рекомендація:** Винести `useEffect` синхронізації в `useWorkspaceEditorState.ts` для `performanceMode`, `onDemandSyncEnabled`, `syncScrollEnabled`, `beautifyEnabled` (так само, як там вже зроблено для `isLivePreviewEnabled`), щоб не дублювати `localStorage.setItem` у кожному UI-компоненті.

---

## 4. Безпечні/мертві пропси та некритичні знахідки (False Positives / Tech Debt)

Наступні розбіжності були перевірені скриптами й кодом — **вони НЕ спричиняють збоїв зараз**, але залишаються технічним боргом:

| Елемент | Де виявлено | Статус та пояснення |
|---|---|---|
| `TamedWidget.tsx:279-280` (`Img`, `Gallery` → `() => {}`) | `fallbackToolsMap` | Безпечно, оскільки `EditorPane.tsx:530` завжди передає `toolsMap={TOOLS_MAP}`. Проте у fallback-режимі ці 2 кнопки не працюватимуть. |
| `SplitPostModal.tsx` (`wordsCount` не передано з `AppModals.tsx:525`) | `AppModals.tsx` | Безпечно: `SplitPostModal.tsx:25-26` бере запасне значення з `useEditorStore(state => state.stats?.words || 0)`. |
| `SettingsModal.tsx:92, 94` (`clearAllImages?`, `clearAllTemplates?`) | `SettingsModalProps` | Застарілі опціональні поля інтерфейсу — ніде всередині компонента не деструктуруються і не викликаються. |
| `Header.tsx` (`setActiveModal?`, `setContent?`, `saveFirst?`, `drafts?`) | `useAppWorkspaceSuite.ts:502` | `setActiveModal` та `setContent` коректно підхоплюються через fallback на `useModalStore` / `useEditorStore`. `saveFirst` і `drafts` у `HeaderProps` фактично не використовуються (в JSX `Header:721` є локальна змінна `saveFirst`). |
| `useModalsProps.ts` fallback-и (`?? (() => {})`) | `useModalsProps.ts` | Верифіковано всі доменні пакети (`useSteemAuth`, `usePostSettings`, `useDrafts`, `useSteemQueue`, `usePublishingManager`, `useTableOperations`, `useAppBackup`, `useSteemGallery`, `usePwaAndNotifications`, `useThemeAndStyles`, `useAppUI`, `useFloatingWidgetState`, `useAppPublishing`): усі реальні поля передаються й не падають на `() => {}`. |
| Event listeners (`beforeunload`, `selectionchange`, `keydown`, `mousedown`) | `App.tsx.pre_stage_a.bak` vs `src/hooks/` | Усі 5 глобальних слухачів з `App.tsx.pre_stage_a.bak` коректно перенесені у `useEditorShortcutsAndAutosave.ts`, `useWindowInteractions.ts`, `useAppUI.ts`. |
| `steem_save_pexels_unencrypted` / `steem_editor_source_links` | `KeysModal.tsx:149`, `useSteemGallery.ts:119` | Legacy-ключі для зворотної сумісності міграції при читанні; безпечно. |

---

## 5. План виправлень (Checklist для наступного етапу)

1. **`src/hooks/useEditorPaneProps.ts`** (відновлення вставки в Visual Mode та усунення заглушок):
   - Імпортувати реальні `htmlToMarkdown`, `convertBareImageUrlsToMarkdown`, `isImageAndProxyUrl` з `../lib/editorSync`, `getMarked` з `../utils/markdownParser`, а `setContent` передавати з `useEditorStore.getState().setContent` (або параметром із `useAppWorkspaceSuite`).
   - Додати `isMiniGalleryOpen: boolean` у `CompositeEditorPanePropsInput`, передати його з `useAppWorkspaceSuite.ts:370` і замінити рядок `isMiniGalleryOpen: gallery.isGalleryCollapsed === false` на `isMiniGalleryOpen`.
   - Видалити мертву заглушку `getMiniGalleryBottomStyle: () => undefined` з `EditorPaneProps` та `useEditorPaneProps.ts`.
2. **`src/App.tsx` / `src/hooks/useEditorCore.ts` / `src/hooks/useAppUI.ts`** (відновлення кнопки Table та `TableSelectorPopup`):
   - Перенести `[showTableSelector, setShowTableSelector]` або у `useEditorCore` (з поверненням назовні, щоб `useWorkspaceServices` і `useAppWorkspaceSuite` бачили його там і передавали в `useAppUI`), або передати в `useWorkspaceServices` та `useAppWorkspaceSuite` напряму з `App.tsx` / `useModalStore`.
3. **`src/hooks/useEditorCore.ts` + `src/hooks/useAppWorkspaceSuite.ts`** (усунення split-brain `activeFormats` і `settingsTab`):
   - Прибрати зайвий `activeFormatsState` у `useEditorCore.ts:64` і передати в `useEditorModeManager` реальний `setActiveFormats` через `setActiveFormatsRef` (або передавати `editorFormat.setActiveFormats` / винести `activeFormats` у `useEditorStore` як єдине джерело правди).
   - Додати `activeFormats: editorCore.activeFormats` та `setSettingsTab` у `headerProps` (`src/hooks/useAppWorkspaceSuite.ts:502-555`).
4. **`src/hooks/useWorkspaceEditorState.ts` + `src/components/editor/EditorTopBar.tsx`** (`localStorage`):
   - Виправити ключ `steem_ondemand_sync` / `steem_on_demand_sync` до одного єдиного імені (і за потреби підтримати читання обох для міграції).
   - Додати `useEffect` збереження в `useWorkspaceEditorState.ts` для `performanceMode`, `onDemandSyncEnabled`, `syncScrollEnabled`, `beautifyEnabled`.
5. **Очищення мертвих пропсів/полів store** (за бажанням):
   - Прибрати невикористовувані поля з `useModalStore`, `useAppUIStore.settingsTab`, `SettingsModalProps` (`clearAllImages`, `clearAllTemplates`) та `HeaderProps` (`saveFirst`, `drafts`).
