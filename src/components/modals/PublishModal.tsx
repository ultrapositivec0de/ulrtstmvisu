import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Rocket,
  X,
  ShieldCheck,
  Lock,
  Info,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle,
  AtSign,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Beneficiary, TagGroup, AuthType } from '../../types';
import { SecurityService } from '../../services/securityService';
import { COMMON_TAGS } from '../../data/communities';

export interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
  // Auth state
  authType: AuthType;
  setAuthType: (type: AuthType) => void;
  username: string;
  setUsername: (name: string) => void;
  // Vault state
  isVaultInitialized: boolean;
  isUnlocked: boolean;
  vaultAccounts: string[];
  selectedVaultUser: string;
  setSelectedVaultUser: (user: string) => void;
  vaultPin: string;
  setVaultPin: (pin: string) => void;
  initVault: () => void;
  // Post state
  pubTitle: string;
  setPubTitle: (title: string) => void;
  pubTags: string;
  setPubTags: React.Dispatch<React.SetStateAction<string>> | ((tags: string) => void);
  rewardType: '0' | '50' | 'SP' | string;
  setRewardType: (reward: any) => void;
  removeTitleLine: boolean;
  setRemoveTitleLine: (val: boolean) => void;
  // Beneficiaries
  beneficiaries: Beneficiary[];
  setBeneficiaries: React.Dispatch<React.SetStateAction<Beneficiary[]>> | ((bens: any) => void);
  benName: string;
  setBenName: (name: string) => void;
  benWeight: number | string;
  setBenWeight: (weight: any) => void;
  // Advanced & Scheduled
  showAdvancedPublish: boolean;
  setShowAdvancedPublish: (val: boolean) => void;
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  // Mentions & content
  contentForPublish: string;
  mentions: string[];
  extractMentions: (text: string) => string[];
  // Queue & publishing
  performanceMode: boolean;
  addToQueue: () => void;
  pubLog: { msg: string; type: 'success' | 'error' | 'loading' | null };
  setPubLog: (log: { msg: string; type: 'success' | 'error' | 'loading' | null }) => void;
  handlePublish: () => void;
  setActiveModal: (modal: any) => void;
  tagGroups: TagGroup[];
  notify: (msg: string, type?: any) => void;
  t: (key: any) => string;
}

export const PublishModal: React.FC<PublishModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    lang = 'uk',
    authType,
    setAuthType,
    username,
    setUsername,
    isVaultInitialized,
    isUnlocked,
    vaultAccounts,
    selectedVaultUser,
    setSelectedVaultUser,
    vaultPin,
    setVaultPin,
    initVault,
    pubTitle,
    setPubTitle,
    pubTags,
    setPubTags,
    rewardType,
    setRewardType,
    removeTitleLine,
    setRemoveTitleLine,
    beneficiaries,
    setBeneficiaries,
    benName,
    setBenName,
    benWeight,
    setBenWeight,
    showAdvancedPublish,
    setShowAdvancedPublish,
    scheduledTime,
    setScheduledTime,
    contentForPublish,
    mentions,
    extractMentions,
    performanceMode,
    addToQueue,
    pubLog,
    handlePublish,
    setActiveModal,
    notify,
    t
  } = props;

  if (!isOpen) return null;

  return (
<div key="modal-publish" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => onClose()}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Rocket className="text-cyan-400" /> {t('publishToSteem')}
                </h2>
                <button onClick={() => onClose()} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              
              <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  <button 
                    onClick={() => setAuthType('KEYCHAIN')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all",
                      authType === 'KEYCHAIN' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <ShieldCheck size={18} /> Keychain
                    {typeof window !== 'undefined' && !(window as any).steem_keychain && (
                      <span className="text-[9px] font-normal opacity-60">({t('absent')})</span>
                    )}
                  </button>
                  <button 
                    onClick={() => setAuthType('VAULT')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all",
                      authType === 'VAULT' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Lock size={18} /> Vault (Ключ)
                  </button>
                </div>

                <div className="space-y-3">
                  {authType === 'VAULT' && (
                    <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      {!isVaultInitialized ? (
                        <div className="space-y-3 text-center py-2">
                          <p className="text-xs text-slate-400">{t('vaultNotConfigured')}</p>
                          <button 
                            onClick={() => setActiveModal('keys')}
                            className="text-xs font-bold text-cyan-400 hover:underline"
                          >
                            {t('setupVaultBtn')}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              isUnlocked ? "text-green-400" : "text-yellow-400"
                            )}>
                              <ShieldCheck size={18}/> {isUnlocked ? t('vaultUnlocked') : t('vaultLocked')}
                            </span>
                            <div className="flex gap-2">
                              {isUnlocked && (
                                <button 
                                  onClick={() => { SecurityService.lock(); setVaultPin(''); }}
                                  className="text-[10px] text-slate-400 hover:text-white"
                                >
                                  {t('lock')}
                                </button>
                              )}
                            </div>
                          </div>
                          {!isUnlocked && (
                            <div className="space-y-2">
                              <input 
                                type="password" 
                                value={vaultPin}
                                onChange={e => setVaultPin(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
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
                                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all"
                              >
                                {t('unlockBtn')}
                              </button>
                            </div>
                          )}
                          {isUnlocked && (
                            <div className="space-y-2">
                              <select 
                                value={selectedVaultUser}
                                onChange={e => {
                                  setSelectedVaultUser(e.target.value);
                                  setUsername(e.target.value);
                                }}
                                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-mono"
                                style={{ colorScheme: 'dark' }}
                              >
                                <option value="" className="bg-slate-900 text-slate-400">{t('selectAccount')}</option>
                                {vaultAccounts.map(acc => (
                                  <option key={acc} value={acc} className="bg-slate-900 text-slate-200 py-1">@{acc}</option>
                                ))}
                              </select>
                              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-[11px] text-green-400 flex items-start gap-2">
                                <ShieldCheck size={20} className="shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold mb-0.5">{t('vaultActive')}</p>
                                  <p className="opacity-80">{t('vaultActiveDesc')}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {authType === 'KEYCHAIN' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t('username')}</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={username || ""}
                            onChange={e => setUsername(e.target.value)}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-mono"
                            placeholder={t('username')}
                          />
                          {(window as any).steem_keychain && !username && (
                             <button 
                              onClick={() => {
                                (window as any).steem_keychain.requestHandshake(() => {
                                  // Handshake done, but we usually want to just let them type or maybe try to get accounts?
                                  // Keychain doesn't expose accounts easily without interaction
                                  notify("Keychain detected. Enter your username.");
                                });
                              }}
                              className="px-3 bg-slate-800 border border-slate-700 rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors"
                              title="Keychain Detected"
                            >
                              <ShieldCheck size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {!(window as any).steem_keychain && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 flex items-start gap-2.5">
                          <Info size={18} className="shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            {lang === 'uk' 
                              ? 'Steem Keychain не знайдено. Рекомендуємо знайти його у магазинах розширень для браузерів ПК, а для мобільних — у відповідних маркетах застосунків.' 
                              : 'Steem Keychain not found. We recommend searching for it in browser extension stores for PC, and in app markets for mobile devices.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t('title')}</label>
                    <input 
                      type="text" 
                      value={pubTitle || ""}
                      onChange={e => setPubTitle(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      placeholder={t('title')}
                    />
                    <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" checked={removeTitleLine} onChange={(e) => { setRemoveTitleLine(e.target.checked); localStorage.setItem('steem_remove_title_line', e.target.checked.toString()); }} className="sr-only" />
                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", removeTitleLine ? "bg-cyan-500 border-cyan-500" : "border-slate-600 group-hover:border-slate-500")}>
                          {removeTitleLine && <Check size={12} className="text-white" />}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 group-hover:text-slate-300">{t('removeFirstLine') || 'Remove 1st line from post body'}</span>
                    </label>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-500 uppercase block">{t('tags')}</label>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setActiveModal('tagPresets')}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors flex items-center gap-1"
                        >
                          <LayoutGrid size={14} /> {t('communities')}
                        </button>
                        <button 
                          onClick={() => setActiveModal('tagGroups')}
                          className="text-[10px] text-slate-400 hover:text-slate-300 font-bold transition-colors"
                        >
                          + {t('tagGroups')}
                        </button>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={pubTags || ""}
                      onChange={e => setPubTags(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      placeholder={t('tagsPlaceholder')}
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {COMMON_TAGS.slice(0, 8).map(tag => (
                        <button 
                          key={tag}
                          onClick={() => {
                            const existing = pubTags.split(' ').filter((t: string) => t.trim());
                            if (!existing.includes(tag)) {
                              setPubTags([...existing, tag].join(' '));
                            }
                          }}
                          className={cn(
                            "text-[10px] px-2 py-1 rounded-full border transition-colors",
                            pubTags.includes(tag) 
                              ? "bg-cyan-600 border-cyan-500 text-white" 
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                          )}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reward Type - Moved Here */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t('rewardType')}</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['50', 'SP', '0'] as const).map(type => (
                        <button 
                          key={type}
                          onClick={() => {
                            setRewardType(type);
                            localStorage.setItem('steem_reward_type', type);
                          }}
                          className={cn(
                            "text-[9px] py-2 rounded-lg border transition-all font-bold uppercase",
                            rewardType === type ? "bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-900/40" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          {t(`rewards${type}` as any)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <button 
                      onClick={() => setShowAdvancedPublish(!showAdvancedPublish)}
                      className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-cyan-400 transition-colors"
                    >
                      {showAdvancedPublish ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      {t('beneficiaries')} & {t('schedule')}
                    </button>

                    <AnimatePresence>
                      {showAdvancedPublish && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          {/* Schedule */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar size={18} className="text-slate-500" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{t('schedule')}</span>
                            </div>
                            <input 
                              type="datetime-local" 
                              value={scheduledTime || ""}
                              onChange={e => setScheduledTime(e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded p-1 text-[10px] outline-none focus:ring-1 focus:ring-cyan-500 text-slate-300"
                            />
                          </div>

                          {/* Beneficiaries */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                              <div className="flex gap-2 flex-1">
                                <div className="space-y-1 flex-1">
                                  <label className="text-[8px] font-bold text-slate-500 uppercase px-1">{t('username')}</label>
                                  <input 
                                    type="text" 
                                    value={benName || ""}
                                    onChange={e => setBenName(e.target.value.toLowerCase().replace('@', ''))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] outline-none focus:ring-1 focus:ring-cyan-500"
                                    placeholder="nickname"
                                  />
                                </div>
                                <div className="space-y-1 w-16">
                                  <label className="text-[8px] font-bold text-slate-500 uppercase px-1">%</label>
                                  <input 
                                    type="number" 
                                    value={benWeight || "5"}
                                    onChange={e => setBenWeight(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] outline-none focus:ring-1 focus:ring-cyan-500 text-center"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button 
                                    onClick={() => {
                                      if (!benName) return;
                                      const weight = parseFloat(String(benWeight));
                                      if (isNaN(weight)) return;
                                      setBeneficiaries([...beneficiaries, { account: benName.trim(), weight }]);
                                      setBenName('');
                                    }}
                                    className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                                  >
                                    <Plus size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Fav Mentions Picker */}
                            {mentions.length > 0 && (
                              <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{t('mentions')}</label>
                                  <button onClick={() => setActiveModal('mentions')} className="text-[8px] text-cyan-400 hover:underline px-1 uppercase font-bold">Редагувати список</button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 min-h-[1rem]">
                                  {mentions.filter(Boolean).map((m, idx) => (
                                    <button
                                      key={m || `mention-${idx}`}
                                      onClick={() => {
                                        if (beneficiaries.some(b => b.account === m)) return;
                                        setBeneficiaries([...beneficiaries, { account: m, weight: 5 }]);
                                      }}
                                      disabled={beneficiaries.some(b => b.account === m)}
                                      className={cn(
                                        "text-[9px] px-2.5 py-1 rounded-full border transition-all font-medium",
                                        beneficiaries.some(b => b.account === m)
                                          ? "bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed"
                                          : "bg-cyan-500/5 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/40"
                                      )}
                                    >
                                      @{m}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Mentions in text Picker */}
                            {extractMentions(contentForPublish).filter(m => Boolean(m && !mentions.includes(m))).length > 0 && (
                              <div className="px-1">
                                <span className="text-[8px] text-slate-600 uppercase font-bold mb-1 block opacity-60">{t('fromMentions')}:</span>
                                <div className="flex flex-wrap gap-1">
                                  {extractMentions(contentForPublish).filter(m => Boolean(m && !mentions.includes(m))).map((m, idx) => (
                                    <button
                                      key={m || `extracted-mention-${idx}`}
                                      onClick={() => {
                                        if (beneficiaries.some(b => b.account === m)) return;
                                        setBeneficiaries([...beneficiaries, { account: m, weight: 5 }]);
                                      }}
                                      disabled={beneficiaries.some(b => b.account === m)}
                                      className={cn(
                                        "text-[8px] px-2 py-0.5 rounded border transition-all",
                                        beneficiaries.some(b => b.account === m)
                                          ? "bg-slate-800 border-slate-700 text-slate-600"
                                          : "bg-slate-800/50 border-slate-700 text-slate-500 hover:text-cyan-400"
                                      )}
                                    >
                                      @{m}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="space-y-1.5 pt-2">
                              <label className="text-[8px] font-bold text-slate-600 uppercase px-1">{t('beneficiaries')}</label>
                              {beneficiaries.map((b, idx) => (
                                <div key={b.account ? `ben-${b.account}` : `ben-idx-${idx}`} className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50 text-[10px] hover:border-slate-600 transition-colors">
                                  <span className="text-slate-200 font-bold tracking-tight">@{b.account}</span>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-lg border border-slate-700/50">
                                      <input 
                                        type="number"
                                        className="w-8 bg-transparent text-center outline-none text-cyan-400 font-mono text-[11px]"
                                        value={b.weight}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          if (isNaN(val)) return;
                                          setBeneficiaries(beneficiaries.map((ben, i) => i === idx ? { ...ben, weight: val } : ben));
                                        }}
                                      />
                                      <span className="text-slate-500 text-[9px] font-bold">%</span>
                                    </div>
                                    <button 
                                      onClick={() => setBeneficiaries(beneficiaries.filter((_, i) => i !== idx))}
                                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {beneficiaries.length === 0 && (
                                <div className="text-center py-4 bg-slate-800/20 rounded-xl border border-dashed border-slate-800 text-[10px] text-slate-600 italic">
                                  {t('noBeneficiaries')}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Signature Check - Simplified */}
                <div className="px-4 py-2 bg-slate-800/10 border border-slate-800 rounded-xl flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                   <div className="flex items-center gap-2">
                      <AtSign size={16} className={cn(
                        "transition-colors",
                        (contentForPublish.includes('✍️') || contentForPublish.includes('center') || contentForPublish.toLowerCase().includes('signature')) ? "text-green-500" : "text-slate-600"
                      )} />
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('signaturePolicy')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      { (contentForPublish.includes('✍️') || contentForPublish.includes('center') || contentForPublish.toLowerCase().includes('signature')) ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-yellow-600 font-bold uppercase italic">{t('signatureMissing')}.</span>
                          <X size={16} className="text-yellow-600 opacity-50" />
                        </div>
                      )}
                   </div>
                </div>

                {pubLog.type && (
                  <div className={cn(
                    "p-4 rounded-xl text-sm font-medium border animate-in fade-in slide-in-from-top-2",
                    pubLog.type === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" :
                    pubLog.type === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                    "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                  )}>
                    {pubLog.msg}
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex flex-col gap-2">
                <button 
                  onClick={handlePublish}
                  disabled={pubLog.type === 'loading'}
                  className={cn(
                    "w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 border border-cyan-500/20",
                    performanceMode ? "shadow-none" : "shadow-xl shadow-cyan-500/30 active:scale-[0.98]"
                  )}
                >
                  {pubLog.type === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Rocket size={20} className="stroke-[2.5px]" />}
                  {t('publish')}
                </button>
                <button 
                  onClick={addToQueue}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <ListIcon size={18} />
                  {t('addToQueue')}
                </button>
              </div>
            </motion.div>
          </div>
  );
};
