# ЕТАП E: Композиційна оптимізація фасадних бандлів пропсів
**Статус:** `[x] Виконано успішно`  
**Пріоритет:** 1  
**Цільові модулі:** `src/hooks/useSidebarProps.ts`, `src/hooks/useEditorPaneProps.ts`, `src/hooks/useModalsProps.ts`, `src/App.tsx`  
**Очікуване скорочення:** -358 рядків (фактично скорочено з 1,539 до 1,335 рядків, лінтер і компілятор пройдені)  

---

## 1. Мета та опис
Навчити створені фасадні хуки приймати вже наявні доменні об'єкти хуків (`gallery`, `auth`, `editorEvents`, `editorFormat`, `tableOps`, `wysiwygSync`, `pwa`, `postSettings`, `draftsManager`, `publishingQueue`, `publishingManager`, `appBackup`, `themeAndStyles`, `appUI`), замість ручного розгортання та перерахування окремих властивостей у `App.tsx`.

---

## 2. Покроковий план виконання

### Крок E.1: Композиційний `useSidebarProps`
- [x] Створено композиційний варіант `useSidebarProps({ gallery, auth, ... })`.
- [x] Створено та виконано перевірочний тест у `fix_test_patcn/test_stage_e1_sidebar.ts`.
- [x] Скорочено виклик у `App.tsx` з 75 до 12 рядків.
- [x] **Чекпоінт E.1:** `compile_applet` + `lint_applet` (0 помилок).

### Крок E.2: Композиційний `useEditorPaneProps`
- [x] Навчено `useEditorPaneProps` приймати доменні пакети (`editorEvents`, `editorFormat`, `tableOps`, `wysiwygSync`, `modeManager`, `floatingWidget`, `gallery`).
- [x] Створено та пройдено перевірочний тест у `fix_test_patcn/test_stage_e2_editor_pane.ts`.
- [x] Замінено 124-рядковий виклик у `App.tsx` на компактний композиційний виклик.
- [x] **Чекпоінт E.2:** `compile_applet` + `lint_applet` (0 помилок).

### Крок E.3: Композиційний `useModalsProps`
- [x] Навчено `useModalsProps` приймати об'єкти доменних хуків (`auth`, `postSettings`, `draftsManager`, `publishingQueue`, `publishingManager`, `tableOps`, `appBackup`, `gallery`, `pwa`, `themeAndStyles`, `appUI`, `floatingWidget`, `appPublishing`).
- [x] Створено перевірочний тест у `fix_test_patcn/test_stage_e3_modals.ts` (100% assertions passed).
- [x] Після перевірки замінено 159-рядковий виклик у `App.tsx` на компактний виклик.
- [x] **Чекпоінт E.3:** `compile_applet` + `lint_applet` (0 помилок).

---

## 3. Критерії приймання
1. Жодних функціональних або типізаційних регресій.
2. Ручне перерахування 358 полів видалено з `App.tsx`.
3. `compile_applet` та `lint_applet` проходять з 0 помилок.
