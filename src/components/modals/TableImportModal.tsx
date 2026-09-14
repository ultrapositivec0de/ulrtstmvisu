import React from 'react';
import { Table as TableIcon, Trash2 } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { cn } from '../../lib/utils';

interface TableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableImportText: string;
  setTableImportText: (val: string) => void;
  tableImportFormat: 'markdown' | 'html';
  setTableImportFormat: (val: 'markdown' | 'html') => void;
  processTableImport: () => void;
  t: (key: any) => string;
}

export const TableImportModal: React.FC<TableImportModalProps> = ({
  isOpen,
  onClose,
  tableImportText,
  setTableImportText,
  tableImportFormat,
  setTableImportFormat,
  processTableImport,
  t
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={TableIcon}
      title={t('importTableTitle')}
      modalKey="modal-table"
      headerRight={
        tableImportText ? (
          <button 
            onClick={() => setTableImportText('')}
            className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
          >
            <Trash2 size={14} /> {t('clear')}
          </button>
        ) : null
      }
      bodyClassName="p-5 sm:p-6 space-y-4"
    >
      <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{t('importTableDesc')}</p>
      
      <textarea 
        className="w-full h-48 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-4 text-xs sm:text-sm text-[var(--text-main)] outline-none focus:ring-1 focus:ring-cyan-500 custom-scrollbar resize-none font-mono"
        placeholder={t('importTablePlaceholder')}
        value={tableImportText}
        onChange={e => setTableImportText(e.target.value)}
        autoFocus
      />

      <div className="flex items-center justify-between bg-[var(--bg-main)]/50 p-2.5 rounded-xl border border-[var(--border-color)]">
        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1.5">{t('tableFormat')}</span>
        <div className="flex bg-[var(--bg-card)] p-1 rounded-lg gap-1 border border-[var(--border-color)]">
          <button 
            onClick={() => setTableImportFormat('markdown')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer", 
              tableImportFormat === 'markdown' ? "bg-cyan-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
          >
            Markdown
          </button>
          <button 
            onClick={() => setTableImportFormat('html')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer", 
              tableImportFormat === 'html' ? "bg-cyan-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
          >
            HTML
          </button>
        </div>
      </div>

      <button 
        onClick={processTableImport}
        disabled={!tableImportText.trim()}
        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-cyan-900/20 active:scale-[0.98] cursor-pointer"
      >
        {t('importBtn')}
      </button>
    </BaseModal>
  );
};
