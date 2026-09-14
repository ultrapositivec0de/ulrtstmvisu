import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ModalSize = 'pin' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'fit';
export type ModalPriority = 'standard' | 'critical';

export interface BaseModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  priority?: ModalPriority;
  className?: string;
  bodyClassName?: string;
  hideHeader?: boolean;
  closeOnBackdropClick?: boolean;
  backdropClassName?: string;
  modalKey?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  pin: 'max-w-[260px]',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  fit: 'max-w-fit',
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen = true,
  onClose,
  title,
  subtitle,
  icon: Icon,
  headerRight,
  children,
  footer,
  size = 'md',
  priority = 'standard',
  className,
  bodyClassName,
  hideHeader = false,
  closeOnBackdropClick = true,
  backdropClassName,
  modalKey,
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen || !onClose || !closeOnBackdropClick) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeOnBackdropClick]);

  if (!isOpen) return null;

  const isCritical = priority === 'critical';
  const zIndexClass = isCritical ? 'z-[1000]' : 'z-[500]';

  return (
    <div
      key={modalKey}
      className={cn(
        'fixed inset-0 flex items-center justify-center p-3 sm:p-4',
        zIndexClass
      )}
    >
      {/* Universal Backdrop: Transparent overlay to keep application workspace fully visible as a pure window */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={closeOnBackdropClick ? onClose : undefined}
        className={cn(
          'fixed inset-0 transition-opacity bg-transparent',
          backdropClassName
        )}
      />

      {/* Universal Modal Card: Pure floating window above the workspace */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={cn(
          'relative w-full bg-[var(--modal-bg)] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] text-[var(--text-main)]',
          'border border-[var(--modal-border)] shadow-[0_25px_70px_rgba(0,0,0,0.55)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.85)] ring-1 ring-white/10 dark:ring-white/10',
          SIZE_CLASSES[size],
          className
        )}
      >
        {/* Optional Universal Header */}
        {!hideHeader && (title || onClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--modal-border)] bg-[var(--modal-bg)] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-base font-semibold text-[var(--text-main)] truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] rounded-xl transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div
          className={cn(
            'flex-1 overflow-y-auto custom-scrollbar',
            bodyClassName
          )}
        >
          {children}
        </div>

        {/* Optional Modal Footer */}
        {footer && (
          <div className="shrink-0">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
};
