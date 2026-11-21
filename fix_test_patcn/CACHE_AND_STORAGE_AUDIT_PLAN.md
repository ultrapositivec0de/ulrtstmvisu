# Аудит механізму очищення кешу, нативних каталогів Linux та перегляду внутрішніх баз

**Цільовий елемент інтерфейсу:** `SettingsModal.tsx` (рядки 790–809 — кнопка `clearAppCache` → `handleClearCache` у `src/hooks/useAppBackup.ts`).

---

## 1. Як працює поточна кнопка «Очистити кеш застосунку»

Фактичний стан реалізації у `src/hooks/useAppBackup.ts` (`handleClearCache`, рядки 34–148) має суттєві розбіжності з описом у UI (`clearAppCacheDesc` / `confirmClearCachePrompt`):

### 1.1. Що кнопка реально видаляє зараз
1. **`localStorage`** — видаляє лише **3 ключі**:
   - `steem_gallery_cache_results` (кеш пошуку стокових фото);
   - `steem_pexels_settings` (налаштування атрибуції Pexels — насправді це налаштування, а не кеш);
   - `steem_hidden_replies` (список прихованих відповідей в інбоксі).
2. **`sessionStorage`** — виконує `sessionStorage.clear()`.
3. **`CacheStorage` (Service Worker)** — видаляє всі кеші через `caches.keys()` → `caches.delete(k)` (у т.ч. `steem-editor-pro-v4.8.14` із `public/sw.js`).
4. **Tauri (`isTauri()`)** — намагається прочитати `appCacheDir()` та `appLocalDataDir()` через `@tauri-apps/plugin-fs` і видалити підтеки, де в назві є `cache`, `fscacheddata`, `EBWebView/Default/*cache*` або `webkit`.

### 1.2. Критичні прогалини та збої у зв’язках із базами
1. **Відсутній зв’язок з IndexedDB кешу стрічки (`steem_reader_feed_cache_v1`):**
   - Нова база переглянутих дописів (`src/services/readerCacheDb.ts`, сховище `tag_buckets`) **взагалі не очищається** — функція `clearReaderTagCache()` не викликається, а внутрішній `memoryFallbackStore` і стан у `ReaderStore` / хуках не скидаються.
2. **Не очищається кеш курації (`localStorage: steem_cached_curation_posts`):**
   - `src/hooks/reader/useReaderCuration.ts` (рядки 39, 73) зберігає до 50 повних постів `SteemPost` у `localStorage`, але `handleClearCache` цей ключ не зачіпає.
3. **Фіктивне спрацювання в Tauri v2 через права доступу (`capabilities`):**
   - У `src-tauri/capabilities/default.json` підключено лише `"fs:default"`.
   - У Tauri v2 набір `"fs:default"` **не надає** прав на `readDir` та рекурсивне `remove` для `$APPCACHE` і `$APPLOCALDATA`.
   - Через це в `useAppBackup.ts` виклики `fsModule.readDir(...)` та `fsModule.remove(..., { recursive: true })` завершуються помилкою доступу до області (`scope`), яка тихо перехоплюється `try/catch` (`console.debug`), а змінна `const cleared = true;` (рядок 38) завжди ініціює сповіщення про успішне очищення.
4. **Блокування відкритих файлів WebKitGTK / SQLite під час роботи:**
   - Навіть за наявності прав ФС пряме видалення папок `webkit` / `EBWebView` під час активної сесії WebView є технічно некоректним: рушій утримує файлові дескриптори на SQLite-файли (зокрема IndexedDB, LocalStorage, `WebKitCache`, журнали `-wal`/`-shm`). Без нативного виклику очищення даних WebView місце на диску може не звільнятися до перезапуску або спричинити пошкодження індексу активної бази.
5. **Повна відсутність підтримки NeutralinoJS (`isNeutralino()`):**
   - Гілки для Neutralino в `handleClearCache` немає.
   - `src/services/nativeService.ts` кожні 4 секунди синхронізує всі `localStorage`-ключі з префіксами `steem_` та `widget_` у файл `${homeDir}/.steem_writer_backup.json`. Зайві кеш-ключі (як-от `steem_cached_curation_posts`) дублюються туди автоматично, а дисковий кеш WebKitGTK для Neutralino взагалі не зачіпається.
6. **Розбіжність у роботі зі збереженими зображеннями:**
   - Поточний код не чіпає `steem_uploaded_images_v2` і `steem_editor_source_links` (`useSteemGallery.ts`), але також не синхронізує очищення стану `pexelsResults` у пам’яті (`useImageSearch.ts`). Користувачу варто чітко розмежувати **посилання на власноруч вивантажені зображення** (які бажано зберігати та переглядати) і **тимчасовий медіакеш браузера/стрічки** (який потрібно очищати).
7. **База сховища ключів (`idb-keyval` / `keyval-store`):**
   - `src/services/securityService.ts` зберігає зашифровані облікові записи, майстер-ключ та API-ключі (`steem_vault_*`) у стандартній базі IndexedDB `keyval-store`. Це єдина база, яку **категорично не можна** видаляти загальним очищенням кешу.

---

## 2. Пояснення щодо «SQL-баз» і фрагментації папок на Linux

Застосунок напряму не створює власних файлів SQLite чи серверних SQL-БД. Проте рушій перегляду (**WebKitGTK** у Linux для Tauri та Neutralino, **WebView2** у Windows, **Chromium WebView** на Android) фізично реалізує:
- `IndexedDB` (`steem_reader_feed_cache_v1`, `keyval-store`);
- `LocalStorage`;
- HTTP-кеш зображень (`WebKitCache` / `NetworkCache`), cookies та `QuotaManager`

у вигляді внутрішніх **SQLite-баз** і бінарних файлів кешу на диску.

### Чому на Linux виникають різні папки для різних форматів запуску
Згідно з конфігураціями репозиторію:
- **Tauri (`src-tauri/tauri.conf.json`, `Cargo.toml`)**:
  - `identifier`: `com.ultraeditor.desktop`
  - `productName`: `Ultra Steem Editor`
  - `package.name`: `ultra-steem-editor`
  - Стандартні шляхи XDG для Tauri (`.deb` і `.rpm`):
    - Кеш: `~/.cache/com.ultraeditor.desktop` (та внутрішні підтеки WebKitGTK);
    - Дані/IndexedDB: `~/.local/share/com.ultraeditor.desktop`;
    - Конфіг: `~/.config/com.ultraeditor.desktop`.
- **Tauri AppImage**:
  - Монтується щоразу у тимчасовий шлях `/tmp/.mount_*`, через що системні бібліотеки та обгортка AppImage (залежно від інтегратора AppImageLauncher / порталів / імені процесу або `GIO` / `WebKitGTK` версії) можуть формувати окремі підкаталоги кешу WebKitGTK, Mesa/GStreamer або використовувати назву бінарника `ultra-steem-editor` / `Ultra Steem Editor` замість стабільного XDG-шляху.
- **NeutralinoJS (`neutralino-build/neutralino.config.json`)**:
  - `applicationId`: `org.ultrapositive.steemeditorpro`
  - `binaryName`: `ultra-steem-editor`
  - Використовує власні XDG-каталоги (`org.ultrapositive.steemeditorpro` / `ultra-steem-editor`), локальний порт `17823` (окремий origin для `localStorage` та `IndexedDB`), файл логів `neutralinojs.log`, а також файл `~/.steem_writer_backup.json` у домашній теці користувача.

У результаті встановлення та запуск кількох варіантів (`.deb`/`.rpm`, `.AppImage`, Neutralino) створює незалежні ізольовані сховища та кеш-теки, які наразі не мають єдиної точки перегляду або очищення.

---

## 3. Чи можна переглядати та керувати базою й зображеннями всередині застосунку

**Так.** Оскільки всі прикладні дані проходять через фронтенд-шари `IndexedDB` і `localStorage`, у застосунку можна реалізувати повноцінний **«Менеджер сховища та кешу»** без зовнішніх SQL-утиліт:

1. **Перегляд та повторне використання власних завантажених зображень (`steem_uploaded_images_v2` та `steem_editor_source_links`):**
   - Це легкий каталог URL-посилань на вже вивантажені зображення (Steem CDN / зовнішні хостинги) + їхні назви та EXIF.
   - Навіть після повного очищення важкого мережевого кешу WebView ці лінки залишаються доступними.
   - У менеджері їх можна:
     - переглядати списком або плиткою (опційно з лінивим завантаженням прев’ю або лише URL у режимі економії трафіку);
     - копіювати URL в буфер або вставляти безпосередньо в активний редактор;
     - фільтрувати та видаляти окремі записи або експортувати список лінків.

2. **Перегляд кешованих даних Глобального Рідера (`IndexedDB: steem_reader_feed_cache_v1`):**
   - Показ поточних бакетів за тегами (`tag_buckets`): назва тегу, кількість збережених дописів, дата оновлення, орієнтовний обсяг у КБ/МБ.
   - **Витяг зображень із кешованих дописів**: автоматичне сканування `json_metadata.image` та Markdown-посилань у `body` збережених дописів із показом знайдених URL та прев’ю. Можливість скопіювати посилання або видалити кеш конкретного тегу чи всієї стрічки.

3. **Розділене очищення за категоріями (замість однієї кнопки на все):**
   - **Кеш стрічки Рідера (IndexedDB)** — видалення лише переглянутих постів і індексованих зображень із постів;
   - **Тимчасовий кеш UI та пошуку** — `steem_cached_curation_posts`, `steem_gallery_cache_results`, `steem_hidden_replies` + очищення стану в оперативній пам’яті;
   - **Системний HTTP/WebView кеш зображень та Service Worker** — нативне очищення кешу WebKit/WebView без видалення `localStorage` або Vault-ключів;
   - **Власні посилання вивантажених зображень** — окремий перемикач (за замовчуванням **вимкнений**, щоб зберегти корисні лінки);
   - **Linux-діагностика каталогів** (лише в десктопній версії): показ виявлених на диску папок кешу (`com.ultraeditor.desktop`, `org.ultrapositive.steemeditorpro`, `ultra-steem-editor`, `.steem_writer_backup.json`), їхнього розміру в МБ та безпечне очищення застарілих або неактивних кеш-директорій.

---

## 4. План доопрацювання (для подальшого впровадження)

### Етап 1. Уніфікація логічного очищення (Web + PWA + Всі платформи)
- Оновити `handleClearCache` (або розділити на гранулярні методи у новому сервісі `src/services/cacheManagerService.ts`):
  - підключити `clearReaderTagCache()` та видалення окремих бакетів з `readerCacheDb.ts`;
  - додати очищення `steem_cached_curation_posts`, а також синхронізацію стану в пам’яті (`ReaderStore`, `useImageSearch`, `useReaderCuration`);
  - не включати `steem_pexels_settings` до кешу (перенести у налаштування галереї), а `steem_uploaded_images_v2` очищати лише за явним вибором користувача;
  - суворо ізолювати `keyval-store` (`steem_vault_*`), чернетки та налаштування.

### Етап 2. Надійне нативне очищення в Tauri v2 і NeutralinoJS (Linux / Windows / macOS)
- **Tauri (`src-tauri`)**:
  - Замінити JS-видалення директорій на Rust-команди:
    1. Нативне очищення кешу активного вікна через API WebView (`clear_all_browsing_data` або цільове очищення мережевого кешу без скидання Vault `IndexedDB`, щоб не загубити ключі).
    2. Rust-команда інспектування XDG-каталогів на Linux (`~/.cache/*`, `~/.local/share/*` за відомими ідентифікаторами: `com.ultraeditor.desktop`, `org.ultrapositive.steemeditorpro`, `ultra-steem-editor`, `Ultra Steem Editor`) з підрахунком розміру, визначенням поточного активного профілю та безпечним видаленням лише кеш-підтек (`WebKitCache`, `mediacache`, `fscacheddata`, `Cache`, `Code Cache`) неактивних/залишкових збірок.
  - За потреби прямого FS-доступу в JS — явно додати необхідні scope-дозволи в `src-tauri/capabilities/default.json` (проте Rust-команда безпечніша й точніша).
- **NeutralinoJS**:
  - Додати гілку очищення в `nativeService.ts`: примусове оновлення/синхронізація `~/.steem_writer_backup.json` після видалення кеш-ключів + опційне видалення `neutralinojs.log` і кешу `WebKitCache` у XDG-директорії Neutralino через системні виклики (`Neutralino.os.execCommand` або `filesystem.remove`).

### Етап 3. UI «Менеджер кешу та зображень» у налаштуваннях
- Розширити блок `clearAppCache` у `SettingsModal.tsx` (або відкривати модальний інспектор `CacheManagerModal` поверх `BaseModal`):
  - Зведення по обсягах: *Кеш стрічки (дописи / теги)*, *Посилання на вивантажені зображення*, *Мережевий кеш WebView*, *Залишкові каталоги Linux* (на десктопі).
  - Вкладка **«Зображення»** з двома підгрупами:
    1. *Особисті вивантажені (`steem_uploaded_images_v2`)* — пошук, прев’ю, копіювання URL, вставка в редактор, вибіркове видалення.
    2. *З кешованих дописів Рідера* — перегляд витягнутих лінків і посилань на першоджерело.
  - Багатомовна підтримка нових ключів одночасно у `src/locales/{uk,en,es,ko}.ts`.
