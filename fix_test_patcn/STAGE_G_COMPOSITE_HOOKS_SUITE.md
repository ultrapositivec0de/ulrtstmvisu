# ЕТАП G: Композиційні пакети хуків (EditorCore & PublishingSuite)
**Статус:** `[x] Виконано`  
**Пріоритет:** 3  
**Цільові модулі:** `src/hooks/useEditorCore.ts`, `src/hooks/useSteemPublishingSuite.ts`, `src/App.tsx`  
**Очікуване скорочення:** -430 рядків (зменшення розміру `App.tsx` з ~1,030 до ~600 рядків)  

---

## 1. Мета та опис
Зменшити кількість прямих викликів хуків у `App.tsx` (з понад 50 до < 15), об'єднавши тісно пов'язані хуки редактора у `useEditorCore`, а хуки блокчейну/публікації — у `useSteemPublishingSuite`.

---

## 2. Покроковий план виконання

### Крок G.1: Композиційний хук `useEditorCore`
- [x] Створено `src/hooks/useEditorCore.ts`: об'єднує `useEditorModeManager`, `useWysiwygSync`, `useEditorFormat`, `useEditorEvents`, `useTableOperations`.
- [x] Створено перевірочний тест `fix_test_patcn/test_stage_g1_editor_core.ts` (пройдено).
- [x] Інтегровано в `App.tsx` та згорнуто 137 рядків розпакування під-хуків (розмір скорочено до 1,040 рядків).
- [x] **Чекпоінт G.1:** `compile_applet` + `lint_applet` (0 помилок).

### Крок G.2: Композиційний хук `useSteemPublishingSuite`
- [x] Створено `src/hooks/useSteemPublishingSuite.ts`: об'єднує `useSteemQueue`, `usePostSettings`, `usePublishingManager`.
- [x] Створено перевірочний тест `fix_test_patcn/test_stage_g2_publishing_suite.ts` (пройдено).
- [x] Інтегровано в `App.tsx` (розмір скорочено до 999 рядків).
- [x] **Чекпоінт G.2:** `compile_applet` + `lint_applet` (0 помилок).

---

## 3. Критерії приймання
1. Чистий оркестратор без десятків проміжних рефів і селекторів.
2. `compile_applet` та `lint_applet` проходять з 0 помилок.
