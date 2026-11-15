# Етап 4: Консолідація `activeFormats` в єдине джерело правди (`useEditorStore`)

- **Складність:** 4/5 (Вище середньої — висока зв'язність хуків синхронізації та форматування)
- **Використання ресурсів:** Середнє (6–7 файлів: `useEditorStore.ts`, `useEditorFormat.ts`, `useEditorCore.ts`, `useEditorModeManager.ts`, `useEditorEvents.ts`, `useWysiwygSync.ts`, `useAppWorkspaceSuite.ts`)
- **Мета:** Прибрати 3 роз'єднані копії `activeFormats`, забезпечити живу підсвітку кнопок форматування в `Header` і `TamedWidget` та коректне скидання при зміні режиму редактора.

## Підкроки
1. **Строга типізація та ініціалізація у `src/stores/useEditorStore.ts`:**
   - Задати початкове значення `activeFormats`:
     `{ bold: false, italic: false, code: false, strikethrough: false, sub: false, sup: false, phishy: false }`.
   - Залишити сумісну підтримку функціонального updater `setActiveFormats(prev => ...)`.
2. **Підключити `useEditorStore` у ядро форматування:**
   - `src/hooks/useEditorFormat.ts:40`: замінити локальний `useState` на `activeFormats = useEditorStore(s => s.activeFormats)` і `setActiveFormats = useEditorStore(s => s.setActiveFormats)` (або `useEditorStore.getState().setActiveFormats` у колбеках, щоб уникнути зайвих залежностей `useCallback`).
   - `src/hooks/useEditorCore.ts:64, 80, 97, 190`: видалити зайвий `[activeFormatsState, setActiveFormatsState]` та передати реальний `setActiveFormats` із store у `useEditorModeManager`, `useWysiwygSync` (`setActiveFormatsRef`) та `useEditorEvents`.
   - `src/hooks/useEditorModeManager.ts`, `useEditorEvents.ts`, `useWysiwygSync.ts`: перевірити відсутність stale-замикань і збереження shallow-порівняння перед `setActiveFormats`, щоб не викликати зайвих ре-рендерів при переміщенні курсора.
3. **Підключити `Header` та UI:**
   - `src/hooks/useAppWorkspaceSuite.ts:502-555`: додати `activeFormats: editorCore.activeFormats` у `headerProps` (і `Header.tsx:128, 147` тепер також читає `useEditorStore.activeFormats`, тож проп і store-fallback завжди збігатимуться).

## Перевірка етапу
- `compile_applet` + `lint_applet` без помилок.
- У `Visual` і `Markdown` режимах переміщення курсора на жирний/курсивний/кодовий/червоний фрагмент одночасно підсвічує відповідні кнопки у `Header`, мобільному меню та `TamedWidget`.
- Перемикання `visual` ↔ `markdown` ↔ `reading` коректно оновлює/скидає `activeFormats`.
- Позначити Етап 4 `[x]` у генеральному плані.
