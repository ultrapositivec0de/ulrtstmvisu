# Етап 4. Гнучке категорійне управління кешем у Налаштуваннях

## Мета
Перетворити кнопку очищення кешу в Налаштуваннях на прозорий менеджер із чекбоксами по категоріях, точними розмірами в `tabular-nums` і чітким розмежуванням тимчасових залишків від закріплених дописів і власних лінків.

## Кроки реалізації
1. Створити `src/services/cacheManagerService.ts`:
   - Підрахунок обсягів (байти та кількість записів) для 6 незалежних категорій:
     1. `feedCache` — кеш перегляду стрічки (`steem_reader_feed_cache_v1` IndexedDB + RAM-пул).
     2. `curationAndInbox` — кеш курації та прихованих відповідей (`steem_cached_curation_posts`, `steem_hidden_replies`).
     3. `pinnedPosts` — закріплені для читання дописи (`steem_pinned_posts_v1`).
     4. `imageBlobs` — локальний бінарний кеш зображень (`steem_image_cache_v1`), з під-опцією `alsoRemoveImageLinks` (за замовчуванням `false` — лінки зберігаються).
     5. `stockAndSw` — кеш пошуків Pexels/Pixabay/Unsplash (`steem_gallery_cache_results`) + Service Worker `CacheStorage` (без видалення `steem_pexels_settings`).
     6. `nativeAndLinux` — нативний WebView-кеш і виявлені XDG-каталоги кешу Linux.
   - Методи `getCacheBreakdown()` та `clearSelectedCategories(selection, callbacks)`.
   - Суворий захист: `keyval-store` (Vault-ключі, API-ключі), чернетки, шаблони та налаштування ніколи не видаляються.
2. Оновити `src/hooks/useAppBackup.ts` та підключити скидання оперативного стану (`useReaderStore`, `useSteemGallery`, `window.dispatchEvent(new CustomEvent('steem-cache-updated'))`).
3. Оновити секцію кешу в `src/components/modals/SettingsModal.tsx`:
   - Чекбокси категорій (тимчасові категорії увімкнені за замовчуванням; `pinnedPosts` та видалення лінків зображень — зняті за замовчуванням).
   - Відображення статистики (`tabular-nums`), кнопка оновлення статистики та кнопка виконання очищення саме обраних категорій із підтвердженням.
4. Додати переклади всіх нових ключів у `src/locales/{uk,en,es,ko}.ts`.
