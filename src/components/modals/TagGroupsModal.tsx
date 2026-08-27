import React from 'react';
import { motion } from 'motion/react';
import { Tags, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TagGroup {
  id: string;
  name: string;
  tags: string[];
}

interface TagGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagGroups: TagGroup[];
  setTagGroups: (groups: TagGroup[]) => void;
  pubTags: string;
  setPubTags: (tags: string) => void;
  promptDialog: (title: string, defaultValue?: string) => Promise<string | null>;
  confirmDialog: (msg: string) => Promise<boolean>;
  t: (key: any) => string;
}

export const TagGroupsModal: React.FC<TagGroupsModalProps> = ({
  isOpen,
  onClose,
  tagGroups,
  setTagGroups,
  pubTags,
  setPubTags,
  promptDialog,
  confirmDialog,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div key="modal-tag-groups" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
            <Tags className="text-cyan-400" /> {t('tagGroups')}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <button 
            onClick={async () => {
              const name = await promptDialog(t('addTagGroup'));
              if (!name) return;
              const tags = await promptDialog(t('tagsPlaceholder'));
              if (!tags) return;
              const newGroup: TagGroup = {
                id: Date.now().toString(),
                name,
                tags: tags.split(/\s+/).filter(Boolean)
              };
              setTagGroups([...tagGroups, newGroup]);
            }}
            className="w-full py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors font-bold text-sm"
          >
            {t('addTagGroup')}
          </button>
          <div className="space-y-2 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
            {tagGroups.map(group => (
              <div key={group.id} className="p-3 bg-slate-800 rounded-lg group">
                <div className="flex justify-between items-center mb-1">
                  <button 
                    onClick={() => {
                      const currentTags = pubTags.split(/\s+/).filter(Boolean);
                      const nextTags = [...currentTags];
                      group.tags.forEach(tag => {
                        if (!nextTags.includes(tag)) nextTags.push(tag);
                      });
                      setPubTags(nextTags.join(' '));
                    }}
                    className="font-bold text-sm hover:text-cyan-400 transition-colors"
                  >
                    {group.name} ({t('applyGroup')})
                  </button>
                  <button 
                    onClick={async () => {
                      if (await confirmDialog(t('delete') + '?')) {
                        setTagGroups(tagGroups.filter(g => g.id !== group.id));
                      }
                    }}
                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.tags.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => {
                        const currentTags = pubTags.split(/\s+/).filter(Boolean);
                        if (currentTags.includes(tag)) {
                          setPubTags(currentTags.filter(t => t !== tag).join(' '));
                        } else {
                          setPubTags([...currentTags, tag].join(' '));
                        }
                      }}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded transition-colors",
                        pubTags.includes(tag) ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      )}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
