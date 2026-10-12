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
import { COMMON_TAGS, COMMUNITIES } from '../../data/communities';

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
  promptDialog?: (title: string, defaultValue?: string) => Promise<string | null>;
  quickTags: string[];
  setQuickTags: (tags: string[]) => void;
  pinTag: (tag: string) => void;
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
    tagGroups,
    notify,
    promptDialog,
    quickTags,
    setQuickTags,
    pinTag,
    t
  } = props;

  const toLocalDateTimeLocalString = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  };

  const handleApplyPreset = (type: '1h' | '3h' | 'morning' | 'evening') => {
    const d = new Date();
    if (type === '1h') {
      d.setHours(d.getHours() + 1);
    } else if (type === '3h') {
      d.setHours(d.getHours() + 3);
    } else if (type === 'morning') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (type === 'evening') {
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
    }
    setScheduledTime(toLocalDateTimeLocalString(d));
  };

  const [isScheduled, setIsScheduled] = React.useState(false);
  const [scheduledDiff, setScheduledDiff] = React.useState<{ text: string; isPast: boolean } | null>(null);

  React.useEffect(() => {
    if (!scheduledTime) {
      setIsScheduled(false);
      setScheduledDiff(null);
      return;
    }
    const target = new Date(scheduledTime).getTime();
    const nowTime = Date.now();
    setIsScheduled(target > nowTime);

    const diffMs = target - nowTime;
    if (diffMs <= 0) {
      setScheduledDiff({ 
        text: t('scheduleTimeInPast'), 
        isPast: true 
      });
      return;
    }
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(diffHrs / 24);
    const remainingHrs = diffHrs % 24;

    let durationText = '';
    if (days > 0) durationText += `${days} ${t('scheduleDaysShort')} `;
    if (remainingHrs > 0) durationText += `${remainingHrs} ${t('scheduleHoursShort')} `;
    const BCP47_LOCALES: Record<string, string> = { uk: 'uk-UA', es: 'es-ES', ko: 'ko-KR', en: 'en-US' };
    const localeCode = BCP47_LOCALES[lang] || 'en-US';
    setScheduledDiff({
      text: t('scheduledForLabel')
        .replace('{date}', new Date(scheduledTime).toLocaleString(localeCode))
        .replace('{duration}', durationText),
      isPast: false
    });
  }, [scheduledTime, lang, t]);
  const [isEditingQuickTags, setIsEditingQuickTags] = React.useState(false);

  const suggestions = React.useMemo(() => {
    const list: string[] = [];
    const currentTags = (pubTags || "").split(/\s+/).filter(Boolean);
    
    // 1. Get tags from matching community
    const firstTag = currentTags[0];
    if (firstTag) {
      const matchedComm = COMMUNITIES.find(c => c.tags.includes(firstTag));
      if (matchedComm) {
        matchedComm.tags.forEach(t => {
          if (t !== firstTag && !currentTags.includes(t) && !list.includes(t)) {
            list.push(t);
          }
        });
      }
    }
    
    // 2. Get tags from tag groups
    if (tagGroups && tagGroups.length > 0) {
      tagGroups.forEach((group: TagGroup) => {
        group.tags.forEach((t: string) => {
          if (!currentTags.includes(t) && !list.includes(t)) {
            list.push(t);
          }
        });
      });
    }

    // 3. Fallback to common tags if we have very few suggestions
    if (list.length < 4) {
      COMMON_TAGS.forEach(t => {
        if (!currentTags.includes(t) && !list.includes(t) && list.length < 6) {
          list.push(t);
        }
      });
    }

    return list.slice(0, 8);
  }, [pubTags, tagGroups]);

  const handleAddQuickTag = async () => {
    if (!promptDialog) return;
    const tag = await promptDialog(t('promptNewQuickTag'));
    if (!tag) return;
    const cleanTag = tag.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^[^a-z]+/, '').trim();
    if (!cleanTag) {
      notify(t('errTagMustStartWithLetter'), "error");
      return;
    }
    if (quickTags.includes(cleanTag)) {
      notify(t('errTagAlreadyInList'), "error");
      return;
    }
    const updated = [...quickTags, cleanTag];
    setQuickTags(updated);
    localStorage.setItem('steem_quick_tags_v1', JSON.stringify(updated));
    notify(t('tagAddedNotify').replace('{tag}', cleanTag), "success");
  };

  const handleRemoveQuickTag = (tagToRemove: string) => {
    const updated = quickTags.filter(t => t !== tagToRemove);
    setQuickTags(updated);
    localStorage.setItem('steem_quick_tags_v1', JSON.stringify(updated));
  };

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
          {isScheduled ? (
            <button 
              onClick={addToQueue}
              disabled={pubLog.type === 'loading'}
              className="btn-primary w-full py-3.5 text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-500 border-indigo-400"
              style={{ backgroundColor: 'var(--accent-hex)' }}
            >
              <Calendar size={18} className="stroke-[2.5px]" />
              {t('schedulePublishBtn')}
            </button>
          ) : (
            <button 
              onClick={handlePublish}
              disabled={pubLog.type === 'loading'}
              className="btn-primary w-full py-3.5 text-xs sm:text-sm"
            >
              {pubLog.type === 'loading' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <Rocket size={18} className="stroke-[2.5px]" />}
              {t('publish')}
            </button>
          )}
          {!isScheduled && (
            <button 
              onClick={addToQueue}
              className="btn-secondary w-full py-2.5 text-xs"
            >
              <ListIcon size={16} />
              {t('addToQueue')}
            </button>
          )}
        </div>
      }
    >
      {/* Auth Selector */}
      <div className="flex gap-2 p-1 bg-[var(--bg-main)]/80 rounded-xl border border-[var(--border-color)]">
        <button 
          onClick={() => setAuthType('KEYCHAIN')}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            authType === 'KEYCHAIN' ? "bg-[var(--accent-hex)] text-white shadow-sm font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
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
            authType === 'VAULT' ? "bg-[var(--accent-hex)] text-white shadow-sm font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
        >
          <Lock size={16} /> {t('vaultTabLabel')}
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
                      className="btn-primary w-full py-2.5 text-xs font-bold shadow-sm"
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
                        notify(t('keychainDetectedNotify'));
                      });
                    }}
                    className="px-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    title={t('keychainDetectedTitle')}
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
                  {t('keychainNotFoundWarning')}
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
            <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-main)]">{t('removeFirstLine')}</span>
          </label>
        </div>

        {/* Tags input */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="flex gap-2 items-center">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">{t('tags')}</label>
              <span className={cn(
                "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full select-none border transition-colors",
                (pubTags || "").split(/\s+/).filter(Boolean).length > 9 
                  ? "bg-red-500/10 text-red-400 border-red-500/15" 
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/15"
              )}>
                {(pubTags || "").split(/\s+/).filter(Boolean).length}/9
              </span>
            </div>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setActiveModal('tagPresets')}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LayoutGrid size={13} /> {t('communities')}
              </button>
              <button 
                type="button"
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
            onChange={e => {
              let val = e.target.value.toLowerCase().replace(/,/g, ' ');
              val = val.replace(/[^a-z0-9\s-]/g, '');
              val = val.replace(/\s+/g, ' ');
              
              // Ensure each individual tag starts with a lowercase letter (no digits or hyphens at the beginning)
              const words = val.split(' ');
              const sanitizedWords = words.map(word => word.replace(/^[0-9-]+/, ''));
              
              const hasTrailingSpace = e.target.value.endsWith(' ');
              const finalVal = sanitizedWords.join(' ') + (hasTrailingSpace && val.trim() ? ' ' : '');
              setPubTags(finalVal);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = (pubTags || "").trim();
                if (trimmed) {
                  setPubTags(trimmed + ' ');
                }
              }
            }}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
            placeholder={t('tagsPlaceholder')}
          />

          {/* Current Tags Chips */}
          {(() => {
            const tagsList = (pubTags || "").split(/\s+/).filter(Boolean);
            if (tagsList.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-1.5 mt-2 bg-[var(--bg-main)]/30 p-2 rounded-xl border border-[var(--border-color)]/50">
                {tagsList.map((tag, idx) => {
                  const isFirst = idx === 0;
                  const isTooMany = idx >= 9;
                  return (
                    <span 
                      key={`curr-tag-chip-${tag}-${idx}`}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono border select-none transition-colors",
                        isFirst 
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-semibold" 
                          : isTooMany 
                            ? "bg-red-500/10 border-red-500/25 text-red-400" 
                            : "bg-[var(--accent-hex)]/10 border-[var(--accent-hex)]/25 text-[var(--accent-hex)]"
                      )}
                    >
                      <span>#{tag}</span>
                      {isFirst && (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded-sm uppercase tracking-wider scale-90 origin-left">
                          {t('mainTagBadge')}
                        </span>
                      )}
                      <button 
                        type="button"
                        onClick={() => {
                          const updated = tagsList.filter((_, i) => i !== idx);
                          setPubTags(updated.join(' ') + (updated.length > 0 ? ' ' : ''));
                        }}
                        className={cn(
                          "hover:text-[var(--text-main)] transition-colors p-0.5 rounded-full cursor-pointer",
                          isFirst ? "text-emerald-400/70 hover:bg-emerald-500/20" : "text-[var(--accent-hex)]/70 hover:bg-[var(--accent-hex)]/20"
                        )}
                        title={t('removeTagTitle')}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            );
          })()}

          {/* Quick Selection custom tag bar */}
          <div className="space-y-1.5 mt-2.5">
            <div className="flex justify-between items-center select-none">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {t('quickSelectionLabel')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddQuickTag}
                  className="text-[9px] text-cyan-400 hover:text-cyan-300 font-extrabold flex items-center gap-0.5 cursor-pointer bg-cyan-500/5 hover:bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/10"
                >
                  + {t('addTagBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingQuickTags(!isEditingQuickTags)}
                  className={cn(
                    "text-[9px] font-extrabold flex items-center gap-0.5 cursor-pointer px-2 py-0.5 rounded-full border transition-all",
                    isEditingQuickTags 
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/10" 
                      : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-slate-500 hover:text-[var(--text-main)]"
                  )}
                >
                  {isEditingQuickTags ? t('done') : t('editQuickTagsBtn')}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {quickTags.map((tag, idx) => {
                const tagsArray = (pubTags || "").split(/\s+/).filter(Boolean);
                const isSelected = tagsArray.includes(tag);
                return (
                  <div
                    key={`pub-custom-tag-${tag}-${idx}`}
                    className="relative flex items-center shrink-0"
                  >
                    <button 
                      type="button"
                      disabled={isEditingQuickTags}
                      onClick={() => {
                        const currentTags = (pubTags || "").split(/\s+/).filter(Boolean);
                        if (currentTags.includes(tag)) {
                          setPubTags(currentTags.filter(t => t !== tag).join(' ') + ' ');
                        } else {
                          setPubTags([...currentTags, tag].join(' ') + ' ');
                        }
                      }}
                      className={cn(
                        "text-[10px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer flex items-center gap-1 font-mono",
                        isSelected 
                          ? "bg-[var(--accent-hex)] border-[var(--accent-hex)] text-white shadow-xs font-semibold" 
                          : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500 hover:text-[var(--text-main)]"
                      )}
                    >
                      #{tag}
                    </button>
                    {isEditingQuickTags && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuickTag(tag)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-400 text-white rounded-full p-0.5 shadow-sm border border-slate-900 cursor-pointer transition-colors"
                      >
                        <X size={8} />
                      </button>
                    )}
                  </div>
                );
              })}
              {quickTags.length === 0 && (
                <p className="text-[10px] text-[var(--text-muted)] italic py-1">
                  {t('quickAddBarEmpty')}
                </p>
              )}
            </div>
          </div>

          {/* Suggestions tag bar */}
          {suggestions.length > 0 && (
            <div className="space-y-1.5 mt-2.5 pt-2 border-t border-[var(--border-color)]/40">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t('tagSuggestionsLabel')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((tag, idx) => {
                  return (
                    <div
                      key={`pub-suggest-tag-${tag}-${idx}`}
                      className="flex items-center gap-0.5 shrink-0"
                    >
                      <button 
                        type="button"
                        onClick={() => {
                          const currentTags = (pubTags || "").split(/\s+/).filter(Boolean);
                          if (!currentTags.includes(tag)) {
                            setPubTags([...currentTags, tag].join(' ') + ' ');
                          }
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-l-full border-y border-l bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-slate-500 font-mono cursor-pointer h-7 flex items-center"
                      >
                        #{tag}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          pinTag(tag);
                        }}
                        className="px-2 rounded-r-full border-y border-r bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-amber-400 cursor-pointer flex items-center justify-center text-[10px] font-bold h-7"
                        title={t('pinTagQuickSelect')}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Validation warning */}
          {(pubTags || "").split(/\s+/).filter(Boolean).length > 9 && (
            <p className="text-[10px] font-semibold text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10 mt-2 flex items-center gap-1.5 select-none leading-relaxed">
              <Info size={12} className="shrink-0" />
              {t('errMaxTagsWarning').replace('{count}', String((pubTags || "").split(/\s+/).filter(Boolean).length))}
            </p>
          )}
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
                  rewardType === type ? "bg-[var(--accent-hex)] border-[var(--accent-hex)] text-white shadow-sm font-bold" : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-slate-500 hover:text-[var(--text-main)]"
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
                <div className="p-3.5 bg-[var(--bg-main)]/50 rounded-xl border border-[var(--border-color)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-cyan-400" />
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('schedule')}</span>
                    </div>
                    {scheduledTime && (
                      <button
                        type="button"
                        onClick={() => setScheduledTime('')}
                        className="text-[10px] font-extrabold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer bg-red-500/5 hover:bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/10"
                        title={t('clearScheduleTitle')}
                      >
                        <X size={10} /> {t('uiScaleResetBtn')}
                      </button>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <input 
                      type="datetime-local" 
                      value={scheduledTime || ""}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-[var(--text-main)] font-mono transition-all pr-8"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  {/* Preset buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('1h')}
                      className="py-1 px-2 text-[10px] font-bold text-[var(--text-muted)] hover:text-cyan-400 bg-[var(--bg-card)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-lg transition-all text-center truncate cursor-pointer"
                    >
                      {t('preset1h')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('3h')}
                      className="py-1 px-2 text-[10px] font-bold text-[var(--text-muted)] hover:text-cyan-400 bg-[var(--bg-card)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-lg transition-all text-center truncate cursor-pointer"
                    >
                      {t('preset3h')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('morning')}
                      className="py-1 px-1.5 text-[9px] font-bold text-[var(--text-muted)] hover:text-cyan-400 bg-[var(--bg-card)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-lg transition-all text-center truncate cursor-pointer"
                      title={t('presetTomorrowMorningTitle')}
                    >
                      {t('presetTomorrowMorning')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('evening')}
                      className="py-1 px-1.5 text-[9px] font-bold text-[var(--text-muted)] hover:text-cyan-400 bg-[var(--bg-card)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-lg transition-all text-center truncate cursor-pointer"
                      title={t('presetTomorrowEveningTitle')}
                    >
                      {t('presetTomorrowEvening')}
                    </button>
                  </div>

                  {/* Informational Timer badge */}
                  {scheduledTime && scheduledDiff && (
                    <div className={cn(
                      "p-2.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1.5 transition-all leading-normal",
                      scheduledDiff.isPast 
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                        : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                    )}>
                      <Info size={12} className="shrink-0" />
                      <span>{scheduledDiff.text}</span>
                    </div>
                  )}
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
                          placeholder={t('username')}
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
                        className="btn-primary p-2 rounded-lg shrink-0"
                        title={t('add')}
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
                          {t('editMentionsListBtn')}
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
