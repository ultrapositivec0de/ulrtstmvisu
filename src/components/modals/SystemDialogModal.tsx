import React from 'react';
import { motion } from 'motion/react';

export interface SystemDialogState {
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  inputType?: 'text' | 'password';
  defaultValue?: string;
  placeholder?: string;
  resolve: (value: any) => void;
}

interface SystemDialogModalProps {
  systemDialog: SystemDialogState | null;
  setSystemDialog: React.Dispatch<React.SetStateAction<SystemDialogState | null>>;
  t: (key: any) => string;
}

export const SystemDialogModal: React.FC<SystemDialogModalProps> = ({
  systemDialog,
  setSystemDialog,
  t
}) => {
  if (!systemDialog) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-none w-full sm:max-w-md border border-slate-200 dark:border-slate-700 mx-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="p-4 sm:p-6 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">{systemDialog.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{systemDialog.message}</p>
          
          {systemDialog.type === 'prompt' && (
            <input
              autoFocus
              ref={(input) => {
                if (input) {
                  setTimeout(() => input.focus(), 10);
                }
              }}
              type={systemDialog.inputType || "text"}
              defaultValue={systemDialog.defaultValue}
              placeholder={systemDialog.placeholder}
              className="w-full px-4 py-2 mb-6 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  systemDialog.resolve((e.target as HTMLInputElement).value);
                  setSystemDialog(null);
                }
                if (e.key === 'Escape') {
                  systemDialog.resolve(null);
                  setSystemDialog(null);
                }
              }}
              id="system-dialog-input"
            />
          )}
          
          <div className="flex justify-center sm:justify-end gap-3 font-bold">
            {systemDialog.type !== 'alert' && (
              <button 
                onClick={() => {
                  systemDialog.resolve(null);
                  setSystemDialog(null);
                }}
                className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-xs"
              >
                {t('cancel') || 'Скасувати'}
              </button>
            )}
            <button 
              onClick={() => {
                if (systemDialog.type === 'prompt') {
                  const val = (document.getElementById('system-dialog-input') as HTMLInputElement)?.value;
                  systemDialog.resolve(val);
                } else {
                  systemDialog.resolve(true);
                }
                setSystemDialog(null);
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30 text-xs sm:text-sm active:scale-95"
            >
              {systemDialog.type === 'alert' ? 'OK' : (t('confirm') || 'OK')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
