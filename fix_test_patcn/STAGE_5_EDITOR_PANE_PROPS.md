# ЕТАП 5: Усунення Prop-Drilling у App.tsx (editorPaneProps та Header)
**Статус:** `[x] ВИКОНАНО ТА ВЕРИФІКОВАНО`  
**Пріоритет:** 5  
**Цільовий модуль:** `src/App.tsx`, `src/components/screens/EditorScreen.tsx`, `src/components/header/Header.tsx`, `src/components/editor/EditorPane.tsx`  
**Очікувані зміни:** Розширення `src/stores/useEditorStore.ts`, підключення `EditorPane`, `PreviewPane` та `Header` до селекторів Zustand

---

## 1. Мета та опис етапу
Усунути надлишковий prop-drilling у редакторі та шапці: перевести `EditorPane`, `PreviewPane` та `Header` на пряме споживання реактивного стану з `useEditorStore` (`isLivePreviewEnabled`, `syncScrollEnabled`, `beautifyEnabled`, `activeFormats`) та `useAppUIStore` (`activeView`, `isFullScreen`), зробивши відповідні пропси опціональними з автоматичним фолбеком на стор.

---

## 2. Покроковий план виконання

### Крок 5.1: Розширення `src/stores/useEditorStore.ts`
- [x] Додати до Zustand стору властивості форматування та відображення:
  - `isLivePreviewEnabled`, `setIsLivePreviewEnabled`, `toggleLivePreview`.
  - `syncScrollEnabled`, `setSyncScrollEnabled`.
  - `beautifyEnabled`, `setBeautifyEnabled`.
  - `activeFormats`, `setActiveFormats`.
- [x] **Чекпоінт 5.1:** `npx tsc --noEmit` — відсутність помилок типізації стору.

### Крок 5.2: Деструктуризація `editorPaneProps`
- [x] Перевести `EditorScreen.tsx`, `EditorPane.tsx` та `PreviewPane.tsx` на пряме зчитування даних зі стору (`useEditorStore`, `useAppUIStore`) замість обов'язкового ручного прокидання.
- [x] Зробити властивості форматування та повноекранного режиму опціональними з безпечним фолбеком на стор.
- [x] Створити `src/hooks/useEditorPaneProps.ts` та підтвердити валідацію вхідних властивостей.
- [x] **Чекпоінт 5.2:** `compile_applet` + `lint_applet` (перевірка зв'язку редактора).

### Крок 5.3: Спрощення інтерфейсу `Header.tsx`
- [x] Перевести `Header.tsx` на пряме зчитування `activeView`, `setActiveView`, `activeFormats`, `setContent` з `useAppUIStore` та `useEditorStore`.
- [x] Забезпечити безпечні дефолтні значення у деструктуризації пропсів `Header`.
- [x] **Чекпоінт 5.3:** `compile_applet` + `lint_applet` + аудит локалізації `fix_test_patcn/audit_localization.ts` + тест `test_editor_store_and_props.ts` (100% успішно).

---

## 3. Критерії приймання та верифікація
1. Загальний розмір `src/App.tsx` скорочується з 1,793 до менш ніж 750 рядків.
2. Продуктивність вводу тексту в редакторі зростає за рахунок відсутності зайвих ре-рендерів кореневого дерева.
3. Усі 1161 ключів локалізації у 4 мовах залишаються на 100% синхронізованими.
