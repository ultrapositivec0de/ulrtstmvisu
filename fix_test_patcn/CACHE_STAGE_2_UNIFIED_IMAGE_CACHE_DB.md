# Етап 2. Єдина база кешу зображень (IndexedDB) та безпечний рендер із канонічними URL

## Мета
Уніфікувати кешування зображень у єдиній IndexedDB (`steem_image_cache_v1`) зі зв’язуванням `originalName ↔ serverHashName ↔ canonicalUrl`, відображати збережені зображення з локального `Blob` без повторного завантаження з сервера і гарантувати, що в Markdown, експорт і публікацію завжди потрапляє лише HTTP(S) посилання, а не бінарний масив чи `blob:`.

## Кроки реалізації
1. Створити `src/services/imageCacheDb.ts`:
   - Сховище `steem_image_cache_v1` (store `images`, keyPath `canonicalUrl`, індекси `originalName`, `source`, `lastUsedAt`).
   - Метадані запису: `canonicalUrl`, `originalName`, `serverHashName`, `mimeType`, `byteSize`, `blob`, `source` (`'uploaded' | 'post_cache' | 'stock'`), `keepLink`, `exif`, `createdAt`, `lastUsedAt`.
   - Ідентифікація кодового серверного імені (`extractServerHashName(url)`) та зворотна реєстрація `objectUrlToCanonicalMap` / `canonicalToObjectUrlMap`.
   - Функції: `upsertCachedImage`, `cacheImageFromUrlIfMissing`, `getCachedImage`, `getAllCachedImages`, `resolveDisplayUrl` (`blob:` ObjectURL з кешу або канонічний URL), `restoreCanonicalUrl` (`blob:...` → `https://...`), `removeImageBlobOnly`, `deleteCachedImageFull`, `clearImageBlobs`, `getImageCacheStats`.
2. Гарантія безпеки контенту допису (жодних бінарних даних / `blob:` / `data:`):
   - У `src/lib/editorSync.ts` (`htmlToMarkdown`, case `'img'`): брати `el.getAttribute('data-canonical-src') || restoreCanonicalUrl(el.getAttribute('src') || '')`.
   - Додати в `src/hooks/useSteemQueue.ts` (`processContentForSteem`) санітайзер зворотного відновлення будь-яких `blob:`-посилань, зареєстрованих у кеші, у їхній `canonicalUrl`.
3. Прозоре використання локального кешу при відображенні та вставці:
   - У `src/hooks/gallery/useImageUploadPipeline.ts`: при успішному вивантаженні локального або зовнішнього зображення одразу зберігати `File`/`Blob` + `file.name` (`originalName`) + `finalUrl` у `imageCacheDb`.
   - У `src/hooks/gallery/useGalleryLayoutMarkup.ts`: у текст допису завжди вставляти лише `canonicalUrl`, позначаючи елемент у кеші `lastUsedAt = Date.now()`.
   - У `PostRenderer.tsx`, `PreviewPane.tsx` (через пост-обробку зрендерених `<img>` або `useCachedImagesHydrator` у DOM-контейнерах `#steem-preview-pane`, `wysiwygRef`, `PostRenderer`) та `ImageItem.tsx` / `MiniGalleryStrip.tsx`: підставляти `blob:` URL з `imageCacheDb` із збереженням `data-canonical-src={canonicalUrl}` для миттєвого показу без мережевого трафіку.
   - У `Lightbox` кліках (`PreviewPane`, `PostRenderer`): передавати `data-canonical-src` / `restoreCanonicalUrl`.
