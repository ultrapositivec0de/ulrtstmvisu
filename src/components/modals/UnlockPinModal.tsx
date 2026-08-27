import React from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
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
  if (!isOpen) return null;

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
    <div key="modal-unlock-pin" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-[240px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-none p-5 text-center overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-600" />
        
        <div className="w-10 h-10 bg-cyan-600/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
          <Lock className="text-cyan-400" size={18} />
        </div>
        
        <h3 className="text-sm font-bold mb-1 text-slate-100 uppercase tracking-tight">{t('vaultLocked')}</h3>
        <p className="text-[10px] text-slate-500 mb-4">{t('enterPinPlaceholder')}</p>
        
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
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-center text-lg tracking-[0.5em] focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:tracking-normal placeholder:text-[10px] text-cyan-400 font-mono"
          placeholder="••••"
        />
        
        <div className="flex gap-2 mt-5">
          <button 
            onClick={onClose}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-[10px] font-bold transition-all uppercase"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleUnlock}
            className="flex-[2] py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-cyan-900/20 uppercase"
          >
            {t('unlock')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
