import React from 'react';
import { Tags, LayoutGrid, Plus, Star } from 'lucide-react';
import { BaseModal } from './BaseModal';
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
  pinTag: (tag: string) => void;
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
  pinTag,
  t
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      icon={Tags}
      title={t('tagPresets')}
      modalKey="modal-tag-presets"
      bodyClassName="flex flex-col flex-1 overflow-hidden"
    >
      <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
        <section>
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3.5 flex items-center gap-2">
            <LayoutGrid size={16} /> {t('communities')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {communities.map((comm, cIdx) => {
              const allSelected = comm.tags.length > 0 && comm.tags.every(t => pubTags.includes(t));
              const someSelected = comm.tags.some(t => pubTags.includes(t));
              return (
                <div 
                  key={comm.id || `comm-${cIdx}`}
                  onClick={() => {
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
                    "flex flex-col items-start p-3.5 border rounded-xl transition-all bg-[var(--bg-main)]/60 border-[var(--border-color)] cursor-pointer hover:border-cyan-500/50",
                    allSelected ? "border-cyan-500 bg-cyan-500/10" : (someSelected && "border-cyan-500/50 bg-cyan-500/5")
                  )}
                >
                  <span className="font-bold text-xs sm:text-sm text-[var(--text-main)] mb-2">{comm.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {comm.tags.filter(Boolean).map((tag, tIdx) => (
                      <div 
                        key={`preset-comm-${comm.id || cIdx}-tag-${tag}-${tIdx}`}
                        className="flex items-center gap-0.5 shrink-0"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTag(tag);
                          }}
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-l-full border-y border-l transition-all font-medium h-6 flex items-center justify-center",
                            pubTags.includes(tag)
                              ? "bg-cyan-600 border-cyan-500 text-white shadow-xs"
                              : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500"
                          )}
                        >
                          #{tag}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            pinTag(tag);
                          }}
                          className={cn(
                            "px-1.5 rounded-r-full border-y border-r transition-all h-6 flex items-center justify-center hover:text-amber-400 cursor-pointer text-slate-500",
                            pubTags.includes(tag)
                              ? "bg-cyan-600 border-cyan-500 text-cyan-200"
                              : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500"
                          )}
                          title={t('pinTagQuickSelect')}
                        >
                          <Star size={10} className="stroke-[2.5]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        
        <section>
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Plus size={16} /> {t('commonTags')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {commonTags.filter(Boolean).map((tag, tIdx) => (
              <div 
                key={`preset-common-tag-${tag}-${tIdx}`}
                className="flex items-center gap-0.5 shrink-0"
              >
                <button 
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-l-xl text-xs font-medium border-y border-l transition-all cursor-pointer h-8 flex items-center justify-center",
                    pubTags.includes(tag) 
                      ? "bg-cyan-600 border-cyan-500 text-white shadow-xs" 
                      : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500 hover:text-[var(--text-main)]"
                  )}
                >
                  #{tag}
                </button>
                <button
                  type="button"
                  onClick={() => pinTag(tag)}
                  className={cn(
                    "px-2 rounded-r-xl border-y border-r transition-all h-8 flex items-center justify-center hover:text-amber-400 cursor-pointer text-slate-500",
                    pubTags.includes(tag)
                      ? "bg-cyan-600 border-cyan-500 text-cyan-200"
                      : "bg-[var(--bg-card)] border-[var(--border-color)] hover:border-slate-500 text-[var(--text-muted)]"
                  )}
                  title={t('pinTagQuickSelect')}
                >
                  <Star size={12} className="stroke-[2.5]" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
      
      <div className="p-4 sm:p-5 bg-[var(--bg-main)]/40 border-t border-[var(--modal-border)] flex justify-between items-center shrink-0">
        <button 
          type="button"
          onClick={() => setPubTags('')}
          className="px-3.5 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-red-500/10 cursor-pointer"
        >
          {t('clear')}
        </button>
        <button 
          type="button"
          onClick={onClose}
          className="btn-primary text-xs sm:text-sm"
        >
          {t('done')}
        </button>
      </div>
    </BaseModal>
  );
};
