import React from 'react';
import { motion } from 'motion/react';
import { Layers, X } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div key="modal-split" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
        className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Layers className="text-cyan-400" /> {t('splitPost')}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {t('splitPostDesc')}
          </p>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-3">
              <span>{t('minWordsPerPart') || 'Words per part'}</span>
              <input 
                type="number" 
                value={splitWords} 
                onChange={(e) => setSplitWords(Number(e.target.value))}
                className="w-16 sm:w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white flex items-baseline gap-2">
              {Math.ceil(wordsCount / (splitWords || 300))}
              <span className="text-xs text-slate-500 font-medium">{t('parts')}</span>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 bg-slate-800/30 border-t border-slate-800 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold rounded-xl transition-all"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSplitPost}
            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98]"
          >
            {t('splitBtn')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
