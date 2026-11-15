# ЕТАП 3: Ізоляція стану рідера та створення useReaderStore
**Статус:** `[x] ВИКОНАНО ТА ВЕРИФІКОВАНО`  
**Пріоритет:** 3  
**Цільовий модуль:** `src/components/Reader.tsx` (рядки 104–260)  
**Очікувані файли:** `src/store/readerStore.ts`, рефакторинг `src/components/Reader.tsx`

---

## 1. Мета та опис етапу
Створити єдине джерело правди для рідера на базі Zustand (`readerStore.ts`), винести 200+ рядків оптимістичних мутацій блокчейну (`handleLocalVote`, `handleLocalComment`) усередину дій стору, усунути ручні ефекти синхронізації з `localStorage` та полегшити `Reader.tsx`.

---

## 2. Покроковий план виконання

### Крок 3.1: Створення стору рідера (`src/store/readerStore.ts`)
- [x] Створити Zustand стор з інтерфейсом:
  - Стан конфігурації: `config: ReaderConfig`, `updateConfig(partial: Partial<ReaderConfig>): void`.
  - Стан перегляду: `viewMode: 'feed' | 'curation' | 'settings'`, `setViewMode(mode): void`.
  - Налаштування: `voteWeight`, `setVoteWeight`, `revealedImages`, `revealImage`.
  - Стан відповідей: `respondedReplies: Record<string, string>`, `recordRespondedReply`.
  - Автоматичне збереження у `localStorage` (`steem_reader_config_v1`, `steem_responded_v1`) із захистом `safeSetItem`.
- [x] **Чекпоінт 3.1:** `npx tsc --noEmit` — відсутність помилок типізації стору.

### Крок 3.2: Інкапсуляція оптимістичних мутацій у стор
- [x] Додати до стору атомарні оптимістичні дії:
  - `applyOptimisticVoteToPosts(posts, author, permlink, weight, voter)` — оновлює `posts`, `curationPosts`, `inbox`.
  - `applyOptimisticVoteToComments(commentsMap, author, permlink, weight, voter)` — оновлює вкладені коментарі.
- [x] **Чекпоінт 3.2:** Скрипт `fix_test_patcn/test_reader_store.ts` для перевірки атомарності оновлення списків (100% тестів пройдено).

### Крок 3.3: Рефакторинг `src/components/Reader.tsx` та зв'язування компонентів
- [x] Перевести `Reader.tsx` на використання селекторів `useReaderStore`.
- [x] Очистити ручні `useEffect` синхронізації з `localStorage`.
- [x] Замінити вкладені цикли в `handleLocalVote` на чисті виклики методів стору.
- [x] **Чекпоінт 3.3:** `compile_applet` + `lint_applet` (0 помилок).

---

## 3. Критерії приймання та верифікація
1. Оптимістичне голосування та коментування миттєво оновлюють інтерфейс у стрічці, курації та інбоксі.
2. `Reader.tsx` скорочено вдвічі (до ~400 рядків).
3. Усі лінтингові та компіляційні тести пройдено.
