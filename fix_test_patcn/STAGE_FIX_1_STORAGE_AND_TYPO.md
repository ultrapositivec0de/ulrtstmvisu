# Етап 1: Виправлення ключів `localStorage` та персистентності перемикачів

- **Складність:** 1/5 (Низька)
- **Використання ресурсів:** Мінімальне (2–3 файли, точкові правки без зміни архітектури)
- **Мета:** Усунути розбіжність ключа `steem_ondemand_sync` / `steem_on_demand_sync` і гарантувати збереження `performanceMode`, `onDemandSyncEnabled` та `syncScrollEnabled` після перезавантаження.

## Підкроки
1. **Уніфікувати ключ On-Demand Sync:**
   - `src/components/editor/EditorTopBar.tsx:203`: замінити запис `'steem_on_demand_sync'` на `'steem_ondemand_sync'` (або прибрати дубльований ручний `localStorage.setItem` після додавання `useEffect` у кроці 2).
   - `src/hooks/useWorkspaceEditorState.ts:60`: при ініціалізації `onDemandSyncEnabled` читати `localStorage.getItem('steem_ondemand_sync') ?? localStorage.getItem('steem_on_demand_sync')` і за наявності старого ключа одноразово мігрувати його у `steem_ondemand_sync`.
2. **Додати автозбереження в `useWorkspaceEditorState.ts`:**
   - Додати `useEffect` для `performanceMode` → `localStorage.setItem('steem_performance_mode', String(performanceMode))`.
   - Додати `useEffect` для `onDemandSyncEnabled` → `localStorage.setItem('steem_ondemand_sync', String(onDemandSyncEnabled))`.
   - Для `syncScrollEnabled` і `beautifyEnabled`: на цьому етапі додати `useEffect` (або у Етапі 3 перенести їх повністю в `useEditorStore`, де `safeSetItem` уже вбудований).
3. **Прибрати пропуск запису в UI-компонентах:**
   - `src/components/modals/SettingsModal.tsx:222`: перевірити, що перемикач `performanceMode` тепер автоматично персиститься через `useWorkspaceEditorState`.
   - `src/components/editor/PreviewPane.tsx:82`: перевірити, що перемикач `syncScrollEnabled` тепер автоматично персиститься.

## Перевірка етапу
- `compile_applet` + `lint_applet` без помилок.
- Повторний запуск `npx tsx fix_test_patcn/audit_remaining_checks.ts` підтверджує відсутність `steem_ondemand_sync` у `readWithoutWrite`.
- Позначити Етап 1 `[x]` у генеральному плані.
