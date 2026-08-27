import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  X, 
  Edit3, 
  Plus, 
  PlusCircle, 
  CheckCircle, 
  Trash2 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEditorStore } from '../../store';

export interface Template {
  id: string;
  name: string;
  content: string;
  tags?: string;
  title?: string;
  type?: 'post' | 'snippet';
}

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  setTemplates: (templates: Template[]) => void;
  pubTags: string;
  setPubTags: (tags: string) => void;
  pubTitle: string;
  setPubTitle: (title: string) => void;
  setContent: (content: string) => void;
  insertAtCursor: (text: string) => void;
  notify: (msg: string) => void;
  confirmDialog: (msg: string) => Promise<boolean>;
  performanceMode: boolean;
  storageKey: string;
  t: (key: any) => string;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  templates,
  setTemplates,
  pubTags,
  setPubTags,
  pubTitle,
  setPubTitle,
  setContent,
  insertAtCursor,
  notify,
  confirmDialog,
  performanceMode,
  storageKey,
  t
}) => {
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'post' | 'snippet'>('snippet');
  const [templateFilter, setTemplateFilter] = useState<'all' | 'post' | 'snippet'>('all');

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setIsAddingTemplate(false);
    setNewTemplateName('');
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      notify('Вкажіть назву шаблону!');
      return;
    }
    const newT: Template = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      content: useEditorStore.getState().content,
      tags: pubTags,
      title: pubTitle,
      type: newTemplateType
    };
    const updated = [...templates, newT];
    setTemplates(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    notify(t('templateSaved'));
    setIsAddingTemplate(false);
    setNewTemplateName('');
  };

  return (
    <div key="modal-templates" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/90"
        onClick={handleClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-none w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('templates')}</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest">{templates.length} {t('saved') || 'збережено'}</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {isAddingTemplate ? (
            <div className="space-y-4 bg-slate-850/50 p-4 rounded-2xl border border-slate-700/50 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Edit3 size={16} className="text-cyan-400" />
                <h3 className="font-bold text-slate-100 text-sm">Зберегти як новий шаблон</h3>
              </div>
              
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  Назва шаблону
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Наприклад: Мій підпис, Звіт, Привітання..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Призначення та тип шаблону
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewTemplateType('post')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      newTemplateType === 'post'
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-400'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <FileText size={13} />
                      <span>Шаблон допису</span>
                    </div>
                    <p className="text-[9px] text-slate-450 mt-1.5 leading-relaxed">
                      Замінює весь поточний вміст, заголовок та теги допису.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewTemplateType('snippet')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      newTemplateType === 'snippet'
                        ? 'bg-amber-500/10 border-amber-500/60 text-amber-400'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Edit3 size={13} />
                      <span>Вставка / Сніппет</span>
                    </div>
                    <p className="text-[9px] text-slate-450 mt-1.5 leading-relaxed">
                      Вставляє заготовлений текст у поточне місце курсору.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTemplate(false);
                    setNewTemplateName('');
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  disabled={!newTemplateName.trim()}
                  onClick={handleSaveTemplate}
                  className={cn(
                    "flex-1 py-2 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5",
                    newTemplateName.trim()
                      ? "bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer border border-cyan-500/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-40",
                    newTemplateName.trim() && !performanceMode ? "shadow-xl shadow-cyan-500/20 active:scale-98" : "shadow-none"
                  )}
                >
                  Зберегти
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => {
                  setIsAddingTemplate(true);
                  setNewTemplateName('');
                  setNewTemplateType('snippet');
                }}
                className={cn(
                  "flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 border border-cyan-500/20",
                  performanceMode ? "shadow-none" : "shadow-xl shadow-cyan-500/20 hover:scale-[1.01] active:scale-95"
                )}
              >
                <Plus size={18} className="stroke-[2.5px]" />
                {t('saveAsTemplate')}
              </button>
            </div>
          )}

          {!isAddingTemplate && templates.length > 0 && (
            <div className="flex border-b border-slate-800 mb-4 p-1 bg-slate-950/40 rounded-xl shrink-0">
              <button
                onClick={() => setTemplateFilter('all')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  templateFilter === 'all'
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Всі ({templates.length})
              </button>
              <button
                onClick={() => setTemplateFilter('post')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  templateFilter === 'post'
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Шаблони допису ({templates.filter(t => t.type === 'post' || !t.type).length})
              </button>
              <button
                onClick={() => setTemplateFilter('snippet')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  templateFilter === 'snippet'
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Фрагменти ({templates.filter(t => t.type === 'snippet').length})
              </button>
            </div>
          )}

          <div className="space-y-3">
            {templates.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <FileText size={40} className="mx-auto mb-4 opacity-20" />
                <p>{t('templatesEmpty')}</p>
              </div>
            ) : (() => {
              const filtered = templates.filter(tmp => {
                if (templateFilter === 'post') return tmp.type === 'post' || !tmp.type;
                if (templateFilter === 'snippet') return tmp.type === 'snippet';
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-xs">Немає шаблонів у цій категорії</p>
                  </div>
                );
              }

              return filtered.map(tmp => {
                const isSnippet = tmp.type === 'snippet';
                return (
                  <div key={tmp.id} className="group p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl hover:border-cyan-500/50 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-slate-200 text-xs sm:text-sm">{tmp.name}</h4>
                        <span className={`inline-block text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 ${
                          isSnippet 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {isSnippet ? 'Фрагмент / Вставка' : 'Шаблон допису'}
                        </span>
                      </div>
                      <div className="flex gap-4 items-center pl-2">
                        <button 
                          onClick={async () => {
                            if (isSnippet) {
                              insertAtCursor(tmp.content);
                              notify('Фрагмент вставлено у місце курсору!');
                              onClose();
                            } else {
                              if (await confirmDialog('Замінити весь поточний допис цим шаблоном? Поточні дані (заголовок, текст, теги) буде втрачено.')) {
                                setContent(tmp.content);
                                if (tmp.tags) setPubTags(tmp.tags);
                                if (tmp.title) setPubTitle(tmp.title);
                                notify('Шаблон допису застосовано!');
                                onClose();
                              }
                            }
                          }}
                          className={`p-1.5 border rounded-lg transition-colors flex items-center justify-center ${
                            isSnippet 
                              ? 'hover:bg-amber-500/10 text-amber-500 border-amber-500/30' 
                              : 'hover:bg-cyan-500/10 text-cyan-400 border-cyan-500/50'
                          }`}
                          title={isSnippet ? 'Вставити у курсор' : 'Застосувати шаблон'}
                        >
                          {isSnippet ? <PlusCircle size={16} /> : <CheckCircle size={16} />}
                        </button>
                        <button 
                          onClick={async () => {
                            if (await confirmDialog(t('confirmDeleteTemplate').replace('{name}', tmp.name))) {
                              const updated = templates.filter(t => t.id !== tmp.id);
                              setTemplates(updated);
                              localStorage.setItem(storageKey, JSON.stringify(updated));
                              notify(t('templateDeleted'));
                            }
                          }}
                          className="p-1.5 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg transition-colors flex items-center justify-center"
                          title="Видалити"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 mt-1 select-all font-mono text-[10px] leading-relaxed text-slate-400 max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap break-all">
                      {tmp.content}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
