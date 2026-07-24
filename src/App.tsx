import ExifReader from 'exifreader';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Bold, Italic, Strikethrough, 
  Quote, Link as LinkIcon, 
  Table as TableIcon, Minus, AlignCenter, 
  AlignJustify, Image as ImageIcon, Settings, RefreshCw,
  Save, FolderOpen, FileText, AtSign, Rocket, 
  Trash2, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Eye, EyeOff, Edit3, Plus, ShieldCheck, Key,
  Search, List as ListIcon, Lock, LayoutGrid, Maximize2, Minimize2, Calendar, Tags, Shield, Bell, ArrowRight, Clock,
  Code, Terminal, Indent, Layers, CheckCircle, Check, AlignLeft, AlignRight, Rows, Columns, PanelLeft, PanelRight, PanelLeftClose, PanelLeftOpen, Moon, Sun, FilePlus, Zap, MoveVertical, Info, Globe, FileUp, FileDown, Copy, SplitSquareHorizontal, Type, Download, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
// @ts-ignore
import { Idiomorph } from 'idiomorph';
import { cn } from './lib/utils';
import { getClient, callWithFallback, probeNodes } from './lib/steem';
import { Draft, Template, ImageItem, AuthType, TagGroup, Language, QueueItem, SteemPost, SteemNotification } from './types';
import { Buffer } from 'buffer';
import { SecurityService } from './services/securityService';
import { PexelsService, PexelsPhoto } from './services/pexelsService';
import { CodeEditor } from './components/CodeEditor';
import { useEditorStore, getOffsetFromRowCol, getRowColFromOffset } from './store';
import ImageItemComp from './components/ImageItem';
import ExternalImageItem from './components/ExternalImageItem';
import Reader from './components/Reader';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { htmlToMarkdown, convertBareImageUrlsToMarkdown, isImageAndProxyUrl } from './lib/editorSync';
import { useEditorWorker } from './hooks/useEditorWorker';

// --- Constants ---
const COMMUNITIES = [
  { id: 'ukraine', name: 'Steem Ukraine', tags: ['hive-145157', 'ukraine', 'steemexclusive'] },
  { id: 'venezuela', name: 'Steem Venezuela', tags: ['hive-193637', 'venezuela', 'steemexclusive'] },
  { id: 'colombia', name: 'Colombia-Original', tags: ['hive-113376', 'colombia', 'steemexclusive'] },
  { id: 'bangladesh', name: 'Steem Bangladesh', tags: ['hive-138339', 'bangladesh', 'steemexclusive'] },
  { id: 'indonesia', name: 'Steem Indonesia', tags: ['hive-133280', 'indonesia', 'steemexclusive'] },
  { id: 'xpilar', name: 'World of Xpilar', tags: ['hive-185836', 'xpilar', 'steemexclusive'] },
  { id: 'betterlife', name: 'Steem For Betterlife', tags: ['hive-153970', 'betterlife', 'steemexclusive'] },
  { id: 'entrepreneurs', name: 'Steem Entrepreneurs', tags: ['hive-181136', 'steem-entrepreneurs', 'steemexclusive'] },
  { id: 'kids', name: 'Steem Kids & Parents', tags: ['hive-139765', 'steemkids', 'steemexclusive'] },
  { id: 'newcomers', name: 'Newcomers Community', tags: ['hive-172186', 'achievement1'] },
  { id: 'writing', name: 'Writing & Reviews', tags: ['hive-190212', 'writing', 'steemexclusive'] },
  { id: 'foods', name: 'Steem Foods', tags: ['hive-180301', 'steemfoods', 'steemexclusive'] },
  { id: 'fashion', name: 'Fashion & Style', tags: ['hive-125125', 'fashion', 'steemexclusive'] },
  { id: 'crypto', name: 'Crypto Academy', tags: ['hive-108451', 'cryptoacademy', 'steemexclusive'] },
  { id: 'travel', name: 'Steem Travel', tags: ['hive-163291', 'travel', 'steemexclusive'] },
  { id: 'art', name: 'Steem Art', tags: ['hive-185836', 'art', 'steemexclusive'] },
  { id: 'garden', name: 'Steem Garden', tags: ['hive-180821', 'garden', 'steemexclusive'] },
  { id: 'news', name: 'Steem News', tags: ['hive-179607', 'news', 'steemexclusive'] },
  { id: 'promo', name: 'PromoSteem', tags: ['hive-152200', 'promosteem', 'steemexclusive'] },
  { id: 'woa', name: 'World of Animals', tags: ['hive-140292', 'animals', 'steemexclusive'] },
  { id: 'learn', name: 'Steem Learning', tags: ['hive-190212', 'learning', 'steemexclusive'] },
  { id: 'tech', name: 'Steem Tech', tags: ['hive-190212', 'technology', 'steemexclusive'] },
  { id: 'dev', name: 'Development', tags: ['hive-151113', 'dev', 'steem', 'steemexclusive'] },
  { id: 'sport', name: 'Steem Sport', tags: ['hive-106444', 'sport', 'steemexclusive'] },
  { id: 'health', name: 'Steem Health', tags: ['hive-168205', 'health', 'steemexclusive'] },
];

const COMMON_TAGS = ['life', 'betterlife', 'thediarygame', 'club5050', 'club75', 'club100', 'art', 'photography', 'travel', 'food', 'nature', 'blog', 'creative', 'dev', 'steem', 'lifestyle', 'news', 'steemit', 'sharing', 'review', 'tutorial'];

// Detect native environment (Tauri / Android Wrapper)
const IS_NATIVE = typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).AndroidBridge || navigator.userAgent.includes('SteemEditorNative'));

// --- Translations ---
const translations = {
  uk: {
    saveDraftBeforeNew: "Зберегти поточний допис як чернетку перед створенням нового?",
    confirmNewPost: "Ви впевнені, що хочете почати новий допис? Поточний текст буде втрачено, якщо він не збережений.",
    confirmDeleteAccount: "Ви впевнені, що хочете видалити акаунт {acc}?",
    confirmResetVault: "Ви впевнені, що хочете скинути Сховище? Усі дані будуть видалені.",
    confirmClearApiKeys: "Очистити всі API ключі?",
    general: "Загальні",
    about: "Про застосунок",
    vault: "Сховище",
    pwa: "Встановлення",
    enterPin: "Введіть ПІН-код",
    sessionActive: "СЕСІЯ АКТИВНА",
    vaultClosed: "СХОВИЩЕ ЗАКРИТЕ",
    addMention: "Додати користувача (без @):",
    performanceMode: "Режим продуктивності",
    widgetSettings: "Налаштування віджета",
    appearance: "Зовнішній вигляд",
    theme: "Тема",
    font: "Шрифт",
    widgetPos: "Позиція віджета",
    posFloating: "Плаваючий",
    posBottom: "Знизу",
    posPreview: "Прев'ю",
    widgetMinimal: "Мінімалістичний режим",
    widgetOpacity: "Прозорість",
    activeToolsSort: "Сортування інструментів",
    settingsToolsDesc: "Увімкніть та впорядкуйте інструменти, які будуть доступні у плаваючому віджеті.",
    gallerySettings: "Налаштування галереї",
    vaultSecurity: "Безпека Сховища",
    accounts: "Акаунти",
    importBtn: "ІМПОРТУВАТИ ТАБЛИЦЮ",
    editor: "Редактор",
    preview: "Прев'ю",
    gallery: "Галерея",
    settings: "Налаштування",
    publish: "Опублікувати",
    drafts: "Чернетки",
    templates: "Шаблони",
    tags: "Теги",
    mentions: "Згадки",
    tagGroups: "Групи тегів",
    addTagGroup: "Додати групу",
    importTable: "Імпорт таблиці",
    schedule: "Розклад",
    saveDraft: "Зберегти чернетку",
    insert: "Вставити",
    delete: "Видалити",
    cancel: "Скасувати",
    confirm: "Підтвердити",
    username: "Користувач",
    title: "Заголовок",
    removeFirstLine: "Видалити перший рядок з тексту",
    tagsPlaceholder: "теги через пробіл",
    cacheCleared: "Кеш галереї очищено",
    pexelsSearch: "Пошук у Pexels",
    noDrafts: "Чернеток немає",
    noTemplates: "Шаблонів немає",
    wordsLabel: "Слів",
    cleanWordsLabel: "Чистих слів",
    charsLabel: "Символів",
    words: "слів",
    chars: "симв",
    clean: "чисто",
    editorTools: "Інструменти",
    steemitSetup: "Налаштування Steemit",
    themeCyan: "Ціан (Ніч)",
    themeEmerald: "Смарагд",
    themeOrange: "Захід сонця",
    themeRose: "Кварц",
    fontSans: "Sans (Inter)",
    fontSerif: "Serif (PT Serif)",
    fontMono: "Mono (JetBrains)",
    advanced: "Додатково",
    appAgent: "Агент застосунку",
    rewardType: "Тип винагороди",
    rewardsSP: "100% SP",
    rewards50: "50% / 50%",
    trafficOptimization: "Оптимізація трафіку",
    trafficDesc: "Мініатюри в галереї",
    darkMode: "Темна тема",
    lightMode: "Світла тема",
    exifEnabled: "Зчитувати EXIF",
    exifDesc: "Додавати параметри зйомки після фото",
    beneficiaries: "Бенефіціари",
    addBeneficiary: "Додати",
    weight: "%",
    fromMentions: "Із згадувань",
    noBeneficiaries: "Немає бенефіціарів",
    mentionsList: "Список згадок",
    signaturePolicy: "Перевірка підпису",
    signatureMissing: "Підпис відсутній у кінці поста!",
    signatureFound: "Підпис знайдено.",
    twoTapPublish: "Швидка публікація",
    applyGroup: "Вставити групу",
    importTableTitle: "Імпорт таблиці",
    importTableDesc: "Вставте дані з Excel, Google Sheets або CSV. Ми автоматично перетворимо їх у Markdown.",
    importTablePlaceholder: "Вставте дані сюди...",
    tableFormat: "Формат таблиці",
    loadDraftConfirm: "Завантажити цю чернетку? Поточний текст буде замінено.",
    parts: "частин",
    splitPost: "Розділити допис",
    splitPostDesc: "Розділити довгий текст на кілька частин по ~300 слів.",
    minWordsPerPart: "Мін. слів на частину",
    splitBtn: "РОЗДІЛИТИ",
    formatting: "Форматування",
    steemitOptions: "Опції Steemit",
    clearfix: "Фікс. текст (Clearfix)",
    imageFormat: "Формат зображень",
    additional: "Додатково",
    pexelsAttribution: "Атрибуція Pexels",
    pexelsLink: "Посилання в фото",
    pexelsKey: "Ключ Pexels",
    vaultPin: "ПІН-код Vault",
    unlock: "Розблокувати",
    lock: "Заблокувати",
    keys: "Ключі",
    mobileEditor: "Ред",
    mobilePreview: "Прев",
    queue: "Черга",
    addToQueue: "В чергу",
    queueEmpty: "Черга порожня",
    publishNext: "Опублікувати наступний",
    autoPublish: "Авто-публікація",
    status: "Статус",
    pending: "Очікує",
    published: "Опубліковано",
    error: "Помилка",
    gridWithCaptions: "Додати підписи до сітки",
    placeholder: "Почніть писати свій шедевр тут...",
    fillRequired: "Будь ласка, заповніть усі обов'язкові поля.",
    publishing: "⏳ Початок публікації...",
    publishedSuccess: "✅ Опубліковано!",
    noKeychain: "Steem Keychain не знайдено.",
    pinRequired: "ПІН-код обов'язковий",
    saveSuccess: "Збережено!",
    fillAll: "Заповніть усі поля!",
    noAccount: "Оберіть акаунт!",
    pinShort: "ПІН-код занадто короткий (мін. 4)",
    vaultInit: "Сховище ініціалізовано!",
    accountAdded: "Акаунт додано!",
    bold: "Жирний",
    italic: "Курсив",
    strike: "Закреслений",
    h1: "Заголовок 1",
    h2: "Заголовок 2",
    h3: "Заголовок 3",
    quote: "Цитата",
    link: "Посилання",
    hr: "Розділювач",
    justify: "По ширині",
    center: "По центру",
    addAccount: "Додати акаунт",
    templateName: "Назва шаблону",
    saveTemplate: "Зберегти шаблон",
    mentionUsername: "Користувач",
    saveMention: "Додати",
    search: "Пошук",
    light: "Світла",
    dark: "Темна",
    syncScroll: "Синхронне прокручування",
    dragToReorder: "Перетягніть для зміни порядку",
    transparent: "Прозорий",
    borderless: "Без рамок",
    systemDialogAlert: "Повідомлення",
    systemDialogConfirm: "Підтвердіть дію",
    systemDialogPrompt: "Введіть дані",
    aboutDesc: "Ultra Steem Editor — професійний багатопотоковий редактор для Steem з безпекою на базі Web Crypto (AES-GCM), подвійним шифруванням та захистом ПІН-кодом. Оптимізовано для великих файлів.",
    aboutApp: "Про застосунок",
    packagesUsed: "Використані пакети (NPM)",
    externalLibs: "Зовнішні бібліотеки (CDN)",
    credits: "Авторство та розробка",
    aiCredits: "ШІ (Gemini AI)",
    humanCredits: "Людина",
    aiTasks: "Написання коду, тех. оптимізація, реалізація логіки",
    humanTasks: "Ідея, творче спрямування, тестування, асистування",
    appAgentDesc: "Мета-рядок, що додається до ваших постів.",
    version: "Версія",
    developer: "Розробник",
    github: "GitHub",
    license: "Ліцензія",
    copyright: "2024 SteemEditor Pro. Всі права захищені.",
    showInWidget: "Показувати у віджеті",
    hideInWidget: "Приховати у віджеті",
    opacity: "Прозорість",
    noBorder: "Без рамок",
    resetWidget: "Скинути вигляд",
    templatesEmpty: "Список шаблонів порожній",
    saveAsTemplate: "Зберегти як шаблон",
    confirmDeleteTemplate: "Видалити шаблон {name}?",
    templateSaved: "Шаблон збережено!",
    templateDeleted: "Шаблон видалено!",
    mentionAdded: "Згадування додано!",
    mentionDeleted: "Згадування видалено!",
    confirmDeleteMention: "Видалити згадування @{name}?",
    table: "Таблиця",
    downloadMd: "Завантажити .md",
    exportMd: "Експорт .md",
    importMd: "Імпорт .md",
    tagPresets: "Пресет тегів",
    commonTags: "Популярні теги",
    communities: "Спільноти",
    indent: "Відступ (4 пр.)",
    escape: "Екранування",
    codeBlock: "Блок коду",
    inlineCode: "Код в рядку",
    addTags: "Додати теги",
    attribution: "Атрибуція автора",
    linkInImg: "Лінк у картинці",
    createGrid: "Створити сітку",
    account: "Акаунт",
    leftText: "Зліва + текст",
    rightText: "Справа + текст",
    asIs: "Як є",
    uploadToSteemit: "Завантажити на Steemit",
    pexelsError: "Помилка Pexels: Перевірте API ключ або підключення.",
    linkPrompt: "Це посилання. Введіть текст для нього (або залиште порожнім):",
    urlPrompt: "Введіть URL:",
    leftContent: " ✍️ ",
    rightContent: " ✍️ ",
    loadingParser: "Завантаження парсера...",
    previewError: "Помилка рендерингу превью",
    untitled: "Без назви",
    needVaultAccount: "Для вивантаження зображень необхідно обрати акаунт у сховищі (Vault)!",
    pinError: "Помилка ПІН-коду: ",
    preparingUpload: "⏳ Підготовка до завантаження...",
    proxyAttempt: "⏳ Спроба через проксі...",
    proxyError: "Не вдалося завантажити зображення навіть через проксі (CORS)",
    signingImage: "⏳ Підпис зображення...",
    uploadingSteemit: "⏳ Вивантаження на SteemitImages...",
    serverError: "Помилка сервера: ",
    uploadSuccess: "✅ Зображення успішно завантажено!",
    uploadProgress: "⏳ Завантаження {current} з {total}: {name}...",
    uploadComplete: "✅ Завантажено {count} з {total} зображень.",
    pasteUrl: "Вставте посилання тут...",
    fullScreen: "Повний екран",
    enterNewPin: "Введіть новий ПІН-код",
    enterPinPlaceholder: "Введіть ПІН-код",
    usernameNoAt: "Нікнейм (без @)",
    vaultUnlocked: "Сховище розблоковано",
    vaultLocked: "Сховище заблоковано",
    vaultTitle: "Сховище акаунтів",
    vaultWarning: "Подвійне шифрування: ПІН-код захищає Майстер-ключ, який шифрує ваші акаунти.",
    pinSetup: "Налаштування ПІН-коду",
    pinSetupDesc: "Встановіть ПІН-код для захисту вашого сховища. Він не зберігається ніде, крім вашої голови.",
    createVault: "СТВОРИТИ СХОВИЩЕ",
    unlockBtn: "РОЗБЛОКУВАТИ",
    yourAccounts: "Ваші акаунти",
    newAccount: "Новий акаунт",
    postingKeyPlaceholder: "Posting Key (5J...)",
    done: "Готово",
    publishToSteem: "Публікація в Steem",
    vaultNotConfigured: "Сховище не налаштовано. Встановіть ПІН-код у налаштуваннях.",
    setupVaultBtn: "Налаштувати сховище",
    vaultActive: "Сховище активне",
    vaultActiveDesc: "Ви можете публікувати пости від обраного акаунта.",
    selectAccount: "Оберіть акаунт...",
    autosaveActive: "Автозбереження активно",
    clear: "Очистити",
    saveToVault: "ЗБЕРЕГТИ В СХОВИЩЕ",
    protectedByMK: "Захищено MK",
    vaultEmpty: "Сховище порожнє",
    resetVault: "Скинути все сховище",
    save: "ЗБЕРЕГТИ",
    links: "ПОСИЛАННЯ",
    text: "ТЕКСТ",
    keys_mobile: "КЛЮЧІ",
    clearfixDesc: "Запобігає обтіканню текстом після зображень зліва/справа.",
    splitSuccess: "Допис розділено на {count} частин та збережено в чернетки!",
    importTableSuccess: "Таблицю успішно імпортовано!",
    pexelsKeyRequired: "Спочатку додайте API ключ Pexels у налаштуваннях (отримайте його на pexels.com після реєстрації).",
    pixabayKeyRequired: "Спочатку додайте API ключ Pixabay у налаштуваннях (отримайте його на pixabay.com після реєстрації).",
    unsplashKeyRequired: "Спочатку додайте API ключ Unsplash (Access Key) у налаштуваннях (отримайте його на unsplash.com/developers).",
    pixabayError: "Помилка Pixabay: Перевірте API ключ або підключення.",
    unsplashError: "Помилка Unsplash: Перевірте API ключ або підключення.",
    working: "В роботі",
    ready: "Затверджено",
    pixabayKey: "Ключ Pixabay",
    unsplashKey: "Ключ Unsplash",
    enableThumbnails: "Мініатюри в галереї",
    caption: "Підпис",
    addCaption: "Додати підпис",
    typeHere: " ✍️ ",
    image: "Зображення",
    description: "Опис",
    color: "Колір",
    rowLayout: "Рядок поруч",
    colImgText: "Фото → Опис",
    colTextImg: "Опис → Фото",
    alignLeft: "Ліворуч",
    alignCenter: "По центру",
    alignRight: "Праворуч",
    align: "Вирівнювання",
    gridLayout: "Макет сітки",
    redText: "Червоний текст",
    loadMore: "Завантажити ще",
    saveUnencrypted: "Зберегти без PIN-коду",
    unsplashAppId: "Unsplash Application ID",
    unsplashAccessKey: "Unsplash Access Key",
    unsplashSecretKey: "Unsplash Secret Key",
    keysCleared: "API ключі очищено!",
    clearApiKeys: "Очистити API ключі",
    clearCache: "Очистити кеш",
    textWrap: "Обтікання текстом",
    performanceDesc: "Вимикає деякі анімації та підсвічування для підвищення швидкості роботи.",
    allSettings: "Усі налаштування",
    widgetNoBorder: "Без рамок",
    saved: "Збережено",
    load: "Завантажити",
    newPost: "Новий допис",
    welcomeTitle: "Привіт! 👋",
    welcomeDesc: "Додайте свій Steem нікнейм для персоналізованих сповіщень про відповіді, завантаження зображень та швидкої публікації через Keychain.",
    saveAndStart: "Зберегти і Почати",
    skipForNow: "Пропустити (можна додати пізніше)",
    installApp: "Встановити додаток",
    pwaInstallDesc: "Встановіть Steem Editor як швидкий і легкий додаток на свій пристрій з підтримкою офлайн-роботи.",
    pwaInstalled: "Додаток успішно встановлено!",
    pwaAlreadyInstalled: "Додаток уже встановлено",
    pwaInstallFailed: "Не вдалося запустити встановлення",
    pwaPlatformSupport: "Підтримується на Android, iOS, Windows та macOS.",
  },
  en: {
    saveDraftBeforeNew: "Save current post as draft before starting new?",
    confirmNewPost: "Are you sure you want to start a new post? Current text will be lost if not saved.",
    performanceDesc: "Disables some animations and highlights for better performance.",
    allSettings: "All Settings",
    widgetNoBorder: "No Border",
    saved: "Saved",
    load: "Load",
    newPost: "New Post",
    welcomeTitle: "Welcome! 👋",
    welcomeDesc: "Add your Steem username for personalized reply notifications, image uploads, and quick posting via Keychain.",
    saveAndStart: "Save & Start",
    skipForNow: "Skip for now (can add later)",
    aboutDesc: "Ultra Steem Editor — professional multi-threaded editor for Steem with Web Crypto (AES-GCM) security, double encryption, and PIN protection. Optimized for large files.",
    aboutApp: "About App",
    packagesUsed: "Packages Used (NPM)",
    externalLibs: "External Libraries (CDN)",
    credits: "Credits & Development",
    aiCredits: "AI (Gemini AI)",
    humanCredits: "Human",
    aiTasks: "Code writing, tech optimization, logic implementation",
    humanTasks: "Idea, creative direction, testing, assisting",
    appAgentDesc: "Meta string added to your posts.",
    version: "Version",
    developer: "Developer",
    license: "License",
    confirmDeleteAccount: "Delete account @{acc}?",
    confirmResetVault: "Reset Vault? All accounts will be removed.",
    confirmClearApiKeys: "Clear all API keys?",
    general: "General",
    about: "About",
    vault: "Vault",
    pwa: "PWA Install",
    enterPin: "Enter PIN",
    sessionActive: "SESSION ACTIVE",
    vaultClosed: "VAULT CLOSED",
    addMention: "Add user (no @):",
    performanceMode: "Performance Mode",
    widgetSettings: "Widget Settings",
    appearance: "Appearance",
    theme: "Theme",
    font: "Font",
    widgetPos: "Widget Position",
    posFloating: "Floating",
    posBottom: "Bottom",
    posPreview: "Preview Pane",
    widgetMinimal: "Minimal Mode",
    widgetOpacity: "Opacity",
    activeToolsSort: "Tools Sort",
    settingsToolsDesc: "Configure floating widget tools.",
    gallerySettings: "Gallery Settings",
    vaultSecurity: "Vault Security",
    accounts: "Accounts",
    importBtn: "IMPORT",
    cacheCleared: "Gallery cache cleared",
    editor: "Editor",
    preview: "Preview",
    gallery: "Gallery",
    settings: "Settings",
    publish: "Publish",
    drafts: "Drafts",
    templates: "Templates",
    tags: "Tags",
    mentions: "Mentions",
    tagGroups: "Tag Groups",
    addTagGroup: "Add Group",
    importTable: "Import Table",
    schedule: "Schedule",
    saveDraft: "Save Draft",
    insert: "Insert",
    delete: "Delete",
    cancel: "Cancel",
    confirm: "Confirm",
    username: "Username",
    title: "Title",
    removeFirstLine: "Remove 1st line from post body",
    tagsPlaceholder: "tags by space",
    pexelsSearch: "Pexels Search",
    noDrafts: "No drafts",
    noTemplates: "No templates",
    wordsLabel: "Words",
    cleanWordsLabel: "Clean",
    charsLabel: "Chars",
    words: "words",
    chars: "chars",
    clean: "clean",
    editorTools: "Tools",
    steemitSetup: "Steemit Setup",
    themeCyan: "Cyan",
    themeEmerald: "Emerald",
    themeOrange: "Orange",
    themeRose: "Rose",
    fontSans: "Sans (Inter)",
    fontSerif: "Serif (PT Serif)",
    fontMono: "Mono (JetBrains)",
    advanced: "Advanced",
    appAgent: "App Agent",
    rewardType: "Reward Type",
    rewardsSP: "100% SP",
    rewards50: "50/50",
    trafficOptimization: "Load Speed",
    trafficDesc: "Gallery Thumbnails",
    darkMode: "Dark",
    lightMode: "Light",
    exifEnabled: "Read EXIF",
    exifDesc: "Insert camera metadata",
    beneficiaries: "Beneficiaries",
    addBeneficiary: "Add",
    weight: "%",
    fromMentions: "From mentions",
    noBeneficiaries: "Empty",
    mentionsList: "Mentions",
    signaturePolicy: "Sig. Check",
    signatureMissing: "Missing signature!",
    signatureFound: "Signature Found",
    twoTapPublish: "Fast Pub.",
    applyGroup: "Apply",
    importTableTitle: "Import Table",
    importTableDesc: "Paste from Excel/Sheets.",
    importTablePlaceholder: "Paste here...",
    tableFormat: "Format",
    loadDraftConfirm: "Load draft?",
    parts: "parts",
    splitPost: "Split Post",
    splitPostDesc: "Split long text.",
    minWordsPerPart: "Min words",
    splitBtn: "SPLIT",
    steemitOptions: "Options",
    clearfix: "Clearfix",
    imageFormat: "Img Format",
    additional: "Additional",
    pexelsAttribution: "Pexels Attr.",
    pexelsLink: "Pexels Link",
    pexelsKey: "Pexels Key",
    vaultPin: "Vault PIN",
    unlock: "Unlock",
    lock: "Lock",
    keys: "Keys",
    mobileEditor: "Ed",
    mobilePreview: "Pre",
    queue: "Queue",
    addToQueue: "To Queue",
    queueEmpty: "Queue empty",
    publishNext: "Pub. Next",
    autoPublish: "Auto Pub.",
    status: "Status",
    pending: "Pending",
    published: "Published",
    gridWithCaptions: "Captions",
    placeholder: "Start typing...",
    fillRequired: "Fill required fields.",
    publishing: "⏳ Publishing...",
    publishedSuccess: "✅ Published!",
    noKeychain: "Keychain not found.",
    pinRequired: "PIN required",
    saveSuccess: "Saved!",
    fillAll: "Fill all!",
    noAccount: "Select account!",
    pinShort: "PIN short",
    vaultInit: "Initialized!",
    accountAdded: "Added!",
    bold: "Bold",
    italic: "Italic",
    strike: "Strike",
    h1: "H1",
    h2: "H2",
    h3: "H3",
    quote: "Quote",
    link: "Link",
    hr: "HR",
    justify: "Justify",
    center: "Center",
    table: "Table",
    downloadMd: "Down .md",
    exportMd: "Export .md",
    importMd: "Import .md",
    tagPresets: "Presets",
    commonTags: "Pop. Tags",
    communities: "Communities",
    indent: "Indent",
    escape: "Escape",
    codeBlock: "Code Block",
    inlineCode: "Inline Code",
    addTags: "Add Tags",
    attribution: "Attr.",
    linkInImg: "Link in Img",
    createGrid: "Grid",
    account: "Account",
    leftText: "LeftText",
    rightText: "RightText",
    asIs: "As Is",
    uploadToSteemit: "To Steemit",
    pexelsError: "Pexels Error",
    linkPrompt: "Link text:",
    urlPrompt: "URL:",
    leftContent: " ✍️ ",
    rightContent: " ✍️ ",
    loadingParser: "Loading...",
    previewError: "Render error",
    untitled: "Untitled",
    needVaultAccount: "Select account in Vault!",
    pinError: "PIN Error: ",
    preparingUpload: "⏳ Preparing...",
    proxyAttempt: "⏳ Proxy...",
    proxyError: "CORS Error",
    signingImage: "⏳ Signing...",
    uploadingSteemit: "⏳ Uploading...",
    serverError: "Server Error: ",
    uploadSuccess: "✅ Done!",
    uploadProgress: "⏳ {current}/{total}...",
    uploadComplete: "✅ Uploaded {count}.",
    pasteUrl: "Paste link...",
    fullScreen: "FS",
    enterNewPin: "New PIN",
    enterPinPlaceholder: "Enter PIN",
    addAccount: "Add Acc",
    usernameNoAt: "Username",
    vaultUnlocked: "Unlocked",
    vaultLocked: "Locked",
    templateName: "Name...",
    vaultTitle: "Vault",
    vaultWarning: "PIN protects MK.",
    pinSetup: "PIN Setup",
    pinSetupDesc: "Set PIN.",
    createVault: "CREATE",
    unlockBtn: "UNLOCK",
    yourAccounts: "Accounts",
    newAccount: "New",
    postingKeyPlaceholder: "Key",
    done: "Done",
    publishToSteem: "To Steem",
    vaultNotConfigured: "Vault not set.",
    setupVaultBtn: "Setup",
    vaultActive: "Active",
    vaultActiveDesc: "Ready.",
    selectAccount: "Account...",
    autosaveActive: "Autosave",
    clear: "Clear",
    saveToVault: "SAVE",
    protectedByMK: "Safe",
    vaultEmpty: "Empty",
    resetVault: "Reset All",
    save: "SAVE",
    links: "LINKS",
    text: "TEXT",
    keys_mobile: "KEYS",
    formatting: "Formatting",
    rowLayout: "Row",
    colImgText: "Col Img-Txt",
    colTextImg: "Col Txt-Img",
    alignLeft: "Left",
    alignCenter: "Center",
    alignRight: "Right",
    align: "Align",
    gridLayout: "Grid",
    redText: "Red",
    loadMore: "More",
    saveUnencrypted: "No PIN",
    unsplashAppId: "Unsplash ID",
    unsplashAccessKey: "Unsplash Key",
    unsplashSecretKey: "Unsplash Sec",
    clearCache: "Clear Cache",
    textWrap: "Text Wrap",
    keysCleared: "Cleared!",
    clearApiKeys: "Clear Keys",
    installApp: "Install App",
    pwaInstallDesc: "Install Steem Editor as a fast, lightweight app on your device with offline support.",
    pwaInstalled: "App successfully installed!",
    pwaAlreadyInstalled: "App is already installed",
    pwaInstallFailed: "Failed to launch installation",
    pwaPlatformSupport: "Supported on Android, iOS, Windows, and macOS.",
  },
  es: {
    editor: "Editor",
    preview: "Previsualización",
    gallery: "Galería",
    settings: "Ajustes",
    pwa: "PWA Instalar",
    publish: "Publicar",
    drafts: "Borradores",
    templates: "Plantillas",
    tags: "Etiquetas",
    mentions: "Menciones",
    tagGroups: "Grupos de etiquetas",
    addTagGroup: "Añadir grupo",
    importTable: "Importar tabla",
    schedule: "Programar",
    saveDraft: "Guardar borrador",
    insert: "Insertar",
    delete: "Eliminar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    username: "Usuario",
    title: "Título",
    removeFirstLine: "Quitar la 1ª línea del cuerpo",
    tagsPlaceholder: "etiquetas separadas por espacios",
    pexelsSearch: "Buscar en Pexels",
    noDrafts: "No hay borradores",
    noTemplates: "No hay plantillas",
    wordsLabel: "Palabras",
    cleanWordsLabel: "Palabras limpias",
    charsLabel: "Caracteres",
    words: "palabras",
    chars: "caracteres",
    clean: "limpio",
    formatting: "Formato",
    steemitOptions: "Opciones Steemit",
    clearfix: "Limpiar flotado (Clearfix)",
    imageFormat: "Formato de imagen",
    additional: "Adicional",
    pexelsAttribution: "Atribución Pexels",
    pexelsLink: "Enlace en foto",
    pexelsKey: "Clave Pexels",
    vaultPin: "PIN de Bóveda",
    unlock: "Desbloquear",
    lock: "Bloquear",
    keys: "Claves",
    mobileEditor: "Ed",
    mobilePreview: "Pre",
    queue: "Cola",
    addToQueue: "A la cola",
    queueEmpty: "La cola está vacía",
    publishNext: "Publicar siguiente",
    autoPublish: "Auto Publicar",
    status: "Estado",
    pending: "Pendiente",
    published: "Publicado",
    error: "Error",
    placeholder: "Comience a escribir su obra maestra aquí...",
    fillRequired: "Por favor complete todos los campos requeridos.",
    publishing: "⏳ Publicando...",
    publishedSuccess: "✅ ¡Publicado!",
    noKeychain: "Steem Keychain no encontrado.",
    enterPin: "Ingrese el PIN para desbloquear la bóveda:",
    pinRequired: "PIN requerido",
    saveSuccess: "¡Guardado!",
    fillAll: "¡Complete todos los campos!",
    noAccount: "¡Seleccione cuenta!",
    pinShort: "PIN demasiado corto (mín. 4)",
    vaultInit: "¡Bóveda inicializada!",
    accountAdded: "¡Cuenta añadida!",
    sessionActive: "SESIÓN ACTIVA",
    vaultClosed: "BÓVEDA CERRADA",
    bold: "Negrita",
    italic: "Cursiva",
    strike: "Tachado",
    h1: "Título 1",
    h2: "Título 2",
    h3: "Título 3",
    quote: "Cita",
    link: "Enlace",
    hr: "Línea horizontal",
    justify: "Justificar",
    center: "Centrar",
    table: "Tabla",
    downloadMd: "Descargar .md",
    exportMd: "Exportar .md",
    importMd: "Importar .md",
    tagPresets: "Ajustes de etiquetas",
    commonTags: "Etiquetas comunes",
    communities: "Comunidades",
    indent: "Sangría",
    escape: "Escapar",
    codeBlock: "Bloque de código",
    inlineCode: "Código en línea",
    addTags: "Añadir etiquetas",
    attribution: "Atribución",
    linkInImg: "Enlace en imagen",
    createGrid: "Crear cuadrícula",
    account: "Cuenta",
    leftText: "Izquierda + texto",
    rightText: "Derecha + texto",
    asIs: "Como está",
    uploadToSteemit: "Subir a Steemit",
    pexelsError: "Error de Pexels",
    linkPrompt: "Enlace:",
    urlPrompt: "URL:",
    leftContent: " ✍️ ",
    rightContent: " ✍️ ",
    loadingParser: "Cargando...",
    previewError: "Error de vista previa",
    untitled: "Sin título",
    needVaultAccount: "¡Necesitas una cuenta en la Bóveda!",
    pinError: "Error de PIN: ",
    preparingUpload: "⏳ Preparando...",
    proxyAttempt: "⏳ Intento por proxy...",
    proxyError: "Error de carga",
    signingImage: "⏳ Firmando...",
    uploadingSteemit: "⏳ Subiendo...",
    serverError: "Error de servidor",
    uploadSuccess: "✅ ¡Subida con éxito!",
    uploadProgress: "⏳ Subiendo {current} de {total}...",
    uploadComplete: "✅ Subida completada.",
    pasteUrl: "Pegar URL aquí...",
    fullScreen: "Pantalla completa",
    enterNewPin: "Nuevo PIN",
    enterPinPlaceholder: "PIN",
    addAccount: "Añadir cuenta",
    usernameNoAt: "Usuario (sin @)",
    confirmResetVault: "¡Esto borrará TODO!",
    vaultUnlocked: "Bóveda desbloqueada",
    vaultLocked: "Bóveda bloqueada",
    templateName: "Nombre de plantilla...",
    vaultTitle: "Bóveda de Cuentas",
    vaultWarning: "El PIN protege la Llave Maestra.",
    pinSetup: "Configuración de PIN",
    pinSetupDesc: "Establece un PIN.",
    createVault: "CREAR BÓVEDA",
    unlockBtn: "DESCIFRAR",
    yourAccounts: "Tus Cuentas",
    newAccount: "Nueva Cuenta",
    postingKeyPlaceholder: "Posting Key",
    done: "Hecho",
    publishToSteem: "Publicar en Steem",
    vaultNotConfigured: "Bóveda no configurada.",
    setupVaultBtn: "Configurar Bóveda",
    vaultActive: "Bóveda Activa",
    vaultActiveDesc: "Puedes publicar posts.",
    selectAccount: "Seleccionar cuenta...",
    autosaveActive: "Autoguardado activo",
    clear: "Limpiar",
    saveToVault: "GUARDAR EN BÓVEDA",
    protectedByMK: "Protegido por MK",
    confirmDeleteAccount: "¿Borrar cuenta @{acc}?",
    vaultEmpty: "Bóveda vacía",
    resetVault: "Reiniciar bóveda",
    save: "GUARDAR",
    links: "ENLACES",
    text: "TEXTO",
    keys_mobile: "CLAVES",
    importTableTitle: "Importar Tabla",
    importTableDesc: "Pegue datos de Excel, Google Sheets o CSV. Los convertiremos a Markdown.",
    importTablePlaceholder: "Pegue los datos aquí...",
    importBtn: "IMPORTAR",
    settingsToolsDesc: "Seleccione las herramientas que desea ver en el menú flotante.",
    loadDraftConfirm: "¿Cargar este borrador? El texto actual será reemplazado.",
    tableFormat: "Formato de tabla",
    importTableSuccess: "¡Tabla importada con éxito!",
    pexelsKeyRequired: "Agregue su clave API de Pexels en los ajustes primero.",
    pixabayKeyRequired: "Agregue su clave API de Pixabay en los ajustes primero.",
    unsplashKeyRequired: "Agregue su clave API de Unsplash en los ajustes primero.",
    pixabayError: "Error de Pixabay: Verifique la clave API o la conexión.",
    unsplashError: "Error de Unsplash: Verifique la clave API o la conexión.",
    widgetSettings: "Ajustes del Widget",
    widgetPos: "Posición del Widget",
    posFloating: "Flotante (cerca del cursor)",
    posBottom: "Fondo del Editor (fijo)",
    posPreview: "En el panel de vista previa",
    widgetOpacity: "Opacidad del Widget",
    widgetMinimal: "Minimalista (sin bordes)",
    activeToolsSort: "Orden de herramientas activas",
    working: "Trabajando",
    ready: "Listo",
    pixabayKey: "Clave Pixabay",
    unsplashKey: "Clave Unsplash",
    performanceMode: "Modo rendimiento",
    enableThumbnails: "Miniaturas de galería",
    caption: "Subtítulo",
    addCaption: "Añadir subtítulo",
    typeHere: " ✍️ ",
    image: "Imagen",
    description: "Descripción",
    color: "Color",
    rowLayout: "Diseño en fila",
    colImgText: "Img → Texto",
    colTextImg: "Texto → Img",
    alignLeft: "Izquierda",
    alignCenter: "Centro",
    alignRight: "Derecha",
    align: "Alineación",
    gridLayout: "Diseño de cuadrícula",
    applyGroup: "Aplicar Grupo",
    redText: "Texto rojo",
    loadMore: "Cargar más",
    saveUnencrypted: "Guardar sin PIN",
    unsplashAppId: "Unsplash Application ID",
    unsplashAccessKey: "Unsplash Access Key",
    unsplashSecretKey: "Unsplash Secret Key",
    clearCache: "Limpiar caché de galería",
    textWrap: "Ajuste de texto",
    cacheCleared: "Caché de galería limpia",
    appearance: "Apariencia",
    theme: "Tema",
    font: "Fuente",
    editorTools: "Herramientas",
    vaultSecurity: "Seguridad de Bóveda",
    steemitSetup: "Configuración Steemit",
    themeCyan: "Cian",
    themeEmerald: "Esmeralda",
    themeOrange: "Naranja",
    themeRose: "Cuarzo",
    fontSans: "Sans",
    fontSerif: "Serif",
    fontMono: "Mono",
    advanced: "Avanzado",
    appAgent: "Agente de App",
    rewardType: "Tipo de recompensa",
    rewardsSP: "100% SP",
    rewards50: "50/50",
    rewards0: "Sin recompensas",
    beneficiaries: "Beneficiarios",
    addBeneficiary: "Añadir beneficiario",
    weight: "Peso (%)",
    mentionsList: "Menciones",
    parts: "partes",
    splitPost: "Dividir post",
    splitPostDesc: "Dividir texto largo.",
    minWordsPerPart: "Mín. palabras por parte",
    splitBtn: "DIVIDIR",
    splitSuccess: "¡Post dividido!",
    newPost: "Nueva publicación",
    confirmNewPost: "¿Iniciar una nueva publicación? (Se perderán los cambios no guardados)",
    gridWithCaptions: "Cuadrícula con subtítulos",
    clearfixDesc: "Evita que el texto rodee imágenes.",
    signaturePolicy: "Política de firma",
    signatureMissing: "Falta firma",
    signatureFound: "Firma encontrada",
    twoTapPublish: "Publicación rápida",
    noBeneficiaries: "Sin beneficiarios",
    confirmClearApiKeys: "¿Limpiar claves API?",
    keysCleared: "¡Claves limpias!",
    clearApiKeys: "Limpiar claves API",
    installApp: "Instalar App",
    pwaInstallDesc: "Instale Steem Editor como una aplicación rápida y ligera en su dispositivo con soporte sin conexión.",
    pwaInstalled: "¡Aplicación instalada con éxito!",
    pwaAlreadyInstalled: "La aplicación ya está instalada",
    pwaInstallFailed: "No se pudo iniciar la instalación",
    pwaPlatformSupport: "Soportado en Android, iOS, Windows y macOS.",
  },
  ko: {
    editor: "에디터",
    preview: "미리보기",
    gallery: "갤러리",
    settings: "설정",
    pwa: "PWA 설치",
    publish: "게시하기",
    drafts: "초안",
    templates: "템플릿",
    tags: "태그",
    mentions: "멘션",
    tagGroups: "태그 그룹",
    addTagGroup: "그룹 추가",
    importTable: "표 가져오기",
    schedule: "예약",
    saveDraft: "초안 저장",
    insert: "삽입",
    delete: "삭제",
    cancel: "취소",
    confirm: "확인",
    username: "사용자 이름",
    title: "제목",
    removeFirstLine: "본문에서 첫 번째 줄 제거",
    tagsPlaceholder: "여백으로 태그 구분",
    pexelsSearch: "Pexels 검색",
    noDrafts: "저장된 초안이 없습니다",
    noTemplates: "템플릿이 없습니다",
    wordsLabel: "단어 수",
    cleanWordsLabel: "순수 단어 수",
    charsLabel: "글자 수",
    words: "단어",
    chars: "자",
    clean: "정제",
    formatting: "서식",
    steemitOptions: "스팀잇 옵션",
    clearfix: "텍스트 줄바꿈 방지 (Clearfix)",
    imageFormat: "이미지 형식",
    additional: "추가 설정",
    pexelsAttribution: "Pexels 출처 표기",
    pexelsLink: "사진에 링크 포함",
    pexelsKey: "Pexels 키",
    vaultPin: "Vault PIN",
    unlock: "잠금 해제",
    lock: "잠금",
    keys: "키 설정",
    mobileEditor: "편집",
    mobilePreview: "보기",
    queue: "대기열",
    addToQueue: "대기열에 추가",
    queueEmpty: "대기열이 비어 있습니다",
    publishNext: "다음 게시물 게시",
    autoPublish: "자동 게시",
    status: "상태",
    pending: "대기 중",
    published: "게시됨",
    error: "오류",
    placeholder: "여기에 당신의 걸작을 작성해 보세요...",
    fillRequired: "모든 필수 항목을 입력해 주세요.",
    publishing: "⏳ 게시 중...",
    publishedSuccess: "✅ 게시 완료!",
    noKeychain: "Steem Keychain을 찾을 수 없습니다.",
    enterPin: "Vault를 잠금 해제하려면 PIN을 입력하세요:",
    pinRequired: "PIN이 필요합니다",
    saveSuccess: "저장되었습니다!",
    fillAll: "모든 항목을 입력하세요!",
    noAccount: "계정을 선택하세요!",
    pinShort: "PIN이 너무 짧습니다 (최소 4자)",
    vaultInit: "Vault가 초기화되었습니다!",
    accountAdded: "계정이 추가되었습니다!",
    sessionActive: "세션 활성",
    vaultClosed: "저장소 닫힘",
    bold: "굵게",
    italic: "기울임",
    strike: "취소선",
    h1: "제목 1",
    h2: "제목 2",
    h3: "제목 3",
    quote: "인용",
    link: "링크",
    hr: "가로 구분선",
    justify: "양쪽 맞춤",
    center: "가운데 맞춤",
    table: "표",
    downloadMd: ".md 다운로드",
    exportMd: ".md 내보내기",
    importMd: ".md 가져오기",
    tagPresets: "태그 프리셋",
    commonTags: "일반 태그",
    communities: "커뮤니티",
    indent: "들여쓰기",
    escape: "이스케이프",
    codeBlock: "코드 블록",
    inlineCode: "인라인 코드",
    addTags: "태그 추가",
    attribution: "출처 표기",
    linkInImg: "이미지에 링크",
    createGrid: "그리드 생성",
    account: "계정",
    leftText: "왼쪽 정렬 + 텍스트",
    rightText: "오른쪽 정렬 + 텍스트",
    asIs: "그대로",
    uploadToSteemit: "스팀잇에 업로드",
    pexelsError: "Pexels 오류",
    linkPrompt: "링크 텍스트:",
    urlPrompt: "URL 입력:",
    leftContent: " ✍️ ",
    rightContent: " ✍️ ",
    loadingParser: "로딩 중...",
    previewError: "미리보기 오류",
    untitled: "제목 없음",
    needVaultAccount: "계정을 먼저 선택하세요!",
    pinError: "PIN 오류: ",
    preparingUpload: "⏳ 준비 중...",
    proxyAttempt: "⏳ 프록시 시도 중...",
    proxyError: "업로드 실패",
    signingImage: "⏳ 서명 중...",
    uploadingSteemit: "⏳ 업로드 중...",
    serverError: "서버 오류",
    uploadSuccess: "✅ 업로드 성공!",
    uploadProgress: "⏳ 업로드 중 {current}/{total}...",
    uploadComplete: "✅ 업로드 완료.",
    pasteUrl: "URL 붙여넣기...",
    fullScreen: "전체 화면",
    enterNewPin: "새 PIN 입력",
    enterPinPlaceholder: "PIN 입력",
    addAccount: "계정 추가",
    usernameNoAt: "사용자명 (@ 제외)",
    confirmResetVault: "모든 데이터가 삭제됩니다!",
    vaultUnlocked: "저장소 잠금 해제됨",
    vaultLocked: "저장소 잠금됨",
    templateName: "템플릿 이름...",
    vaultTitle: "계정 저장소",
    vaultWarning: "PIN이 마스터 키를 보호합니다.",
    pinSetup: "PIN 설정",
    pinSetupDesc: "PIN을 설정하세요.",
    createVault: "저장소 생성",
    unlockBtn: "잠금 해제",
    yourAccounts: "내 계정",
    newAccount: "새 계정",
    postingKeyPlaceholder: "포스팅 키",
    done: "완료",
    publishToSteem: "스팀에 게시",
    vaultNotConfigured: "저장소가 설정되지 않았습니다.",
    setupVaultBtn: "저장소 설정",
    vaultActive: "저장소 활성",
    vaultActiveDesc: "게시물을 올릴 수 있습니다.",
    selectAccount: "계정 선택...",
    autosaveActive: "자동 저장 활성",
    clear: "지우기",
    saveToVault: "저장소에 저장",
    protectedByMK: "MK로 보호됨",
    confirmDeleteAccount: "@{acc} 계정을 삭제하시겠습니까?",
    vaultEmpty: "저장소가 비어 있습니다",
    resetVault: "저장소 초기화",
    save: "저장",
    links: "링크",
    text: "텍스트",
    keys_mobile: "키",
    importTableTitle: "표 가져오기",
    importTableDesc: "Excel, Google 시트, CSV 데이터를 붙여넣으세요. Markdown으로 변환됩니다.",
    importTablePlaceholder: "여기에 데이터 붙여넣기...",
    importBtn: "가져오기",
    settingsToolsDesc: "텍스트 편집 시 플로팅 메뉴에 표시할 도구를 선택하세요.",
    loadDraftConfirm: "이 초안을 불러오시겠습니까? 현재 텍스트가 대체됩니다.",
    tableFormat: "표 형식",
    importTableSuccess: "표를 성공적으로 가져왔습니다!",
    pexelsKeyRequired: "설정에서 Pexels API 키를 먼저 추가하세요.",
    pixabayKeyRequired: "설정에서 Pixabay API 키를 먼저 추가하세요.",
    unsplashKeyRequired: "설정에서 Unsplash Access Key를 먼저 추가하세요.",
    pixabayError: "Pixabay 오류: API 키 또는 연결을 확인하세요.",
    unsplashError: "Unsplash 오류: API 키 또는 연결을 확인하세요.",
    widgetSettings: "위젯 설정",
    widgetPos: "위젯 위치",
    posFloating: "플로팅 (커서 근처)",
    posBottom: "에디터 하단 (고정)",
    posPreview: "미리보기 패널",
    widgetOpacity: "위젯 투명도",
    widgetMinimal: "미니멀리스트 (테두리 없음)",
    activeToolsSort: "도구 정렬",
    working: "작업 중",
    ready: "준비됨",
    pixabayKey: "Pixabay 키",
    unsplashKey: "Unsplash 키",
    performanceMode: "성능 모드",
    enableThumbnails: "갤러리 썸네일",
    caption: "캡션",
    addCaption: "캡션 추가",
    typeHere: " ✍️ ",
    image: "이미지",
    description: "설명",
    color: "색상",
    rowLayout: "가로 레이아웃",
    colImgText: "이미지 → 텍스트",
    colTextImg: "텍스트 → 이미지",
    alignLeft: "왼쪽",
    alignCenter: "가운데",
    alignRight: "오른쪽",
    align: "정렬",
    gridLayout: "그리드 레이아웃",
    applyGroup: "그룹 적용",
    redText: "빨간 텍스트",
    loadMore: "더 불러오기",
    saveUnencrypted: "PIN 없이 저장",
    unsplashAppId: "Unsplash Application ID",
    unsplashAccessKey: "Unsplash Access Key",
    unsplashSecretKey: "Unsplash Secret Key",
    clearCache: "갤러리 캐시 삭제",
    textWrap: "텍스트 줄바꿈",
    cacheCleared: "갤러리 캐시가 삭제되었습니다",
    appearance: "모양",
    theme: "테마",
    font: "글꼴",
    editorTools: "도구",
    vaultSecurity: "보안",
    steemitSetup: "스팀잇 설정",
    themeCyan: "시안",
    themeEmerald: "에메랄드",
    themeOrange: "오렌지",
    themeRose: "로즈",
    fontSans: "Sans",
    fontSerif: "Serif",
    fontMono: "Mono",
    advanced: "고급",
    appAgent: "앱 에이전트",
    rewardType: "보상 유형",
    rewardsSP: "100% SP",
    rewards50: "50/50",
    rewards0: "보상 없음",
    beneficiaries: "수혜자",
    addBeneficiary: "수혜자 추가",
    weight: "가중치 (%)",
    mentionsList: "멘션 리스트",
    parts: "부분",
    splitPost: "포스트 분할",
    splitPostDesc: "긴 텍스트를 나눕니다.",
    minWordsPerPart: "부분당 최소 단어",
    splitBtn: "분할",
    splitSuccess: "포스트가 분할되었습니다!",
    newPost: "새 게시물",
    confirmNewPost: "새 게시물을 시작하시겠습니까? (저장하지 않은 변경 사항은 손실됩니다)",
    gridWithCaptions: "캡션이 있는 그리드",
    clearfixDesc: "이미지 뒤에 텍스트 줄바꿈을 방지합니다.",
    signaturePolicy: "서명 확인",
    signatureMissing: "서명 누락",
    signatureFound: "서명 확인됨",
    twoTapPublish: "빠른 게시",
    noBeneficiaries: "수혜자 없음",
    confirmClearApiKeys: "API 키를 삭제하시겠습니까?",
    keysCleared: "API 키가 삭제되었습니다!",
    clearApiKeys: "API 키 삭제",
    installApp: "앱 설치",
    pwaInstallDesc: "오프라인 지원을 제공하는 빠르고 가벼운 앱으로 Steem Editor를 기기에 설치하세요.",
    pwaInstalled: "앱이 성공적으로 설치되었습니다!",
    pwaAlreadyInstalled: "앱이 이미 설치되어 있습니다",
    pwaInstallFailed: "설치를 시작하지 못했습니다",
    pwaPlatformSupport: "Android, iOS, Windows 및 macOS에서 지원됩니다.",
  }
};

// Ensure Buffer is available globally for some libraries
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

const DOM_PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'hr', 'br', 'span', 'strike', 'sup', 'sub', 'center'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'className', 'style', 'title', 'target', 'rel', 'referrerpolicy'],
  ADD_CLASSES: {
    div: ['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center', 'clearfix', 'phishy', 'text-blue', 'text-green'],
    p: ['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center', 'clearfix', 'phishy', 'text-blue', 'text-green'],
    span: ['phishy', 'text-blue', 'text-green'],
    img: ['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center']
  }
};

// Access libraries
const getMarked = () => {
  // In modern marked (v4+), we should use marked.use()
  if (marked && (marked as any).use) {
    (marked as any).use({
      breaks: true,
      gfm: true,
      mangle: false,
      headerIds: false
    });
  } else if (marked && (marked as any).setOptions) {
    (marked as any).setOptions({
      breaks: true,
      gfm: true
    });
  }

  return {
    parse: async (text: string) => {
      if (!marked || !marked.parse) return text;
      try {
        // Normalize line endings
        let normalizedText = text.replace(/\r\n/g, '\n');

        // Prevent non-table text from being merged into preceding tables
        const strictTableLines = [];
        const lines = normalizedText.split('\n');
        let inTable = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const isSeparator = /^[\s|:-]+$/.test(line) && line.includes('-') && line.includes('|');
          
          if (isSeparator && i > 0 && lines[i-1].includes('|')) {
            inTable = true;
            strictTableLines.push(line);
            continue;
          }
          
          if (inTable) {
            if (line.trim() === '') {
              inTable = false;
            } else if (!line.includes('|')) {
              strictTableLines.push('');
              inTable = false;
            }
          }
          
          strictTableLines.push(line);
        }
        normalizedText = strictTableLines.join('\n');

        // Preserve consecutive blank lines (3 or more newlines) outside of code blocks
        normalizedText = normalizedText.replace(/(```[\s\S]*?```|`[^`\n]*`)|(\n{3,})/g, (match, code, newlines) => {
          if (code) return code;
          const count = newlines.length - 2;
          return '\n\n' + Array(count).fill('<br>').join('') + '\n\n';
        });

        let textWithImageMarkdown = convertBareImageUrlsToMarkdown(normalizedText);
        
        // Preprocess to convert markdown images inside pull-left/pull-right divs or center tags to <img> tags
        textWithImageMarkdown = textWithImageMarkdown.replace(/(<div[^>]*class="[^"]*pull-(?:left|right)[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/gi, (m, open, htmlContent, close) => {
          const processedContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
          return open + processedContent + close;
        });
        textWithImageMarkdown = textWithImageMarkdown.replace(/(<div[^>]*class='[^']*pull-(?:left|right)[^']*'[^>]*>)([\s\S]*?)(<\/div>)/gi, (m, open, htmlContent, close) => {
          const processedContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
          return open + processedContent + close;
        });
        textWithImageMarkdown = textWithImageMarkdown.replace(/(<center[^>]*>)([\s\S]*?)(<\/center>)/gi, (m, open, htmlContent, close) => {
          const processedContent = htmlContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
          return open + processedContent + close;
        });

        // marked.parse can be sync or async
        let html = await marked.parse(textWithImageMarkdown);
        
        // Map image titles representing alignment classes to actual class attributes
        html = html.replace(/<img([^>]*)title="([^"]+)"([^>]*)/gi, (m, p1, title, p2) => {
          if (['pull-left', 'pull-right', 'text-justify', 'text-right', 'text-center'].includes(title)) {
            const hasClass = p1.includes('class="') || p2.includes('class="');
            if (hasClass) {
              return m;
            } else {
              return `<img${p1}class="${title}" title="${title}"${p2}`;
            }
          }
          return m;
        });

        if (DOMPurify) {
          return DOMPurify.sanitize(html, DOM_PURIFY_CONFIG as any) as unknown as string;
        }
        return html;
      } catch (e) {
        console.error('Markdown parse error:', e);
        return text;
      }
    }
  };
};
// --- Constants ---
const STORAGE_KEY_DRAFTS = 'steem_drafts_v2';
const STORAGE_KEY_TEMPLATES = 'steem_templates_v2';
const STORAGE_KEY_USERS = 'steem_users_v2';
const STORAGE_KEY_AUTOSAVE = 'steem_autosave_temp';
const STORAGE_KEY_FLOAT_CONFIG = 'steem_float_config';
const STORAGE_KEY_IMAGES = 'steem_uploaded_images_v2';
const STORAGE_KEY_QUEUE = 'steem_queue_v2';

const DEFAULT_FLOAT_TOOLS = ['B', 'I', 'sub', 'sup', 'Img', 'Caption', 'Mentions', 'Table', 'Separator', 'Grid', 'HR'];

// --- Components ---

const IconButton = ({ 
  icon: Icon, 
  onClick, 
  title, 
  className, 
  active = false 
}: { 
  icon: any, 
  onClick: (e?: React.MouseEvent | any) => void, 
  title?: string, 
  className?: string,
  active?: boolean
}) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault()}
    title={title}
    className={cn(
      "p-2 rounded-md transition-all duration-200 flex items-center justify-center shrink-0",
      "hover:bg-slate-700/50 active:scale-95",
      active ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400",
      className
    )}
  >
    <Icon className="w-[clamp(1rem,1.1vw,1.25rem)] h-[clamp(1rem,1.1vw,1.25rem)]" />
  </button>
);

const APP_CHANGELOG = [
  {
    version: "v4.3.8",
    date: "2026-07-23",
    changes: [
      "Multi-Threaded Parsing Engine: Integrated Web Workers (useEditorWorker) to offload heavy Markdown-to-HTML and HTML-to-Markdown conversions, preventing UI freezes even with 200k+ lines of text.",
      "Ultra Steem Editor Branding: Successfully rebranded the application to Ultra Steem Editor, reflecting its high-performance professional focus.",
      "Interface Polish: Refined list rendering (ul/li) in the WYSIWYG editor, eliminating unwanted vertical margins and fixing indentation inconsistencies.",
      "Extreme Performance Mode: Enhanced Performance Mode to completely bypass Framer Motion animations and heavy CSS transitions for absolute zero-latency writing.",
      "Repository Optimization: Organized the project root by moving 50+ legacy fix/diagnostic scripts into a structured /tets_and_fix directory.",
      "Large File Stability: Improved document handling in the browser cache and local synchronization layers for maximum reliability."
    ]
  },
  {
    version: "v3.9.9",
    date: "2026-07-18",
    changes: [
      "Gallery Minimization: Added support for collapsing the gallery view to save space.",
      "Dynamic Editor Expansion: Expanded the text input area on the main screen for a more comfortable editing experience.",
      "Developer Branding: Removed specific community/author branding from the application info panel."
    ]
  },
  {
    version: "v3.8.0",
    date: "2026-07-16",
    changes: [
      "Progressive Web App (PWA) Support: Added support for installing Steem Editor Pro directly on devices (Android, iOS, Windows, macOS) for faster startup times and fully offline-capable operations.",
      "Service Worker Caching: Implemented sw.js to automatically manage local caching of HTML, CSS, fonts, and icons, enabling reliable offline startup and content editing.",
      "Unified Install Experience: Added a conditional PWA Install button in the header with a pulsing notification indicator, alongside a dedicated PWA Install tab in the settings modal with detailed platform compatibility instructions."
    ]
  },
  {
    version: "v3.7.3",
    date: "2026-07-15",
    changes: [
      "Direct Layout Popover: Added a high-accessibility inline Spacing and Icon Size controller right next to the sync toggles in the editor header, eliminating the need to dig into the global settings menu.",
      "Perfect Theme Adaptation: Refactored the synchronization headers, status badges, and tabs to completely support dynamic light and dark theme colors, resolving light-theme visual consistency issues.",
      "Intelligent Breakpoint Visibility: Enhanced responsive layout constraints from `sm` to `md` for editor status labels to completely prevent text overlaps and crowded toolbar layouts on medium-sized screens."
    ]
  },
  {
    version: "v3.7.2",
    date: "2026-07-15",
    changes: [
      "Custom Sizing and Spacing Engine: Added user-configurable controls for toolbar icon sizes and WYSIWYG paragraph spacing, with local storage persistence and presets (Compact, Balanced, Normal, Spacious) to minimize visual discrepancy between Code and Visual modes.",
      "Light Theme Compatibility Optimization: Upgraded the synchronization header overlays, status badges, and tabs to dynamically adapt colors in Light and Dark modes, preventing dark-theme-only visual artifacts.",
      "Responsive Layout Overlap Prevention: Improved breakpoints for real-time status indicators and editor pane controls to prevent content squeezing and visual overlap on smaller screens.",
      "Zero-Transparency Floating UI: Eliminated transparency and alpha blending from the primary floating tools widget and its sub-dropdown settings, improving readability and significantly easing browser composting workloads.",
      "No-Blur Performance Layout: Removed backdrop blurs, transition delays, and nested box-shadow effects from main overlays, side menus, and table controls to minimize GPU paint times.",
      "Optimized Solid Containers: Reconfigured the preview panel background and toolbars as completely solid opaque surfaces to optimize sub-pixel layout rendering and eliminate flickering pixels on rapid text input."
    ]
  },
  {
    version: "v3.7.1",
    date: "2026-07-15",
    changes: [
      "State Preservation Across Reloads: Persisted the active editor mode in localStorage, so users who prefer typing in Markdown Code mode stay in that mode upon reloading or returning to the page.",
      "Visual Stale-Flag Protocol: Introduced an intelligent stale-flag (steem_visual_html_is_stale) mechanism that invalidates cached raw HTML whenever the user modifies raw Markdown content in Code mode. This ensures that switching back to Visual mode or refreshing the page correctly translates and loads the fresh edits, completely preventing data loss.",
      "Zustand-Cascading Synchronization: Optimized the reactive state pipeline, ensuring that any asynchronous content changes gracefully cascade through the debounced save engine regardless of the active view pane."
    ]
  },
  {
    version: "v3.7.0",
    date: "2026-07-14",
    changes: [
      "Visual-to-Code Sync Controller: Replaced the complex Settings gear dropdown menu with a single, highly intuitive Real-Time Sync Toggle (RefreshCw icon) on the WYSIWYG toolbar.",
      "Two-Tier Synchronization: Real-Time Sync (Active/Immediate HTML-to-Markdown) and Background Sync (Default/Lag-Free debounced background sync engine on idle or switch) to guarantee maximum writing performance.",
      "O(1) Spacer Optimization: Replaced expensive DOM queries (querySelectorAll) with high-performance O(1) direct relative traversal under the cursor (via .closest() and lastElementChild checks).",
      "CSS Containment Geometry: Added 'contain: layout style' to all block elements in the WYSIWYG editor to isolate element geometry and prevent full-document browser reflows during typing."
    ]
  },
  {
    version: "v3.6.5",
    date: "2026-07-12",
    changes: [
      "Precision Cursor Synchronization: Rewrote scrolling logic when switching from Code to Visual editor by mathematically calculating the exact Y-pixel coordinate of the caret and centering the exact line perfectly.",
      "Accurate Visual-to-Markdown Cursor Restoration: Rebuilt the switching cursor algorithm to calculate exact text wrapping dimensions and restore the exact vertical scroll coordinate, eliminating under-scrolling.",
      "Refined Widget Clearance: Decreased the bottom margin between the editor and the docked widget to 85px, eliminating the excessive blank strip while keeping a clean 13px gap above the floating UI."
    ]
  },
  {
    version: "v3.6.1",
    date: "2026-07-10",
    changes: [
      "GPU Resource Optimization: Refactored heavy CSS effects, including conditional backdrop-blur and transparency, to dynamically disable/simplify on performance-limited modes. This significantly reduces GPU load and enhances responsiveness on lower-end devices.",
      "Fixed: Resolved issue with cursor position saving, ensuring consistent behavior in both directions.",
      "Scroll Optimization: Eliminated scroll jumping in Markdown mode and added a comfortable typing gap above the floating widget."
    ]
  },
  {
    version: "v3.6.0",
    date: "2026-07-05",
    changes: [
      "Active Formatting in Widget: Connected the active format states (Bold, Italic, Strikethrough, Subscript, Superscript, Inline Code, and Color block) to the buttons on the floating widget panel, providing instant visual feedback on active text formatting.",
      "Localized WYSIWYG Spacers: Implemented automatic generation of top and bottom visual placeholders/spacers around complex elements with language-aware guide messages.",
      "Unified Block/Tag Breakout: Refined block container escape mechanism for BLOCKQUOTE, headings, and code blocks.",
      "Smart Space Trimming on Formatting Exit: Added automatic cleanup of inner margins for formatting tags to prevent rendering glitches.",
      "Code Editor Scroll Jumping: Fixed issue where inserting Markdown tables or custom presets would scroll the container back to the top.",
      "Enhanced WYSIWYG Spacer Styling: Polished spacer visual appearance for improved editor clarity."
    ]
  },
  {
    version: "v3.5.0",
    date: "2026-05-24",
    changes: [
      "Universal Markdown Export: Drafts are now exported as a ZIP archive of .md files for better compatibility.",
      "Smart Table Padding: Automatically ensures blank lines around tables to prevent rendering breaks in external readers.",
      "Enhanced Single Export: Individual post downloads now include titles as H1 and tags as metadata.",
      "ZIP Restore Support: Drafts can be restored directly from ZIP archives containing Markdown files.",
      "Cleaner Interface: Removed legacy JSON backup options in favor of universal Markdown standard."
    ]
  },
  {
    version: "v3.3.0",
    date: "2026-05-22",
    changes: [
      "Vote Logging System: Record all curation activities with permlinks and authors.",
      "Export Curation Report: Professional Markdown download for your curation logs.",
      "Fixed React warnings (uncontrolled components) in Editor and Reader.",
      "Enhanced Optimistic UI for vote results in the Curation Feed.",
      "Persistent state for curation logs stored in LocalStorage."
    ]
  },
  {
    version: "v3.2.3",
    date: "2026-05-22",
    changes: [
      "Added publishing option to dynamically remove the first line (title) from the broadcasted post.",
      "Temporarily disabled heavy external font resources to dramatically reduce network load.",
      "Improved Ukrainian Transliterator rules for specific letter combinations and symbols.",
      "Enhanced UI responsiveness in the Feed Reader with a compact layout for mobile and desktop.",
      "Refined regex patterns for Steemit @mention extraction, securely filtering standard URLs.",
      "Introduced an internal application Changelog tracking dashboard."
    ]
  },
  {
    version: "v3.2.0",
    date: "2026-05-20",
    changes: [
      "Deployed fully integrated Feed Reader module for viewing Steem posts.",
      "Enabled on-chain operations: commenting and upvoting directly from the app.",
      "Implemented advanced Tag Groups and Presets system for faster curation."
    ]
  },
  {
    version: "v3.1.0",
    date: "2026-05-18",
    changes: [
      "Introduced Web Crypto (AES-GCM) Secured Vault for Steem private keys.",
      "Added mandatory PIN protection for active session security.",
      "Implemented multi-account switching and secure credential storage via IndexedDB."
    ]
  },
  {
    version: "v3.0.0",
    date: "2026-05-15",
    changes: [
      "Major UI/UX overhaul to the \"Platinum\" dark theme with Tailwind CSS.",
      "Integrated complete Ukrainian language localization alongside English.",
      "Added Floating Widget toolbox for quick formatting access."
    ]
  },
  {
    version: "v2.5.0",
    date: "2026-05-10",
    changes: [
      "Built comprehensive Gallery system with local IndexedDB chunked storage.",
      "Added Markdown templates and persistent auto-saving Drafts engine.",
      "Real-time character, word, and reading-time analytics integration."
    ]
  },
  {
    version: "v1.0.0",
    date: "2026-05-01",
    changes: [
      "Initial release of SteemEditor core with Github Flavored Markdown.",
      "Built-in live preview and basic Steem blockchain broadcast capabilities via dsteem."
    ]
  }
];

const getChangelogText = () => "SteemEditor Pro Updates:\n\n" + APP_CHANGELOG.map(log => 
  `${log.version} (${log.date})\n` + log.changes.map(c => `- ${c}`).join('\n')
).join('\n\n');

const isInsideTagInLine = (line: string, caretPosInLine: number, openTag: string, closeTag: string = openTag) => {
  const openLen = openTag.length;
  const closeLen = closeTag.length;
  
  if (openTag === closeTag) {
    const tagLen = openLen;
    const indices: number[] = [];
    let idx = line.indexOf(openTag);

    while (idx !== -1) {
      const isEscaped = idx > 0 && line[idx - 1] === '\\';
      const isSpuriousStar = openTag === '*' && (
        (idx > 0 && line[idx - 1] === '*') || 
        (idx + 1 < line.length && line[idx + 1] === '*')
      );

      if (!isEscaped && !isSpuriousStar) {
        indices.push(idx);
      }
      idx = line.indexOf(openTag, idx + tagLen);
    }

    for (let i = 0; i < indices.length; i += 2) {
      if (i + 1 < indices.length) {
        const start = indices[i] + tagLen;
        const end = indices[i + 1];
        if (caretPosInLine >= start && caretPosInLine <= end) {
          return true;
        }
      }
    }
  } else {
    const openIndices: number[] = [];
    let oIdx = line.indexOf(openTag);
    while (oIdx !== -1) {
      if (!(oIdx > 0 && line[oIdx - 1] === '\\')) {
        openIndices.push(oIdx);
      }
      oIdx = line.indexOf(openTag, oIdx + openLen);
    }

    const closeIndices: number[] = [];
    let cIdx = line.indexOf(closeTag);
    while (cIdx !== -1) {
      if (!(cIdx > 0 && line[cIdx - 1] === '\\')) {
        closeIndices.push(cIdx);
      }
      cIdx = line.indexOf(closeTag, cIdx + closeLen);
    }

    for (let i = 0; i < openIndices.length; i++) {
      const oPos = openIndices[i];
      const cPos = closeIndices.find(c => c > oPos);
      if (cPos !== undefined) {
        if (caretPosInLine >= oPos + openLen && caretPosInLine <= cPos) {
          return true;
        }
      }
    }
  }
  return false;
};

// Helper functions for path-based DOM node tracking
function getNodePath(root: Node, target: Node): number[] | null {
  if (root === target) return [];
  for (let i = 0; i < root.childNodes.length; i++) {
    const path = getNodePath(root.childNodes[i], target);
    if (path) return [i, ...path];
  }
  return null;
}

function getNodeByPath(root: Node, path: number[]): Node | null {
  let curr = root;
  for (const idx of path) {
    if (!curr.childNodes || idx >= curr.childNodes.length) return null;
    curr = curr.childNodes[idx];
  }
  return curr;
}

function MobileStatsBar({ visualStyle, isDarkMode, t }: any) {
  const stats = useEditorStore(state => state.stats);
  const cleanStats = useEditorStore(state => state.cleanStats);
  return (
    <div className={cn(
      "lg:hidden flex items-center justify-between px-4 py-2 border-b text-[10px] font-medium uppercase tracking-widest shrink-0 transition-colors",
      visualStyle === 'neon' ? "bg-slate-950 border-slate-800/80 text-slate-400" : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-600")
    )}>
      <div className="flex gap-4 items-center">
        <span>{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span>{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
      </div>
    </div>
  );
}

function DesktopStatsFooter({ t }: any) {
  const stats = useEditorStore(state => state.stats);
  const cleanStats = useEditorStore(state => state.cleanStats);
  return (
    <footer className="hidden lg:flex h-8 border-t border-slate-800 bg-slate-900 items-center px-4 justify-between text-[10px] font-medium text-slate-500 uppercase tracking-widest">
      <div className="flex gap-4 items-center">
        <span>{t('wordsLabel')}: {stats?.words || 0}</span>
        <span className="text-cyan-400">{t('cleanWordsLabel')}: {cleanStats?.words || 0}</span>
        <span>{t('charsLabel')}: {stats?.chars || 0}</span>
        <ReadingTimeBadge splitWords={300} t={t} />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>{t('autosaveActive')}</span>
      </div>
    </footer>
  );
}

function ReadingTimeBadge({ splitWords, t }: any) {
  const stats = useEditorStore(state => state.stats);
  return (
    <span className="flex items-center gap-1 text-cyan-500 font-bold uppercase tracking-widest text-[10px]">
      <Clock size={10} className="inline" />
      {Math.ceil((stats?.words || 0) / (splitWords || 300))} {t('minRead')}
    </span>
  );
}

function App() {
  // --- State ---
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'editor' | 'reader'>('editor');
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('steem_lang');
    if (saved && ['uk', 'en', 'es', 'ko'].includes(saved)) return saved as Language;
    const browserLang = navigator?.language?.slice(0, 2);
    if (['uk', 'en', 'es', 'ko'].includes(browserLang || '')) return browserLang as Language;
    return 'uk';
  });

  const t = useCallback((key: keyof typeof translations['uk']) => (translations[lang] as any)[key] || key, [lang]);

  const contentForPublish = useEditorStore(state => activeModal === 'publish' ? state.content : '');
  const setContent = useEditorStore(state => state.setContent);
  const stats = useEditorStore(state => state.stats);
  const [splitWords, setSplitWords] = useState(300);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [widgetOpacity, setWidgetOpacity] = useState(() => {
    const saved = localStorage.getItem('widget_opacity');
    return saved !== null ? Number(saved) : 1.0;
  });
  const [widgetNoBorder, setWidgetNoBorder] = useState(() => {
    const saved = localStorage.getItem('widget_no_border');
    return saved === null ? true : saved === 'true';
  });
  const [images, setImages] = useState<ImageItem[]>([]);
  const isImagesLoaded = useRef(false);
  const [sourceInput, setSourceInput] = useState('');
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [tableSelectorPos, setTableSelectorPos] = useState<{x: number, y: number, direction: 'up' | 'down'} | null>(null);
  const [tableHover, setTableHover] = useState({ r: 0, c: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditorFullScreen, setIsEditorFullScreen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!previewRef.current) return;
    if (!document.fullscreenElement) {
      previewRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const toggleEditorFullScreen = () => {
    if (!editorPaneRef.current) return;
    if (!document.fullscreenElement) {
      editorPaneRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    probeNodes();
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(document.fullscreenElement === previewRef.current);
      setIsEditorFullScreen(document.fullscreenElement === editorPaneRef.current);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'markdown'>(() => {
    return (localStorage.getItem('steem_editor_mode') as 'visual' | 'markdown') || 'visual';
  });
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    code: false,
    strikethrough: false,
    sub: false,
    sup: false,
    phishy: false
  });
  const [floatingPos, setFloatingPos] = useState<{ x: number, y: number } | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_QUEUE);
    return saved ? JSON.parse(saved) : [];
  });
  const [scheduledTime, setScheduledTime] = useState('');
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [isGallerySettingsCollapsed, setIsGallerySettingsCollapsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [gallerySearch, setGallerySearch] = useState('');
  const [galleryView, setGalleryView] = useState<'grid' | 'list'>('grid');
  const [galleryMode, setGalleryMode] = useState<'local' | 'pexels' | 'unsplash' | 'pixabay'>('local');
  const [pexelsApiKey, setPexelsApiKey] = useState<string | null>(null);
  const [pixabayApiKey, setPixabayApiKey] = useState<string | null>(() => localStorage.getItem('steem_pixabay_key'));
  const [unsplashAccessKey, setUnsplashAccessKey] = useState<string | null>(() => localStorage.getItem('steem_unsplash_access_key'));
  
  const [pexelsPage, setPexelsPage] = useState(1);
  const [pexelsResults, setPexelsResults] = useState<any[]>(() => {
    const cached = localStorage.getItem('steem_gallery_cache_results');
    if (!cached) return [];
    try {
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set();
      return parsed.filter(p => {
        const key = p.id + p.source;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch { return []; }
  });
  const [isSearchingPexels, setIsSearchingPexels] = useState(false);
  
  const [performanceMode, setPerformanceMode] = useState(() => localStorage.getItem('steem_performance_mode') !== 'false');

  const saveLargeStorage = useCallback((key: string, val: string) => {
    try {
      localStorage.setItem(key, val);
    } catch (e) {
      console.warn(`LocalStorage quota exceeded for ${key} (large document):`, e);
      try {
        sessionStorage.setItem(key, val);
      } catch (err) {
        console.warn('SessionStorage quota exceeded as well:', err);
      }
    }
  }, []);

  const getMotionConfig = useCallback((custom?: { initial?: any; animate?: any; exit?: any }) => {
    if (performanceMode) {
      return {
        initial: false,
        animate: custom?.animate || { opacity: 1, scale: 1, y: 0, x: 0 },
        exit: false as any,
        transition: { duration: 0 }
      };
    }
    return {
      initial: custom?.initial || { opacity: 0, y: 10, scale: 0.95 },
      animate: custom?.animate || { opacity: 1, y: 0, scale: 1 },
      exit: custom?.exit || { opacity: 0, y: 10, scale: 0.95 },
      transition: { duration: 0.15 }
    };
  }, [performanceMode]);

  const getSidebarMotionConfig = useCallback(() => {
    if (performanceMode) {
      return {
        initial: false,
        animate: { x: 0, opacity: 1 },
        exit: false as any,
        transition: { duration: 0 }
      };
    }
    return {
      initial: { x: -300, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -300, opacity: 0 },
      transition: { duration: 0.3 }
    };
  }, [performanceMode]);
  const [tempPexelsKey, setTempPexelsKey] = useState('');
  const [tempPixabayKey, setTempPixabayKey] = useState('');
  const [tempUnsplashAccessKey, setTempUnsplashAccessKey] = useState('');
  const [savePexelsUnencrypted, setSavePexelsUnencrypted] = useState(() => {
    return localStorage.getItem('steem_pexels_unencrypted') === 'true';
  });
  
  const [gridWithCaptions, setGridWithCaptions] = useState(false);
  const [singleCaptionAlign, setSingleCaptionAlign] = useState<'center' | 'left' | 'right'>('center');
  const [gridLayout, setGridLayout] = useState<'col' | 'col-table' | 'row' | 'grid-2' | 'col-img-text' | 'col-text-img'>('col');

  const [pexelsSettings, setPexelsSettings] = useState(() => {
    const saved = localStorage.getItem('steem_pexels_settings');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && typeof parsed === 'object') ? parsed : {
        withAttribution: true,
        linkEmbedded: true
      };
    } catch {
      return {
        withAttribution: true,
        linkEmbedded: true
      };
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const lastWidth = useRef(window.innerWidth);
  const [widgetPos, setWidgetPos] = useState<'floating' | 'bottom'>(() => {
    const saved = localStorage.getItem('steem_widget_pos');
    return (saved === 'bottom' ? 'bottom' : 'floating');
  });
  const [enabledTools, setEnabledTools] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FLOAT_CONFIG);
    try {
      const initial = saved ? JSON.parse(saved) : DEFAULT_FLOAT_TOOLS;
      return Array.isArray(initial) ? Array.from(new Set(initial)) : DEFAULT_FLOAT_TOOLS;
    } catch {
      return DEFAULT_FLOAT_TOOLS;
    }
  });

  // Configure marked for Steem-like behavior
  useEffect(() => {
    if (marked && (marked as any).use) {
      (marked as any).use({ breaks: true, gfm: true });
    }
  }, []);
  

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('steem_dark_mode') !== 'false');
  const [visualStyle, setVisualStyle] = useState<'standard' | 'neon'>(() => (localStorage.getItem('steem_visual_style') as 'standard' | 'neon') || 'standard');
  const [syncScrollEnabled, setSyncScrollEnabled] = useState(() => localStorage.getItem('steem_sync_scroll') !== 'false');
  const [isGalleryCollapsed, setIsGalleryCollapsed] = useState(() => localStorage.getItem('steem_gallery_collapsed') === 'true');
  const [isLivePreviewEnabled, setIsLivePreviewEnabled] = useState(() => localStorage.getItem('steem_live_preview_enabled') === 'true');

  useEffect(() => {
    localStorage.setItem('steem_gallery_collapsed', String(isGalleryCollapsed));
  }, [isGalleryCollapsed]);

  useEffect(() => {
    localStorage.setItem('steem_live_preview_enabled', String(isLivePreviewEnabled));
  }, [isLivePreviewEnabled]);
  const [settingsTab, setSettingsTab] = useState<'general' | 'gallery' | 'vault' | 'keys' | 'about' | 'pwa'>('general');
  const [systemDialog, setSystemDialog] = useState<{
    type: 'confirm' | 'prompt' | 'alert',
    title: string,
    message: string,
    resolve: (val: any) => void,
    defaultValue?: string,
    placeholder?: string
  } | null>(null);

  useEffect(() => {
    if (activeModal === null && !systemDialog) {
      setTimeout(() => {
        editorRef.current?.focus();
      }, 100);
    }
  }, [activeModal, systemDialog]);

  const confirmDialog = useCallback((message: string, title?: string) => {
    return new Promise<boolean>((resolve) => {
      setSystemDialog({ 
        type: 'confirm', 
        title: title || t('confirm'), 
        message, 
        resolve 
      });
    });
  }, [t]);

  const promptDialog = useCallback((message: string, defaultValue: string = "", title?: string) => {
    return new Promise<string | null>((resolve) => {
      setSystemDialog({ 
        type: 'prompt', 
        title: title || t('link'), 
        message, 
        resolve, 
        defaultValue 
      });
    });
  }, [t]);

  const [tableImportText, setTableImportText] = useState('');
  const [tableImportFormat, setTableImportFormat] = useState<'markdown' | 'html'>('markdown');

  // Memoized filtered lists to reduce processing during each render
  const filteredLocalImages = useMemo(() => {
    return images.filter(img => img.name.toLowerCase().includes(gallerySearch.toLowerCase()));
  }, [images, gallerySearch]);

  const isFirstRender = useRef(true);

  // Update preview HTML when content or marked changes
  useEffect(() => {
    const preview = previewPaneRef.current;
    if (!isLivePreviewEnabled) {
      if (preview && !preview.querySelector('svg.opacity-40')) {
        preview.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2 py-12 text-center select-none">
          <svg class="w-8 h-8 opacity-40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <p>${lang === 'uk' ? "Прев'ю вимкнено для економії ресурсів.<br>Натисніть кнопку з оком, щоб увімкнути знову." : "Live Preview disabled to save resources.<br>Click the eye icon to enable again."}</p>
        </div>`;
      }
      return;
    }

    const updatePreview = async () => {
      const m = getMarked();
      if (!m) {
        if (preview) {
          Idiomorph.morph(preview, `<p class="text-slate-500 italic">${t('loadingParser')}</p>`, { morphStyle: 'innerHTML' });
        }
        return;
      }
      try {
        const currentContent = import('./store').then(({ useEditorStore }) => {
          return useEditorStore.getState().content;
        });
        const mdContent = await currentContent;
        const processed = processContentForSteem(mdContent);
        let finalHtml = (await m.parse(processed)) as string;
        
        // Add referrerpolicy="no-referrer" and loading="lazy" to all img tags for better compatibility and massive GPU/CPU savings
        finalHtml = finalHtml.replace(/<img /g, '<img referrerpolicy="no-referrer" loading="lazy" ');
        
        let isAtBottom = false;
        if (preview) {
          isAtBottom = preview.scrollHeight > 0 && preview.scrollHeight - preview.scrollTop - preview.clientHeight <= 20;
        }
        
        const purifiedHtml = DOMPurify ? (DOMPurify.sanitize(finalHtml, DOM_PURIFY_CONFIG as any) as unknown as string) : (finalHtml as unknown as string);
        
        if (preview) {
          Idiomorph.morph(preview, purifiedHtml, { morphStyle: 'innerHTML' });
          
          if (syncScrollEnabled && isAtBottom) {
            requestAnimationFrame(() => {
              preview.scrollTop = preview.scrollHeight;
            });
          }
        }
      } catch (e) {
        console.error("Marked parse error", e);
        if (preview) {
          Idiomorph.morph(preview, `<p class="text-red-500">${t('previewError')}</p>`, { morphStyle: 'innerHTML' });
        }
      }
    };

    if (isFirstRender.current) {
      isFirstRender.current = false;
      updatePreview();
      return;
    }

    let timer: any;
    const unsubscribe = import('./store').then(({ useEditorStore }) => {
      // Trigger update immediately if needed, or wait for next changes
      if (!isLivePreviewEnabled) updatePreview(); 
      else {
        timer = setTimeout(updatePreview, 300);
      }
      return useEditorStore.subscribe((state, prevState) => {
        if (state.content !== prevState.content) {
          // Skip expensive markdown preview parsing/morphing in background while user types in visual editor
          if (editorMode === 'visual') return;
          if (timer) clearTimeout(timer);
          timer = setTimeout(updatePreview, 300);
        }
      });
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe.then(unsub => unsub());
    };
  }, [t, syncScrollEnabled, isLivePreviewEnabled, lang, editorMode]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [newMention, setNewMention] = useState('');
  
  // Auth & Publish
  const [authType, setAuthType] = useState<AuthType | 'VAULT'>('KEYCHAIN');
  const [username, setUsername] = useState(() => localStorage.getItem('steem_username') || '');
  const [selectedVaultUser, setSelectedVaultUser] = useState('');
  const [showAccountPrompt, setShowAccountPrompt] = useState(() => !localStorage.getItem('steem_username'));
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('steem_notif_enabled') !== 'false');
  
  const [notifications, setNotifications] = useState<SteemNotification[]>([]);
  const [rawNotifications, setRawNotifications] = useState<any[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState<SteemNotification | null>(null);
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [showMobileToolsOpen, setShowMobileToolsOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileTools1, setShowMobileTools1] = useState(false);
  const [showMobileTools2, setShowMobileTools2] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mobile-tools-container')) {
        setShowMobileTools1(false);
        setShowMobileTools2(false);
        setShowMobileToolsOpen(false);
      }
    };
    if (showMobileTools1 || showMobileTools2 || showMobileToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileTools1, showMobileTools2, showMobileToolsOpen]);

  const [targetReaderPost, setTargetReaderPost] = useState<{ author: string, permlink: string, commentAuthor?: string, commentPermlink?: string } | null>(null);
  const [mutedUsers, setMutedUsers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('steem_muted_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const visibleNotifications = useMemo(() => {
    return notifications.filter(n => !mutedUsers.includes(n.author) && (!n.parent_author || !mutedUsers.includes(n.parent_author)));
  }, [notifications, mutedUsers]);
  const lastFetchedNotificationTime = useRef<string | null>(localStorage.getItem('steem_last_notif_time'));

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    
    try {
        const saved = localStorage.getItem('steem_hidden_replies');
        const hiddenSet = new Set<string>(saved ? JSON.parse(saved) : []);
        rawNotifications.forEach(r => hiddenSet.add(r.permlink));
        localStorage.setItem('steem_hidden_replies', JSON.stringify(Array.from(hiddenSet).slice(-200)));
    } catch (e) {
        console.error("Failed to mark all as read", e);
    }

    window.dispatchEvent(new Event('steem_mark_all_read'));
  };

  const currentUser = authType === 'VAULT' ? selectedVaultUser : username;

  // Persistence
  useEffect(() => {
    localStorage.setItem('steem_username', username);
  }, [username]);

  useEffect(() => {
    localStorage.setItem('steem_notif_enabled', String(notifEnabled));
  }, [notifEnabled]);

  // Fetch muted users globally
  useEffect(() => {
    if (!currentUser) {
      setMutedUsers([]);
      return;
    }

    const fetchMuted = async () => {
      try {
        const result = await callWithFallback('condenser_api.get_following', [currentUser, '', 'ignore', 1000]);
        if (result && Array.isArray(result)) {
          const fetched = result.map((f: any) => f.following);
          setMutedUsers(fetched);
          localStorage.setItem('steem_muted_users', JSON.stringify(fetched));
        }
      } catch (err) {
        console.warn("Failed to fetch muted users globally:", err);
      }
    };

    fetchMuted();
    const interval = setInterval(fetchMuted, 300000); // 5 mins
    return () => clearInterval(interval);
  }, [currentUser]);

  // Poll for notifications
  useEffect(() => {
    if (!currentUser || !notifEnabled) return;

    const fetchNotifs = async () => {
      try {
        let readerConfig: any = null;
        try {
          const saved = localStorage.getItem('steem_reader_config_v1');
          if (saved) readerConfig = JSON.parse(saved);
        } catch {
          // ignore
        }
        
        if (readerConfig && readerConfig.autoShowInbox === false) {
           return;
        }

        let results: any[] = await callWithFallback('bridge.get_account_posts', {
          sort: 'replies',
          account: currentUser,
          limit: 50
        }).catch(() => null);

        if (results && Array.isArray(results)) {
          results = results.filter(p => p.author !== currentUser && p.parent_author === currentUser);
        }

        if (!results) {
          // Fallback if bridge is not available
          const state: any = await callWithFallback('condenser_api.get_state', [`/@${currentUser}/recent-replies`]).catch(() => null);
          if (state && state.content) {
            results = Object.values(state.content);
            results = results.filter((p: any) => p.author !== currentUser && p.parent_author === currentUser);
            results.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
            results = results.slice(0, 50);
          }
        }

        if (results && Array.isArray(results) && results.length > 0) {
          
          let filteredResults = results.filter(r => !mutedUsers.includes(r.author));
          
          if (readerConfig) {
             if (readerConfig.onlyWhitelist && readerConfig.whiteList && readerConfig.whiteList.length > 0) {
                filteredResults = filteredResults.filter((r: any) => readerConfig.whiteList.includes(r.author));
             } else if (readerConfig.blackList && readerConfig.blackList.length > 0) {
                filteredResults = filteredResults.filter((r: any) => !readerConfig.blackList.includes(r.author));
             }
             if (readerConfig.excludeMuted && readerConfig.mutedUsers) {
               filteredResults = filteredResults.filter((r: any) => !readerConfig.mutedUsers.includes(r.author));
             }
          }
          
          setRawNotifications(filteredResults);
          
          if (filteredResults.length === 0) return;

          const newNotifs: SteemNotification[] = filteredResults.map(r => ({
            id: r.permlink,
            type: 'reply',
            author: r.author,
            permlink: r.permlink,
            parent_author: r.parent_author,
            parent_permlink: r.parent_permlink,
            body: r.body,
            timestamp: r.created,
            isRead: false
          }));

          const newest = newNotifs[0];
          if (lastFetchedNotificationTime.current && newest.timestamp > lastFetchedNotificationTime.current) {
            // Save state for persistence across reloads
            localStorage.setItem('steem_last_notif_time', newest.timestamp);
            setShowNotificationPopup(newest);
            setTimeout(() => setShowNotificationPopup(null), 10000);
          }
          lastFetchedNotificationTime.current = newest.timestamp;
          setNotifications(prev => {
             const existingIds = new Set(prev.map(n => n.id));
             const batch = [...prev];
             newNotifs.forEach(n => {
               if (!existingIds.has(n.id)) batch.unshift(n);
             });
             return batch.slice(0, 50);
          });
        }
      } catch (err) {
        console.warn("Notification poll failed:", err);
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000); // 60s
    return () => clearInterval(interval);
  }, [currentUser, notifEnabled, mutedUsers]);

  const [vaultPin, setVaultPin] = useState('');
  const [isVaultInitialized, setIsVaultInitialized] = useState(false);
  const [vaultAccounts, setVaultAccounts] = useState<string[]>([]);
  const [isSMenuOpen, setIsSMenuOpen] = useState(false);
  const [beautifyEnabled, setBeautifyEnabled] = useState(() => localStorage.getItem('steem_beautify') !== 'false');
  
  const themeAssortment = useMemo(() => [
    { name: 'cyan', rgb: '6 182 212', hex: '#06b6d4' },
    { name: 'blue', rgb: '59 130 246', hex: '#3b82f6' },
    { name: 'indigo', rgb: '99 102 241', hex: '#6366f1' },
    { name: 'violet', rgb: '139 92 246', hex: '#8b5cf6' },
    { name: 'purple', rgb: '168 85 247', hex: '#a855f7' },
    { name: 'pink', rgb: '236 72 153', hex: '#ec4899' },
    { name: 'rose', rgb: '244 63 94', hex: '#f43f5e' },
    { name: 'red', rgb: '239 68 68', hex: '#ef4444' },
    { name: 'orange', rgb: '249 115 22', hex: '#f97316' },
    { name: 'amber', rgb: '245 158 11', hex: '#f59e0b' },
    { name: 'yellow', rgb: '234 179 8', hex: '#eab308' },
    { name: 'lime', rgb: '132 204 22', hex: '#84cc16' },
    { name: 'emerald', rgb: '16 185 129', hex: '#10b981' },
    { name: 'teal', rgb: '20 184 166', hex: '#14b8a6' },
  ], []);

  const neonAssortment = useMemo(() => [
    { name: 'cyan-cyber', rgb: '0 255 255', hex: '#00ffff' },
    { name: 'magenta-cyber', rgb: '255 0 255', hex: '#ff00ff' },
    { name: 'electric-blue', rgb: '112 0 255', hex: '#7000ff' },
    { name: 'neon-green', rgb: '57 255 20', hex: '#39ff14' },
    { name: 'neon-yellow', rgb: '255 255 0', hex: '#ffff00' },
    { name: 'neon-orange', rgb: '255 110 0', hex: '#ff6e00' },
    { name: 'neon-red', rgb: '255 49 49', hex: '#ff3131' },
    { name: 'hot-pink', rgb: '255 105 180', hex: '#ff69b4' },
  ], []);

  const activeAssortment = useMemo(() => visualStyle === 'neon' ? neonAssortment : themeAssortment, [visualStyle, neonAssortment, themeAssortment]);

  const fontOptions = useMemo(() => [
    { id: 'sans', label: 'Inter Sans', family: '"Inter", sans-serif' },
    { id: 'roboto', label: 'Roboto', family: '"Roboto", sans-serif' },
    { id: 'open-sans', label: 'Open Sans', family: '"Open Sans", sans-serif' },
    { id: 'montserrat', label: 'Montserrat', family: '"Montserrat", sans-serif' },
    { id: 'poppins', label: 'Poppins', family: '"Poppins", sans-serif' },
    { id: 'lato', label: 'Lato', family: '"Lato", sans-serif' },
    { id: 'rubik', label: 'Rubik', family: '"Rubik", sans-serif' },
    { id: 'ubuntu', label: 'Ubuntu', family: '"Ubuntu", sans-serif' },
    { id: 'kanit', label: 'Kanit', family: '"Kanit", sans-serif' },
    { id: 'work-sans', label: 'Work Sans', family: '"Work Sans", sans-serif' },
    { id: 'serif', label: 'Merriweather', family: '"Merriweather", serif' },
    { id: 'lora', label: 'Lora', family: '"Lora", serif' },
    { id: 'playfair', label: 'Playfair', family: '"Playfair Display", serif' },
    { id: 'mono', label: 'JetBrains Mono', family: '"JetBrains Mono", monospace' },
    { id: 'fira', label: 'Fira Code', family: '"Fira Code", monospace' },
    { id: 'source-code', label: 'Source Code Pro', family: '"Source Code Pro", monospace' },
    { id: 'outfit', label: 'Outfit', family: '"Outfit", sans-serif' },
    { id: 'grotesk', label: 'Space Grotesk', family: '"Space Grotesk", sans-serif' },
    { id: 'comfortaa', label: 'Comfortaa', family: '"Comfortaa", cursive' },
    { id: 'oswald', label: 'Oswald', family: '"Oswald", sans-serif' },
    { id: 'raleway', label: 'Raleway', family: '"Raleway", sans-serif' },
  ], []);

  const [imageUploadAccount, setImageUploadAccount] = useState('');
  const [showVaultSetup, setShowVaultSetup] = useState(false);
  const [vaultSetupWif, setVaultSetupWif] = useState('');
  const [vaultSetupPin, setVaultSetupPin] = useState('');
  const [pubTitle, setPubTitle] = useState('');
  const [removeTitleLine, setRemoveTitleLine] = useState(() => localStorage.getItem('steem_remove_title_line') !== 'false');
  const [pubTags, setPubTags] = useState('');
  const [appAgent, setAppAgent] = useState(localStorage.getItem('steem_app_agent') || 'steemeditor/1.0');
  const [rewardType, setRewardType] = useState<'SP' | '50' | '0'>( (localStorage.getItem('steem_reward_type') as any) || '50');
  const [beneficiaries, setBeneficiaries] = useState<{account: string, weight: number}[]>([]);
  const [benName, setBenName] = useState('');
  const [benWeight, setBenWeight] = useState('5');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showAdvancedPublish, setShowAdvancedPublish] = useState(false);
  const [themeColor, setThemeColor] = useState<string>(localStorage.getItem('steem_theme_color') || 'cyan');
  const [editorFont, setEditorFont] = useState<string>(localStorage.getItem('steem_editor_font') || 'sans');
  const [toolbarIconSize, setToolbarIconSize] = useState<number>(() => {
    const saved = localStorage.getItem('steem_toolbar_icon_size');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [wysiwygSpacing, setWysiwygSpacing] = useState<number>(() => {
    const saved = localStorage.getItem('steem_wysiwyg_spacing');
    return saved ? parseInt(saved, 10) : 6;
  });
  const [isSpacingMenuOpen, setIsSpacingMenuOpen] = useState(false);
  const [isExifEnabled, setIsExifEnabled] = useState(() => localStorage.getItem('steem_exif_enabled') === 'true');
  const [pubLog, setPubLog] = useState<{ msg: string, type: 'success' | 'error' | 'loading' | null }>({ msg: '', type: null });

  // Update CSS variables for theme color, font, toolbar sizing, and WYSIWYG spacing
  useEffect(() => {
    const theme = activeAssortment.find(t => t.name === themeColor) || activeAssortment[0];
    document.documentElement.style.setProperty('--accent-color', theme.rgb);
    document.documentElement.style.setProperty('--accent-hex', theme.hex);
    
    const font = fontOptions.find(f => f.id === editorFont) || fontOptions[0];
    document.documentElement.style.setProperty('--font-editor', font.family);

    document.documentElement.style.setProperty('--toolbar-icon-size', `${toolbarIconSize}px`);
    document.documentElement.style.setProperty('--toolbar-btn-size', `${toolbarIconSize + 16}px`);
    document.documentElement.style.setProperty('--toolbar-btn-font-size', `${Math.round(toolbarIconSize * 0.85)}px`);
    document.documentElement.style.setProperty('--wysiwyg-spacing', `${wysiwygSpacing}px`);
  }, [themeColor, activeAssortment, editorFont, fontOptions, toolbarIconSize, wysiwygSpacing]);

  const getExifTableFromBlob = async (file: File | Blob): Promise<string> => {
    if (!isExifEnabled) return '';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = ExifReader.load(arrayBuffer);
      if (!tags) return '';

      const make = tags['Make']?.description || '';
      const model = tags['Model']?.description || '';
      const fNumber = tags['FNumber']?.description ? `f/${tags['FNumber'].description}` : '';
      const iso = tags['ISOSpeedRatings']?.description ? `ISO ${tags['ISOSpeedRatings'].description}` : '';
      const shutter = tags['ExposureTime']?.description || '';
      const focal = tags['FocalLength']?.description || '';

      if (!make && !model && !iso) return '';

      let table = '\n| Param | Camera Info |\n| --- | --- |\n';
      if (make || model) table += `| 📸 | ${make} ${model} |\n`;
      if (fNumber) table += `| 🔘 | ${fNumber} |\n`;
      if (shutter) table += `| ⏲️ | ${shutter} |\n`;
      if (iso) table += `| 🎞️ | ${iso} |\n`;
      if (focal) table += `| 🔍 | ${focal} |\n`;
      
      return table + '\n';
    } catch (e) {
      console.error('Exif error:', e);
      return '';
    }
  };

  useEffect(() => {
    if (activeModal === 'publish' && !pubTitle) {
      const content = useEditorStore.getState().content;
      const firstLine = content.split('\n')[0].replace(/[#*`]/g, '').trim();
      if (firstLine) setPubTitle(firstLine.substring(0, 70));
    }
  }, [activeModal, pubTitle]);

  const extractMentions = (text: string) => {
    // 1. Remove markdown links [Label](url)
    // 2. Remove standard URLs
    // 3. Remove what looks like a path or query part of a URL (if still some left)
    const cleanText = text
      .replace(/\[.*?\]\(.*?\)/g, ' ')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/[a-z0-9.-]+\/[a-z0-9.-]+/gi, ' ');
      
    const matches = cleanText.match(/@([a-z0-9.-]+)/gi);
    if (!matches) return [];
    
    return Array.from(new Set(matches.map(m => m.substring(1).toLowerCase())))
      .filter(m => /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(m))
      .filter(m => !m.includes('.') || m.split('.').every(p => p.length >= 1));
  };

  const createPermlinkUA = (title: string): string => {
    let text = title.toLowerCase().trim();
    text = text.replace(/зг/g, 'zgh'); // Правило "зг"
    const specialStart: Record<string, string> = { 'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya' };
    const specialMid: Record<string, string> = { 'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya' };
    const standardMap: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
        'з': 'z', 'и': 'y', 'і': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', '’': '', "'": '', 'ʼ': ''
    };
    const result = text.split(/([\s-]+)/).map(part => {
        if (/[\s-]+/.test(part)) return part;
        let word = "";
        for (let i = 0; i < part.length; i++) {
            const char = part[i];
            if (i === 0 && specialStart[char]) word += specialStart[char];
            else if (i > 0 && specialMid[char]) word += specialMid[char];
            else if (standardMap[char] !== undefined) word += standardMap[char];
            else word += char;
        }
        return word;
    }).join('');
    
    return result
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 150) || 'post-' + Math.random().toString(36).substring(2, 7);
  };
  const sanitizeFilename = (name: string): string => {
    const ukrToLatin: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
      'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
      'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ь': '', 'ю': 'yu', 'я': 'ya', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E',
      'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
      'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
    };
    
    const parts = name.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';
    const base = parts.join('.');
    const result = base.split('').map(char => ukrToLatin[char] || char).join('');
    
    return result
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_.-]/g, '')
      .substring(0, 40) + (ext ? '.' + ext : '');
  };

  const notify = useCallback((msg: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setPubLog({ msg, type });
    if (type !== 'loading') {
      const timeout = type === 'success' ? 3000 : 5000;
      setTimeout(() => {
        setPubLog(prev => prev.msg === msg ? { msg: '', type: null } : prev);
      }, timeout);
    } else {
      // Auto-clear loading after 15s to prevent stuck notifications
      setTimeout(() => {
        setPubLog(prev => prev.type === 'loading' && prev.msg === msg ? { msg: '', type: null } : prev);
      }, 15000);
    }
  }, []);

  // --- PWA States ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    }
    return false;
  });

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('PWA Service Worker registration failed:', err);
        });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPwaInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setIsPwaInstallable(false);
      setDeferredPrompt(null);
      notify(t('pwaInstalled'), 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [t, notify]);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) {
      if (isPwaInstalled) {
        notify(t('pwaAlreadyInstalled'), 'success');
      } else {
        notify(t('pwaInstallFailed'), 'error');
      }
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA installation user outcome: ${outcome}`);
      if (outcome === 'accepted') {
        setIsPwaInstalled(true);
        setIsPwaInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error('Failed to trigger PWA installation:', err);
      notify(t('pwaInstallFailed'), 'error');
    }
  };
  const [isUnlocked, setIsUnlocked] = useState(!SecurityService.isLocked());
  const [isTextWrapEnabled, setIsTextWrapEnabled] = useState(() => {
    const saved = localStorage.getItem('steem_text_wrap');
    return saved !== null ? saved === 'true' : true;
  });
  const [isTrafficOptimized, setIsTrafficOptimized] = useState(() => {
    return localStorage.getItem('steem_traffic_optimized') === 'true';
  });
  const [imageInsertFormat, setImageInsertFormat] = useState<'html' | 'markdown'>(() => {
    return (localStorage.getItem('steem_image_format') as 'html' | 'markdown') || 'html';
  });
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  
  const [tagGroups, setTagGroups] = useState<TagGroup[]>(() => {
    const saved = localStorage.getItem('steem_tag_groups');
    return saved ? JSON.parse(saved) : [];
  });

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<{start: number, end: number} | null>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);

  const [onDemandSyncEnabled, setOnDemandSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('steem_on_demand_sync');
    return saved !== null ? saved === 'true' : true;
  });
  const wysiwygSyncTimeoutRef = useRef<number | null>(null);
  const wysiwygLocalBackupTimeoutRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  const toggleLivePreview = useCallback(() => {
    const nextVal = !isLivePreviewEnabled;
    if (editorMode === 'markdown' && editorRef.current) {
      const val = editorRef.current.value;
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      const pos = getRowColFromOffset(val, start);
      useEditorStore.setState({
        content: val,
        cursor: pos,
        selectionStart: start,
        selectionEnd: end
      });
    }
    setIsLivePreviewEnabled(nextVal);
  }, [isLivePreviewEnabled, editorMode]);

  useEffect(() => {
    return () => {
      if (wysiwygSyncTimeoutRef.current) {
        clearTimeout(wysiwygSyncTimeoutRef.current);
      }
      if (wysiwygLocalBackupTimeoutRef.current) {
        clearTimeout(wysiwygLocalBackupTimeoutRef.current);
      }
    };
  }, []);

  const [bookStructure] = useState<{ id: string; title: string; chapters: { id: string; title: string; note?: string }[] }[]>(() => {
    const saved = localStorage.getItem('steem_book_structure');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        title: 'Розділ 1: Вступ і Концепція',
        chapters: [
          { id: '1-1', title: 'Глава 1.1: Перші Кроки', note: 'Огляд структури та головний посил' },
          { id: '1-2', title: 'Глава 1.2: Основна Мета', note: 'Опис і аналіз ваших ідей' }
        ]
      },
      {
        id: '2',
        title: 'Розділ 2: Експерименти та Практика',
        chapters: [
          { id: '2-1', title: 'Глава 2.1: Детальний опис', note: 'Корисне форматування та посилання' }
        ]
      }
    ];
  });

  // Save book structure
  useEffect(() => {
    localStorage.setItem('steem_book_structure', JSON.stringify(bookStructure));
  }, [bookStructure]);


  const wysiwygRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef<boolean>(false);

  const savedVisualRangeRef = useRef<Range | null>(null);

  const saveVisualSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
      try {
        const range = sel.getRangeAt(0);
        if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
          savedVisualRangeRef.current = range.cloneRange();

          // Sync active formats in real-time in visual mode
          let curr: Node | null = range.startContainer;
          let isBold = false;
          let isItalic = false;
          let isCode = false;
          let isStrike = false;
          let isSub = false;
          let isSup = false;
          let isPhishy = false;
          let isHeading = false;

          while (curr && curr !== wysiwygRef.current) {
            if (curr.nodeType === Node.ELEMENT_NODE) {
              const el = curr as HTMLElement;
              const tag = el.tagName.toLowerCase();
              if (tag === 'b' || tag === 'strong') isBold = true;
              if (tag === 'i' || tag === 'em') isItalic = true;
              if (tag === 'code') isCode = true;
              if (tag === 'strike' || tag === 'del' || tag === 's') isStrike = true;
              if (tag === 'sub') isSub = true;
              if (tag === 'sup') isSup = true;
              if (/^h[1-6]$/.test(tag) || tag === 'th') isHeading = true;
              if (el.classList.contains('phishy')) isPhishy = true;
            }
            curr = curr.parentNode;
          }

          // Check browser's queryCommandState as fallback/enhancement for active caret format
          let queryBold = false;
          let queryItalic = false;
          let queryStrike = false;
          let querySub = false;
          let querySup = false;
          try {
            queryBold = document.queryCommandState('bold');
            queryItalic = document.queryCommandState('italic');
            queryStrike = document.queryCommandState('strikeThrough');
            querySub = document.queryCommandState('subscript');
            querySup = document.queryCommandState('superscript');
          } catch (err) {
            console.warn('queryCommandState failed:', err);
          }

          const newFormats = {
            bold: isBold || (queryBold && !isHeading),
            italic: isItalic || queryItalic,
            code: isCode,
            strikethrough: isStrike || queryStrike,
            sub: isSub || querySub,
            sup: isSup || querySup,
            phishy: isPhishy
          };

          setActiveFormats(prev => {
            if (
              prev.bold === newFormats.bold &&
              prev.italic === newFormats.italic &&
              prev.code === newFormats.code &&
              prev.strikethrough === newFormats.strikethrough &&
              prev.sub === newFormats.sub &&
              prev.sup === newFormats.sup &&
              prev.phishy === newFormats.phishy
            ) {
              return prev; // No change, React will completely skip re-rendering
            }
            return newFormats;
          });
        }
      } catch (e) {
        console.warn('Could not save selection:', e);
      }
    }
  }, []);


  const scrollCaretIntoView = useCallback((block: ScrollLogicalPosition = 'center') => {
      const editor = wysiwygRef.current;
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      if (!editor.contains(r.commonAncestorContainer)) return;
      
      let rect = r.getBoundingClientRect();
      let hasValidRect = rect && (rect.width > 0 || rect.height > 0);
      
      if (!hasValidRect) {
          const marker = document.createElement('span');
          marker.innerHTML = '&#8203;';
          const tempRange = r.cloneRange();
          tempRange.collapse(true);
          try {
              tempRange.insertNode(marker);
              rect = marker.getBoundingClientRect();
              hasValidRect = rect && (rect.width > 0 || rect.height > 0);
          } catch {
              // ignore
          } finally {
              marker.remove();
              sel.removeAllRanges();
              sel.addRange(r);
          }
      }
      
      if (hasValidRect) {
          const editorRect = editor.getBoundingClientRect();
          const caretTop = rect.top - editorRect.top;
          
          if (block === 'center') {
              const targetY = editor.scrollTop + caretTop - (editorRect.height / 2) + (rect.height / 2);
              editor.scrollTo({ top: targetY, behavior: 'auto' });
          } else if (block === 'nearest') {
              if (caretTop < 0) {
                  editor.scrollBy({ top: caretTop - 20, behavior: 'auto' });
              } else if (caretTop + rect.height > editorRect.height) {
                  editor.scrollBy({ top: caretTop + rect.height - editorRect.height + 20, behavior: 'auto' });
              }
          }
      }
  }, []);

  const restoreVisualSelection = useCallback((shouldExpandWord = false) => {
    if (savedVisualRangeRef.current && wysiwygRef.current) {
      try {
        const range = savedVisualRangeRef.current.cloneRange();
        
        if (shouldExpandWord && range.collapsed) {
          const node = range.startContainer;
          const offset = range.startOffset;
          
          if (node && node.nodeType === Node.TEXT_NODE) {
            const textValue = node.nodeValue || '';
            const wordBoundaryRegex = /[\s\n.,!?;:"'()[\]{}*~`<>#_]/;
            
            let start = offset;
            let end = offset;
            
            while (start > 0 && !wordBoundaryRegex.test(textValue[start - 1])) {
              start--;
            }
            while (end < textValue.length && !wordBoundaryRegex.test(textValue[end])) {
              end++;
            }
            
            if (start < end) {
              range.setStart(node, start);
              range.setEnd(node, end);
              savedVisualRangeRef.current = range.cloneRange();
            }
          }
        }

        const sel = window.getSelection();
        if (sel) {
          if (document.activeElement !== wysiwygRef.current) {
            wysiwygRef.current.focus({ preventScroll: true });
          }
          sel.removeAllRanges();
          sel.addRange(range);
          
          const startNode = range.startContainer;
          if (startNode) {
             scrollCaretIntoView('nearest');
             
             const images = wysiwygRef.current.querySelectorAll('img');
             images.forEach(img => {
               if (!img.complete) {
                 img.addEventListener('load', () => scrollCaretIntoView('nearest'), { once: true });
               }
             });
             
             setTimeout(() => scrollCaretIntoView('nearest'), 100);
             setTimeout(() => scrollCaretIntoView('nearest'), 300);
          }
        }
      } catch (e) {
        console.warn('Could not restore selection:', e);
      }
    }
  }, [scrollCaretIntoView]);

  const focusVisualEditorEnd = useCallback(() => {
    if (wysiwygRef.current) {
      wysiwygRef.current.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (sel) {
        try {
          const range = document.createRange();
          range.selectNodeContents(wysiwygRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          savedVisualRangeRef.current = range.cloneRange();
        } catch (e) {
          console.warn('Could not focus end of visual editor:', e);
        }
      }
    }
  }, []);

  const lastSyncContentRef = useRef<string>(useEditorStore.getState().content);

  const updateContentFromWysiwyg = useCallback((forceImmediate = false) => {
    if (!wysiwygRef.current) return;
    const html = wysiwygRef.current.innerHTML;
    
    if (onDemandSyncEnabled && !forceImmediate) {
      if (wysiwygLocalBackupTimeoutRef.current) clearTimeout(wysiwygLocalBackupTimeoutRef.current);
      wysiwygLocalBackupTimeoutRef.current = setTimeout(() => {
        localStorage.setItem('steem_autosave_temp_visual_html', html);
      }, 2000) as any;
      
      if (wysiwygSyncTimeoutRef.current) clearTimeout(wysiwygSyncTimeoutRef.current);
      wysiwygSyncTimeoutRef.current = setTimeout(() => {
        const md = htmlToMarkdown(html);
        const currentContent = useEditorStore.getState().content;
        if (md !== currentContent) {
          lastSyncContentRef.current = md;
          setContent(md);
          saveVisualSelection();
        }
      }, 5000) as any;
    } else {
      const md = htmlToMarkdown(html);
      lastSyncContentRef.current = md;
      setContent(md);
    }
  }, [onDemandSyncEnabled, saveVisualSelection, setContent]);

  const syncWysiwygToContentIfVisual = useCallback(() => {
    if (editorMode === 'visual' && wysiwygRef.current) {
      const md = htmlToMarkdown(wysiwygRef.current.innerHTML);
      if (md !== useEditorStore.getState().content) {
        lastSyncContentRef.current = md;
        setContent(md);
        return md;
      }
    }
    return useEditorStore.getState().content;
  }, [editorMode, setContent]);

  // Helper function to insert HTML at visual editor's selection/cursor point
  const insertHtmlAtCursor = useCallback((html: string) => {
    if (!wysiwygRef.current) return;

    // Restore saved range or focus end of the editor
    if (savedVisualRangeRef.current && wysiwygRef.current.contains(savedVisualRangeRef.current.commonAncestorContainer)) {
      restoreVisualSelection(false);
    } else {
      focusVisualEditorEnd();
    }

    let insertedInSelection = false;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        
        // Append editable placeholder spacer after block structures for better cursor selection
        const processedHtml = html;
        
        const el = document.createElement('div');
        el.innerHTML = processedHtml;
        
        const frag = document.createDocumentFragment();
        let node: Node | null;
        let lastNode: Node | null = null;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        
        // Check if there is an empty inline element that we just inserted so we can place the cursor inside it
        let cursorNode: Node | null = null;
        let cursorOffset = 0;

        // Traverse the fragment to find the innermost empty inline element (like b, strong, i, em, sub, sup, strike, span, code)
        const findEmptyInline = (root: Node): HTMLElement | null => {
          if (root.nodeType === Node.ELEMENT_NODE) {
            const el = root as HTMLElement;
            const inlineTags = ['b', 'strong', 'i', 'em', 'sub', 'sup', 'strike', 'span', 'code'];
            if (inlineTags.includes(el.tagName.toLowerCase())) {
              if (el.innerHTML === '' || el.innerHTML === '\u200B') {
                return el;
              }
            }
          }
          if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            for (let i = 0; i < root.childNodes.length; i++) {
              const found = findEmptyInline(root.childNodes[i]);
              if (found) return found;
            }
          }
          return null;
        };

        const emptyEl = findEmptyInline(frag);
        if (emptyEl) {
          const zwsp = document.createTextNode('\u200B');
          emptyEl.appendChild(zwsp);
          cursorNode = zwsp;
          cursorOffset = 1;
        }

        range.insertNode(frag);
        
        if (cursorNode) {
          range.setStart(cursorNode, cursorOffset);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          savedVisualRangeRef.current = range.cloneRange();
        } else if (lastNode) {
          if (lastNode.nodeType === Node.ELEMENT_NODE && lastNode.parentNode) {
            const zwsp = document.createTextNode('\u200B');
            lastNode.parentNode.insertBefore(zwsp, lastNode.nextSibling);
            range.setStart(zwsp, 1);
            cursorNode = zwsp; // Update targetNode for scrolling
          } else {
            range.setStartAfter(lastNode);
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          savedVisualRangeRef.current = range.cloneRange(); // Save updated range
        }
        insertedInSelection = true;

        // Regain focus and scroll to the insertion point
        if (wysiwygRef.current) {
          wysiwygRef.current.focus({ preventScroll: true });
          const targetNode = cursorNode || lastNode;
          if (targetNode) {
            const el = targetNode.nodeType === Node.TEXT_NODE ? targetNode.parentElement : targetNode as HTMLElement;
            if (el && el.scrollIntoView && el !== wysiwygRef.current) {
              el.scrollIntoView({ behavior: 'auto', block: 'center' });

              // Keep cursor aligned if there are loading images that shift layout heights
              const images = wysiwygRef.current.querySelectorAll('img');
              images.forEach(img => {
                if (!img.complete) {
                  img.addEventListener('load', () => {
                    if (wysiwygRef.current && wysiwygRef.current.contains(el)) {
                      el.scrollIntoView({ behavior: 'auto', block: 'center' });
                    }
                  }, { once: true });
                }
              });

              // Fallbacks for deferred loading or style calculations
              setTimeout(() => {
                if (wysiwygRef.current && wysiwygRef.current.contains(el)) {
                  el.scrollIntoView({ behavior: 'auto', block: 'center' });
                  wysiwygRef.current.focus({ preventScroll: true });
                }
              }, 100);
              setTimeout(() => {
                if (wysiwygRef.current && wysiwygRef.current.contains(el)) {
                  el.scrollIntoView({ behavior: 'auto', block: 'center' });
                  wysiwygRef.current.focus({ preventScroll: true });
                }
              }, 300);
            }
          }
        }
      }
    }
    
    if (!insertedInSelection && wysiwygRef.current) {
      const processedHtml = html;
      wysiwygRef.current.innerHTML += processedHtml;
      wysiwygRef.current.focus({ preventScroll: true });
    }
    
    updateContentFromWysiwyg();
  }, [restoreVisualSelection, focusVisualEditorEnd, updateContentFromWysiwyg]);

  // Helper to extract highlighted HTML selected by user in the visual editor
  const getVisualSelectionHtml = useCallback(() => {
    if (savedVisualRangeRef.current && wysiwygRef.current) {
      try {
        const range = savedVisualRangeRef.current;
        if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
          const clonedSelection = range.cloneContents();
          const div = document.createElement('div');
          div.appendChild(clonedSelection);
          return div.innerHTML;
        }
      } catch (e) {
        console.warn('Could not extract visual selection:', e);
      }
    }
    return '';
  }, []);

  const syncCursorMarkdownToVisual = useCallback(async () => {
    try {
      if (!wysiwygRef.current) return;
      
      const startMarker = 'STARTCARETMARKER';
      const endMarker = 'ENDCARETMARKER';
      
      let mdWithMarkers = '';
      const pos = cursorPositionRef.current;
      
      let textContent = useEditorStore.getState().content;
      if (!textContent.endsWith('\n')) {
        textContent += '\n';
      }
      
      if (pos) {
        const { start, end } = pos;
        
        // Helper to find a safe marker position that does not break markdown syntax
        const getSafeMarkerPosition = (text: string, index: number): number => {
          let idx = Math.max(0, Math.min(index, text.length));
          
          // 1. Avoid being inside an HTML tag <...>
          const leftLess = text.lastIndexOf('<', idx);
          const leftGreater = text.lastIndexOf('>', idx);
          if (leftLess !== -1 && leftLess > leftGreater) {
            const rightGreater = text.indexOf('>', idx);
            if (rightGreater !== -1) {
              idx = rightGreater + 1;
            }
          }
          
          // Find the start and end of the current line
          const lineStart = text.lastIndexOf('\n', idx - 1) + 1;
          let lineEnd = text.indexOf('\n', idx);
          if (lineEnd === -1) lineEnd = text.length;
          const line = text.substring(lineStart, lineEnd);
          const offsetInLine = idx - lineStart;
          
          // 2. Avoid breaking table alignment rows
          if (/^[\s|:.-]+$/.test(line) && line.includes("-") && line.includes("|")) {
            const prevLineStart = text.lastIndexOf("\n", lineStart - 2) + 1;
            const prevLine = text.substring(prevLineStart, lineStart - 1);
            const lastPipe = prevLine.lastIndexOf("|");
            if (lastPipe > 0) {
              return prevLineStart + lastPipe;
            }
            return Math.max(0, lineStart - 1);
          }
          // 2b. Avoid breaking the end of a table row
          if (line.trim().startsWith("|") && line.includes("|", 1)) {
            const lastPipe = line.lastIndexOf("|");
            if (lastPipe > 0 && offsetInLine >= lastPipe) {
               idx = lineStart + lastPipe;
            }
          }
          // 2c. Avoid breaking Horizontal Rules (HR)
          if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
            if (lineEnd >= text.length) {
              return lineEnd;
            }
            // Always move to the next line because placing it on the previous line turns it into an H2
            return getSafeMarkerPosition(text, lineEnd + 1);
          }
          // 3. Avoid being before block markers (lists, blockquotes, table pipes, headings, code fences)
          const match = line.match(/^(\s*(?:[*\-+]|\d+\.|>|\||#{1,6}|```)\s*)/);
          if (match) {
            const prefixLength = match[1].length;
            if (offsetInLine < prefixLength) {
              idx = lineStart + prefixLength;
            }
          }
          
          return idx;
        };

        const safeStart = getSafeMarkerPosition(textContent, start);
        const safeEnd = getSafeMarkerPosition(textContent, end);

        if (safeStart === safeEnd) {
          mdWithMarkers = textContent.substring(0, safeStart) + startMarker + textContent.substring(safeStart);
        } else {
          mdWithMarkers = textContent.substring(0, safeStart) + startMarker + textContent.substring(safeStart, safeEnd) + endMarker + textContent.substring(safeEnd);
        }
      } else {
        mdWithMarkers = textContent;
      }
      
      const m = getMarked();
      const processed = processContentForSteem(mdWithMarkers);
      if (m) {
        let rawHtml = await m.parse(processed);
        
        // Ensure block elements have spacers so users can arrow out
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;

          // Convert inline-intended divs back to spans for the visual editor
          tempDiv.querySelectorAll('div.phishy, div.text-blue, div.text-green').forEach(div => {
             const span = document.createElement('span');
             span.className = div.className;
             span.innerHTML = div.innerHTML;
             if (div.parentNode) div.parentNode.replaceChild(span, div);
          });
        
        // 1. One Top Spacer at the very top of the editor if the first element is a block element
        const firstEl = tempDiv.firstElementChild;
        if (firstEl && ['TABLE', 'PRE', 'BLOCKQUOTE', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'CENTER'].includes(firstEl.tagName)) {
           const pBefore = document.createElement('p');
           pBefore.className = 'table-spacer top-spacer';
           pBefore.setAttribute('data-empty', 'true');
           pBefore.setAttribute('data-placeholder', lang === 'uk' ? '↵ Початок допису...' : lang === 'es' ? '↵ Inicio de la publicación...' : lang === 'ko' ? '↵ 게시물 시작...' : '↵ Top of post...');
           pBefore.innerHTML = '<br>';
           tempDiv.insertBefore(pBefore, firstEl);
        }
        
        // 2. One Bottom Spacer at the very bottom of the editor
        const lastEl = tempDiv.lastElementChild;
        if (!lastEl || lastEl.tagName !== 'P' || lastEl.getAttribute('data-empty') !== 'true' || !lastEl.classList.contains('bottom-spacer')) {
           if (lastEl && lastEl.tagName === 'P' && (lastEl.textContent || '').trim() === '' && lastEl.querySelectorAll('img, iframe, table').length === 0) {
              lastEl.className = 'table-spacer bottom-spacer';
              lastEl.setAttribute('data-empty', 'true');
              lastEl.setAttribute('data-placeholder', lang === 'uk' ? '↵ Кінець допису...' : lang === 'es' ? '↵ Fin de la publicación...' : lang === 'ko' ? '↵ 게시물 끝...' : '↵ End of post...');
              if (!lastEl.innerHTML) lastEl.innerHTML = '<br>';
           } else {
              const pAfter = document.createElement('p');
              pAfter.className = 'table-spacer bottom-spacer';
              pAfter.setAttribute('data-empty', 'true');
              pAfter.setAttribute('data-placeholder', lang === 'uk' ? '↵ Кінець допису...' : lang === 'es' ? '↵ Fin de la publicación...' : lang === 'ko' ? '↵ 게시물 끝...' : '↵ End of post...');
              pAfter.innerHTML = '<br>';
              tempDiv.appendChild(pAfter);
           }
        }
        
        rawHtml = tempDiv.innerHTML;
        
        // We rely on CSS padding instead of inserting <p><br></p> after block elements
        const trimmedRaw = rawHtml.trim();
        if (trimmedRaw === '') {
          rawHtml = '<p><br></p>';
        }
        
        isSyncingRef.current = true;
        wysiwygRef.current.innerHTML = rawHtml;
        lastSyncContentRef.current = useEditorStore.getState().content;
        isSyncingRef.current = false;
        
        if (pos) {
          const range = document.createRange();
          let rangeSet = false;
          let startNodeInfo: { node: Node, offset: number } | null = null;
          let endNodeInfo: { node: Node, offset: number } | null = null;
          
          const walkAndFindMarkers = (node: Node) => {
             if (node.nodeType === Node.TEXT_NODE) {
                let val = node.nodeValue || '';
                if (val.includes(startMarker) && val.includes(endMarker)) {
                   const sIdx = val.indexOf(startMarker);
                   val = val.replace(startMarker, '');
                   const eIdx = val.indexOf(endMarker);
                   val = val.replace(endMarker, '');
                   node.nodeValue = val;
                   startNodeInfo = { node, offset: sIdx };
                   endNodeInfo = { node, offset: eIdx };
                } else {
                   if (val.includes(startMarker)) {
                      const idx = val.indexOf(startMarker);
                      val = val.replace(startMarker, '');
                      node.nodeValue = val;
                      startNodeInfo = { node, offset: idx };
                   }
                   if (val.includes(endMarker)) {
                      const idx = val.indexOf(endMarker);
                      val = val.replace(endMarker, '');
                      node.nodeValue = val;
                      endNodeInfo = { node, offset: idx };
                   }
                }
             } else {
                const children = Array.from(node.childNodes);
                for (const child of children) {
                   walkAndFindMarkers(child);
                }
             }
          };
          
          walkAndFindMarkers(wysiwygRef.current);
          
          if (startNodeInfo && endNodeInfo) {
            const sInfo = startNodeInfo as { node: Node, offset: number };
            const eInfo = endNodeInfo as { node: Node, offset: number };
            range.setStart(sInfo.node, sInfo.offset);
            range.setEnd(eInfo.node, eInfo.offset);
            rangeSet = true;
          } else if (startNodeInfo) {
            const sInfo = startNodeInfo as { node: Node, offset: number };
            range.setStart(sInfo.node, sInfo.offset);
            range.collapse(true);
            rangeSet = true;
          } else if (!rangeSet && pos && wysiwygRef.current) {
            let currentLength = 0;
            let foundNode: Node | null = null;
            let foundOffset = 0;

            const walkTextNodes = (node: Node) => {
              if (foundNode) return;
              if (node.nodeType === Node.TEXT_NODE) {
                const len = (node.nodeValue || '').length;
                if (currentLength + len >= pos.start) {
                  foundNode = node;
                  foundOffset = Math.max(0, Math.min(pos.start - currentLength, len));
                } else {
                  currentLength += len;
                }
              } else {
                for (const child of Array.from(node.childNodes)) {
                  walkTextNodes(child);
                  if (foundNode) break;
                }
              }
            };

            walkTextNodes(wysiwygRef.current);

            if (foundNode) {
              range.setStart(foundNode, foundOffset);
              range.collapse(true);
              rangeSet = true;
            }
          }
          
          if (rangeSet) {
            wysiwygRef.current.focus();
            const sel = window.getSelection();
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(range);
              savedVisualRangeRef.current = range.cloneRange();
              
              if (pos) {
                useEditorStore.getState().setSelection(pos.start, pos.end);
                const rowColPos = getRowColFromOffset(useEditorStore.getState().content, pos.start);
                useEditorStore.getState().setCursor(rowColPos);
              }

              // Ensure element has active blinking cursor
              wysiwygRef.current.focus();

              if (startNodeInfo) {
                 scrollCaretIntoView('center');
                 
                 const images = wysiwygRef.current.querySelectorAll('img');
                 images.forEach(img => {
                   if (!img.complete) {
                     img.addEventListener('load', () => scrollCaretIntoView('center'), { once: true });
                   }
                 });
                 
                 setTimeout(() => scrollCaretIntoView('center'), 100);
                 setTimeout(() => scrollCaretIntoView('center'), 300);
                 setTimeout(() => scrollCaretIntoView('center'), 600);
              }
            }
          }
        } else {
          wysiwygRef.current.focus();
        }
      }
    } catch (e) {
      console.warn('syncCursorMarkdownToVisual error:', e);
    }
  }, [lang, scrollCaretIntoView]);

  // Bidirectional sync: sync content to visual editor unless visual editor currently has focus
  useEffect(() => {
    if (editorMode === 'visual' && wysiwygRef.current && !isEditorFocused && !wysiwygRef.current.contains(document.activeElement) && useEditorStore.getState().content !== lastSyncContentRef.current) {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        if (onDemandSyncEnabled) {
          const isStale = localStorage.getItem('steem_visual_html_is_stale') === 'true';
          const cachedHtml = localStorage.getItem('steem_autosave_temp_visual_html');
          if (cachedHtml && !isStale) {
            isSyncingRef.current = true;
            wysiwygRef.current.innerHTML = cachedHtml;
            lastSyncContentRef.current = useEditorStore.getState().content;
            isSyncingRef.current = false;
            return;
          }
        }
      }
      const renderHtml = async () => {
        const m = getMarked();
        const processed = processContentForSteem(useEditorStore.getState().content);
        if (m) {
          let rawHtml = await m.parse(processed);
          
          // Ensure block elements have spacers so users can arrow out
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = rawHtml;

          // Convert inline-intended divs back to spans for the visual editor
          tempDiv.querySelectorAll('div.phishy, div.text-blue, div.text-green').forEach(div => {
             const span = document.createElement('span');
             span.className = div.className;
             span.innerHTML = div.innerHTML;
             if (div.parentNode) div.parentNode.replaceChild(span, div);
          });
          
          // 1. One Top Spacer at the very top of the editor if the first element is a block element
          const firstEl = tempDiv.firstElementChild;
          if (firstEl && ['TABLE', 'PRE', 'BLOCKQUOTE', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'CENTER'].includes(firstEl.tagName)) {
             const pBefore = document.createElement('p');
             pBefore.className = 'table-spacer top-spacer';
             pBefore.setAttribute('data-empty', 'true');
             pBefore.setAttribute('data-placeholder', lang === 'uk' ? '↵ Початок допису...' : lang === 'es' ? '↵ Inicio de la publicación...' : lang === 'ko' ? '↵ 게시물 시작...' : '↵ Top of post...');
             pBefore.innerHTML = '<br>';
             tempDiv.insertBefore(pBefore, firstEl);
          }
          
          // 2. One Bottom Spacer at the very bottom of the editor
          const lastEl = tempDiv.lastElementChild;
          if (!lastEl || lastEl.tagName !== 'P' || lastEl.getAttribute('data-empty') !== 'true' || !lastEl.classList.contains('bottom-spacer')) {
             if (lastEl && lastEl.tagName === 'P' && (lastEl.textContent || '').trim() === '' && lastEl.querySelectorAll('img, iframe, table').length === 0) {
                lastEl.className = 'table-spacer bottom-spacer';
                lastEl.setAttribute('data-empty', 'true');
                lastEl.setAttribute('data-placeholder', lang === 'uk' ? '↵ Кінець допису...' : lang === 'es' ? '↵ Fin de la publicación...' : lang === 'ko' ? '↵ 게시물 끝...' : '↵ End of post...');
                if (!lastEl.innerHTML) lastEl.innerHTML = '<br>';
             } else {
                const pAfter = document.createElement('p');
                pAfter.className = 'table-spacer bottom-spacer';
                pAfter.setAttribute('data-empty', 'true');
                pAfter.setAttribute('data-placeholder', lang === 'uk' ? '↵ Кінець допису...' : lang === 'es' ? '↵ Fin de la publicación...' : lang === 'ko' ? '↵ 게시물 끝...' : '↵ End of post...');
                pAfter.innerHTML = '<br>';
                tempDiv.appendChild(pAfter);
             }
          }
          
          rawHtml = tempDiv.innerHTML;
          
          // We rely on CSS padding instead of inserting <p><br></p> after block elements
          const trimmedRaw = rawHtml.trim();
          if (trimmedRaw === '') {
            rawHtml = '<p><br></p>';
          }
          if (wysiwygRef.current && lastSyncContentRef.current !== useEditorStore.getState().content && wysiwygRef.current.innerHTML !== rawHtml) {
            isSyncingRef.current = true;
            wysiwygRef.current.innerHTML = rawHtml;
            lastSyncContentRef.current = useEditorStore.getState().content;
            isSyncingRef.current = false;
            localStorage.setItem('steem_autosave_temp_visual_html', rawHtml);
            localStorage.setItem('steem_visual_html_is_stale', 'false');

            if (!hasRestoredInitialCursorRef.current) {
              hasRestoredInitialCursorRef.current = true;
              syncCursorMarkdownToVisual().then(() => {
                if (wysiwygRef.current) wysiwygRef.current.focus();
              });
            }
          }
        }
      };
      renderHtml();
    }
  }, [ editorMode, isEditorFocused, syncCursorMarkdownToVisual, lang, onDemandSyncEnabled]);

  // Load cursor position on start
  useEffect(() => {
     try {
        const savedCursor = localStorage.getItem('steem_editor_cursor');
        if (savedCursor) {
            const parsed = JSON.parse(savedCursor);
            cursorPositionRef.current = parsed;
            if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
              useEditorStore.getState().setSelection(parsed.start, parsed.end);
            }
        }
     } catch (e) {
        console.error("Failed to load cursor position", e);
     }
  }, []);

  // Visual Viewport API for mobile virtual keyboard height detection
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleVisualViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const layoutHeight = window.innerHeight;
      const visualHeight = vv.height;
      const diff = layoutHeight - visualHeight - vv.offsetTop;
      if (diff > 80) {
        setKeyboardOffset(diff);
      } else {
        setKeyboardOffset(0);
      }
    };

    window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    window.visualViewport.addEventListener('scroll', handleVisualViewportChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
        window.visualViewport.removeEventListener('scroll', handleVisualViewportChange);
      }
    };
  }, []);

  const hasRestoredInitialCursorRef = useRef(false);

  const saveCursorPosition = useCallback(() => {
     if (isSyncingRef.current) return;
     if (editorRef.current) {
        const start = editorRef.current.selectionStart;
        const end = editorRef.current.selectionEnd;
        const pos = {
           start,
           end
        };
        cursorPositionRef.current = pos;
        localStorage.setItem('steem_editor_cursor', JSON.stringify(pos));

        // Sync content and Zustand store (in-memory only, disk persistence is debounced)
        const text = editorRef.current.value;
        const rowColPos = getRowColFromOffset(text, start);
        useEditorStore.getState().setCursor(rowColPos);
        useEditorStore.getState().setSelection(start, end);

        if (editorMode === 'markdown') {
          const caretPos = start;

          const lineStart = text.lastIndexOf('\n', caretPos - 1) + 1;
          const lineEnd = text.indexOf('\n', caretPos);
          const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;

          const currentLine = text.substring(lineStart, actualLineEnd);
          const caretInLine = caretPos - lineStart;

          setActiveFormats({
            bold: isInsideTagInLine(currentLine, caretInLine, '**'),
            italic: isInsideTagInLine(currentLine, caretInLine, '*'),
            code: isInsideTagInLine(currentLine, caretInLine, '`'),
            strikethrough: isInsideTagInLine(currentLine, caretInLine, '~~'),
            sub: isInsideTagInLine(currentLine, caretInLine, '<sub>', '</sub>'),
            sup: isInsideTagInLine(currentLine, caretInLine, '<sup>', '</sup>'),
            phishy: isInsideTagInLine(currentLine, caretInLine, '<div class="phishy">', '</div>')
          });
        }
     }
  }, [editorMode]);

  const restoreMarkdownCursorAndScroll = useCallback((retryCount = 0) => {
    if (!editorRef.current) {
      if (retryCount < 10) {
        setTimeout(() => restoreMarkdownCursorAndScroll(retryCount + 1), 30);
      }
      return;
    }

    try {
      const ta = editorRef.current;
      const textVal = useEditorStore.getState().content || localStorage.getItem('steem_autosave_temp') || ta.value || '';
      
      // Ensure the textarea has the correct value
      if (ta.value !== textVal) {
        ta.value = textVal;
      }

      // Get saved cursor position
      let start = 0;
      let end = 0;
      if (cursorPositionRef.current) {
        start = cursorPositionRef.current.start;
        end = cursorPositionRef.current.end;
      } else {
        const saved = localStorage.getItem('steem_editor_cursor');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
            start = parsed.start;
            end = parsed.end;
            cursorPositionRef.current = parsed;
          }
        }
      }

      const safeStart = Math.min(Math.max(0, start), textVal.length);
      const safeEnd = Math.min(Math.max(0, end), textVal.length);

      isSyncingRef.current = true;
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(safeStart, safeEnd);

      // Sync to Zustand store
      const rowColPos = getRowColFromOffset(textVal, safeStart);
      useEditorStore.getState().setCursor(rowColPos);
      useEditorStore.getState().setSelection(safeStart, safeEnd);

      // Restore scroll position
      const savedScroll = localStorage.getItem('steem_editor_scroll');
      if (savedScroll !== null) {
        const scrollTop = Number(savedScroll);
        if (!isNaN(scrollTop) && scrollTop > 0) {
          ta.scrollTop = scrollTop;
        } else {
          // Fallback to scroll calculating from caretY
          const clone = ta.cloneNode() as HTMLTextAreaElement;
          clone.style.visibility = 'hidden';
          clone.style.position = 'absolute';
          clone.style.overflow = 'hidden';
          clone.style.height = '0px';
          clone.style.width = ta.clientWidth + 'px';
          clone.style.padding = window.getComputedStyle(ta).padding;
          clone.style.paddingBottom = '0px';
          clone.style.font = window.getComputedStyle(ta).font;
          clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;
          clone.style.boxSizing = 'border-box';
          clone.value = textVal.substring(0, safeStart);
          document.body.appendChild(clone);
          
          const caretY = clone.scrollHeight;
          document.body.removeChild(clone);
          ta.scrollTop = Math.max(0, caretY - (ta.clientHeight / 2));
        }
      } else {
        // Compute from caretY
        const clone = ta.cloneNode() as HTMLTextAreaElement;
        clone.style.visibility = 'hidden';
        clone.style.position = 'absolute';
        clone.style.overflow = 'hidden';
        clone.style.height = '0px';
        clone.style.width = ta.clientWidth + 'px';
        clone.style.padding = window.getComputedStyle(ta).padding;
        clone.style.paddingBottom = '0px';
        clone.style.font = window.getComputedStyle(ta).font;
        clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;
        clone.style.boxSizing = 'border-box';
        clone.value = textVal.substring(0, safeStart);
        document.body.appendChild(clone);
        
        const caretY = clone.scrollHeight;
        document.body.removeChild(clone);
        ta.scrollTop = Math.max(0, caretY - (ta.clientHeight / 2));
      }

      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    } catch (e) {
      console.warn('restoreMarkdownCursorAndScroll failed:', e);
      isSyncingRef.current = false;
    }
  }, []);

  const syncCursorVisualToMarkdown = useCallback(() => {
    try {
      let range: Range | null = null;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && wysiwygRef.current && wysiwygRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        range = sel.getRangeAt(0);
      } else if (savedVisualRangeRef.current && wysiwygRef.current && wysiwygRef.current.contains(savedVisualRangeRef.current.commonAncestorContainer)) {
        range = savedVisualRangeRef.current;
      }

      if (range && wysiwygRef.current) {
        // Create a temporary clone to safely insert marker elements
        const clonedWysiwyg = wysiwygRef.current.cloneNode(true) as HTMLElement;
        
        const pathStart = getNodePath(wysiwygRef.current, range.startContainer);
        const pathEnd = getNodePath(wysiwygRef.current, range.endContainer);
        
        if (pathStart && pathEnd) {
          const clonedStartNode = getNodeByPath(clonedWysiwyg, pathStart);
          const clonedEndNode = getNodeByPath(clonedWysiwyg, pathEnd);
          
          if (clonedStartNode && clonedEndNode) {
            // Re-create the range within the cloned DOM
            const clonedRange = document.createRange();
            
            try {
              clonedRange.setStart(clonedStartNode, range.startOffset);
              clonedRange.setEnd(clonedEndNode, range.endOffset);
              
              const startMarkerNode = document.createTextNode('\x01');
              const endMarkerNode = document.createTextNode('\x02');
              
              // Insert end first so it doesn't affect the start position
              const endRange = clonedRange.cloneRange();
              endRange.collapse(false);
              endRange.insertNode(endMarkerNode);
              
              const startRange = clonedRange.cloneRange();
              startRange.collapse(true);
              startRange.insertNode(startMarkerNode);
              
              const htmlWithMarkers = clonedWysiwyg.innerHTML;
              const rawMd = htmlToMarkdown(htmlWithMarkers);
              
              const startIdx = rawMd.indexOf('\x01');
              const cleanMdAfterStart = rawMd.replace('\x01', '');
              const endIdx = cleanMdAfterStart.indexOf('\x02');
              
              if (startIdx !== -1 && endIdx !== -1) {
                const pos = { start: startIdx, end: endIdx };
                cursorPositionRef.current = pos;
                localStorage.setItem('steem_editor_cursor', JSON.stringify(pos));
                
                // Sync to Zustand store
                const cleanMd = cleanMdAfterStart.replace('\x02', '');
                const rowColPos = getRowColFromOffset(cleanMd, startIdx);
                useEditorStore.getState().setCursor(rowColPos);
                useEditorStore.getState().setSelection(startIdx, endIdx);
              } else if (startIdx !== -1) {
                const pos = { start: startIdx, end: startIdx };
                cursorPositionRef.current = pos;
                localStorage.setItem('steem_editor_cursor', JSON.stringify(pos));
                
                // Sync to Zustand store
                const cleanMd = cleanMdAfterStart;
                const rowColPos = getRowColFromOffset(cleanMd, startIdx);
                useEditorStore.getState().setCursor(rowColPos);
                useEditorStore.getState().setSelection(startIdx, startIdx);
              }
            } catch (e) {
              console.warn("Failed to apply range on cloned DOM", e);
            }
          }
        }
      }
    } catch (e) {
      console.warn('syncCursorVisualToMarkdown error:', e);
    }
  }, []);

  // Automatic Cursor & Scroll Position Restoration after page reload
  useEffect(() => {
    if (hasRestoredInitialCursorRef.current) return;

    const getPos = () => {
      if (cursorPositionRef.current) return cursorPositionRef.current;
      try {
        const saved = localStorage.getItem('steem_editor_cursor');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
            cursorPositionRef.current = parsed;
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved cursor in restoration effect', e);
      }
      return null;
    };

    if (editorMode === 'markdown') {
      hasRestoredInitialCursorRef.current = true;
      restoreMarkdownCursorAndScroll();
    } else if (editorMode === 'visual' && wysiwygRef.current) {
      hasRestoredInitialCursorRef.current = true;
      const timer = setTimeout(async () => {
        const pos = getPos();
        if (pos) {
          useEditorStore.getState().setSelection(pos.start, pos.end);
          await syncCursorMarkdownToVisual();
          if (wysiwygRef.current) {
            wysiwygRef.current.focus();
          }
        } else if (wysiwygRef.current) {
          wysiwygRef.current.focus();
        }

        const savedScroll = localStorage.getItem('steem_editor_scroll');
        if (savedScroll !== null && wysiwygRef.current) {
          const scrollTop = Number(savedScroll);
          if (!isNaN(scrollTop) && scrollTop > 0) {
            wysiwygRef.current.scrollTop = scrollTop;
          }
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [editorMode, syncCursorMarkdownToVisual, restoreMarkdownCursorAndScroll]);

  const handleSetEditorMode = useCallback((mode: 'visual' | 'markdown') => {
    if (editorMode === mode) return;

    localStorage.setItem('steem_editor_mode', mode);

    if (mode === 'visual') {
      if (editorRef.current) {
        const val = editorRef.current.value;
        const start = editorRef.current.selectionStart;
        const end = editorRef.current.selectionEnd;
        const pos = getRowColFromOffset(val, start);
        useEditorStore.setState({
          content: val,
          cursor: pos,
          selectionStart: start,
          selectionEnd: end
        });
      }
      saveCursorPosition();
      
      lastSyncContentRef.current = 'FORCE_SYNC_INITIAL_VALUE_THAT_WILL_NEVER_MATCH';
      setEditorMode('visual');
      
      setTimeout(async () => {
        await syncCursorMarkdownToVisual();
        if (wysiwygRef.current) {
          wysiwygRef.current.focus();
        }
      }, 100);
    } else {
      saveVisualSelection();
      isSyncingRef.current = true;
      syncCursorVisualToMarkdown();
      
      // Always synchronize when switching from visual to markdown code
      if (wysiwygRef.current) {
        const md = htmlToMarkdown(wysiwygRef.current.innerHTML);
        if (md !== useEditorStore.getState().content) {
          setContent(md);
        }
      }
      setEditorMode('markdown');

      setTimeout(() => {
        restoreMarkdownCursorAndScroll();
      }, 50);
    }
  }, [editorMode, saveCursorPosition, syncCursorMarkdownToVisual, syncCursorVisualToMarkdown, saveVisualSelection, setContent, restoreMarkdownCursorAndScroll]);

  // Save cursor position when unmounting or switching view
  useEffect(() => {
    return () => saveCursorPosition();
  }, [saveCursorPosition]);

  useEffect(() => {
    if (activeView === 'editor' && activeMobileTab === 'editor') {
       setTimeout(() => {
          if (editorMode === 'visual') {
             restoreVisualSelection();
          } else {
             restoreMarkdownCursorAndScroll();
             return;
          }
          if (editorRef.current) {
             const cursor = useEditorStore.getState().cursor;
             if (cursor) {
               const text = editorRef.current.value;
               const offset = getOffsetFromRowCol(text, cursor);
               
               // Ensure we prevent user event handlers from overwriting while setting programmatic focus/selection
               isSyncingRef.current = true;
               
               // Cross-browser reliable cursor positioning
               const ta = editorRef.current;
               ta.focus();
               ta.setSelectionRange(offset, offset);
               
               // Robust Y-axis scroll calculation using a hidden clone
                const clone = ta.cloneNode() as HTMLTextAreaElement;
                clone.style.visibility = 'hidden';
                clone.style.position = 'absolute';
                clone.style.overflow = 'hidden';
                clone.style.height = '0px'; // Force scrollHeight to equal content height
                clone.style.width = ta.clientWidth + 'px';
                clone.style.padding = window.getComputedStyle(ta).padding;
                clone.style.paddingBottom = '0px'; // Ignore bottom padding for caret Y coord
                clone.style.font = window.getComputedStyle(ta).font;
                clone.style.lineHeight = window.getComputedStyle(ta).lineHeight;
                clone.style.boxSizing = 'border-box';
                clone.value = text.substring(0, offset);
                document.body.appendChild(clone);
                
                const caretY = clone.scrollHeight;
                document.body.removeChild(clone);
                
                // Scroll so the caret is exactly in the middle of the screen
                ta.scrollTop = Math.max(0, caretY - (ta.clientHeight / 2));
                
                // Reset sync flag after a brief timeout so that user actions are once again captured
                setTimeout(() => {
                  isSyncingRef.current = false;
                }, 100);
             } else {
               isSyncingRef.current = false;
             }
          } else {
             isSyncingRef.current = false;
          }
       }, 100);
    } else {
       saveVisualSelection();
       saveCursorPosition();
       isSyncingRef.current = false;
    }
  }, [activeView, activeMobileTab, editorMode, saveCursorPosition, restoreVisualSelection, saveVisualSelection, restoreMarkdownCursorAndScroll]);

  useEffect(() => {
    // DEBOUNCED PERSISTENCE: Fast 350ms save to storage so state and cursor match without blocking UI thread during typing
    let timer: any;
    const unsubscribe = import('./store').then(({ useEditorStore }) => {
      return useEditorStore.subscribe((state, prevState) => {
        if (state.content !== prevState.content) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            saveLargeStorage(STORAGE_KEY_AUTOSAVE, state.content);
            if (cursorPositionRef.current) {
              try {
                localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorPositionRef.current));
              } catch (err) {
                console.debug(err);
              }
            }
            if (editorMode === 'markdown') {
              try {
                localStorage.setItem('steem_visual_html_is_stale', 'true');
              } catch (err) {
                console.debug(err);
              }
            }
          }, 350);
        }
      });
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe.then(unsub => unsub());
    };
  }, [editorMode, saveLargeStorage]);

  // Synchronous flush on page reload / unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        if (editorMode === 'markdown' && editorRef.current) {
          const val = editorRef.current.value;
          useEditorStore.setState({ content: val });
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, val);
          saveCursorPosition();
        } else if (editorMode === 'visual' && wysiwygRef.current) {
          const html = wysiwygRef.current.innerHTML;
          try {
            localStorage.setItem('steem_autosave_temp_visual_html', html);
          } catch (err) {
            console.debug(err);
          }
          const md = htmlToMarkdown(html);
          useEditorStore.setState({ content: md });
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, md);
          saveVisualSelection();
          syncCursorVisualToMarkdown();
          if (cursorPositionRef.current) {
            try {
              localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorPositionRef.current));
            } catch (err) {
              console.debug(err);
            }
          }
        } else {
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, useEditorStore.getState().content);
          saveCursorPosition();
        }
      } catch (err) {
        console.warn('Error flushing autosave state before unload:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editorMode, saveCursorPosition, saveVisualSelection, syncCursorVisualToMarkdown, saveLargeStorage]);

  useEffect(() => {
    if (isImagesLoaded.current) {
      localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
      localStorage.setItem('steem_editor_source_links', sourceInput);
      localStorage.setItem('steem_image_format', imageInsertFormat);
      localStorage.setItem('steem_text_wrap', String(isTextWrapEnabled));
    }
  }, [images, sourceInput, imageInsertFormat, isTextWrapEnabled]);

  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY_AUTOSAVE) || sessionStorage.getItem(STORAGE_KEY_AUTOSAVE);
    } catch (err) {
      console.debug(err);
    }
    if (saved) setContent(saved);
    
    const savedUser = localStorage.getItem('steem_username');
    if (savedUser) setUsername(savedUser);

    const savedTpls = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (savedTpls) setTemplates(JSON.parse(savedTpls));

    const savedMentions = localStorage.getItem(STORAGE_KEY_USERS);
    if (savedMentions) setMentions(Array.from(new Set(JSON.parse(savedMentions))));

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth !== lastWidth.current) {
        if (currentWidth < 1024) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
        lastWidth.current = currentWidth;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setContent]);

  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
  const [activeTableRow, setActiveTableRow] = useState<HTMLTableRowElement | null>(null);
  const [activeTableCell, setActiveTableCell] = useState<HTMLTableCellElement | null>(null);
  
  const activeTableRef = useRef<HTMLTableElement | null>(null);
  const activeTableRowRef = useRef<HTMLTableRowElement | null>(null);
  const activeTableCellRef = useRef<HTMLTableCellElement | null>(null);

  const [tableRect, setTableRect] = useState<DOMRect | null>(null);
  const [isTableMenuExpanded, setIsTableMenuExpanded] = useState(false);
  const [isTableMenuPinned, setIsTableMenuPinned] = useState(() => {
    return localStorage.getItem('steem_table_menu_pinned') === 'true';
  });

  const updateTableRect = useCallback(() => {
    if (activeTable) {
      setTableRect(activeTable.getBoundingClientRect());
    } else {
      setTableRect(null);
    }
  }, [activeTable]);

  useEffect(() => {
    updateTableRect();
    window.addEventListener('resize', updateTableRect);
    const scrollContainer = wysiwygRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateTableRect);
    }
    return () => {
      window.removeEventListener('resize', updateTableRect);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updateTableRect);
      }
    };
  }, [updateTableRect, activeTable]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorMode === 'visual' && wysiwygRef.current) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          try {
            const range = sel.getRangeAt(0);
            if (wysiwygRef.current.contains(range.commonAncestorContainer)) {
              savedVisualRangeRef.current = range.cloneRange();
              
              let node: Node | null = range.commonAncestorContainer;
              if (node.nodeType === 3) node = node.parentNode;
              const table = ((node as Element)?.closest?.('table') as HTMLTableElement) || null;
              const row = ((node as Element)?.closest?.('tr') as HTMLTableRowElement) || null;
              const cell = ((node as Element)?.closest?.('td, th') as HTMLTableCellElement) || null;

              if (activeTableRef.current !== table) {
                activeTableRef.current = table;
                setActiveTable(table);
              }
              if (activeTableRowRef.current !== row) {
                activeTableRowRef.current = row;
                setActiveTableRow(row);
              }
              if (activeTableCellRef.current !== cell) {
                activeTableCellRef.current = cell;
                setActiveTableCell(cell);
              }
            } else {
              if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
              if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
              if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
            }
          } catch {
            if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
            if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
            if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
          }
        } else {
          if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
          if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
          if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
        }
      } else {
        if (activeTableRef.current !== null) { activeTableRef.current = null; setActiveTable(null); }
        if (activeTableRowRef.current !== null) { activeTableRowRef.current = null; setActiveTableRow(null); }
        if (activeTableCellRef.current !== null) { activeTableCellRef.current = null; setActiveTableCell(null); }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editorMode]);

  useEffect(() => {
    // DEBOUNCED PERSISTENCE: Fast 350ms save to storage so state and cursor match without blocking UI thread during typing
    let timer: any;
    const unsubscribe = import('./store').then(({ useEditorStore }) => {
      return useEditorStore.subscribe((state, prevState) => {
        if (state.content !== prevState.content) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            saveLargeStorage(STORAGE_KEY_AUTOSAVE, state.content);
            if (cursorPositionRef.current) {
              try {
                localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorPositionRef.current));
              } catch (err) {
                console.debug(err);
              }
            }
            if (editorMode === 'markdown') {
              try {
                localStorage.setItem('steem_visual_html_is_stale', 'true');
              } catch (err) {
                console.debug(err);
              }
            }
          }, 350);
        }
      });
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe.then(unsub => unsub());
    };
  }, [editorMode, saveLargeStorage]);

  // Synchronous flush on page reload / unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        if (editorMode === 'markdown' && editorRef.current) {
          const val = editorRef.current.value;
          useEditorStore.setState({ content: val });
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, val);
          saveCursorPosition();
        } else if (editorMode === 'visual' && wysiwygRef.current) {
          const html = wysiwygRef.current.innerHTML;
          try {
            localStorage.setItem('steem_autosave_temp_visual_html', html);
          } catch (err) {
            console.debug(err);
          }
          const md = htmlToMarkdown(html);
          useEditorStore.setState({ content: md });
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, md);
          saveVisualSelection();
          syncCursorVisualToMarkdown();
          if (cursorPositionRef.current) {
            try {
              localStorage.setItem('steem_editor_cursor', JSON.stringify(cursorPositionRef.current));
            } catch (err) {
              console.debug(err);
            }
          }
        } else {
          saveLargeStorage(STORAGE_KEY_AUTOSAVE, useEditorStore.getState().content);
          saveCursorPosition();
        }
      } catch (err) {
        console.warn('Error flushing autosave state before unload:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editorMode, saveCursorPosition, saveVisualSelection, syncCursorVisualToMarkdown, saveLargeStorage]);

  const handleEditorScroll = useCallback(() => {
    if (editorRef.current) {
      localStorage.setItem('steem_editor_scroll', String(editorRef.current.scrollTop));
    }
    if (!syncScrollEnabled) return;
    const editor = editorRef.current;
    const preview = previewPaneRef.current;
    if (editor && preview) {
      const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    }
  }, [syncScrollEnabled]);

  // OFF-THREAD WEB WORKER: Process stats and clean text metrics off the main UI thread!
  const handleWorkerStats = useCallback((rawStats: { words: number; chars: number }, cleanStatsResult: { words: number; chars: number }) => {
    useEditorStore.getState().setStats(rawStats, cleanStatsResult);
  }, []);

  useEditorWorker(handleWorkerStats);

  useEffect(() => {
    localStorage.setItem('steem_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('steem_tag_groups', JSON.stringify(tagGroups));
  }, [tagGroups]);

  // --- Logic ---
  const getSelectionOrWord = useCallback(() => {
    const content = useEditorStore.getState().content;
    if (!editorRef.current) return { s: 0, e: 0, text: '' };
    const s = editorRef.current.selectionStart;
    const e = editorRef.current.selectionEnd;
    if (s !== e) return { s, e, text: content.substring(s, e) };
    
    let start = s;
    let end = e;
    while (start > 0 && !/[\s\n]/.test(content[start - 1])) start--;
    while (end < content.length && !/[\s\n]/.test(content[end])) end++;
    return { s: start, e: end, text: content.substring(start, end) };
  }, []);

  const insertAtCursor = useCallback((text: string, selectionMode: 'end' | 'select' = 'end') => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      const runParse = async () => {
        const m = getMarked();
        if (m) {
          const html = await m.parse(text);
          insertHtmlAtCursor(html);
        } else {
          insertHtmlAtCursor(text);
        }
      };
      runParse();
      return;
    }

    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const scrollTop = editorRef.current.scrollTop;
    const scrollLeft = editorRef.current.scrollLeft;
    
    const finalText = text;

    const newContent = content.substring(0, start) + finalText + content.substring(end);
    setContent(newContent);
    
    setTimeout(() => {
      if (!editorRef.current) return;
      if (selectionMode === 'select') {
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start, start + finalText.length);
      } else {
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start + finalText.length, start + finalText.length);
      }
      editorRef.current.scrollTop = scrollTop;
      editorRef.current.scrollLeft = scrollLeft;
    }, 0);
  }, [ editorMode, insertHtmlAtCursor, setContent]);

  useEffect(() => {
    // Timer removed as per user request to hide only on typing
  }, [isEditorFocused, isWidgetVisible]);

  const widgetRef = useRef<HTMLDivElement>(null);
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');
  const [lockedToolsWidth, setLockedToolsWidth] = useState<number | null>(null);

  useEffect(() => {
    if (isWidgetMenuOpen && widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setMenuDirection(rect.top < 350 ? 'down' : 'up');
    }
  }, [isWidgetMenuOpen]);

  const showWidget = useCallback((x: number, y: number) => {
    if (widgetPos !== 'floating') {
      if (!isWidgetVisible) setIsWidgetVisible(true);
      return;
    }

    setFloatingPos({ x, y });
    if (!isWidgetVisible) setIsWidgetVisible(true);
  }, [widgetPos, isWidgetVisible]);

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (widgetPos === 'floating' && !e.ctrlKey && !e.metaKey && e.key !== 'Shift') {
      if (isWidgetVisible && !isWidgetMenuOpen) {
        setIsWidgetVisible(false);
      }
    }

    if (e.key === 'Enter') {
      if (!editorRef.current) return;
      const textarea = editorRef.current;
      const text = textarea.value;
      const caretPos = textarea.selectionStart;

      const lineStart = text.lastIndexOf('\n', caretPos - 1) + 1;
      const lineEnd = text.indexOf('\n', caretPos);
      const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
      const currentLine = text.slice(lineStart, actualLineEnd);

      // --- Part 1: Handle Block Elements / Lists first ---
      const quoteMatch = currentLine.match(/^(\s*>\s*)/);
      const unorderedListMatch = currentLine.match(/^(\s*[-*+]\s+\[[ xX]\]\s+)/) || currentLine.match(/^(\s*[-*+]\s+)/);
      const orderedListMatch = currentLine.match(/^(\s*)(\d+)([.)]\s+)/);

      if (quoteMatch) {
        const prefix = quoteMatch[1];
        e.preventDefault();
        if (currentLine.trim() === '>') {
          const before = text.slice(0, lineStart);
          const after = text.slice(actualLineEnd);
          const newText = before + '\n' + after;
          const newCaretPos = lineStart + 1;
          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
        } else {
          const before = text.slice(0, caretPos);
          const after = text.slice(caretPos);
          const newText = before + '\n' + prefix + after;
          const newCaretPos = caretPos + 1 + prefix.length;
          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
        }
        return;
      }

      if (unorderedListMatch) {
        const prefix = unorderedListMatch[1];
        e.preventDefault();
        const cleanLine = currentLine.trim();
        if (cleanLine === '-' || cleanLine === '*' || cleanLine === '+' || cleanLine === '- [ ]' || cleanLine === '- [x]' || cleanLine === '- [X]') {
          const before = text.slice(0, lineStart);
          const after = text.slice(actualLineEnd);
          const newText = before + '\n' + after;
          const newCaretPos = lineStart + 1;
          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
        } else {
          let newPrefix = prefix;
          if (prefix.includes('[x]')) {
            newPrefix = prefix.replace('[x]', '[ ]');
          } else if (prefix.includes('[X]')) {
            newPrefix = prefix.replace('[X]', '[ ]');
          }
          const before = text.slice(0, caretPos);
          const after = text.slice(caretPos);
          const newText = before + '\n' + newPrefix + after;
          const newCaretPos = caretPos + 1 + newPrefix.length;
          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
        }
        return;
      }

      if (orderedListMatch) {
        const indent = orderedListMatch[1];
        const num = parseInt(orderedListMatch[2], 10);
        const delimiter = orderedListMatch[3];
        e.preventDefault();
        
        if (currentLine.trim() === `${num}.` || currentLine.trim() === `${num}`) {
          const before = text.slice(0, lineStart);
          const after = text.slice(actualLineEnd);
          const newText = before + '\n' + after;
          const newCaretPos = lineStart + 1;
          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
        } else {
          const nextNum = num + 1;
          const newPrefix = indent + nextNum + delimiter;
          const before = text.slice(0, caretPos);
          const after = text.slice(caretPos);
          const newText = before + '\n' + newPrefix + after;
          const newCaretPos = caretPos + 1 + newPrefix.length;
          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
        }
        return;
      }

      // --- Part 2: Handle Inline Formatting Continuation ---
      let activeTag = null;
      let activeCloseTag = null;
      let activeKey: 'bold' | 'italic' | 'code' | 'strikethrough' | 'sub' | 'sup' | 'phishy' | null = null;

      if (activeFormats.bold) { activeTag = '**'; activeCloseTag = '**'; activeKey = 'bold'; }
      else if (activeFormats.italic) { activeTag = '*'; activeCloseTag = '*'; activeKey = 'italic'; }
      else if (activeFormats.code) { activeTag = '`'; activeCloseTag = '`'; activeKey = 'code'; }
      else if (activeFormats.strikethrough) { activeTag = '~~'; activeCloseTag = '~~'; activeKey = 'strikethrough'; }
      else if (activeFormats.sub) { activeTag = '<sub>'; activeCloseTag = '</sub>'; activeKey = 'sub'; }
      else if (activeFormats.sup) { activeTag = '<sup>'; activeCloseTag = '</sup>'; activeKey = 'sup'; }
      else if (activeFormats.phishy) { activeTag = '<div class="phishy">'; activeCloseTag = '</div>'; activeKey = 'phishy'; }

      if (activeTag && activeCloseTag && activeKey) {
        e.preventDefault();

        if (currentLine === activeTag + activeCloseTag) {
          const before = text.slice(0, lineStart);
          const after = text.slice(actualLineEnd);
          
          const newText = before + '\n' + after;
          const newCaretPos = lineStart + 1;

          setContent(newText);
          setActiveFormats(prev => ({ ...prev, [activeKey!]: false }));
          
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
          return;
        }

        const tagLen = activeTag.length;
        const closeLen = activeCloseTag.length;
        const openIdx = text.lastIndexOf(activeTag, caretPos - tagLen);
        const closeIdx = text.indexOf(activeCloseTag, caretPos);

        let resultText = text;
        let resultCaretPos = caretPos;

        if (openIdx !== -1 && closeIdx !== -1 && openIdx < closeIdx) {
          const before = text.slice(0, openIdx);
          const inside = text.slice(openIdx + tagLen, closeIdx);
          const after = text.slice(closeIdx + closeLen);

          const trimmedInside = inside.trimEnd();
          const trailingSpaces = inside.slice(trimmedInside.length);

          resultText = before + activeTag + trimmedInside + activeCloseTag + trailingSpaces + after;
          resultCaretPos = before.length + tagLen + trimmedInside.length + closeLen + trailingSpaces.length;
        }

        const before = resultText.slice(0, resultCaretPos);
        const after = resultText.slice(resultCaretPos);
        
        const newText = before + '\n' + activeTag + activeCloseTag + after;
        const newCaretPos = resultCaretPos + 1 + activeTag.length;

        setContent(newText);
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
      }
    }
  }, [widgetPos, isWidgetVisible, isWidgetMenuOpen, activeFormats, saveCursorPosition, setContent]);

  const handleMarkdownFormat = useCallback((tag: string, closeTag: string = tag) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const text = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let formatKey: 'bold' | 'italic' | 'code' | 'strikethrough' | 'sub' | 'sup' | 'phishy' = 'bold';
    if (tag === '*') formatKey = 'italic';
    else if (tag === '`') formatKey = 'code';
    else if (tag === '~~') formatKey = 'strikethrough';
    else if (tag === '<sub>') formatKey = 'sub';
    else if (tag === '<sup>') formatKey = 'sup';
    else if (tag === '<div class="phishy">') formatKey = 'phishy';

    textarea.focus();

    if (start !== end) {
      const selectedText = text.slice(start, end);
      const before = text.slice(0, start);
      const after = text.slice(end);

      const newText = before + tag + selectedText + closeTag + after;
      setContent(newText);
      
      const newStart = start + tag.length;
      const newEnd = end + tag.length;
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newStart, newEnd);
        saveCursorPosition();
      }, 0);
      return;
    }

    if (activeFormats[formatKey]) {
      // 1. If we are right before the closeTag, we should simply JUMP OUT / ESCAPE the tag.
      // We also trim spaces inside the tag at both edges, moving them outside the formatting.
      if (text.substring(start, start + closeTag.length) === closeTag) {
        const tagLen = tag.length;
        const closeLen = closeTag.length;
        const openIdx = text.lastIndexOf(tag, start - tagLen);

        let newText = text;
        let newCaretPos = start + closeLen;

        if (openIdx !== -1 && openIdx < start) {
          const before = text.slice(0, openIdx);
          const inside = text.slice(openIdx + tagLen, start);
          const after = text.slice(start + closeLen);

          const trimmedInside = inside.trim();
          const leadingSpaces = inside.slice(0, inside.length - inside.trimStart().length);
          const trailingSpaces = inside.slice(inside.trimEnd().length);

          newText = before + leadingSpaces + tag + trimmedInside + closeTag + trailingSpaces + after;
          newCaretPos = before.length + leadingSpaces.length + tagLen + trimmedInside.length + closeLen + trailingSpaces.length;
        }

        setContent(newText);
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
        setActiveFormats(prev => ({ ...prev, [formatKey]: false }));
        return;
      }

      // 2. Otherwise, we strip the format from the surrounding tags
      const tagLen = tag.length;
      const closeLen = closeTag.length;
      const openIdx = text.lastIndexOf(tag, start - tagLen);
      const closeIdx = text.indexOf(closeTag, start);

      if (openIdx !== -1 && closeIdx !== -1 && openIdx < closeIdx) {
        const before = text.slice(0, openIdx);
        const inside = text.slice(openIdx + tagLen, closeIdx);
        const after = text.slice(closeIdx + closeLen);

        if (start < closeIdx) {
          const newText = before + inside + after;
          const newCaretPos = start - tagLen;
          setContent(newText);
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
          return;
        } 
        
        const trimmedInside = inside.trimEnd();
        const trailingSpaces = inside.slice(trimmedInside.length);

        const newText = before + tag + trimmedInside + closeTag + trailingSpaces + after;
        const newCaretPos = before.length + tagLen + trimmedInside.length + closeLen + trailingSpaces.length;

        setContent(newText);
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
      }
    } else {
      // 3. We are NOT inside the tag format. Let's look for a word adjacent to or under the cursor.
      let wordStart = start;
      let wordEnd = start;
      while (wordStart > 0 && /\w|[\u0400-\u04FF]/.test(text[wordStart - 1])) {
        wordStart--;
      }
      while (wordEnd < text.length && /\w|[\u0400-\u04FF]/.test(text[wordEnd])) {
        wordEnd++;
      }
      const word = text.slice(wordStart, wordEnd);

      if (word.length > 0 && start > wordStart && start < wordEnd) {
        // Check if the word already has the tags around it, to strip them
        const hasLeftTag = text.substring(wordStart - tag.length, wordStart) === tag;
        const hasRightTag = text.substring(wordEnd, wordEnd + closeTag.length) === closeTag;

        if (hasLeftTag && hasRightTag) {
          const before = text.slice(0, wordStart - tag.length);
          const after = text.slice(wordEnd + closeTag.length);
          const newText = before + word + after;
          setContent(newText);
          const newCaretPos = wordStart - tag.length + word.length;
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
        } else {
          // Wrap the word
          const before = text.slice(0, wordStart);
          const after = text.slice(wordEnd);
          const newText = before + tag + word + closeTag + after;
          setContent(newText);
          const newCaretPos = start + tag.length;
          setTimeout(() => {
            if (!editorRef.current) return;
            editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
            saveCursorPosition();
          }, 0);
        }
      } else {
        const before = text.slice(0, start);
        const after = text.slice(start);
        const newText = before + tag + closeTag + after;
        const newCaretPos = start + tag.length;
        
        setContent(newText);
        setTimeout(() => {
          if (!editorRef.current) return;
          editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(newCaretPos, newCaretPos);
          saveCursorPosition();
        }, 0);
      }
    }
  }, [activeFormats, saveCursorPosition, setContent]);

  const fmt = useCallback((prefix: string, suffix: string = prefix) => {
    if (editorMode === 'visual') {
      let formatKey: 'bold' | 'italic' | 'strikethrough' | 'sub' | 'sup' | 'code' | 'phishy' | null = null;
      if (prefix === '**') formatKey = 'bold';
      else if (prefix === '*') formatKey = 'italic';
      else if (prefix === '~~') formatKey = 'strikethrough';
      else if (prefix === '<sub>') formatKey = 'sub';
      else if (prefix === '<sup>') formatKey = 'sup';
      else if (prefix === '`') formatKey = 'code';
      else if (prefix === '<div class="phishy">') formatKey = 'phishy';

      const isFormatActive = formatKey ? activeFormats[formatKey] : false;

      let isCollapsed = false;
      let range: Range | null = null;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        range = sel.getRangeAt(0);
        isCollapsed = sel.isCollapsed || range.collapsed;
      } else if (savedVisualRangeRef.current) {
        range = savedVisualRangeRef.current;
        isCollapsed = range.collapsed;
      }

      // 1. If format is active AND cursor is collapsed, we handle EXITING/DEACTIVATING the format.
      // We should jump out of the active element instead of stripping the formatting from the word.
      if (isCollapsed && isFormatActive && formatKey && range) {
        let activeElement: HTMLElement | null = null;
        let temp = range.startContainer as Node | null;
        while (temp && temp !== wysiwygRef.current) {
          if (temp.nodeType === Node.ELEMENT_NODE) {
            const tagName = (temp as HTMLElement).tagName.toUpperCase();
            if (formatKey === 'bold' && (tagName === 'STRONG' || tagName === 'B')) {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'italic' && (tagName === 'EM' || tagName === 'I')) {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'strikethrough' && (tagName === 'STRIKE' || tagName === 'DEL' || tagName === 'S')) {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'sub' && tagName === 'SUB') {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'sup' && tagName === 'SUP') {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'code' && tagName === 'CODE') {
              activeElement = temp as HTMLElement;
              break;
            }
            if (formatKey === 'phishy' && (tagName === 'SPAN' || tagName === 'DIV') && (temp as HTMLElement).classList.contains('phishy')) {
              activeElement = temp as HTMLElement;
              break;
            }
          }
          temp = temp.parentNode;
        }

        if (activeElement) {
          let isAtEnd = false;
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const textContent = range.startContainer.textContent || '';
            const offset = range.startOffset;
            const remainingText = textContent.substring(offset);
            isAtEnd = /^[\u200B]*$/.test(remainingText);
          } else {
            isAtEnd = range.startContainer === activeElement && range.startOffset === activeElement.childNodes.length;
          }
          
          if (isAtEnd) {
            const parent = activeElement.parentNode;
            if (parent) {
              const zwsp = document.createTextNode('\u200B');
              parent.insertBefore(zwsp, activeElement.nextSibling);
              
              const newRange = document.createRange();
              newRange.setStart(zwsp, 1);
              newRange.setEnd(zwsp, 1);
              
              const currentSel = window.getSelection();
              if (currentSel) {
                currentSel.removeAllRanges();
                currentSel.addRange(newRange);
              }
              
              if (wysiwygRef.current) {
                wysiwygRef.current.focus({ preventScroll: true });
              }
              
              savedVisualRangeRef.current = newRange.cloneRange();
              
              setActiveFormats(prev => ({ ...prev, [formatKey!]: false }));
              updateContentFromWysiwyg();
              return;
            }
          }
        }
      }

      // 2. Determine if we should expand the word when RESTORING selection.
      // We only expand the word if:
      // - The cursor is collapsed
      // - The format is NOT currently active (we want to apply it to a word)
      // - The cursor is strictly inside a word (not at the start or end of a word or at a space)
      let shouldExpandWord = false;
      if (isCollapsed && range && !isFormatActive) {
        const node = range.startContainer;
        const offset = range.startOffset;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const textValue = node.nodeValue || '';
          const wordBoundaryRegex = /[\s\n.,!?;:"'()[\]{}*~`<>#_]/;
          let wStart = offset;
          let wEnd = offset;
          while (wStart > 0 && !wordBoundaryRegex.test(textValue[wStart - 1])) {
            wStart--;
          }
          while (wEnd < textValue.length && !wordBoundaryRegex.test(textValue[wEnd])) {
            wEnd++;
          }
          
          // Only expand if cursor is strictly inside/adjacent to word, and not at the very end of the text node (continuous typing)
          if (wStart < wEnd && offset > wStart && offset < wEnd) {
            shouldExpandWord = true;
          }
        }
      }

      restoreVisualSelection(shouldExpandWord);

      let command = '';
      if (prefix === '**') command = 'bold';
      else if (prefix === '*') command = 'italic';
      else if (prefix === '~~') command = 'strikeThrough';
      else if (prefix === '<sub>') command = 'subscript';
      else if (prefix === '<sup>') command = 'superscript';

      if (command) {
        document.execCommand(command, false);
        const selAfter = window.getSelection();
        if (selAfter && selAfter.rangeCount > 0 && shouldExpandWord) {
          selAfter.collapseToEnd();
          savedVisualRangeRef.current = selAfter.getRangeAt(0).cloneRange();
          updateContentFromWysiwyg();
          return;
        }
        const isCollapsedAfter = selAfter ? (selAfter.isCollapsed || (selAfter.rangeCount > 0 && selAfter.getRangeAt(0).collapsed)) : true;

        if (isCollapsedAfter) {
          // Toggle local state for immediate toolbar response
          let formatKeyToggle: 'bold' | 'italic' | 'strikethrough' | 'sub' | 'sup' = 'bold';
          if (command === 'italic') formatKeyToggle = 'italic';
          else if (command === 'strikeThrough') formatKeyToggle = 'strikethrough';
          else if (command === 'subscript') formatKeyToggle = 'sub';
          else if (command === 'superscript') formatKeyToggle = 'sup';
          
          setActiveFormats(prev => ({
            ...prev,
            [formatKeyToggle]: !prev[formatKeyToggle]
          }));
          
          if (wysiwygRef.current) {
            wysiwygRef.current.focus({ preventScroll: true });
          }
          return; // Skip updateContentFromWysiwyg to preserve typing command state
        }
      } else {
        if (prefix === '`') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<code>${text}</code>`);
          if (!text) {
            setActiveFormats(prev => ({ ...prev, code: true }));
          }
        } else if (prefix === '```\n') {
          const text = getVisualSelectionHtml() || 'code block';
          insertHtmlAtCursor(`<pre><code>${text}</code></pre>`);
        } else if (prefix === '<div class="phishy">') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<span class="phishy">${text}</span>`);
          if (!text) {
            setActiveFormats(prev => ({ ...prev, phishy: true }));
          }
        } else if (prefix.includes('text-left') || prefix === '<div class="text-left">\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<div class="text-left">${text}</div>`);
        } else if (prefix.includes('text-right') || prefix === '<div class="text-right">\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<div class="text-right">${text}</div>`);
        } else if (prefix.includes('text-justify') || prefix === '<div class="text-justify">\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<div class="text-justify">${text}</div>`);
        } else if (prefix.includes('<center>') || prefix === '<center>\n') {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`<center>${text}</center>`);
        } else {
          const text = getVisualSelectionHtml() || '';
          insertHtmlAtCursor(`${prefix}${text}${suffix}`);
        }
      }
      updateContentFromWysiwyg();
      return;
    }

    if (!editorRef.current) return;

    if (prefix === '**' || prefix === '*' || prefix === '`' || prefix === '~~' || prefix === '<sub>' || prefix === '<sup>' || prefix === '<div class="phishy">') {
      handleMarkdownFormat(prefix, suffix);
      return;
    }

    const range = getSelectionOrWord();
    
    if (range.text.length === 0) {
      const textToInsert = prefix + suffix;
      const newContent = useEditorStore.getState().content.substring(0, range.s) + textToInsert + useEditorStore.getState().content.substring(range.e);
      setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(range.s + prefix.length, range.s + prefix.length);
      }, 0);
    } else {
      const newText = prefix + range.text + suffix;
      const newContent = useEditorStore.getState().content.substring(0, range.s) + newText + useEditorStore.getState().content.substring(range.e);
      setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(range.s, range.s + newText.length);
      }, 0);
    }
  }, [ getSelectionOrWord, editorMode, insertHtmlAtCursor, getVisualSelectionHtml, restoreVisualSelection, handleMarkdownFormat, updateContentFromWysiwyg, activeFormats, setContent]);

  const deleteActiveTableRow = useCallback(() => {
    if (activeTableRow && wysiwygRef.current && wysiwygRef.current.contains(activeTableRow)) {
      const table = activeTableRow.closest('table');
      activeTableRow.remove();
      if (table && (!table.textContent || table.textContent.trim() === '')) {
        table.remove();
        setActiveTable(null);
      }
      setActiveTableRow(null);
      setActiveTableCell(null);
      updateContentFromWysiwyg();
      setIsWidgetVisible(false);
    }
  }, [activeTableRow, updateContentFromWysiwyg]);

  const deleteActiveTableCol = useCallback(() => {
    if (activeTableCell && activeTable && wysiwygRef.current && wysiwygRef.current.contains(activeTableCell)) {
      const colIndex = (activeTableCell as HTMLTableCellElement).cellIndex;
      const rows = activeTable.querySelectorAll('tr');
      rows.forEach(row => {
        if (row.cells[colIndex]) {
          row.cells[colIndex].remove();
        }
      });
      
      if (activeTable.rows.length === 0 || (activeTable.rows[0] && activeTable.rows[0].cells.length === 0)) {
        activeTable.remove();
        setActiveTable(null);
        setActiveTableRow(null);
      }
      setActiveTableCell(null);
      
      updateContentFromWysiwyg();
      setIsWidgetVisible(false);
    }
  }, [activeTable, activeTableCell, updateContentFromWysiwyg]);

  const deleteActiveTable = useCallback(() => {
    if (activeTable && wysiwygRef.current && wysiwygRef.current.contains(activeTable)) {
      activeTable.remove();
      setActiveTable(null);
      setActiveTableRow(null);
      setActiveTableCell(null);
      updateContentFromWysiwyg();
      setIsWidgetVisible(false);
    }
  }, [activeTable, updateContentFromWysiwyg]);

  const fmtLine = useCallback((prefix: string) => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      restoreVisualSelection(true);
      if (prefix === '# ') {
        document.execCommand('formatBlock', false, '<h1>');
      } else if (prefix === '## ') {
        document.execCommand('formatBlock', false, '<h2>');
      } else if (prefix === '### ') {
        document.execCommand('formatBlock', false, '<h3>');
      } else if (prefix === '> ') {
        document.execCommand('formatBlock', false, '<blockquote>');
      } else if (prefix === '- ') {
        document.execCommand('insertUnorderedList', false);
      } else if (prefix === '1. ') {
        document.execCommand('insertOrderedList', false);
      } else if (prefix === '- [ ] ') {
        insertHtmlAtCursor('<ul class="task-list"><li><input type="checkbox" style="margin-right: 0.5rem;" /> Task</li></ul>');
      } else {
        const text = getVisualSelectionHtml();
        insertHtmlAtCursor(`${prefix}${text}`);
      }
      updateContentFromWysiwyg();
      return;
    }

    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    
    if (start === end) {
      const lastNewline = content.lastIndexOf('\n', start - 1) + 1;
      const newContent = content.substring(0, lastNewline) + prefix + content.substring(lastNewline);
      setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    } else {
      // Multi-line selection
      const selectedText = content.substring(start, end);
      const lines = selectedText.split('\n');
      const newText = lines.map(line => line.trim() ? prefix + line : line).join('\n');
      const newContent = content.substring(0, start) + newText + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus({ preventScroll: true }); editorRef.current.setSelectionRange(start, start + newText.length);
      }, 0);
    }
  }, [ editorMode, insertHtmlAtCursor, getVisualSelectionHtml, restoreVisualSelection, updateContentFromWysiwyg, setContent]);

  const handleLink = useCallback(async () => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      restoreVisualSelection(true);
      const selectionHtml = getVisualSelectionHtml() || '';
      const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(selectionHtml.trim());
      
      if (isUrl) {
        const label = await promptDialog(t('linkPrompt'), "");
        if (label !== null) {
          const cleanLabel = label.trim() || selectionHtml;
          insertHtmlAtCursor(`<a href="${selectionHtml.trim()}">${cleanLabel}</a>`);
        }
      } else {
        const url = await promptDialog(t('urlPrompt'), "https://");
        if (url) {
          document.execCommand('createLink', false, url);
          updateContentFromWysiwyg();
        }
      }
      return;
    }

    const selection = getSelectionOrWord();
    const trimmed = selection.text.trim();
    const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(trimmed);
    
    if (isUrl) {
      const label = await promptDialog(t('linkPrompt'), "");
      if (label !== null) {
        const newText = label ? `[${label}](${trimmed})` : `[${trimmed}](${trimmed})`;
        const newContent = content.substring(0, selection.s) + newText + content.substring(selection.e);
        setContent(newContent);
      }
    } else {
      const url = await promptDialog(t('urlPrompt'), "https://");
      if (url) fmt('[', `](${url})`);
    }
  }, [ t, getSelectionOrWord, fmt, promptDialog, editorMode, restoreVisualSelection, getVisualSelectionHtml, insertHtmlAtCursor, updateContentFromWysiwyg, setContent]);

  const handleIndent = useCallback(() => {
    const content = useEditorStore.getState().content;
    if (editorMode === 'visual') {
      restoreVisualSelection(false);
      const sel = window.getSelection();
      let insideList = false;
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        insideList = !!(node as HTMLElement)?.closest?.('li, ul, ol');
      }
      
      if (insideList) {
        document.execCommand('indent', false);
      } else {
        insertHtmlAtCursor('&nbsp;&nbsp;&nbsp;&nbsp;');
      }
      updateContentFromWysiwyg();
      return;
    }
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    const lines = selectedText.split('\n');
    const newText = lines.map(line => '    ' + line).join('\n');
    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);
  }, [ editorMode, restoreVisualSelection, updateContentFromWysiwyg, insertHtmlAtCursor, setContent]);

  const handleWysiwygKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMod = e.ctrlKey || e.metaKey;
    
    if (widgetPos === 'floating' && !isMod && e.key !== 'Shift') {
      if (isWidgetVisible && !isWidgetMenuOpen) {
        setIsWidgetVisible(false);
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      handleIndent();
      return;
    }

    if (e.key === 'Enter' && !isMod && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        let blockElement = sel.focusNode as HTMLElement | null;
        while (blockElement && blockElement.nodeType !== Node.ELEMENT_NODE) {
            blockElement = blockElement.parentElement as HTMLElement | null;
        }
        if (blockElement && blockElement.closest) {
            const headingElement = blockElement.closest('h1, h2, h3, h4, h5, h6, blockquote, center');
            if (headingElement && (headingElement.textContent || '').replace(/[\u200B\s\n]/g, '') === '') {
                e.preventDefault();
                // Instead of formatBlock, we manually replace it to ensure it becomes a paragraph
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                if (headingElement.parentNode) headingElement.parentNode.replaceChild(p, headingElement);
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
                updateContentFromWysiwyg();
                return;
            }
        }
      }
    }

    if ((e.key === ' ' || e.key === 'Enter') && !isMod) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        const node = sel.focusNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          const offset = sel.focusOffset;
          const headText = text.substring(0, offset);
          const words = headText.split(/[\s\n]/);
          const lastWord = words[words.length - 1];
          if (lastWord && isImageAndProxyUrl(lastWord.trim())) {
            e.preventDefault();
            const trimmedWord = lastWord.trim();
            const beforeWord = headText.substring(0, headText.length - lastWord.length);
            const afterCursor = text.substring(offset);
            
            node.nodeValue = beforeWord;
            
            const img = document.createElement('img');
            img.src = trimmedWord;
            img.alt = 'image';
            
            const parent = node.parentNode;
            if (parent) {
              const nextSib = node.nextSibling;
              parent.insertBefore(img, nextSib);
              
              const spacer = e.key === ' ' ? '\u00A0' : '\n';
              const suffixNode = document.createTextNode(spacer + afterCursor);
              parent.insertBefore(suffixNode, img.nextSibling);
              
              const newRange = document.createRange();
              newRange.setStart(suffixNode, 1);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              
              updateContentFromWysiwyg();
              return;
            }
          }
        }
      }
    }

    if (e.key === ' ' && !isMod) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        const node = sel.focusNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          const offset = sel.focusOffset;
          if (offset === text.length) {
            let format = null;
            if (text === '#') format = '<h1>';
            else if (text === '##') format = '<h2>';
            else if (text === '###') format = '<h3>';
            else if (text === '####') format = '<h4>';
            else if (text === '>') format = '<blockquote>';
            
            if (text === '-') {
                e.preventDefault();
                node.textContent = '';
                document.execCommand('insertUnorderedList', false);
                return;
            } else if (text === '1.') {
                e.preventDefault();
                node.textContent = '';
                document.execCommand('insertOrderedList', false);
                return;
            } else if (format) {
              e.preventDefault();
              node.textContent = '';
              document.execCommand('formatBlock', false, format);
              return;
            }
          }
        }
      }
    }

    // Formatting keyboard shortcuts
    if (isMod) {
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        fmt('**');
        return;
      }
      if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        fmt('*');
        return;
      }
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleLink();
        return;
      }
    }

    if (e.shiftKey && isMod) {
      if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        fmt('~~');
        return;
      }
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        fmt('`');
        return;
      }
    }
    
    // On-the-fly markdown shortcut expander
    if (e.key === ' ') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const startNode = range.startContainer;
        
        if (startNode.nodeType === Node.TEXT_NODE) {
          const textValue = startNode.nodeValue || '';
          const offset = range.startOffset;
          const headText = textValue.substring(0, offset);
          
          let match = false;
          let blockTag = '';
          let cmd = '';
          
          if (headText === '#') {
            blockTag = 'h1';
            match = true;
          } else if (headText === '##') {
            blockTag = 'h2';
            match = true;
          } else if (headText === '###') {
            blockTag = 'h3';
            match = true;
          } else if (headText === '####') {
            blockTag = 'h4';
            match = true;
          } else if (headText === '>') {
            blockTag = 'blockquote';
            match = true;
          } else if (headText === '-' || headText === '*') {
            cmd = 'insertUnorderedList';
            match = true;
          } else if (headText === '1.') {
            cmd = 'insertOrderedList';
            match = true;
          } else if (headText === '- [ ]') {
            blockTag = 'checklist';
            match = true;
          }
          
          if (match) {
            e.preventDefault();
            
            // Remove the characters before space
            startNode.nodeValue = textValue.substring(offset);
            
            if (cmd) {
              document.execCommand(cmd, false);
            } else if (blockTag === 'checklist') {
              insertHtmlAtCursor('<ul class="task-list"><li><input type="checkbox" style="margin-right: 0.5rem;" /> </li></ul>');
            } else if (blockTag === 'blockquote') {
              document.execCommand('formatBlock', false, '<blockquote>');
              // Ensure there is a block element inside
              const sel2 = window.getSelection();
              if (sel2 && sel2.rangeCount > 0) {
                 let curr = sel2.getRangeAt(0).startContainer;
                 if (curr.nodeType === Node.TEXT_NODE) curr = curr.parentNode as Node;
                 if ((curr as HTMLElement).tagName === 'BLOCKQUOTE') {
                    document.execCommand('formatBlock', false, '<p>');
                 }
              }
            } else if (blockTag) {
              document.execCommand('formatBlock', false, `<${blockTag}>`);
            }
            
            updateContentFromWysiwyg();
          }
        }
      }
    }
    
    // Check if we are inside a table cell when pressing Enter
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
        const range = sel.getRangeAt(0);
        let current: Node | null = range.startContainer;
        if (current.nodeType === Node.TEXT_NODE) current = current.parentNode;
        
        const spacer = (current as Element)?.closest?.('.table-spacer');
        if (spacer && wysiwygRef.current.contains(spacer)) {
          e.preventDefault();
          spacer.removeAttribute('data-empty');
          spacer.removeAttribute('data-placeholder');
          spacer.classList.remove('table-spacer');
          spacer.classList.remove('top-spacer');
          spacer.classList.remove('bottom-spacer');
          document.execCommand('insertParagraph');
          updateContentFromWysiwyg();
          return;
        }
        
        const tableCell = (current as Element)?.closest?.('td, th');
        if (tableCell && wysiwygRef.current.contains(tableCell)) {
          e.preventDefault();
          document.execCommand('insertLineBreak');

          updateContentFromWysiwyg();
          return;
        }
      }
    }

    // Press Enter on empty line to break out of formatting containers (quotes, centered text, etc)
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && wysiwygRef.current) {
        const range = sel.getRangeAt(0);
        const node: Node | null = range.startContainer;
        
        if (node) {
          // Find the block container we might want to escape
          let escapeTarget: HTMLElement | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
          while (escapeTarget && escapeTarget !== wysiwygRef.current && 
                 !['BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'CENTER'].includes(escapeTarget.tagName) &&
                 !(escapeTarget.tagName === 'DIV' && Array.from(escapeTarget.classList).some(c => c.startsWith('text-') || c.startsWith('pull-') || c === 'phishy'))) {
            escapeTarget = escapeTarget.parentElement;
          }

          if (escapeTarget && escapeTarget !== wysiwygRef.current) {
            // Insert a temporary marker to check the neighborhood
            const marker = document.createElement('span');
            marker.id = 'temp-caret-marker';
            try {
              range.insertNode(marker);

              const hasText = (n: Node): boolean => {
                if (n.nodeType === Node.TEXT_NODE) {
                  return (n.nodeValue?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
                }
                if (n.nodeType === Node.ELEMENT_NODE) {
                  const el = n as HTMLElement;
                  if (el.tagName === 'BR' || el.id === 'temp-caret-marker') return false;
                  return (el.textContent?.replace(/[\u200B\s\n]/g, '') || '').length > 0;
                }
                return false;
              };

              // Scan left for any text on the current line
              let isLeftEmpty = true;
              let currLeft: Node | null = marker;
              while (currLeft && currLeft !== escapeTarget) {
                let sib = currLeft.previousSibling;
                while (sib) {
                  if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') {
                    break; // stopped by line break
                  }
                  if (hasText(sib)) {
                    isLeftEmpty = false;
                    break;
                  }
                  sib = sib.previousSibling;
                }
                if (!isLeftEmpty || (currLeft.previousSibling && (currLeft.previousSibling as HTMLElement).tagName === 'BR')) {
                  break;
                }
                currLeft = currLeft.parentNode;
              }

              // Scan right for any text on the current line
              let isRightEmpty = true;
              let currRight: Node | null = marker;
              while (currRight && currRight !== escapeTarget) {
                let sib = currRight.nextSibling;
                while (sib) {
                  if (sib.nodeType === Node.ELEMENT_NODE && (sib as HTMLElement).tagName === 'BR') {
                    break; // stopped by line break
                  }
                  if (hasText(sib)) {
                    isRightEmpty = false;
                    break;
                  }
                  sib = sib.nextSibling;
                }
                if (!isRightEmpty || (currRight.nextSibling && (currRight.nextSibling as HTMLElement).tagName === 'BR')) {
                  break;
                }
                currRight = currRight.parentNode;
              }

              if (isLeftEmpty && isRightEmpty) {
                e.preventDefault();

                // Find the direct child of escapeTarget that is or contains the marker
                let directChild: Node | null = marker;
                while (directChild && directChild.parentNode !== escapeTarget) {
                  directChild = directChild.parentNode;
                }

                if (directChild) {
                  const childs: Node[] = Array.from(escapeTarget.childNodes);
                  const directIndex = childs.indexOf(directChild);

                  const leftChildren = directIndex > 0 ? childs.slice(0, directIndex) : [];
                  const rightChildren = directIndex + 1 < childs.length ? childs.slice(directIndex + 1) : [];

                  // Remove trailing <br> from left side
                  if (leftChildren.length > 0) {
                    const last = leftChildren[leftChildren.length - 1];
                    if (last.nodeType === Node.ELEMENT_NODE && (last as HTMLElement).tagName === 'BR') {
                      leftChildren.pop();
                    }
                  }

                  // Remove leading <br> from right side
                  if (rightChildren.length > 0) {
                    const first = rightChildren[0];
                    if (first.nodeType === Node.ELEMENT_NODE && (first as HTMLElement).tagName === 'BR') {
                      rightChildren.shift();
                    }
                  }

                  // Create the escape paragraph
                  const p = document.createElement('p');
                  p.innerHTML = '<br>';

                  const parentNode = escapeTarget.parentNode;
                  if (parentNode) {
                    const leftHasContent = leftChildren.some(hasText);
                    const rightHasContent = rightChildren.some(hasText);

                    if (leftHasContent && rightHasContent) {
                      // Split in half
                      const leftBlock = escapeTarget;
                      const rightBlock = document.createElement(leftBlock.tagName.toLowerCase());
                      rightBlock.className = leftBlock.className;

                      leftBlock.innerHTML = '';
                      leftChildren.forEach(c => leftBlock.appendChild(c));

                      rightChildren.forEach(c => rightBlock.appendChild(c));

                      parentNode.insertBefore(rightBlock, leftBlock.nextSibling);
                      parentNode.insertBefore(p, rightBlock);
                    } else if (leftHasContent) {
                      // Escape at the end
                      escapeTarget.innerHTML = '';
                      leftChildren.forEach(c => escapeTarget.appendChild(c));
                      parentNode.insertBefore(p, escapeTarget.nextSibling);
                    } else if (rightHasContent) {
                      // Escape at the beginning
                      escapeTarget.innerHTML = '';
                      rightChildren.forEach(c => escapeTarget.appendChild(c));
                      parentNode.insertBefore(p, escapeTarget);
                    } else {
                      // Both sides are empty, completely replace escapeTarget with paragraph
                      parentNode.replaceChild(p, escapeTarget);
                    }

                    // Focus the new paragraph
                    const newRange = document.createRange();
                    newRange.selectNodeContents(p);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                    savedVisualRangeRef.current = newRange.cloneRange();
                    p.focus();

                    updateContentFromWysiwyg();
                    return;
                  }
                }
              }
            } catch (err) {
              console.warn('Unified escape breakout error:', err);
            } finally {
              if (marker.parentNode) {
                marker.parentNode.removeChild(marker);
              }
            }
          }
        }

        let blockNode = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
        while (blockNode && blockNode !== wysiwygRef.current && !['P', 'DIV', 'BLOCKQUOTE', 'LI', 'CENTER', 'PRE'].includes(blockNode.tagName)) {
           blockNode = blockNode.parentElement;
        }

        if (blockNode && blockNode !== wysiwygRef.current) {
           const textContent = blockNode.textContent?.replace(/\u200B/g, '').trim();
           if (textContent === '' || textContent === undefined) {
               // Check if the empty block has formatting elements inside it or active formats
               const formattingTags = ['B', 'STRONG', 'I', 'EM', 'STRIKE', 'S', 'CODE', 'SUB', 'SUP', 'SPAN'];
               const hasFormattingElements = Array.from(blockNode.querySelectorAll('*')).some(el => 
                 formattingTags.includes(el.tagName)
               );
               const hasActiveFormats = activeFormats.bold || activeFormats.italic || activeFormats.strikethrough || activeFormats.sub || activeFormats.sup || activeFormats.code || activeFormats.phishy;
               
               if (hasFormattingElements || hasActiveFormats) {
                 // Clear formatting by resetting innerHTML to a single <br>
                 blockNode.innerHTML = '<br>';
                 
                 // Reset browser formatting states
                 try {
                   if (document.queryCommandState('bold')) document.execCommand('bold', false);
                   if (document.queryCommandState('italic')) document.execCommand('italic', false);
                   if (document.queryCommandState('strikeThrough')) document.execCommand('strikeThrough', false);
                   if (document.queryCommandState('subscript')) document.execCommand('subscript', false);
                   if (document.queryCommandState('superscript')) document.execCommand('superscript', false);
                 } catch (err) {
                   console.warn('Failed to clear commands:', err);
                 }
                 
                 setActiveFormats({
                   bold: false,
                   italic: false,
                   code: false,
                   strikethrough: false,
                   sub: false,
                   sup: false,
                   phishy: false
                 });
               }

               let curr: HTMLElement | null = blockNode as HTMLElement;
               let containerToEscape: HTMLElement | null = null;
               while (curr && curr !== wysiwygRef.current) {
                  if (['BLOCKQUOTE', 'PRE', 'CENTER', 'UL', 'OL'].includes(curr.tagName) || 
                      (curr.tagName === 'DIV' && Array.from(curr.classList).some(c => c.startsWith('text-') || c.startsWith('pull-') || c === 'phishy'))) {
                    containerToEscape = curr;
                    break;
                  }
                  curr = curr.parentNode as HTMLElement;
               }

               if (containerToEscape || hasFormattingElements || hasActiveFormats) {
                 e.preventDefault();
                 
                 const p = document.createElement('p');
                 p.innerHTML = '<br>';
                 
                 const targetParent = containerToEscape ? containerToEscape.parentNode : blockNode.parentNode;
                 const targetSibling = containerToEscape ? containerToEscape.nextSibling : blockNode.nextSibling;

                 if (targetSibling) {
                   targetParent?.insertBefore(p, targetSibling);
                 } else {
                   targetParent?.appendChild(p);
                 }
                 
                 if (containerToEscape) {
                   const containerTextContent = containerToEscape.textContent?.replace(/\u200B/g, '').trim();
                   if (!containerTextContent) {
                     containerToEscape.parentNode?.removeChild(containerToEscape);
                   } else if (blockNode !== containerToEscape && containerToEscape.contains(blockNode)) {
                     blockNode.parentNode?.removeChild(blockNode);
                   }
                 }
                 
                 const newRange = document.createRange();
                 newRange.selectNodeContents(p);
                 newRange.collapse(true);
                 sel.removeAllRanges();
                 sel.addRange(newRange);
                 
                 if (wysiwygRef.current) {
                   updateContentFromWysiwyg();
                 }
                 return;
               }
           }
        }
      }
    }

    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !wysiwygRef.current) return;
      const range = sel.getRangeAt(0);

      let current: Node | null = range.startContainer;
      if (current.nodeType === Node.TEXT_NODE) current = current.parentNode;
      
      const isListItem = (current as Element)?.closest?.('li');
      if (isListItem && wysiwygRef.current.contains(isListItem)) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* ignore */ }
        document.execCommand('insertParagraph');
        
        // Ensure it created a p, not a div (Chrome sometimes ignores defaultParagraphSeparator if inside div)
        setTimeout(() => {
           if (!wysiwygRef.current) return;
           const sel2 = window.getSelection();
           if (sel2 && sel2.rangeCount > 0) {
              let node = sel2.focusNode;
              while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
              if (node && ((node as HTMLElement).tagName === 'DIV') && !(node as HTMLElement).className) {
                  // It created a naked DIV instead of P
                  const p = document.createElement('p');
                  p.innerHTML = (node as HTMLElement).innerHTML || '<br>';
                  if (node.parentNode) node.parentNode.replaceChild(p, node);
                  const r = document.createRange();
                  r.selectNodeContents(p);
                  r.collapse(false);
                  sel2.removeAllRanges();
                  sel2.addRange(r);
              }
           }
           updateContentFromWysiwyg();
        }, 0);
        return;
      } else {
        e.preventDefault();
        document.execCommand('insertLineBreak');
        updateContentFromWysiwyg();
        return;
      }
    }
  }, [fmt, handleLink, insertHtmlAtCursor, widgetPos, isWidgetVisible, isWidgetMenuOpen, setIsWidgetVisible, updateContentFromWysiwyg, activeFormats, handleIndent]);

  const importTable = useCallback(() => {
    setActiveModal('tableImport');
  }, []);

  const processTableImport = useCallback(() => {
    const data = tableImportText;
    if (!data) {
      setActiveModal(null);
      return;
    }

    // Split by lines, handle all newline types
    // We don't trim lines here because it would remove leading tabs (empty first cells)
    const lines = data.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) {
      setActiveModal(null);
      return;
    }

    // Detect delimiter
    const delimiters = ['\t', ';', ',', '|'];
    let bestDelimiter = '\t';
    let maxConsistency = -1;

    delimiters.forEach(d => {
      const colCounts = lines.map(l => l.split(d).length);
      const avg = colCounts.reduce((a, b) => a + b, 0) / colCounts.length;
      if (avg > 1.1) { // Reduced threshold to allow simple 2-col tables
        const mostFrequent = colCounts.reduce((acc, curr) => {
          acc[curr] = (acc[curr] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        const frequency = Math.max(...Object.values(mostFrequent));
        if (frequency > maxConsistency) {
          maxConsistency = frequency;
          bestDelimiter = d;
        }
      }
    });

    const rows = lines.map(line => {
      let parts: string[];
      if (bestDelimiter === '|') {
        // For Markdown tables, we trim the line itself but keep empty cells
        const trimmedLine = line.trim();
        parts = trimmedLine.split('|').map(p => p.trim());
        if (parts[0] === '') parts.shift();
        if (parts[parts.length - 1] === '') parts.pop();
      } else if (bestDelimiter === ',') {
        // Simple CSV parsing (handles quotes)
        const partsArray = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            partsArray.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        partsArray.push(current.trim());
        parts = partsArray;
      } else {
        // For TSV (Excel), we do NOT trim the line before split to keep \t at start
        parts = line.split(bestDelimiter).map(p => p.trim());
      }
      return parts;
    });

    // Determine the true number of columns (max found in any row to be safe)
    const maxCols = Math.max(...rows.map(r => r.length));
    
    // Normalize rows: ensure every row has exact same number of columns
    const normalizedRows = rows.map(r => {
      const newRow = [...r];
      while (newRow.length < maxCols) {
        newRow.push(''); // Pad missing cells
      }
      if (newRow.length > maxCols) {
        return newRow.slice(0, maxCols); // Crop extra
      }
      return newRow;
    });

    let resultTable = '';
    if (tableImportFormat === 'markdown') {
      normalizedRows.forEach((cols, i) => {
        const cleanCols = cols.map(c => {
          // Replace newlines with <br/> but try to avoid breaking markdown link syntax [text](url)
          // If a cell is purely a markdown link, we might want to keep it on one line.
          // For now, standard <br/> is mostly fine, but let's ensure we don't have leading/trailing garbage.
          return c.replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br/>').trim();
        });
        resultTable += '| ' + cleanCols.join(' | ') + ' |\n';
        if (i === 0) {
          resultTable += '| ' + cleanCols.map(() => '---').join(' | ') + ' |\n';
        }
      });
    } else {
      resultTable = '<table data-format="html" style="width:100%">\n';
      normalizedRows.forEach((cols, i) => {
        resultTable += '  <tr>\n';
        cols.forEach(col => {
          const tag = i === 0 ? 'th' : 'td';
          resultTable += `    <${tag}>${col}</${tag}>\n`;
        });
        resultTable += '  </tr>\n';
      });
      resultTable += '</table>';
    }
    
    insertAtCursor(resultTable, 'end');
    setTableImportText('');
    setActiveModal(null);
    notify(t('importTableSuccess'), 'success');
  }, [tableImportText, insertAtCursor, tableImportFormat, t, notify]);

  const parseImages = useCallback((input: string) => {
    setSourceInput(input);
    const urlPattern = /(https?:\/\/[^[\]\s<>"'()]+?\.(?:jpg|jpeg|png|webp|gif|svg))/gi;
    const matches = input.match(urlPattern) || [];
    const uniqueUrls = Array.from(new Set(matches));
    
    setImages(prev => {
      const existingUrls = new Set(prev.map(img => img.url));
      const newImages = uniqueUrls.map(url => ({
        url,
        name: url.split('/').pop()?.split('?')[0] || 'image',
        selected: false
      })).filter(img => !existingUrls.has(img.url));
      
      const keptImages = prev.filter(img => uniqueUrls.includes(img.url));
      return [...keptImages, ...newImages];
    });
  }, []);

  const toggleImageSelection = (filteredIdx: number) => {
    const url = filteredLocalImages[filteredIdx]?.url;
    if (!url) return;
    setImages(prev => {
      const idx = prev.findIndex(i => i.url === url);
      if (idx === -1) return prev;
      const newImages = [...prev];
      newImages[idx] = { ...newImages[idx], selected: !newImages[idx].selected };
      return newImages;
    });
  };

  const moveImageLocal = (filteredIdx: number, direction: -1 | 1) => {
    const targetFilteredIdx = filteredIdx + direction;
    if (targetFilteredIdx < 0 || targetFilteredIdx >= filteredLocalImages.length) return;

    const url1 = filteredLocalImages[filteredIdx].url;
    const url2 = filteredLocalImages[targetFilteredIdx].url;

    setImages(prev => {
      const idx1 = prev.findIndex(i => i.url === url1);
      const idx2 = prev.findIndex(i => i.url === url2);
      if (idx1 === -1 || idx2 === -1) return prev;

      const newImages = [...prev];
      const temp = newImages[idx1];
      newImages[idx1] = newImages[idx2];
      newImages[idx2] = temp;
      return newImages;
    });
  };

  // Load data on mount
  const initVault = useCallback(async () => {
    const initialized = await SecurityService.isInitialized();
    setIsVaultInitialized(initialized);
    
    const accounts = await SecurityService.getAccounts();
    const usernames = Array.from(new Set(accounts.map(a => a.username)));
    setVaultAccounts(usernames);
    
    if (usernames.length > 0) {
      const firstUser = usernames[0];
      setSelectedVaultUser(prev => prev || firstUser);
      setUsername(prev => prev || firstUser);
    }
    
    const rawPxKey = localStorage.getItem('steem_pexels_key_raw');
    if (rawPxKey) {
      setPexelsApiKey(rawPxKey);
    } else {
      const pxKey = await SecurityService.getPexelsKey();
      if (pxKey) setPexelsApiKey(pxKey);
    }
    const encryptedPixabay = await SecurityService.getApiKey('pixabay');
    if (encryptedPixabay) setPixabayApiKey(encryptedPixabay);
    const encryptedUnsplashAccess = await SecurityService.getApiKey('unsplashAccess');
    if (encryptedUnsplashAccess) setUnsplashAccessKey(encryptedUnsplashAccess);
  }, []);

  useEffect(() => {
    initVault();

    // Load saved images and links
    const savedLinks = localStorage.getItem('steem_editor_source_links');
    if (savedLinks) {
      parseImages(savedLinks);
    } else {
      const savedImages = localStorage.getItem(STORAGE_KEY_IMAGES);
      if (savedImages) {
        try {
          const parsed = JSON.parse(savedImages);
          if (Array.isArray(parsed)) {
            setImages(parsed);
          }
        } catch (e) {
          console.error("Failed to load images", e);
        }
      }
    }

    // Додаємо невелику затримку перед активацією збереження
    setTimeout(() => {
      isImagesLoaded.current = true;
    }, 1000);

    SecurityService.setStatusCallback((unlocked) => {
      setIsUnlocked(unlocked);
    });

    const handleKeyboardResize = () => {
      // Prevents gallery/sidebar from closing when mobile keyboard pops up
      // Keyboard usually only affects height, not width
    };
    window.addEventListener('resize', handleKeyboardResize);
    
    return () => {
      SecurityService.setStatusCallback(() => {});
      window.removeEventListener('resize', handleKeyboardResize);
    };
  }, [parseImages, initVault]);

  useEffect(() => {
    localStorage.setItem('steem_pexels_settings', JSON.stringify(pexelsSettings));
  }, [pexelsSettings]);

  useEffect(() => {
    localStorage.setItem('steem_gallery_cache_results', JSON.stringify(pexelsResults));
  }, [pexelsResults]);

  const toggleGalleryMode = (mode: 'local' | 'pexels' | 'unsplash' | 'pixabay') => {
    setGalleryMode(mode);
    setGallerySearch('');
    // No longer clearing results here to support caching
  };

  const handleExternalSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) return;

    let apiKey = '';
    if (galleryMode === 'pexels') apiKey = pexelsApiKey || '';
    if (galleryMode === 'pixabay') apiKey = pixabayApiKey || '';
    if (galleryMode === 'unsplash') apiKey = unsplashAccessKey || '';

    if (!apiKey) {
      if (!isUnlocked && isVaultInitialized) {
        setVaultPin('');
        setActiveModal('unlock-pin');
        return;
      }
      const msg = galleryMode === 'pexels' ? t('pexelsKeyRequired') : 
                  galleryMode === 'pixabay' ? t('pixabayKeyRequired') : t('unsplashKeyRequired');
      notify(msg, 'error');
      return;
    }

    setIsSearchingPexels(true);
    try {
      let results: any[] = [];
      const trimmedKey = apiKey.trim();

      const fetchWithRetry = async (url: string, options: RequestInit) => {
        try {
          const resp = await fetch(url, options);
          if (resp.ok) return resp;
          throw new Error(`${resp.status} ${resp.statusText}`);
        } catch (err: any) {
          if (err.name === 'TypeError' || err.message.includes('fetch')) {
            // Try proxy as fallback if network/CORS error
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const proxyResp = await fetch(proxyUrl, options);
            if (proxyResp.ok) return proxyResp;
          }
          throw err;
        }
      };

      if (galleryMode === 'pexels') {
        const pRes = await PexelsService.searchPhotos(query, trimmedKey, page);
        results = pRes.map(p => ({
          id: p.id,
          url: p.src.large2x || p.src.large,
          thumb: performanceMode ? p.src.medium : (p.src.large2x || p.src.large),
          alt: p.alt || 'Pexels Photo',
          author: p.photographer,
          authorUrl: p.photographer_url,
          source: 'pexels'
        }));
      } else if (galleryMode === 'pixabay') {
        const url = `https://pixabay.com/api/?key=${trimmedKey}&q=${encodeURIComponent(query)}&page=${page}&image_type=photo&per_page=30`;
        const resp = await fetchWithRetry(url, {});
        const data = await resp.json();
        results = (data.hits || []).map((h: any) => ({
          id: h.id,
          url: h.largeImageURL,
          thumb: performanceMode ? h.webformatURL : h.largeImageURL,
          alt: h.tags || 'Pixabay Photo',
          author: h.user,
          authorUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
          source: 'pixabay'
        }));
      } else if (galleryMode === 'unsplash') {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=30&client_id=${trimmedKey}`;
        const resp = await fetchWithRetry(url, {});
        const data = await resp.json();
        results = (data.results || []).map((r: any) => ({
          id: r.id,
          url: r.urls.regular,
          thumb: performanceMode ? r.urls.small : r.urls.regular,
          alt: r.alt_description || 'Unsplash Photo',
          author: r.user.name,
          authorUrl: r.user.links.html,
          source: 'unsplash'
        }));
      }

      const mapped = results.map(r => ({ ...r, selected: false }));
      if (page === 1) setPexelsResults(mapped);
      else setPexelsResults(prev => {
        const existingIds = new Set(prev.map(p => p.id + p.source));
        const uniqueNew = mapped.filter(p => !existingIds.has(p.id + p.source));
        return [...prev, ...uniqueNew];
      });
      setPexelsPage(page);
    } catch (e: any) {
      console.error(e);
      notify(t('pexelsError'), 'error');
    } finally {
      setIsSearchingPexels(false);
    }
  };

  const shortenName = (name: string, max: number = 30) => {
    if (name.length <= max) return name;
    return name.substring(0, max) + '...';
  };

  const insertExternalImage = (photo: any, position: 'left' | 'right' | 'center' | 'plain') => {
    const url = photo.url.split('?')[0];
    const name = shortenName(photo.alt || 'Photo');
    const photographer = photo.author;
    const photographerUrl = photo.authorUrl;

    let attribution = '';
    if (pexelsSettings.withAttribution) {
      const source = (photo.source || 'pexels').toLowerCase();
      const sourceName = source === 'unsplash' ? 'Unsplash' : source === 'pixabay' ? 'Pixabay' : 'Pexels';
      attribution = `<div align="${singleCaptionAlign}"><sup>By <a href="${photographerUrl}">${photographer}</a> on <a href="https://${source}.com">${sourceName}</a></sup></div>`;
    }

    if (imageInsertFormat === 'markdown') {
      const externalLinkUrl = photo.pageURL || photo.url.split('?')[0];
      let md = `![${name}](${url})`;
      if (pexelsSettings.linkEmbedded) {
        md = `[${md}](${externalLinkUrl})`;
      }
      
      let finalMd: string;
      if (position === 'plain') {
        finalMd = md + (attribution ? '\n\n' + attribution : '');
      } else if (position === 'center') {
        finalMd = `<center>\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</center>`;
      } else {
        finalMd = `<div class="pull-${position}">\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</div>`;
      }

      if (!isTextWrapEnabled && (position === 'left' || position === 'right')) finalMd += '\n<div class="clearfix"></div>\n';
      insertAtCursor(finalMd);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      return;
    }

    const imgHtml = `<img src="${url}" alt="${name}">`;
    let html = '';
    if (position === 'plain') html = imgHtml + (attribution ? '<br/>' + attribution : '');
    else if (position === 'left' || position === 'right') html = `<div class="pull-${position}">${imgHtml}<br/>${attribution}</div>`;
    else if (position === 'center') html = `<center>${imgHtml}<br/>${attribution}</center>`;

    if (!isTextWrapEnabled && (position === 'left' || position === 'right')) html += '\n<div class="clearfix"></div>\n';
    insertAtCursor(html);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const insertImage = (url: string, name: string, position: 'left' | 'right' | 'center' | 'plain') => {
    const sName = shortenName(name);
    // Find exif if it exists in local gallery
    const localImg = images.find(i => i.url === url);
    const exifTable = localImg?.exif || '';
    
    let attribution = '';
    if (gridWithCaptions) {
      attribution = `<div align="${singleCaptionAlign}"><sup> ✍️ </sup></div>`;
    }

    if (imageInsertFormat === 'markdown') {
      const md = `![${sName}](${url})`;
      let finalMd: string;
      if (position === 'plain') {
        finalMd = md + (attribution ? '\n\n' + attribution : '');
      } else if (position === 'center') {
        finalMd = `<center>\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</center>`;
      } else {
        finalMd = `<div class="pull-${position}">\n\n${md}\n\n${attribution ? attribution + '\n\n' : ''}</div>`;
      }

      if (!isTextWrapEnabled && (position === 'left' || position === 'right')) {
        finalMd += '\n<div class="clearfix"></div>\n';
      }

      insertAtCursor(finalMd + exifTable, 'end');
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      return;
    }

    const imgHtml = `<img src="${url}" alt="${sName}">`;
    let html = '';

    if (position === 'plain') {
      html = imgHtml + (attribution ? '<br/>' + attribution : '');
    } else if (position === 'left' || position === 'right') {
      html = `<div class="pull-${position}">${imgHtml}<br/>${attribution}</div>`;
    } else if (position === 'center') {
      html = `<center>${imgHtml}<br/>${attribution}</center>`;
    }

    if (!isTextWrapEnabled && (position === 'left' || position === 'right')) {
      html += '\n<div class="clearfix"></div>\n';
    }

    insertAtCursor(html + exifTable, 'end');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const insertGrid = () => {
    const selected = galleryMode === 'local' 
      ? images.filter(img => img.selected)
      : pexelsResults.filter(p => p.selected);

    if (selected.length === 0) return;
    
    let result = '';

    const getCaption = (item: any, index: number, isLocal: boolean, htmlMode: boolean = false) => {
      if (isLocal) return ` ✍️ `;
      
      const photo = item as any;
      const author = photo.photographer || item.author || 'Author';
      const source = (photo.source || 'pexels').toLowerCase();
      const authorUrl = photo.photographer_url || item.authorUrl || '#';
      
      // Officially capitalized
      const sourceName = source === 'unsplash' ? 'Unsplash' : source === 'pixabay' ? 'Pixabay' : 'Pexels';
      
      if (pexelsSettings.withAttribution) {
        if (htmlMode) {
           return `By <a href="${authorUrl}">${author}</a> on <a href="https://${source}.com">${sourceName}</a>`;
        }
        return `By [${author}](${authorUrl}) on [${sourceName}](https://${source}.com)`;
      }
      return ` ✍️ `;
    };

    const getMarkdownImg = (item: any, isLocal: boolean) => {
      if (isLocal) return `![${(item as ImageItem).name}](${item.url})`;
      const photo = item as PexelsPhoto;
      let url = photo.src?.large2x || photo.src?.large || item.url;
      if (url?.includes('?')) url = url.split('?')[0];
      return `![Photo by ${photo.photographer || item.author || 'Author'}](${url})`;
    };

    const getHtmlImg = (item: any, isLocal: boolean) => {
      if (isLocal) return `<img src="${item.url}" style="width:100%">`;
      const photo = item as PexelsPhoto;
      let url = photo.src?.large2x || photo.src?.large || item.url;
      if (url?.includes('?')) url = url.split('?')[0];
      return `<img src="${url}" style="width:100%">`;
    };

    const generateCell = (item: any, idx: number, isLocal: boolean, isHtml: boolean) => {
      const photo = item as any;
      const externalLinkUrl = item.url || item.pageURL || photo?.photographer_url || item.url;
      const shouldLink = pexelsSettings.linkEmbedded || !isLocal;
      
      const img = isHtml ? getHtmlImg(item, isLocal) : getMarkdownImg(item, isLocal);
      let wrapped = img;
      if (shouldLink && externalLinkUrl) {
        wrapped = isHtml ? `<a href="${externalLinkUrl}">${img}</a>` : `[${img}](${externalLinkUrl})`;
      }
      
      const shouldShowCaption = gridWithCaptions || (pexelsSettings.withAttribution && !isLocal);
      if (shouldShowCaption) {
        const cap = getCaption(item, idx, isLocal, isHtml);
        const capHtml = `<br/><div align="${singleCaptionAlign}"><sup>${cap}</sup></div>`;
        const capMd = `<br/><sub>${cap}</sub>`;
        return wrapped + (isHtml ? capHtml : capMd);
      }
      
      return wrapped;
    }

    if (gridLayout === 'col-img-text' || gridLayout === 'col-text-img') {
      const isImgFirst = gridLayout === 'col-img-text';
      if (imageInsertFormat === 'markdown') {
        const header = isImgFirst 
          ? `| ${t('image') || 'Зображення'} | ${t('description') || 'Опис'} |\n|---|---|\n`
          : `| ${t('description') || 'Опис'} | ${t('image') || 'Зображення'} |\n|---|---|\n`;
        let rows = '';
        selected.forEach((item, index) => {
          const imgCell = generateCell(item, index, galleryMode === 'local', false);
          const descCell = `${t('typeHere') || ' ✍️ '}`;
          rows += isImgFirst ? `| ${imgCell} | ${descCell} |\n` : `| ${descCell} | ${imgCell} |\n`;
        });
        result = '\n' + header + rows + '\n';
      } else {
        result = `<table style="width:100%">\n`;
        selected.forEach((item, index) => {
          const imgCell = generateCell(item, index, galleryMode === 'local', true);
          const descCell = `${t('typeHere') || ' ✍️ '}`;
          result += `  <tr>\n`;
          if (isImgFirst) {
            result += `    <td style="width:50%">${imgCell}</td>\n    <td style="width:50%">${descCell}</td>\n`;
          } else {
            result += `    <td style="width:50%">${descCell}</td>\n    <td style="width:50%">${imgCell}</td>\n`;
          }
          result += `  </tr>\n`;
        });
        result += `</table>\n\n`;
      }
    } else if (gridLayout === 'col') {
      // Column layout (stacked vertically blocks)
      result = '\n';
      selected.forEach((item, index) => {
        result += generateCell(item, index, galleryMode === 'local', imageInsertFormat === 'html') + '\n\n';
      });
    } else if (gridLayout === 'col-table') {
      if (imageInsertFormat === 'markdown') {
        result = '\n| |\n|---|\n';
        selected.forEach((item, index) => {
          result += `| ${generateCell(item, index, galleryMode === 'local', false)} |\n`;
        });
        result += '\n';
      } else {
        result = `<table style="width:100%">\n`;
        selected.forEach((item, index) => {
          result += `  <tr>\n    <td>${generateCell(item, index, galleryMode === 'local', true)}</td>\n  </tr>\n`;
        });
        result += `</table>\n\n`;
      }
    } else if (gridLayout === 'grid-2') {
      const cols = 2;
      if (imageInsertFormat === 'markdown') {
        const numCols = Math.min(selected.length, cols);
        const header = '|' + Array(numCols).fill(' ').join('|') + '|\n';
        const separator = '|' + Array(numCols).fill('---').join('|') + '|\n';
        result += '\n' + header + separator;

        for (let i = 0; i < selected.length; i += cols) {
          let row = '|';
          for (let j = 0; j < cols; j++) {
            const idx = i + j;
            if (idx < selected.length) {
              row += ` ${generateCell(selected[idx], idx, galleryMode === 'local', false)} |`;
            } else {
              row += ` |`;
            }
          }
          result += row + '\n';
        }
      } else {
        result = `<table style="width:100%">\n`;
        for (let i = 0; i < selected.length; i += cols) {
          result += `  <tr>\n`;
          for (let j = 0; j < cols; j++) {
            const idx = i + j;
            if (idx < selected.length) {
              result += `    <td style="width:${100/cols}%">${generateCell(selected[idx], idx, galleryMode === 'local', true)}</td>\n`;
            } else {
              result += `    <td style="width:${100/cols}%"></td>\n`;
            }
          }
          result += `  </tr>\n`;
        }
        result += `</table>\n\n`;
      }
    } else {
      // Row layout
      if (imageInsertFormat === 'markdown') {
        const header = '|' + selected.map(() => ' ').join('|') + '|\n';
        const separator = '|' + selected.map(() => '---').join('|') + '|\n';
        let row = '|';
        selected.forEach((item, index) => {
          row += ` ${generateCell(item, index, galleryMode === 'local', false)} |`;
        });
        result = '\n' + header + separator + row + '\n';
      } else {
        result = `<table style="width:100%">\n  <tr>`;
        selected.forEach((item, index) => {
          result += `\n    <td>${generateCell(item, index, galleryMode === 'local', true)}</td>`;
        });
        result += `\n  </tr>\n</table>\n\n`;
      }
    }
    
    if (galleryMode === 'local') {
      setImages(images.map(img => ({ ...img, selected: false })));
    } else {
      setPexelsResults(pexelsResults.map(p => ({ ...p, selected: false })));
    }
    
    if (!isTextWrapEnabled) {
      result += '\n<div class="clearfix"></div>\n';
    }
    
    insertAtCursor(result, 'end');
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const processContentForSteem = (raw: string) => {
    return raw;
  };

  const performBroadcast = async (
    author: string, 
    title: string, 
    body: string, 
    tags: string, 
    auth: AuthType,
    rewardType: 'SP' | '50' | '0' = '50',
    beneficiaries: {account: string, weight: number}[] = []
  ) => {
    const finalBody = processContentForSteem(body);
    const tagsArray = tags.split(' ').map(t => t.trim()).filter(t => t);
    const parentPermlink = tagsArray[0] || 'blog';
    const permlink = createPermlinkUA(title);
    
    const meta = JSON.stringify({ 
      tags: tagsArray, 
      app: appAgent, 
      format: 'markdown' 
    });

    const options = {
      allow_curation_rewards: true,
      allow_votes: true,
      author: author,
      permlink: permlink,
      max_accepted_payout: rewardType === '0' ? '0.000 SBD' : '1000000.000 SBD',
      percent_steem_dollars: rewardType === 'SP' ? 0 : 10000,
      extensions: beneficiaries.length > 0 ? [[0, {
        beneficiaries: beneficiaries.sort((a, b) => a.account.localeCompare(b.account)).map(b => ({
          account: b.account,
          weight: Math.floor(b.weight * 100) // Steem weight is in percent * 100
        }))
      }]] : []
    };

    const client = getClient();
    if (!client) throw new Error("Steem client failed to initialize.");

    if (auth === 'KEYCHAIN') {
      return new Promise((resolve, reject) => {
        // @ts-ignore
        if (!window.steem_keychain) return reject(new Error(t('noKeychain')));
        // @ts-ignore
        window.steem_keychain.requestPost(author, title, finalBody, parentPermlink, '', meta, permlink, JSON.stringify(options), (res: any) => {
          if (res.success) resolve(res);
          else reject(new Error(res.message));
        });
      });
    } else {
      if (SecurityService.isLocked()) {
        const pin = vaultPin || await promptDialog(t('enterPin'));
        if (!pin) throw new Error(t('pinRequired'));
        await SecurityService.unlock(pin);
        initVault();
      }
      const comment = {
        author,
        title,
        body: finalBody,
        parent_author: '',
        parent_permlink: parentPermlink,
        permlink,
        json_metadata: meta
      };
      return SecurityService.broadcastPost(client, comment, author, options);
    }
  };

  const handleSplitPost = () => {
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    if (!currentMarkdown.trim()) return;
    
    const lines = currentMarkdown.split('\n');
    const originalTitle = lines[0].replace(/[#*`]/g, '').trim() || t('untitled');
    const bodyLines = lines.slice(1);
    const bodyText = bodyLines.join('\n').trim();
    
    if (!bodyText) {
      notify(t('fillRequired'), 'error');
      return;
    }

    const tokens = bodyText.match(/\S+|\s+/g) || [];
    const targetWordsPerPart = splitWords || 300;
    const parts: string[] = [];
    
    let currentPartStr = '';
    let currentPartWordCount = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      currentPartStr += token;
      if (/\S+/.test(token)) {
        currentPartWordCount++;
      }
      
      let isBreak = false;
      if (currentPartWordCount >= targetWordsPerPart) {
         if (token.includes('\n\n') || token.includes('\n') || currentPartWordCount >= targetWordsPerPart + 50) {
            isBreak = true;
         }
      }
      
      if (isBreak) {
         parts.push(currentPartStr.trim());
         currentPartStr = '';
         currentPartWordCount = 0;
      }
    }
    
    if (currentPartStr.trim().length > 0) {
      if (parts.length > 0 && currentPartWordCount < 50) {
        parts[parts.length - 1] += '\n\n' + currentPartStr.trim();
      } else {
        parts.push(currentPartStr.trim());
      }
    }

    const existingDrafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
    const newDrafts: Draft[] = parts.map((partContent, index) => ({
      id: (Date.now() + index).toString(),
      title: `${originalTitle} №${index + 1}`,
      body: `# ${originalTitle} №${index + 1}\n\n${partContent}`,
      date: new Date().toLocaleString(),
      status: 'working',
      tags: pubTags
    }));

    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify([...newDrafts, ...existingDrafts]));
    notify(t('splitSuccess').replace('{count}', parts.length.toString()), 'success');
    setActiveModal(null);
  };

  const toggleTag = (tag: string) => {
    setPubTags(prev => {
      const tags = prev.split(' ').filter(t => t.trim());
      if (tags.includes(tag)) {
        return tags.filter(t => t !== tag).join(' ');
      }
      return [...tags, tag].join(' ');
    });
  };
  const handlePublish = async () => {
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    const lines = currentMarkdown.split('\n');
    const firstLine = lines[0].trim();
    let finalTitle = pubTitle;
    let actualContent = currentMarkdown;

    if (!finalTitle) {
      finalTitle = firstLine.replace(/[#*`]/g, '').trim().substring(0, 100);
    }
    
    if (removeTitleLine) {
      // Because we may have split newlines, let's remove the very first line of content
      actualContent = lines.slice(1).join('\n').trim();
    }

    const processedContent = processContentForSteem(actualContent);
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;

    if (!activeUser || !finalTitle || !pubTags) {
      setPubLog({ msg: t('fillRequired'), type: 'error' });
      return;
    }

    setPubLog({ msg: t('publishing'), type: 'loading' });
    
    try {
      await performBroadcast(activeUser, finalTitle, processedContent, pubTags, authType, rewardType, beneficiaries);
      setPubLog({ msg: t('publishedSuccess'), type: 'success' });
      setTimeout(() => setActiveModal(null), 2000);
    } catch (err: any) {
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
    }
  };

  const publishFromQueue = async (id: string) => {
    const item = queue.find(i => i.id === id);
    if (!item) return;

    setPubLog({ msg: `${t('publishing')} ${item.title}...`, type: 'loading' });
    
    try {
      const author = item.authType === 'VAULT' ? item.selectedVaultUser : item.username;
      await performBroadcast(author, item.title, item.body, item.tags, item.authType);
      
      const updated = queue.map(i => i.id === id ? { ...i, status: 'published' as const } : i);
      setQueue(updated);
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
      setPubLog({ msg: t('publishedSuccess'), type: 'success' });
    } catch (err: any) {
      const updated = queue.map(i => i.id === id ? { ...i, status: 'error' as const, error: err.message } : i);
      setQueue(updated);
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
    }
  };

  const addToQueue = () => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser || !pubTitle || !pubTags) {
      setPubLog({ msg: t('error'), type: 'error' });
      return;
    }
    
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    let actualContent = currentMarkdown;
    if (removeTitleLine) {
      const lines = currentMarkdown.split('\n');
      actualContent = lines.slice(1).join('\n').trim();
    }
    const processedContent = processContentForSteem(actualContent);

    const newItem: QueueItem = {
      id: Date.now().toString(),
      title: pubTitle,
      body: processedContent,
      tags: pubTags,
      authType,
      username: username,
      selectedVaultUser: selectedVaultUser,
      scheduledTime: scheduledTime,
      status: 'pending'
    };

    const updated = [...queue, newItem];
    setQueue(updated);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
    setPubLog({ msg: t('published'), type: 'success' });
    setTimeout(() => setActiveModal(null), 1000);
  };

  const saveDraft = (status: 'working' | 'ready' = 'working') => {
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    
    const title = currentMarkdown.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 50) || t('untitled');
    const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
    
    if (currentDraftId) {
      // Update existing draft
      const updated = drafts.map((d: Draft) => {
        if (d.id === currentDraftId) {
          return { ...d, title, body: currentMarkdown, date: new Date().toLocaleString(), status };
        }
        return d;
      });
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(updated));
    } else {
      // Create new draft
      const newId = Date.now().toString();
      const newDraft: Draft = {
        id: newId,
        title,
        body: currentMarkdown,
        date: new Date().toLocaleString(),
        status
      };
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify([newDraft, ...drafts]));
      setCurrentDraftId(newId);
    }
    notify(t('saveSuccess'));
  };

  const handleEditPost = (post: SteemPost) => {
    setPubTitle(post.title);
    setContent(post.body);
    setPubTags(JSON.parse(post.json_metadata || '{}').tags?.join(' ') || post.category);
    setActiveView('editor');
    notify(t('editor'), 'success');
  };

  const handleDeleteComment = async (author: string, permlink: string) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }
    
    try {
      setPubLog({ msg: 'Deleting...', type: 'loading' });
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      
      if (authType === 'VAULT') {
        await SecurityService.broadcastDeleteComment(client, activeUser, permlink);
      } else {
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestBroadcast(activeUser, [['delete_comment', { author: activeUser, permlink }]], 'Posting', (response: any) => {
            if (response.success) resolve(response);
            else reject(new Error(response.message));
          });
        });
      }
      setPubLog({ msg: 'Deleted successfully', type: 'success' });
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    } catch (err: any) {
      console.error(err);
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
      throw err;
    }
  };

  const handleUploadImageForReader = async (file: File): Promise<string> => {
    const uploadAuthType = imageUploadAccount ? 'VAULT' : 'KEYCHAIN';
    let activeUser = imageUploadAccount || username;

    if (!activeUser) {
      if (uploadAuthType !== 'VAULT') {
        const inputUser = await promptDialog(t('username'));
        if (!inputUser) throw new Error("No username");
        activeUser = inputUser.replace('@', '');
        setUsername(activeUser);
        localStorage.setItem('steem_username', activeUser);
      } else {
         throw new Error("No Vault user selected.");
      }
    }
    
    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
        const pass = await promptDialog(t('enterPin'));
        if (!pass) throw new Error("Cancelled");
        await SecurityService.unlock(pass);
        initVault();
    }

    setPubLog({ msg: `Uploading ${file.name}...`, type: 'loading' });
    try {
      const sanitizedName = sanitizeFilename(file.name);
      const safeFile = new File([file], sanitizedName, { type: file.type });
      let signature = '';
      if (uploadAuthType === 'VAULT') {
        const arrayBuffer = await safeFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
        const dataToSign = Buffer.concat([prefix, fileBuffer]);
        signature = await SecurityService.signBuffer(dataToSign, activeUser);
      } else {
        signature = await SecurityService.signImageChallengeWithKeychain(safeFile, activeUser);
      }

      const formData = new FormData();
      formData.append("file", safeFile);
      const res = await fetch(`https://steemitimages.com/${activeUser}/${signature}`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server error " + res.status);
      const data = await res.json();
      return data.url || data.link || data.data?.url;
    } finally {
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    }
  };

  const handleReaderComment = async (parentAuthor: string, parentPermlink: string, body: string, editPermlink?: string) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }

    try {
      setPubLog({ msg: t('publishing'), type: 'loading' });
      const permlink = editPermlink || `re-${parentAuthor.replace(/\./g, '')}-${Date.now()}`;
      const meta = JSON.stringify({ tags: [], app: appAgent, format: 'markdown' });
      
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      const comment = {
        author: activeUser,
        title: '',
        body,
        parent_author: parentAuthor,
        parent_permlink: parentPermlink,
        permlink,
        json_metadata: meta
      };

      if (authType === 'KEYCHAIN') {
        if (!(window as any).steem_keychain) {
          throw new Error("Steem Keychain extension not found! Please install it.");
        }
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestPost(activeUser, '', body, parentPermlink, parentAuthor, meta, permlink, '', (res: any) => {
            if (res.success) resolve(res);
            else reject(new Error(res.message || "Keychain request failed"));
          });
        });
      } else {
        await SecurityService.broadcastPost(client, comment, activeUser);
      }
      
      notify(t('publishedSuccess'), 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setPubLog({ msg: '', type: null });
    }
  };

  const handleMuteUser = async (targetUser: string, mute: boolean = true) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }

    try {
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      
      const json = JSON.stringify(['follow', { follower: activeUser, following: targetUser, what: mute ? ['ignore'] : [''] }]);
      
      if (authType === 'KEYCHAIN') {
        if (!(window as any).steem_keychain) {
          throw new Error("Steem Keychain extension not found! Please install it.");
        }
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestCustomJson(activeUser, 'follow', 'Posting', json, 'mute', (res: any) => {
            if (res.success) resolve(res);
            else reject(new Error(res.message || "Keychain request failed"));
          });
        });
      } else {
        await SecurityService.broadcastCustomJson(client, {
          required_auths: [],
          required_posting_auths: [activeUser],
          id: 'follow',
          json: json
        }, activeUser);
      }
      notify(`Successfully ${mute ? 'muted' : 'unmuted'} @${targetUser}`, 'success');
      setMutedUsers(prev => {
        let next;
        if (mute) next = Array.from(new Set([...prev, targetUser]));
        else next = prev.filter(u => u !== targetUser);
        localStorage.setItem('steem_muted_users', JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      notify(err.message || String(err), 'error');
      throw err;
    }
  };

  const [loadingContext, setLoadingContext] = useState<Set<string>>(new Set());
  const handleReaderVote = async (author: string, permlink: string, weight: number) => {
    const activeUser = authType === 'VAULT' ? selectedVaultUser : username;
    if (!activeUser) {
      notify(t('noAccount'), 'error');
      return;
    }

    const key = `${author}/${permlink}`;
    if (loadingContext.has(key)) return;
    setLoadingContext(prev => new Set(prev).add(key));

    try {
      const client = getClient();
      if (!client) throw new Error("Steem client failed to initialize.");
      const vote = { voter: activeUser, author, permlink, weight };

      if (authType === 'KEYCHAIN') {
        if (!(window as any).steem_keychain) {
          throw new Error("Steem Keychain extension not found! Please install it.");
        }
        await new Promise((resolve, reject) => {
          (window as any).steem_keychain.requestVote(activeUser, permlink, author, weight, (res: any) => {
            if (res.success) resolve(res);
            else reject(new Error(res.message || "Keychain request failed"));
          });
        });
      } else {
        await SecurityService.broadcastVote(client, vote, activeUser);
      }
      notify(t('saveSuccess'), 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoadingContext(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const [draftFilter, setDraftFilter] = useState<'all' | 'working' | 'ready'>('all');

  // ... (inside the activeModal === 'drafts' block later)


  const toggleDraftStatus = (id: string) => {
    const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
    const updated = drafts.map((d: Draft) => {
      if (d.id === id) {
        return { ...d, status: d.status === 'ready' ? 'working' : 'ready' };
      }
      return d;
    });
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(updated));
    // Hack to re-render:
    const current = activeModal;
    setActiveModal(null);
    setTimeout(() => setActiveModal(current), 10);
  };

  const addMention = () => {
    const name = newMention.trim().replace('@', '');
    if (!name || mentions.includes(name)) return;
    const updated = [name, ...mentions];
    setMentions(updated);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
    setNewMention('');
  };

  const toggleTool = (key: string) => {
    const newTools = enabledTools.includes(key)
      ? enabledTools.filter(t => t !== key)
      : [...enabledTools, key];
    setEnabledTools(newTools);
    localStorage.setItem(STORAGE_KEY_FLOAT_CONFIG, JSON.stringify(newTools));
  };

  const moveTool = (key: string, dir: 'up' | 'down') => {
    const idx = enabledTools.indexOf(key);
    if (idx === -1) return;
    const newTools = [...enabledTools];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newTools.length) return;
    [newTools[idx], newTools[targetIdx]] = [newTools[targetIdx], newTools[idx]];
    setEnabledTools(newTools);
    localStorage.setItem(STORAGE_KEY_FLOAT_CONFIG, JSON.stringify(newTools));
  };

  const exportBackup = async () => {
    try {
      const draftsRaw = localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]";
      const drafts = JSON.parse(draftsRaw);
      
      if (drafts.length === 0) {
        notify("No drafts to export", "success");
        return;
      }

      const zip = new JSZip();
      drafts.forEach((d: any) => {
        const safeTitle = (d.title || `draft-${d.id}`).replace(/[/\\?%*:|"<>]/g, '-');
        
        let content = "";
        if (d.title) content += `# ${d.title}\n\n`;
        
        content += d.body || "";
        
        // Add metadata at the bottom for convenience, separated by a horizontal rule
        if (d.tags || d.category) {
          content += `\n\n---\n- **Tags**: ${d.tags || ""}\n- **Category**: ${d.category || ""}\n`;
        }
        
        if (!content.endsWith("\n")) content += "\n";
        
        zip.file(`${safeTitle}.md`, content);
      });
      
      const blob = await zip.generateAsync({ type: 'blob' });
      const filename = `steem_drafts_md_${new Date().toISOString().split('T')[0]}.zip`;
      
      if (IS_NATIVE && (window as any).AndroidBridge?.saveFile) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          (window as any).AndroidBridge.saveFile(base64, filename, 'application/zip');
        };
        reader.readAsDataURL(blob);
      } else {
        saveAs(blob, filename);
      }
      
      notify("Drafts exported as Markdown files in ZIP!", "success");
    } catch (err: any) {
      notify("Error: " + err.message, "error");
    }
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      let importedDrafts: any[] = [];
      
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        
        // Try legacy/comprehensive format first
        const jsonFile = zip.file('backup.json');
        if (jsonFile) {
          const text = await jsonFile.async('text');
          const parsed = JSON.parse(text);
          if (parsed && parsed.drafts) {
            const draftsArr = typeof parsed.drafts === 'string' ? JSON.parse(parsed.drafts) : parsed.drafts;
            if (Array.isArray(draftsArr)) importedDrafts = draftsArr;
          }
        } else {
          // New format: iterate .md files
          const files = Object.keys(zip.files);
          const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('__MACOSX'));
          
          for (const filename of mdFiles) {
            const content = await zip.files[filename].async('text');
            const title = filename.split('/').pop()?.replace('.md', '') || 'Imported Draft';
            importedDrafts.push({
              id: Date.now() + Math.random(),
              title: title,
              body: content,
              tags: '',
              category: '',
              updatedAt: Date.now(),
              status: 'working'
            });
          }
        }
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          importedDrafts = parsed;
        } else if (parsed && parsed.drafts) {
          importedDrafts = typeof parsed.drafts === 'string' ? JSON.parse(parsed.drafts) : parsed.drafts;
        }
      }
      
      if (importedDrafts.length > 0) {
        localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(importedDrafts));
        notify(`${importedDrafts.length} drafts restored! Reloading...`, "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        notify("Invalid backup file or no drafts found", "error");
      }
    } catch (err: any) {
      notify("Error: " + err.message, "error");
    }
  };

  const downloadFile = () => {
    // Sync current WYSIWYG editor content to markdown if editing in visual mode
    const currentMarkdown = syncWysiwygToContentIfVisual();
    const lines = currentMarkdown.split('\n');
    const firstLine = lines[0]?.trim() || "";
    
    let derivedTitle = pubTitle;
    if (!derivedTitle) {
      derivedTitle = firstLine.replace(/[#*`]/g, '').trim().substring(0, 150);
    }
    
    let exportContent = "";
    // If we have a title but it's not and doesn't look like an H1 at the start, add it
    const hasH1 = firstLine.startsWith('# ');
    if (derivedTitle && !hasH1) {
      // Check if the title is already the first line text
      if (firstLine.replace(/[#*`]/g, '').trim() !== derivedTitle) {
        exportContent += `# ${derivedTitle}\n\n`;
      } else if (!firstLine.startsWith('#')) {
        // First line is the title but without #, let's wrap it nicely
        // (Actually, we'll just prepend the # to the content or let it be)
        // For simplicity, if first line IS the title but lacks #, we just add # to the start of processing
      }
    }
    
    exportContent += processContentForSteem(currentMarkdown);
    
    if (pubTags) {
      exportContent += `\n\n---\n- **Tags**: ${pubTags}\n`;
    }

    const fileBlob = new Blob([exportContent], {type: 'text/markdown'});
    
    const safeFilename = (derivedTitle || `steem-post-${Date.now()}`)
      .replace(/[/\\?%*:|"<>]/g, '-')
      .substring(0, 80)
      .trim();
      
    const fullFilename = `${safeFilename || 'steem-post'}.md`;
    
    // Use native bridge if available, otherwise fallback to saveAs
    if (IS_NATIVE && (window as any).AndroidBridge?.saveFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        (window as any).AndroidBridge.saveFile(base64, fullFilename, 'text/markdown');
      };
      reader.readAsDataURL(fileBlob);
    } else {
      saveAs(fileBlob, fullFilename);
    }
  };

  const uploadExternalImage = async (url: string, fileName: string = 'image.jpg') => {
    const uploadAuthType = imageUploadAccount ? 'VAULT' : 'KEYCHAIN';
    let activeUser = imageUploadAccount || username;
    
    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        notify(t('needVaultAccount'), 'error');
        setActiveModal('keys');
        return;
      } else {
        const inputUser = await promptDialog(t('username'));
        if (!inputUser) return;
        activeUser = inputUser.replace('@', '');
        setUsername(activeUser);
        localStorage.setItem('steem_username', activeUser);
      }
    }

    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
      const pass = await promptDialog(t('enterPin'));
      if (!pass) return;
      try {
        await SecurityService.unlock(pass);
        initVault();
      } catch (e: any) {
        notify(t('pinError') + e.message, 'error');
        return;
      }
    } else if (uploadAuthType === 'KEYCHAIN') {
      // @ts-ignore
      if (!window.steem_keychain) {
        notify(t('noKeychain'), 'error');
        return;
      }
    }

    setIsUploading(true);
    setPubLog({ msg: t('preparingUpload').replace('{name}', fileName), type: 'loading' });
    
    try {
      let blob: Blob;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        blob = await res.blob();
      } catch {
        setPubLog({ msg: t('proxyAttempt'), type: 'loading' });
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(t('proxyError'));
        blob = await res.blob();
      }

      const file = new File([blob], fileName, { type: blob.type });
      let signature = '';
      if (uploadAuthType === 'VAULT') {
        const arrayBuffer = await blob.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
        const dataToSign = Buffer.concat([prefix, fileBuffer]);
        signature = await SecurityService.signBuffer(dataToSign, activeUser);
      } else {
        signature = await SecurityService.signImageChallengeWithKeychain(file, activeUser);
      }

      const formData = new FormData();
      formData.append("file", file);
      const uploadUrl = `https://steemitimages.com/${activeUser}/${signature}`;
      const response = await fetch(uploadUrl, { method: "POST", body: formData });
      
      if (!response.ok) throw new Error(t('serverError') + response.status);
      const data = await response.json();
      const finalUrl = data.url || data.link || data.data?.url;
      
      if (finalUrl) {
        const newImg: ImageItem = { url: finalUrl, name: fileName, selected: false };
        setImages(prev => [newImg, ...prev]);
        setSourceInput(prev => finalUrl + "\n" + prev);
      }
    } catch (err: any) {
      console.error(err);
      setPubLog({ msg: `❌ ${t('error')}: ${err.message}`, type: 'error' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const uploadAuthType = imageUploadAccount ? 'VAULT' : 'KEYCHAIN';
    let activeUser = imageUploadAccount || username;
    
    if (!activeUser) {
      if (uploadAuthType === 'VAULT') {
        notify(t('needVaultAccount'), 'error');
        setActiveModal('keys');
        return;
      } else {
        const inputUser = await promptDialog(t('username'));
        if (!inputUser) return;
        activeUser = inputUser.replace('@', '');
        setUsername(activeUser);
        localStorage.setItem('steem_username', activeUser);
      }
    }

    if (uploadAuthType === 'VAULT' && SecurityService.isLocked()) {
      const pass = await promptDialog(t('enterPin'));
      if (!pass) return;
      try {
        await SecurityService.unlock(pass);
        initVault();
      } catch (e: any) {
        notify(t('pinError') + e.message, 'error');
        return;
      }
    } else if (uploadAuthType === 'KEYCHAIN') {
      if (!(window as any).steem_keychain) {
        notify(t('noKeychain'), 'error');
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    
    // Спеціальна функція завантаження З ПРОГРЕСОМ для VAULT (XHR)
    const uploadVaultWithProgress = (file: File, signature: string, user: string, index: number): Promise<any> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        const uploadUrl = `https://steemitimages.com/${user}/${signature}`;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setPubLog({ 
              msg: t('uploadProgress')
                .replace('{current}', (index + 1).toString())
                .replace('{total}', files.length.toString())
                .replace('{name}', `${file.name} (${percent}%)`), 
              type: 'loading' 
            });
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(t('serverError') + xhr.status));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.timeout = 300000; // Increased to 5 minutes for slow networks
        xhr.send(formData);
      });
    };

    // СТРОГА ПОСЛІДОВНА ЧЕРГА
    for (let i = 0; i < files.length; i++) {
      const originalFile = files[i];
      const sanitizedName = sanitizeFilename(originalFile.name);
      const file = new File([originalFile], sanitizedName, { type: originalFile.type });
      
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const exifTable = await getExifTableFromBlob(originalFile);

        let signature = '';
        if (uploadAuthType === 'VAULT') {
          const arrayBuffer = await file.arrayBuffer();
          const fileBuffer = Buffer.from(arrayBuffer);
          const prefix = Buffer.from("ImageSigningChallenge", 'utf8');
          const dataToSign = Buffer.concat([prefix, fileBuffer]);
          
          let attempt = 0;
          let uploaded = false;
          while (attempt < 3 && !uploaded) {
            attempt++;
            try {
              setPubLog({ 
                msg: `[${i + 1}/${files.length}] ` + t('signingImage').replace('{name}', file.name) + (attempt > 1 ? ` (спроба ${attempt})` : ''), 
                type: 'loading' 
              });
              signature = await SecurityService.signBuffer(dataToSign, activeUser);
              const data = await uploadVaultWithProgress(file, signature, activeUser, i);
              const url = data.url || data.link || data.data?.url;
              if (url) {
                setImages(prev => [
                  ...prev.slice(0, i),
                  { url, name: file.name, selected: false, exif: exifTable },
                  ...prev.slice(i)
                ]);
                setSourceInput(prev => url + "\n" + prev);
                successCount++;
                uploaded = true;
              }
            } catch (err) {
              if (attempt >= 3) throw err;
              await new Promise(r => setTimeout(r, 1500 * attempt));
            }
          }
        } else {
          // ШЛЯХ KEYCHAIN: чистий fetch
          setPubLog({ 
            msg: `[${i + 1}/${files.length}] ` + t('uploadProgress').replace('{current}', (i + 1).toString()).replace('{total}', files.length.toString()).replace('{name}', file.name), 
            type: 'loading' 
          });

          signature = await SecurityService.signImageChallengeWithKeychain(file, activeUser);
          
          const formData = new FormData();
          formData.append("file", file);
          const resp = await fetch(`https://steemitimages.com/${activeUser}/${signature}`, { method: "POST", body: formData });
          if (!resp.ok) throw new Error(t('serverError') + resp.status);
          const data = await resp.json();
          const url = data.url || data.link || data.data?.url;
          if (url) {
            setImages(prev => [
              ...prev.slice(0, i),
              { url, name: file.name, selected: false, exif: exifTable },
              ...prev.slice(i)
            ]);
            setSourceInput(prev => url + "\n" + prev);
            successCount++;
          }
        }
      } catch (err: any) {
        console.error(err);
        setPubLog({ msg: `❌ Помилка у файлі ${i + 1}: ${file.name} - ${err.message}`, type: 'error' });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (successCount > 0) {
      setPubLog({ 
        msg: t('uploadComplete').replace('{count}', successCount.toString()).replace('{total}', files.length.toString()), 
        type: 'success' 
      });
      setTimeout(() => setPubLog({ msg: '', type: null }), 3000);
    }
  };

  const TOOLS_MAP: Record<string, { label: string | React.ReactNode, action: (e?: React.MouseEvent) => void }> = {
    'B': { label: 'B', action: () => fmt('**') },
    'I': { label: 'I', action: () => fmt('*') },
    'S': { label: '~~', action: () => fmt('~~') },
    'sub': { label: 'sub', action: () => fmt('<sub>', '</sub>') },
    'sup': { label: 'sup', action: () => fmt('<sup>', '</sup>') },
    'H1': { label: 'H1', action: () => fmtLine('# ') },
    'H2': { label: 'H2', action: () => fmtLine('## ') },
    'H3': { label: 'H3', action: () => fmtLine('### ') },
    'Link': { label: <LinkIcon size={20} />, action: handleLink },
    'Quote': { label: <Quote size={20} />, action: () => fmtLine('> ') },
    'List': { label: '•', action: () => fmtLine('- ') },
    'Num': { label: '1.', action: () => fmtLine('1. ') },
    'Task': { label: '☑', action: () => fmtLine('- [ ] ') },
    'Table': { label: <LayoutGrid size={20} />, action: (e?: React.MouseEvent) => {
      if (e) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const direction = rect.top > window.innerHeight / 2 ? 'up' : 'down';
        let x = rect.left;
        // ensure it's not offscreen (selector is ~220px wide)
        if (x + 220 > window.innerWidth) x = window.innerWidth - 240;
        setTableSelectorPos({ 
          x,
          y: direction === 'down' ? rect.bottom + 10 : window.innerHeight - rect.top + 10,
          direction
        });
        setShowTableSelector(prev => !prev);
        setTableHover({ r: 0, c: 0 });
      } else {
        insertAtCursor('| Header | Header |\n| --- | --- |\n| Cell | Cell |\n');
      }
    }},
    'Separator': { label: <SplitSquareHorizontal size={20} />, action: () => insertAtCursor('| Head |\n| --- |\n', 'end') },
    'Import': { label: <TableIcon size={20} />, action: () => importTable() },
    'Code': { label: <Code size={20} />, action: () => fmt('```\n', '\n```') },
    'Inline': { label: <Terminal size={20} />, action: () => fmt('`') },
    'Indent': { label: <Indent size={20} />, action: () => {
      if (!editorRef.current) return;
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      const selectedText = useEditorStore.getState().content.substring(start, end);
      const lines = selectedText.split('\n');
      const newText = lines.map(line => '    ' + line).join('\n');
      const newContent = useEditorStore.getState().content.substring(0, start) + newText + useEditorStore.getState().content.substring(end);
      setContent(newContent);
    }},
    'Esc': { label: '\\', action: () => fmt('\\', '') },
    'HR': { label: '—', action: () => insertAtCursor('\n\n---\n\n') },
    'Color': { label: <span className="text-red-500 font-bold text-lg">A</span>, action: () => fmt('<div class="phishy">', '</div>') },
    'Caption': { label: 'Підп', action: async () => {
      const url = await promptDialog(t('urlPrompt'));
      if (!url) return;
      const cap = await promptDialog(t('caption'), '');
      insertAtCursor(`<center>\n\n| <center>![image](${url})</center> |\n|:---:|\n| <center><sub>${cap || ' ✍️ '}</sub></center> |\n\n</center>\n`);
    }},
    'Left': { label: '⬅', action: () => fmt('<div class="text-left">\n', '\n</div>') },
    'Center': { label: 'Центр', action: () => fmt('<center>\n', '\n</center>') },
    'Right': { label: '➡', action: () => fmt('<div class="text-right">\n', '\n</div>') },
    'Justify': { label: 'Вирів', action: () => fmt('<div class="text-justify">\n', '\n</div>') },
    'Grid': { label: 'Сітка', action: () => insertAtCursor(`<div class="pull-left">\n${t('leftContent')}\n</div>\n<div class="pull-right">\n${t('rightContent')}\n</div>\n<div class="clearfix"></div>\n`) },
    'Templates': { label: <FileText size={20} />, action: () => setActiveModal('templates') },
    'Mentions': { label: <AtSign size={20} />, action: async () => {
      const extracted = extractMentions(contentForPublish);
      if (extracted.length === 0) {
        const name = await promptDialog(t('usernameNoAt'));
        if (name) insertAtCursor(`@${name}`);
      } else {
        const name = await promptDialog(`${t('mentionsList')}: ${extracted.join(', ')}\n${t('usernameNoAt')}`);
        if (name) insertAtCursor(`@${name}`);
      }
    }},
    'Img': { label: <ImageIcon size={20} />, action: () => {
      fileInputRef.current?.click();
    }}
  };

  // --- Render ---

  const TextWrapIcon = ({ size = 24, className = "" }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="5" width="8" height="8" rx="1" />
      <path d="M15 7h6" />
      <path d="M15 11h6" />
      <path d="M3 17h18" />
    </svg>
  );

  const ImageCaptionIcon = ({ size = 24, className = "" }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="4" width="18" height="11" rx="1" />
      <path d="M7 18h10" />
      <path d="M9 21h6" />
      {/* Sun/Mountain inside image */}
      <circle cx="8" cy="8" r="1.5" />
      <path d="M21 11l-4-4-5 5-2-2-7 7" />
    </svg>
  );

  const ShieldUserIcon = ({ size = 24, className = "" }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <g transform="matrix(1.1 0 0 1.1 -1.2 -1.2)">
        <path d="M12 22s9-4 9-10V5l-9-3-9 3v7c0 6 9 10 9 10" />
        <path d="M8 17a4 4 0 0 1 8 0" />
        <circle cx="12" cy="9.5" r="3" />
      </g>
    </svg>
  );

  return (
    <div className={cn(
      "flex flex-col h-screen font-sans overflow-hidden transition-colors duration-500 selection:bg-[rgb(var(--accent-color)/0.3)]",
      visualStyle === 'neon' ? "theme-neon bg-slate-950 text-cyan-400" : (isDarkMode ? "bg-slate-950 text-slate-100" : "theme-light bg-white text-slate-900 border-slate-200"),
      performanceMode && "perf-mode"
    )}>
      {/* Dynamic Theme Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --accent: var(--accent-hex);
          --accent-rgb: var(--accent-color);
        }
        ${visualStyle === 'neon' ? `
          .theme-neon h1, .theme-neon h2, .theme-neon h3 {
            text-shadow: 0 0 15px rgba(var(--accent-rgb), 0.6), 0 0 5px rgba(var(--accent-rgb), 0.4) !important;
          }
          .theme-neon .markdown-body h1, .theme-neon .markdown-body h2, .theme-neon .markdown-body h3 {
            border-bottom: 1px solid rgba(var(--accent-rgb), 0.3) !important;
          }
          .theme-neon button.bg-cyan-600, .theme-neon button.bg-cyan-500 {
            box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.5), 0 0 10px rgba(var(--accent-rgb), 0.3) !important;
            text-shadow: none !important;
          }
          .theme-neon .logo-s {
            text-shadow: 1px 1px 0 rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.8), 2px 2px 6px rgba(0,0,0,0.6);
            color: white !important;
            font-weight: 1000;
            -webkit-text-stroke: 0.3px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .theme-neon .neon-tab-glow {
            box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.4), 0 0 5px rgba(var(--accent-rgb), 0.2) !important;
            border: 1px solid rgba(var(--accent-rgb), 0.5) !important;
          }
        ` : ''}
        .bg-cyan-600, .bg-cyan-500 { background-color: var(--accent) !important; }
        .hover\\:bg-cyan-600:hover, .hover\\:bg-cyan-500:hover { background-color: var(--accent) !important; filter: brightness(0.9); }
        .text-cyan-400, .text-cyan-500 { color: var(--accent) !important; }
        .border-cyan-500, .border-cyan-400 { border-color: var(--accent) !important; }
        .from-cyan-500 { --tw-gradient-from: var(--accent) !important; }
        .to-blue-600 { --tw-gradient-to: var(--accent) !important; filter: brightness(1.1); }
        .shadow-cyan-500\\/20 { --tw-shadow-color: var(--accent) !important; }
        .shadow-cyan-900\\/20 { --tw-shadow-color: var(--accent) !important; opacity: 0.2; }
        .bg-cyan-500\\/10 { background-color: rgba(var(--accent-rgb), 0.1) !important; }
        .border-cyan-500\\/50 { border-color: rgba(var(--accent-rgb), 0.5) !important; }
        .hover\\:bg-cyan-500\\/10:hover { background-color: rgba(var(--accent-rgb), 0.1) !important; }
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing {
          animation: swing 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `}} />
      {/* Header / Toolbar */}
      <header 
        className="border-b border-slate-800 bg-slate-900 flex items-center px-2 sm:px-4 h-14 z-[200] relative"
      >
        <div className="flex items-center gap-1.5 xs:gap-3 shrink-0">
          <div className="flex items-center gap-1 xs:gap-2">
            <button 
              onClick={() => setIsSMenuOpen(true)}
              className="w-8 h-8 xs:w-10 xs:h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg xs:rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all text-lg xs:text-xl"
            >
              <span className={cn("logo-s", visualStyle === 'neon' && "neon-icon-glow")}>S</span>
            </button>
            <div className="flex flex-col">
              <span className={cn("font-black text-xs xs:text-lg hidden sm:inline-block tracking-tighter leading-none shrink-0 italic", visualStyle === 'neon' && "neon-icon-glow")}>Steem<span className="text-cyan-400">Editor</span></span>
              <span className="text-[7px] xs:text-[9px] font-bold text-slate-500 tracking-widest uppercase hidden sm:block">Professional Pro</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5 xs:mx-1 hidden md:block" />

          {/* View Toggler */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0">
            <button 
              onClick={() => setActiveView('editor')}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1.5",
                activeView === 'editor' ? "bg-cyan-600 text-white shadow-none neon-tab-glow" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Edit3 size={16} className={cn(visualStyle === 'neon' && "neon-icon-glow")} /> <span className="hidden xs:inline">{t('editor')}</span>
            </button>
            <button 
              onClick={() => {
                setActiveView('reader');
                markAllAsRead();
              }}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded transition-colors flex items-center gap-1.5 relative",
                activeView === 'reader' ? "bg-cyan-600 text-white shadow-none neon-tab-glow" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Globe size={16} className={cn(visualStyle === 'neon' && "neon-icon-glow")} /> <span className="hidden xs:inline">{lang === 'uk' ? 'Читач' : 'Reader'}</span>
            </button>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block shrink-0" />

        {/* Center: Formatting Tools */}
        {activeView === 'editor' && (
          <div className="flex-1 min-w-0 px-1 flex items-center justify-start lg:justify-center relative group/tools">
            {/* Mobile format menu trigger */}
            <div className="relative mobile-tools-container lg:hidden shrink-0">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileToolsOpen(!showMobileToolsOpen);
                  if (!showMobileToolsOpen) {
                    setShowMobileTools1(false);
                    setShowMobileTools2(false);
                  }
                }}
                className="flex shrink-0 items-center justify-center bg-slate-800/30 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all gap-1.5 h-9"
                title={t('formatting') || "Formatting Tools"}
              >
                <Type size={16} className="shrink-0" />
                <ChevronDown size={14} className={cn("transition-transform duration-200 shrink-0", showMobileToolsOpen && "rotate-180")} />
              </button>

              {/* Mobile Dropdown */}
              <div className={cn(
                "fixed top-14 left-2 right-2 sm:absolute sm:top-full sm:left-0 sm:right-auto mt-2 bg-slate-800 border border-slate-700 p-2 rounded-xl shadow-2xl z-[150] flex-col gap-2 max-w-[95vw] sm:w-max max-h-[70vh] overflow-y-auto custom-scrollbar mx-auto sm:mx-0",
                showMobileToolsOpen ? "flex" : "hidden"
              )}>
                {/* Group 1 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={Bold} onClick={() => { fmt('**'); setShowMobileToolsOpen(false); }} title={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
                  <IconButton icon={Italic} onClick={() => { fmt('*'); setShowMobileToolsOpen(false); }} title={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
                  <IconButton icon={Strikethrough} onClick={() => { fmt('~~'); setShowMobileToolsOpen(false); }} title={t('strike')} className="shrink-0 size-8" />
                </div>
                {/* Group 2 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { fmtLine('# '); setShowMobileToolsOpen(false); }} title={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { fmtLine('## '); setShowMobileToolsOpen(false); }} title={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { fmtLine('### '); setShowMobileToolsOpen(false); }} title={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
                </div>
                {/* Group 3 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={AlignLeft} onClick={() => { fmt('<div class="text-left">\n', '\n</div>'); setShowMobileToolsOpen(false); }} title={t('leftText')} className="shrink-0 size-8" />
                  <IconButton icon={AlignCenter} onClick={() => { fmt('<center>\n', '\n</center>'); setShowMobileToolsOpen(false); }} title="Center" className="shrink-0 size-8" />
                  <IconButton icon={AlignRight} onClick={() => { fmt('<div class="text-right">\n', '\n</div>'); setShowMobileToolsOpen(false); }} title={t('rightText')} className="shrink-0 size-8" />
                  <IconButton icon={AlignJustify} onClick={() => { fmt('<div class="text-justify">\n', '\n</div>'); setShowMobileToolsOpen(false); }} title="Justify" className="shrink-0 size-8" />
                </div>
                {/* Group 4 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={Quote} onClick={() => { fmtLine('> '); setShowMobileToolsOpen(false); }} title={t('quote')} className="shrink-0 size-8" />
                  <IconButton icon={LinkIcon} onClick={() => { handleLink(); setShowMobileToolsOpen(false); }} title={t('link')} className="shrink-0 size-8" />
                  <IconButton icon={Minus} onClick={() => { insertAtCursor('\n\n---\n\n', 'end'); setShowMobileToolsOpen(false); }} title={t('hr')} className="shrink-0 size-8" />
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { fmt('<div class="phishy">', '</div>'); setShowMobileToolsOpen(false); }} title={t('redText')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-red-500 shrink-0">A</button>
                </div>
                {/* Group 5 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  Code
                  <IconButton icon={Terminal} onClick={() => { fmt('`'); setShowMobileToolsOpen(false); }} title={t('inlineCode')} className="shrink-0 size-8 ml-auto" active={activeFormats.code} />
                  <IconButton icon={Code} onClick={() => { fmt('```\n', '\n```'); setShowMobileToolsOpen(false); }} title={t('codeBlock')} className="shrink-0 size-8" />
                  <IconButton icon={Indent} onClick={() => {
                    handleIndent();
                    setShowMobileToolsOpen(false);
                  }} title={t('indent')} className="shrink-0 size-8" />
                </div>
                {/* Group 6 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg items-center text-slate-500 text-xs font-bold uppercase tracking-widest pl-2">
                  {t('table')}
                  <IconButton icon={LayoutGrid} onClick={(e) => { TOOLS_MAP['Table']?.action(e); setShowMobileToolsOpen(false); }} title={t('table')} className="shrink-0 size-8 ml-auto" />
                  <IconButton icon={SplitSquareHorizontal} onClick={() => { insertAtCursor('| Head |\n| --- |\n', 'end'); setShowMobileToolsOpen(false); }} title="1 Col" className="shrink-0 size-8" />
                  <IconButton icon={TableIcon} onClick={() => { importTable(); setShowMobileToolsOpen(false); }} title={t('importTable')} className="shrink-0 size-8" />
                </div>
                {/* Group 7 */}
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                  <IconButton icon={AtSign} onClick={() => { setActiveModal('mentions'); setShowMobileToolsOpen(false); }} title={t('mentions')} className="shrink-0 size-8" />
                  <IconButton icon={FileText} onClick={() => { setActiveModal('templates'); setShowMobileToolsOpen(false); }} title={t('templates')} className="shrink-0 size-8" />
                </div>
              </div>
            </div>

            {/* Desktop Formatting Tools (Scrollable) */}
            <div className="hidden lg:flex flex-1 overflow-hidden relative"
              onWheel={(e) => {
                const container = e.currentTarget.querySelector('.tools-scroll-container');
                if (container && e.deltaY !== 0) container.scrollLeft += e.deltaY;
              }}
            >
              <div className="tools-scroll-container mx-auto flex items-center justify-start gap-1 bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap w-full lg:w-auto">
                <IconButton icon={Bold} onClick={() => fmt('**')} title={t('bold')} className="shrink-0 size-8" active={activeFormats.bold} />
                <IconButton icon={Italic} onClick={() => fmt('*')} title={t('italic')} className="shrink-0 size-8" active={activeFormats.italic} />
                <IconButton icon={Strikethrough} onClick={() => fmt('~~')} title={t('strike')} className="shrink-0 size-8" />
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmtLine('# ')} title={t('h1')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H1</button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmtLine('## ')} title={t('h2')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H2</button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmtLine('### ')} title={t('h3')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 shrink-0">H3</button>
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <IconButton icon={AlignLeft} onClick={() => fmt('<div class="text-left">\n', '\n</div>')} title={t('leftText')} className="shrink-0 size-8" />
                <IconButton icon={AlignCenter} onClick={() => fmt('<center>\n', '\n</center>')} title="Center" className="shrink-0 size-8" />
                <IconButton icon={AlignRight} onClick={() => fmt('<div class="text-right">\n', '\n</div>')} title={t('rightText')} className="shrink-0 size-8" />
                <IconButton icon={AlignJustify} onClick={() => fmt('<div class="text-justify">\n', '\n</div>')} title="Justify" className="shrink-0 size-8" />
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <IconButton icon={Quote} onClick={() => fmtLine('> ')} title={t('quote')} className="shrink-0 size-8" />
                <IconButton icon={LinkIcon} onClick={handleLink} title={t('link')} className="shrink-0 size-8" />
                <IconButton icon={Minus} onClick={() => insertAtCursor('\n\n---\n\n', 'end')} title={t('hr')} className="shrink-0 size-8" />
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('<div class="phishy">', '</div>')} title={t('redText')} className="size-8 flex items-center justify-center hover:bg-slate-700 rounded-lg text-[10px] font-black text-red-500 shrink-0">A</button>
                <IconButton icon={Terminal} onClick={() => fmt('`')} title={t('inlineCode')} className="shrink-0 size-8" active={activeFormats.code} />
                <IconButton icon={Code} onClick={() => fmt('```\n', '\n```')} title={t('codeBlock')} className="shrink-0 size-8" />
                <IconButton icon={Indent} onClick={handleIndent} title={t('indent')} className="shrink-0 size-8" />
                <IconButton icon={LayoutGrid} onClick={(e) => TOOLS_MAP['Table']?.action(e)} title={t('table')} className="shrink-0 size-8" />
                <IconButton icon={SplitSquareHorizontal} onClick={() => insertAtCursor('| Head |\n| --- |\n', 'end')} title="1 Col" className="shrink-0 size-8" />
                <IconButton icon={TableIcon} onClick={importTable} title={t('importTable')} className="shrink-0 size-8" />
                <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />
                <IconButton icon={AtSign} onClick={() => setActiveModal('mentions')} title={t('mentions')} className="shrink-0 size-8" />
                <IconButton icon={FileText} onClick={() => setActiveModal('templates')} title={t('templates')} className="shrink-0 size-8" />
              </div>
            </div>
          </div>
        )}

        <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block shrink-0" />

        {/* Right side: Notifications, Pub, etc */}
        <div className="flex items-center gap-1 xs:gap-2 shrink-0 ml-auto">
          <div className="relative">
            <button 
              onClick={() => setShowNotificationList(!showNotificationList)}
              className={cn(
                "p-1.5 xs:p-2 rounded-xl transition-all relative",
                notifEnabled ? "bg-[rgb(var(--accent-color)/0.1)] text-[rgb(var(--accent-color))]" : "text-slate-500 hover:text-white"
              )}
            >
              <Bell size={20} className={cn("xs:size-[18px]", visibleNotifications.some(n => !n.isRead) ? "animate-swing" : "")} />
              {visibleNotifications.some(n => !n.isRead) && (
                <span className={cn(
                  "absolute -top-0.5 -right-0.5 xs:-top-1 xs:-right-1 w-3.5 h-3.5 xs:w-4 xs:h-4 rounded-full border border-slate-950 flex items-center justify-center animate-pulse z-10 text-[7px] xs:text-[8px] text-black font-black bg-[rgb(var(--accent-color))]"
                )}>
                  {visibleNotifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotificationList && (
                <motion.div 
                  {...getMotionConfig()}
                  className="fixed top-14 left-2 right-2 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:origin-top-right sm:mt-2 sm:w-80 max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Сповіщення</h3>
                      <span className="text-[9px] text-slate-500 font-bold">{visibleNotifications.filter(n => !n.isRead).length} нових</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => setNotifEnabled(!notifEnabled)} className={cn("w-7 h-4 rounded-full relative transition-colors", notifEnabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700")}>
                          <div className={cn("absolute top-0.5 size-3 bg-white rounded-full transition-all", notifEnabled ? "left-3.5" : "left-0.5")} />
                       </button>
                       <button onClick={() => markAllAsRead()} className="p-1 text-slate-500 hover:text-white" title="Очистити"><Trash2 size={16} /></button>
                       <button onClick={() => setShowNotificationList(false)} className="p-1 text-slate-500 hover:text-white"><X size={18} /></button>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {visibleNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-[10px] uppercase font-black">Порожньо</div>
                    ) : (
                      <div className="divide-y divide-slate-800/30">
                        {visibleNotifications.map(n => (
                          <div key={n.id} className={cn("p-3 hover:bg-slate-800/30 transition-colors", !n.isRead && "bg-lime-400/5")}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-black text-white">@{n.author}</span>
                              {!n.isRead && <div className="w-1.5 h-1.5 bg-lime-400 rounded-full ml-auto" />}
                            </div>
                            <p className="text-[10px] text-slate-400 italic line-clamp-1 mb-1">{n.body}</p>
                            <button 
                              onClick={() => { 
                                setActiveView('reader'); 
                                setShowNotificationList(false);
                                setTargetReaderPost({ 
                                  author: n.parent_author || n.author, 
                                  permlink: n.parent_permlink || n.permlink,
                                  commentAuthor: n.author,
                                  commentPermlink: n.permlink
                                });
                              }}
                              className="text-[9px] font-black text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              ПЕРЕГЛЯНУТИ <ArrowRight size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          <div className="hidden md:flex items-center bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 shrink-0">
             <button 
                onClick={() => {
                  const next = !isDarkMode;
                  setIsDarkMode(next);
                  localStorage.setItem('steem_dark_mode', next.toString());
                }}
                className="p-1.5 text-slate-500 hover:text-white transition-all shrink-0"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <div className="relative shrink-0">
                 <button 
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-1 bg-slate-900/50 px-1.5 py-1 rounded-lg text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all"
                 >
                    {lang}
                    <ChevronDown size={8} className={cn("transition-transform", showLangMenu && "rotate-180")} />
                 </button>
                 
                 <AnimatePresence>
                   {showLangMenu && (
                     <motion.div
                       initial={{ opacity: 0, y: 5, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 5, scale: 0.95 }}
                       className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[80px]"
                     >
                       {(['uk', 'en', 'es', 'ko'] as const).map(l => (
                         <button
                           key={l}
                           onClick={() => {
                             setLang(l);
                             localStorage.setItem('steem_lang', l);
                             setShowLangMenu(false);
                           }}
                           className={cn(
                             "flex items-center w-full text-left px-3 py-2 text-[10px] font-black uppercase transition-colors border-b last:border-0 border-slate-700/50",
                             lang === l ? "bg-cyan-600/20 text-cyan-400" : "text-slate-400 hover:text-white hover:bg-slate-700"
                           )}
                         >
                           {l}
                         </button>
                       ))}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
          </div>

          <div className="relative shrink-0 z-50 mobile-tools-container">
             <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileTools1(!showMobileTools1);
                  if (!showMobileTools1) setShowMobileTools2(false);
                }}
                className="lg:hidden flex items-center justify-center bg-slate-800/30 p-2 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all size-10"
                title="Tools"
             >
                <Layers size={20} />
             </button>
             <div className={cn(
                "absolute lg:static top-full right-0 mt-2 lg:mt-0 bg-slate-800 lg:bg-slate-800/30 border border-slate-700 lg:border-slate-700/30 p-2 lg:p-1 rounded-xl shadow-2xl lg:shadow-none min-w-max flex-col lg:flex-row items-center gap-1 lg:gap-1.5 z-50",
                showMobileTools1 ? "flex" : "hidden lg:flex"
             )}>
                <IconButton icon={Layers} onClick={() => { setActiveModal('splitPost'); setShowMobileTools1(false); }} title={t('splitPost')} className="shrink-0 size-10" />
                <IconButton icon={ListIcon} onClick={() => { setActiveModal('queue'); setShowMobileTools1(false); }} title={t('queue')} className="shrink-0 size-10" />
                <IconButton icon={FolderOpen} onClick={() => { setActiveModal('drafts'); setShowMobileTools1(false); }} title={t('drafts')} className="shrink-0 size-10" />
                <div className="w-full lg:w-px h-px lg:h-5 bg-slate-700 my-1 lg:my-0 lg:mx-0.5 shrink-0" />
                <label className="w-10 h-10 bg-cyan-950/20 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center shadow-lg shadow-cyan-950/50" title={t('importMd') || 'Import MD'}>
                   <FileDown size={20} />
                   <input type="file" accept=".md,.txt" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if(f) {
                         const reader = new FileReader();
                         reader.onload = (ev) => {
                            const val = ev.target?.result as string;
                            if (useEditorStore.getState().content) {
                               setContent(useEditorStore.getState().content + '\n\n' + val);
                            } else {
                               setContent(val);
                            }
                            setShowMobileTools1(false);
                         };
                         reader.readAsText(f);
                      }
                   }} />
                </label>
                <IconButton icon={FileUp} onClick={() => { downloadFile(); setShowMobileTools1(false); }} title={t('exportMd') || 'Export MD'} className="shrink-0 size-10 text-slate-400 hover:text-cyan-400" />
             </div>
          </div>

          <div className="relative shrink-0 z-40 mobile-tools-container">
             <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileTools2(!showMobileTools2);
                  if (!showMobileTools2) setShowMobileTools1(false);
                }}
                className="lg:hidden flex items-center justify-center bg-slate-800/30 p-2 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all size-10"
                title="Files"
             >
                <FilePlus size={20} />
             </button>
             <div className={cn(
                "absolute lg:static top-full right-0 mt-2 lg:mt-0 bg-slate-800 lg:bg-slate-800/30 border border-slate-700 lg:border-slate-700/30 p-2 lg:p-1 rounded-xl shadow-2xl lg:shadow-none min-w-max flex-col lg:flex-row items-stretch lg:items-center gap-1.5 z-40",
                showMobileTools2 ? "flex" : "hidden lg:flex"
             )}>
                <IconButton 
                  icon={FilePlus} 
                  onClick={async () => {
                    setShowMobileTools2(false);
                    if (useEditorStore.getState().content.trim() !== '') {
                      const saveFirst = await confirmDialog(t('saveDraftBeforeNew') || "Save draft before starting new?");
                      if (saveFirst) saveDraft();
                      else if (!await confirmDialog(t('confirmNewPost'))) return;
                    }
                    setPubTitle(''); setContent(''); setPubTags(''); setCurrentDraftId(null);
                    localStorage.removeItem('steem_autosave_temp_visual_html');
                    if (wysiwygRef.current) wysiwygRef.current.innerHTML = '<p><br></p>';
                  }} 
                  title={t('newPost')} 
                  className="shrink-0 size-10 flex mx-auto" 
                />
                <div className="w-full lg:w-px h-px lg:h-5 bg-slate-700 my-0.5 lg:my-0 lg:mx-0.5 shrink-0" />
                <div className="flex flex-col lg:flex-row lg:items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shrink-0">
                   <button onClick={() => { saveDraft('working'); setShowMobileTools2(false); }} className="px-3 lg:px-2 py-2 lg:py-1.5 hover:bg-slate-800 text-slate-300 border-b lg:border-b-0 lg:border-r border-slate-700 flex items-center justify-center lg:justify-start gap-1.5 text-[10px] lg:text-[9px] font-black uppercase transition-colors" title={t('saveDraft')}>
                     <Save size={20} /> 
                     <span className="lg:hidden xl:inline">{lang === 'uk' ? 'Зберегти' : 'Save'}</span>
                   </button>
                   <button onClick={() => { saveDraft('ready'); setShowMobileTools2(false); }} className={cn(
                     "px-3 lg:px-2 py-2 lg:py-1.5 flex items-center justify-center transition-colors hover:bg-[rgb(var(--accent-color)/0.1)] text-[rgb(var(--accent-color))] hover:text-[rgb(var(--accent-color))]"
                   )} title={t('ready')}>
                     <CheckCircle size={20} />
                   </button>
                </div>
             </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-0.5 xs:mx-1 shrink-0" />

          {activeView === 'editor' && (
            <div className="flex items-center gap-1 bg-slate-800/30 p-1 rounded-xl border border-slate-700/30 shrink-0">
               {isPwaInstallable && !isPwaInstalled && (
                 <IconButton 
                   icon={Download} 
                   onClick={handleInstallPwa} 
                   title={t('installApp')} 
                   className="shrink-0 size-8 flex text-cyan-400 bg-cyan-950/20 border border-cyan-800/30 animate-pulse" 
                 />
               )}
               <IconButton icon={ShieldUserIcon} onClick={() => setActiveModal('keys')} title={t('keys')} className="shrink-0 size-8 flex" />
               <IconButton icon={Settings} onClick={() => { setSettingsTab('general'); setActiveModal('settings'); }} title={t('settings')} className="shrink-0 size-8 flex" />
               <IconButton icon={Rocket} onClick={() => setActiveModal('publish')} title={t('publish')} className="shrink-0 size-8 bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-900/40" />
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className={cn("flex-1 overflow-hidden bg-slate-900 flex flex-col", activeView !== 'reader' && "hidden")}>
            <Reader 
              onEditPost={handleEditPost}
              onVote={handleReaderVote}
              onComment={handleReaderComment}
              onDeleteComment={handleDeleteComment}
              onUploadImage={handleUploadImageForReader}
              onUserUpdate={(u) => setUsername(u)}
              currentUser={authType === 'VAULT' ? selectedVaultUser : username}
              onMuteUser={handleMuteUser}
              mutedUsers={mutedUsers || []}
              targetReaderPost={targetReaderPost}
              rawInboxData={rawNotifications}
            />
        </div>
        <div className={cn("flex-1 overflow-hidden flex", activeView !== 'editor' && "hidden")}>
            {/* Sidebar */}
            <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside 
              {...getSidebarMotionConfig()}
              className={cn(
                "border-r border-slate-800 bg-slate-900 flex flex-col z-30 absolute lg:relative h-full pb-16 lg:pb-0 shadow-2xl lg:shadow-none transition-all duration-300 overflow-visible",
                isGalleryCollapsed ? "w-16" : "w-[clamp(20rem,25vw,30rem)]"
              )}
            >
              <div className="flex flex-col flex-1 overflow-hidden custom-scrollbar">
                <section className={cn("flex flex-col flex-1 min-h-0 overflow-hidden py-2", isGalleryCollapsed ? "px-1" : "px-4")}>
                  <div className={cn("flex items-center mb-3 shrink-0", isGalleryCollapsed ? "justify-center" : "justify-between")}>
                    {!isGalleryCollapsed && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('gallery')}</span>}
                    <button 
                      onClick={() => setIsGalleryCollapsed(!isGalleryCollapsed)}
                      className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title={isGalleryCollapsed ? (lang === 'uk' ? 'Розгорнути галерею' : 'Expand Gallery') : (lang === 'uk' ? 'Згорнути галерею' : 'Collapse Gallery')}
                    >
                      {isGalleryCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                  </div>

                  {!isGalleryCollapsed && (
                    <>
                      <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2 shrink-0 overflow-x-auto no-scrollbar">
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggleGalleryMode('local')}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0",
                        galleryMode === 'local' ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      {t('gallery')}
                    </button>
                    <div className="w-px h-3 bg-slate-800 shrink-0" />
                    {[
                      { id: 'pexels', label: 'Pexels', key: pexelsApiKey },
                      { id: 'pixabay', label: 'Pixabay', key: pixabayApiKey },
                      { id: 'unsplash', label: 'Unsplash', key: unsplashAccessKey }
                    ].map(srv => (
                      <button 
                        key={srv.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => toggleGalleryMode(srv.id as any)}
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 shrink-0",
                          galleryMode === srv.id ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {srv.label}
                        {!srv.key && <Lock size={8} className="text-slate-600" />}
                      </button>
                    ))}
                    <div className="flex-1" />
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setGalleryView('grid')} 
                        className={cn("p-1 rounded", galleryView === 'grid' ? "text-cyan-400 bg-cyan-400/10" : "text-slate-600")}
                      >
                        <LayoutGrid size={14} />
                      </button>
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setGalleryView('list')} 
                        className={cn("p-1 rounded", galleryView === 'list' ? "text-cyan-400 bg-cyan-400/10" : "text-slate-600")}
                      >
                        <ListIcon size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 shrink-0">
                    {isGallerySettingsCollapsed && (
                      <div 
                        onClick={() => setIsGallerySettingsCollapsed(false)}
                        className="flex items-center justify-between mb-0.5 cursor-pointer group"
                      >
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none group-hover:text-cyan-400 transition-colors">{t('editorTools') || "Tools"}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsGallerySettingsCollapsed(false);
                          }}
                          className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-slate-500 transition-all"
                          title={t('settings')}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    )}
                  
                    <AnimatePresence>
                      {!isGallerySettingsCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="md:max-h-none overflow-y-auto custom-scrollbar pr-1 pb-1">
                            {galleryMode === 'local' ? (
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <button 
                                    onClick={() => {
                                      fileInputRef.current?.click();
                                      if (window.innerWidth < 1024) setIsWidgetVisible(false);
                                    }}
                                    disabled={isUploading}
                                    className="px-3 py-1.5 flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 border border-cyan-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0"
                                    title={t('insert')}
                                  >
                                    {isUploading ? (
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : <ImageIcon size={16} />}
                                    <span className="truncate">{t('insert')}</span>
                                  </button>

                                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                    <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                      <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'html' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>HTML</button>
                                      <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>MD</button>
                                    </div>
                                    <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                      <button onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))} className={cn("px-2 py-0.5 text-[8px] font-bold rounded uppercase transition-all", pexelsSettings.linkEmbedded ? "bg-slate-700 text-blue-400" : "text-slate-600 hover:text-slate-400")} title={t('linkInImg')}>LINK</button>
                                    </div>
                                    <button 
                                      onClick={() => setIsGallerySettingsCollapsed(true)}
                                      className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-cyan-400 transition-all ml-1 shrink-0"
                                      title={t('settings')}
                                    >
                                      <ChevronUp size={16} />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {vaultAccounts.length > 0 && (
                                    <div className="col-span-2 sm:col-span-3 flex items-center gap-2 p-1 bg-slate-800/50 rounded border border-slate-700/50">
                                      <select 
                                        value={imageUploadAccount || ''}
                                        onChange={(e) => setImageUploadAccount(e.target.value)}
                                        className="flex-1 bg-transparent text-[10px] text-cyan-400 font-bold outline-none cursor-pointer truncate"
                                      >
                                        <option value="" className="bg-slate-900 text-slate-300">@keychain / default</option>
                                        {vaultAccounts.map(acc => (
                                          <option key={acc} value={acc} className="bg-slate-900 text-slate-300">
                                            @{acc} {!SecurityService.isLocked() ? '✓' : '🔒'}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                  <p className="text-[8px] text-slate-500 truncate">
                                    {galleryMode === 'pexels' ? t('pexelsSearch') : 
                                    `Search ${galleryMode === 'unsplash' ? 'Unsplash' : 'Pixabay'}`}
                                  </p>
                                </div>
                                {pexelsResults.length > 0 && (
                                  <button 
                                    onClick={() => {
                                      setPexelsResults([]);
                                      notify(t('cacheCleared'));
                                    }}
                                    className="px-2 py-1.5 bg-slate-800/50 hover:bg-red-900/30 text-red-400 border border-red-900/20 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center shrink-0"
                                    title={t('clearCache')}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                <div className="flex items-center gap-1.5 shrink-0 ml-auto mr-0.5">
                                  <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                    <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'html' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>HTML</button>
                                    <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-0.5 text-[9px] font-black rounded transition-all", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}>MD</button>
                                  </div>
                                  <div className="flex bg-slate-800/50 p-0.5 rounded border border-slate-700/50">
                                    <button onClick={() => setPexelsSettings((prev: any) => ({ ...prev, withAttribution: !prev.withAttribution }))} className={cn("px-1.5 py-0.5 text-[8px] font-bold rounded uppercase transition-all", pexelsSettings.withAttribution ? "bg-slate-700 text-green-400" : "text-slate-600 hover:text-slate-400")} title={t('attribution')}>ATTR</button>
                                    <button onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))} className={cn("px-1.5 py-0.5 text-[8px] font-bold rounded uppercase transition-all", pexelsSettings.linkEmbedded ? "bg-slate-700 text-blue-400" : "text-slate-600 hover:text-slate-400")} title={t('linkInImg')}>LINK</button>
                                  </div>
                                  <button 
                                    onClick={() => setIsGallerySettingsCollapsed(true)}
                                    className="p-1 rounded bg-slate-800/50 hover:bg-slate-800 text-cyan-400 transition-all ml-1 shrink-0"
                                    title={t('settings')}
                                  >
                                    <ChevronUp size={16} />
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1.5 shrink-0">
                                  <button
                                    title={t('performanceDesc') || 'Вимикає деякі анімації'}
                                    onClick={() => {
                                      const next = !performanceMode;
                                      setPerformanceMode(next);
                                      localStorage.setItem('steem_performance_mode', next.toString());
                                    }}
                                    className={cn("flex justify-between items-center px-1.5 py-1 rounded border", performanceMode ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500")}
                                  >
                                    <span className="text-[9px] font-bold uppercase truncate">{t('performanceMode') || 'Perf'}</span>
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", performanceMode ? "bg-cyan-400" : "bg-slate-700")} />
                                  </button>

                                  <button
                                    onClick={() => {
                                      const newState = !isTrafficOptimized;
                                      setIsTrafficOptimized(newState);
                                      localStorage.setItem('steem_traffic_optimized', newState.toString());
                                    }}
                                    className={cn("flex justify-between items-center px-1.5 py-1 rounded border", isTrafficOptimized ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500")}
                                  >
                                    <span className="text-[9px] font-bold uppercase truncate">{t('trafficOptimization')?.substring(0, 6) || "Optim"}</span>
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isTrafficOptimized ? "bg-cyan-400" : "bg-slate-700")} />
                                  </button>

                                  <button
                                    onClick={() => {
                                      const newState = !isExifEnabled;
                                      setIsExifEnabled(newState);
                                      localStorage.setItem('steem_exif_enabled', newState.toString());
                                    }}
                                    className={cn("flex justify-between items-center px-1.5 py-1 rounded border", isExifEnabled ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500")}
                                  >
                                    <span className="text-[9px] font-bold uppercase truncate">{t('exifEnabled') || "EXIF"}</span>
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isExifEnabled ? "bg-cyan-400" : "bg-slate-700")} />
                                  </button>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-1.5 mb-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800/50 shrink-0 select-none">
                              <div className="flex items-center gap-1.5 w-full">
                                <button
                                  onClick={() => setIsTextWrapEnabled(!isTextWrapEnabled)}
                                  className={cn("flex items-center justify-center px-2 py-1.5 rounded-lg border transition-colors flex-1 min-w-0", isTextWrapEnabled ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300")}
                                  title={t('textWrap')}
                                >
                                  <TextWrapIcon size={15} className="shrink-0" />
                                </button>

                                <button
                                  onClick={() => setGridWithCaptions(!gridWithCaptions)}
                                  className={cn("flex items-center justify-center px-2 py-1.5 rounded-lg border transition-colors flex-1 min-w-0", gridWithCaptions ? "bg-cyan-900/30 border-cyan-800 text-cyan-400" : "bg-slate-800/30 border-slate-700/30 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300")}
                                  title={t('addCaption') || "Add Caption"}
                                >
                                  <ImageCaptionIcon size={15} className="shrink-0" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-1.5 w-full">
                                <div className="flex bg-slate-950/50 rounded-lg p-0.5 border border-slate-800/50 hover:border-slate-700/50 transition-colors shrink-0">
                                  {(['left', 'center', 'right'] as const).map(p => (
                                    <button
                                      key={p}
                                      onClick={() => setSingleCaptionAlign(p)}
                                      className={cn(
                                        "p-1.5 rounded transition-all", 
                                        singleCaptionAlign === p ? "bg-cyan-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300 active:scale-95"
                                      )}
                                    >
                                      {p === 'left' ? <AlignLeft size={15} /> : p === 'center' ? <AlignCenter size={15} /> : <AlignRight size={15} />}
                                    </button>
                                  ))}
                                </div>
                                <button 
                                  onClick={() => {
                                    insertGrid();
                                    if (window.innerWidth < 1024) setIsWidgetVisible(false);
                                  }}
                                  disabled={galleryMode === 'local' ? images.filter(i => i.selected).length === 0 : pexelsResults.filter(p => p.selected).length === 0}
                                  className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-cyan-900 disabled:opacity-50 border border-slate-700 hover:border-cyan-700 text-cyan-400 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 min-w-0"
                                  title={t('createGrid')}
                                >
                                  <LayoutGrid size={12} className="shrink-0" /> ({galleryMode === 'local' ? images.filter(i => i.selected).length : pexelsResults.filter(p => p.selected).length})
                                </button>
                              </div>

                              <div className="flex justify-between sm:justify-center bg-slate-950/50 rounded-lg p-0.5 border border-slate-800/50 hover:border-slate-700/50 transition-colors w-full overflow-x-auto no-scrollbar gap-0.5">
                                  {(['col', 'col-table', 'grid-2', 'row', 'col-img-text', 'col-text-img'] as const).map(l => (
                                    <button
                                      key={l}
                                      onClick={() => setGridLayout(l)}
                                      className={cn(
                                        "p-1.5 shrink-0 rounded transition-all flex-1 sm:flex-none flex justify-center", 
                                        gridLayout === l ? "bg-cyan-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300 active:scale-95"
                                      )}
                                      title={l === 'col' ? 'В стовпчик (не таблиця)' : l === 'col-table' ? 'Стовпчик в таблиці (зверху вниз)' : l === 'grid-2' ? 'Плитка (2x2)' : l === 'row' ? 'В один рядок (таблиця)' : l === 'col-img-text' ? 'Текст праворуч' : 'Текст ліворуч'}
                                    >
                                      {l === 'col' ? <ListIcon size={15} /> : l === 'col-table' ? <Rows size={15} /> : l === 'grid-2' ? <LayoutGrid size={15} /> : l === 'row' ? <Columns size={15} /> : l === 'col-img-text' ? <PanelLeft size={15} /> : <PanelRight size={15} />}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative mb-2 shrink-0">
                    <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      placeholder={
                        galleryMode === 'local' ? t('gallery') + "..." : 
                        galleryMode === 'pexels' ? t('pexelsSearch') + " (Enter)..." : 
                        `Search ${galleryMode === 'unsplash' ? 'Unsplash' : 'Pixabay'} (Enter)...`
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1 pl-7 pr-2 text-[10px] outline-none focus:ring-1 focus:ring-cyan-500"
                      value={gallerySearch}
                      onChange={e => setGallerySearch(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && galleryMode !== 'local') {
                          handleExternalSearch(gallerySearch);
                        }
                      }}
                    />
                    {galleryMode !== 'local' && isSearchingPexels && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="w-2.5 h-2.5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  </>
                  )}

                  <div className={cn(
                    "overflow-y-auto custom-scrollbar flex-1 min-h-0 px-1 mt-1",
                    !isGalleryCollapsed && galleryView === 'grid' ? "grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] auto-rows-min gap-3 content-start" : "flex flex-col gap-2"
                  )}>
                    {galleryMode === 'local' ? (
                      filteredLocalImages.map((img: ImageItem, idx: number) => (
                          <ImageItemComp
                            key={img.url + idx}
                            img={img}
                            idx={idx}
                            galleryView={galleryView}
                            isTrafficOptimized={isTrafficOptimized}
                            onToggle={toggleImageSelection}
                            onInsert={(url, name, pos) => {
                              insertImage(url, name, pos);
                              if (window.innerWidth < 1024) setIsWidgetVisible(false);
                            }}
                            onHost={uploadExternalImage}
                            onDelete={(i) => {
                              const url = filteredLocalImages[i]?.url;
                              if (url) setImages(prev => prev.filter(x => x.url !== url));
                            }}
                            onMoveLeft={idx > 0 ? (i) => moveImageLocal(i, -1) : undefined}
                            onMoveRight={idx < filteredLocalImages.length - 1 ? (i) => moveImageLocal(i, 1) : undefined}
                            t={t}
                            isCollapsed={isGalleryCollapsed}
                          />
                        ))
                    ) : (
                      pexelsResults.length > 0 ? (
                        pexelsResults.map((photo: any, idx: number) => (
                          <ExternalImageItem
                            key={photo.id + '-' + (photo.source || 'ext') + '-' + idx}
                            photo={photo}
                            idx={idx}
                            galleryView={galleryView}
                            onToggle={(i) => setPexelsResults(prev => prev.map((p, j) => i === j ? { ...p, selected: !p.selected } : p))}
                            onInsert={(photo, pos) => {
                              insertExternalImage(photo, pos);
                              if (window.innerWidth < 1024) setIsWidgetVisible(false);
                            }}
                            t={t}
                            isCollapsed={isGalleryCollapsed}
                          />
                        ))
                      ) : (
                        <div className={cn("flex flex-col items-center justify-center h-40 text-slate-600 gap-2", isGalleryCollapsed && "hidden")}>
                          <Search size={24} />
                          <p className="text-[10px] text-center">
                            {t('pexelsSearch')}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                  
                  {galleryMode !== 'local' && pexelsResults.length > 0 && !isSearchingPexels && !isGalleryCollapsed && (
                    <div className="mt-2 flex justify-center">
                      <button 
                        onClick={() => handleExternalSearch(gallerySearch, pexelsPage + 1)}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded-full transition-colors"
                      >
                        {t('loadMore')}
                      </button>
                    </div>
                  )}

                  {!isGalleryCollapsed && (
                  <div className="mt-2 shrink-0 border-t border-slate-800 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('links')}</span>
                      {(sourceInput || images.length > 0) && (
                        <button 
                          onClick={() => { setSourceInput(''); setImages([]); }}
                          className="text-[9px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={8} /> {t('clear')}
                        </button>
                      )}
                    </div>
                    <textarea 
                      className="w-full h-16 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-[9px] focus:ring-1 focus:ring-cyan-500 outline-none resize-none custom-scrollbar"
                      placeholder={t('pasteUrl')}
                      value={sourceInput}
                      onChange={e => parseImages(e.target.value)}
                    />
                  </div>
                  )}
                </section>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative pb-16 lg:pb-0">
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Pane */}
            <div 
              ref={editorPaneRef}
              className={cn(
                "flex-1 flex flex-col min-w-0 border-r border-slate-800 transition-all relative",
                activeMobileTab !== 'editor' && "hidden lg:flex",
                isEditorFullScreen && "bg-slate-950 p-0 fixed inset-0 z-[100]"
              )}
            >
<MobileStatsBar visualStyle={visualStyle} isDarkMode={isDarkMode} t={t} />

              {/* Editor Mode Toggler Tabs */}
              <div className={cn(
                "flex items-center justify-between px-4 py-2 border-b shrink-0 select-none relative transition-colors",
                visualStyle === 'neon' ? "bg-slate-950 border-slate-800/80" : (isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex p-0.5 rounded-lg border shrink-0 shadow-inner transition-colors",
                    visualStyle === 'neon' ? "bg-slate-950 border-slate-800" : (isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-300")
                  )}>
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSetEditorMode('visual')}
                      className={cn(
                        "px-3 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors flex items-center gap-1.5",
                        editorMode === 'visual' 
                          ? "bg-cyan-600 text-white shadow-sm" 
                          : (isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-900")
                      )}
                    >
                      <Eye size={12} />
                      <span className={cn(
                        isLivePreviewEnabled ? "hidden xl:inline" : "hidden sm:inline"
                      )}>
                        {lang === 'uk' ? 'Візуальний' : lang === 'es' ? 'Editor Visual' : lang === 'ko' ? '비주얼 에디터' : 'Visual Editor'}
                      </span>
                    </button>
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSetEditorMode('markdown')}
                      className={cn(
                        "px-3 py-1 text-[10px] sm:text-xs font-bold rounded transition-colors flex items-center gap-1.5",
                        editorMode === 'markdown' 
                          ? "bg-cyan-600 text-white shadow-sm" 
                          : (isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-900")
                      )}
                    >
                      <Terminal size={12} />
                      <span className={cn(
                        isLivePreviewEnabled ? "hidden xl:inline" : "hidden sm:inline"
                      )}>
                        {lang === 'uk' ? 'Markdown-код' : lang === 'es' ? 'Código Markdown' : lang === 'ko' ? '마크다운 코드' : 'Markdown Code'}
                      </span>
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={toggleEditorFullScreen}
                      className={cn(
                        "px-2 py-1 ml-1 rounded transition-colors flex items-center",
                        isDarkMode || visualStyle === 'neon' ? "text-slate-500 hover:text-cyan-400 hover:bg-slate-800" : "text-slate-500 hover:text-cyan-600 hover:bg-slate-200"
                      )}
                      title={isEditorFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                      {isEditorFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>
                  </div>

                  {/* Real-time sync toggle (RefreshCw) */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !onDemandSyncEnabled;
                      setOnDemandSyncEnabled(next);
                      localStorage.setItem('steem_on_demand_sync', String(next));
                      notify(
                        next 
                           ? (lang === 'uk' ? "Увімкнено оптимізовану фонову синхронізацію (без затримок)" : "Optimized background sync enabled (lag-free)") 
                           : (lang === 'uk' ? "Увімкнено безперервну синхронізацію в реальному часі" : "Continuous real-time sync enabled"), 
                        "success"
                      );
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold",
                      !onDemandSyncEnabled 
                        ? (isDarkMode || visualStyle === 'neon' ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100/50") 
                        : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
                    )}
                    title={lang === 'uk' ? (!onDemandSyncEnabled ? "Безперервна синхронізація (увімкнено)" : "Увімкнути безперервну синхронізацію") : (!onDemandSyncEnabled ? "Continuous real-time sync (enabled)" : "Enable continuous real-time sync")}
                  >
                    <RefreshCw size={12} className={cn(!onDemandSyncEnabled ? "text-cyan-400" : "text-slate-500")} />
                    <span className={cn(
                      isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
                    )}>
                      {lang === 'uk' ? 'Реал-тайм' : 'Real-time'}
                    </span>
                    {!onDemandSyncEnabled && (
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                      </span>
                    )}
                  </button>

                  {/* Live Preview Toggle */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleLivePreview}
                    className={cn(
                      "hidden lg:flex p-1.5 rounded-lg border transition-all items-center gap-1.5 text-[10px] sm:text-xs font-bold",
                      isLivePreviewEnabled 
                        ? (isDarkMode || visualStyle === 'neon' ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100/50") 
                        : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
                    )}
                    title={lang === 'uk' ? "Увімкнути/вимкнути прев'ю перегляду" : "Enable/Disable Live Preview"}
                  >
                    {isLivePreviewEnabled ? <Eye size={12} className={cn(isDarkMode || visualStyle === 'neon' ? "text-cyan-400" : "text-cyan-600")} /> : <EyeOff size={12} className="text-slate-500" />}
                    <span className={cn(
                      isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
                    )}>
                      {lang === 'uk' ? 'Прев\'ю' : 'Preview'}
                    </span>
                  </button>

                  {/* Beautification Toggle */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !beautifyEnabled;
                      setBeautifyEnabled(next);
                      localStorage.setItem('steem_beautify', String(next));
                      notify(
                        next
                          ? (lang === 'uk' ? "Б'ютіфікацію увімкнено (покращене оформлення)" : "Beautification enabled (enhanced styling)")
                          : (lang === 'uk' ? "Б'ютіфікацію вимкнено" : "Beautification disabled"),
                        "success"
                      );
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold",
                      beautifyEnabled 
                        ? (isDarkMode || visualStyle === 'neon' ? "bg-cyan-950/40 border-cyan-800/60 text-cyan-400 hover:bg-cyan-900/40" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100/50") 
                        : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
                    )}
                    title={lang === 'uk' ? (beautifyEnabled ? "Б'ютіфікація (увімкнено)" : "Увімкнути б'ютіфікацію") : (beautifyEnabled ? "Beautification (enabled)" : "Enable beautification")}
                  >
                    <Sparkles size={12} className={cn(beautifyEnabled ? "text-cyan-400" : "text-slate-500")} />
                    <span className={cn(
                      isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
                    )}>
                      {lang === 'uk' ? "Б'ютіфікація" : "Beautify"}
                    </span>
                    {beautifyEnabled && (
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                      </span>
                    )}
                  </button>

                  {/* Visual Spacing and Icon Size Popover */}
                  <div className="relative">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setIsSpacingMenuOpen(!isSpacingMenuOpen)}
                      className={cn(
                        "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-bold relative",
                        isSpacingMenuOpen
                          ? "bg-cyan-600 text-white border-cyan-500 shadow-none"
                          : (isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40" : "bg-slate-100/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
                      )}
                      title={lang === 'uk' ? "Налаштування відступів, б'ютіфікації та іконок" : "Spacing, Beautification & Size Settings"}
                    >
                      <MoveVertical size={12} />
                      <span className={cn(
                        isLivePreviewEnabled ? "hidden xl:inline" : "hidden xs:inline"
                      )}>
                        {lang === 'uk' ? 'Відступи' : 'Spacing'}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isSpacingMenuOpen && (
                        <>
                          {/* Overlay click-away handler */}
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
                            onClick={() => setIsSpacingMenuOpen(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                              "absolute right-0 mt-2 w-64 rounded-xl border p-4 shadow-xl z-50 flex flex-col gap-4 select-none",
                              isDarkMode || visualStyle === 'neon' ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                            )}
                          >
                            <div className={cn(
                              "flex items-center justify-between border-b pb-2",
                              isDarkMode || visualStyle === 'neon' ? "border-slate-800" : "border-slate-100"
                            )}>
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                {lang === 'uk' ? 'Опції розмітки' : 'Layout Options'}
                              </span>
                              <button 
                                onClick={() => setIsSpacingMenuOpen(false)}
                                className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                              >
                                <X size={12} />
                              </button>
                            </div>

                            {/* Beautification Toggle inside Spacing popover */}
                            <div className={cn(
                              "flex items-center justify-between border-b pb-3",
                              isDarkMode || visualStyle === 'neon' ? "border-slate-800/60" : "border-slate-100"
                            )}>
                              <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-cyan-400" />
                                <div>
                                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                                    {lang === 'uk' ? "Б'ютіфікація" : "Beautification"}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-medium block">
                                    {lang === 'uk' ? "Покращене оформлення" : "Enhanced styling"}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const next = !beautifyEnabled;
                                  setBeautifyEnabled(next);
                                  localStorage.setItem('steem_beautify', String(next));
                                }}
                                className={cn(
                                  "w-9 h-5 rounded-full transition-all duration-300 relative border shrink-0",
                                  beautifyEnabled 
                                    ? "bg-cyan-600 border-cyan-500" 
                                    : (isDarkMode || visualStyle === 'neon' ? "bg-slate-800 border-slate-700" : "bg-slate-200 border-slate-300")
                                )}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-300",
                                  beautifyEnabled ? "left-[18px]" : "left-0.5"
                                )} />
                              </button>
                            </div>

                            {/* Spacing preset & slider */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {lang === 'uk' ? 'Відступи абзаців' : 'Paragraph Spacing'}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded">
                                  {wysiwygSpacing}px
                                </span>
                              </div>
                              <div className={cn(
                                "grid grid-cols-4 gap-1 p-0.5 rounded-lg border",
                                isDarkMode || visualStyle === 'neon' ? "bg-slate-950/40 border-slate-800/60" : "bg-slate-50 border-slate-200"
                              )}>
                                {[
                                  { id: 6, label: lang === 'uk' ? 'Комп' : 'Comp' },
                                  { id: 14, label: lang === 'uk' ? 'Збал' : 'Bal' },
                                  { id: 20, label: lang === 'uk' ? 'Стан' : 'Norm' },
                                  { id: 28, label: lang === 'uk' ? 'Прос' : 'Spac' }
                                ].map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      setWysiwygSpacing(p.id);
                                      localStorage.setItem('steem_wysiwyg_spacing', String(p.id));
                                    }}
                                    className={cn(
                                      "py-1 px-0.5 rounded text-[9px] font-bold transition-all text-center truncate",
                                      wysiwygSpacing === p.id
                                        ? "bg-cyan-600 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
                                    )}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-[9px] text-slate-500 font-mono">0px</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="40"
                                  value={wysiwygSpacing}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setWysiwygSpacing(val);
                                    localStorage.setItem('steem_wysiwyg_spacing', String(val));
                                  }}
                                  className="flex-1 accent-cyan-500 bg-slate-800/60 h-1 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[9px] text-slate-500 font-mono">40px</span>
                              </div>
                            </div>

                            {/* Toolbar icon size preset & slider */}
                            <div className={cn(
                              "space-y-2 border-t pt-3",
                              isDarkMode || visualStyle === 'neon' ? "border-slate-800/60" : "border-slate-100"
                            )}>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {lang === 'uk' ? 'Розмір іконок' : 'Toolbar Icon Size'}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded">
                                  {toolbarIconSize}px
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-500 font-mono">12px</span>
                                <input
                                  type="range"
                                  min="12"
                                  max="32"
                                  value={toolbarIconSize}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setToolbarIconSize(val);
                                    localStorage.setItem('steem_toolbar_icon_size', String(val));
                                  }}
                                  className="flex-1 accent-cyan-500 bg-slate-800/60 h-1 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-[9px] text-slate-500 font-mono">32px</span>
                              </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>


              </div>

              {editorMode === 'markdown' ? (
                <CodeEditor
                  id="main-editor"
                  ref={editorRef}
                  onDemandSyncEnabled={onDemandSyncEnabled}
                  onChange={() => {
                    if (widgetPos === 'floating' && isWidgetVisible && !isWidgetMenuOpen) {
                      setIsWidgetVisible(false);
                    }
                  }}
                  onScroll={handleEditorScroll}
                  onFocus={() => setIsEditorFocused(true)}
                  onBlur={() => {
                    saveCursorPosition();
                    setTimeout(() => setIsEditorFocused(false), 200);
                  }}
                  onKeyDown={handleEditorKeyDown}
                  onMouseUp={(e) => {
                    showWidget(e.clientX, e.clientY);
                  }}
                  className={cn(
                    "flex-1 w-full bg-transparent text-slate-300 text-base outline-none resize-none custom-scrollbar transition-all duration-700 editor-font",
                    beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-[clamp(40rem,60vw,80rem)] mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-3 pt-3 lg:px-6 lg:pt-6",
                    "pb-4 mb-[85px] lg:mb-[85px]"
                  )}
                  placeholder={`${t('placeholder')}\n\n\n\n\nОМ АХ ХУМ СО ХА\n♡`}
                />
              ) : (
                <div
                  ref={wysiwygRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyDown={handleWysiwygKeyDown}
                  onPaste={async (e) => {
                    const text = e.clipboardData.getData('text/plain');
                    if (text) {
                      const trimmedText = text.trim();
                      if (isImageAndProxyUrl(trimmedText)) {
                        e.preventDefault();
                        const imgHtml = `<img src="${trimmedText}" alt="image">`;
                        insertHtmlAtCursor(imgHtml);
                        updateContentFromWysiwyg();
                        return;
                      }

                      const hasMarkdownImage = /!\[([^\]]*)\]\(([^)]+)\)/.test(text);
                      const hasMarkdownLink = /\[([^\]]*)\]\(([^)]+)\)/.test(text);
                      const hasBareImageUrl = /(?:https?:\/\/)[^\s<>"')]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|tiff)(?:\?.*)?/i.test(text);

                      const hasMarkdownSyntax = /(?:^|\n)(#{1,6}\s|\*\s|-\s|>\s|\d+\.\s|```)/.test(text) || /\*\*([^*]+)\*\*|__([^_]+)__|_([^\s_][^_]*[^\s_])_|\*([^\s*][^*]*[^\s*])\*|`([^`]+)`/.test(text);
                      const hasHtmlSyntax = /<(?:div|span|p|br|hr|h[1-6]|b|strong|i|em|u|strike|s|sub|sup|a|img|table|thead|tbody|tr|td|th|ul|ol|li|code|pre|center|blockquote)[^>]*>/i.test(text);
                      if (hasMarkdownImage || hasMarkdownLink || hasBareImageUrl || hasMarkdownSyntax || hasHtmlSyntax) {
                        e.preventDefault();
                        const processed = convertBareImageUrlsToMarkdown(text);
                        const m = getMarked();
                        if (m) {
                          const parsedHtml = await m.parse(processed);
                          insertHtmlAtCursor(parsedHtml);
                          updateContentFromWysiwyg();
                        }
                      }
                    }
                  }}
                  onInput={(e) => {
                    if (isSyncingRef.current) return;
                    const target = e.target as HTMLDivElement;
                    // O(1) Optimization: Check if active under cursor instead of full DOM traversal queryAll
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) {
                      const anchorNode = sel.anchorNode;
                      if (anchorNode) {
                        const parentEl = anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as Element) : anchorNode.parentElement;
                        if (parentEl) {
                          const spacerEl = parentEl.closest('.table-spacer[data-empty="true"]');
                          if (spacerEl && spacerEl.textContent && spacerEl.textContent.trim() !== '') {
                            spacerEl.removeAttribute('data-empty');
                            spacerEl.removeAttribute('data-placeholder');
                            spacerEl.classList.remove('table-spacer');
                            spacerEl.classList.remove('top-spacer');
                            spacerEl.classList.remove('bottom-spacer');
                          }
                        }
                      }
                    }

                    // Ensure top and bottom spacers are always present when needed
                    const firstEl = target.firstElementChild;
                    if (firstEl && ['TABLE', 'PRE', 'BLOCKQUOTE', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'CENTER'].includes(firstEl.tagName)) {
                      const hasTopSpacer = firstEl.classList.contains('top-spacer');
                      if (!hasTopSpacer) {
                        const pBefore = document.createElement('p');
                        pBefore.className = 'table-spacer top-spacer';
                        pBefore.setAttribute('data-empty', 'true');
                        pBefore.setAttribute('data-placeholder', lang === 'uk' ? '↵ Початок допису...' : lang === 'es' ? '↵ Inicio de la publicación...' : lang === 'ko' ? '↵ 게시물 시작...' : '↵ Top of post...');
                        pBefore.innerHTML = '<br>';
                        target.insertBefore(pBefore, firstEl);
                      }
                    }

                    const lastEl = target.lastElementChild;
                    const hasBottomSpacer = lastEl && lastEl.tagName === 'P' && lastEl.classList.contains('bottom-spacer');
                    if (!hasBottomSpacer) {
                      const pAfter = document.createElement('p');
                      pAfter.className = 'table-spacer bottom-spacer';
                      pAfter.setAttribute('data-empty', 'true');
                      pAfter.setAttribute('data-placeholder', lang === 'uk' ? '↵ Кінець допису...' : lang === 'es' ? '↵ Fin de la publicación...' : lang === 'ko' ? '↵ 게시물 끝...' : '↵ End of post...');
                      pAfter.innerHTML = '<br>';
                      target.appendChild(pAfter);
                    }

                    const html = target.innerHTML;
                    const syncDelay = onDemandSyncEnabled ? 4000 : 150;
                    const backupDelay = onDemandSyncEnabled ? 2000 : 800;

                    // Debounce local storage backup of raw HTML so typing remains 100% native and fluid
                    if (wysiwygLocalBackupTimeoutRef.current) {
                      clearTimeout(wysiwygLocalBackupTimeoutRef.current);
                    }
                    wysiwygLocalBackupTimeoutRef.current = setTimeout(() => {
                      localStorage.setItem('steem_autosave_temp_visual_html', html);
                    }, backupDelay) as any;
                    
                    // Delay HTML-to-Markdown conversion so typing stays 100% native and smooth.
                    // This ensures zero unnecessary CPU-heavy conversions during active typing.
                    if (wysiwygSyncTimeoutRef.current) {
                      clearTimeout(wysiwygSyncTimeoutRef.current);
                    }
                    wysiwygSyncTimeoutRef.current = setTimeout(() => {
                      const md = htmlToMarkdown(html);
                      if (md !== useEditorStore.getState().content) {
                        lastSyncContentRef.current = md;
                        setContent(md);
                        saveVisualSelection();
                      }
                    }, syncDelay) as any;
                  }}
                  onFocus={() => {
                    setIsEditorFocused(true);
                    saveVisualSelection();
                  }}
                  onBlur={() => {
                    setIsEditorFocused(false);
                    // Sync visual editor raw HTML immediately on blur for full safety
                    if (onDemandSyncEnabled && wysiwygRef.current) {
                      localStorage.setItem('steem_autosave_temp_visual_html', wysiwygRef.current.innerHTML);
                    }
                  }}
                  onScroll={() => {
                    if (wysiwygRef.current) {
                      localStorage.setItem('steem_editor_scroll', String(wysiwygRef.current.scrollTop));
                    }
                  }}
                  onMouseUp={(e) => {
                    showWidget(e.clientX, e.clientY);
                    saveVisualSelection();
                  }}
                  onKeyUp={() => {
                    saveVisualSelection();
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target === wysiwygRef.current) {
                      const lastChild = target.lastElementChild;
                      if (lastChild && ['TABLE', 'BLOCKQUOTE', 'CENTER', 'DIV', 'IMG'].includes(lastChild.tagName)) {
                        const sel = window.getSelection();
                        const range = document.createRange();
                        range.setStartAfter(lastChild);
                        range.collapse(true);
                        sel?.removeAllRanges();
                        sel?.addRange(range);
                      }
                    }
                  }}
                  className={cn(
                    "flex-1 w-full bg-transparent text-slate-300 text-base outline-none overflow-y-auto custom-scrollbar transition-colors duration-700 editor-font prose prose-invert prose-cyan max-w-none wysiwyg-editor whitespace-pre-wrap",
                    beautifyEnabled ? "px-4 lg:px-8 pt-4 lg:pt-6 max-w-4xl mx-auto selection:bg-[rgb(var(--accent-color)/0.3)]" : "px-4 pt-4 lg:px-6 lg:pt-6",
                    "pb-4 mb-[85px] lg:mb-[85px]"
                  )}
                  style={{ minHeight: '200px' }}
                />
              )}

              {/* Table Action Menu */}
              {activeTable && tableRect && editorMode === 'visual' && (
                <div 
                  className={cn("fixed z-[160] flex flex-col gap-1.5 p-1.5 rounded-xl",
                    isTableMenuExpanded || isTableMenuPinned ? "bg-slate-900 border border-slate-700/50 shadow-none" : "bg-transparent shadow-none"
                  )}
                  style={{
                    top: tableRect.top + 10,
                    left: Math.max(8, tableRect.left - 48),
                  }}
                  onMouseEnter={() => !isTableMenuPinned && setIsTableMenuExpanded(true)}
                  onMouseLeave={() => !isTableMenuPinned && setIsTableMenuExpanded(false)}
                >
                  {isTableMenuExpanded || isTableMenuPinned ? (
                    <>
                      <button 
                        onClick={() => {
                          const newPinned = !isTableMenuPinned;
                          setIsTableMenuPinned(newPinned);
                          localStorage.setItem('steem_table_menu_pinned', newPinned.toString());
                        }} 
                        className={cn("p-2 rounded-lg transition-colors flex items-center justify-center", isTableMenuPinned ? "text-cyan-400 bg-cyan-900/40" : "text-slate-400 hover:text-white hover:bg-slate-800")}
                        title="Pin Menu"
                      >
                        <Settings size={16} />
                      </button>
                      <div className="h-px w-full bg-slate-800" />
                      <button onClick={deleteActiveTableRow} className="p-2 text-slate-400 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors flex items-center justify-center" title="Delete Row">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={deleteActiveTableCol} className="p-2 text-slate-400 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors flex items-center justify-center" title="Delete Column">
                        <Trash2 size={16} className="rotate-90" />
                      </button>
                      <button onClick={deleteActiveTable} className="p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors flex items-center justify-center" title="Delete Table">
                        <Trash2 size={18} />
                      </button>
                    </>
                  ) : (
                    <button 
                      className="p-2 text-slate-400 bg-slate-900 border border-slate-700/50 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shadow-none flex items-center justify-center" 
                      title="Table Settings"
                    >
                      <Settings size={18} className="opacity-70" />
                    </button>
                  )}
                </div>
              )}

              {/* Tamed Widget - Now with arrow navigation and smart positioning */}
              {isWidgetVisible && !activeModal && (window.innerWidth >= 1024 || !isSidebarOpen) && (
                  <div 
                    key="steem-widget"
                    ref={widgetRef}
                    style={(() => {
                      const style: React.CSSProperties = { 
                        opacity: 1.0 
                      };
                      
                      if (widgetPos === 'floating' && window.innerWidth >= 1024 && floatingPos && editorPaneRef.current) {
                        const rect = editorPaneRef.current.getBoundingClientRect();
                        style.position = 'fixed';
                        
                        // Width estimation for 8 tools + navigation + settings + paddings (~420px)
                        const widgetWidth = 400; 

                        // Standard floating
                        const leftBound = rect.left + 10;
                        const rightBound = rect.right - widgetWidth - 10;
                        style.left = Math.min(rightBound, Math.max(leftBound, floatingPos.x));
                        style.top = floatingPos.y < 150 ? floatingPos.y + 40 : floatingPos.y - 80;
                      }
                      
                      return style;
                    })()}
                    className={cn(
                      "z-[150] p-1 flex items-center gap-1",
                      widgetNoBorder 
                        ? "shadow-none border-none border-transparent py-0 px-0 bg-slate-900"
                        : "bg-slate-900 border border-white/10 rounded-3xl p-1 shadow-none",
                      widgetPos === 'floating' ? (
                        "fixed lg:absolute " + (window.innerWidth < 1024 ? "bottom-[4.5rem] left-4 right-4 rounded-3xl" : "")
                      ) : (
                        "absolute bottom-4 left-4 right-4 rounded-3xl mx-auto max-w-2xl"
                      )
                    )}
                  >
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => scrollRef.current?.scrollBy({ left: -100, behavior: 'smooth' })}
                      className="hidden lg:flex h-[var(--toolbar-btn-size,3rem)] px-1.5 items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <ChevronLeft size={20} className="w-[var(--toolbar-icon-size,1.25rem)] h-[var(--toolbar-icon-size,1.25rem)]" />
                    </button>

                    <div 
                      ref={scrollRef}
                      onWheel={(e) => {
                        if (scrollRef.current) {
                          if (e.deltaX !== 0) {
                            // Let native horizontal scrolling work
                            return;
                          }
                          // Translate vertical scrolling to horizontal
                          e.preventDefault();
                          scrollRef.current.scrollBy({ left: e.deltaY > 0 ? 50 : -50 });
                        }
                      }}
                      className="flex items-center flex-nowrap justify-start gap-1.5 overflow-x-auto custom-scrollbar scroll-smooth no-scrollbar px-1 py-0 w-full"
                      style={{ 
                        scrollbarWidth: 'none',
                        minWidth: isWidgetMenuOpen && lockedToolsWidth ? `${lockedToolsWidth}px` : undefined,
                        width: isWidgetMenuOpen && lockedToolsWidth ? `${lockedToolsWidth}px` : undefined
                      }}
                    >
                      {enabledTools.map((key) => {
                        const tool = TOOLS_MAP[key];
                        if (!tool) return null;
                        const isToolActive = 
                          key === 'B' ? activeFormats.bold :
                          key === 'I' ? activeFormats.italic :
                          key === 'S' ? activeFormats.strikethrough :
                          key === 'sub' ? activeFormats.sub :
                          key === 'sup' ? activeFormats.sup :
                          key === 'Inline' ? activeFormats.code :
                          key === 'Color' ? activeFormats.phishy :
                          false;
                        return (
                          <button 
                            key={key}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={tool.action} 
                            className={cn(
                              "toolbar-btn flex-shrink-0 flex items-center justify-center hover:bg-cyan-600 hover:text-white rounded-xl transition-colors font-bold",
                              isToolActive 
                                ? "bg-cyan-950 text-cyan-400 border border-cyan-500/50 shadow-none"
                                : !widgetNoBorder 
                                  ? "bg-slate-800 border border-slate-600/50 text-slate-300 shadow-none"
                                  : "bg-transparent text-slate-400 hover:bg-white/10"
                            )}
                          >
                            {tool.label}
                          </button>
                        );
                      })}
                    </div>

                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => scrollRef.current?.scrollBy({ left: 100, behavior: 'smooth' })}
                      className="hidden lg:flex h-[var(--toolbar-btn-size,3rem)] px-1.5 items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <ChevronRight size={20} className="w-[var(--toolbar-icon-size,1.25rem)] h-[var(--toolbar-icon-size,1.25rem)]" />
                    </button>

                    <div className="hidden lg:block w-px h-[calc(var(--toolbar-btn-size,3rem)-8px)] bg-slate-700/50 mx-1 flex-shrink-0" />
                    
                    <div className="relative">
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!isWidgetMenuOpen && scrollRef.current) {
                            setLockedToolsWidth(scrollRef.current.offsetWidth);
                          } else {
                            setTimeout(() => setLockedToolsWidth(null), 300); // Wait for transition
                          }
                          setIsWidgetMenuOpen(!isWidgetMenuOpen);
                        }} 
                        className={cn(
                          "toolbar-btn flex-shrink-0 flex items-center justify-center rounded-xl transition-all",
                          isWidgetMenuOpen ? "bg-cyan-600 text-white" : 
                          !widgetNoBorder ? "bg-slate-700 hover:bg-cyan-600 hover:text-white border border-slate-600/50" : "bg-transparent text-slate-400 hover:bg-white/10"
                        )}
                      >
                        <Settings size={20} />
                      </button>

                      <AnimatePresence mode="popLayout">
                        {isWidgetMenuOpen && (
                          <motion.div
                            key="widget-settings-menu"
                            initial={{ opacity: 0, y: menuDirection === 'down' ? -10 : 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className={cn(
                              "absolute right-0 w-72 border border-white/5 rounded-3xl overflow-hidden z-[160] flex flex-col bg-slate-900 shadow-none",
                              menuDirection === 'down' ? "top-full mt-3" : "bottom-full mb-3"
                            )}
                            style={{ 
                              maxHeight: widgetRef.current ? 
                                (menuDirection === 'up' 
                                  ? `${Math.max(200, widgetRef.current.getBoundingClientRect().top - 70)}px`
                                  : `${Math.max(200, window.innerHeight - widgetRef.current.getBoundingClientRect().bottom - 20)}px`) 
                                : '80vh' 
                            }}
                          >
                            <div className="p-4 border-b border-white/5 bg-slate-800/20 flex items-center justify-between shrink-0">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Zap size={16} className="text-cyan-400" /> {t('widgetSettings')}
                                </h3>
                                <button onClick={() => {
                                  setTimeout(() => setLockedToolsWidth(null), 300);
                                  setIsWidgetMenuOpen(false);
                                }} className="p-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                                  <X size={18} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar pb-8">
                              <div className="space-y-4">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('widgetOpacity')}</label>
                                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">{Math.round(widgetOpacity * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range" min="0.1" max="1" step="0.05" value={widgetOpacity}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setWidgetOpacity(val);
                                      localStorage.setItem('widget_opacity', val.toString());
                                    }}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 opacity-80 hover:opacity-100 transition-opacity"
                                  />
                                </div>

                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full transition-all duration-500", widgetNoBorder ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-slate-600")} />
                                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tight">{t('widgetNoBorder') || 'Без рамок'}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const next = !widgetNoBorder;
                                      setWidgetNoBorder(next);
                                      localStorage.setItem('widget_no_border', next.toString());
                                    }}
                                    className={cn(
                                      "w-9 h-5 rounded-full transition-all duration-300 relative",
                                      widgetNoBorder ? "bg-cyan-600" : "bg-slate-700"
                                    )}
                                  >
                                    <div className={cn(
                                      "absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300",
                                      widgetNoBorder ? "left-5" : "left-1"
                                    )} />
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">{t('widgetPos')}</label>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                      { id: 'floating', label: 'FLOAT' },
                                      { id: 'bottom', label: 'BOTTOM' }
                                    ].map(pos => (
                                      <button
                                        key={pos.id}
                                        onClick={() => {
                                          setWidgetPos(pos.id as any);
                                          localStorage.setItem('steem_widget_pos', pos.id);
                                        }}
                                        className={cn(
                                          "text-[9px] py-2 rounded-xl border transition-all duration-300 text-center font-bold tracking-tighter",
                                          widgetPos === pos.id ? "bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-900/20" : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10"
                                        )}
                                      >
                                        {pos.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('activeToolsSort')}</label>
                                  <span className="text-[9px] text-slate-600 italic">Drag to sort</span>
                                </div>

                                <Reorder.Group 
                                  axis="y" 
                                  values={enabledTools} 
                                  onReorder={(newOrder) => {
                                    setEnabledTools(newOrder);
                                    localStorage.setItem('steem_enabled_tools', JSON.stringify(newOrder));
                                  }} 
                                  className="space-y-2"
                                >
                                  {enabledTools.map((key, idx) => (
                                    <Reorder.Item 
                                      key={key} 
                                      value={key}
                                      transition={{ duration: 0.1 }}
                                      dragListener={true}
                                      whileDrag={{ 
                                        scale: 1, 
                                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                                        borderColor: "rgba(6, 182, 212, 0.3)",
                                        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                                        zIndex: 200
                                      }}
                                      className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2.5 rounded-2xl cursor-grab active:cursor-grabbing hover:border-cyan-500/10 group relative"
                                    >
                                      <div className="flex items-center gap-3">
                                        <MoveVertical size={18} className="text-slate-600 group-hover:text-cyan-500 transition-colors" />
                                        <span className="text-[11px] font-bold text-slate-200">{TOOLS_MAP[key]?.label}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveTool(key, 'up');
                                          }}
                                          disabled={idx === 0}
                                          className="text-slate-500 hover:text-cyan-400 disabled:opacity-0 transition-all p-1"
                                        >
                                          <ChevronUp size={20} />
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveTool(key, 'down');
                                          }}
                                          disabled={idx === enabledTools.length - 1}
                                          className="text-slate-500 hover:text-cyan-400 disabled:opacity-0 transition-all p-1"
                                        >
                                          <ChevronDown size={20} />
                                        </button>
                                      </div>
                                    </Reorder.Item>
                                  ))}
                                </Reorder.Group>

                                <div className="grid grid-cols-4 gap-1.5 pt-2">
                                  {Object.keys(TOOLS_MAP).map(key => (
                                    <button
                                      key={`toggle-${key}`}
                                      onClick={() => toggleTool(key)}
                                      className={cn(
                                        "text-[9px] py-1.5 px-2 rounded-lg border text-center transition-all font-medium truncate",
                                        enabledTools.includes(key) 
                                          ? "bg-cyan-600/10 border-cyan-500/50 text-cyan-400" 
                                          : "bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700"
                                      )}
                                    >
                                      {key}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setIsWidgetVisible(false)} 
                      className={cn(
                        "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all lg:hidden",
                        !widgetNoBorder ? (performanceMode ? "bg-slate-700 hover:bg-red-600 hover:text-white border border-slate-600/50" : "bg-slate-700/50 hover:bg-red-600 hover:text-white border border-slate-600/50") : "bg-transparent text-slate-400 hover:bg-red-600/20 hover:text-red-400"
                      )}
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
            </div>

            {/* Preview Pane */}
            <div 
              ref={previewRef}
              className={cn(
                "flex-1 flex flex-col min-w-0 bg-slate-900 relative",
                activeMobileTab === 'preview' ? "flex" : "hidden",
                isLivePreviewEnabled ? "lg:flex" : "lg:hidden",
                isFullScreen && "bg-slate-950 p-4 lg:p-12 overflow-y-auto fixed inset-0 z-[100]"
              )}
            >
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 gap-1 shrink-0">
                  <button
                    onClick={toggleLivePreview}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isLivePreviewEnabled ? "bg-cyan-600 text-white shadow-none" : "bg-red-950 text-red-400 border border-red-500/30"
                    )}
                    title={lang === 'uk' ? "Увімкнути/вимкнути прев'ю перегляду" : "Enable/Disable Live Preview"}
                  >
                    {isLivePreviewEnabled ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-0.5 my-auto" />
                  <button
                    onClick={() => setSyncScrollEnabled(!syncScrollEnabled)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      syncScrollEnabled ? "bg-cyan-600 text-white shadow-none" : "text-slate-500 hover:text-slate-300"
                    )}
                    title={t('syncScroll')}
                  >
                    <MoveVertical size={20} />
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-0.5 my-auto" />
                  <button 
                    onClick={toggleFullScreen}
                    className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                    title={t('fullScreen')}
                  >
                    {isFullScreen ? <X size={20} /> : <Maximize2 size={20} />}
                  </button>
                </div>
              </div>

              <div 
                className={cn(
                  "flex-1 p-8 overflow-y-auto prose prose-invert prose-cyan max-w-none custom-scrollbar markdown-body",
                  widgetPos === 'bottom' ? "mb-20 lg:mb-16 pb-12" : "pb-24 lg:pb-8",
                  isFullScreen && "max-w-4xl mx-auto"
                )}
                ref={previewPaneRef}
              />
            </div>
          </div>

          {/* Mobile Tabs - Merged into Bottom Nav below */}

          {/* Footer Status Bar - Hidden on mobile to save space for tabs */}
<DesktopStatsFooter t={t} />
        </main>
      </div>
  </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'unlock-pin' && (
          <div key="modal-unlock-pin" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-[240px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-none p-5 text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-600" />
              
              <div className="w-10 h-10 bg-cyan-600/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
                <Lock className="text-cyan-400" size={18} />
              </div>
              
              <h3 className="text-sm font-bold mb-1 text-slate-100 uppercase tracking-tight">{t('vaultLocked')}</h3>
              <p className="text-[10px] text-slate-500 mb-4">{t('enterPinPlaceholder')}</p>
              
              <input 
                autoFocus
                type="password"
                value={vaultPin}
                onChange={e => setVaultPin(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && vaultPin) {
                    try {
                      await SecurityService.unlock(vaultPin);
                      notify(t('vaultUnlocked'), 'success');
                      setVaultPin('');
                      setActiveModal(null);
                      initVault();
                    } catch (err: any) {
                      notify(t('pinError'), 'error');
                      setVaultPin('');
                      console.error(err);
                    }
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-center text-lg tracking-[0.5em] focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:tracking-normal placeholder:text-[10px] text-cyan-400 font-mono"
                placeholder="••••"
              />
              
              <div className="flex gap-2 mt-5">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-[10px] font-bold transition-all uppercase"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={async () => {
                    if (!vaultPin) return;
                    try {
                      await SecurityService.unlock(vaultPin);
                      notify(t('vaultUnlocked'), 'success');
                      setVaultPin('');
                      setActiveModal(null);
                      initVault();
                    } catch (err: any) {
                      notify(t('pinError'), 'error');
                      setVaultPin('');
                      console.error(err);
                    }
                  }}
                  className="flex-[2] py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-cyan-900/20 uppercase"
                >
                  {t('unlock')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'keys' && (
          <div key="modal-keys" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
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
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
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
                          setPerformanceMode(next);
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
                             setPexelsApiKey(null);
                             setPixabayApiKey(null);
                             setUnsplashAccessKey(null);
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
                    onClick={() => setActiveModal(null)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    {t('done')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'publish' && (
          <div key="modal-publish" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
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
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              
              <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex gap-2 p-1 bg-slate-800 rounded-xl border border-slate-700">
                  <button 
                    onClick={() => setAuthType('KEYCHAIN')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all",
                      authType === 'KEYCHAIN' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <ShieldCheck size={18} /> Keychain
                  </button>
                  <button 
                    onClick={() => setAuthType('VAULT')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all",
                      authType === 'VAULT' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Lock size={18} /> Vault
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
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none"
                              >
                                <option value="">{t('selectAccount')}</option>
                                {vaultAccounts.map(acc => (
                                  <option key={acc} value={acc}>@{acc}</option>
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
                          onClick={() => setPubTags(prev => {
                            const existing = prev.split(' ').filter(t => t.trim());
                            if (existing.includes(tag)) return prev;
                            return [...existing, tag].join(' ');
                          })}
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
                                      const weight = parseFloat(benWeight);
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
                                  {mentions.map(m => (
                                    <button
                                      key={m}
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
                            {extractMentions(contentForPublish).filter(m => !mentions.includes(m)).length > 0 && (
                              <div className="px-1">
                                <span className="text-[8px] text-slate-600 uppercase font-bold mb-1 block opacity-60">{t('fromMentions')}:</span>
                                <div className="flex flex-wrap gap-1">
                                  {extractMentions(contentForPublish).filter(m => !mentions.includes(m)).map(m => (
                                    <button
                                      key={m}
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
                                <div key={idx} className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50 text-[10px] hover:border-slate-600 transition-colors">
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
                  className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {pubLog.type === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Rocket size={20} />}
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
        )}

          {/* Templates Modal */}
          {activeModal === 'templates' && (
            <div key="modal-templates" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/90"
                onClick={() => setActiveModal(null)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-none w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{t('templates')}</h2>
                      <p className="text-xs text-slate-500 uppercase tracking-widest">{templates.length} {t('saved') || 'збережено'}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                  <div className="flex gap-2 mb-6">
                    <button 
                      onClick={async () => {
                        const name = await promptDialog(t('templateName'));
                        if (name) {
                          const newT: Template = {
                            id: Date.now().toString(),
                            name,
                            content: useEditorStore.getState().content,
                            tags: pubTags,
                            title: pubTitle
                          };
                          const updated = [...templates, newT];
                          setTemplates(updated);
                          localStorage.setItem('steem_templates', JSON.stringify(updated));
                          notify(t('templateSaved'));
                        }
                      }}
                      className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
                    >
                      <Plus size={18} />
                      {t('saveAsTemplate')}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {templates.length === 0 ? (
                      <div className="text-center py-10 text-slate-500">
                        <FileText size={40} className="mx-auto mb-4 opacity-20" />
                        <p>{t('templatesEmpty')}</p>
                      </div>
                    ) : (
                      templates.map(tmp => (
                        <div key={tmp.id} className="group p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl hover:border-cyan-500/50 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-200">{tmp.name}</h4>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setContent(tmp.content);
                                  if (tmp.tags) setPubTags(tmp.tags);
                                  if (tmp.title) setPubTitle(tmp.title);
                                  setActiveModal(null);
                                }}
                                className="p-1.5 hover:bg-cyan-600/20 text-cyan-400 rounded-lg transition-colors"
                                title={t('load')}
                              >
                                <CheckCircle size={20} />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (await confirmDialog(t('confirmDeleteTemplate').replace('{name}', tmp.name))) {
                                    const updated = templates.filter(t => t.id !== tmp.id);
                                    setTemplates(updated);
                                    localStorage.setItem('steem_templates', JSON.stringify(updated));
                                    notify(t('templateDeleted'));
                                  }
                                }}
                                className="p-1.5 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 italic">{tmp.content.substring(0, 100)}...</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        {activeModal === 'tagPresets' && (
          <div key="modal-tag-presets" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal('publish')}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full sm:max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[80vh]"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30 shrink-0">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Tags className="text-cyan-400" /> {t('tagPresets')}
                </h2>
                <button onClick={() => setActiveModal('publish')} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <LayoutGrid size={18} /> {t('communities')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {COMMUNITIES.map(comm => (
                      <div 
                        key={comm.id}
                        onClick={() => {
                          const allSelected = comm.tags.every(t => pubTags.includes(t));
                          if (allSelected) {
                            setPubTags(prev => {
                              const tags = prev.split(' ').filter(t => t.trim());
                              return tags.filter(t => !comm.tags.includes(t)).join(' ');
                            });
                          } else {
                            setPubTags(prev => {
                              const tags = prev.split(' ').filter(t => t.trim());
                              comm.tags.forEach(t => {
                                if (!tags.includes(t)) tags.push(t);
                              });
                              return tags.join(' ');
                            });
                          }
                        }}
                        className={cn(
                          "flex flex-col items-start p-4 border rounded-xl transition-all bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50",
                          comm.tags.every(t => pubTags.includes(t)) ? "border-cyan-500 bg-cyan-500/10" : (comm.tags.some(t => pubTags.includes(t)) && "border-cyan-500/50 bg-cyan-500/5")
                        )}
                      >
                        <span className="font-bold text-sm text-slate-200 mb-2">{comm.name}</span>
                        <div className="flex flex-wrap gap-1">
                          {comm.tags.map(tag => (
                            <button
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTag(tag);
                              }}
                              className={cn(
                                "text-[9px] px-2 py-0.5 rounded-full border transition-all",
                                pubTags.includes(tag)
                                  ? "bg-cyan-600 border-cyan-500 text-white"
                                  : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600"
                              )}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Plus size={18} /> {t('commonTags')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_TAGS.map(tag => (
                      <button 
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          pubTags.includes(tag) 
                            ? "bg-cyan-600 border-cyan-500 text-white" 
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                        )}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
                <button 
                  onClick={() => setPubTags('')}
                  className="px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  {t('clear')}
                </button>
                <button 
                  onClick={() => setActiveModal('publish')}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-sm transition-all"
                >
                  {t('done')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'splitPost' && (
          <div key="modal-split" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Layers className="text-cyan-400" /> {t('splitPost')}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {t('splitPostDesc')}
                </p>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-3">
                    <span>{t('minWordsPerPart') || 'Words per part'}</span>
                    <input 
                      type="number" 
                      value={splitWords} 
                      onChange={(e) => setSplitWords(Number(e.target.value))}
                      className="w-16 sm:w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white flex items-baseline gap-2">
                    {Math.ceil(stats.words / (splitWords || 300))}
                    <span className="text-xs text-slate-500 font-medium">{t('parts')}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-slate-800/30 border-t border-slate-800 flex gap-3">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold rounded-xl transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSplitPost}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98]"
                >
                  {t('splitBtn')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'drafts' && (
          <div key="modal-drafts" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <div className="flex flex-col">
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <FolderOpen className="text-cyan-400" /> {t('drafts')}
                  </h2>
                  <div className="flex gap-2 mt-2">
                    {(['all', 'working', 'ready'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setDraftFilter(f)}
                        className={cn(
                          "text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border transition-all",
                          draftFilter === f ? "bg-cyan-600 border-cyan-500 text-white" : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500"
                        )}
                      >
                        {t(f as any)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label 
                    className="p-1 sm:p-1.5 text-slate-500 hover:text-cyan-400 bg-slate-800/50 hover:bg-cyan-900/30 rounded border border-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center group cursor-pointer"
                    title="Імпортувати бекап чернеток"
                  >
                    <FileDown size={18} className="sm:size-[16px]" />
                    <input type="file" accept=".zip" className="hidden" onChange={importBackup} />
                  </label>
                  <button 
                    onClick={exportBackup}
                    className="p-1 sm:p-1.5 text-slate-500 hover:text-cyan-400 bg-slate-800/50 hover:bg-cyan-900/30 rounded border border-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center group"
                    title="Експортувати бекап чернеток"
                  >
                    <FileUp size={18} className="sm:size-[16px]" />
                  </button>
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white p-1"><X size={18} className="sm:size-[20px]" /></button>
                </div>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
                {(() => {
                  const allDrafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
                  const filtered = allDrafts.filter((d: Draft) => draftFilter === 'all' || d.status === draftFilter);
                  
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>{t('noDrafts')}</p>
                      </div>
                    );
                  }

                  return filtered.map((draft: Draft) => (
                    <div 
                      key={draft.id}
                      className="group p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all cursor-pointer flex justify-between items-center"
                      onClick={async () => {
                        if (await confirmDialog(t('loadDraftConfirm'))) {
                          setContent(draft.body);
                          setCurrentDraftId(draft.id);
                          localStorage.removeItem('steem_autosave_temp_visual_html');
                          setActiveModal(null);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-200 truncate">{draft.title}</h4>
                          {draft.status === 'ready' && (
                            <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded border border-green-500/30 uppercase font-bold tracking-tighter">
                              {t('ready')}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{draft.date}</p>
                      </div>
                      <div className="flex gap-1 items-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setContent(draft.body);
                            setPubTitle(draft.title);
                            setActiveModal('publish');
                          }}
                          title={t('publish')}
                          className="p-2 text-cyan-500 hover:bg-cyan-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Rocket size={20} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDraftStatus(draft.id);
                          }}
                          title={draft.status === 'ready' ? t('working') : t('ready')}
                          className={cn(
                            "p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                            draft.status === 'ready' ? "text-green-400 hover:bg-green-400/10" : "text-slate-500 hover:bg-slate-500/10"
                          )}
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirmDialog(t('delete') + '?')) {
                              const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAFTS) || "[]");
                              localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts.filter((d: Draft) => d.id !== draft.id)));
                              setActiveModal('drafts_refresh'); // Hack to re-render
                              setTimeout(() => setActiveModal('drafts'), 0);
                            }
                          }}
                          className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'mentions' && (
          <div key="modal-mentions" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <AtSign className="text-cyan-400" /> {t('mentions')}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMention}
                    onChange={e => setNewMention(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder={t('username')}
                  />
                  <button 
                    onClick={addMention}
                    className="p-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                  {mentions.map(user => (
                    <div key={user} className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 group">
                      <button 
                        onClick={() => { insertAtCursor(`@${user} `); setActiveModal(null); }}
                        className="text-sm font-bold hover:text-cyan-400 transition-colors"
                      >
                        @{user}
                      </button>
                      <button 
                        onClick={async () => {
                          if (await confirmDialog(t('delete') + '?')) {
                            const updated = mentions.filter(u => u !== user);
                            setMentions(updated);
                            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

          <AnimatePresence>
            {isSMenuOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/90"
                  onClick={() => setIsSMenuOpen(false)}
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }} 
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="relative bg-slate-900 border border-white/5 rounded-[2rem] shadow-none max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                    <div className="absolute top-0 right-0 p-4 z-10">
                      <button onClick={() => setIsSMenuOpen(false)} className="text-slate-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-none">
                        <span className={cn("logo-s", visualStyle === 'neon' && "neon-icon-glow")}>S</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight text-white leading-none">Settings <span className="text-cyan-400">Hub</span></h2>
                        <p className="text-slate-500 text-[10px] font-medium mt-1 uppercase tracking-widest">Personalize experience</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Theme Assortment */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Zap size={14} className="text-yellow-400" /> Interface Accent
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {activeAssortment.map(t => (
                            <button
                              key={t.name}
                              onClick={() => {
                                setThemeColor(t.name);
                                localStorage.setItem('steem_theme_color', t.name);
                              }}
                              className={cn(
                                "w-6 h-6 rounded-lg transition-all border flex items-center justify-center",
                                themeColor === t.name ? "border-[rgb(var(--accent-color))] scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                              )}
                            >
                              <div className="w-3 h-3 rounded-md" style={{ backgroundColor: t.hex }} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Configuration */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Edit3 size={14} className="text-cyan-400" /> Typography
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {fontOptions.map(f => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setEditorFont(f.id);
                                localStorage.setItem('steem_editor_font', f.id);
                              }}
                              className={cn(
                                "px-2 py-1 rounded-lg border text-center transition-all flex items-center gap-1.5",
                                editorFont === f.id ? "bg-[rgb(var(--accent-color)/0.1)] border-[rgb(var(--accent-color)/0.5)] text-[rgb(var(--accent-color))]" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/[0.08]"
                              )}
                              style={{ fontFamily: f.family }}
                            >
                              <span className="text-sm font-bold">Aa</span>
                              <span className="text-[9px] font-black uppercase tracking-widest">{f.label.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Beautification */}
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                            <Eye size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-200 block">Beautification</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Enhanced styling</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const next = !beautifyEnabled;
                            setBeautifyEnabled(next);
                            localStorage.setItem('steem_beautify', next.toString());
                          }}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all duration-500 relative",
                            beautifyEnabled ? "bg-[rgb(var(--accent-color))]" : "bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-white shadow-xl transition-all duration-500",
                            beautifyEnabled ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <button 
                          onClick={() => {
                            setIsDarkMode(!isDarkMode);
                            localStorage.setItem('steem_dark_mode', (!isDarkMode).toString());
                            setVisualStyle('standard');
                            localStorage.setItem('steem_visual_style', 'standard');
                          }}
                          className={cn(
                            "py-4 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all",
                            visualStyle === 'standard' ? "bg-white/10 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                          )}
                        >
                          {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-indigo-400" />} 
                          {isDarkMode ? "Light" : "Dark"}
                        </button>
                        <button 
                          onClick={() => {
                            const next = visualStyle === 'neon' ? 'standard' : 'neon';
                            setVisualStyle(next);
                            localStorage.setItem('steem_visual_style', next);
                          }}
                          className={cn(
                            "py-4 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all",
                            visualStyle === 'neon' ? "bg-purple-600/20 text-purple-400 border border-purple-500/50" : "bg-white/5 text-slate-400 hover:bg-white/10"
                          )}
                        >
                          <Zap size={18} className={visualStyle === 'neon' ? "text-purple-400" : "text-slate-500"} /> Neon
                        </button>
                      </div>
                      <div className="pt-2 flex flex-col gap-2">
                        <button 
                          onClick={() => {
                            setIsSMenuOpen(false);
                            setSettingsTab('general');
                            setActiveModal('settings');
                          }}
                          className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-3xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl shadow-cyan-600/20 text-center"
                        >
                          <Settings size={18} /> {lang === 'uk' ? 'Розширені налаштування' : 'Advanced Settings'}
                        </button>
                        <a 
                          href="/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-3xl text-sm font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-600/20 text-center"
                        >
                          <Maximize2 size={18} /> {lang === 'uk' ? 'Повний екран та Тестування' : 'Full Preview & Testing'}
                        </a>
                        <button 
                          onClick={() => {
                            setIsSMenuOpen(false);
                            setActiveModal('about');
                          }}
                          className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-3xl text-sm font-black text-slate-300 flex items-center justify-center gap-3 transition-all"
                        >
                          <Info size={18} /> {lang === 'uk' ? 'Про додаток' : 'About App'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* About Modal */}
          {activeModal === 'about' && (
            <div key="modal-about" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/90"
                onClick={() => setActiveModal(null)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-none p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <button 
                  onClick={() => setActiveModal(null)}
                  className="absolute top-6 right-6 text-slate-500 hover:text-white"
                >
                  <X size={24} />
                </button>

                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-cyan-500 rounded-2xl flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6 shadow-none">U</div>
                  <h2 className="text-3xl font-bold mb-2 tracking-tight">Ultra Steem <span className="text-cyan-400">Editor</span></h2>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-4">{t('aboutDesc')}</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                    <Shield size={14} /> Web Crypto AES-GCM Secured
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                  {/* Credits Section */}
                  <div className="space-y-6">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                       <CheckCircle size={18} /> {t('credits')}
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <div className="font-bold text-slate-200 mb-1 flex items-center gap-2">
                          <Zap size={18} className="text-yellow-400" /> {t('aiCredits')}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{t('aiTasks')}</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <div className="font-bold text-slate-200 mb-1 flex items-center gap-2">
                          <AtSign size={18} className="text-cyan-400" /> {t('humanCredits')}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{t('humanTasks')}</p>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-slate-500">{t('version')}</span>
                        <span className="bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-md font-mono font-bold">4.3.8</span>
                      </div>
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-slate-500">{t('license')}</span>
                        <span className="text-slate-300 font-bold">GNU AGPL v3</span>
                      </div>
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('appAgent')}</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={appAgent} 
                            onChange={(e) => {
                              setAppAgent(e.target.value);
                              localStorage.setItem('steem_app_agent', e.target.value);
                            }}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <p className="text-[9px] text-slate-600 italic">{t('appAgentDesc')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tech Stack Section */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <Terminal size={18} /> {t('packagesUsed')}
                      </h3>
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {[
                          { n: 'react', v: '19.0', d: 'Ядро інтерфейсу, реактивність та керування станом компонентів.' },
                          { n: 'dsteem', v: '0.11', d: 'Повноцінна клієнтська інтеграція з блокчейном Steem (транзакції, підписи, апвоути).' },
                          { n: 'motion', v: '12.0', d: 'Професійні та плавні анімації інтерфейсу для відмінного UX.' },
                          { n: 'marked', v: '18.0', d: 'Швидкісний і безпечний парсер Markdown розмітки в чистий HTML.' },
                          { n: 'dompurify', v: '3.4', d: 'Надійне очищення HTML від XSS-загроз при читанні стрічки дописів.' },
                          { n: 'lucide-react', v: '0.47', d: 'Набір сучасних та лаконічних векторних іконок для UI.' },
                          { n: 'buffer', v: '6.0', d: 'Поліфіл буфера для криптографічних підписів у браузерному оточенні.' },
                          { n: 'jszip', v: '3.10', d: 'Створення та архівація чернеток у Markdown ZIP-пакети для бекапу.' },
                          { n: 'idb-keyval', v: '6.2', d: 'Надшвидке сховище автозбереження чернеток в IndexedDB браузера.' },
                          { n: 'idiomorph', v: '0.3', d: 'Інтелектуальне зіставлення (morphing) DOM для безшовної синхронізації без втрати фокусу й курсору.' },
                          { n: 'zustand', v: '5.0', d: 'Легковажне керування глобальним станом застосунку.' }
                        ].map(pkg => (
                          <div key={pkg.n} className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col gap-0.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-cyan-400 font-mono leading-none">{pkg.n}</span>
                              <span className="text-[8px] text-slate-500 font-mono font-bold">v.{pkg.v}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-normal">{pkg.d}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <Globe size={18} /> {t('externalLibs')}
                      </h3>
                      <div className="space-y-1.5">
                        {[
                          { name: 'Lucide Icons', desc: 'Сучасні векторні піктограми високої чіткості' },
                          { name: 'Motion Physics', desc: 'Фізично-базована модель декларативних анімацій' },
                          { name: 'Tailwind CSS v4', desc: 'Утилітарний CSS-фреймворк для стилізації інтерфейсу' },
                          { name: 'DSteem Ledger API', desc: 'Низькорівневе з\'єднання з децентралізованою мережею Steem' },
                          { name: 'Marked Compiler', desc: 'Надшвидкий синтаксичний компілятор розмітки тексту' }
                        ].map(lib => (
                          <div key={lib.name} className="flex justify-between items-center text-[10px] bg-slate-950/20 p-1 px-2 border border-slate-800/40 rounded-lg">
                            <span className="text-slate-300 font-bold">{lib.name}</span>
                            <span className="text-slate-500 font-medium italic">{lib.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={() => window.open('https://github.com/ultrapositivecode/steem-editor-pro-react', '_blank')}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-700/50 group"
                      >
                         GitHub <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Changelog Section */}
                  <div className="col-span-1 md:col-span-2 space-y-4 pt-6 mt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                         <FileText size={18} /> Changelog & Updates
                       </h3>
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(getChangelogText());
                           const btn = document.getElementById('copy-log-btn');
                           if (btn) {
                             const orig = btn.innerText;
                             btn.innerText = "COPIED!";
                             setTimeout(() => btn.innerText = orig, 2000);
                           }
                         }}
                         id="copy-log-btn"
                         className="text-[9px] font-bold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest px-2 py-1 bg-slate-800/50 rounded flex gap-1 items-center"
                       >
                         <Copy size={10} /> COPY LOG
                       </button>
                    </div>
                    
                    <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-xl p-4">
                       {APP_CHANGELOG.map((log, index) => (
                         <div key={log.version} className={cn("space-y-2", index > 0 && "pt-3 border-t border-slate-800/50")}>
                           <div className="flex items-center gap-2">
                             <span className={cn("text-xs font-bold px-2 py-0.5 rounded", index === 0 ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 bg-slate-800")}>{log.version}</span>
                             <span className="text-[10px] text-slate-500">{log.date}</span>
                           </div>
                           <ul className={cn("text-sm list-inside list-disc space-y-2 pl-1", index === 0 ? "text-slate-300" : "text-slate-400 space-y-1")}>
                             {log.changes.map((change, i) => (
                               <li key={i}>{change}</li>
                             ))}
                           </ul>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        {activeModal === 'tagGroups' && (
          <div key="modal-tag-groups" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal('publish')}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Tags className="text-cyan-400" /> {t('tagGroups')}
                </h2>
                <button onClick={() => setActiveModal('publish')} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <button 
                  onClick={async () => {
                    const name = await promptDialog(t('addTagGroup'));
                    if (!name) return;
                    const tags = await promptDialog(t('tagsPlaceholder'));
                    if (!tags) return;
                    const newGroup: TagGroup = {
                      id: Date.now().toString(),
                      name,
                      tags: tags.split(/\s+/).filter(Boolean)
                    };
                    setTagGroups([...tagGroups, newGroup]);
                  }}
                  className="w-full py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors font-bold text-sm"
                >
                  {t('addTagGroup')}
                </button>
                <div className="space-y-2 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                  {tagGroups.map(group => (
                    <div key={group.id} className="p-3 bg-slate-800 rounded-lg group">
                      <div className="flex justify-between items-center mb-1">
                        <button 
                          onClick={() => {
                            const currentTags = pubTags.split(/\s+/).filter(Boolean);
                            const nextTags = [...currentTags];
                            group.tags.forEach(tag => {
                              if (!nextTags.includes(tag)) nextTags.push(tag);
                            });
                            setPubTags(nextTags.join(' '));
                          }}
                          className="font-bold text-sm hover:text-cyan-400 transition-colors"
                        >
                          {group.name} ({t('applyGroup')})
                        </button>
                        <button 
                          onClick={async () => {
                          if (await confirmDialog(t('delete') + '?')) {
                            setTagGroups(tagGroups.filter(g => g.id !== group.id));
                          }
                        }}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.tags.map(tag => (
                          <button 
                            key={tag}
                            onClick={() => {
                              const currentTags = pubTags.split(/\s+/).filter(Boolean);
                              if (currentTags.includes(tag)) {
                                setPubTags(currentTags.filter(t => t !== tag).join(' '));
                              } else {
                                setPubTags([...currentTags, tag].join(' '));
                              }
                            }}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded transition-colors",
                              pubTags.includes(tag) ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            )}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'queue' && (
          <div key="modal-queue" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ListIcon className="text-cyan-400" /> {t('queue')}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
              </div>
              <div className="p-6 space-y-4">
                {queue.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 italic">{t('queueEmpty')}</div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {queue.map((item) => (
                      <div key={item.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl group hover:border-cyan-500/30 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-slate-200 line-clamp-1">{item.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-400">@{item.authType === 'VAULT' ? item.selectedVaultUser : item.username}</span>
                              {item.scheduledTime && (
                                <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                                  <Calendar size={14} /> {new Date(item.scheduledTime).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                          onClick={async () => {
                            if (await confirmDialog(t('delete') + '?')) {
                              const updated = queue.filter(i => i.id !== item.id);
                              setQueue(updated);
                              localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
                            }
                          }}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                              item.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                              item.status === 'published' ? "bg-green-500/10 text-green-500" :
                              "bg-red-500/10 text-red-500"
                            )}>
                              {t(item.status)}
                            </span>
                          </div>
                          {item.status !== 'published' && (
                            <button 
                              onClick={() => publishFromQueue(item.id)}
                              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              <Rocket size={18} /> {t('publish')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === 'tableImport' && (
        <div key="modal-table" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90"
            onClick={() => setActiveModal(null)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-none overflow-hidden flex flex-col"
          >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TableIcon className="text-cyan-400" /> {t('importTableTitle')}
                </h2>
                <div className="flex items-center gap-2">
                  {tableImportText && (
                    <button 
                      onClick={() => setTableImportText('')}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 px-2 py-1"
                    >
                      <Trash2 size={16} /> {t('clear')}
                    </button>
                  )}
                  <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
                </div>
              </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">{t('importTableDesc')}</p>
              <textarea 
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-cyan-500 custom-scrollbar resize-none"
                placeholder={t('importTablePlaceholder')}
                value={tableImportText}
                onChange={e => setTableImportText(e.target.value)}
                autoFocus
              />

              <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                <span className="text-xs font-bold text-slate-500 uppercase ml-2">{t('tableFormat')}</span>
                <div className="flex bg-slate-900 p-1 rounded-md gap-1">
                  <button 
                    onClick={() => setTableImportFormat('markdown')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded transition-all", 
                      tableImportFormat === 'markdown' ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Markdown
                  </button>
                  <button 
                    onClick={() => setTableImportFormat('html')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded transition-all", 
                      tableImportFormat === 'html' ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    HTML
                  </button>
                </div>
              </div>

              <button 
                onClick={processTableImport}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-900/20"
              >
                {t('importBtn')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      </AnimatePresence>

      <AnimatePresence>
        {activeModal === 'settings' && (
        <div key="modal-settings" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90"
            onClick={() => setActiveModal(null)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg bg-[var(--bg-sidebar)] border-[var(--border-color)] rounded-2xl shadow-none overflow-hidden container-theme"
          >
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-slate-800/10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
                <Settings className="text-cyan-400" /> {t('settings')}
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-500 hover:text-white"><X /></button>
            </div>
              <div className="flex border-b border-[var(--border-color)] bg-slate-800/10 overflow-x-auto no-scrollbar shrink-0">
                {(['general', 'gallery', 'vault', 'keys', 'about', 'pwa'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSettingsTab(tab)}
                    className={cn(
                      "px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                      settingsTab === tab 
                        ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
                    )}
                  >
                    {t(tab)}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {settingsTab === 'general' && (
                  <section className="space-y-6">
                    {/* Performance Mode */}
                    <div className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-700/50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg"><Zap size={18} /></div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">{t('performanceMode')}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{t('performanceDesc') || 'Вимикає деякі анімації'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setPerformanceMode(!performanceMode)}
                        className={cn(
                          "w-10 h-5 rounded-full transition-all relative",
                          performanceMode ? "bg-cyan-600" : "bg-slate-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                          performanceMode ? "left-6" : "left-1"
                        )} />
                      </button>
                    </div>

                    {/* Visual Style Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('appearance') || 'Style'}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setVisualStyle('standard');
                            localStorage.setItem('steem_visual_style', 'standard');
                          }}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2",
                            visualStyle === 'standard' ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg" : "bg-slate-900 border-slate-800 text-slate-50"
                          )}
                        >
                          <Sun size={14} /> {isDarkMode ? 'Dark' : 'Light'}
                        </button>
                        <button
                          onClick={() => {
                            setVisualStyle('neon');
                            localStorage.setItem('steem_visual_style', 'neon');
                          }}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2",
                            visualStyle === 'neon' ? "bg-purple-900/40 border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "bg-slate-900 border-slate-800 text-slate-50"
                          )}
                        >
                          <Zap size={14} /> Cyber Neon
                        </button>
                      </div>
                    </div>

                    {/* Font Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('font')}</label>
                      <div className="grid grid-cols-3 gap-2">
                         {[
                           { id: 'sans', label: t('fontSans'), class: 'font-sans' },
                           { id: 'serif', label: t('fontSerif'), class: 'font-serif' },
                           { id: 'mono', label: t('fontMono'), class: 'font-mono' }
                         ].map(f => (
                           <button 
                             key={f.id}
                             onClick={() => {
                               setEditorFont(f.id);
                               localStorage.setItem('steem_editor_font', f.id);
                             }}
                             className={cn(
                               "py-2 rounded-xl border text-xs transition-all",
                               editorFont === f.id ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg" : "bg-slate-900 border-slate-800 text-slate-500"
                             )}
                           >
                             <span className={f.class}>Aa</span>
                             <span className="ml-2">{f.label.split(' ')[0]}</span>
                           </button>
                         ))}
                      </div>
                    </div>

                    {/* Theme Colors */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('theme')}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'cyan', label: t('themeCyan'), color: '#06b6d4' },
                          { id: 'emerald', label: t('themeEmerald'), color: '#10b981' },
                          { id: 'orange', label: t('themeOrange'), color: '#f97316' },
                          { id: 'rose', label: t('themeRose'), color: '#f43f5e' }
                        ].map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => {
                              setThemeColor(theme.id);
                              localStorage.setItem('steem_theme_color', theme.id);
                            }}
                            className={cn(
                              "text-[9px] p-2 rounded-xl border transition-all text-center flex flex-col items-center gap-1.5",
                              themeColor === theme.id ? "bg-slate-800 border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-900/10" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                            )}
                          >
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.color }} />
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Editor Options */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          {lang === 'uk' ? "Синхронне пролистування" : "Synchronous scrolling"}
                        </span>
                        <button 
                          onClick={() => {
                            const next = !syncScrollEnabled;
                            setSyncScrollEnabled(next);
                            localStorage.setItem('steem_sync_scroll', next.toString());
                          }}
                          className={cn(
                            "w-9 h-5 rounded-full transition-all relative",
                            syncScrollEnabled ? "bg-cyan-600" : "bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                            syncScrollEnabled ? "left-5" : "left-1"
                          )} />
                        </button>
                      </div>

                      {/* Custom Toolbar Icon Size Control */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/40">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {lang === 'uk' ? "Розмір піктограм панелі" : "Toolbar Icon Size"}
                          </label>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                            {toolbarIconSize} px
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
                          {[
                            { id: 14, label: lang === 'uk' ? "Дрібні" : "Small" },
                            { id: 20, label: lang === 'uk' ? "Стандарт" : "Normal" },
                            { id: 26, label: lang === 'uk' ? "Великі" : "Large" }
                          ].map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => {
                                setToolbarIconSize(preset.id);
                                localStorage.setItem('steem_toolbar_icon_size', String(preset.id));
                              }}
                              className={cn(
                                "py-1.5 px-2 rounded-lg text-[10px] font-semibold uppercase transition-all text-center",
                                toolbarIconSize === preset.id 
                                  ? "bg-cyan-600 text-white shadow" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">12px</span>
                          <input
                            type="range"
                            min="12"
                            max="32"
                            value={toolbarIconSize}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setToolbarIconSize(val);
                              localStorage.setItem('steem_toolbar_icon_size', String(val));
                            }}
                            className="flex-1 accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">32px</span>
                        </div>
                      </div>

                      {/* Custom Visual Editor Spacing Control */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/40">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {lang === 'uk' ? "Відступи у візуальному режимі" : "Visual Editor Spacing"}
                          </label>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded">
                            {wysiwygSpacing} px
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
                          {[
                            { id: 6, label: lang === 'uk' ? "Компакт" : "Compact" },
                            { id: 14, label: lang === 'uk' ? "Збаланс" : "Balanced" },
                            { id: 20, label: lang === 'uk' ? "Стандарт" : "Normal" },
                            { id: 28, label: lang === 'uk' ? "Просторі" : "Spacious" }
                          ].map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => {
                                setWysiwygSpacing(preset.id);
                                localStorage.setItem('steem_wysiwyg_spacing', String(preset.id));
                              }}
                              className={cn(
                                "py-1.5 px-1 rounded-lg text-[10px] font-semibold uppercase transition-all text-center truncate",
                                wysiwygSpacing === preset.id 
                                  ? "bg-cyan-600 text-white shadow" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">0px</span>
                          <input
                            type="range"
                            min="0"
                            max="40"
                            value={wysiwygSpacing}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setWysiwygSpacing(val);
                              localStorage.setItem('steem_wysiwyg_spacing', String(val));
                            }}
                            className="flex-1 accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">40px</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'gallery' && (
                  <section className="space-y-6">
                    <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('gallerySettings') || "Gallery"}</label>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <span className="text-[10px] font-bold text-slate-400 block">{t('imageFormat')}</span>
                           <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg">
                              <button onClick={() => setImageInsertFormat('html')} className={cn("px-2 py-1 text-[9px] rounded", imageInsertFormat === 'html' ? "bg-cyan-600 text-white" : "text-slate-500")}>HTML</button>
                              <button onClick={() => setImageInsertFormat('markdown')} className={cn("px-2 py-1 text-[9px] rounded", imageInsertFormat === 'markdown' ? "bg-cyan-600 text-white" : "text-slate-500")}>MD</button>
                           </div>
                         </div>

                         <div className="space-y-2">
                           <span className="text-[10px] font-bold text-slate-400 block">{t('trafficOptimization')}</span>
                           <button 
                             onClick={() => setIsTrafficOptimized(!isTrafficOptimized)}
                             className={cn(
                               "w-full py-1 text-[9px] rounded font-bold border transition-all",
                               isTrafficOptimized ? "border-cyan-500 text-cyan-400 bg-cyan-400/5" : "border-slate-800 text-slate-600"
                             )}
                           >
                             {isTrafficOptimized ? "ON" : "OFF"}
                           </button>
                         </div>
                      </div>

                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('pexelsAttribution')}</span>
                           <button 
                            onClick={() => setPexelsSettings((prev: any) => ({ ...prev, withAttribution: !prev.withAttribution }))}
                            className={cn("w-8 h-4 rounded-full relative transition-all", pexelsSettings.withAttribution ? "bg-cyan-600" : "bg-slate-700")}
                           >
                              <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", pexelsSettings.withAttribution ? "left-4.5" : "left-0.5")} />
                           </button>
                         </div>
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('pexelsLink')}</span>
                           <button 
                            onClick={() => setPexelsSettings((prev: any) => ({ ...prev, linkEmbedded: !prev.linkEmbedded }))}
                            className={cn("w-8 h-4 rounded-full relative transition-all", pexelsSettings.linkEmbedded ? "bg-cyan-600" : "bg-slate-700")}
                           >
                              <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", pexelsSettings.linkEmbedded ? "left-4.5" : "left-0.5")} />
                           </button>
                         </div>
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'vault' && (
                  <section className="space-y-6">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400">
                           <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{t('vaultSecurity')}</h4>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">
                            {isUnlocked ? t('sessionActive') : t('vaultClosed')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={async () => {
                            if (isUnlocked) SecurityService.lock();
                            else {
                               const pin = await promptDialog(t('enterPin'));
                               if (pin) {
                                 try {
                                   await SecurityService.unlock(pin);
                                   initVault();
                                 } catch {
                                   notify(t('error'), 'error');
                                 }
                               }
                            }
                          }}
                          className={cn(
                            "py-2 rounded-lg font-bold text-xs transition-all border",
                            isUnlocked ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-green-500/10 border-green-500/30 text-green-500"
                          )}
                        >
                           {isUnlocked ? t('lock') : t('unlock')}
                        </button>
                        <button 
                          onClick={async () => {
                            if (await confirmDialog(t('confirmResetVault'))) {
                               await SecurityService.clearAll();
                               initVault();
                               notify(t('saveSuccess'));
                            }
                          }}
                          className="py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg font-bold text-xs hover:bg-slate-700"
                        >
                           {t('confirmResetVault') || "Reset"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('accounts') || "Accounts"}</label>
                      <div className="space-y-2">
                        {vaultAccounts.map(acc => (
                          <div key={acc} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                            <span className="font-bold text-cyan-400">@{acc}</span>
                            <button 
                              onClick={async () => {
                                if (await confirmDialog(t('confirmDeleteAccount').replace('{acc}', acc))) {
                                   await SecurityService.deleteAccount(acc);
                                   initVault();
                                }
                              }}
                              className="p-1.5 text-slate-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'keys' && (
                  <section className="space-y-6">
                    <div className="space-y-4">
                       <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('pexelsKey')}</label>
                          <div className="relative">
                            <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                            <input 
                              type="password"
                              value={pexelsApiKey || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setPexelsApiKey(val);
                                if (!isUnlocked) {
                                   localStorage.setItem('steem_pexels_key_raw', val);
                                } else {
                                   await SecurityService.savePexelsKey(val);
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                              placeholder="Pexels API Key"
                            />
                          </div>
                          <p className="text-[9px] text-slate-600 leading-tight">
                            {isUnlocked ? "Stored securely in vault" : "Stored unencrypted in local storage"}
                          </p>
                       </div>

                       <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Pixabay</label>
                            <input 
                              type="password"
                              value={pixabayApiKey || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPixabayApiKey(val);
                                SecurityService.saveApiKey('pixabay', val);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Unsplash</label>
                            <input 
                              type="password"
                              value={unsplashAccessKey || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setUnsplashAccessKey(val);
                                SecurityService.saveApiKey('unsplashAccess', val);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                       </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'about' && (
                  <section className="space-y-6">
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
                       <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl mx-auto flex items-center justify-center text-cyan-400 font-black text-2xl shadow-xl shadow-cyan-500/10">S</div>
                       <div>
                         <h3 className="text-xl font-black tracking-tight">SteemEditor <span className="text-cyan-400">Pro</span></h3>
                         <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] pt-1">Version 3.9.9 "Quantum"</p>
                       </div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 pt-4 block border-t border-slate-800">Changelog & Updates</label>
                        <div className="mt-2 p-3 bg-slate-950 border border-cyan-500/20 rounded-xl text-left">
                          <p className="text-xs text-slate-300 font-medium">New in v3.9.9: Gallery Minimization & Expanded Editor Layout</p>
                        </div>
                       
                       <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-xl p-3">
                         {APP_CHANGELOG.map((log, index) => (
                           <div key={log.version} className={cn("space-y-1", index > 0 && "pt-2 border-t border-slate-800/50")}>
                             <div className="flex items-center gap-2">
                               <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", index === 0 ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 bg-slate-800")}>{log.version}</span>
                               <span className="text-[9px] text-slate-500">{log.date}</span>
                             </div>
                             <ul className={cn("text-xs list-inside list-disc pl-1 leading-snug", index === 0 ? "text-slate-300 space-y-1.5" : "text-slate-400 space-y-1")}>
                               {log.changes.map((change, i) => (
                                 <li key={i}>{change}</li>
                                ))}
                             </ul>
                           </div>
                         ))}
                       </div>
                       
                       <div className="flex justify-end pt-1">
                         <button 
                           onClick={() => {
                             navigator.clipboard.writeText(getChangelogText());
                             const btn = document.getElementById('copy-changelog-btn');
                             if (btn) {
                               const orig = btn.innerText;
                               btn.innerText = "COPIED!";
                               setTimeout(() => btn.innerText = orig, 2000);
                             }
                           }}
                           id="copy-changelog-btn"
                           className="text-[9px] font-bold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest px-2 py-1 bg-slate-800/50 rounded flex gap-1 items-center"
                         >
                           <Copy size={10} /> COPY LOG
                         </button>
                       </div>
                    </div>

                    <div className="space-y-4 pt-2 text-left">
                       <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Пакетний Аудит (NPM Packages)</label>
                          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                             {[
                               { n: 'react', v: '19.0', d: 'Ядро інтерфейсу, реактивність та керування станом компонентів.' },
                               { n: 'dsteem', v: '0.11', d: 'Повноцінна клієнтська інтеграція з блокчейном Steem (транзакції, підписи, апвоути).' },
                               { n: 'motion', v: '12.0', d: 'Професійні та плавні анімації інтерфейсу для відмінного UX.' },
                               { n: 'marked', v: '18.0', d: 'Швидкісний і безпечний парсер Markdown розмітки в чистий HTML.' },
                               { n: 'dompurify', v: '3.4', d: 'Надійне очищення HTML від XSS-загроз при читанні стрічки дописів.' },
                               { n: 'lucide-react', v: '0.47', d: 'Набір сучасних та лаконічних векторних іконок для UI.' },
                               { n: 'buffer', v: '6.0', d: 'Поліфіл буфера для криптографічних підписів у браузерному оточенні.' },
                               { n: 'jszip', v: '3.10', d: 'Створення та архівація чернеток у Markdown ZIP-пакети для бекапу.' },
                               { n: 'idb-keyval', v: '6.2', d: 'Надшвидке сховище автозбереження чернеток в IndexedDB браузера.' },
                               { n: 'idiomorph', v: '0.3', d: 'Інтелектуальне зіставлення (morphing) DOM для безшовної синхронізації без втрати фокусу й курсору.' },
                               { n: 'zustand', v: '5.0', d: 'Легковажне керування глобальним станом застосунку.' }
                             ].map(pkg => (
                               <div key={pkg.n} className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl flex flex-col gap-1 hover:border-slate-700/50 transition-all">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[11px] font-black text-cyan-400 font-mono leading-none">{pkg.n}</span>
                                     <span className="text-[9px] text-slate-500 font-mono font-bold">v.{pkg.v} (STABLE)</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-normal">{pkg.d}</p>
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="pt-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Зовнішні Бібліотеки (CDN / Core)</label>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                             {[
                               { n: 'Lucide Icons', d: 'Сучасні векторні піктограми високої чіткості.' },
                               { n: 'Motion Physics', d: 'Фізично-базована модель декларативних анімацій.' },
                               { n: 'Tailwind CSS v4', d: 'Утилітарний CSS-фреймворк для стилізації інтерфейсу.' },
                               { n: 'DSteem Ledger API', d: 'Низькорівневе з\'єднання з децентралізованою мережею Steem.' },
                               { n: 'Marked Compiler', d: 'Надшвидкий синтаксичний компілятор розмітки тексту.' }
                             ].map(lib => (
                               <div key={lib.n} className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl flex flex-col gap-1">
                                  <span className="text-[11px] font-black text-slate-300 uppercase leading-none">{lib.n}</span>
                                  <p className="text-[10px] text-slate-500 leading-snug">{lib.d}</p>
                                </div>
                             ))}
                          </div>
                       </div>

                       <p className="text-[9px] text-slate-600 italic px-2 text-center pt-2">Усі активи та залежності верифіковані в межах безпечного релізу Steem Editor Pro.</p>
                    </div>

                    <section className="space-y-4 border-t border-slate-800 pt-6">
                      <button 
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <ChevronDown className={cn("text-slate-500 transition-transform", showAdvancedSettings && "rotate-180")} size={20} />
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          <Terminal size={20} className="text-cyan-400" /> {t('advanced')}
                        </h3>
                      </button>

                      <AnimatePresence>
                        {showAdvancedSettings && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800 overflow-hidden"
                          >
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">{t('appAgent')}</label>
                              <input 
                                type="text" 
                                value={appAgent}
                                onChange={e => {
                                  setAppAgent(e.target.value);
                                  localStorage.setItem('steem_app_agent', e.target.value);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500"
                                placeholder="steemeditor/1.0"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>
                  </section>
                )}

                {settingsTab === 'pwa' && (
                  <section className="space-y-6">
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-cyan-500/20">S</div>
                      <div>
                        <h3 className="text-xl font-black tracking-tight">{lang === 'uk' ? 'Підтримка PWA' : 'PWA Support'}</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] pt-1">{t('pwaPlatformSupport')}</p>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed text-left bg-slate-950 p-4 rounded-xl border border-slate-800/60">
                        {t('pwaInstallDesc')}
                      </p>

                      <div className="pt-2">
                        {isPwaInstalled ? (
                          <div className="py-3 px-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 font-bold text-xs flex items-center justify-center gap-2">
                            <CheckCircle size={16} />
                            {t('pwaAlreadyInstalled')}
                          </div>
                        ) : (
                          <button
                            onClick={handleInstallPwa}
                            disabled={!isPwaInstallable}
                            className={cn(
                              "w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg",
                              isPwaInstallable
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-95"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                            )}
                          >
                            <Download size={16} />
                            {t('installApp')}
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </div>
          </motion.div>
        </div>
      )}
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

      {/* Mobile Bottom Navigation */}
        <nav 
          className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 grid grid-cols-5 items-center px-1 z-[70] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-150"
          style={{ bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : 0 }}
        >
          <button 
            onClick={() => setActiveMobileTab('editor')}
            className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", activeMobileTab === 'editor' ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
          >
            <Edit3 size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{t('text')}</span>
          </button>
          <button 
            onClick={() => setActiveMobileTab('preview')}
            className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", activeMobileTab === 'preview' ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
          >
            <Eye size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{t('preview')}</span>
          </button>
          
          <div className="relative flex justify-center items-center">
            <button 
              onClick={() => {
                if (!pubTitle) {
                  const firstLine = useEditorStore.getState().content.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 100);
                  setPubTitle(firstLine);
                }
                setActiveModal('publish');
              }}
              className="w-14 h-14 bg-cyan-600 text-white rounded-full shadow-lg shadow-cyan-900/40 active:scale-95 transition-all flex items-center justify-center border-4 border-slate-900 -mt-10 hover:bg-cyan-500"
            >
              <Rocket size={24} />
            </button>
          </div>

          <button 
            onClick={() => {
              setActiveMobileTab('editor');
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", isSidebarOpen ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
          >
            <ImageIcon size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{t('gallery')}</span>
          </button>
          <button 
            onClick={() => {
              setSettingsTab('general');
              setActiveModal('settings');
            }}
            className={cn("flex flex-col items-center justify-center gap-1 h-full transition-all", activeModal === 'settings' ? "text-cyan-400 bg-cyan-400/5 shadow-[inset_0_2px_0_theme(colors.cyan.400)] neon-tab-glow" : "text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100")}
          >
            <Settings size={18} className={cn(visualStyle === 'neon' && "neon-icon-glow")} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{t('settings')}</span>
          </button>
        </nav>

        <style dangerouslySetInnerHTML={{ __html: `
        .toolbar-btn {
          width: var(--toolbar-btn-size, 3rem) !important;
          height: var(--toolbar-btn-size, 3rem) !important;
          font-size: var(--toolbar-btn-font-size, 1rem) !important;
        }
        .toolbar-btn svg {
          width: var(--toolbar-icon-size, 1.25rem) !important;
          height: var(--toolbar-icon-size, 1.25rem) !important;
        }
        
        .wysiwyg-editor p,
        .wysiwyg-editor ul,
        .wysiwyg-editor ol,
        .wysiwyg-editor h1,
        .wysiwyg-editor h2,
        .wysiwyg-editor h3,
        .wysiwyg-editor h4,
        .wysiwyg-editor h5,
        .wysiwyg-editor h6,
        .wysiwyg-editor blockquote,
        .wysiwyg-editor pre {
          margin-top: var(--wysiwyg-spacing, 18px) !important;
          margin-bottom: var(--wysiwyg-spacing, 18px) !important;
        }
        .wysiwyg-editor table,
        .wysiwyg-editor img {
          margin-top: var(--wysiwyg-spacing, 18px) !important;
          margin-bottom: var(--wysiwyg-spacing, 18px) !important;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        
        .prose img {
          border-radius: 0.75rem;
          margin: 1.5rem 0;
        }
        .wysiwyg-editor table {
          border-collapse: collapse;
          width: 100%;
          margin: 1.5rem 0;
          border: 1px dashed rgba(255, 255, 255, 0.15);
        }
        .wysiwyg-editor th, .wysiwyg-editor td {
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 10px 12px !important;
          min-width: 90px;
          height: 42px !important; /* height on table-cells serves as minimum height */
          position: relative;
        }
        .wysiwyg-editor th {
          background-color: rgba(255, 255, 255, 0.07);
          font-weight: 700;
          text-align: left;
          color: #22d3ee !important; /* cyan-400 */
        }
        /* Empty cells helper */
        .wysiwyg-editor th:empty::before, .wysiwyg-editor td:empty::before {
          useEditorStore.getState().content: "✎...";
          color: rgba(6, 182, 212, 0.45);
          font-size: 0.75rem;
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          font-style: italic;
        }
        .wysiwyg-editor th:focus, .wysiwyg-editor td:focus {
          outline: 2px solid #06b6d4 !important;
          outline-offset: -2px;
          background-color: rgba(6, 182, 212, 0.08) !important;
        }
        .pull-left {
          float: left;
          margin-right: 1.5rem;
          margin-bottom: 1rem;
          max-width: 45%;
        }
        .pull-right {
          float: right;
          margin-left: 1.5rem;
          margin-bottom: 1rem;
          max-width: 45%;
        }
        .text-center {
          text-align: center;
        }
        .text-justify {
          text-align: justify;
        }
        .clearfix::after {
          useEditorStore.getState().content: "";
          clear: both;
          display: table;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        multiple 
        onChange={handleFileUpload} 
      />
      {/* Account Prompt Overlay */}
      <AnimatePresence>
        {showAccountPrompt && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl shadow-none max-w-sm w-full p-6 sm:p-8 text-center max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-none">
                <AtSign size={32} className="text-white sm:size-[40px]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('welcomeTitle')}</h1>
              <p className="text-slate-400 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">
                {t('welcomeDesc')}
              </p>
              
              <div className="space-y-4 text-left">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">{t('usernameNoAt')}</label>
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                    placeholder="softpedia"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-bold placeholder:text-slate-700 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && setShowAccountPrompt(false)}
                  />
                </div>
                
                <button 
                  onClick={() => setShowAccountPrompt(false)}
                  className="w-full py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition-all active:scale-95 text-sm sm:text-base"
                >
                  {t('saveAndStart')}
                </button>
                <button 
                  onClick={() => setShowAccountPrompt(false)}
                  className="w-full text-[10px] sm:text-xs text-slate-500 hover:text-slate-300 font-medium py-2"
                >
                  {t('skipForNow')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications Popup */}
      <AnimatePresence>
        {showNotificationPopup && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50, x: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50, x: 50 }}
            className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-[200] max-w-sm w-auto sm:w-full bg-slate-900 border-2 border-lime-500 rounded-3xl shadow-[0_10px_50px_rgba(163,230,53,0.3)] p-5 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2">
              <button onClick={() => setShowNotificationPopup(null)} className="p-1.5 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-lime-500 text-black rounded-2xl shadow-[0_0_20px_rgba(163,230,53,0.6)]">
                <Bell size={22} className="animate-swing" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-lime-400 uppercase tracking-widest mb-1">Нова відповідь</p>
                <p className="text-sm font-bold text-white mb-1">@{showNotificationPopup.author}</p>
                <div 
                  className="text-xs text-slate-400 line-clamp-2 italic mb-4 bg-slate-950/50 p-2 rounded-xl border border-white/5"
                  dangerouslySetInnerHTML={{ __html: showNotificationPopup.body.substring(0, 100) }}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setActiveView('reader');
                      setShowNotificationPopup(null);
                      setNotifications(prev => prev.map(n => n.id === showNotificationPopup.id ? { ...n, isRead: true } : n));
                      setTargetReaderPost({ 
                        author: showNotificationPopup.parent_author || showNotificationPopup.author, 
                        permlink: showNotificationPopup.parent_permlink || showNotificationPopup.permlink,
                        commentAuthor: showNotificationPopup.author,
                        commentPermlink: showNotificationPopup.permlink
                      });
                    }}
                    className="flex-1 py-2.5 bg-lime-500 text-black text-xs font-black rounded-xl hover:bg-lime-400 transition-all active:scale-95 shadow-lg shadow-lime-900/20"
                  >
                    ПЕРЕГЛЯНУТИ
                  </button>
                  <button 
                    onClick={() => setShowNotificationPopup(null)}
                    className="px-4 py-2.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    ЗАКРИТИ
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Table Selector */}
      <AnimatePresence>
        {showTableSelector && tableSelectorPos && (
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowTableSelector(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: tableSelectorPos.direction === 'down' ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute bg-slate-900 border border-slate-700 shadow-2xl p-4 rounded-3xl"
              style={{
                left: tableSelectorPos.x,
                top: tableSelectorPos.direction === 'down' ? tableSelectorPos.y : undefined,
                bottom: tableSelectorPos.direction === 'up' ? tableSelectorPos.y : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insert Table</h3>
              </div>
              
              <div className="flex flex-col gap-2 mb-4 border-b border-slate-800 pb-3">
                <div className="flex justify-center gap-2 mb-2">
                  <button 
                    onClick={(e) => { e.preventDefault(); setTableImportFormat('markdown'); }}
                    className={cn("px-3 py-1 rounded text-xs font-bold transition-all", tableImportFormat === 'markdown' ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200")}
                  >Markdown</button>
                  <button 
                    onClick={(e) => { e.preventDefault(); setTableImportFormat('html'); }}
                    className={cn("px-3 py-1 rounded text-xs font-bold transition-all", tableImportFormat === 'html' ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200")}
                  >HTML</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      insertAtCursor(tableImportFormat === 'markdown' ? '| Head |\n| --- |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n  </tr>\n</table>\n');
                      setShowTableSelector(false);
                    }}
                    className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] rounded border border-purple-500/30 flex items-center justify-center transition-colors font-medium"
                  >
                     1 Col Separator
                  </button>
                  <button 
                    onClick={() => {
                      insertAtCursor(tableImportFormat === 'markdown' ? '| Head | Head |\n| --- | --- |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n    <th>Head</th>\n  </tr>\n</table>\n');
                      setShowTableSelector(false);
                    }}
                    className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] rounded border border-purple-500/30 flex items-center justify-center transition-colors font-medium"
                  >
                     2 Col Header
                  </button>
                  <button 
                    onClick={() => {
                      insertAtCursor(tableImportFormat === 'markdown' ? '| Head | Head |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n    <th>Head</th>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n</table>\n');
                      setShowTableSelector(false);
                    }}
                    className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] rounded border border-cyan-500/30 flex items-center justify-center transition-colors font-medium"
                  >
                     2x2 Table
                  </button>
                  <button 
                    onClick={() => {
                      insertAtCursor(tableImportFormat === 'markdown' ? '| Head | Head | Head |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n' : '<table data-format="html" style="width:100%">\n  <tr>\n    <th>Head</th>\n    <th>Head</th>\n    <th>Head</th>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n  <tr>\n    <td>Cell</td>\n    <td>Cell</td>\n    <td>Cell</td>\n  </tr>\n</table>\n');
                      setShowTableSelector(false);
                    }}
                    className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] rounded border border-cyan-500/30 flex items-center justify-center transition-colors font-medium"
                  >
                     3x3 Table
                  </button>
                </div>
              </div>

              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Or draw standard matrix</div>
              <div className="flex flex-col gap-1 items-center">
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {Array.from({ length: 10 }).map((_, colIndex) => {
                      const isHovered = rowIndex <= tableHover.r && colIndex <= tableHover.c;
                      return (
                        <div
                          key={colIndex}
                          onMouseEnter={() => setTableHover({ r: rowIndex, c: colIndex })}
                          onClick={() => {
                            const r = rowIndex; // 0 for header-only
                            const c = colIndex + 1;
                            let table = '| ' + Array.from({ length: c }).map(() => 'Head').join(' | ') + ' |\n';
                            table += '| ' + Array.from({ length: c }).map(() => '---').join(' | ') + ' |\n';
                            for (let i = 0; i < r; i++) {
                              table += '| ' + Array.from({ length: c }).map(() => 'Cell').join(' | ') + ' |\n';
                            }
                            insertAtCursor(table + '\n');
                            setShowTableSelector(false);
                          }}
                          className={cn(
                            "w-4 h-4 border border-slate-700 rounded-[2px] cursor-pointer transition-all",
                            isHovered 
                              ? (rowIndex === 0 ? "bg-purple-500/60 border-purple-400" : "bg-cyan-500/50 border-cyan-400") 
                              : (rowIndex === 0 ? "bg-slate-800/80 border-slate-600 border-b-2 shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10" : "bg-slate-800 hover:border-slate-500")
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              
              <div className="mt-3 text-center text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 py-1 rounded flex items-center justify-center gap-2">
                {tableHover.r === 0 ? (
                  <><span className="text-purple-400">{tableHover.c + 1} Cols</span> <span className="text-purple-400/70">(Header / Separator)</span></>
                ) : (
                  <><span className="text-cyan-400">{tableHover.c + 1} Cols</span> <span className="opacity-50">x</span> <span className="text-cyan-400">{tableHover.r + 1} Rows</span></>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
                <input 
                  type="number" min="0" max="50" 
                  title="Rows"
                  defaultValue="3"
                  id="customTableRowInput"
                  className="w-16 bg-slate-800 text-white text-[10px] p-1.5 rounded outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700" 
                />
                <span className="text-slate-500 self-center text-xs">x</span>
                <input 
                  type="number" min="1" max="50"
                  title="Cols" 
                  defaultValue="3"
                  id="customTableColInput"
                  className="w-16 bg-slate-800 text-white text-[10px] p-1.5 rounded outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-700" 
                />
                <button 
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1"
                  onClick={() => {
                    const r = parseInt((document.getElementById('customTableRowInput') as HTMLInputElement)?.value || '3', 10);
                    const c = parseInt((document.getElementById('customTableColInput') as HTMLInputElement)?.value || '3', 10);
                    let table = '| ' + Array.from({ length: c }).map(() => 'Head').join(' | ') + ' |\n';
                    table += '| ' + Array.from({ length: c }).map(() => '---').join(' | ') + ' |\n';
                    for (let i = 0; i < r; i++) {
                      table += '| ' + Array.from({ length: c }).map(() => 'Cell').join(' | ') + ' |\n';
                    }
                    insertAtCursor(table + '\n');
                    setShowTableSelector(false);
                  }}
                >
                  <Plus size={10} /> Add
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SystemDialog */}
      <AnimatePresence>
        {systemDialog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-none w-full sm:max-w-md border border-slate-200 dark:border-slate-700 mx-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="p-4 sm:p-6 text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">{systemDialog.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{systemDialog.message}</p>
                
                {systemDialog.type === 'prompt' && (
                  <input
                    autoFocus
                    type="text"
                    defaultValue={systemDialog.defaultValue}
                    placeholder={systemDialog.placeholder}
                    className="w-full px-4 py-2 mb-6 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        systemDialog.resolve((e.target as HTMLInputElement).value);
                        setSystemDialog(null);
                      }
                      if (e.key === 'Escape') {
                        systemDialog.resolve(null);
                        setSystemDialog(null);
                      }
                    }}
                    id="system-dialog-input"
                  />
                )}
                
                <div className="flex justify-center sm:justify-end gap-3 font-bold">
                  {systemDialog.type !== 'alert' && (
                    <button 
                      onClick={() => {
                        systemDialog.resolve(null);
                        setSystemDialog(null);
                      }}
                      className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-xs"
                    >
                      {t('cancel') || 'Скасувати'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (systemDialog.type === 'prompt') {
                        const val = (document.getElementById('system-dialog-input') as HTMLInputElement)?.value;
                        systemDialog.resolve(val);
                      } else {
                        systemDialog.resolve(true);
                      }
                      setSystemDialog(null);
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30 text-xs sm:text-sm active:scale-95"
                  >
                    {systemDialog.type === 'alert' ? 'OK' : (t('confirm') || 'OK')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
