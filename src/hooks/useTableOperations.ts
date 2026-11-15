import { useState, useRef, useCallback, useEffect } from 'react';
import { formatImportedTable } from '../utils/tableOperations';

interface UseTableOperationsProps {
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  updateContentFromWysiwyg: () => void;
  setIsWidgetVisible: (visible: boolean) => void;
  setActiveModal: (modal: any) => void;
  tableImportText?: string;
  setTableImportText?: (text: string) => void;
  tableImportFormat?: 'markdown' | 'html';
  setTableImportFormat?: (format: 'markdown' | 'html') => void;
  insertAtCursor: (text: string, ...args: any[]) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'loading') => void;
  t: (key: any) => string;
}

export function useTableOperations(props: UseTableOperationsProps) {
  const {
    wysiwygRef,
    updateContentFromWysiwyg,
    setIsWidgetVisible,
    setActiveModal,
    insertAtCursor,
    notify,
    t,
  } = props;

  const [internalTableImportText, setInternalTableImportText] = useState('');
  const [internalTableImportFormat, setInternalTableImportFormat] = useState<'markdown' | 'html'>('markdown');
  const [tableSelectorPos, setTableSelectorPos] = useState<{ x: number; y: number; direction: 'up' | 'down' } | null>(null);

  const tableImportText = props.tableImportText !== undefined ? props.tableImportText : internalTableImportText;
  const setTableImportText = props.setTableImportText || setInternalTableImportText;
  const tableImportFormat = props.tableImportFormat !== undefined ? props.tableImportFormat : internalTableImportFormat;
  const setTableImportFormat = props.setTableImportFormat || setInternalTableImportFormat;
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

  const rafIdRef = useRef<number | null>(null);

  const updateTableRect = useCallback(() => {
    if (!activeTable) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setTableRect(null);
      return;
    }

    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (activeTable) {
        const nextRect = activeTable.getBoundingClientRect();
        setTableRect(prev => {
          if (
            prev &&
            Math.abs(prev.top - nextRect.top) < 0.5 &&
            Math.abs(prev.left - nextRect.left) < 0.5 &&
            Math.abs(prev.width - nextRect.width) < 0.5 &&
            Math.abs(prev.height - nextRect.height) < 0.5
          ) {
            return prev;
          }
          return nextRect;
        });
      }
    });
  }, [activeTable]);

  useEffect(() => {
    updateTableRect();
    window.addEventListener('resize', updateTableRect, { passive: true });
    const scrollContainer = wysiwygRef.current;
    if (scrollContainer && activeTable) {
      scrollContainer.addEventListener('scroll', updateTableRect, { passive: true });
    }
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
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
    if (!data || !data.trim()) {
      setActiveModal(null);
      return;
    }

    const resultTable = formatImportedTable(data, tableImportFormat);
    if (!resultTable) {
      setActiveModal(null);
      return;
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
    tableImportText,
    setTableImportText,
    tableImportFormat,
    setTableImportFormat,
    tableSelectorPos,
    setTableSelectorPos,
  };
}
