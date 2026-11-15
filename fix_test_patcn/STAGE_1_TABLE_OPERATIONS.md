# ЕТАП 1: Винесення операцій з таблицями з App.tsx
**Статус:** `[x] ВИКОНАНО ТА ВЕРИФІКОВАНО`  
**Пріоритет:** 1 (Початковий етап)  
**Цільовий модуль:** `src/App.tsx` (рядки 822–878, 1440–1443, 1520–1522, 1534)  
**Створені файли:** `src/utils/tableOperations.ts`, `src/hooks/useTableOperations.ts`, `fix_test_patcn/test_table_operations.cjs`

---

## 1. Мета та опис етапу
Звільнити `App.tsx` від процедурної логіки парсингу та модифікації Markdown- і HTML-таблиць. Винести функції додавання/видалення рядків та колонок, імпорту таблиць та керування контекстним меню виділеної таблиці у чистий модуль утиліт та окремий хук зі стейтом.

---

## 2. Покроковий план виконання

### Крок 1.1: Створення чистих утиліт таблиць (`src/utils/tableOperations.ts`)
- [x] Створено чисті типізовані функції `parseDelimitedTextToTable`, `convertMatrixToMarkdownTable`, `convertMatrixToHtmlTable`, `formatImportedTable`.
- [x] Створено автоматизований скрипт `fix_test_patcn/test_table_operations.cjs`.
- [x] **Чекпоінт 1.1:** Тести успішно виконано (100% тестів пройдено).

### Крок 1.2: Створення та розширення хука (`src/hooks/useTableOperations.ts`)
- [x] `useTableOperations` інкапсулює внутрішні стани: `tableImportText`, `tableImportFormat`, `tableSelectorPos`, `activeTable`, `tableRect`, `isTableMenuExpanded`, `isTableMenuPinned`.
- [x] Логіку `processTableImport` переведено на використання чистої утиліти `formatImportedTable`.
- [x] **Чекпоінт 1.2:** Повна типізація без помилок.

### Крок 1.3: Інтеграція в `src/App.tsx`
- [x] Видалено дублюючі `useState` з `App.tsx` (`tableSelectorPos`, `tableImportText`, `tableImportFormat`).
- [x] Всі табличні стани централізовано експортуються з `tableOps`.
- [x] **Чекпоінт 1.3:** `compile_applet` (успішно) + `lint_applet` (0 помилок).

---

## 3. Критерії приймання та верифікація
1. Усі операції з таблицями в редакторі працюють без змін у поведінці користувача (додавання рядка/колонки, видалення, імпорт HTML/MD).
2. `App.tsx` скоротився на ~75 рядків.
3. Код збірки та лінтера проходить без попереджень.
