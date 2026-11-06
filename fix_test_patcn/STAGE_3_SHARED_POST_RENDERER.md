# Етап 3: Спільний Автономний Двигун Рендерингу Дописів (PostRenderer)

## 1. Мета та Контекст
- Уніфікувати механізм відображення публікацій між:
  1. Вкладкою попереднього перегляду/читання у режимі редактора (`DocReaderContent.tsx` / `PreviewPane.tsx`).
  2. Глобальним режимом читання Steem Reader (`Reader.tsx`).
  3. Майбутнім розділом профілю користувача або збережених закладок.
- Створити єдиний високопродуктивний компонент `src/components/reader/PostRenderer.tsx` та хук `src/hooks/usePostParser.ts`.
- Підтримка як одиночного допису (Single Post View), так і пакетного відображення у стрічці (Multi-post Feed) без подвійного коду та без впливу на швидкість друку в редакторі.
- **Складність:** Середня (Medium — об'єднання готових парсерів markdown/HTML, зображень та таблиць у єдиний інтерфейс).
- **Оцінка холостого ходу (контекст):** ~2,000-3,000 токенів на підмодуль.

---

## 2. Мікрокроки реалізації

### Мікрокрок 3.1: Аналіз існуючих рушіїв форматування
- Зіставити функції рендерингу в `DocReaderContent.tsx` (який уже має модульну структуру) та правила розмітки в `Reader.tsx` (обробка Steem-картинок через proxy, таблиці, цитати, відеовставки).
- Виділити чисту функцію форматування вмісту `parsePostContent(body: string, options)` у `src/utils/postFormatting.ts`.

### Мікрокрок 3.2: Створення автономного компонента `PostRenderer.tsx`
- Шлях: `src/components/reader/PostRenderer.tsx`.
- Інтерфейс пропсів:
  ```typescript
  interface PostRendererProps {
    title?: string;
    body: string;
    author?: string;
    created?: string;
    community?: string;
    mode?: 'full' | 'feed-item' | 'preview';
    onImageClick?: (url: string) => void;
    onTagClick?: (tag: string) => void;
    onAuthorClick?: (author: string) => void;
    fontSize?: number;
    lineHeight?: number;
    fontFamily?: string;
  }
  ```
- Повна підтримка зуму зображень (lightbox store), стилів таблиць, цитат та підсвічування коду.

### Мікрокрок 3.3: Підключення `PostRenderer` у вкладку перегляду редактора (`DocReaderContent.tsx`)
- Замінити внутрішній специфічний рендер `DocReaderContent.tsx` на виклик `PostRenderer` у режимі `preview` / `full`.
- Перевірити: зміна тексту в редакторі миттєво відображається у вкладці Читання без регресій.

### Мікрокрок 3.4: Підготовка `PostRenderer` для стрічки читання
- Реалізувати режим `feed-item` зі скороченим переглядом (snip / body excerpt) та лінивим завантаженням важких медіа.
- Перевірка оптимізації рендерингу через React.memo.

### Мікрокрок 3.5: Тестування та перевірка збірки
- Запуск `compile_applet` та `lint_applet`.
