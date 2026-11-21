# Етап 5. Нативне очищення WebView та інспекція каталогів Linux (Tauri + Neutralino)

## Мета
Забезпечити реальне звільнення дискового кешу на десктопі без збоїв прав доступу у Tauri v2 і без конфлікту з відкритими SQLite-файлами, а також діагностику каталогів різних Linux-збірок.

## Кроки реалізації
1. Розширити `src-tauri/src/lib.rs` (і зареєструвати в `invoke_handler`):
   - Команда `clear_webview_browsing_data`: викликає вбудоване очищення кешу WebView у Tauri v2 (або безпечне очищення кеш-підтек у `app_cache_dir`, не зачіпаючи конфіги й ключі).
   - Команда `scan_linux_cache_dirs`: на Linux перевіряє `$XDG_CACHE_HOME` / `~/.cache` та `$XDG_DATA_HOME` / `~/.local/share` для відомих ідентифікаторів проєкту (`com.ultraeditor.desktop`, `org.ultraeditor.neutralino`, `org.ultrapositive.steemeditorpro`, `ultra-steem-editor`, `Ultra Steem Editor`) і рахує розмір лише кеш-підтек (`WebKitCache`, `mediacache`, `Cache`, `Code Cache`, `fscacheddata`, `GPUCache`, `DawnCache`) + `~/.steem_writer_backup.json` (лише інфо). Повертає список для UI.
   - Команда `clear_linux_cache_targets(paths)`: безпечно видаляє тільки перевірені кеш-підтеки всередині білого списку відомих ідентифікаторів (захист від path traversal), повертаючи фактично звільнені байти та помилки без фіктивного `cleared = true`.
2. Оновити `src-tauri/capabilities/default.json` за потреби команд та плагінів.
3. Додати підтримку NeutralinoJS у `cacheManagerService.ts` / `nativeService.ts`:
   - Примусове оновлення `~/.steem_writer_backup.json` після очищення `localStorage` (навіть якщо всі необов’язкові кеш-ключі видалені).
   - Видалення `neutralinojs.log` і очищення кешу WebKitGTK у XDG-шляхах `org.ultraeditor.neutralino` / `org.ultrapositive.steemeditorpro`.
4. Відобразити знайдені каталоги Linux і їхній обсяг у блоці налаштувань кешу (лише для десктопу) із можливістю очистити їх в один клік.
5. Фінальна верифікація: `npm run build` / `compile_applet` + `lint_applet` + перевірка `cargo check` (якщо Rust toolchain доступний, або перевірка синтаксису) + оновлення чекліста у `implementation_plan.md`.
