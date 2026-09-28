# План архітектури та впровадження механізму Undo / Redo через Zustand та розширення TamedWidget

## 1. Концепція та цілі
Забезпечити надійний, багаторанговий механізм скасування (`Undo`) та повторення (`Redo`) дій користувача у редакторі **Ultra Steem Editor**, який:
1. Працює автономно через **Zustand Store**, не викликаючи повних перерендерів усього дерева застосунку при проміжних змінах.
2. Підтримує **сенсорні пристрої (смартфони, планшети)** через візуальні кнопки скасування/повторення у плаваючому віджеті (`TamedWidget`).
3. Коректно відновлює не лише текст, а й **позицію каретки / виділення** в обох режимах редагування (Markdown та WYSIWYG).
4. Оптимізує пам'ять шляхом умного групування дій (дебаунсинг та точки логічного збереження).

---

## 2. Проєктування Zustand Store (`src/stores/useHistoryStore.ts`)

### 2.1. Модель даних знімка (Snapshot)
```typescript
export interface HistorySnapshot {
  content: string;
  cursorStart?: number;
  cursorEnd?: number;
  mode: 'markdown' | 'visual';
  timestamp: number;
}
```

### 2.2. Інтерфейс Скелету Zustand Store
```typescript
import { create } from 'zustand';

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  maxHistory: number;
  
  // Actions
  pushSnapshot: (snapshot: Omit<HistorySnapshot, 'timestamp'>, immediate?: boolean) => void;
  undo: () => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}
```

### 2.3. Алгоритм групування змін (Smart Debouncing & Coalescing)
Для того щоб `Undo` не скасовувало текст по одному символу:
* **Таймер групування (800 мс):** При безупинному введенні літер знімки групуються в один крок.
* **Миттєвий запис (`immediate: true`):** Створюється новий нерозривний знімок при:
  - Натисканні `Enter` (новий рядок/абзац).
  - Вставці тексту з буфера (`Paste`).
  - Використанні інструментів форматування (Жирний, Заголовок, Таблиця тощо).
  - Натисканні `Space` або `Delete`/`Backspace`.

---

## 3. Інтеграція в редактор (Markdown & WYSIWYG)

### 3.1. Перехоплення гарячих клавіш (Keyboard Shortcuts)
У `useEditorEvents.ts` або `EditorPane.tsx`:
* `Ctrl + Z` / `Cmd + Z` ➔ Виклик `undo()`.
* `Ctrl + Y` / `Cmd + Shift + Z` ➔ Виклик `redo()`.
* Виклик `e.preventDefault()`, щоб запобігти збоям стандартного браузерного `execCommand`.

### 3.2. Точне відновлення позиції каретки
* **У режимі Markdown (`<textarea>`):**
  При виклику `undo/redo` встановлюємо `textarea.value = snapshot.content`, після чого відновлюємо `textarea.setSelectionRange(snapshot.cursorStart, snapshot.cursorEnd)`.
* **У режимі WYSIWYG (`contenteditable`):**
  Конвертуємо відносний офсет тексту у каретку DOM через `Selection` та `Range` API або `restoreVisualSelection()`.

---

## 4. Інтеграція у віджет сенсорного екрану (`TamedWidget.tsx`)

### 4.1. Додавання кнопок Undo/Redo до `TOOLS_MAP`
У файл інструментів віджета додаються два нові описи:
```tsx
import { Undo, Redo } from 'lucide-react';

export const TOOLS_MAP = {
  // ... існуючі інструменти
  undo: {
    icon: Undo,
    title: 'Скасувати (Ctrl+Z)',
    action: 'undo',
    category: 'history'
  },
  redo: {
    icon: Redo,
    title: 'Повторити (Ctrl+Y)',
    action: 'redo',
    category: 'history'
  }
};
```

### 4.2. Опрацювання сенсорного фокусу (`Pointer Events`)
Для запобігання втраті фокусу з текстового поля під час натискання кнопки у віджеті:
```tsx
<button
  type="button"
  onMouseDown={(e) => e.preventDefault()}
  onPointerDown={(e) => e.preventDefault()}
  onClick={() => handleUndo()}
  disabled={!canUndo}
  className={cn(
    "toolbar-btn font-bold p-2 transition-opacity",
    !canUndo && "opacity-30 cursor-not-allowed pointer-events-none"
  )}
>
  <Undo size={18} />
</button>
```

---

## 5. Покроковий план впровадження

1. **Етап 1: Створення Zustand Store (`useHistoryStore.ts`)**
   - Створення файлу `src/stores/useHistoryStore.ts`.
   - Реалізація логіки двостекового масиву (`past` / `future`), обмеження ліміту змін (за замовчуванням 50).

2. **Етап 2: Інтеграція зі збереженням та форматуванням**
   - Підключення `pushSnapshot` до подій редактора (`onInput`, `onKeyDown`, застосування стилів форматування).

3. **Етап 3: Додавання візуальних кнопок до `TamedWidget`**
   - Додавання іконок `Undo` та `Redo` з `lucide-react`.
   - Додавання кнопок до списку доступних інструментів віджета для сенсорних пристроїв.
   - Підключення реактивного стану `disabled` залежно від `canUndo` / `canRedo`.

4. **Етап 4: Тестування та верифікація**
   - Перевірка роботи на сенсорних екранах/гаджетах та десктопі.
   - Перевірка відсутності підгальмовувань при швидкому наборі тексту.
