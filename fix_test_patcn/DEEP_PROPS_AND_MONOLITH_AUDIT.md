# ГЛИБОКИЙ АНАЛІЗ КОДОВОЇ БАЗИ ТА ПРОП-ДРІЛІНГУ
**Дата аналізу:** 2026-11-08T23:22:16.221Z  
**Об'єкт аналізу:** `src/App.tsx` (1742 рядків) та суміжні модулі  
**Мета:** Виявлення залишків проп-дрілінгу, монолітних об'єктів пропсів, важких блоків та розробка стратегії радикального скорочення `App.tsx` з 1,742 до < 450 рядків.

---

## 1. Загальний огляд ключових файлів проекту

| Файл | Кількість рядків | Розмір (KB) | Статус / Призначення |
|:---|:---:|:---:|:---|
| `src/App.tsx` | **1742** | 52 KB | ⚠️ Потребує оптимізації |
| `src/components/header/Header.tsx` | **765** | 53 KB | ⚠️ Потребує оптимізації |
| `src/components/editor/EditorPane.tsx` | **594** | 20 KB | ⚠️ Потребує оптимізації |
| `src/components/screens/EditorScreen.tsx` | **156** | 5 KB | ✅ Оптимальний розмір |
| `src/components/sidebar/Sidebar.tsx` | **678** | 39 KB | ⚠️ Потребує оптимізації |
| `src/components/modals/AppModalsHost.tsx` | **221** | 8 KB | ✅ Оптимальний розмір |
| `src/components/Reader.tsx` | **735** | 26 KB | ⚠️ Потребує оптимізації |
| `src/hooks/useSteemGallery.ts` | **243** | 9 KB | ✅ Оптимальний розмір |
| `src/stores/useEditorStore.ts` | **179** | 5 KB | ✅ Оптимальний розмір |
| `src/stores/useAppUIStore.ts` | **73** | 2 KB | ✅ Оптимальний розмір |
| `src/store/readerStore.ts` | **258** | 8 KB | ✅ Оптимальний розмір |

---

## 2. Аналіз монолітних об'єктів пропсів у `src/App.tsx`

У коді `src/App.tsx` було виявлено 3 гігантські об'єкти, які збирають понад **180 пропсів** і передають їх крізь дочірні екрани:

### 2.1. `editorPaneProps` (Рядки 1363–1486)
- **Кількість переданих властивостей:** **123** шт.
- **Причина проблеми:** `App.tsx` збирає 124 рефи, функції, стейти і передає їх в `EditorScreen`, який лише робить `<EditorPane {...editorPaneProps} />`.
- **Список виявлених пропсів (123):**  
  `const, editorPaneRef, editorRef, wysiwygRef, isSyncingRef, wysiwygLocalBackupTimeoutRef, wysiwygSyncTimeoutRef, lastSyncContentRef, fileInputRef, isEditorFullScreen, vvHeight, activeMobileTab, visualStyle, isDarkMode, t, editorMode, typingSound, onOpenAudioPresetsModal, isLivePreviewEnabled, onDemandSyncEnabled, beautifyEnabled, neonTextColored, isSpacingMenuOpen, wysiwygSpacing, editorFontSize, toolbarIconSize, activeTable, tableRect, isTableMenuExpanded, isTableMenuPinned, isMiniGalleryOpen, images, justInsertedUrl, keyboardOffset, isFullScreen, widgetPos, isWidgetVisible, isWidgetMenuOpen, activeFormats, showMobileTools1, showMobileTools2, showMobileToolsOpen, activeModal, widgetNoBorder, performanceMode, floatingPos, widgetRef, offsetTop, viewportHeight, isKeyboardOpen, isSidebarOpen, scrollRef, lockedToolsWidth, enabledTools, menuDirection, widgetOpacity, lang, pubTitle, setPubTitle, pubTags, setPubTags, drafts, saveDraft, handleSetEditorMode, toggleEditorFullScreen, setOnDemandSyncEnabled, notify, toggleLivePreview, setBeautifyEnabled, setNeonTextColored, setIsSpacingMenuOpen, setWysiwygSpacing, setEditorFontSize, setToolbarIconSize, setIsTableMenuExpanded, setIsTableMenuPinned, setIsMiniGalleryOpen, setJustInsertedUrl, setWidgetPos, setIsWidgetVisible, setIsWidgetMenuOpen, setShowMobileTools1, setShowMobileTools2, setShowMobileToolsOpen, setActiveModal, setSettingsTab, setLockedToolsWidth, setEnabledTools, setWidgetOpacity, setWidgetNoBorder, saveCursorPosition, setIsEditorFocused, handleEditorKeyDown, handleEditorScroll, showWidget, handleWysiwygBeforeInput, handleWysiwygKeyDown, isImageAndProxyUrl, insertHtmlAtCursor, updateContentFromWysiwyg, htmlToMarkdown, convertBareImageUrlsToMarkdown, getMarked, setContent, saveVisualSelection, updateWysiwygEmptyStatus, deleteActiveTableRow, deleteActiveTableCol, deleteActiveTable, getMiniGalleryBottomStyle, insertImage, insertAtCursor, confirmDialog, handleWidgetAction, moveTool, toggleTool, fmt, fmtLine, handleIndent, handleLink, importTable, TOOLS_MAP, scrollCaretIntoView`

### 2.2. `sidebarProps` (Рядки 1488–1562)
- **Кількість переданих властивостей:** **66** шт.
- **Список виявлених пропсів (66):**  
  `const, isSidebarOpen, setIsSidebarOpen, isGalleryCollapsed, setIsGalleryCollapsed, getSidebarMotionConfig, username, vaultAccounts, selectedVaultUser, imageUploadAccount, setImageUploadAccount, authType, keychainAccounts, onAddKeychainAccount, onOpenVaultManager, galleryMode, toggleGalleryMode, galleryView, setGalleryView, gallerySearch, setGallerySearch, filteredLocalImages, images, setImages, toggleImageSelection, moveImageLocal, insertImage, insertExternalImage, uploadExternalImage, insertGrid, isSearchingPexels, pexelsResults, setPexelsResults, pexelsPage, handleExternalSearch, pexelsApiKey, pixabayApiKey, unsplashAccessKey, isTrafficOptimized, setIsTrafficOptimized, performanceMode, setPerformanceMode, pexelsSettings, setPexelsSettings, isGallerySettingsCollapsed, setIsGallerySettingsCollapsed, gridLayout, setGridLayout, gridWithCaptions, setGridWithCaptions, singleCaptionAlign, setSingleCaptionAlign, isTextWrapEnabled, setIsTextWrapEnabled, isExifEnabled, setIsExifEnabled, imageInsertFormat, setImageInsertFormat, isUploading, fileInputRef, sourceInput, setSourceInput, parseImages, setActiveModal, notify, t`

### 2.3. `modalsProps` (Рядки 1203–1361)
- **Кількість переданих властивостей:** **157** шт.
- **Список виявлених пропсів (157):**  
  `const, activeModal, setActiveModal, vaultPin, setVaultPin, initVault, username, setUsername, isVaultInitialized, isUnlocked, vaultAccounts, pexelsApiKey, setPexelsApiKey, pixabayApiKey, setPixabayApiKey, unsplashAccessKey, setUnsplashAccessKey, performanceMode, setPerformanceMode, notify, confirmDialog, promptDialog, lang, authType, setAuthType, selectedVaultUser, setSelectedVaultUser, keychainAccounts, addKeychainAccount, removeKeychainAccount, switchIdentity, pubTitle, setPubTitle, pubTags, setPubTags, rewardType, setRewardType, removeTitleLine, setRemoveTitleLine, beneficiaries, setBeneficiaries, benName, setBenName, benWeight, setBenWeight, showAdvancedPublish, setShowAdvancedPublish, scheduledTime, setScheduledTime, contentForPublish, mentions, extractMentions, addToQueue, pubLog, setPubLog, handlePublish, tagGroups, templates, setTemplates, setContent, insertAtCursor, toggleTag, splitWords, setSplitWords, handleSplitPost, currentDraftId, setCurrentDraftId, drafts, deleteDraft, toggleDraftStatus, editorMode, wysiwygRef, isSyncingRef, getMarked, exportBackup, importBackup, setMentions, newMention, setNewMention, addMention, isSMenuOpen, setIsSMenuOpen, themeColor, setThemeColor, activeAssortment, editorFont, setEditorFont, fontOptions, beautifyEnabled, setBeautifyEnabled, isDarkMode, setIsDarkMode, visualStyle, setVisualStyle, isPwaInstalled, isTauriEnv, isNeutralinoEnv, handleInstallPwa, setSettingsTab, appAgent, setAppAgent, appChangelog, getChangelogText, setTagGroups, queue, setQueue, publishFromQueue, tableImportText, setTableImportText, tableImportFormat, setTableImportFormat, processTableImport, settingsTab, setLang, neonTextColored, setNeonTextColored, editorFontSize, setEditorFontSize, toolbarIconSize, setToolbarIconSize, uiScalePreset, setUiScalePreset, applyUiScalePreset, headerIconSize, setHeaderIconSize, headerHeight, setHeaderHeight, headerHeightAuto, setHeaderHeightAuto, galleryIconSize, setGalleryIconSize, wysiwygSpacing, setWysiwygSpacing, widgetPos, setWidgetPos, isTrafficOptimized, setIsTrafficOptimized, syncScrollEnabled, setSyncScrollEnabled, showAdvancedSettings, setShowAdvancedSettings, imageInsertFormat, setImageInsertFormat, pexelsSettings, setPexelsSettings, images, handleClearCache, showPwaBanner, setShowPwaBanner, isEditorFullScreen, isFullScreen, showPwaInstructionsModal, setShowPwaInstructionsModal, deferredPrompt, quickTags, setQuickTags, pinTag`

---

## 3. Аналіз передачі пропсів у JSX розмітці `src/App.tsx`

| Компонент у JSX | Кількість прямих пропсів | Виявлені пропси |
|:---|:---:|:---|
| `<Header />` | **56** | `setIsSMenuOpen, visualStyle, activeView, setActiveView, editorMode, toolsMap, fmt, fmtLine, handleIndent, handleLink, importTable, saveDraft, downloadFile, insertAtCursor, activeFormats ... (+ ще 41)` |
| `<EditorScreen />` | **31** | `isVisible, activeView, sidebarProps, editorPaneProps, isEditorFullScreen, isFullScreen, visualStyle, isDarkMode, editorMode, previewRef, previewPaneRef, activeMobileTab, setActiveMobileTab, isLivePreviewEnabled, toggleLivePreview, syncScrollEnabled, setSyncScrollEnabled, toggleFullScreen, widgetPos, lang, pubTitle, setPubTitle, activeModal, setActiveModal, isSidebarOpen, setIsSidebarOpen, setSettingsTab, isKeyboardOpen, fileInputRef, handleFileUpload, t` |
| `<ReaderScreen />` | **12** | `isVisible, activeView, lang, t, editorFontSize, setEditorFontSize, onEditPost, onVote, onComment, onDeleteComment, onUploadImage, onUserUpdate` |
| `<AppModalsHost />` | **27** | `modalsProps, showAccountPrompt, setShowAccountPrompt, username, setUsername, autoInbox, setAutoInbox, pubLog, setPubLog, clearPubLogTimer, showNotificationPopup, setShowNotificationPopup, setActiveView, setNotifications, setTargetReaderPost, showTableSelector, setShowTableSelector, tableSelectorPos, tableImportFormat, setTableImportFormat, insertAtCursor, isAudioPresetsModalOpen, setIsAudioPresetsModalOpen, typingSound, systemDialog, setSystemDialog, t` |

> 🔴 **Головна проблема:** Хоча на попередніх етапах створено селектори Zustand, `App.tsx` **досі вручну збирає та передає всі 124 пропси в `editorPaneProps` та 58 пропсів у `<Header />`**!

---

## 4. Аналіз викликів хуків у `src/App.tsx`

Усередині компонента `App` викликається **50 хуків**, що породжує величезну кількість локальних змінних та ре-рендерів:

| # | Рядок | Хук | Отримані змінні |
|:---:|:---:|:---|:---|
| 1 | Рядок 108 | `useCallback` | `handleSetAutoInbox` |
| 2 | Рядок 135 | `useCallback` | `t` |
| 3 | Рядок 138 | `useDialogs` | `{ systemDialog, setSystemDialog, confirmDialog, promptDialog...` |
| 4 | Рядок 141 | `useEditorStore` | `content` |
| 5 | Рядок 142 | `useEditorStore` | `setContent` |
| 6 | Рядок 144 | `useEditorStore` | `stats` |
| 7 | Рядок 147 | `useState` | `[pubTitle, setPubTitle]` |
| 8 | Рядок 148 | `useState` | `[pubTags, setPubTags]` |
| 9 | Рядок 149 | `useState` | `[isWidgetMenuOpen, setIsWidgetMenuOpen]` |
| 10 | Рядок 150 | `useState` | `[showTableSelector, setShowTableSelector]` |
| 11 | Рядок 153 | `useTypingSound` | `typingSound` |
| 12 | Рядок 154 | `useState` | `[isAudioPresetsModalOpen, setIsAudioPresetsModalOpen]` |
| 13 | Рядок 214 | `useRef` | `hasLoadedRef` |
| 14 | Рядок 216 | `useEditorStore` | `contentForPublish` |
| 15 | Рядок 232 | `useImportExport` | `{ exportBackup, importBackup }` |
| 16 | Рядок 241 | `useState` | `[splitWords, setSplitWords]` |
| 17 | Рядок 242 | `useVisualViewport` | `{ viewportHeight: vvHeight, keyboardOffset, isKeyboardOpen, ...` |
| 18 | Рядок 243 | `useDeviceStore` | `showMobileBottomBar` |
| 19 | Рядок 244 | `useState` | `[performanceMode, setPerformanceMode]` |
| 20 | Рядок 256 | `useRef` | `isFirstRender` |
| 21 | Рядок 261 | `useState` | `[isEditorFocused, setIsEditorFocused]` |
| 22 | Рядок 262 | `useState` | `[isMiniGalleryOpen, setIsMiniGalleryOpen]` |
| 23 | Рядок 268 | `useCallback` | `saveLargeStorage` |
| 24 | Рядок 286 | `useCallback` | `getMotionConfig` |
| 25 | Рядок 303 | `useCallback` | `getSidebarMotionConfig` |
| 26 | Рядок 321 | `useFloatingWidgetState` | `floatingWidget` |
| 27 | Рядок 350 | `useState` | `[syncScrollEnabled, setSyncScrollEnabled]` |
| 28 | Рядок 351 | `useState` | `[isLivePreviewEnabled, setIsLivePreviewEnabled]` |
| 29 | Рядок 358 | `useCallback` | `toggleLivePreview` |
| 30 | Рядок 370 | `useState` | `[newMention, setNewMention]` |
| 31 | Рядок 375 | `useCallback` | `clearPubLogTimer` |
| 32 | Рядок 382 | `useCallback` | `setPubLog` |
| 33 | Рядок 397 | `useCallback` | `notify` |
| 34 | Рядок 441 | `useCallback` | `pinTag` |
| 35 | Рядок 493 | `useState` | `[showMobileToolsOpen, setShowMobileToolsOpen]` |
| 36 | Рядок 494 | `useState` | `[showLangMenu, setShowLangMenu]` |
| 37 | Рядок 495 | `useState` | `[showMobileTools1, setShowMobileTools1]` |
| 38 | Рядок 496 | `useState` | `[showMobileTools2, setShowMobileTools2]` |
| 39 | Рядок 526 | `useState` | `[isSMenuOpen, setIsSMenuOpen]` |
| 40 | Рядок 527 | `useState` | `[beautifyEnabled, setBeautifyEnabled]` |
| 41 | Рядок 591 | `useState` | `[activeFormatsState, setActiveFormatsState]` |
| 42 | Рядок 602 | `useCallback` | `scrollCaretIntoView` |
| 43 | Рядок 642 | `useWysiwygSync` | `wysiwygSync` |
| 44 | Рядок 711 | `useCallback` | `handleWorkerStats` |
| 45 | Рядок 717 | `useCallback` | `getSelectionOrWord` |
| 46 | Рядок 732 | `useEditorFormat` | `editorFormat` |
| 47 | Рядок 757 | `useRef` | `updateContentFromWysiwygRef` |
| 48 | Рядок 761 | `useEditorEvents` | `editorEvents` |
| 49 | Рядок 795 | `useSteemGallery` | `gallery` |
| 50 | Рядок 820 | `useTableOperations` | `tableOps` |

---

## 5. Важкі inline-функції та обробники в `src/App.tsx`

Виявлено **5 великих функцій** (> 15 рядків), які визначені прямо всередині `App.tsx`:

| Функція | Діапазон рядків | Рядків | Призначення |
|:---|:---:|:---:|:---|
| `handleClickOutside` | Рядки 499–515 | **17** | Локальна логіка обробки подій |
| `handleSelectionChange` | Рядки 907–958 | **52** | Локальна логіка обробки подій |
| `flushSave` | Рядки 996–1016 | **21** | Локальна логіка обробки подій |
| `updatePreview` | Рядки 1072–1107 | **36** | Локальна логіка обробки подій |
| `handleEditPost` | Рядки 1150–1172 | **23** | Локальна логіка обробки подій |

---

## 6. Чіткий покроковий план повної ліквідації моноліту в `App.tsx`

Для того, щоб зменшити `App.tsx` з **1,742** до **< 400 рядків**, необхідно виконати 3 системні дії:

### Дія 1: Повне видалення монолітного бандла `editorPaneProps` (Рядки 1363–1487)
- **Що зробити:** Замість того, щоб формувати об'єкт зі 124 полями всередині `App.tsx`, перенести його формування у `src/hooks/useEditorPaneProps.ts` або дозволити `EditorPane` та його підкомпонентам отримувати дані безпосередньо зі сторів та хуків.
- **Ефект:** Видалення **125 рядків** чистого бойлерплейту в `App.tsx`.

### Дія 2: Радикальне очищення пропсів `<Header />` (Рядки 1579–1636)
- **Що зробити:** З 58 пропсів залишити тільки ті, що вимагають унікального контексту, а всі глобальні функції (`saveDraft`, `downloadFile`, `importTable`, `fmt`, `fmtLine`, `handleIndent`, `handleLink`, `templates`, `mentions`, `queue`, `isDarkMode`, `lang`, `performanceMode`, `showMobileTools*`) отримувати через Zustand селектори безпосередньо в `Header.tsx`.
- **Ефект:** Скорочення виклику `<Header />` з 58 рядків до < 10 рядків.

### Дія 3: Винесення синхронізації та клавіатурних шорткатів (Рядки 850–1150)
- **Що зробити:** Блоки автозбереження (`steem_autosave_temp`), спостереження за курсором та глобальні гарячі клавіші винести в окремий хук `useEditorShortcutsAndAutosave.ts`.
- **Ефект:** Видалення понад **300 рядків** з `App.tsx`.

### Дія 4: Винесення обробників публікації та черги (Рядки 1150–1350)
- **Що зробити:** Інтегрувати хуки `usePublishingManager` та `useSteemQueue` у внутрішній провайдер або окремий фасадний хук `useAppPublishing.ts`.
- **Ефект:** Видалення понад **200 рядків** з `App.tsx`.

---

## 7. Висновок та очікуваний результат
Після реалізації цих дій `src/App.tsx` виконуватиме виключно свою пряму роль — **кореневого оркестратора маршрутизації та глобальних провайдерів** обсягом **~350–400 рядків**, без жодного монолітного бандла пропсів та без зайвих ре-рендерів кореневого дерева.
