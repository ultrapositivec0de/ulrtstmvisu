# ЕТАП B: Декопулювання та скорочення пропсів Header (з 56 до < 12)
**Статус:** `[x] Виконано успішно`  
**Пріоритет:** 2  
**Цільовий модуль:** `src/components/header/Header.tsx`, `src/App.tsx` (рядки 1579–1636)  
**Результати:** Підключено селектори `useModalStore`, `useAppUIStore` та `useEditorStore` як прямі системні дефолти в `Header.tsx`. Поля `setIsSMenuOpen`, `activeFormats`, `setActiveModal`, `setSettingsTab` та `setContent` стали опціональними. Створено та виконано автоматизований тест `fix_test_patcn/test_stage_b_header.ts`. Очищено пропси у виклику `<Header />` у `src/App.tsx`. `compile_applet` та `lint_applet` — 0 помилок.

---

## 1. Мета та опис етапу
Усунути прямий проп-дрілінг у головній навігаційній панелі: скоротити кількість пропсів, що прокидаються через JSX з `App.tsx` у `<Header />`, перевівши кнопки форматування, теми, мови, шаблонів, черги та модалок на прямі селектори зі сховищ стану.

---

## 2. Покроковий план виконання

### Крок B.1: Автономізація форматних дій та глобальних стейтів у Header
- [x] Підключено `Header.tsx` напряму до:
  - `useEditorStore`: `activeFormats`, `setContent`.
  - `useAppUIStore`: `activeView`, `setActiveView`, `setSettingsTab`.
  - `useModalStore`: `setActiveModal`, `setIsSMenuOpen`.
- [x] **Чекпоінт B.1:** `npx tsc --noEmit` — валідація типізації оновленого `HeaderProps` (0 помилок).

### Крок B.2: Тестування автономного виклику Header
- [x] Створено тест `fix_test_patcn/test_stage_b_header.ts` для перевірки виклику `<Header />` з мінімальним набором пропсів.
- [x] Автоматизований тест 100% успішний (`npx tsx fix_test_patcn/test_stage_b_header.ts`).
- [x] **Чекпоінт B.2:** Автоматизований тест 100% успішний.

### Крок B.3: Очищення виклику `<Header />` у `src/App.tsx`
- [x] Видалено надлишкові пропси зі сторів (`setIsSMenuOpen`, `activeFormats`, `setActiveModal`, `setSettingsTab`, `setContent`) з JSX-блоку `<Header ... />` у `App.tsx`.
- [x] **Чекпоінт B.3:** `compile_applet` + `lint_applet` (0 помилок).

---

## 3. Критерії приймання та верифікація
1. Виклик `<Header />` у `src/App.tsx` очищено від надлишкових пропсів зі сторів.
2. Всі функції шапки (модалки, перемикання мови, збереження чернетки, швидкі інструменти) працюють без збоїв.
3. `compile_applet` та `lint_applet` — 0 помилок.
