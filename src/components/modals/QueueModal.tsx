import React from 'react';
import { motion } from 'motion/react';
import { List as ListIcon, Calendar, Trash2, Rocket, X } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div key="modal-queue" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ListIcon className="text-cyan-400" /> {t('queue')}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic">{t('queueEmpty')}</div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {queue.map((item) => (
                <div key={item.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl group hover:border-cyan-500/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-200 line-clamp-1">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-400">
                          @{item.authType === 'VAULT' ? item.selectedVaultUser : item.username}
                        </span>
                        {item.scheduledTime && (
                          <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                            <Calendar size={14} /> {new Date(item.scheduledTime).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={async () => {
                          if (await confirmDialog(t('delete') + '?')) {
                            const updated = queue.filter(i => i.id !== item.id);
                            setQueue(updated);
                            localStorage.setItem(storageKey, JSON.stringify(updated));
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                        item.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                        item.status === 'published' ? "bg-green-500/10 text-green-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {t(item.status)}
                      </span>
                    </div>
                    {item.status !== 'published' && (
                      <button 
                        onClick={() => publishFromQueue(item.id)}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Rocket size={18} /> {t('publish')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
