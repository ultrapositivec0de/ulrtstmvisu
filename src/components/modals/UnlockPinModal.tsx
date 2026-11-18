import React from 'react';
import { Lock } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { SecurityService } from '../../services/securityService';
import { useDeviceStore } from '../../store/deviceStore';
import { cn } from '../../lib/utils';

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
  const isKeyboardOpen = useDeviceStore(s => s.isKeyboardOpen);
  const viewportHeight = useDeviceStore(s => s.viewportHeight);
  const isCompactKeyboard = isKeyboardOpen && viewportHeight > 0 && viewportHeight < 520;

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
        <div className={cn(
          'flex gap-2 border-t border-[var(--border-color)] bg-[var(--bg-main)]/60',
          isCompactKeyboard ? 'p-3' : 'p-4'
        )}>
          <button 
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 py-2.5 px-3 text-xs uppercase min-h-[40px]"
          >
            {t('cancel')}
          </button>
          <button 
            type="button"
            onClick={handleUnlock}
            className="btn-primary flex-[2] py-2.5 px-3 text-xs uppercase min-h-[40px]"
          >
            {t('unlock')}
          </button>
        </div>
      }
    >
      <div className={cn(
        'text-center',
        isCompactKeyboard ? 'p-3.5 space-y-2.5' : 'p-5 space-y-4'
      )}>
        {!isCompactKeyboard && (
          <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto border border-cyan-500/20 text-cyan-400">
            <Lock size={22} />
          </div>
        )}

        <div>
          <p className="text-xs text-[var(--text-muted)]">{t('enterPinPlaceholder')}</p>
        </div>

        <input 
          autoFocus
          type="password"
          enterKeyHint="done"
          autoComplete="current-password"
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
