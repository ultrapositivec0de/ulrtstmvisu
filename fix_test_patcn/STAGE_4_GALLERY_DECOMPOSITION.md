# ЕТАП 4: Декомпозиція медіа-галереї (useSteemGallery.ts)
**Статус:** `[x] ВИКОНАНО ТА ВЕРИФІКОВАНО`  
**Пріоритет:** 4  
**Цільовий модуль:** `src/hooks/useSteemGallery.ts` (скорочено з 1,085 рядків до 210 рядків)  
**Очікувані файли:** `src/hooks/gallery/useStockPhotos.ts`, `src/hooks/gallery/useImageUploadPipeline.ts`, `src/hooks/gallery/useGalleryLayoutMarkup.ts`

---

## 1. Мета та опис етапу
Розділити монолітний хук медіа-менеджера `useSteemGallery.ts` на три вузькоспеціалізовані мікро-хуки з чітким розмежуванням відповідальності: зовнішній пошук фотостоків, пайплайн вивантаження/підпису зображень, та генератор розмітки сіток.

---

## 2. Покроковий план виконання

### Крок 4.1: Створення хука пошуку фотостоків (`src/hooks/gallery/useStockPhotos.ts`)
- [x] Винести логіку пошуку Pexels, Pixabay, Unsplash:
  - Стани: `galleryMode`, `pexelsPage`, `pexelsResults`, `isSearchingPexels`, `pexelsSettings`, `isTrafficOptimized`.
  - Запити: `handleExternalSearch`, пагінація, збереження API-ключів, оптимізація трафіку.
- [x] **Чекпоінт 4.1:** `npx tsc --noEmit` — успішна типізація хука.

### Крок 4.2: Створення хука вивантаження (`src/hooks/gallery/useImageUploadPipeline.ts`)
- [x] Винести логіку завантаження на SteemitImages:
  - Підпис через `SecurityService.signImageChallengeWithKeychain` або приватний ключ Vault.
  - Інтеграція з `NativeHttpService.tryUpload`.
  - DOM Image Multihash Web Prediction (`steemImagePrediction.ts`).
  - Статусні логи `pubLog` та обробка помилок.
- [x] **Чекпоінт 4.2:** `npx tsc --noEmit` — валідація типів завантажувача.

### Крок 4.3: Створення генератора розмітки галереї (`src/hooks/gallery/useGalleryLayoutMarkup.ts`)
- [x] Винести генерацію розмітки зображень та сіток:
  - Стани форматування: `gridLayout`, `gridWithCaptions`, `singleCaptionAlign`, `isTextWrapEnabled`, `imageInsertFormat`.
  - Функції вставки: `insertImage`, `insertExternalImage`, `insertGrid`.
- [x] **Чекпоінт 4.3:** `npx tsc --noEmit` — відсутність синтаксичних помилок.

### Крок 4.4: Збірка тонкого композиційного хука `useSteemGallery.ts`
- [x] Зібрати `useSteemGallery` як координатор над трьома новими хуками.
- [x] Скоротити розмір файлу з 1,085 рядків до 210 рядків.
- [x] **Чекпоінт 4.4:** `compile_applet` + `lint_applet` (0 помилок) + `test_gallery_decomposition.ts` (100% пройдено).

---

## 3. Критерії приймання та верифікація
1. Завантаження локальних зображень та вставка фотостоків працюють ідентично попередній версії.
2. `useSteemGallery.ts` декомпозовано на 3 незалежні модулі, придатні для ізольованого тестування.
