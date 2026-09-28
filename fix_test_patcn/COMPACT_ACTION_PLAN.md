# AI Компактний План Дій (Compact Action Plan)

## Етап 1: Віртуальна клавіатура та в'юпорт (Android, Планшети, Waterfox)
1. **Файл:** `src/hooks/useVisualViewport.ts`
   * Замінити жорстке `isMobile = currentInnerW < 1024` на перевірку тач-можливостей: `isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches`.
   * Зробити виявлення клавіатури універсальним: `isKeyboardOpen = (isInputFocused && heightShrinkDiff > 120)` без блокування за шириною 1024px.
2. **Файли:** `src/lib/viewportLayout.ts` та `src/components/editor/TamedWidget.tsx`
   * Прибрати обмеження `isMobile` при розрахунку `getFloatingWidgetStyles` та `calculateEditorBottomReserved`, замінивши на `hasKeyboardOffset = keyboardOffset > 0 || isKeyboardOpen`.
   * Додати облік оффсету для Waterfox/Firefox (плаваючий адресний рядок).

## Етап 2: Мобільний інтерфейс, модальні вікна та перенесення заголовків
1. **Файл:** `src/components/header/Header.tsx`
   * Обмежити максимальну ширину випадних меню: `max-w-[calc(100vw-1rem)]`, додати `flex-wrap` для груп іконок інструментів, запобігти горизонтальному розширенню сторінки.
2. **Файли:** Модальні вікна (`BaseModal.tsx`, `AppModals.tsx`)
   * Зафіксувати `window.scrollTo(0, 0)` при відкритті модальних вікон; додати захист від зсуву `Header` вгору при фокусі інпутів всередині модалок.
3. **Файл:** `src/components/docReader/DocReaderContent.tsx`
   * Додати до заголовків `h1-h6` класи `break-words [overflow-wrap:anywhere] hyphens-auto` для запобігання виходу довгих слів за межі екрана.

## Етап 3: Прозорість, Windows Tauri та єдині змінні тем
1. **Файл:** `src/index.css`
   * Ввести глобальні семантичні змінні для напівпрозорих поверхонь:
     * `--bg-overlay-surface`: темна тема `rgba(15, 23, 42, 0.92)`, світла тема `rgba(255, 255, 255, 0.96)`.
     * `--backdrop-filter-val`: у Windows Tauri та слабких пристроях `none`, у звичайному браузері `blur(8px)`.
   * Усунути 80+ рядків конфліктних оверрайдів `.theme-light .bg-slate-*`, замінивши їх семантичними класами.
2. **Файли:** `ImageItem.tsx`, `ExternalImageItem.tsx`, `EditorPane.tsx`
   * Замінити жорсткі `bg-slate-950/90` плашок галереї на семантичні стилі, щоб у білій темі не залишалося чорних плям.

## Етап 4: Плавний скролінг у режимі читання (Без стрибків і збоїв)
1. **Файл:** `src/components/docReader/DocReaderContent.tsx`
   * Кешувати відрендерений HTML (`useMemo`/`useRef`) і НЕ викликати `processContent()` при зміні `headings`. Рендерити тільки за наступними подіями: перехід в режим читання, тоді рендериться текст із редактора, коли відривається інший фалй для читання або із чернеток або локально, логічно, що їх потрібно рендерити один раз для читання, бо введення не відбувається, тож готовий ренед можна зберігати для читання. Але зоб це не змінювало ниніщню логіку, тобто перемикання в режим читання в першу чергу рендерить і відображає текст із редактора, що там набрано. А відкриття чернето чи локальних файлів для читання ніяк не впливають на набрані матеріали в редакторі.
   * Додати стабільні розміри або аспект-співвідношення для зображень у розмітці Markdown.
2. **Файл:** `src/components/docReader/useDocReader.ts`
   * Додати троттлінг через `requestAnimationFrame` у `handleScroll`, усунути синхронний замір `getBoundingClientRect` на кожен скрол-івент.
   * При натисканні на зміст відключати слухач `handleScroll` на час анімації плавного скролінгу (flag `isProgrammaticScrolling`).

## Етап 5: Звуковий синтез друку (Zero-GC, Voice Pool 12 голосів, Xorshift32, Android Touch)
> Детальний документ: `/fix_test_patcn/STAGE_5_AUDIO_SYNTH_PLAN.md`
1. **Файл:** `src/services/audio/SoundSynthEngine.ts`, `AudioContextManager.ts`
   * Впровадити **Voice Pool** (фіксований пул на 12 голосів) із перехопленням найстарішого голосу (Voice Stealing) та м'яким мікро-спадом 3–4 мс для усунення кліків (DC-offset pop).
   * Повністю ліквідувати навантаження на Garbage Collector: нуль виділень нових нод під час друку, усунути `setTimeout(() => disconnect())`.
   * Додати `DynamicsCompressorNode` як фінальний лімітер для запобігання перевантаженню при акордах.
   * Інтегрувати генератор шуму **Xorshift32 PRNG** та кешовані буфери шуму.
2. **Файл:** `src/services/audio/KeyHashDispatcher.ts`, `keyboardMap.ts`
   * Створити **Precomputed Frequency LUT** (`Float32Array`) для вибірки частот нот за $O(1)$ без важких формул.
   * Побітове швидке хешування для індивідуального відтінку кожної клавіші (кирилиця, латиниця, спецсимволи).
3. **Файл:** `src/services/audio/useTypingSound.ts`
   * Повна ізоляція від React-рендерів (прямий виклик синтезатора 0 мс).
   * Підтримка Android (Gboard/Samsung): обробка `keydown.keyCode === 229` через `beforeinput (e.data)`.
   * Автоматичне глобальне розблокування Autoplay Policy на Android при першому тачі (`pointerdown`/`touchstart`).
