import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Rocket,
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
  List as ListIcon,
  X
} from 'lucide-react';
import { BaseModal } from './BaseModal';
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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={Rocket}
      title={t('publishToSteem')}
      modalKey="modal-publish"
      bodyClassName="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar flex-1"
      footer={
        <div className="p-4 sm:p-5 bg-[var(--bg-main)]/40 border-t border-[var(--border-color)] flex flex-col gap-2">
          <button 
            onClick={handlePublish}
            disabled={pubLog.type === 'loading'}
            className={cn(
              "w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 border border-cyan-500/20 cursor-pointer text-xs sm:text-sm",
              performanceMode ? "shadow-none" : "shadow-md shadow-cyan-900/30 active:scale-[0.98]"
            )}
          >
            {pubLog.type === 'loading' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <Rocket size={18} className="stroke-[2.5px]" />}
            {t('publish')}
          </button>
          <button 
            onClick={addToQueue}
            className="w-full py-2.5 bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-[var(--border-color)] cursor-pointer text-xs"
          >
            <ListIcon size={16} />
            {t('addToQueue')}
          </button>
        </div>
      }
    >
      {/* Auth Selector */}
      <div className="flex gap-2 p-1 bg-[var(--bg-main)]/80 rounded-xl border border-[var(--border-color)]">
        <button 
          onClick={() => setAuthType('KEYCHAIN')}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            authType === 'KEYCHAIN' ? "bg-cyan-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
        >
          <ShieldCheck size={16} /> Keychain
          {typeof window !== 'undefined' && !(window as any).steem_keychain && (
            <span className="text-[9px] font-normal opacity-60">({t('absent')})</span>
          )}
        </button>
        <button 
          onClick={() => setAuthType('VAULT')}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            authType === 'VAULT' ? "bg-cyan-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
        >
          <Lock size={16} /> Vault (Ключ)
        </button>
      </div>

      <div className="space-y-3">
        {authType === 'VAULT' && (
          <div className="space-y-3 p-4 bg-[var(--bg-main)]/50 rounded-xl border border-[var(--border-color)]">
            {!isVaultInitialized ? (
              <div className="space-y-3 text-center py-2">
                <p className="text-xs text-[var(--text-muted)]">{t('vaultNotConfigured')}</p>
                <button 
                  onClick={() => setActiveModal('keys')}
                  className="text-xs font-bold text-cyan-400 hover:underline cursor-pointer"
                >
                  {t('setupVaultBtn')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={cn(
                    "text-xs flex items-center gap-1.5 font-bold",
                    isUnlocked ? "text-green-400" : "text-amber-400"
                  )}>
                    <ShieldCheck size={16}/> {isUnlocked ? t('vaultUnlocked') : t('vaultLocked')}
                  </span>
                  {isUnlocked && (
                    <button 
                      onClick={() => { SecurityService.lock(); setVaultPin(''); }}
                      className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      {t('lock')}
                    </button>
                  )}
                </div>
                {!isUnlocked && (
                  <div className="space-y-2">
                    <input 
                      type="password" 
                      value={vaultPin}
                      onChange={e => setVaultPin(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-[var(--text-main)]"
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
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
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
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs text-[var(--text-main)] outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option key="pub-select-placeholder" value="" className="bg-[var(--bg-card)] text-[var(--text-muted)]">{t('selectAccount')}</option>
                      {vaultAccounts.filter(Boolean).map((acc, idx) => (
                        <option key={`pub-vault-acc-${acc}-${idx}`} value={acc} className="bg-[var(--bg-card)] text-[var(--text-main)] py-1">@{acc}</option>
                      ))}
                    </select>
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-[11px] text-green-400 flex items-start gap-2">
                      <ShieldCheck size={18} className="shrink-0 mt-0.5" />
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
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">{t('username')}</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={username || ""}
                  onChange={e => setUsername(e.target.value)}
                  className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  placeholder={t('username')}
                />
                {(window as any).steem_keychain && !username && (
                   <button 
                    onClick={() => {
                      (window as any).steem_keychain.requestHandshake(() => {
                        notify("Keychain detected. Enter your username.");
                      });
                    }}
                    className="px-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Keychain Detected"
                  >
                    <ShieldCheck size={18} />
                  </button>
                )}
              </div>
            </div>
            
            {!(window as any).steem_keychain && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 flex items-start gap-2.5">
                <Info size={16} className="shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {lang === 'uk' 
                    ? 'Steem Keychain не знайдено. Рекомендуємо знайти його у магазинах розширень для браузерів ПК, а для мобільних — у відповідних маркетах застосунків.' 
                    : 'Steem Keychain not found. We recommend searching for it in browser extension stores for PC, and in app markets for mobile devices.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Title input */}
        <div>
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1 block">{t('title')}</label>
          <input 
            type="text" 
            value={pubTitle || ""}
            onChange={e => setPubTitle(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
            placeholder={t('title')}
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input type="checkbox" checked={removeTitleLine} onChange={(e) => { setRemoveTitleLine(e.target.checked); localStorage.setItem('steem_remove_title_line', e.target.checked.toString()); }} className="sr-only" />
              <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", removeTitleLine ? "bg-cyan-500 border-cyan-500" : "border-[var(--border-color)] group-hover:border-slate-500")}>
                {removeTitleLine && <Check size={12} className="text-white" />}
              </div>
            </div>
            <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-main)]">{t('removeFirstLine') || 'Remove 1st line from post body'}</span>
          </label>
        </div>

        {/* Tags input */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">{t('tags')}</label>
            <div className="flex gap-3">
              <button 
                onClick={() => setActiveModal('tagPresets')}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LayoutGrid size={13} /> {t('communities')}
              </button>
              <button 
                onClick={() => setActiveModal('tagGroups')}
                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold transition-colors cursor-pointer"
              >
                + {t('tagGroups')}
              </button>
            </div>
          </div>
          <input 
            type="text" 
            value={pubTags || ""}
            onChange={e => setPubTags(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
            placeholder={t('tagsPlaceholder')}
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {COMMON_TAGS.slice(0, 8).filter(Boolean).map((tag, idx) => (
              <button 
                key={`pub-common-tag-${tag}-${idx}`}
                onClick={() => {
                  const existing = pubTags.split(' ').filter((tItem: string) => tItem.trim());
                  if (!existing.includes(tag)) {
                    setPubTags([...existing, tag].join(' '));
                  }
                }}
                className={cn(
                  "text-[10px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
                  pubTags.includes(tag) 
                    ? "bg-cyan-600 border-cyan-500 text-white" 
                    : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500 hover:text-[var(--text-main)]"
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Reward Type */}
        <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{t('rewardType')}</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['50', 'SP', '0'] as const).map((type, idx) => (
              <button 
                key={`pub-reward-type-${type}-${idx}`}
                onClick={() => {
                  setRewardType(type);
                  localStorage.setItem('steem_reward_type', type);
                }}
                className={cn(
                  "text-[10px] py-2 rounded-xl border transition-all font-bold uppercase cursor-pointer",
                  rewardType === type ? "bg-cyan-600 border-cyan-500 text-white shadow-sm" : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500 hover:text-[var(--text-main)]"
                )}
              >
                {t(`rewards${type}` as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Accordion: Beneficiaries & Schedule */}
        <div className="pt-2 border-t border-[var(--border-color)] space-y-3">
          <button 
            onClick={() => setShowAdvancedPublish(!showAdvancedPublish)}
            className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-cyan-400 transition-colors cursor-pointer"
          >
            {showAdvancedPublish ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
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
                <div className="flex items-center justify-between p-3 bg-[var(--bg-main)]/50 rounded-xl border border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-cyan-400" />
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{t('schedule')}</span>
                  </div>
                  <input 
                    type="datetime-local" 
                    value={scheduledTime || ""}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-cyan-500 text-[var(--text-main)]"
                  />
                </div>

                {/* Beneficiaries Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-[var(--bg-main)]/60 p-3 rounded-xl border border-[var(--border-color)]">
                    <div className="flex gap-2 flex-1 items-end">
                      <div className="space-y-1 flex-1">
                        <label className="text-[8px] font-bold text-[var(--text-muted)] uppercase px-1">{t('username')}</label>
                        <input 
                          type="text" 
                          value={benName || ""}
                          onChange={e => setBenName(e.target.value.toLowerCase().replace('@', ''))}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-[var(--text-main)]"
                          placeholder="nickname"
                        />
                      </div>
                      <div className="space-y-1 w-16">
                        <label className="text-[8px] font-bold text-[var(--text-muted)] uppercase px-1">%</label>
                        <input 
                          type="number" 
                          value={benWeight || "5"}
                          onChange={e => setBenWeight(e.target.value)}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-center text-[var(--text-main)]"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (!benName) return;
                          const weight = parseFloat(String(benWeight));
                          if (isNaN(weight)) return;
                          setBeneficiaries([...beneficiaries, { account: benName.trim(), weight }]);
                          setBenName('');
                        }}
                        className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                        title={t('add') || "Додати"}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Mentions quick-picker */}
                  {mentions.length > 0 && (
                    <div className="p-3 bg-[var(--bg-main)]/40 rounded-xl border border-[var(--border-color)]">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('mentions')}</label>
                        <button onClick={() => setActiveModal('mentions')} className="text-[9px] text-cyan-400 hover:underline uppercase font-bold cursor-pointer">
                          Редагувати список
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mentions.filter(Boolean).map((m, idx) => (
                          <button
                            key={m || `mention-${idx}`}
                            onClick={() => {
                              if (beneficiaries.some(b => b.account === m)) return;
                              setBeneficiaries([...beneficiaries, { account: m, weight: 5 }]);
                            }}
                            disabled={beneficiaries.some(b => b.account === m)}
                            className={cn(
                              "text-[10px] px-2.5 py-1 rounded-full border transition-all font-medium cursor-pointer",
                              beneficiaries.some(b => b.account === m)
                                ? "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed opacity-50"
                                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                            )}
                          >
                            @{m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mentions from text */}
                  {extractMentions(contentForPublish).filter(m => Boolean(m && !mentions.includes(m))).length > 0 && (
                    <div className="px-1">
                      <span className="text-[8px] text-[var(--text-muted)] uppercase font-bold mb-1 block opacity-70">{t('fromMentions')}:</span>
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
                              "text-[9px] px-2 py-0.5 rounded border transition-all cursor-pointer",
                              beneficiaries.some(b => b.account === m)
                                ? "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] opacity-50"
                                : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-cyan-400 hover:border-cyan-500/40"
                            )}
                          >
                            @{m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Beneficiary list */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[8px] font-bold text-[var(--text-muted)] uppercase px-1">{t('beneficiaries')}</label>
                    {beneficiaries.map((b, idx) => (
                      <div key={b.account ? `ben-${b.account}` : `ben-idx-${idx}`} className="flex items-center justify-between bg-[var(--bg-main)]/60 p-2.5 rounded-xl border border-[var(--border-color)] text-xs hover:border-cyan-500/30 transition-colors">
                        <span className="text-[var(--text-main)] font-bold tracking-tight">@{b.account}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                            <input 
                              type="number"
                              className="w-10 bg-transparent text-center outline-none text-cyan-400 font-mono text-xs font-bold"
                              value={b.weight}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (isNaN(val)) return;
                                setBeneficiaries(beneficiaries.map((ben, i) => i === idx ? { ...ben, weight: val } : ben));
                              }}
                            />
                            <span className="text-[var(--text-muted)] text-[10px] font-bold">%</span>
                          </div>
                          <button 
                            onClick={() => setBeneficiaries(beneficiaries.filter((_, i) => i !== idx))}
                            className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1 cursor-pointer"
                            title={t('delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {beneficiaries.length === 0 && (
                      <div className="text-center py-3 bg-[var(--bg-main)]/30 rounded-xl border border-dashed border-[var(--border-color)] text-xs text-[var(--text-muted)] italic">
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

      {/* Signature Check */}
      <div className="px-4 py-2.5 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-xl flex items-center justify-between">
         <div className="flex items-center gap-2">
            <AtSign size={15} className={cn(
              "transition-colors",
              (contentForPublish.includes('✍️') || contentForPublish.includes('center') || contentForPublish.toLowerCase().includes('signature')) ? "text-green-500" : "text-[var(--text-muted)]"
            )} />
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{t('signaturePolicy')}</span>
         </div>
         <div className="flex items-center gap-1.5">
            { (contentForPublish.includes('✍️') || contentForPublish.includes('center') || contentForPublish.toLowerCase().includes('signature')) ? (
              <CheckCircle size={15} className="text-green-500" />
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-amber-400 font-bold uppercase italic">{t('signatureMissing')}.</span>
                <X size={15} className="text-amber-400 opacity-60" />
              </div>
            )}
         </div>
      </div>

      {pubLog.msg && (
        <div className={cn(
          "p-3.5 rounded-xl text-xs sm:text-sm font-medium border animate-in fade-in slide-in-from-top-2",
          pubLog.type === 'success' ? "bg-green-500/10 border-green-500/30 text-green-400" :
          pubLog.type === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" :
          "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
        )}>
          {pubLog.msg}
        </div>
      )}
    </BaseModal>
  );
};
