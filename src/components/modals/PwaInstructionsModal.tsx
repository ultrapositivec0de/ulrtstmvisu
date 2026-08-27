import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

interface PwaInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  handleInstallPwa: () => void;
  t: (key: any) => string;
}

export const PwaInstructionsModal: React.FC<PwaInstructionsModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  handleInstallPwa,
  t
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 overflow-hidden space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t('pwaHowToInstall') || "Як встановити додаток (PWA)"}</h3>
                  <p className="text-xs text-slate-400">{t('pwaPlatformSupport') || "Інструкції для всіх пристроїв"}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              {/* Direct Action Button if browser prompt is available */}
              {deferredPrompt && (
                <button
                  onClick={() => {
                    onClose();
                    handleInstallPwa();
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Download size={18} />
                  {t('installApp') || "Встановити додаток зараз"}
                </button>
              )}

              {/* iOS / Safari */}
              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1.5">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <span>📱 Apple iOS / Safari</span>
                </div>
                <p className="text-slate-400 pl-1">{t('pwaIosStep1') || "1. Натисніть кнопку 'Поділитися' (іконка зі стрілкою вгору) внизу або вгорі Safari."}</p>
                <p className="text-slate-400 pl-1">{t('pwaIosStep2') || "2. Прокрутіть список вниз і виберіть 'На екран «Додому»'."}</p>
              </div>

              {/* Android / Chrome */}
              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1.5">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <span>🤖 Android / Chrome / Edge</span>
                </div>
                <p className="text-slate-400 pl-1">{t('pwaAndroidStep1') || "1. Натисніть меню браузера (іконка трьох крапок ⋮ у кутку)."}</p>
                <p className="text-slate-400 pl-1">{t('pwaAndroidStep2') || "2. Виберіть пункт 'Встановити додаток' або 'Додати на головний екран'."}</p>
              </div>

              {/* Desktop */}
              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1.5">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <span>💻 Комп'ютер (Chrome / Edge / Brave)</span>
                </div>
                <p className="text-slate-400 pl-1">{t('pwaDesktopStep1') || "Натисніть значок встановлення ⊕ в правому кутку адресного рядка браузера."}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              {t('close') || "Зрозуміло"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
