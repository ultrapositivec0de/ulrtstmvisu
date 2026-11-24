# Етап 8: Аудит CI/CD, Tauri Auto-Updater, Linux-пакети та Android APK/TWA

**Рейтинг**:
- **Важливість**: Середня
- **Складність**: Середня
- **Ресурсна вартість**: Низька–Середня
- **Залежності**: Етапи 0–7

---

## Мета етапу
Перевірити та довести до повної узгодженості наявні 10 GitHub Actions конфігурацій (`.github/workflows/`), налаштувати надійне автооновлення десктопних версій Tauri, перевірити пакування для Linux (`.deb`, `.rpm`, `.AppImage`, Neutralino) та завершити мобільний контур Android (APK / Trusted Web Activity).

---

## Наявний базовий контур (за аудитом)
У репозиторії вже присутні:
- `release.yml`, `desktop-linux.yml`, `desktop-windows.yml`, `android-release.yml`, `web-release.yml`, `deploy-pages.yml`, `multibuild.yml`, `neutralino.yml`, `2_test_neutralino.yml`, `sync_to_ulrtstmvisu.yml`.

---

## Покроковий план дій

- [ ] **Крок 8.1 — Аудит та усунення дублювань у `.github/workflows/`**:
  - Звірити версії екшенів (`checkout`, `setup-node`, `rust-toolchain`, `tauri-action`), узгодити однаковий запуск `npm run check:tauri`, `npm run lint`, `npm run build` в усіх релізних пайплайнах.
  - Перевірити тригери (`workflow_dispatch` vs `push` тегів `v*`), щоб уникнути випадкових конфліктних чернеток релізів.
- [ ] **Крок 8.2 — Механізм автооновлення десктопних версій (Tauri Auto-Updater)**:
  - Перевірити наявність і конфігурацію `tauri-plugin-updater` у `src-tauri/` та генерацію підписаного маніфесту `latest.json` у релізному workflow (`TAURI_SIGNING_PRIVATE_KEY`).
  - Додати легкий неінтрузивний сервіс перевірки оновлень у налаштуваннях/статусі («Доступна нова версія X.Y.Z — оновити / переглянути реліз»), із fallback-перевіркою GitHub Releases API для Neutralino/Web збірок.
- [ ] **Крок 8.3 — Паритет Linux XDG (Tauri `.deb`/`.rpm`/`.AppImage` та Neutralino)**:
  - Протестувати консистентність ідентифікатора `org.ultraeditor.neutralino` / `com.ultrasteemeditor.app`, іконки `.desktop` та коректне очищення локальних директорій кешу через Cache Manager.
- [ ] **Крок 8.4 — Android APK та Trusted Web Activity (TWA) конфігурація**:
  - Перевірити налаштування `src-tauri` Android білду (`split-per-abi`, мінімальні дозволи маніфесту на базі SAF без `EXTERNAL_STORAGE`/`READ_MEDIA_*`, підпис релізних збірок через secrets замість вимушеного debug-ключа за наявності keystore).
  - Додати/перевірити TWA-сумісний `manifest.webmanifest` та шаблони `assetlinks.json` для можливості встановлення Web PWA як повноцінного Android-додатка.

---

## Критерії приймання
- Усі релізні workflows проходять суху перевірку кроків без застарілих кроків чи розсинхронізації версій (`npm run check:tauri`).
- Автооновлення коректно розпізнає версії та безпечно повідомляє користувача без блокування редактора.
- Маніфест PWA та Android збірки містять узгоджені іконки, назви й дозволи.
