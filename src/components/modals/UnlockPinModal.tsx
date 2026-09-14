import React from 'react';
import { Lock } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { SecurityService } from '../../services/securityService';

interface UnlockPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultPin: string;
  setVaultPin: (pin: string) => void;
  initVault: () => void;
  notify: (msg: string, type?: any) => void;
  t: (key: any) => string;
}

export const UnlockPinModal: React.FC<UnlockPinModalProps> = ({
  isOpen,
  onClose,
  vaultPin,
  setVaultPin,
  initVault,
  notify,
  t
}) => {
  const handleUnlock = async () => {
    if (!vaultPin) return;
    try {
      await SecurityService.unlock(vaultPin);
      notify(t('vaultUnlocked'), 'success');
      setVaultPin('');
      onClose();
      initVault();
    } catch (err: any) {
      notify(t('pinError'), 'error');
      setVaultPin('');
      console.error(err);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      priority="critical"
      icon={Lock}
      title={t('vaultLocked')}
      modalKey="modal-unlock-pin"
      className="max-w-[340px]"
      footer={
        <div className="flex gap-2 p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]/60">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] rounded-xl text-xs font-bold transition-all uppercase cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button 
            type="button"
            onClick={handleUnlock}
            className="flex-[2] py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-900/20 uppercase cursor-pointer"
          >
            {t('unlock')}
          </button>
        </div>
      }
    >
      <div className="p-5 text-center space-y-4">
        <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto border border-cyan-500/20 text-cyan-400">
          <Lock size={22} />
        </div>

        <div>
          <p className="text-xs text-[var(--text-muted)]">{t('enterPinPlaceholder')}</p>
        </div>

        <input 
          autoFocus
          type="password"
          value={vaultPin}
          onChange={e => setVaultPin(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              await handleUnlock();
            }
          }}
          className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-center text-xl tracking-[0.4em] focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder:tracking-normal placeholder:text-xs text-cyan-400 font-mono"
          placeholder="••••"
        />
      </div>
    </BaseModal>
  );
};
