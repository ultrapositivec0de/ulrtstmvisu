import { useState, useCallback } from 'react';
import { type TranslationKey } from '../locales';

export interface SystemDialogConfig {
  type: 'confirm' | 'prompt' | 'alert';
  inputType?: 'text' | 'password';
  title: string;
  message: string;
  resolve: (val: any) => void;
  defaultValue?: string;
  placeholder?: string;
}

export interface UseDialogsOptions {
  t: (key: TranslationKey) => string;
}

export function useDialogs({ t }: UseDialogsOptions) {
  const [systemDialog, setSystemDialog] = useState<SystemDialogConfig | null>(null);

  const confirmDialog = useCallback(
    (message: string, title?: string) => {
      return new Promise<boolean>((resolve) => {
        setSystemDialog({
          type: 'confirm',
          title: title || t('confirm'),
          message,
          resolve,
        });
      });
    },
    [t]
  );

  const promptDialog = useCallback(
    (
      message: string,
      defaultValue: string = '',
      title?: string,
      inputType?: 'text' | 'password'
    ) => {
      return new Promise<string | null>((resolve) => {
        setSystemDialog({
          type: 'prompt',
          title: title || t('link'),
          message,
          resolve,
          defaultValue,
          inputType,
        });
      });
    },
    [t]
  );

  return {
    systemDialog,
    setSystemDialog,
    confirmDialog,
    promptDialog,
  };
}
