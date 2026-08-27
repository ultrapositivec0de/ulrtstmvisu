import React from 'react';
import { motion } from 'motion/react';
import { Table as TableIcon, Trash2, X } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div key="modal-table" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TableIcon className="text-cyan-400" /> {t('importTableTitle')}
          </h2>
          <div className="flex items-center gap-2">
            {tableImportText && (
              <button 
                onClick={() => setTableImportText('')}
                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 px-2 py-1"
              >
                <Trash2 size={16} /> {t('clear')}
              </button>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-400">{t('importTableDesc')}</p>
          <textarea 
            className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-cyan-500 custom-scrollbar resize-none"
            placeholder={t('importTablePlaceholder')}
            value={tableImportText}
            onChange={e => setTableImportText(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded-lg border border-slate-800">
            <span className="text-xs font-bold text-slate-500 uppercase ml-2">{t('tableFormat')}</span>
            <div className="flex bg-slate-900 p-1 rounded-md gap-1">
              <button 
                onClick={() => setTableImportFormat('markdown')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded transition-all", 
                  tableImportFormat === 'markdown' ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Markdown
              </button>
              <button 
                onClick={() => setTableImportFormat('html')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded transition-all", 
                  tableImportFormat === 'html' ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
              >
                HTML
              </button>
            </div>
          </div>
          <button 
            onClick={processTableImport}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-900/20"
          >
            {t('importBtn')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
