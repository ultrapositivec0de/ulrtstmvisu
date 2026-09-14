import React from 'react';
import { AtSign } from 'lucide-react';
import { BaseModal } from './BaseModal';

export interface AccountPromptModalProps {
  showAccountPrompt: boolean;
  setShowAccountPrompt: (show: boolean) => void;
  username: string;
  setUsername: (username: string) => void;
  t: (key: any) => string;
}

export const AccountPromptModal: React.FC<AccountPromptModalProps> = ({
  showAccountPrompt,
  setShowAccountPrompt,
  username,
  setUsername,
  t,
}) => {
  return (
    <BaseModal
      isOpen={showAccountPrompt}
      onClose={() => setShowAccountPrompt(false)}
      size="sm"
      priority="critical"
      icon={AtSign}
      title={t('welcomeTitle')}
      modalKey="modal-account-prompt"
      className="max-w-sm"
      footer={
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]/60 flex flex-col gap-2">
          <button 
            type="button"
            onClick={() => setShowAccountPrompt(false)}
            className="w-full py-2.5 sm:py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-md shadow-cyan-900/30 transition-all active:scale-95 text-xs sm:text-sm uppercase cursor-pointer"
          >
            {t('saveAndStart')}
          </button>
          <button 
            type="button"
            onClick={() => setShowAccountPrompt(false)}
            className="w-full text-[10px] sm:text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium py-1 transition-colors cursor-pointer"
          >
            {t('skipForNow')}
          </button>
        </div>
      }
    >
      <div className="p-5 sm:p-6 text-center space-y-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto">
          <AtSign size={32} className="sm:size-[36px]" />
        </div>

        <p className="text-[var(--text-muted)] text-xs sm:text-sm leading-relaxed">
          {t('welcomeDesc')}
        </p>
        
        <div className="text-left space-y-1.5 pt-2">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block">
            {t('usernameNoAt')}
          </label>
          <input 
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
            placeholder="softpedia"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-main)] outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-bold placeholder:text-[var(--text-muted)] text-sm"
            onKeyDown={(e) => e.key === 'Enter' && setShowAccountPrompt(false)}
            autoFocus
          />
        </div>
      </div>
    </BaseModal>
  );
};
