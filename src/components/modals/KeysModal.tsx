import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Key,
  Lock,
  Trash2,
  Plus,
  Image as ImageIcon,
  AtSign,
  X
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import { cn } from '../../lib/utils';
import { SecurityService } from '../../services/securityService';

export interface KeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  setUsername: (name: string) => void;
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
    isVaultInitialized,
    isUnlocked,
    vaultAccounts,
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

  const [tempUsername, setTempUsername] = useState(username || '');
  const [vaultSetupPin, setVaultSetupPin] = useState('');
  const [vaultSetupWif, setVaultSetupWif] = useState('');
  const [showVaultSetup, setShowVaultSetup] = useState(false);

  useEffect(() => {
    if (username) setTempUsername(username);
  }, [username]);

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
      {/* 1. Permanent Username Section */}
      <div className="p-4 bg-[var(--bg-main)]/70 border border-[var(--border-color)] rounded-xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
            <AtSign size={13} className="text-cyan-400" />
            {t('username') || "Steem Username"}
          </label>
          <span className="text-[9px] font-semibold text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded-full">
            {(typeof window !== 'undefined' && (window as any).steem_keychain) ? "🛡️ Keychain ready" : "Notifications & Reader"}
          </span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">@</span>
            <input 
              type="text" 
              value={tempUsername}
              onChange={e => setTempUsername(e.target.value.toLowerCase().trim().replace(/^@/, ''))}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-7 pr-3 py-2 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-cyan-400 font-bold placeholder:text-[var(--text-muted)]"
              placeholder="username"
            />
          </div>
          <button 
            onClick={() => {
              const clean = tempUsername.trim().replace(/^@/, '');
              setUsername(clean);
              notify(t('saveSuccess') || "Збережено!");
            }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
          >
            {t('save') || "Зберегти"}
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          {t('usernameDesc') || "Вкажіть ваш обліковий запис Steem для публікацій через Keychain, завантаження сповіщень та коментарів."}
        </p>
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
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-cyan-900/20"
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
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-900/20"
              >
                {t('unlockBtn')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">{t('yourAccounts')}</h3>
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
                    {showVaultSetup ? t('cancel') : t('addAccount')}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showVaultSetup && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-[var(--bg-main)]/80 border border-cyan-500/30 rounded-xl space-y-3 mb-4">
                      <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('newAccount')}</p>
                      <input 
                        type="text" 
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-[var(--text-main)]"
                        placeholder={t('usernameNoAt')}
                      />
                      <input 
                        type="password" 
                        value={vaultSetupWif}
                        onChange={e => setVaultSetupWif(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-[var(--text-main)]"
                        placeholder={t('postingKeyPlaceholder')}
                      />
                      <button 
                        onClick={async () => {
                          if (!username || !vaultSetupWif) {
                            notify(t('fillAll'), 'error');
                            return;
                          }
                          try {
                            await SecurityService.saveKey(username, vaultSetupWif);
                            setVaultSetupWif('');
                            setShowVaultSetup(false);
                            initVault();
                            notify(t('accountAdded'));
                          } catch (e: any) {
                            notify(e.message, 'error');
                          }
                        }}
                        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-cyan-900/20"
                      >
                        {t('saveToVault')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {vaultAccounts.length > 0 ? (
                  vaultAccounts.filter(Boolean).map((acc, idx) => (
                    <div key={acc || `vault-acc-${idx}`} className="p-3 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl flex items-center justify-between group hover:border-cyan-500/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                          {acc[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[var(--text-main)]">@{acc}</p>
                          <p className="text-[9px] text-green-400 uppercase tracking-wider font-semibold">{t('protectedByMK')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
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
                  ))
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
                <span className="text-[9px] text-amber-400 flex items-center gap-1"><Lock size={10} /> Unlock Vault to save</span>
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
                if (await confirmDialog(t('confirmClearApiKeys') || "Очистити всі API ключі?")) {
                  setPexelsApiKey('');
                  setPixabayApiKey('');
                  setUnsplashAccessKey('');
                  localStorage.removeItem('steem_pexels_key_raw');
                  localStorage.removeItem('steem_pixabay_key');
                  localStorage.removeItem('steem_unsplash_app_id');
                  localStorage.removeItem('steem_unsplash_access_key');
                  localStorage.removeItem('steem_unsplash_secret_key');
                  await SecurityService.clearAllApiKeys();
                  notify(t('keysCleared') || "API ключі очищено!");
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
            >
              {t('clearApiKeys') || "Очистити API ключі"}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--border-color)] flex justify-end">
        <button 
          onClick={onClose}
          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-900/20 active:scale-98 cursor-pointer"
        >
          {t('done')}
        </button>
      </div>
    </BaseModal>
  );
};
