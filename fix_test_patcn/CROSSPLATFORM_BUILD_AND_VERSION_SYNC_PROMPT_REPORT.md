# Перенесення інфраструктури нативних збірок, системної інтеграції та автоверсіонування в інший проєкт

**Призначення документа**:
1. Чітка перевірка: **які `.github/workflows/*.yml` можна перенести копіюванням 1-в-1**, які 2 потребують дрібної заміни імені архіву, а які не переносяться.
2. **Практичний готовий промпт** для агента в новому проєкті: він сам зчитає назву/версію цільового проєкту, згенерує скелет Tauri/Neutralino CLI-командами, інтегрує версіонування, системні обходи Linux/кешу й підготує все під скопійовані воркфлоу (без вставки сирих YAML-файлів у текст промпту).

---

## Частина 1. Аудит воркфлоу: що можна перенести простим копіюванням

Перевірено всі **10** файлів у `.github/workflows/`. Висновок дуже практичний: **6 основних воркфлоу написані універсально** — вони самі читають версію з `package.json` та налаштування з `src-tauri/tauri.conf.json` і `metadata.json`.

### Таблиця переносимості `.github/workflows/`

| Файл воркфлоу | Можна перенести 1-в-1 без правок? | Що конкретно перевірити / змінити в новому проєкті |
| :--- | :---: | :--- |
| `release.yml` | **ТАК (100%)** | Єдина вимога: наявність `npm run check:tauri`, `npm run lint`, `npm run build`, `app-icon.png` та `metadata.json`. *Усе інше бере автоматично.* |
| `desktop-linux.yml` | **ТАК (100%)** | Жодного хардкоду імені; читає `package.json` і `src-tauri/`. |
| `desktop-windows.yml` | **ТАК (100%)** | Жодного хардкоду імені; читає `package.json` і `src-tauri/`. |
| `android-release.yml` | **ТАК (100%)** | Читає `package.json`, `app-icon.png` та `metadata.json -> requestFramePermissions`. *(Опційно: замінити debug-підпис на keystore зі secrets).* |
| `deploy-pages.yml` | **ТАК (100%)** | Потребує лише `base: './'` у `vite.config.ts`. |
| `web-release.yml` | **Майже (2 рядки)** | Жорстко вписано ім’я ZIP-файлу `ultra-steem-editor-web-v...zip`. Або замінити на назву нового проєкту, або читати `pkg.name` динамічно з `package.json`. |
| `neutralino.yml` | **Майже (2 рядки)** | Жорстко вписано ім’я ZIP-файлу `ultra-steem-editor-v...-neutralino.zip`. Достатньо брати `pkg.name` динамічно з `package.json`. |
| `multibuild.yml` | **НЕ ПОТРІБЕН** | Повна копія `release.yml` (дублікат). |
| `2_test_neutralino.yml` | **НЕ ПОТРІБЕН** | Повтор `neutralino.yml` (тестовий дублікат). |
| `sync_to_ulrtstmvisu.yml` | **НЕ ПЕРЕНОСИТИ** | Специфічне дзеркалювання в конкретний приватний/публічний репозиторій автора. |

### Обов’язкові передумови, щоб скопійовані YAML запрацювали одразу
1. **Скрипти в `package.json`**: мають існувати команди `dev`, `build`, `lint`, `build:neu`, `icon`, `check:tauri`, `version:bump`.
2. **Файли в корені**: `app-icon.png` (для генерації іконок у CI) і `metadata.json` (для автоматичного прокидання Android-дозволів).
3. **Каталоги нативних оболонок**: `src-tauri/` (для Tauri v2) і `neutralino-build/` (для NeutralinoJS).
4. **Runner у GitHub Actions**: якщо цільовий репозиторій не використовує `ubuntu-26.04`, перевірити й за потреби замінити образ на `ubuntu-latest` / `ubuntu-24.04`.

---

## Частина 2. Готовий промпт для агента в новому проєкті

> **Як використовувати**:
> 1. За бажанням просто скопіюй до нового репозиторію папку `.github/workflows/` (5 універсальних файлів + підправлені `web-release.yml` і `neutralino.yml` без дублів).
> 2. Передай новому AI-агенту текст нижче — він сам прочитає `package.json` і структуру нового проєкту, підставить усі імена/ідентифікатори, виконає CLI-команди генерації базових файлів Tauri/Neutralino та налаштує всю системну інтеграцію.

```text
Розгорни в цьому проєкті повну файлову та програмну інфраструктуру для кросплатформних нативних збірок (Tauri v2 Desktop + Android, NeutralinoJS Portable, Web PWA), системної інтеграції та єдиної синхронізації версій — за зразком нашої перевіреної архітектури.

### Правило №1: Автовизначення імен і використання CLI-генераторів
1. Спочатку проаналізуй поточний репозиторій (`package.json`, `vite.config.*`, існуючі файли UI, іконки, `public/sw.js` або manifest).
2. Самостійно виведи та підстав скрізь параметри цього проєкту з `package.json`:
   - `APP_SLUG` (із `package.json -> name`, у kebab-case)
   - `APP_NAME` (читабельна назва застосунку з UI / `index.html` / `package.json`)
   - `VERSION` (поточна версія з `package.json`)
   - `TAURI_ID` (reverse-DNS формату `com.<slug>.desktop`)
   - `NEU_ID` (reverse-DNS формату `org.<slug>.neutralino`)
3. Не вигадуй службові шаблонні файли вручну там, де їх генерують офіційні інструменти:
   - Встанови потрібні залежності та CLI (`@tauri-apps/api`, `@tauri-apps/cli`, плагіни `fs`, `dialog`, `os`, `shell`, `@neutralinojs/neu`, `fflate`) через менеджер пакетів.
   - Ініціалізуй базову структуру Tauri (`npx tauri init` або відповідні CLI-команди) та NeutralinoJS (`neu update` / завантаження бінарників у `neutralino-build/`) системними командами, а потім налаштуй їх під проєкт.
   - Якщо є вихідна іконка (наприклад `app-icon.png` чи `public/icon.png`), згенеруй нативні іконки командою `npx tauri icon`.

### Правило №2: Інтеграція нативних оболонок і системних обходів
1. **Vite & Metadata**:
   - Налаштуй `vite.config.ts` з відносним `base: './'` та єдиним dev-портом (3000) для сумісності Web/Pages, Tauri та Neutralino.
   - Створи/оновлюй `metadata.json` (`name`, `description` із `vX.Y.Z`, `requestFramePermissions` для AndroidManifest у CI — без застарілих/надлишкових дозволів зовнішнього сховища, адже робота з файлами будується через Android SAF).
2. **Tauri v2 (`src-tauri/`)**:
   - Налаштуй `src-tauri/tauri.conf.json` та `src-tauri/Cargo.toml` під `<APP_NAME>`, `<APP_SLUG>`, `<TAURI_ID>` і актуальну версію з `package.json`.
   - У `src-tauri/src/lib.rs` реалізуй:
     - Безпечні змінні оточення для Linux WebKit (`WEBKIT_DISABLE_COMPOSITING_MODE=1`, `WEBKIT_DISABLE_DMABUF_RENDERER=1`, `GDK_BACKEND=x11`) проти білих екранів і падінь драйверів.
     - Команди безпечного сканування й очищення системного WebView/XDG кешу з білим списком кеш-директорій і захистом користувацьких баз (`IndexedDB`, `LocalStorage`, `Databases`, `Cookies`).
3. **NeutralinoJS (`neutralino-build/`)**:
   - Налаштуй `neutralino-build/neutralino.config.json` (`applicationId`, `version`, `binaryName: <APP_SLUG>`, `nativeAllowList`).
   - Створи скрипт `scripts/build-neu.js` (`npm run build:neu`), який збирає Vite-фронтенд, копіює `dist/` у `neutralino-build/resources/`, вилучає PWA-файли (`sw.js`, `manifest.*`, `workbox-*`), інжектить `/js/neutralino.js` у `index.html`, забезпечує права на бінарники в `bin/`, викликає `neu build --release` і формує версіонований ZIP-архів `<APP_SLUG>-v<VERSION>-neutralino.zip` (беручи ім’я динамічно з `package.json`).
4. **Клієнтський міст середовища (`src/`)**:
   - Додай легкий сервіс визначення рантайму (`Web` / `Tauri` / `Neutralino` / `Android`), щоб застосунок коректно обирав нативне збереження файлів, HTTP або очищення кешу в нативній оболонці.

### Правило №3: Скрипти версіонування та Preflight-перевірок
1. Створи `scripts/bump-version.js` (та npm-скрипти `"bump"`, `"bump-version"`, `"version:bump"`):
   - Аргументи: `patch | minor | major | X.Y.Z` + опціональна текстова нотатка змін.
   - Скрипт має автоматично оновлювати версію в усіх знайдених конфігах цього проєкту: `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `neutralino-build/neutralino.config.json`, `metadata.json`, префікс кешу в `public/sw.js`, `CHANGELOG.md`, структурований файл changelog (якщо є) та централізоване відображення версії в проєкті (бажано через змінну збірки Vite або знайдені згадки версії у вказаних конфігах).
2. Створи `scripts/check-tauri-versions.mjs` (`npm run check:tauri`):
   - Перевіряє збіг версій між `package.json`, `tauri.conf.json` і `Cargo.toml`.
   - Звіряє major/minor версії `@tauri-apps/*` (npm) і `tauri*` (Cargo) та перевіряє їх наявність на `crates.io` і `registry.npmjs.org`.
3. Додай до `package.json` усі скрипти, на які спираються CI-воркфлоу: `"build"`, `"lint"`, `"check:tauri"`, `"icon"`, `"build:neu"`, `"version:bump"`.

### Правило №4: Перевірка готовності під скопійовані GitHub Actions воркфлоу
1. Якщо в `.github/workflows/` вже перенесені шаблони воркфлоу (`release.yml`, `desktop-linux.yml`, `desktop-windows.yml`, `android-release.yml`, `deploy-pages.yml`, `web-release.yml`, `neutralino.yml`):
   - Перевір їх на залишкові чужі назви пакетів (особливо імена вихідних `.zip` архівів у `web-release.yml` і `neutralino.yml` — заміни хардкод на динамічне зчитування `name` з `package.json`).
   - Перевір, чи всі команди (`npm run check:tauri`, `npm run icon`, `npm run lint`, `npm run build`, `npm run build:neu`) і шляхи (`app-icon.png`, `metadata.json`, `neutralino-build/dist/`) повністю збігаються.
2. Заверши перевіркою локально: запусти `npm run check:tauri`, `npm run lint`, `npm run build`, а також перевір сухий запуск/логіку `scripts/bump-version.js`.
```
