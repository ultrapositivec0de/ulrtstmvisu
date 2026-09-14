import React, { useState } from 'react';
import {
  Trash2,
  FileText,
  FolderOpen,
  FileDown,
  FileUp,
  Rocket,
  CheckCircle
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import { cn } from '../../lib/utils';
import { Draft } from '../../types';

export interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setContent: (content: string) => void;
  setPubTitle: (title: string) => void;
  setPubTags: (tags: string) => void;
  currentDraftId: string | null;
  setCurrentDraftId: (id: string | null) => void;
  editorMode: string;
  wysiwygRef: any;
  isSyncingRef: any;
  getMarked: any;
  exportBackup: () => void;
  importBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  confirmDialog: (msg: string) => Promise<boolean>;
  notify: (msg: string, type?: any) => void;
  setActiveModal: (modal: any) => void;
  t: (key: any) => string;
  
  // From useDrafts hook
  drafts: Draft[];
  deleteDraft: (id: string) => void;
  toggleDraftStatus: (id: string) => void;
}

export const DraftsModal: React.FC<DraftsModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    setContent,
    setPubTitle,
    setCurrentDraftId,
    editorMode,
    wysiwygRef,
    isSyncingRef,
    getMarked,
    exportBackup,
    importBackup,
    confirmDialog,
    notify,
    setActiveModal,
    t,
    drafts,
    deleteDraft,
    toggleDraftStatus
  } = props;

  const [draftFilter, setDraftFilter] = useState<'all' | 'working' | 'ready'>('all');

  const filtered = drafts.filter((d: Draft) => draftFilter === 'all' || d.status === draftFilter);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={FolderOpen}
      title={t('drafts')}
      modalKey="modal-drafts"
      headerRight={
        <div className="flex items-center gap-1.5">
          <label 
            className="p-1.5 text-[var(--text-muted)] hover:text-cyan-400 bg-[var(--bg-card)] hover:bg-cyan-500/10 rounded-lg border border-[var(--border-color)] hover:border-cyan-500/40 transition-colors flex items-center justify-center cursor-pointer"
            title={t('importBackup') || "Імпортувати бекап (.zip)"}
          >
            <FileDown size={16} />
            <input type="file" accept=".zip" className="hidden" onChange={importBackup} />
          </label>
          <button 
            onClick={exportBackup}
            className="p-1.5 text-[var(--text-muted)] hover:text-cyan-400 bg-[var(--bg-card)] hover:bg-cyan-500/10 rounded-lg border border-[var(--border-color)] hover:border-cyan-500/40 transition-colors flex items-center justify-center cursor-pointer"
            title={t('exportBackup') || "Експортувати бекап (.zip)"}
          >
            <FileUp size={16} />
          </button>
        </div>
      }
      bodyClassName="flex flex-col flex-1 overflow-hidden"
    >
      {/* Filter Tabs */}
      <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-[var(--border-color)] flex gap-1.5 bg-[var(--bg-main)]/40">
        {(['all', 'working', 'ready'] as const).map(f => (
          <button
            key={f}
            onClick={() => setDraftFilter(f)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-all font-semibold cursor-pointer",
              draftFilter === f 
                ? "bg-cyan-600 border-cyan-500 text-white shadow-xs" 
                : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500 hover:text-[var(--text-main)]"
            )}
          >
            {t(f as any)}
          </button>
        ))}
      </div>

      {/* Draft List */}
      <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-2.5 flex-1 max-h-[60vh]">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <FileText size={44} className="mx-auto mb-3 opacity-20" />
            <p className="text-xs sm:text-sm font-medium">{t('noDrafts')}</p>
          </div>
        ) : (
          filtered.map((draft: Draft, idx: number) => (
            <div 
              key={draft.id || `draft-${draft.date || idx}`}
              className="group p-3.5 sm:p-4 bg-[var(--bg-main)]/50 hover:bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-cyan-500/40 rounded-xl transition-all cursor-pointer flex justify-between items-center gap-3"
              onClick={async () => {
                if (await confirmDialog(t('loadDraftConfirm'))) {
                  setContent(draft.body);
                  setPubTitle(draft.title);
                  setCurrentDraftId(draft.id);
                  localStorage.removeItem('steem_autosave_temp_visual_html');
                  
                  if (editorMode === 'visual' && wysiwygRef.current) {
                    isSyncingRef.current = true;
                    const m = getMarked();
                    if (m) {
                      const parsed = await m.parse(draft.body);
                      if (wysiwygRef.current) {
                        wysiwygRef.current.innerHTML = parsed;
                        localStorage.setItem('steem_autosave_temp_visual_html', parsed);
                        localStorage.setItem('steem_visual_html_is_stale', 'false');
                      }
                    }
                    isSyncingRef.current = false;
                  }
                  
                  onClose();
                }
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate">{draft.title || t('untitled')}</h4>
                  {draft.status === 'ready' && (
                    <span className="text-[9px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30 uppercase font-bold tracking-tight shrink-0">
                      {t('ready')}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{draft.date}</p>
              </div>

              <div className="flex gap-1 items-center shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setContent(draft.body);
                    setPubTitle(draft.title);
                    setActiveModal('publish');
                  }}
                  title={t('publish')}
                  className="p-1.5 sm:p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Rocket size={18} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDraftStatus(draft.id);
                    notify(t('success'), 'success');
                  }}
                  title={draft.status === 'ready' ? t('working') : t('ready')}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-lg opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
                    draft.status === 'ready' ? "text-green-400 hover:bg-green-400/10" : "text-[var(--text-muted)] hover:bg-[var(--border-color)]"
                  )}
                >
                  <CheckCircle size={18} />
                </button>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (await confirmDialog(t('delete') + '?')) {
                      deleteDraft(draft.id);
                      notify(t('success'), 'success');
                    }
                  }}
                  className="p-1.5 sm:p-2 text-[var(--text-muted)] hover:text-red-400 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title={t('delete')}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </BaseModal>
  );
};
