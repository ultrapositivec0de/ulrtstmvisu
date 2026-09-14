# Audio Typing Synth: Компактний план реалізації

> **Локація:** `/fix_test_patcn/AUDIO_TYPING_PLAN.md`  
> **Стек:** Web Audio API (чистий процедурний синтез, без аудіофайлів/мережі, підтримка WebView/WebKit).  
> **Усталено:** `enabled: false` (вимкнено, тиша на старті).

---

## 📋 Покроковий чек-лист реалізації

- [x] **Крок 1. Звукове ядро (Core Engine)** (`src/services/audio/SoundSynthEngine.ts`, `AudioContextManager.ts`, `types.ts`)
  - Singleton `AudioContext` з лінивою ініціалізацією (запуск тільки після кліку/вмикання).
  - Пул аудіо-голосів (Node Pooling, 6–8 голосів) для запобігання навантаження на Garbage Collector.
  - Авто-сон (`ctx.suspend()`) через 4 сек бездіяльності, миттєве пробудження (`ctx.resume()`).
  - Кешування монолітних буферів шуму (white, pink, brown).
  - Підтримка складного синтезу: суб-осцилятор, Biquad-фільтр зі свайпом, тактильний транзієнт подвійного кліку.
- [x] **Крок 2. Диспетчер клавіш та унікальний хеш** (`src/services/audio/KeyHashDispatcher.ts`)
  - 32-бітне детерміноване хешування символу/коду для зміни висоти тону (pitch-shift) кожної клавіші.
  - Окреме звучання для кирилиці, латиниці, спецсимволів.
  - Спеціальні профілі для `Space` (бас), `Enter` (двотональний клац), `Backspace` (глухий стоп).
- [x] **Крок 3. Вшиті пресети та JSON-шаблон** (`src/services/audio/presets.ts`)
  - 6 вичерпних пресетів: *Cherry MX Blue*, *Vintage Typewriter*, *Deep Thock*, *Cyber Neon*, *Water Bubble*, *Soft Chiclet*.
  - Компактна схема для зовнішніх `.json` файлів користувачів та валідатор `validateSoundPreset`.
  - Завантаження та збереження в `localStorage` (`loadAudioSettings`, `saveAudioSettings`).
- [x] **Крок 4. Подвійне перехоплення введення** (`src/services/audio/useTypingSound.ts`)
  - Фізична клавіатура: перехоплення `keydown` (`event.code`, `event.key`).
  - Мобільна сенсорна (Touch/IME): стандартизовані події `beforeinput` (`insertText`, `deleteContentBackward`, `insertLineBreak`).
  - Опціональний відгук на тач/екранних кнопках.
- [x] **Крок 5. Кнопка та швидке меню в хедері та на панелі режимів** (`Header.tsx`, `EditorPane.tsx`, `AudioControlWidget.tsx`)
  - Іконка звуку (`Volume2` / `VolumeX`) у правому блоці хедера та на панелі режимів/синхронізації.
  - Клік — миттєве вкл/викл без зайвих діалогів. Швидке меню — повзунок гучності (5–100%), перемикач тач-кнопок, швидкий вибір із списку.
- [x] **Крок 6. Менеджер пресетів та Обрані ⭐** (`AudioPresetsModal.tsx`)
  - Категорії: Всі / Обрані ⭐ / Вшиті / Користувацькі.
  - Кнопка «Тест» (Preview) для прослуховування звуку.
  - Кнопка «Імпорт JSON» (вибір файлу) з автоматичною валідацією.
  - Кнопка «Шаблон» для завантаження зразка JSON для кастомізації або генерації ШІ.
  - Повне збереження конфігурації у `localStorage`.

---

## ⚙️ Специфікація схеми пресету (Шаблон)

```json
{
  "id": "custom-synth-id",
  "name": "Назва пресету",
  "oscillator": { "type": "triangle", "baseFreq": 320, "freqDecay": 0.03, "pitchVariance": 50 },
  "noise": { "type": "white", "gain": 0.2, "durationMs": 25 },
  "filter": { "type": "bandpass", "baseFrequency": 1400, "q": 3 },
  "envelope": { "attack": 0.002, "decay": 0.04, "sustain": 0, "release": 0.02 },
  "specialKeys": {
    "space": { "pitchMult": 0.7, "gainMult": 1.2 },
    "enter": { "pitchMult": 1.3, "noiseGain": 0.4 },
    "backspace": { "pitchMult": 0.85, "decayMult": 0.7 }
  }
}
```
