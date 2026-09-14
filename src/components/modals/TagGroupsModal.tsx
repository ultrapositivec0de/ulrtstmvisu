import React from 'react';
import { Tags, Trash2 } from 'lucide-react';
import { BaseModal } from './BaseModal';
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
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={Tags}
      title={t('tagGroups')}
      modalKey="modal-tag-groups"
      bodyClassName="p-5 sm:p-6 space-y-4"
    >
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
        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors font-bold text-xs sm:text-sm text-white shadow-md shadow-cyan-900/20 active:scale-[0.98] cursor-pointer"
      >
        {t('addTagGroup')}
      </button>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
        {tagGroups.map((group, gIdx) => (
          <div 
            key={group.id || `group-${gIdx}`} 
            className="p-3 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl group hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex justify-between items-center mb-2">
              <button 
                onClick={() => {
                  const currentTags = pubTags.split(/\s+/).filter(Boolean);
                  const nextTags = [...currentTags];
                  group.tags.forEach(tag => {
                    if (!nextTags.includes(tag)) nextTags.push(tag);
                  });
                  setPubTags(nextTags.join(' '));
                }}
                className="font-bold text-xs sm:text-sm text-[var(--text-main)] hover:text-cyan-400 transition-colors text-left"
              >
                {group.name} <span className="text-[var(--text-muted)] font-normal text-xs">({t('applyGroup')})</span>
              </button>
              <button 
                onClick={async () => {
                  if (await confirmDialog(t('delete') + '?')) {
                    setTagGroups(tagGroups.filter(g => g.id !== group.id));
                  }
                }}
                className="text-[var(--text-muted)] hover:text-red-400 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                title={t('delete')}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {group.tags.filter(Boolean).map((tag, tIdx) => {
                const isSelected = pubTags.split(/\s+/).includes(tag);
                return (
                  <button 
                    key={`group-${group.id || gIdx}-tag-${tag}-${tIdx}`}
                    onClick={() => {
                      const currentTags = pubTags.split(/\s+/).filter(Boolean);
                      if (currentTags.includes(tag)) {
                        setPubTags(currentTags.filter(t => t !== tag).join(' '));
                      } else {
                        setPubTags([...currentTags, tag].join(' '));
                      }
                    }}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer",
                      isSelected 
                        ? "bg-cyan-600 text-white shadow-sm" 
                        : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]"
                    )}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {tagGroups.length === 0 && (
          <p className="text-center text-xs text-[var(--text-muted)] py-6">
            {t('noTagGroups') || "Немає збережених груп тегів"}
          </p>
        )}
      </div>
    </BaseModal>
  );
};
