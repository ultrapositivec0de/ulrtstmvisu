import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Trash2,
  X,
  FileText,
  FolderOpen,
  FileDown,
  FileUp,
  Rocket,
  CheckCircle
} from 'lucide-react';
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

  if (!isOpen) return null;

  const filtered = drafts.filter((d: Draft) => draftFilter === 'all' || d.status === draftFilter);

  return (
    <div key="modal-drafts" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90"
        onClick={() => onClose()}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <FolderOpen className="text-cyan-400" /> {t('drafts')}
            </h2>
            <div className="flex gap-2 mt-2">
              {(['all', 'working', 'ready'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setDraftFilter(f)}
                  className={cn(
                    "text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border transition-all",
                    draftFilter === f ? "bg-cyan-600 border-cyan-500 text-white" : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500"
                  )}
                >
                  {t(f as any)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label 
              className="p-1 sm:p-1.5 text-slate-500 hover:text-cyan-400 bg-slate-800/50 hover:bg-cyan-900/30 rounded border border-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center group cursor-pointer"
              title="Імпортувати бекап чернеток"
            >
              <FileDown size={18} className="sm:size-[16px]" />
              <input type="file" accept=".zip" className="hidden" onChange={importBackup} />
            </label>
            <button 
              onClick={exportBackup}
              className="p-1 sm:p-1.5 text-slate-500 hover:text-cyan-400 bg-slate-800/50 hover:bg-cyan-900/30 rounded border border-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center group"
              title="Експортувати бекап чернеток"
            >
              <FileUp size={18} className="sm:size-[16px]" />
            </button>
            <button onClick={() => onClose()} className="text-slate-500 hover:text-white p-1"><X size={18} className="sm:size-[20px]" /></button>
          </div>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('noDrafts')}</p>
            </div>
          ) : (
            filtered.map((draft: Draft, idx: number) => (
              <div 
                key={draft.id || `draft-${draft.date || idx}`}
                className="group p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all cursor-pointer flex justify-between items-center"
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
                    <h4 className="font-bold text-slate-200 truncate">{draft.title}</h4>
                    {draft.status === 'ready' && (
                      <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded border border-green-500/30 uppercase font-bold tracking-tighter">
                        {t('ready')}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{draft.date}</p>
                </div>
                <div className="flex gap-1 items-center">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setContent(draft.body);
                      setPubTitle(draft.title);
                      setActiveModal('publish');
                    }}
                    title={t('publish')}
                    className="p-2 text-cyan-500 hover:bg-cyan-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Rocket size={20} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDraftStatus(draft.id);
                      notify(t('success'), 'success');
                    }}
                    title={draft.status === 'ready' ? t('working') : t('ready')}
                    className={cn(
                      "p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                      draft.status === 'ready' ? "text-green-400 hover:bg-green-400/10" : "text-slate-500 hover:bg-slate-500/10"
                    )}
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (await confirmDialog(t('delete') + '?')) {
                        deleteDraft(draft.id);
                        notify(t('success'), 'success');
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
