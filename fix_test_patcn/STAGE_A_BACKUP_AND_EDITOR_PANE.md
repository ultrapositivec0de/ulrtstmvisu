# ЕТАП A: Резервна копія App.tsx та ліквідація `editorPaneProps`
**Статус:** `[x] Виконано успішно`  
**Пріоритет:** 1  
**Цільовий модуль:** `src/App.tsx`, `src/hooks/useEditorPaneProps.ts`, `src/components/screens/EditorScreen.tsx`, `src/components/editor/EditorPane.tsx`  
**Результати:** Створено резервну копію `fix_test_patcn/App.tsx.pre_stage_a.bak`, декомпозовано збирання об'єкта `editorPaneProps` через хук-фасад `useEditorPaneProps`, `EditorScreenProps` підтримує опціональний `editorPaneProps?`, автоматизований тест `test_stage_a_editor_pane.ts` пройдено, збірка та лінтер без помилок.

---

## 1. Мета та опис етапу
Здійснено перший крок прямого скорочення `App.tsx`: створено резервну копію файлу для запобігання втрати даних, перевірено працездатність автономного споживання даних в `EditorPane`, підтверджено компіляцію та винесено логіку формування монолітного об'єкта `editorPaneProps` (123 властивості) у хук `useEditorPaneProps`.

---

## 2. Покроковий звіт виконання

### Крок A.1: Створення резервної копії та підготовка середовища
- [x] Створено безпечну резервну копію `fix_test_patcn/App.tsx.pre_stage_a.bak` (відповідно до правил `RULE[AGENTS_md]`).
- [x] Перевірено, що всі властивості `EditorPaneProps` мають робочі значення за замовчуванням або беруться безпосередньо з `useEditorStore` / `useDeviceStore`.
- [x] **Чекпоінт A.1:** `npx tsc --noEmit` — валідація відсутності розривів типізації (успішно).

### Крок A.2: Переведення `EditorScreen` та `EditorPane` на прямий інтерфейс
- [x] У `src/components/screens/EditorScreen.tsx` зроблено монолітний об'єкт `editorPaneProps?` опціональним з безпечним поширенням.
- [x] Забезпечено пряму передачу тільки необхідних рефів і обробників подій.
- [x] **Чекпоінт A.2:** `compile_applet` + `lint_applet` — підтвердження успішної збірки без регресій (успішно).

### Крок A.3: Інкапсуляція `editorPaneProps` у хук-фасад
- [x] Створено та підключено `src/hooks/useEditorPaneProps.ts` з чистою мемоізацією та чистою функцією `buildEditorPaneProps`.
- [x] Підключено `useEditorPaneProps` у `src/App.tsx`.
- [x] **Чекпоінт A.3:** Запуск автоматизованого тесту `fix_test_patcn/test_stage_a_editor_pane.ts` + `compile_applet` + `lint_applet` (100% успішно, 0 помилок).

---

## 3. Критерії приймання та верифікація
1. Резервну копію `App.tsx` збережено у `fix_test_patcn/App.tsx.pre_stage_a.bak`.
2. Об'єкт `editorPaneProps` ізольовано та безпечно підключено через хук-фасад.
3. Всі функції редактора (WYSIWYG, Markdown, живий перегляд, гарячі клавіші) зберегли 100% працездатність.
4. `compile_applet` та `lint_applet` завершуються з 0 помилок.
