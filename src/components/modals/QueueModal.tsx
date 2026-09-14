import React from 'react';
import { List as ListIcon, Calendar, Trash2, Rocket } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { cn } from '../../lib/utils';
import { QueueItem } from '../../types';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: QueueItem[];
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>> | ((items: QueueItem[]) => void);
  publishFromQueue: (id: string) => void;
  confirmDialog: (msg: string) => Promise<boolean>;
  storageKey: string;
  t: (key: any) => string;
}

export const QueueModal: React.FC<QueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  setQueue,
  publishFromQueue,
  confirmDialog,
  storageKey,
  t
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={ListIcon}
      title={t('queue')}
      modalKey="modal-queue"
      bodyClassName="p-5 sm:p-6 space-y-4"
    >
      {queue.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)] italic text-xs sm:text-sm">
          {t('queueEmpty')}
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {queue.map((item) => (
            <div 
              key={item.id} 
              className="p-4 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl group hover:border-cyan-500/40 transition-all"
            >
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate">{item.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded text-[var(--text-muted)] font-mono">
                      @{item.authType === 'VAULT' ? item.selectedVaultUser : item.username}
                    </span>
                    {item.scheduledTime && (
                      <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-medium">
                        <Calendar size={13} /> {new Date(item.scheduledTime).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    if (await confirmDialog(t('delete') + '?')) {
                      const updated = queue.filter(i => i.id !== item.id);
                      setQueue(updated);
                      localStorage.setItem(storageKey, JSON.stringify(updated));
                    }
                  }}
                  className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                  title={t('delete')}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border-color)]/60">
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                  item.status === 'pending' ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" :
                  item.status === 'published' ? "bg-green-500/15 text-green-400 border border-green-500/30" :
                  "bg-red-500/15 text-red-400 border border-red-500/30"
                )}>
                  {t(item.status)}
                </span>

                {item.status !== 'published' && (
                  <button 
                    onClick={() => publishFromQueue(item.id)}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-cyan-500/10 transition-colors cursor-pointer"
                  >
                    <Rocket size={15} /> {t('publish')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseModal>
  );
};
