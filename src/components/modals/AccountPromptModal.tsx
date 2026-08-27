import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AtSign } from 'lucide-react';

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
    <AnimatePresence>
      {showAccountPrompt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl shadow-none max-w-sm w-full p-6 sm:p-8 text-center max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-none">
              <AtSign size={32} className="text-white sm:size-[40px]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('welcomeTitle')}</h1>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
              {t('welcomeDesc')}
            </p>
            
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">
                  {t('usernameNoAt')}
                </label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="softpedia"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-bold placeholder:text-slate-700 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && setShowAccountPrompt(false)}
                  autoFocus
                />
              </div>
              
              <button 
                onClick={() => setShowAccountPrompt(false)}
                className="w-full py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition-all active:scale-95 text-sm sm:text-base"
              >
                {t('saveAndStart')}
              </button>
              <button 
                onClick={() => setShowAccountPrompt(false)}
                className="w-full text-[10px] sm:text-xs text-slate-500 hover:text-slate-300 font-medium py-2"
              >
                {t('skipForNow')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
