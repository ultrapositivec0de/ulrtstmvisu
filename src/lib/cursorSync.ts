import { useEditorStore } from '../store';

/**
 * Перетворення глобального відступу (index символа у всьому тексті)
 * у координати { row, col } для масиву рядків.
 */
export const getRowColFromOffset = (lines: string[], globalOffset: number): { row: number; col: number } => {
  let currentOffset = 0;
  
  for (let row = 0; row < lines.length; row++) {
    const lineLength = lines[row].length;
    // +1 для врахування символу переносу рядка (\n)
    if (currentOffset + lineLength >= globalOffset) {
      return { row, col: globalOffset - currentOffset };
    }
    currentOffset += lineLength + 1;
  }
  
  // Якщо offset виходить за межі тексту, повертаємо кінець останнього рядка
  const lastRow = Math.max(0, lines.length - 1);
  return { 
    row: lastRow, 
    col: lines.length > 0 ? lines[lastRow].length : 0 
  };
};

/**
 * Перетворення координат { row, col } у глобальний відступ.
 */
export const getOffsetFromRowCol = (lines: string[], row: number, col: number): number => {
  let offset = 0;
  
  for (let r = 0; r < Math.min(row, lines.length); r++) {
    offset += lines[r].length + 1; // +1 для \n
  }
  
  return offset + col;
};

/**
 * Логіка збереження курсора з візуального режиму перед переходом у код.
 * Припускає, що ми знаємо глобальний відступ `globalOffset` 
 * (можна використати існуючу логіку збереження `cursorPositionRef`).
 */
export const saveVisualCursorToStore = (globalOffset: number) => {
  const { lines, setCursor } = useEditorStore.getState();
  const cursor = getRowColFromOffset(lines, globalOffset);
  setCursor(cursor);
};

/**
 * Відновлення курсора в DOM-елементі (contentEditable).
 * Викликається після переходу в візуальний режим.
 */
export const restoreCursorInVisual = (wysiwygElement: HTMLElement | null) => {
  const { cursor, lines } = useEditorStore.getState();
  if (!cursor || !wysiwygElement) return;
  
  const globalOffset = getOffsetFromRowCol(lines, cursor.row, cursor.col);
  
  // Тут слід використати вашу існуючу логіку відновлення (наприклад, range.setStart)
  // або маркерний підхід (editorSync.ts), оскільки DOM-дерево може містити HTML теги,
  // і пряме обчислення текстового відступу вимагає обходу текстових вузлів.
  console.log('Restoring visual cursor to global text offset:', globalOffset);
};
