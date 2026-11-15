# ЕТАП F: Винесення системних сповіщень та віконних взаємодій
**Статус:** `[x] Виконано успішно`  
**Пріоритет:** 2  
**Цільові модулі:** `src/hooks/useAppNotifications.ts`, `src/hooks/useWindowInteractions.ts`, `src/App.tsx`  
**Очікуване скорочення:** -150 рядків (фактично скорочено з 1,335 до 1,177 рядків, лінтер і компілятор пройдені)  

---

## 1. Мета та опис
Ізолювати низькорівневу логіку дедуплікації тостів, таймерів статусу операцій (`pubLog`), закріплення швидких тегів (`quickTags`), а також обробку кліків поза меню (`handleClickOutside`) та оптимізованого сховища (`saveLargeStorage`) в окремі хуки.

---

## 2. Покроковий план виконання

### Крок F.1: Хук системних сповіщень `useAppNotifications`
- [x] Створено `src/hooks/useAppNotifications.ts` (інкапсуляція `notify`, `pubLog`, `setPubLog`, `clearPubLogTimer`, `quickTags`, `pinTag`, `autoInbox`).
- [x] Створено перевірочний тест `fix_test_patcn/test_stage_f1_notifications.ts` (пройдено).
- [x] Підключено в `App.tsx` та видалено 94 рядки розрізнених локальних обробників (розмір скорочено до 1,241 рядка).
- [x] **Чекпоінт F.1:** `compile_applet` + `lint_applet` (0 помилок).

### Крок F.2: Хук віконних взаємодій `useWindowInteractions`
- [x] Створено `src/hooks/useWindowInteractions.ts` (інкапсуляція `handleClickOutside`, `getMotionConfig`, `getSidebarMotionConfig`, `saveLargeStorage`).
- [x] Створено перевірочний тест `fix_test_patcn/test_stage_f2_window.ts` (пройдено).
- [x] Підключено в `App.tsx` та видалено 64 рядки коду взаємодій (розмір скорочено до 1,177 рядків).
- [x] **Чекпоінт F.2:** `compile_applet` + `lint_applet` (0 помилок).

---

## 3. Критерії приймання
1. Сповіщення, таймери та взаємодія з вікнами працюють без збоїв.
2. `App.tsx` звільнено від допоміжної інфраструктурної логіки.
3. `compile_applet` та `lint_applet` проходять з 0 помилок.
