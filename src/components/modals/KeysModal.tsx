import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Key,
  Lock,
  Trash2,
  X,
  Plus,
  Image as ImageIcon
} from 'lucide-react';
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

  const [vaultSetupPin, setVaultSetupPin] = useState('');
  const [vaultSetupWif, setVaultSetupWif] = useState('');
  const [showVaultSetup, setShowVaultSetup] = useState(false);

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

  if (!isOpen) return null;

  return (
<div key="modal-keys" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => onClose()}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30 shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Key className="text-cyan-400" /> {t('vaultTitle')}
                </h2>
                <button onClick={() => onClose()} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-sm text-cyan-100/70">
                  <p>{t('vaultWarning')}</p>
                </div>

                {!isVaultInitialized ? (
                  <div className="space-y-4 p-4 bg-slate-800/50 border border-cyan-500/30 rounded-xl">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{t('pinSetup')}</h3>
                    <p className="text-xs text-slate-400">{t('pinSetupDesc')}</p>
                    <input 
                      type="password" 
                      value={vaultSetupPin}
                      onChange={e => setVaultSetupPin(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
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
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      {t('createVault')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {!isUnlocked ? (
                      <div className="space-y-4 p-4 bg-slate-800/50 border border-yellow-500/30 rounded-xl">
                        <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest">{t('vaultLocked')}</h3>
                        <input 
                          type="password" 
                          value={vaultPin}
                          onChange={e => setVaultPin(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-yellow-500"
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
                          className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          {t('unlockBtn')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('yourAccounts')}</h3>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => { SecurityService.lock(); initVault(); }}
                              className="text-[10px] font-bold text-yellow-500 hover:text-yellow-400 flex items-center gap-1"
                            >
                              <Lock size={16} /> {t('lock')}
                            </button>
                            <button 
                              onClick={() => setShowVaultSetup(!showVaultSetup)}
                              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              {showVaultSetup ? <X size={16} /> : <Plus size={16} />}
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
                              <div className="p-4 bg-slate-800/80 border border-cyan-500/30 rounded-xl space-y-3 mb-4">
                                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('newAccount')}</p>
                                <input 
                                  type="text" 
                                  value={username}
                                  onChange={e => setUsername(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                                  placeholder={t('usernameNoAt')}
                                />
                                <input 
                                  type="password" 
                                  value={vaultSetupWif}
                                  onChange={e => setVaultSetupWif(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
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
                                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  {t('saveToVault')}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-2">
                          {vaultAccounts.length > 0 ? (
                            vaultAccounts.map(acc => (
                              <div key={acc} className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                                    {acc[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-200">@{acc}</p>
                                    <p className="text-[9px] text-green-500 uppercase tracking-wider">{t('protectedByMK')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={async () => {
                                      if (await confirmDialog(t('confirmDeleteAccount').replace('{acc}', acc))) {
                                        await SecurityService.deleteAccount(acc);
                                        initVault();
                                      }
                                    }}
                                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                    title={t('delete')}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 border-2 border-dashed border-slate-800 rounded-xl text-center">
                              <p className="text-xs text-slate-500">{t('vaultEmpty')}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-4">
                          <button 
                            onClick={async () => {
                              if (await confirmDialog(t('confirmResetVault'))) {
                                await SecurityService.clearAll();
                                initVault();
                              }
                            }}
                            className="text-[10px] text-red-500 hover:text-red-400 underline"
                          >
                            {t('resetVault')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <ImageIcon size={20} className="text-cyan-400" /> {t('additional')}
                  </h3>

                  <div className="flex flex-col gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">{t('performanceMode')}</span>
                        <span className="text-[10px] text-slate-500">{t('enableThumbnails')}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const next = !performanceMode;
                          setPerformanceMode?.(next);
                          localStorage.setItem('steem_performance_mode', next.toString());
                        }}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all relative",
                          performanceMode ? "bg-cyan-600" : "bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                          performanceMode ? "left-5" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('pexelsKey')}</label>
                        {!savePexelsUnencrypted && !isUnlocked && (
                          <span className="text-[8px] text-amber-500 flex items-center gap-1"><Lock size={8} /> Unlock Vault to save</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
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
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold"
                        >
                          {t('save')}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('pixabayKey')}</label>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
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
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold"
                        >
                          {t('save')}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('unsplashAccessKey')}</label>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
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
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-bold"
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
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
                      />
                      <span className="text-xs text-slate-400">{t('saveUnencrypted')}</span>
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
                         className="text-[10px] text-red-500 hover:text-red-400 underline"
                       >
                         {t('clearApiKeys') || "Очистити API ключі"}
                       </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button 
                    onClick={() => onClose()}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    {t('done')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
  );
};
