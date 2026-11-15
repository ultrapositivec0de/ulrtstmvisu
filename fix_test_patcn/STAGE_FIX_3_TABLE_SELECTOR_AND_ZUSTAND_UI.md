# Етап 3: Уніфікація `TableSelector`, `settingsTab` та налаштувань редактора в Zustand

- **Складність:** 3/5 (Середня)
- **Використання ресурсів:** Помірне (6–8 файлів: stores, `useAppUI`, `useWorkspaceEditorState`, `useWorkspaceServices`, `useAppWorkspaceSuite`, `App.tsx`)
- **Мета:** Перевести розщеплені UI-стани (`showTableSelector`, `settingsTab`, `isLivePreviewEnabled`, `syncScrollEnabled`, `beautifyEnabled`) на єдине джерело правди у відповідних Zustand stores.

## Підкроки
1. **`showTableSelector` → `useModalStore` (єдине джерело правди):**
   - Перевірити `useModalStore.ts` (`isTableSelectorOpen`, `setIsTableSelectorOpen`); забезпечити підтримку функціонального updater `boolean | ((prev: boolean) => boolean)` для сумісності з `toolsMap.tsx:91` (`setShowTableSelector(prev => !prev)`).
   - `src/App.tsx:91`: видалити локальний `useState` `showTableSelector` і передачу в `useAppUI`.
   - `src/hooks/useAppUI.ts`: читати `isTableSelectorOpen` та `setIsTableSelectorOpen` напряму з `useModalStore` (для клавіші `Escape`).
   - `src/hooks/useWorkspaceServices.ts:147, 357`: брати `setIsTableSelectorOpen` з `useModalStore` замість неіснуючого `editorCore.setShowTableSelector`.
   - `src/hooks/useAppWorkspaceSuite.ts:637-638`: передавати в `modalsHostProps` значення `showTableSelector` та `setShowTableSelector` з `useModalStore`.
2. **`settingsTab` → `useAppUIStore`:**
   - `src/stores/useAppUIStore.ts`: типізувати `settingsTab` як `'general' | 'gallery' | 'vault' | 'keys' | 'about' | 'pwa'`.
   - `src/hooks/useWorkspaceEditorState.ts:64`: видалити локальний `[settingsTab, setSettingsTab]`; за потреби експортувати з `useAppUIStore` або прибрати з `WorkspaceEditorState`.
   - `src/hooks/useAppWorkspaceSuite.ts` + `useModalsProps.ts`: брати `settingsTab` / `setSettingsTab` з `useAppUIStore` (через `appUI` або напряму), передавати у `headerProps`, `editorProps`, `modalsProps` (або покластись на єдиний `useAppUIStore` у `Header`, `SettingsModal`, `MobileBottomBar`, `QuickStyleMenu`).
3. **`isLivePreviewEnabled`, `syncScrollEnabled`, `beautifyEnabled` → `useEditorStore`:**
   - У `src/stores/useEditorStore.ts` вже є ці 3 поля та екшени (`toggleLivePreview`, `setSyncScrollEnabled`, `setBeautifyEnabled`) з автоматичним `safeSetItem` у `localStorage`.
   - `src/hooks/useWorkspaceEditorState.ts`: видалити локальні `useState` для цих 3 полів і делегувати (або видалити з `editorState`, підключивши `useEditorStore` у `useAppWorkspaceSuite` / `useWorkspaceServices`).
   - Переконатися, що `EditorPane`, `PreviewPane`, `EditorTopBar`, `QuickStyleMenu`, `SettingsModal`, `useEditorEvents`, `useEditorShortcutsAndAutosave` читають і змінюють єдиний `useEditorStore`.

## Перевірка етапу
- `compile_applet` + `lint_applet` без помилок.
- Клік по іконці `Table` відкриває `TableSelectorPopup`; `Escape` закриває його.
- Відкриття налаштувань із `Header` завжди скидає вкладку на `'general'` і коректно синхронізується з `SettingsModal`.
- Перемикачі `LivePreview`, `SyncScroll`, `Beautify` зберігаються між перезавантаженнями.
- Позначити Етап 3 `[x]` у генеральному плані.
