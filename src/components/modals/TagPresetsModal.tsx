import React from 'react';
import { motion } from 'motion/react';
import { Tags, LayoutGrid, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Community {
  id: string;
  name: string;
  tags: string[];
}

interface TagPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubTags: string;
  setPubTags: React.Dispatch<React.SetStateAction<string>>;
  toggleTag: (tag: string) => void;
  communities: Community[];
  commonTags: string[];
  t: (key: any) => string;
}

export const TagPresetsModal: React.FC<TagPresetsModalProps> = ({
  isOpen,
  onClose,
  pubTags,
  setPubTags,
  toggleTag,
  communities,
  commonTags,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div key="modal-tag-presets" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
        className="relative w-full sm:max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[80vh]"
      >
        <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Tags className="text-cyan-400" /> {t('tagPresets')}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <LayoutGrid size={18} /> {t('communities')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {communities.map((comm, cIdx) => (
                <div 
                  key={comm.id || `comm-${cIdx}`}
                  onClick={() => {
                    const allSelected = comm.tags.every(t => pubTags.includes(t));
                    if (allSelected) {
                      setPubTags(prev => {
                        const tags = prev.split(' ').filter(t => t.trim());
                        return tags.filter(t => !comm.tags.includes(t)).join(' ');
                      });
                    } else {
                      setPubTags(prev => {
                        const tags = prev.split(' ').filter(t => t.trim());
                        comm.tags.forEach(t => {
                          if (!tags.includes(t)) tags.push(t);
                        });
                        return tags.join(' ');
                      });
                    }
                  }}
                  className={cn(
                    "flex flex-col items-start p-4 border rounded-xl transition-all bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50",
                    comm.tags.every(t => pubTags.includes(t)) ? "border-cyan-500 bg-cyan-500/10" : (comm.tags.some(t => pubTags.includes(t)) && "border-cyan-500/50 bg-cyan-500/5")
                  )}
                >
                  <span className="font-bold text-sm text-slate-200 mb-2">{comm.name}</span>
                  <div className="flex flex-wrap gap-1">
                    {comm.tags.filter(Boolean).map((tag, tIdx) => (
                      <button
                        key={tag || `comm-tag-${tIdx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTag(tag);
                        }}
                        className={cn(
                          "text-[9px] px-2 py-0.5 rounded-full border transition-all",
                          pubTags.includes(tag)
                            ? "bg-cyan-600 border-cyan-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600"
                        )}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Plus size={18} /> {t('commonTags')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {commonTags.filter(Boolean).map((tag, tIdx) => (
                <button 
                  key={tag || `common-tag-${tIdx}`}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    pubTags.includes(tag) 
                      ? "bg-cyan-600 border-cyan-500 text-white" 
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </section>
        </div>
        
        <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
          <button 
            onClick={() => setPubTags('')}
            className="px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
          >
            {t('clear')}
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-sm transition-all"
          >
            {t('done')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
