# Етап 5: Безпечне очищення мертвих полів, застарілих пропсів і фінальна регресія

- **Складність:** 3/5 (Середня — потребує попередньої перевірки всіх посилань перед видаленням)
- **Використання ресурсів:** Помірне (інвентаризація через grep/AST, прибирання невикористаних сигнатур, повний аудит)
- **Мета:** Прибрати мертвий код і розбіжності інтерфейсів, не зламавши сумісність компонентів, тестів або store-підписок.

## Підкроки (з перевіркою наслідків перед кожним видаленням)
1. **Аудит і очищення `useModalStore` (`src/stores/useModalStore.ts`):**
   - Перевірити через `grep` усі посилання на `showPwaBanner`, `showPwaInstructionsModal`, `isAudioPresetsModalOpen`, `isAccountPromptModalOpen` у `src/` та `fix_test_patcn/test_*.ts`.
   - Видалити лише ті поля, які не використовуються ні в коді, ні в тестах (не чіпати `isSMenuOpen` і `isTableSelectorOpen`, що використовуються після Етапів 0/3).
   - Для `isSMenuOpen`: за можливості усунути паралельний `useState` у `useWorkspaceEditorState.ts:91`, залишивши єдиний `useModalStore.isSMenuOpen`.
2. **Аудит і очищення `useAppUIStore` та `useEditorStore`:**
   - Перевірити невикористовувані екшени (`toggleSidebar` у `useAppUIStore.ts`; `setWpm`, `setIsLivePreviewEnabled` у `useEditorStore.ts`).
   - **Обережність:** НЕ видаляти `lines`, `updateLine`, `cursor`, `setLines` у `useEditorStore` — `lines` та `updateLine` активно використовуються в `LineComponent.tsx` і `cursorSync.ts`.
3. **Очищення застарілих пропсів компонентних інтерфейсів:**
   - `SettingsModalProps` (`src/components/modals/SettingsModal.tsx:92, 94`): перевірити відсутність використання `clearAllImages?` і `clearAllTemplates?` у файлі та тестах, після чого видалити з інтерфейсу.
   - `HeaderProps` (`src/components/header/Header.tsx:73, 77`): перевірити й видалити мертві опціональні поля `saveFirst?`, `drafts?` (перевірити тести в `fix_test_patcn/`).
   - `TamedWidget.tsx:279-280` (`fallbackToolsMap`): замінити заглушки `'Img': () => {}` і `'Gallery': () => {}` на безпечний fallback (або тригер через `props` / `useModalStore`), щоб віджет працював навіть без переданого `toolsMap`.
   - `SplitPostModalProps.wordsCount?`: залишити як безпечний опціональний проп (або передавати з `AppModals` для консистентності), без зламу існуючої логіки store fallback.
4. **Фінальна верифікація:**
   - Повторно запустити `npx tsx fix_test_patcn/audit_refactoring_integrity.ts`, `audit_deep_wiring.ts`, `audit_remaining_checks.ts`.
   - Виконати `compile_applet` і `lint_applet` разом.

## Перевірка етапу
- Повторні AST-скрипти показують `0` критичних заглушок, `0` втрачених `editorCore` полів, `0` розбіжностей `localStorage` ключів.
- `compile_applet` та `lint_applet` проходять без помилок.
- Позначити Етап 5 `[x]` у генеральному плані.
