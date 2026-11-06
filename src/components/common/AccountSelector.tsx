import React, { useState } from 'react';
import { Shield, Key, Plus, Lock, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AuthType } from '../../types';
import { SecurityService } from '../../services/securityService';

export interface AccountSelectorProps {
  authType: AuthType | 'VAULT';
  currentUsername?: string;
  selectedVaultUser?: string;
  keychainAccounts: string[];
  vaultAccounts: string[];
  onSelectAccount: (user: string, type: 'KEYCHAIN' | 'VAULT') => void;
  onAddKeychainAccount?: (user: string) => void;
  onOpenVaultManager?: () => void;
  t: (key: any) => string;
  className?: string;
  compact?: boolean;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  authType,
  currentUsername = '',
  selectedVaultUser = '',
  keychainAccounts = [],
  vaultAccounts = [],
  onSelectAccount,
  onAddKeychainAccount,
  onOpenVaultManager,
  t,
  className,
  compact = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newAccountInput, setNewAccountInput] = useState('');

  // Unify and deduplicate all keychain accounts so none are lost
  const allKeychainAccounts = Array.from(
    new Set([...(keychainAccounts || []), currentUsername].map(a => (a || '').trim().replace(/^@/, '').toLowerCase()).filter(Boolean))
  );

  // Unify and deduplicate all vault accounts
  const allVaultAccounts = Array.from(
    new Set([...(vaultAccounts || []), selectedVaultUser].map(a => (a || '').trim().replace(/^@/, '').toLowerCase()).filter(Boolean))
  );

  const activeUser = authType === 'VAULT' 
    ? (selectedVaultUser || allVaultAccounts[0] || '') 
    : (currentUsername || allKeychainAccounts[0] || '');

  const currentValue = authType === 'VAULT' 
    ? `VAULT:${activeUser}` 
    : `KEYCHAIN:${activeUser}`;

  const isVaultLocked = SecurityService.isLocked();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_KEYCHAIN__') {
      setIsAdding(true);
      return;
    }
    if (val === '__MANAGE_VAULT__') {
      if (onOpenVaultManager) onOpenVaultManager();
      return;
    }

    if (val.startsWith('KEYCHAIN:')) {
      const user = val.substring('KEYCHAIN:'.length);
      onSelectAccount(user, 'KEYCHAIN');
    } else if (val.startsWith('VAULT:')) {
      const user = val.substring('VAULT:'.length);
      onSelectAccount(user, 'VAULT');
    }
  };

  const handleSaveNewKeychainUser = () => {
    const clean = newAccountInput.trim().replace(/^@/, '').toLowerCase();
    if (clean) {
      if (onAddKeychainAccount) {
        onAddKeychainAccount(clean);
      }
      onSelectAccount(clean, 'KEYCHAIN');
    }
    setNewAccountInput('');
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <div className={cn("flex items-center gap-1 bg-slate-900 border border-cyan-500 rounded-xl px-2 py-1 shadow-sm shrink-0", className)}>
        <Shield size={14} className="text-cyan-400 shrink-0" />
        <span className="text-slate-500 text-xs font-bold">@</span>
        <input
          autoFocus
          type="text"
          value={newAccountInput}
          onChange={(e) => setNewAccountInput(e.target.value)}
          placeholder={t('username')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveNewKeychainUser();
            if (e.key === 'Escape') setIsAdding(false);
          }}
          className="bg-transparent text-xs text-slate-200 outline-none w-24 sm:w-28 font-medium"
        />
        <button
          type="button"
          onClick={handleSaveNewKeychainUser}
          className="p-1 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors cursor-pointer"
          title={t('save')}
        >
          <Check size={13} />
        </button>
        <button
          type="button"
          onClick={() => setIsAdding(false)}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
          title={t('cancel')}
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  const hasKeychainInstalled = typeof window !== 'undefined' && !!(window as any).steem_keychain;

  return (
    <div className={cn("flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2 py-1 shadow-sm shrink-0", className)}>
      <div className="shrink-0">
        {authType === 'VAULT' ? (
          <Key size={14} className="text-amber-400" />
        ) : (
          <Shield size={14} className="text-cyan-400" />
        )}
      </div>

      <select
        value={currentValue}
        onChange={handleSelectChange}
        className={cn(
          "bg-transparent text-xs font-semibold outline-none cursor-pointer truncate pr-1 focus:ring-0",
          authType === 'VAULT' ? "text-amber-300" : "text-cyan-300",
          compact ? "max-w-[120px]" : "max-w-[160px]"
        )}
        style={{ colorScheme: 'dark' }}
        title={t('switchAccount')}
      >
        {/* Keychain Accounts Group */}
        {(allKeychainAccounts.length > 0 || hasKeychainInstalled) && (
          <optgroup label={t('keychainAccounts')}>
            {allKeychainAccounts.map((acc) => (
              <option
                key={`kc-${acc}`}
                value={`KEYCHAIN:${acc}`}
                className="bg-slate-900 text-slate-200 py-1"
              >
                🛡️ @{acc} ({t('signingWithKeychain')})
              </option>
            ))}
            {allKeychainAccounts.length === 0 && (
              <option value="KEYCHAIN:guest" className="bg-slate-900 text-slate-300 py-1">
                🛡️ @guest ({t('signingWithKeychain')})
              </option>
            )}
            <option value="__ADD_KEYCHAIN__" className="bg-slate-900 text-cyan-400 font-bold py-1">
              ➕ {t('addKeychainAccount')}...
            </option>
          </optgroup>
        )}

        {/* Vault Accounts Group */}
        {allVaultAccounts.length > 0 && (
          <optgroup label={t('vaultAccounts')}>
            {allVaultAccounts.map((acc) => (
              <option
                key={`vault-${acc}`}
                value={`VAULT:${acc}`}
                className="bg-slate-900 text-slate-200 py-1"
              >
                🔑 @{acc} ({t('signingWithVault')}) {!isVaultLocked ? '✓' : '🔒'}
              </option>
            ))}
          </optgroup>
        )}

        {onOpenVaultManager && (
          <option value="__MANAGE_VAULT__" className="bg-slate-900 text-amber-400 font-bold py-1">
            ⚙️ {t('manageVaultAccounts')}...
          </option>
        )}
      </select>

      {/* Quick Add Keychain Account Button */}
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer shrink-0"
        title={t('addKeychainAccount')}
      >
        <Plus size={13} />
      </button>
    </div>
  );
};
