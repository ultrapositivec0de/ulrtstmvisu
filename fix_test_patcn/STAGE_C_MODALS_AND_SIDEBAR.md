# ЕТАП C: Ізоляція `modalsProps` та `sidebarProps` через стори
**Статус:** `[x] Виконано успішно`  
**Пріоритет:** 3  
**Цільовий модуль:** `src/App.tsx`, `src/hooks/useModalsProps.ts`, `src/hooks/useSidebarProps.ts`, `src/components/modals/AppModalsHost.tsx`, `src/components/sidebar/Sidebar.tsx`  
**Результати:** Створено модульні фасадні хуки `useModalsProps` та `useSidebarProps` із чистими валідаторами `buildModalsProps` та `buildSidebarProps` і повною мемоізацією. Бандли `modalsProps` (157 полів) та `sidebarProps` (66 полів) інкапсульовано та підключено в `src/App.tsx`. Створено та виконано тест `test_stage_c_modals_sidebar.ts`. `compile_applet` та `lint_applet` — 0 помилок.

---

## 1. Мета та опис етапу
Усунути два найбільші монолітні залишки проп-дрілінгу в `App.tsx`: гігантський об'єкт `modalsProps` (157 полів), що передається до хоста модалок `AppModalsHost`, та `sidebarProps` (66 полів), що передається до бічної панелі `Sidebar`. Забезпечити їх чисту декомпозицію, оптимізацію рендеру через селективну мемоізацію та підготовку до винесення інлайн-обробників.

---

## 2. Покроковий план виконання

### Крок C.1: Спрощення та фасадний хук для `modalsProps`
- [x] Створено `src/hooks/useModalsProps.ts` із чистою функцією збирання `buildModalsProps` та хуком `useModalsProps`.
- [x] Інкапсульовано залежності 157 властивостей модального набору (публікація, ключі, налаштування, бекапи, черга, чернетки).
- [x] **Чекпоінт C.1:** `npx tsc --noEmit` — відсутність помилок типізації модалок (успішно).

### Крок C.2: Спрощення та фасадний хук для `sidebarProps`
- [x] Створено `src/hooks/useSidebarProps.ts` із чистою функцією збирання `buildSidebarProps` та хуком `useSidebarProps`.
- [x] Інкапсульовано залежності 66 властивостей панелі сайдбару (галерея, акаунти, завантаження зображень, налаштування сітки).
- [x] **Чекпоінт C.2:** `compile_applet` + `lint_applet` (успішно).

### Крок C.3: Підключення фасадів у `src/App.tsx` та верифікація
- [x] Підключено `useModalsProps` та `useSidebarProps` у `src/App.tsx`.
- [x] Створено та успішно виконано автоматизований тест `fix_test_patcn/test_stage_c_modals_sidebar.ts`.
- [x] **Чекпоінт C.3:** `compile_applet` + `lint_applet` (0 помилок).

---

## 3. Критерії приймання та верифікація
1. Об'єкти `modalsProps` та `sidebarProps` ізольовано у відповідні фасадні хуки.
2. Усі модальні вікна (публікація, налаштування, ключі, сховище, черга) та галерея у сайдбарі зберегли 100% працездатність.
3. `compile_applet` та `lint_applet` проходять з 0 помилок.
