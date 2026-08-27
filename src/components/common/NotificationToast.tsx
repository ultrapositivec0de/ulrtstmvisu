import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell } from 'lucide-react';
import { SteemNotification } from '../../types';

export interface NotificationToastProps {
  showNotificationPopup: SteemNotification | null;
  setShowNotificationPopup: (notif: SteemNotification | null) => void;
  setActiveView: (view: 'editor' | 'reader') => void;
  setNotifications: React.Dispatch<React.SetStateAction<SteemNotification[]>>;
  setTargetReaderPost: (post: { 
    author: string; 
    permlink: string; 
    commentAuthor?: string; 
    commentPermlink?: string;
  } | null) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = React.memo(({
  showNotificationPopup,
  setShowNotificationPopup,
  setActiveView,
  setNotifications,
  setTargetReaderPost,
}) => {
  if (!showNotificationPopup) return null;

  return (
    <AnimatePresence>
      <motion.div 
        key={showNotificationPopup.id}
        initial={{ opacity: 0, scale: 0.9, y: 50, x: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50, x: 50 }}
        className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-[200] max-w-sm w-auto sm:w-full bg-slate-900 border-2 border-lime-500 rounded-3xl shadow-[0_10px_50px_rgba(163,230,53,0.3)] p-5 overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-2">
          <button 
            type="button"
            onClick={() => setShowNotificationPopup(null)} 
            className="p-1.5 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full"
            aria-label="Close notification"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-lime-500 text-black rounded-2xl shadow-[0_0_20px_rgba(163,230,53,0.6)] shrink-0">
            <Bell size={22} className="animate-swing" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-lime-400 uppercase tracking-widest mb-1">Нова відповідь</p>
            <p className="text-sm font-bold text-white mb-1 truncate">@{showNotificationPopup.author}</p>
            <div 
              className="text-xs text-slate-400 line-clamp-2 italic mb-4 bg-slate-950/50 p-2 rounded-xl border border-white/5"
              dangerouslySetInnerHTML={{ __html: showNotificationPopup.body.substring(0, 100) }}
            />
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => {
                  setActiveView('reader');
                  setShowNotificationPopup(null);
                  setNotifications(prev => prev.map(n => n.id === showNotificationPopup.id ? { ...n, isRead: true } : n));
                  setTargetReaderPost({ 
                    author: showNotificationPopup.parent_author || showNotificationPopup.author, 
                    permlink: showNotificationPopup.parent_permlink || showNotificationPopup.permlink,
                    commentAuthor: showNotificationPopup.author,
                    commentPermlink: showNotificationPopup.permlink
                  });
                }}
                className="flex-1 py-2.5 bg-lime-500 text-black text-xs font-black rounded-xl hover:bg-lime-400 transition-all active:scale-95 shadow-lg shadow-lime-900/20"
              >
                ПЕРЕГЛЯНУТИ
              </button>
              <button 
                type="button"
                onClick={() => setShowNotificationPopup(null)}
                className="px-4 py-2.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
              >
                ЗАКРИТИ
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

NotificationToast.displayName = 'NotificationToast';
