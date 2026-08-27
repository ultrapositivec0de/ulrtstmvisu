import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { COMMUNITIES, COMMON_TAGS } from '../../data/communities';

import { UnlockPinModal } from './UnlockPinModal';
import { KeysModal } from './KeysModal';
import { PublishModal } from './PublishModal';
import { TemplatesModal } from './TemplatesModal';
import { TagPresetsModal } from './TagPresetsModal';
import { SplitPostModal } from './SplitPostModal';
import { DraftsModal } from './DraftsModal';
import { MentionsModal } from './MentionsModal';
import { QuickStyleMenu } from './QuickStyleMenu';
import { AboutModal } from './AboutModal';
import { TagGroupsModal } from './TagGroupsModal';
import { QueueModal } from './QueueModal';
import { TableImportModal } from './TableImportModal';
import { SettingsModal } from './SettingsModal';
import { PwaInstructionsModal } from './PwaInstructionsModal';

export interface AppModalsProps {
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  // UnlockPinModal & KeysModal
  vaultPin: string;
  setVaultPin: (pin: string) => void;
  initVault: (pin?: string) => any;
  username: string;
  setUsername: (u: string) => void;
  isVaultInitialized: boolean;
  isUnlocked: boolean;
  vaultAccounts: any[];
  pexelsApiKey: string | null;
  setPexelsApiKey: (k: string | null) => void;
  pixabayApiKey: string | null;
  setPixabayApiKey: (k: string | null) => void;
  unsplashAccessKey: string | null;
  setUnsplashAccessKey: (k: string | null) => void;
  performanceMode: boolean;
  setPerformanceMode: (p: boolean) => void;
  notify: (msg: string, type?: any) => void;
  confirmDialog: (opts: any) => Promise<boolean>;
  promptDialog: (opts: any) => Promise<string | null>;

  // PublishModal
  lang: string;
  authType: any;
  setAuthType: (a: any) => void;
  selectedVaultUser: string;
  setSelectedVaultUser: (u: string) => void;
  pubTitle: string;
  setPubTitle: (t: string) => void;
  pubTags: string;
  setPubTags: any;
  rewardType: any;
  setRewardType: (r: any) => void;
  removeTitleLine: boolean;
  setRemoveTitleLine: (r: boolean) => void;
  beneficiaries: any[];
  setBeneficiaries: (b: any[]) => void;
  benName: any;
  setBenName: (n: any) => void;
  benWeight: any;
  setBenWeight: (w: any) => void;
  showAdvancedPublish: boolean;
  setShowAdvancedPublish: (s: boolean) => void;
  scheduledTime: string;
  setScheduledTime: (t: string) => void;
  contentForPublish: string;
  mentions: any[];
  extractMentions: (text: string) => string[];
  addToQueue: () => void;
  pubLog: { msg: string; type: any };
  setPubLog: (log: { msg: string; type: any }) => void;
  handlePublish: () => void;
  tagGroups: any[];

  // TemplatesModal & TagPresetsModal & SplitPostModal
  templates: any[];
  setTemplates: (t: any) => void;
  setContent: (c: string) => void;
  insertAtCursor: (text: string, selectionMode?: 'end' | 'select') => void;
  toggleTag: (tag: string) => void;
  splitWords: number;
  setSplitWords: (w: number) => void;
  stats: { words?: number };
  handleSplitPost: () => void;

  // DraftsModal
  currentDraftId: string | null;
  setCurrentDraftId: (id: string | null) => void;
  editorMode: string;
  wysiwygRef: React.RefObject<any>;
  isSyncingRef: React.MutableRefObject<boolean>;
  getMarked: () => any;
  exportBackup: () => void;
  importBackup: (e: any) => void;
  drafts: any[];
  deleteDraft: (id: string) => void;
  toggleDraftStatus: (id: string) => void;

  // MentionsModal
  setMentions: (m: any) => void;
  newMention: string;
  setNewMention: (n: string) => void;
  addMention: () => void;

  // QuickStyleMenu
  isSMenuOpen: boolean;
  setIsSMenuOpen: (open: boolean) => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  activeAssortment: any[];
  editorFont: string;
  setEditorFont: (font: string) => void;
  fontOptions: any[];
  beautifyEnabled: boolean;
  setBeautifyEnabled: (b: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  visualStyle: any;
  setVisualStyle: any;
  isPwaInstalled: boolean;
  isTauriEnv: () => boolean;
  isNeutralinoEnv: () => boolean;
  handleInstallPwa: () => void;
  setSettingsTab: (tab: any) => void;

  // AboutModal
  appAgent: string;
  setAppAgent: (agent: string) => void;
  appChangelog: any[];
  getChangelogText: () => string;

  // TagGroupsModal & QueueModal & TableImportModal
  setTagGroups: (tg: any) => void;
  queue: any[];
  setQueue: (q: any) => void;
  publishFromQueue: (item: any) => void;
  tableImportText: string;
  setTableImportText: (t: string) => void;
  tableImportFormat: any;
  setTableImportFormat: (f: any) => void;
  processTableImport: () => void;

  // SettingsModal
  settingsTab: any;
  setLang: (l: string) => void;
  neonTextColored: boolean;
  setNeonTextColored: (n: boolean) => void;
  editorFontSize: number;
  setEditorFontSize: (s: number) => void;
  toolbarIconSize: number;
  setToolbarIconSize: (s: number) => void;
  wysiwygSpacing: number;
  setWysiwygSpacing: (s: number) => void;
  widgetPos: 'bottom' | 'floating' | 'hidden';
  setWidgetPos: (pos: 'bottom' | 'floating' | 'hidden') => void;
  isTrafficOptimized: boolean;
  setIsTrafficOptimized: (opt: boolean) => void;
  syncScrollEnabled: boolean;
  setSyncScrollEnabled: (s: boolean) => void;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (s: boolean) => void;
  imageInsertFormat: any;
  setImageInsertFormat: (f: any) => void;
  pexelsSettings: any;
  setPexelsSettings: (s: any) => void;
  images: any[];
  handleClearCache: () => void;

  // PWA Banner & Modal
  showPwaBanner: boolean;
  setShowPwaBanner: (show: boolean) => void;
  isEditorFullScreen: boolean;
  isFullScreen: boolean;
  showPwaInstructionsModal: boolean;
  setShowPwaInstructionsModal: (show: boolean) => void;
  deferredPrompt: any;

  t: (key: any) => string;
}

export const AppModals: React.FC<AppModalsProps> = (props) => {
  const {
    activeModal,
    setActiveModal,
    vaultPin,
    setVaultPin,
    initVault,
    username,
    setUsername,
    isVaultInitialized,
    isUnlocked,
    vaultAccounts,
    pexelsApiKey,
    setPexelsApiKey,
    pixabayApiKey,
    setPixabayApiKey,
    unsplashAccessKey,
    setUnsplashAccessKey,
    performanceMode,
    setPerformanceMode,
    notify,
    confirmDialog,
    promptDialog,
    lang,
    authType,
    setAuthType,
    selectedVaultUser,
    setSelectedVaultUser,
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
    addToQueue,
    pubLog,
    setPubLog,
    handlePublish,
    tagGroups,
    templates,
    setTemplates,
    setContent,
    insertAtCursor,
    toggleTag,
    splitWords,
    setSplitWords,
    stats,
    handleSplitPost,
    currentDraftId,
    setCurrentDraftId,
    editorMode,
    wysiwygRef,
    isSyncingRef,
    getMarked,
    exportBackup,
    importBackup,
    drafts,
    deleteDraft,
    toggleDraftStatus,
    setMentions,
    newMention,
    setNewMention,
    addMention,
    isSMenuOpen,
    setIsSMenuOpen,
    themeColor,
    setThemeColor,
    activeAssortment,
    editorFont,
    setEditorFont,
    fontOptions,
    beautifyEnabled,
    setBeautifyEnabled,
    isDarkMode,
    setIsDarkMode,
    visualStyle,
    setVisualStyle,
    isPwaInstalled,
    isTauriEnv,
    isNeutralinoEnv,
    handleInstallPwa,
    setSettingsTab,
    appAgent,
    setAppAgent,
    appChangelog,
    getChangelogText,
    setTagGroups,
    queue,
    setQueue,
    publishFromQueue,
    tableImportText,
    setTableImportText,
    tableImportFormat,
    setTableImportFormat,
    processTableImport,
    settingsTab,
    setLang,
    neonTextColored,
    setNeonTextColored,
    editorFontSize,
    setEditorFontSize,
    toolbarIconSize,
    setToolbarIconSize,
    wysiwygSpacing,
    setWysiwygSpacing,
    widgetPos,
    setWidgetPos,
    isTrafficOptimized,
    setIsTrafficOptimized,
    syncScrollEnabled,
    setSyncScrollEnabled,
    showAdvancedSettings,
    setShowAdvancedSettings,
    imageInsertFormat,
    setImageInsertFormat,
    pexelsSettings,
    setPexelsSettings,
    images,
    handleClearCache,
    showPwaBanner,
    setShowPwaBanner,
    isEditorFullScreen,
    isFullScreen,
    showPwaInstructionsModal,
    setShowPwaInstructionsModal,
    deferredPrompt,
    t
  } = props;

  return (
    <>
{/* Modals */}
      <AnimatePresence>
        <UnlockPinModal
          isOpen={activeModal === 'unlock-pin'}
          onClose={() => setActiveModal(null)}
          vaultPin={vaultPin}
          setVaultPin={setVaultPin}
          initVault={initVault}
          notify={notify}
          t={t}
        />

        <KeysModal
          isOpen={activeModal === 'keys'}
          onClose={() => setActiveModal(null)}
          username={username}
          setUsername={setUsername}
          isVaultInitialized={isVaultInitialized}
          isUnlocked={isUnlocked}
          vaultAccounts={vaultAccounts}
          vaultPin={vaultPin}
          setVaultPin={setVaultPin}
          initVault={initVault}
          pexelsApiKey={pexelsApiKey}
          setPexelsApiKey={setPexelsApiKey}
          pixabayApiKey={pixabayApiKey}
          setPixabayApiKey={setPixabayApiKey}
          unsplashAccessKey={unsplashAccessKey}
          setUnsplashAccessKey={setUnsplashAccessKey}
          performanceMode={performanceMode}
          setPerformanceMode={setPerformanceMode}
          notify={notify}
          confirmDialog={confirmDialog}
          promptDialog={promptDialog}
          t={t}
        />

        <PublishModal
          isOpen={activeModal === 'publish'}
          onClose={() => setActiveModal(null)}
          lang={lang}
          authType={authType}
          setAuthType={setAuthType}
          username={username}
          setUsername={setUsername}
          isVaultInitialized={isVaultInitialized}
          isUnlocked={isUnlocked}
          vaultAccounts={vaultAccounts}
          selectedVaultUser={selectedVaultUser}
          setSelectedVaultUser={setSelectedVaultUser}
          vaultPin={vaultPin}
          setVaultPin={setVaultPin}
          initVault={initVault}
          pubTitle={pubTitle}
          setPubTitle={setPubTitle}
          pubTags={pubTags}
          setPubTags={setPubTags}
          rewardType={rewardType}
          setRewardType={setRewardType}
          removeTitleLine={removeTitleLine}
          setRemoveTitleLine={setRemoveTitleLine}
          beneficiaries={beneficiaries}
          setBeneficiaries={setBeneficiaries}
          benName={benName}
          setBenName={setBenName}
          benWeight={benWeight}
          setBenWeight={setBenWeight}
          showAdvancedPublish={showAdvancedPublish}
          setShowAdvancedPublish={setShowAdvancedPublish}
          scheduledTime={scheduledTime}
          setScheduledTime={setScheduledTime}
          contentForPublish={contentForPublish}
          mentions={mentions}
          extractMentions={extractMentions}
          performanceMode={performanceMode}
          addToQueue={addToQueue}
          pubLog={pubLog}
          setPubLog={setPubLog}
          handlePublish={handlePublish}
          setActiveModal={setActiveModal}
          tagGroups={tagGroups}
          notify={notify}
          t={t}
        />

        <TemplatesModal
          isOpen={activeModal === 'templates'}
          onClose={() => setActiveModal(null)}
          templates={templates}
          setTemplates={setTemplates}
          pubTags={pubTags}
          setPubTags={setPubTags}
          pubTitle={pubTitle}
          setPubTitle={setPubTitle}
          setContent={setContent}
          insertAtCursor={insertAtCursor}
          notify={notify}
          confirmDialog={confirmDialog}
          performanceMode={performanceMode}
          storageKey="steem_templates_v2"
          t={t}
        />

        <TagPresetsModal
          isOpen={activeModal === 'tagPresets'}
          onClose={() => setActiveModal(null)}
          pubTags={pubTags}
          setPubTags={setPubTags}
          toggleTag={toggleTag}
          communities={COMMUNITIES}
          commonTags={COMMON_TAGS}
          t={t}
        />

        <SplitPostModal
          isOpen={activeModal === 'splitPost'}
          onClose={() => setActiveModal(null)}
          splitWords={splitWords}
          setSplitWords={setSplitWords}
          wordsCount={stats?.words || 0}
          handleSplitPost={handleSplitPost}
          t={t}
        />

        <DraftsModal
          isOpen={activeModal === 'drafts'}
          onClose={() => setActiveModal(null)}
          setContent={setContent}
          setPubTitle={setPubTitle}
          setPubTags={setPubTags}
          currentDraftId={currentDraftId}
          setCurrentDraftId={setCurrentDraftId}
          editorMode={editorMode}
          wysiwygRef={wysiwygRef}
          isSyncingRef={isSyncingRef}
          getMarked={getMarked}
          exportBackup={exportBackup}
          importBackup={importBackup}
          confirmDialog={confirmDialog}
          notify={notify}
          setActiveModal={setActiveModal}
          t={t}
          drafts={drafts}
          deleteDraft={deleteDraft}
          toggleDraftStatus={toggleDraftStatus}
        />

        <MentionsModal
          isOpen={activeModal === 'mentions'}
          onClose={() => setActiveModal(null)}
          mentions={mentions}
          setMentions={setMentions}
          newMention={newMention}
          setNewMention={setNewMention}
          addMention={addMention}
          insertAtCursor={insertAtCursor}
          confirmDialog={confirmDialog}
          storageKey="steem_mentions_v2"
          t={t}
        />

        <QuickStyleMenu
          isOpen={isSMenuOpen}
          onClose={() => setIsSMenuOpen(false)}
          themeColor={themeColor}
          setThemeColor={setThemeColor}
          themes={activeAssortment}
          editorFont={editorFont}
          setEditorFont={setEditorFont}
          fontOptions={fontOptions}
          beautifyEnabled={beautifyEnabled}
          setBeautifyEnabled={setBeautifyEnabled}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          visualStyle={visualStyle}
          setVisualStyle={setVisualStyle}
          isPwaInstalled={isPwaInstalled}
          isTauriEnv={isTauriEnv}
          isNeutralinoEnv={isNeutralinoEnv}
          handleInstallPwa={handleInstallPwa}
          setSettingsTab={setSettingsTab}
          setActiveModal={setActiveModal}
          t={t}
        />

        <AboutModal
          isOpen={activeModal === 'about'}
          onClose={() => setActiveModal(null)}
          appAgent={appAgent}
          setAppAgent={setAppAgent}
          changelog={appChangelog}
          getChangelogText={getChangelogText}
          t={t}
        />

        <TagGroupsModal
          isOpen={activeModal === 'tagGroups'}
          onClose={() => setActiveModal(null)}
          tagGroups={tagGroups}
          setTagGroups={setTagGroups}
          pubTags={pubTags}
          setPubTags={setPubTags}
          promptDialog={promptDialog}
          confirmDialog={confirmDialog}
          t={t}
        />

        <QueueModal
          isOpen={activeModal === 'queue'}
          onClose={() => setActiveModal(null)}
          queue={queue}
          setQueue={setQueue}
          publishFromQueue={publishFromQueue}
          confirmDialog={confirmDialog}
          storageKey="steem_queue_v2"
          t={t}
        />

        <TableImportModal
          isOpen={activeModal === 'tableImport'}
          onClose={() => setActiveModal(null)}
          tableImportText={tableImportText}
          setTableImportText={setTableImportText}
          tableImportFormat={tableImportFormat}
          setTableImportFormat={setTableImportFormat}
          processTableImport={processTableImport}
          t={t}
        />

        <SettingsModal
          isOpen={activeModal === 'settings'}
          onClose={() => setActiveModal(null)}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          lang={lang}
          setLang={setLang}
          themeColor={themeColor}
          setThemeColor={setThemeColor}
          visualStyle={visualStyle}
          setVisualStyle={setVisualStyle}
          isDarkMode={isDarkMode}
          neonTextColored={neonTextColored}
          setNeonTextColored={setNeonTextColored}
          editorFont={editorFont}
          setEditorFont={setEditorFont}
          editorFontSize={editorFontSize}
          setEditorFontSize={setEditorFontSize}
          toolbarIconSize={toolbarIconSize}
          setToolbarIconSize={setToolbarIconSize}
          wysiwygSpacing={wysiwygSpacing}
          setWysiwygSpacing={setWysiwygSpacing}
          widgetPos={widgetPos}
          setWidgetPos={setWidgetPos}
          isTrafficOptimized={isTrafficOptimized}
          setIsTrafficOptimized={setIsTrafficOptimized}
          syncScrollEnabled={syncScrollEnabled}
          setSyncScrollEnabled={setSyncScrollEnabled}
          performanceMode={performanceMode}
          setPerformanceMode={setPerformanceMode}
          showAdvancedSettings={showAdvancedSettings}
          setShowAdvancedSettings={setShowAdvancedSettings}
          appAgent={appAgent}
          setAppAgent={setAppAgent}
          imageInsertFormat={imageInsertFormat}
          setImageInsertFormat={setImageInsertFormat}
          unsplashAccessKey={unsplashAccessKey}
          setUnsplashAccessKey={setUnsplashAccessKey}
          pixabayApiKey={pixabayApiKey}
          setPixabayApiKey={setPixabayApiKey}
          pexelsApiKey={pexelsApiKey}
          setPexelsApiKey={setPexelsApiKey}
          pexelsSettings={pexelsSettings}
          setPexelsSettings={setPexelsSettings}
          images={images}
          templates={templates}
          handleClearCache={handleClearCache}
          isUnlocked={isUnlocked}
          vaultAccounts={vaultAccounts}
          initVault={initVault}
          setActiveModal={setActiveModal}
          isPwaInstalled={isPwaInstalled}
          handleInstallPwa={handleInstallPwa}
          setShowPwaInstructionsModal={setShowPwaInstructionsModal}
          notify={notify}
          confirmDialog={confirmDialog}
          promptDialog={promptDialog}
          t={t}
        />
      </AnimatePresence>

      <AnimatePresence>
        {pubLog.msg && !activeModal && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-8 lg:top-8 lg:bottom-auto lg:w-80 z-[100]"
            >
              <div className={cn(
                "p-4 rounded-2xl shadow-none border flex items-center gap-3 bg-slate-900",
                pubLog.type === 'success' ? "border-green-500/30 text-green-400" :
                pubLog.type === 'error' ? "border-red-500/30 text-red-400" :
                "border-cyan-500/30 text-cyan-400"
              )}>
                {pubLog.type === 'loading' && <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shrink-0" />}
                <p className="text-sm font-medium">{pubLog.msg}</p>
                <button onClick={() => setPubLog({ msg: '', type: null })} className="ml-auto text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Floating PWA Promotion Banner */}
      <AnimatePresence>
        {showPwaBanner && !isPwaInstalled && !isTauriEnv() && !isNeutralinoEnv() && !isEditorFullScreen && !isFullScreen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-[calc(5rem)] lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 z-[65] max-w-sm"
          >
            <div className="p-4 bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md shadow-cyan-500/20">
                  S
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white leading-tight">{t('pwaBannerTitle') || "Встановити Steem Editor"}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{t('pwaBannerDesc') || "Швидкий запуск з робочого столу та підтримка офлайн"}</p>
                </div>
                <button
                  onClick={() => {
                    setShowPwaBanner(false);
                    try { localStorage.setItem('steem_pwa_banner_dismissed', 'true'); } catch { /* ignore storage error */ }
                  }}
                  className="text-slate-500 hover:text-slate-300 p-1 -mr-1 -mt-1 transition-colors"
                  title={t('pwaBannerDismiss') || "Закрити"}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleInstallPwa}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  {t('pwaBannerInstall') || "Встановити"}
                </button>
                <button
                  onClick={() => {
                    setShowPwaBanner(false);
                    try { localStorage.setItem('steem_pwa_banner_dismissed', 'true'); } catch { /* ignore storage error */ }
                  }}
                  className="py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  {t('pwaBannerDismiss') || "Пізніше"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Step-by-Step Installation Instructions Modal */}
      <PwaInstructionsModal
        isOpen={showPwaInstructionsModal}
        onClose={() => setShowPwaInstructionsModal(false)}
        deferredPrompt={deferredPrompt}
        handleInstallPwa={handleInstallPwa}
        t={t}
      />
    </>
  );
};
