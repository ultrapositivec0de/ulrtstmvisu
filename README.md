# Ultra Steem Editor

[ 🇬🇧 English](#-english-version) | [ 🇺🇦 Українська](#-українська-версія)

---

<a name="-english-version"></a>
# Ultra Steem Editor

Professional and secure Markdown & WYSIWYG editor for the Steem blockchain ecosystem, built for creators who value privacy, speed, and advanced publishing tools.

## 🚀 Key Features

- **Double-Layer Security & Vault**: Local encryption of your keys using Web Crypto API (AES-GCM 256-bit) protected by a zero-server PIN code. Your private keys belong solely to you.
- **Smart Image Gallery & EXIF Support**:
  - Integration with Pexels, Pixabay, and Unsplash.
  - Automatic upload to SteemitImages.
  - Grid creation, alignment (pull-left, pull-right), and EXIF data reading for photography content.
- **Advanced Publishing & Steem Integration**:
  - Full support for Steem Keychain and Private Posting Keys.
  - Beneficiary configuration and reward type selection (100% SP or 50/50).
  - Post splitter for long-form content.
- **Optimized Mobile & Tauri Android Support**:
  - Fully adaptive viewport and Visual Viewport API integration to handle virtual keyboards smoothly without header jumping or input overlapping.
- **Modular & High-Performance Architecture**:
  - Powered by React 18/19, Vite, Tailwind CSS, and Framer Motion.
  - Live preview sync with DOM morphing (Idiomorph) for buttery-smooth rendering.
  - Clean state management with robust autosave and session recovery.

---

<a name="-українська-версія"></a>
# Ultra Steem Editor

Професійний та безпечний редактор Markdown і WYSIWYG для екосистеми блокчейну Steem, створений для авторів, які цінують конфіденційність, високу швидкість та розширені інструменти публікації.

## 🚀 Основні можливості

- **Подвійна безпека та Сховище (Vault)**: Локальне шифрування ваших ключів за допомогою Web Crypto API (AES-GCM 256-bit), захищене ПІН-кодом без збереження на сервері. Ваші приватні ключі належать лише вам.
- **Розумна галерея зображень та EXIF**:
  - Інтеграція з Pexels, Pixabay та Unsplash.
  - Автоматичне вивантаження на SteemitImages.
  - Створення сіток, вирівнювання (pull-left, pull-right) та зчитування EXIF-даних для фотографів.
- **Розширені публікації та інтеграція зі Steem**:
  - Повна підтримка Steem Keychain та Private Posting Key.
  - Налаштування бенефіціарів та вибір типу винагороди (100% SP або 50/50).
  - Інструмент поділу довгих дописів на частини.
- **Мобільна оптимізація та підтримка Tauri Android**:
  - Адаптація під мобільні екрани та інтеграція Visual Viewport API для ідеальної роботи з віртуальною клавіатурою (відсутність зсуву шапки та залізання тексту під віджети).
- **Модульна та високопродуктивна архітектура**:
  - Побудовано на React 18/19, Vite, Tailwind CSS та Framer Motion.
  - Живе прев'ю з інтелектуальним морфінгом DOM (Idiomorph) для плавної синхронізації.
  - Надійна система автозбереження та відновлення чернеток.

---

## 🛠 Tech Stack / Технології

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Icons**: Lucide React
- **Encryption**: AES-GCM (Web Crypto API)
- **Blockchain / Parsing**: Steem JS, Marked.js, DOMPurify, Idiomorph
- **Mobile Runtime**: Tauri (Android WebView / PWA)

## 📥 Installation & Running / Встановлення та запуск

1. Clone the repository / Клонуйте репозиторій:
   ```bash
   git clone https://github.com/ultrapositivecode/ultra-steem-editor.git
   ```
2. Install dependencies / Встановіть залежності:
   ```bash
   npm install
   ```
3. Run the development server / Запустіть сервер розробки:
   ```bash
   npm run dev
   ```
4. Build for production / Зберіть для продакшну:
   ```bash
   npm run build
   ```

## 📄 License / Ліцензія

Distributed under the Apache 2.0 License. See [LICENSE](./LICENSE) for details.

---
© 2026 Ultra Steem Editor. Built for the Steem Community. / Розроблено для спільноти Steem.
