import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Key,
  Lock,
  Trash2,
  Plus,
  Image as ImageIcon,
  Shield,
  X
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import { cn } from '../../lib/utils';
import { SecurityService } from '../../services/securityService';
import { AuthType } from '../../types';

export interface KeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  setUsername: (name: string) => void;
  authType?: AuthType | 'VAULT';
  setAuthType?: (type: AuthType | 'VAULT') => void;
  selectedVaultUser?: string;
  setSelectedVaultUser?: (name: string) => void;
  keychainAccounts?: string[];
  addKeychainAccount?: (name: string) => void;
  removeKeychainAccount?: (name: string) => void;
  switchIdentity?: (user: string, type: 'KEYCHAIN' | 'VAULT') => void;
  // Vault storage
  isVaultInitialized: boolean;
  isUnlocked: boolean;
  vaultAccounts: string[];
  vaultPin: string;
  setVaultPin: (pin: string) => void;
  initVault: () => void;
  // API keys
  pexelsApiKey: string | null;
  setPexelsApiKey: (key: string | null) => void;
  pixabayApiKey: string | null;
  setPixabayApiKey: (key: string | null) => void;
  unsplashAccessKey: string | null;
  setUnsplashAccessKey: (key: string | null) => void;
  // Performance mode
  performanceMode?: boolean;
  setPerformanceMode?: (val: boolean) => void;
  // Actions
  notify: (msg: string, type?: any) => void;
  confirmDialog: (msg: string) => Promise<boolean>;
  promptDialog: (message: string, defaultValue?: string, title?: string, inputType?: 'text' | 'password') => Promise<string | null>;
  t: (key: any) => string;
}

export const KeysModal: React.FC<KeysModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    username,
    setUsername,
    authType = 'KEYCHAIN',
    selectedVaultUser = '',
    setSelectedVaultUser,
    keychainAccounts = [],
    addKeychainAccount,
    removeKeychainAccount,
    switchIdentity,
    isVaultInitialized,
    isUnlocked,
    vaultAccounts = [],
    vaultPin,
    setVaultPin,
    initVault,
    pexelsApiKey,
    setPexelsApiKey,
    pixabayApiKey,
    setPixabayApiKey,
    unsplashAccessKey,
    setUnsplashAccessKey,
    performanceMode = false,
    setPerformanceMode,
    notify,
    confirmDialog,
    t
  } = props;

  // Keychain accounts multi-management state
  const [showAddKeychain, setShowAddKeychain] = useState(false);
  const [newKeychainInput, setNewKeychainInput] = useState('');

  // Vault account add state (completely independent from active username)
  const [showVaultSetup, setShowVaultSetup] = useState(false);
  const [newVaultUser, setNewVaultUser] = useState('');
  const [newVaultWif, setNewVaultWif] = useState('');
  const [vaultSetupPin, setVaultSetupPin] = useState('');

  // Deduplicate and compute full accounts lists
  const allKeychainAccounts = Array.from(
    new Set([...(keychainAccounts || []), username].map(a => (a || '').trim().replace(/^@/, '').toLowerCase()).filter(Boolean))
  );

  const allVaultAccounts = Array.from(
    new Set([...(vaultAccounts || []), selectedVaultUser].map(a => (a || '').trim().replace(/^@/, '').toLowerCase()).filter(Boolean))
  );

  const handleAddKeychainAccount = () => {
    const clean = newKeychainInput.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return;
    if (addKeychainAccount) {
      addKeychainAccount(clean);
    }
    if (switchIdentity) {
      switchIdentity(clean, 'KEYCHAIN');
    } else {
      setUsername(clean);
    }
    setNewKeychainInput('');
    setShowAddKeychain(false);
    notify(t('accountAdded'));
  };

  const handleSaveNewVaultAccount = async () => {
    const clean = newVaultUser.trim().replace(/^@/, '').toLowerCase();
    if (!clean || !newVaultWif.trim()) {
      notify(t('fillAll'), 'error');
      return;
    }
    try {
      await SecurityService.saveKey(clean, newVaultWif.trim());
      setNewVaultUser('');
      setNewVaultWif('');
      setShowVaultSetup(false);
      await initVault();
      if (switchIdentity) {
        switchIdentity(clean, 'VAULT');
      } else if (setSelectedVaultUser) {
        setSelectedVaultUser(clean);
      }
      notify(t('accountAdded'));
    } catch (e: any) {
      notify(e.message, 'error');
    }
  };

  const [tempPexelsKey, setTempPexelsKey] = useState(pexelsApiKey || '');
  const [tempPixabayKey, setTempPixabayKey] = useState(pixabayApiKey || '');
  const [tempUnsplashAccessKey, setTempUnsplashAccessKey] = useState(unsplashAccessKey || '');
  const [savePexelsUnencrypted, setSavePexelsUnencrypted] = useState(() => {
    try {
      return localStorage.getItem('steem_save_pexels_unencrypted') === 'true';
    } catch {
      return false;
    }
  });

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={Key}
      title={t('vaultTitle')}
      modalKey="modal-keys"
      bodyClassName="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[80vh] flex-1"
    >
      {/* 1. Global Active Signing Method Selector */}
      <div className="p-4 bg-[var(--bg-main)]/80 border border-[var(--border-color)] rounded-xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
            <Key size={13} className="text-cyan-400" />
            {t('signingMethod')}
          </span>
          <span className="text-[10px] font-semibold text-cyan-300">
            {authType === 'VAULT' ? `🔑 @${selectedVaultUser || allVaultAccounts[0] || 'Vault'}` : `🛡️ @${username || allKeychainAccounts[0] || 'Keychain'}`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              const target = username || allKeychainAccounts[0] || '';
              if (switchIdentity) switchIdentity(target, 'KEYCHAIN');
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
              authType !== 'VAULT'
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm"
                : "bg-[var(--bg-card)] text-slate-400 border-[var(--border-color)] hover:bg-[var(--bg-card)]/80 hover:text-slate-200"
            )}
          >
            <Shield size={14} className={authType !== 'VAULT' ? "text-cyan-400" : "text-slate-500"} />
            <span>{t('signingWithKeychain')}</span>
            {authType !== 'VAULT' && <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/30 font-bold ml-1">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => {
              const target = selectedVaultUser || allVaultAccounts[0] || '';
              if (switchIdentity) switchIdentity(target, 'VAULT');
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
              authType === 'VAULT'
                ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm"
                : "bg-[var(--bg-card)] text-slate-400 border-[var(--border-color)] hover:bg-[var(--bg-card)]/80 hover:text-slate-200"
            )}
          >
            <Key size={14} className={authType === 'VAULT' ? "text-amber-400" : "text-slate-500"} />
            <span>{t('signingWithVault')}</span>
            {authType === 'VAULT' && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 font-bold ml-1">✓</span>}
          </button>
        </div>
      </div>

      {/* 2. Keychain Accounts Multi-Management Section */}
      <div className="p-4 bg-[var(--bg-main)]/70 border border-[var(--border-color)] rounded-xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
            <Shield size={13} className="text-cyan-400" />
            {t('keychainAccounts')} ({allKeychainAccounts.length})
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded-full">
              {(typeof window !== 'undefined' && (window as any).steem_keychain) ? t('keychainReadyBadge') : t('notificationsAndReaderBadge')}
            </span>
            <button
              type="button"
              onClick={() => setShowAddKeychain(!showAddKeychain)}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              {showAddKeychain ? <X size={14} /> : <Plus size={14} />}
              <span>{showAddKeychain ? t('cancel') : t('addKeychainAccount')}</span>
            </button>
          </div>
        </div>

        {/* Add Keychain Account Form */}
        <AnimatePresence>
          {showAddKeychain && (
            <motion.div
              key="keys-keychain-add-form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 bg-[var(--bg-card)]/90 border border-cyan-500/40 rounded-xl space-y-2 mb-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('addKeychainAccount')}</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">@</span>
                    <input
                      autoFocus
                      type="text"
                      value={newKeychainInput}
                      onChange={(e) => setNewKeychainInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddKeychainAccount();
                        if (e.key === 'Escape') setShowAddKeychain(false);
                      }}
                      placeholder={t('usernameNoAt')}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl pl-7 pr-3 py-2 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-cyan-400 font-bold placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddKeychainAccount}
                    className="btn-primary px-4 py-2 text-xs shrink-0 cursor-pointer"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keychain Accounts List */}
        <div className="space-y-2">
          {allKeychainAccounts.length > 0 ? (
            allKeychainAccounts.map((acc) => {
              const isActive = authType !== 'VAULT' && acc === username;
              return (
                <div
                  key={`kc-acc-row-${acc}`}
                  className={cn(
                    "p-3 bg-[var(--bg-main)]/50 border rounded-xl flex items-center justify-between group transition-colors",
                    isActive ? "border-cyan-500/60 shadow-xs" : "border-[var(--border-color)] hover:border-cyan-500/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      isActive ? "bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500" : "bg-cyan-500/10 text-cyan-400"
                    )}>
                      {acc[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-bold text-[var(--text-main)]">@{acc}</p>
                        {isActive && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                            ✓ {t('activeAccountBadge')}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-[var(--text-muted)] font-medium">
                        {t('signingWithKeychain')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          if (switchIdentity) {
                            switchIdentity(acc, 'KEYCHAIN');
                          } else {
                            setUsername(acc);
                          }
                          notify(t('saveSuccess'));
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-cyan-500/20 text-cyan-400 border border-slate-700 hover:border-cyan-500/40 rounded-lg transition-colors cursor-pointer"
                      >
                        {t('setActive')}
                      </button>
                    )}
                    {allKeychainAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (await confirmDialog(t('removeKeychainAccountConfirm').replace('{acc}', acc))) {
                            if (removeKeychainAccount) {
                              removeKeychainAccount(acc);
                            }
                          }
                        }}
                        className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 border border-dashed border-[var(--border-color)] rounded-xl text-center">
              <p className="text-xs text-[var(--text-muted)]">{t('usernameDesc')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-200/90 leading-relaxed">
        <p>{t('vaultWarning')}</p>
      </div>

      {!isVaultInitialized ? (
        <div className="space-y-4 p-4 bg-[var(--bg-main)]/50 border border-cyan-500/30 rounded-xl">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{t('pinSetup')}</h3>
          <p className="text-xs text-[var(--text-muted)]">{t('pinSetupDesc')}</p>
          <input 
            type="password" 
            value={vaultSetupPin}
            onChange={e => setVaultSetupPin(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-[var(--text-main)]"
            placeholder={t('enterNewPin')}
          />
          <button 
            onClick={async () => {
              if (vaultSetupPin.length < 4) {
                notify(t('pinShort'), 'error');
                return;
              }
              await SecurityService.setup(vaultSetupPin);
              setVaultSetupPin('');
              initVault();
              notify(t('vaultInit'));
            }}
            className="btn-primary w-full py-2.5 text-xs"
          >
            {t('createVault')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {!isUnlocked ? (
            <div className="space-y-4 p-4 bg-[var(--bg-main)]/50 border border-amber-500/30 rounded-xl">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t('vaultLocked')}</h3>
              <input 
                type="password" 
                value={vaultPin}
                onChange={e => setVaultPin(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-amber-500 text-[var(--text-main)]"
                placeholder={t('enterPinPlaceholder')}
              />
              <button 
                onClick={async () => {
                  try {
                    await SecurityService.unlock(vaultPin);
                    setVaultPin('');
                    initVault();
                  } catch (e: any) {
                    notify(e.message, 'error');
                  }
                }}
                className="btn-primary w-full py-2.5 text-xs"
              >
                {t('unlockBtn')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">
                  {t('yourAccounts')} ({allVaultAccounts.length})
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { SecurityService.lock(); initVault(); }}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Lock size={14} /> {t('lock')}
                  </button>
                  <button 
                    onClick={() => setShowVaultSetup(!showVaultSetup)}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {showVaultSetup ? <X size={14} /> : <Plus size={14} />}
                    {showVaultSetup ? t('cancel') : t('addVaultAccount')}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showVaultSetup && (
                  <motion.div 
                    key="keys-vault-setup-form"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-[var(--bg-main)]/80 border border-cyan-500/30 rounded-xl space-y-3 mb-4">
                      <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('newAccount')}</p>
                      <input 
                        type="text" 
                        value={newVaultUser}
                        onChange={e => setNewVaultUser(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-[var(--text-main)]"
                        placeholder={t('usernameNoAt')}
                      />
                      <input 
                        type="password" 
                        value={newVaultWif}
                        onChange={e => setNewVaultWif(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-[var(--text-main)]"
                        placeholder={t('postingKeyPlaceholder')}
                      />
                      <button 
                        onClick={handleSaveNewVaultAccount}
                        className="btn-primary w-full py-2.5 text-xs cursor-pointer"
                      >
                        {t('saveToVault')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {allVaultAccounts.length > 0 ? (
                  allVaultAccounts.map((acc, idx) => {
                    const isActive = authType === 'VAULT' && acc === (selectedVaultUser || allVaultAccounts[0]);
                    return (
                      <div
                        key={acc || `vault-acc-${idx}`}
                        className={cn(
                          "p-3 bg-[var(--bg-main)]/50 border rounded-xl flex items-center justify-between group transition-colors",
                          isActive ? "border-amber-500/60 shadow-xs" : "border-[var(--border-color)] hover:border-amber-500/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                            isActive ? "bg-amber-500/30 text-amber-300 ring-1 ring-amber-500" : "bg-amber-500/20 text-amber-400"
                          )}>
                            {acc[0]?.toUpperCase() || 'V'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-bold text-[var(--text-main)]">@{acc}</p>
                              {isActive && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                                  ✓ {t('activeAccountBadge')}
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-green-400 uppercase tracking-wider font-semibold">{t('protectedByMK')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                if (switchIdentity) {
                                  switchIdentity(acc, 'VAULT');
                                } else if (setSelectedVaultUser) {
                                  setSelectedVaultUser(acc);
                                }
                                notify(t('saveSuccess'));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-amber-500/20 text-amber-400 border border-slate-700 hover:border-amber-500/40 rounded-lg transition-colors cursor-pointer"
                            >
                              {t('setActive')}
                            </button>
                          )}
                          <button 
                            type="button"
                            onClick={async () => {
                              if (await confirmDialog(t('confirmDeleteAccount').replace('{acc}', acc))) {
                                await SecurityService.deleteAccount(acc);
                                initVault();
                              }
                            }}
                            className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer"
                            title={t('delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 border border-dashed border-[var(--border-color)] rounded-xl text-center">
                    <p className="text-xs text-[var(--text-muted)]">{t('vaultEmpty')}</p>
                  </div>
                )}
              </div>
              
              <div className="pt-2">
                <button 
                  onClick={async () => {
                    if (await confirmDialog(t('confirmResetVault'))) {
                      await SecurityService.clearAll();
                      initVault();
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
                >
                  {t('resetVault')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
        <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-[var(--text-main)]">
          <ImageIcon size={18} className="text-cyan-400" /> {t('additional')}
        </h3>

        <div className="flex flex-col gap-4 bg-[var(--bg-main)]/40 p-4 rounded-xl border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--text-main)]">{t('performanceMode')}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{t('enableThumbnails')}</span>
            </div>
            <button 
              onClick={() => {
                const next = !performanceMode;
                setPerformanceMode?.(next);
                localStorage.setItem('steem_performance_mode', next.toString());
              }}
              className={cn(
                "w-10 h-5 rounded-full transition-all relative cursor-pointer border border-transparent",
                performanceMode ? "bg-cyan-600 border-cyan-500" : "bg-[var(--bg-card)] border-[var(--border-color)]"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-all",
                performanceMode ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('pexelsKey')}</label>
              {!savePexelsUnencrypted && !isUnlocked && (
                <span className="text-[9px] text-amber-400 flex items-center gap-1"><Lock size={10} /> {t('unlockVaultToSaveHint')}</span>
              )}
            </div>
            <div className="flex gap-2">
              <input 
                type="password" 
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-[var(--text-muted)]"
                placeholder={pexelsApiKey ? "••••••••" : t('pexelsKey')}
                value={tempPexelsKey}
                onChange={e => setTempPexelsKey(e.target.value)}
              />
              <button 
                onClick={async () => {
                  if (!tempPexelsKey.trim()) return;
                  try {
                    if (savePexelsUnencrypted) {
                      localStorage.setItem('steem_pexels_key_raw', tempPexelsKey.trim());
                    } else {
                      await SecurityService.savePexelsKey(tempPexelsKey.trim());
                    }
                    setPexelsApiKey(tempPexelsKey.trim());
                    setTempPexelsKey('');
                    notify(t('saveSuccess'));
                  } catch (err: any) {
                    notify(err.message, 'error');
                  }
                }}
                className="px-4 py-2 bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('pixabayKey')}</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-[var(--text-muted)]"
                placeholder={pixabayApiKey ? "••••••••" : t('pixabayKey')}
                value={tempPixabayKey}
                onChange={e => setTempPixabayKey(e.target.value)}
              />
              <button 
                onClick={async () => {
                  if (!tempPixabayKey.trim()) return;
                  try {
                    if (savePexelsUnencrypted) {
                      localStorage.setItem('steem_pixabay_key', tempPixabayKey.trim());
                    } else {
                      await SecurityService.saveApiKey('pixabay', tempPixabayKey.trim());
                    }
                    setPixabayApiKey(tempPixabayKey.trim());
                    setTempPixabayKey('');
                    notify(t('saveSuccess'));
                  } catch (e: any) { notify(e.message, 'error') }
                }}
                className="px-4 py-2 bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('unsplashAccessKey')}</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-[var(--text-muted)]"
                placeholder={unsplashAccessKey ? "••••••••" : t('unsplashAccessKey')}
                value={tempUnsplashAccessKey}
                onChange={e => setTempUnsplashAccessKey(e.target.value)}
              />
              <button 
                onClick={async () => {
                  if (!tempUnsplashAccessKey.trim()) return;
                  try {
                    if (savePexelsUnencrypted) {
                      localStorage.setItem('steem_unsplash_access_key', tempUnsplashAccessKey.trim());
                    } else {
                      await SecurityService.saveApiKey('unsplashAccess', tempUnsplashAccessKey.trim());
                    }
                    setUnsplashAccessKey(tempUnsplashAccessKey.trim());
                    setTempUnsplashAccessKey('');
                    notify(t('saveSuccess'));
                  } catch (e: any) { notify(e.message, 'error') }
                }}
                className="px-4 py-2 bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={savePexelsUnencrypted}
              onChange={e => {
                setSavePexelsUnencrypted(e.target.checked);
                localStorage.setItem('steem_pexels_unencrypted', String(e.target.checked));
              }}
              className="rounded border-[var(--border-color)] text-cyan-500 focus:ring-cyan-500 bg-[var(--bg-card)]"
            />
            <span className="text-xs text-[var(--text-muted)]">{t('saveUnencrypted')}</span>
          </label>

          <div className="pt-2">
            <button 
              onClick={async () => {
                if (await confirmDialog(t('confirmClearApiKeys'))) {
                  setPexelsApiKey('');
                  setPixabayApiKey('');
                  setUnsplashAccessKey('');
                  localStorage.removeItem('steem_pexels_key_raw');
                  localStorage.removeItem('steem_pixabay_key');
                  localStorage.removeItem('steem_unsplash_app_id');
                  localStorage.removeItem('steem_unsplash_access_key');
                  localStorage.removeItem('steem_unsplash_secret_key');
                  await SecurityService.clearAllApiKeys();
                  notify(t('keysCleared'));
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
            >
              {t('clearApiKeys')}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--border-color)] flex justify-end">
        <button 
          onClick={onClose}
          className="btn-primary px-6 py-2.5 text-xs font-bold"
        >
          {t('done')}
        </button>
      </div>
    </BaseModal>
  );
};
