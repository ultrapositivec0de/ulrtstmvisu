# Етап 4: Глибока Декомпозиція Моноліту Reader.tsx (5,290 рядків)

## 1. Мета та Контекст
- Декомпозувати найбільший файл проєкту `src/components/Reader.tsx` (5,290 рядків) на незалежні модулі по 200-400 рядків.
- Впровадити `useReaderStore` як єдине глобальне джерело правди для стрічки дописів, фільтрів (trending/created/hot), дерева коментарів та закладок.
- Замінити внутрішній дубльований код рендерингу на спільний `PostRenderer.tsx` (створений на Етапі 3).
- **Складність:** Дуже висока (Very High — величезний обсяг логіки взаємодії з блокчейном Steem, голосування, розрахунку нагород, дерева коментарів).
- **Оцінка холостого ходу (контекст):** Радикальне зниження холостих витрат з ~52,500 токенів на одне зчитування до ~3,000 токенів на окремий модуль!

---

## 2. Мікрокроки реалізації

### Мікрокрок 4.1: Створення `src/stores/useReaderStore.ts`
- Винести стан читача:
  - `feedPosts: SteemPost[]`, `isLoadingFeed: boolean`, `feedFilter: 'trending' | 'created' | 'hot' | 'payout'`
  - `activeTag: string`, `selectedPost: SteemPost | null`
  - `commentsTree: SteemComment[]`, `isLoadingComments: boolean`
  - `historyStack: string[]`, `bookmarks: string[]`
  - `readerSettings: { fontSize, fontFamily, lineHeight, viewMode }`

### Мікрокрок 4.2: Винесення блокчейн-хуків читача (`src/hooks/reader/`)
- `useReaderFeedQuery.ts` — завантаження списків дописів з вузлів Steem API, пагінація за permlink/author.
- `useReaderComments.ts` — рекурсивна побудова дерева коментарів та оновлення кешу.
- `useReaderVoteAction.ts` — виконання транзакцій голосування (upvote/unvote) з авторизацією через збережений Posting Key.

### Мікрокрок 4.3: Створення модуля стрічки (`src/components/reader/ReaderFeedView.tsx`)
- Відображення списку карток публікацій через спільний `PostRenderer` (режим `feed-item`).
- Нескінченний скрол (infinite scroll / load more), статус завантаження (skeleton/spinner), інформація про нагороди та автора.

### Мікрокрок 4.4: Створення модуля детального перегляду (`src/components/reader/ReaderDetailView.tsx`)
- Повний рендер допису через `PostRenderer` (режим `full`).
- Панель автора, голосування, репости, розрахунок виплат, перемикання розміру шрифту.
- Вбудовування модуля дерева коментарів `ReaderCommentsTree.tsx`.

### Мікрокрок 4.5: Створення модуля навігації та шапки (`src/components/reader/ReaderHeader.tsx` & `ReaderTOC.tsx`)
- Шапка з пошуком, вибором тегів та спільнот.
- Зміст статті (TOC) для швидкої навігації за заголовками H1-H4.

### Мікрокрок 4.6: Очищення головного `src/components/Reader.tsx`
- Збирання нового компактного `Reader.tsx` (~250-350 рядків), який координує перемикання між `ReaderFeedView` та `ReaderDetailView` через `useReaderStore`.
- Перевірка збірки через `compile_applet`.
