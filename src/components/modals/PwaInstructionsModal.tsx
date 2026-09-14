import React from 'react';
import { Download } from 'lucide-react';
import { BaseModal } from './BaseModal';

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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={Download}
      title={t('pwaHowToInstall') || "Як встановити додаток (PWA)"}
      subtitle={t('pwaPlatformSupport') || "Інструкції для всіх пристроїв"}
      modalKey="modal-pwa-instructions"
      bodyClassName="p-5 sm:p-6 space-y-4"
    >
      <div className="space-y-3.5 text-xs text-[var(--text-muted)]">
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
        <div className="p-3.5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] space-y-1.5">
          <div className="font-bold text-cyan-400 flex items-center gap-1.5">
            <span>📱 Apple iOS / Safari</span>
          </div>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaIosStep1') || "1. Натисніть кнопку 'Поділитися' (іконка зі стрілкою вгору) внизу або вгорі Safari."}
          </p>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaIosStep2') || "2. Прокрутіть список вниз і виберіть 'На екран «Додому»'."}
          </p>
        </div>

        {/* Android / Chrome */}
        <div className="p-3.5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] space-y-1.5">
          <div className="font-bold text-cyan-400 flex items-center gap-1.5">
            <span>🤖 Android / Chrome / Edge</span>
          </div>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaAndroidStep1') || "1. Натисніть меню браузера (іконка трьох крапок ⋮ у кутку)."}
          </p>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaAndroidStep2') || "2. Виберіть пункт 'Встановити додаток' або 'Додати на головний екран'."}
          </p>
        </div>

        {/* Desktop */}
        <div className="p-3.5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] space-y-1.5">
          <div className="font-bold text-cyan-400 flex items-center gap-1.5">
            <span>💻 Комп'ютер (Chrome / Edge / Brave)</span>
          </div>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaDesktopStep1') || "Натисніть значок встановлення ⊕ в правому кутку адресного рядка браузера."}
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold text-xs rounded-xl transition-colors border border-[var(--border-color)]"
      >
        {t('close') || "Зрозуміло"}
      </button>
    </BaseModal>
  );
};
