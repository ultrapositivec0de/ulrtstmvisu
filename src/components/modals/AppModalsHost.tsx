import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SteemNotification } from '../../types';
import { type TranslationKey } from '../../locales';
import { AppModals, type AppModalsProps } from './AppModals';
import { AccountPromptModal } from './AccountPromptModal';
import { NotificationToast } from '../common/NotificationToast';
import { TableSelectorPopup } from '../editor/TableSelectorPopup';
import { AudioPresetsModal } from './AudioPresetsModal';
import { SystemDialogModal } from './SystemDialogModal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';

export interface AppModalsHostProps {
  // AppModals Suite Props
  modalsProps: AppModalsProps;

  // Account Prompt Modal
  showAccountPrompt: boolean;
  setShowAccountPrompt: (show: boolean) => void;
  username: string;
  setUsername: (u: string) => void;
  autoInbox: boolean;
  setAutoInbox: (auto: boolean) => void;

  // Status Notification Toast (pubLog)
  pubLog: { msg: string; type: 'success' | 'error' | 'loading' | null };
  setPubLog: (log: { msg: string; type: 'success' | 'error' | 'loading' | null }) => void;
  clearPubLogTimer: () => void;

  // Notification Toast (Inbox / mentions)
  showNotificationPopup: SteemNotification | null;
  setShowNotificationPopup: (notif: SteemNotification | null) => void;
  setActiveView: (view: 'editor' | 'reader') => void;
  setNotifications: React.Dispatch<React.SetStateAction<SteemNotification[]>>;
  setTargetReaderPost: (post: { author: string; permlink: string; commentAuthor?: string; commentPermlink?: string } | null) => void;

  // Table Selector Popup
  showTableSelector: boolean;
  setShowTableSelector: (show: boolean) => void;
  tableSelectorPos: { x: number; y: number; direction: 'up' | 'down' } | null;
  tableImportFormat: 'markdown' | 'html';
  setTableImportFormat: (format: 'markdown' | 'html') => void;
  insertAtCursor: (text: string, selectionMode?: 'end' | 'select') => void;

  // Audio Presets Modal
  isAudioPresetsModalOpen: boolean;
  setIsAudioPresetsModalOpen: (open: boolean) => void;
  typingSound: {
    settings: any;
    activePreset: any;
    allPresets: any[];
    volume: number;
    favoritePresetIds: string[];
    toggleEnabled: () => void;
    setVolume: (v: number) => void;
    setActivePreset: (id: string) => void;
    toggleFavoritePreset: (id: string) => void;
    addCustomPreset: (json: unknown) => { success: boolean; error?: string; preset?: any };
    deleteCustomPreset: (id: string) => void;
    previewPreset: (preset: any) => void;
    updateSettings: (updater: (prev: any) => any) => void;
  };

  // System Dialog (confirm/prompt)
  systemDialog: any;
  setSystemDialog: (dialog: any) => void;

  // Translation Function
  t: (key: TranslationKey) => string;
}

export const AppModalsHost: React.FC<AppModalsHostProps> = ({
  modalsProps,
  showAccountPrompt,
  setShowAccountPrompt,
  username,
  setUsername,
  autoInbox,
  setAutoInbox,
  pubLog,
  setPubLog,
  clearPubLogTimer,
  showNotificationPopup,
  setShowNotificationPopup,
  setActiveView,
  setNotifications,
  setTargetReaderPost,
  showTableSelector,
  setShowTableSelector,
  tableSelectorPos,
  tableImportFormat,
  setTableImportFormat,
  insertAtCursor,
  isAudioPresetsModalOpen,
  setIsAudioPresetsModalOpen,
  typingSound,
  systemDialog,
  setSystemDialog,
  t,
}) => {
  return (
    <>
      {/* Primary Application Modals Suite */}
      <AppModals {...modalsProps} />

      {/* Account Prompt Modal */}
      <AccountPromptModal
        showAccountPrompt={showAccountPrompt}
        setShowAccountPrompt={setShowAccountPrompt}
        username={username}
        setUsername={setUsername}
        autoInbox={autoInbox}
        setAutoInbox={setAutoInbox}
        t={t}
      />

      {/* Operation Status Toast (Published, Uploaded, Saved, Error, Loading) */}
      <AnimatePresence>
        {pubLog.msg && modalsProps.activeModal !== 'publish' && (
          <motion.div
            key="pub-log-status-toast"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-[260] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border-2 flex items-center gap-3 shrink-0 pointer-events-auto shadow-2xl backdrop-blur-md",
              "left-3 right-3 sm:left-auto sm:right-6 max-w-sm sm:max-w-md w-auto",
              pubLog.type === 'success' && "bg-slate-900/95 border-emerald-500 text-emerald-400 shadow-emerald-950/40",
              pubLog.type === 'error' && "bg-slate-900/95 border-rose-500 text-rose-400 shadow-rose-950/40",
              pubLog.type === 'loading' && "bg-slate-900/95 border-cyan-500 text-cyan-400 shadow-cyan-950/40"
            )}
            style={{
              top: 'calc(var(--header-height, 3.5rem) + env(safe-area-inset-top, 0px) + 0.75rem)',
            }}
          >
            {pubLog.type === 'loading' && (
              <Loader2 size={16} className="animate-spin text-cyan-400 shrink-0" />
            )}
            {pubLog.type === 'success' && (
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            )}
            {pubLog.type === 'error' && (
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
            )}
            <span className="flex-1 min-w-0 break-words leading-tight">{pubLog.msg}</span>
            <button
              type="button"
              onClick={() => {
                clearPubLogTimer();
                setPubLog({ msg: '', type: null });
              }}
              className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white shrink-0 cursor-pointer"
              aria-label={t("closeNotificationAria")}
              title={t("closeNotificationAria")}
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inbox Notification Toast */}
      <NotificationToast
        showNotificationPopup={showNotificationPopup}
        setShowNotificationPopup={setShowNotificationPopup}
        setActiveView={setActiveView}
        setNotifications={setNotifications}
        setTargetReaderPost={setTargetReaderPost}
      />

      {/* Table Dimension Selector Popup */}
      <TableSelectorPopup
        showTableSelector={showTableSelector}
        setShowTableSelector={setShowTableSelector}
        tableSelectorPos={tableSelectorPos}
        tableImportFormat={tableImportFormat}
        setTableImportFormat={setTableImportFormat}
        insertAtCursor={insertAtCursor}
        t={t}
      />

      {/* Audio Typing Synth Presets Modal */}
      <AudioPresetsModal
        isOpen={isAudioPresetsModalOpen}
        onClose={() => setIsAudioPresetsModalOpen(false)}
        settings={typingSound.settings}
        activePreset={typingSound.activePreset}
        allPresets={typingSound.allPresets}
        volume={typingSound.volume}
        favoritePresetIds={typingSound.favoritePresetIds}
        toggleEnabled={typingSound.toggleEnabled}
        setVolume={typingSound.setVolume}
        setActivePreset={typingSound.setActivePreset}
        toggleFavoritePreset={typingSound.toggleFavoritePreset}
        addCustomPreset={typingSound.addCustomPreset}
        deleteCustomPreset={typingSound.deleteCustomPreset}
        previewPreset={typingSound.previewPreset}
        updateSettings={typingSound.updateSettings}
      />

      {/* System Dialog Confirmation / Input */}
      <AnimatePresence>
        {systemDialog && (
          <SystemDialogModal
            key="system-dialog-modal"
            systemDialog={systemDialog}
            setSystemDialog={setSystemDialog}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Global Image Lightbox Modal */}
      <ImageLightboxModal />
    </>
  );
};
