import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTableOperationsProps {
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  updateContentFromWysiwyg: () => void;
  setIsWidgetVisible: (visible: boolean) => void;
  setActiveModal: (modal: any) => void;
  tableImportText: string;
  setTableImportText: (text: string) => void;
  tableImportFormat: 'markdown' | 'html';
  insertAtCursor: (text: string, ...args: any[]) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  t: (key: any) => string;
}

export function useTableOperations({
  wysiwygRef,
  updateContentFromWysiwyg,
  setIsWidgetVisible,
  setActiveModal,
  tableImportText,
  setTableImportText,
  tableImportFormat,
  insertAtCursor,
  notify,
  t,
}: UseTableOperationsProps) {
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
  const [activeTableRow, setActiveTableRow] = useState<HTMLTableRowElement | null>(null);
  const [activeTableCell, setActiveTableCell] = useState<HTMLTableCellElement | null>(null);
  
  const activeTableRef = useRef<HTMLTableElement | null>(null);
  const activeTableRowRef = useRef<HTMLTableRowElement | null>(null);
  const activeTableCellRef = useRef<HTMLTableCellElement | null>(null);

  const [tableRect, setTableRect] = useState<DOMRect | null>(null);
  const [isTableMenuExpanded, setIsTableMenuExpanded] = useState(false);
  const [isTableMenuPinned, setIsTableMenuPinned] = useState(() => {
    return localStorage.getItem('steem_table_menu_pinned') === 'true';
  });

  const updateTableRect = useCallback(() => {
    if (activeTable) {
      setTableRect(activeTable.getBoundingClientRect());
    } else {
      setTableRect(null);
    }
  }, [activeTable]);

  useEffect(() => {
    updateTableRect();
    window.addEventListener('resize', updateTableRect);
    const scrollContainer = wysiwygRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateTableRect);
    }
    return () => {
      window.removeEventListener('resize', updateTableRect);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updateTableRect);
      }
    };
  }, [updateTableRect, activeTable, wysiwygRef]);

  const deleteActiveTableRow = useCallback(() => {
    if (activeTableRow && wysiwygRef.current && wysiwygRef.current.contains(activeTableRow)) {
      const table = activeTableRow.closest('table');
      activeTableRow.remove();
      if (table && (!table.textContent || table.textContent.trim() === '')) {
        table.remove();
        setActiveTable(null);
      }
      setActiveTableRow(null);
      setActiveTableCell(null);
      updateContentFromWysiwyg();
      setIsWidgetVisible(false);
    }
  }, [activeTableRow, updateContentFromWysiwyg, setIsWidgetVisible, wysiwygRef]);

  const deleteActiveTableCol = useCallback(() => {
    if (activeTableCell && activeTable && wysiwygRef.current && wysiwygRef.current.contains(activeTableCell)) {
      const colIndex = (activeTableCell as HTMLTableCellElement).cellIndex;
      const rows = activeTable.querySelectorAll('tr');
      rows.forEach(row => {
        if (row.cells[colIndex]) {
          row.cells[colIndex].remove();
        }
      });
      
      if (activeTable.rows.length === 0 || (activeTable.rows[0] && activeTable.rows[0].cells.length === 0)) {
        activeTable.remove();
        setActiveTable(null);
        setActiveTableRow(null);
      }
      setActiveTableCell(null);
      
      updateContentFromWysiwyg();
      setIsWidgetVisible(false);
    }
  }, [activeTable, activeTableCell, updateContentFromWysiwyg, setIsWidgetVisible, wysiwygRef]);

  const deleteActiveTable = useCallback(() => {
    if (activeTable && wysiwygRef.current && wysiwygRef.current.contains(activeTable)) {
      activeTable.remove();
      setActiveTable(null);
      setActiveTableRow(null);
      setActiveTableCell(null);
      updateContentFromWysiwyg();
      setIsWidgetVisible(false);
    }
  }, [activeTable, updateContentFromWysiwyg, setIsWidgetVisible, wysiwygRef]);

  const importTable = useCallback(() => {
    setActiveModal('tableImport');
  }, [setActiveModal]);

  const processTableImport = useCallback(() => {
    const data = tableImportText;
    if (!data) {
      setActiveModal(null);
      return;
    }

    const lines = data.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) {
      setActiveModal(null);
      return;
    }

    // Detect delimiter
    const delimiters = ['\t', ';', ',', '|'];
    let bestDelimiter = '\t';
    let maxConsistency = -1;

    delimiters.forEach(d => {
      const colCounts = lines.map(l => l.split(d).length);
      const avg = colCounts.reduce((a, b) => a + b, 0) / colCounts.length;
      if (avg > 1.1) {
        const mostFrequent = colCounts.reduce((acc, curr) => {
          acc[curr] = (acc[curr] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        const frequency = Math.max(...Object.values(mostFrequent));
        if (frequency > maxConsistency) {
          maxConsistency = frequency;
          bestDelimiter = d;
        }
      }
    });

    const rows = lines.map(line => {
      let parts: string[];
      if (bestDelimiter === '|') {
        const trimmedLine = line.trim();
        parts = trimmedLine.split('|').map(p => p.trim());
        if (parts[0] === '') parts.shift();
        if (parts[parts.length - 1] === '') parts.pop();
      } else if (bestDelimiter === ',') {
        const partsArray = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            partsArray.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        partsArray.push(current.trim());
        parts = partsArray;
      } else {
        parts = line.split(bestDelimiter).map(p => p.trim());
      }
      return parts;
    });

    const maxCols = Math.max(...rows.map(r => r.length));
    
    const normalizedRows = rows.map(r => {
      const newRow = [...r];
      while (newRow.length < maxCols) {
        newRow.push('');
      }
      if (newRow.length > maxCols) {
        return newRow.slice(0, maxCols);
      }
      return newRow;
    });

    let resultTable = '';
    if (tableImportFormat === 'markdown') {
      normalizedRows.forEach((cols, i) => {
        const cleanCols = cols.map(c => {
          return c.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br/>').trim();
        });
        resultTable += '| ' + cleanCols.join(' | ') + ' |\n';
        if (i === 0) {
          resultTable += '| ' + cleanCols.map(() => '---').join(' | ') + ' |\n';
        }
      });
    } else {
      resultTable = '<table data-format="html" style="width:100%">\n';
      normalizedRows.forEach((cols, i) => {
        resultTable += '  <tr>\n';
        cols.forEach(col => {
          const tag = i === 0 ? 'th' : 'td';
          resultTable += `    <${tag}>${col}</${tag}>\n`;
        });
        resultTable += '  </tr>\n';
      });
      resultTable += '</table>';
    }
    
    insertAtCursor(resultTable, 'end');
    setTableImportText('');
    setActiveModal(null);
    notify(t('importTableSuccess'), 'success');
  }, [tableImportText, insertAtCursor, tableImportFormat, t, notify, setActiveModal, setTableImportText]);

  return {
    activeTable,
    setActiveTable,
    activeTableRow,
    setActiveTableRow,
    activeTableCell,
    setActiveTableCell,
    activeTableRef,
    activeTableRowRef,
    activeTableCellRef,
    tableRect,
    setTableRect,
    isTableMenuExpanded,
    setIsTableMenuExpanded,
    isTableMenuPinned,
    setIsTableMenuPinned,
    updateTableRect,
    deleteActiveTableRow,
    deleteActiveTableCol,
    deleteActiveTable,
    importTable,
    processTableImport,
  };
}
