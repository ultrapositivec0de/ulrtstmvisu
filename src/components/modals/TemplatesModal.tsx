import React, { useState } from 'react';
import { 
  FileText, 
  Edit3, 
  Plus, 
  PlusCircle, 
  CheckCircle, 
  Trash2 
} from 'lucide-react';
import { BaseModal } from './BaseModal';
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
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      icon={FileText}
      title={t('templates')}
      subtitle={`${templates.length} ${t('saved') || 'збережено'}`}
      modalKey="modal-templates"
      bodyClassName="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 max-h-[75vh] space-y-4"
    >
      {isAddingTemplate ? (
        <div className="space-y-4 bg-[var(--bg-main)]/70 p-4 sm:p-5 rounded-2xl border border-[var(--border-color)] mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Edit3 size={16} className="text-cyan-400" />
            <h3 className="font-bold text-[var(--text-main)] text-xs sm:text-sm">Зберегти як новий шаблон</h3>
          </div>
          
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1.5">
              Назва шаблону
            </label>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Наприклад: Мій підпис, Звіт, Привітання..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-[var(--text-muted)] font-sans"
            />
          </div>

          <div>
            <label className="block text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-2">
              Призначення та тип шаблону
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewTemplateType('post')}
                className={cn(
                  "p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer",
                  newTemplateType === 'post'
                    ? "bg-cyan-500/10 border-cyan-500/60 text-cyan-400"
                    : "bg-[var(--bg-card)] border-[var(--border-color)] hover:border-slate-500 text-[var(--text-muted)]"
                )}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FileText size={14} />
                  <span>Шаблон допису</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Замінює весь поточний вміст, заголовок та теги допису.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setNewTemplateType('snippet')}
                className={cn(
                  "p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer",
                  newTemplateType === 'snippet'
                    ? "bg-amber-500/10 border-amber-500/60 text-amber-400"
                    : "bg-[var(--bg-card)] border-[var(--border-color)] hover:border-slate-500 text-[var(--text-muted)]"
                )}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Edit3 size={14} />
                  <span>Вставка / Сніппет</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Вставляє заготовлений текст у поточне місце курсору.
                </p>
              </button>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAddingTemplate(false);
                setNewTemplateName('');
              }}
              className="flex-1 py-2.5 bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-bold rounded-xl text-xs transition-colors border border-[var(--border-color)] cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={!newTemplateName.trim()}
              onClick={handleSaveTemplate}
              className={cn(
                "flex-1 py-2.5 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                newTemplateName.trim()
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/20 active:scale-98"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] opacity-40 cursor-not-allowed"
              )}
            >
              {t('save') || "Зберегти"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <button 
            onClick={() => {
              setIsAddingTemplate(true);
              setNewTemplateName('');
              setNewTemplateType('snippet');
            }}
            className={cn(
              "w-full py-2.5 sm:py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-cyan-900/20 cursor-pointer",
              !performanceMode && "active:scale-[0.99]"
            )}
          >
            <Plus size={18} />
            {t('saveAsTemplate')}
          </button>
        </div>
      )}

      {!isAddingTemplate && templates.length > 0 && (
        <div className="flex border border-[var(--border-color)] p-1 bg-[var(--bg-main)]/50 rounded-xl shrink-0">
          <button
            onClick={() => setTemplateFilter('all')}
            className={cn(
              "flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer",
              templateFilter === 'all'
                ? "bg-[var(--bg-card)] text-cyan-400 shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
          >
            Всі ({templates.length})
          </button>
          <button
            onClick={() => setTemplateFilter('post')}
            className={cn(
              "flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer",
              templateFilter === 'post'
                ? "bg-[var(--bg-card)] text-cyan-400 shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
          >
            Шаблони допису ({templates.filter(t => t.type === 'post' || !t.type).length})
          </button>
          <button
            onClick={() => setTemplateFilter('snippet')}
            className={cn(
              "flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer",
              templateFilter === 'snippet'
                ? "bg-[var(--bg-card)] text-cyan-400 shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
          >
            Фрагменти ({templates.filter(t => t.type === 'snippet').length})
          </button>
        </div>
      )}

      <div className="space-y-3">
        {templates.length === 0 ? (
          <div className="text-center py-10 text-[var(--text-muted)]">
            <FileText size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-xs sm:text-sm">{t('templatesEmpty')}</p>
          </div>
        ) : (() => {
          const filtered = templates.filter(tmp => {
            if (templateFilter === 'post') return tmp.type === 'post' || !tmp.type;
            if (templateFilter === 'snippet') return tmp.type === 'snippet';
            return true;
          });

          if (filtered.length === 0) {
            return (
              <div className="text-center py-10 text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl">
                <p className="text-xs">Немає шаблонів у цій категорії</p>
              </div>
            );
          }

          return filtered.map(tmp => {
            const isSnippet = tmp.type === 'snippet';
            return (
              <div 
                key={tmp.id} 
                className="group p-3.5 sm:p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl hover:border-cyan-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-[var(--text-main)] text-xs sm:text-sm truncate">{tmp.name}</h4>
                    <span className={cn(
                      "inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1 border",
                      isSnippet 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    )}>
                      {isSnippet ? 'Фрагмент / Вставка' : 'Шаблон допису'}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
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
                      className={cn(
                        "p-1.5 border rounded-lg transition-colors flex items-center justify-center cursor-pointer",
                        isSnippet 
                          ? "hover:bg-amber-500/10 text-amber-400 border-amber-500/30" 
                          : "hover:bg-cyan-500/10 text-cyan-400 border-cyan-500/40"
                      )}
                      title={isSnippet ? 'Вставити у курсор' : 'Застосувати шаблон'}
                    >
                      {isSnippet ? <PlusCircle size={17} /> : <CheckCircle size={17} />}
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
                      className="p-1.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 border border-[var(--border-color)] hover:border-red-500/30 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                      title={t('delete') || "Видалити"}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <div className="bg-[var(--bg-card)] p-2.5 rounded-xl border border-[var(--border-color)] select-all font-mono text-[10px] sm:text-xs leading-relaxed text-[var(--text-muted)] max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap break-all">
                  {tmp.content}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </BaseModal>
  );
};
