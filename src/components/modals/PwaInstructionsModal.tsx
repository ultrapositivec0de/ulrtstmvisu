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
      title={t('pwaHowToInstall')}
      subtitle={t('pwaPlatformSupport')}
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
            className="btn-primary w-full py-3 px-4 text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Download size={18} />
            {t('installApp')}
          </button>
        )}

        {/* iOS / Safari */}
        <div className="p-3.5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] space-y-1.5">
          <div className="font-bold text-cyan-400 flex items-center gap-1.5">
            <span>📱 Apple iOS / Safari</span>
          </div>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaIosStep1')}
          </p>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaIosStep2')}
          </p>
        </div>

        {/* Android / Chrome */}
        <div className="p-3.5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] space-y-1.5">
          <div className="font-bold text-cyan-400 flex items-center gap-1.5">
            <span>🤖 Android / Chrome / Edge</span>
          </div>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaAndroidStep1')}
          </p>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaAndroidStep2')}
          </p>
        </div>

        {/* Desktop */}
        <div className="p-3.5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] space-y-1.5">
          <div className="font-bold text-cyan-400 flex items-center gap-1.5">
            <span>{t('pwaDesktopTitle')}</span>
          </div>
          <p className="text-[var(--text-muted)] pl-1 leading-relaxed">
            {t('pwaDesktopStep1')}
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="btn-primary w-full py-2.5 text-xs rounded-xl"
      >
        {t('close')}
      </button>
    </BaseModal>
  );
};
