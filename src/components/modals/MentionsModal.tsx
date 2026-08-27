import React from 'react';
import { motion } from 'motion/react';
import { AtSign, Plus, X } from 'lucide-react';

interface MentionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentions: string[];
  setMentions: React.Dispatch<React.SetStateAction<string[]>>;
  newMention: string;
  setNewMention: (val: string) => void;
  addMention: () => void;
  insertAtCursor: (text: string) => void;
  confirmDialog: (msg: string) => Promise<boolean>;
  storageKey: string;
  t: (key: any) => string;
}

export const MentionsModal: React.FC<MentionsModalProps> = ({
  isOpen,
  onClose,
  mentions,
  setMentions,
  newMention,
  setNewMention,
  addMention,
  insertAtCursor,
  confirmDialog,
  storageKey,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div key="modal-mentions" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <AtSign className="text-cyan-400" /> {t('mentions')}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newMention}
              onChange={e => setNewMention(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder={t('username')}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addMention();
                }
              }}
            />
            <button 
              onClick={addMention}
              className="p-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
            {mentions.map(user => (
              <div key={user} className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 group">
                <button 
                  onClick={() => { 
                    insertAtCursor(`@${user} `); 
                    onClose(); 
                  }}
                  className="text-sm font-bold hover:text-cyan-400 transition-colors"
                >
                  @{user}
                </button>
                <button 
                  onClick={async () => {
                    if (await confirmDialog(t('delete') + '?')) {
                      const updated = mentions.filter(u => u !== user);
                      setMentions(updated);
                      localStorage.setItem(storageKey, JSON.stringify(updated));
                    }
                  }}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
