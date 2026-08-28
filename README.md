# Ultra Steem Editor

[ 🇬🇧 English ](#-english) | [ 🇺🇦 Українська ](#-українська)

---

<a name="-english"></a>
# Ultra Steem Editor

**Ultra Steem Editor** is a professional, high-performance Markdown & WYSIWYG editor tailored for the Steem blockchain ecosystem. Designed for content creators who value privacy, speed, rich media formatting, and seamless multi-platform publishing.

---

## 🚀 Key Features & Capabilities

- **Double-Layer Security & Vault**:
  - Client-side encryption of sensitive keys using the Web Crypto API (AES-GCM 256-bit).
  - Zero-server architecture protected by a local PIN code. Your private keys never leave your device.
- **Smart Image Gallery & EXIF Engine**:
  - Direct integration with Pexels, Pixabay, and Unsplash for free high-quality media.
  - Direct upload to SteemitImages.
  - Automated Markdown grid layout generator, pull-left/pull-right alignment templates, and EXIF metadata reader for photography blogs.
- **Advanced Steem Publishing**:
  - Native support for **Steem Keychain** and **Private Posting Key** authentication.
  - Flexible beneficiary management and reward distribution configuration (100% Steem Power or 50/50 SBD/SP).
  - Integrated post splitter tool for long-form articles.
- **Mobile Viewport & Tauri Android Optimization**:
  - Advanced **Visual Viewport API** integration guaranteeing layout stability when virtual keyboards open.
  - Prevents header scrolling, input overlapping, and widget displacement on mobile WebView and PWA instances.
- **Modern & High-Performance Core**:
  - Powered by React 18/19, Vite, Tailwind CSS, and Motion (Framer Motion).
  - Instant live preview sync powered by DOM morphing (`Idiomorph`) for smooth rendering without flicker.
  - Comprehensive local autosave and instant session recovery engine.

---

## 📦 Downloads & Releases

Pre-compiled, ready-to-use release builds are available in the **[Releases](../../releases)** section of this repository:

- 🌐 **Web (PWA)** — Progressive Web App for instant access in any browser.
- 🤖 **Android** — Native Android APK (built with Tauri Mobile).
- 🐧 **Linux** — Standalone desktop package for Linux distributions.
- 🪟 **Windows** — Standalone desktop installer / portable executable for Windows.

---

## 🛠 Tech Stack

- **UI & Framework**: React 18/19, Vite, Tailwind CSS, Motion (Framer Motion), Lucide Icons
- **Cryptography & Vault**: Web Crypto API (AES-GCM 256-bit), IndexedDB (`idb-keyval`)
- **Steem Blockchain**: Steem JS (`@blazeapps/dsteem`)
- **Parser & Preview**: Marked.js, DOMPurify, Idiomorph (DOM Morphing)
- **Cross-Platform Engine**: Tauri (Android, Linux, Windows), Neutralinojs

---

## 📄 License

Distributed under the **Apache License 2.0**. See [LICENSE](./LICENSE) for full details.

---

<br />

---

<a name="-українська"></a>
# Ultra Steem Editor

**Ultra Steem Editor** — це професійний, високопродуктивний Markdown та WYSIWYG редактор, створений спеціально для екосистеми блокчейну Steem. Призначений для авторів, які цінують конфіденційність, швидкість, розширене форматування медіафайлів та зручну кросплатформенність.

---

## 🚀 Основні можливості та переваги

- **Подвійна безпека та Сховище (Vault)**:
  - Клієнтське шифрування приватних ключів через Web Crypto API (AES-GCM 256-bit).
  - Архітектура без збереження даних на сервері, захищена локальним ПІН-кодом. Ваші ключі залишаються тільки на вашому пристрої.
- **Розумна галерея зображень та EXIF-двигун**:
  - Пряма інтеграція з фотостоками Pexels, Pixabay та Unsplash.
  - Пряме вивантаження зображень на сервери SteemitImages.
  - Автоматична генерація Markdown-сіток, шаблони вирівнювання (pull-left / pull-right) та зчитування EXIF-метаданих для фотоблонів.
- **Розширене публікування у Steem**:
  - Нативна підтримка **Steem Keychain** та авторизації через **Private Posting Key**.
  - Гнучке налаштування бенефіціарів та вибір виплат (100% Steem Power або 50/50 SBD/SP).
  - Вбудований інструмент поділу довготривалих статей на декілька частин.
- **Оптимізація під мобільні пристрої та Tauri Android**:
  - Інтеграція з **Visual Viewport API** для повної стабільності інтерфейсу при відкритті віртуальної клавіатури.
  - Усуває зсув шапки, залізання тексту під віджети та перекриття полів введення на мобільних WebView та PWA.
- **Сучасне високопродуктивне ядро**:
  - Побудовано на React 18/19, Vite, Tailwind CSS та Motion (Framer Motion).
  - Миттєве живильне прев'ю з підтримкою DOM-морфінгу (`Idiomorph`) для плавної зміни контенту без мерехтіння.
  - Потужна система автозбереження та миттєвого відновлення чернеток після перезавантаження.

---

## 📦 Завантаження та Релізи

Готові скомпільовані версії доступні у розділі **[Releases](../../releases)** цього репозиторію:

- 🌐 **Web (PWA)** — Веб-версія з підтримкою PWA для використання у будь-якому браузері.
- 🤖 **Android** — Готовий застосунок у форматі APK (збирається через Tauri Mobile).
- 🐧 **Linux** — Десктопний дистрибутив для ОС Linux.
- 🪟 **Windows** — Інсталятор / портативна версія для Windows.

---

## 🛠 Технологічний стек

- **Фронтенд та UI**: React 18/19, Vite, Tailwind CSS, Motion (Framer Motion), Lucide Icons
- **Криптографія**: Web Crypto API (AES-GCM 256-bit), IndexedDB (`idb-keyval`)
- **Блокчейн Steem**: Steem JS (`@blazeapps/dsteem`)
- **Парсер та прев'ю**: Marked.js, DOMPurify, Idiomorph (DOM Morphing)
- **Кросплатформенний рушій**: Tauri (Android, Linux, Windows), Neutralinojs

---

## 📄 Ліцензія

Розповсюджується під ліцензією **Apache License 2.0**. Подробиці у файлі [LICENSE](./LICENSE).

---

© 2026 Ultra Steem Editor. Built for the Steem Community. / Розроблено для спільноти Steem.
