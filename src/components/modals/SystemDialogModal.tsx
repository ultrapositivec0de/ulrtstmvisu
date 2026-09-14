import React, { useRef, useEffect } from 'react';
import { AlertCircle, HelpCircle, MessageSquare } from 'lucide-react';
import { BaseModal } from './BaseModal';

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (systemDialog?.type === 'prompt' && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [systemDialog]);

  if (!systemDialog) return null;

  const handleClose = () => {
    if (systemDialog.type === 'alert') {
      systemDialog.resolve(true);
    } else {
      systemDialog.resolve(null);
    }
    setSystemDialog(null);
  };

  const handleCancel = () => {
    systemDialog.resolve(null);
    setSystemDialog(null);
  };

  const handleConfirm = () => {
    if (systemDialog.type === 'prompt') {
      const val = inputRef.current ? inputRef.current.value : (systemDialog.defaultValue || '');
      systemDialog.resolve(val);
    } else {
      systemDialog.resolve(true);
    }
    setSystemDialog(null);
  };

  const getIcon = () => {
    switch (systemDialog.type) {
      case 'alert':
        return AlertCircle;
      case 'prompt':
        return MessageSquare;
      case 'confirm':
      default:
        return HelpCircle;
    }
  };

  return (
    <BaseModal
      isOpen={!!systemDialog}
      onClose={handleClose}
      size="sm"
      priority="critical"
      icon={getIcon()}
      title={systemDialog.title}
      modalKey="modal-system-dialog"
      className="max-w-[420px]"
      footer={
        <div className="flex justify-end items-center gap-2.5 p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]/60">
          {systemDialog.type !== 'alert' && (
            <button 
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-xl transition-colors text-xs font-bold uppercase cursor-pointer"
            >
              {t('cancel') || 'Скасувати'}
            </button>
          )}
          <button 
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-900/20 uppercase cursor-pointer active:scale-95"
          >
            {systemDialog.type === 'alert' ? 'OK' : (t('confirm') || 'OK')}
          </button>
        </div>
      }
    >
      <div className="p-4 sm:p-5 space-y-4">
        <p className="text-sm text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">
          {systemDialog.message}
        </p>
        
        {systemDialog.type === 'prompt' && (
          <input
            ref={inputRef}
            type={systemDialog.inputType || "text"}
            defaultValue={systemDialog.defaultValue}
            placeholder={systemDialog.placeholder}
            className="w-full px-3.5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-sm outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
              }
            }}
            id="system-dialog-input"
          />
        )}
      </div>
    </BaseModal>
  );
};
