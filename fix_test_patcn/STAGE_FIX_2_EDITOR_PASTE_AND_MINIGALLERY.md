# Етап 2: Відновлення вставки в Visual Mode, усунення заглушок і прив'язка MiniGallery

- **Складність:** 2/5 (Низька–Середня)
- **Використання ресурсів:** Мале (3 файли: `useEditorPaneProps.ts`, `useAppWorkspaceSuite.ts`, `EditorPane.tsx`)
- **Мета:** Повністю відновити paste (текст, HTML, URL зображень) у `WysiwygCanvas`, прибрати 6 заглушок у `useEditorPaneProps.ts` і прив'язати `MiniGalleryStrip` до `isMiniGalleryOpen`.

## Підкроки
1. **Замінити заглушки в `src/hooks/useEditorPaneProps.ts:281-287`:**
   - Імпортувати `htmlToMarkdown`, `convertBareImageUrlsToMarkdown`, `isImageAndProxyUrl` з `../lib/editorSync`.
   - Імпортувати `getMarked` з `../utils/markdownParser`.
   - Імпортувати `useEditorStore` з `../store` (або прийняти `setContent` через параметри з `useAppWorkspaceSuite.ts`).
   - Замінити заглушки у `buildEditorPaneProps`:
     - `isImageAndProxyUrl` (замість `() => false`)
     - `htmlToMarkdown` (замість `(html) => html`)
     - `convertBareImageUrlsToMarkdown` (замість `(text) => text`)
     - `getMarked` (замість `() => null`)
     - `setContent: useEditorStore.getState().setContent` (замість `() => {}`)
2. **Прибрати мертву заглушку `getMiniGalleryBottomStyle`:**
   - `src/hooks/useEditorPaneProps.ts:293`: видалити `getMiniGalleryBottomStyle: () => undefined`.
   - `src/components/editor/EditorPane.tsx:129, 257`: видалити `getMiniGalleryBottomStyle` з `EditorPaneProps` і деструктуризації (`MiniGalleryStrip.tsx:5` вже імпортує її напряму).
3. **Виправити стан видимості `MiniGalleryStrip`:**
   - `src/hooks/useEditorPaneProps.ts`: додати `isMiniGalleryOpen: boolean;` у `CompositeEditorPanePropsInput`, деструктурувати `isMiniGalleryOpen` і замінити рядок `214` (`gallery.isGalleryCollapsed === false`) на `isMiniGalleryOpen`.
   - `src/hooks/useAppWorkspaceSuite.ts:370-444`: передати `isMiniGalleryOpen` у виклик `useEditorPaneProps({...})`.

## Перевірка етапу
- `compile_applet` + `lint_applet` без помилок.
- Тест вставки у `WysiwygCanvas` (звичайний текст, HTML, URL картинки).
- Кнопка `Gallery` у тулбарі та `X` у `MiniGalleryStrip` коректно відкривають/закривають смугу незалежно від сайдбару.
- Позначити Етап 2 `[x]` у генеральному плані.
