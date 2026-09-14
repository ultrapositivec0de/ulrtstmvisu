import React from 'react';
import { Layers } from 'lucide-react';
import { BaseModal } from './BaseModal';

interface SplitPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  splitWords: number;
  setSplitWords: (val: number) => void;
  wordsCount: number;
  handleSplitPost: () => void;
  t: (key: any) => string;
}

export const SplitPostModal: React.FC<SplitPostModalProps> = ({
  isOpen,
  onClose,
  splitWords,
  setSplitWords,
  wordsCount,
  handleSplitPost,
  t
}) => {
  const partsCount = Math.ceil(wordsCount / (splitWords || 300));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={Layers}
      title={t('splitPost')}
      modalKey="modal-split"
      bodyClassName="p-5 sm:p-6 space-y-4"
    >
      <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
        {t('splitPostDesc')}
      </p>

      <div className="bg-[var(--bg-main)]/50 p-4 rounded-xl border border-[var(--border-color)]">
        <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-[var(--text-muted)] uppercase mb-3">
          <span>{t('minWordsPerPart') || 'Words per part'}</span>
          <input 
            type="number" 
            min={50}
            step={50}
            value={splitWords} 
            onChange={(e) => setSplitWords(Math.max(1, Number(e.target.value)))}
            className="w-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-cyan-400 font-bold text-center focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[var(--text-main)] flex items-baseline gap-2">
          {partsCount}
          <span className="text-xs text-[var(--text-muted)] font-medium">{t('parts')}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button 
          onClick={onClose}
          className="flex-1 py-2.5 bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs sm:text-sm font-bold rounded-xl transition-all border border-[var(--border-color)] cursor-pointer"
        >
          {t('cancel')}
        </button>
        <button 
          onClick={handleSplitPost}
          className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98] cursor-pointer"
        >
          {t('splitBtn')}
        </button>
      </div>
    </BaseModal>
  );
};
