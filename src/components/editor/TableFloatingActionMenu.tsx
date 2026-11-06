import React from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TableFloatingActionMenuProps {
  activeTable: Element | null;
  tableRect: { top: number; bottom: number; left: number; right: number } | null;
  editorPaneRef: React.RefObject<HTMLDivElement | null>;
  isTableMenuPinned: boolean;
  setIsTableMenuPinned: (pinned: boolean) => void;
  isTableMenuExpanded: boolean;
  setIsTableMenuExpanded: (expanded: boolean) => void;
  deleteActiveTableRow: () => void;
  deleteActiveTableCol: () => void;
  deleteActiveTable: () => void;
  editorMode: 'visual' | 'markdown' | 'reading';
  activeModal: string | null;
  isMiniGalleryOpen: boolean;
  t: (key: any) => string;
}

export const TableFloatingActionMenu: React.FC<TableFloatingActionMenuProps> = React.memo(({
  activeTable,
  tableRect,
  editorPaneRef,
  isTableMenuPinned,
  setIsTableMenuPinned,
  isTableMenuExpanded,
  setIsTableMenuExpanded,
  deleteActiveTableRow,
  deleteActiveTableCol,
  deleteActiveTable,
  editorMode,
  activeModal,
  isMiniGalleryOpen,
  t,
}) => {
  if (!activeTable || !tableRect || editorMode !== 'visual' || activeModal || isMiniGalleryOpen) {
    return null;
  }

  const paneRect = editorPaneRef.current?.getBoundingClientRect();
  const paneLeft = paneRect ? paneRect.left : 0;
  const minAllowedLeft = paneLeft + 8;
  const menuLeft = Math.max(minAllowedLeft, tableRect.left);
  // Position directly ABOVE the table top border:
  // Header height is ~60px, so clamp top to ensure it stays visible under header
  const idealTop = tableRect.top - 42;
  const menuTop = Math.max(64, idealTop);

  const isOutOfView = tableRect.bottom < 70 || tableRect.top > (typeof window !== 'undefined' ? window.innerHeight - 30 : 800);

  return (
    <div 
      className={cn(
        "fixed z-[35] flex items-center transition-all duration-150",
        isTableMenuExpanded || isTableMenuPinned 
          ? "flex-row gap-1 p-1 bg-[var(--bg-overlay-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl backdrop-blur-dynamic" 
          : "bg-transparent shadow-none"
      )}
      style={{
        top: menuTop,
        left: menuLeft,
        display: isOutOfView ? 'none' : undefined,
      }}
      onMouseEnter={() => !isTableMenuPinned && setIsTableMenuExpanded(true)}
      onMouseLeave={() => !isTableMenuPinned && setIsTableMenuExpanded(false)}
    >
      {isTableMenuExpanded || isTableMenuPinned ? (
        <>
          <button 
            id="table-action-pin"
            key="table-action-pin"
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              const newPinned = !isTableMenuPinned;
              setIsTableMenuPinned(newPinned);
              try {
                localStorage.setItem('steem_table_menu_pinned', newPinned.toString());
              } catch {
                /* ignore */
              }
            }} 
            className={cn("p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer", isTableMenuPinned ? "text-cyan-400 bg-cyan-900/40" : "text-slate-400 hover:text-white hover:bg-slate-800")}
            title={isTableMenuPinned ? t('tablePinUnlockTitle') : t('tablePinLockTitle')}
            aria-label={isTableMenuPinned ? t('tablePinUnlockTitle') : t('tablePinLockTitle')}
          >
            <Settings size={15} />
          </button>
          <div key="table-action-sep-1" className="h-4 w-px bg-slate-700/70 mx-0.5" />
          <button 
            id="table-action-del-row"
            key="table-action-del-row"
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={deleteActiveTableRow} 
            className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs" 
            title={t('tableDeleteRowTitle')}
            aria-label={t('tableDeleteRowTitle')}
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline text-[11px] text-slate-300">{t('tableDeleteRowLabel')}</span>
          </button>
          <button 
            id="table-action-del-col"
            key="table-action-del-col"
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={deleteActiveTableCol} 
            className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs" 
            title={t('tableDeleteColTitle')}
            aria-label={t('tableDeleteColTitle')}
          >
            <Trash2 size={15} className="rotate-90" />
            <span className="hidden sm:inline text-[11px] text-slate-300">{t('tableDeleteColLabel')}</span>
          </button>
          <div key="table-action-sep-2" className="h-4 w-px bg-slate-700/70 mx-0.5" />
          <button 
            id="table-action-del-table"
            key="table-action-del-table"
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={deleteActiveTable} 
            className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs font-medium" 
            title={t('tableDeleteTableTitle')}
            aria-label={t('tableDeleteTableTitle')}
          >
            <Trash2 size={15} />
            <span className="hidden sm:inline text-[11px]">{t('tableDeleteTableLabel')}</span>
          </button>
        </>
      ) : (
        <button 
          id="table-action-expand"
          key="table-action-expand"
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => setIsTableMenuExpanded(true)}
          className="px-2 py-1 text-[var(--text-main)] bg-[var(--bg-overlay-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-xs backdrop-blur-dynamic" 
          title={t('tableOperationsTitle')}
          aria-label={t('tableOperationsTitle')}
        >
          <Settings size={14} className="text-cyan-400" />
          <span className="text-[11px] font-medium text-[var(--text-main)]">{t('tableDeleteTableLabel')}</span>
        </button>
      )}
    </div>
  );
});

TableFloatingActionMenu.displayName = 'TableFloatingActionMenu';
export default TableFloatingActionMenu;
