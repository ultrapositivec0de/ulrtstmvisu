import React from 'react';
import { AtSign, Plus, X } from 'lucide-react';
import { BaseModal } from './BaseModal';

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
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={AtSign}
      title={t('mentions')}
      modalKey="modal-mentions"
      bodyClassName="p-5 sm:p-6 space-y-4"
    >
      <div className="flex gap-2">
        <input 
          type="text" 
          value={newMention}
          onChange={e => setNewMention(e.target.value)}
          className="flex-1 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-[var(--text-muted)]"
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
          disabled={!newMention.trim()}
          className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-cyan-900/20 active:scale-95 cursor-pointer shrink-0"
          aria-label={t('add') || "Add"}
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
        {mentions.filter(Boolean).map((user, idx) => (
          <div 
            key={`modal-mention-user-${user}-${idx}`} 
            className="flex items-center gap-1.5 bg-[var(--bg-main)]/60 px-3 py-1.5 rounded-full border border-[var(--border-color)] group hover:border-cyan-500/30 transition-colors"
          >
            <button 
              onClick={() => { 
                insertAtCursor(`@${user} `); 
                onClose(); 
              }}
              className="text-xs sm:text-sm font-bold text-[var(--text-main)] hover:text-cyan-400 transition-colors cursor-pointer"
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
              className="text-[var(--text-muted)] hover:text-red-400 opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
              title={t('delete')}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {mentions.length === 0 && (
          <p className="text-center text-xs text-[var(--text-muted)] py-4 w-full">
            {t('noMentions') || "Немає збережених згадувань"}
          </p>
        )}
      </div>
    </BaseModal>
  );
};
