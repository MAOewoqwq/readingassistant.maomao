import { lookupWord, preloadDictionary } from './dictionaryService.js';
import {
  loadSession,
  saveSession,
  saveLastArticle,
  loadLastArticle,
  saveAssistantLabel,
  loadAssistantLabel,
  saveAppLabel,
  loadAppLabel,
  saveConversationReport,
  loadConversationReport,
  saveLanguagePreference,
  loadLanguagePreference,
  loadSavedWordLog,
  saveSavedWordLog,
  clearSavedWordLog,
  loadConversationLog,
  saveConversationLog,
  listSavedLogArticleIds,
} from './storage.js';
import {
  fetchCurrentUser,
  fetchCloudArticleLog,
  fetchCloudBootstrap,
  loginWithPassword,
  logoutSession,
  registerWithPassword,
  saveCloudArticleLog,
} from './cloudService.js';

const DEFAULT_ASSISTANT_CONFIG = {
  model: 'deepseek-chat',
  proxyUrl: '/api/assistant',
};
const DEFAULT_ASSISTANT_STATUS = '';
const DEFAULT_APP_LABEL = '多语阅读助手';
const DEFAULT_ASSISTANT_LABEL = 'AI 阅读助手';
const DRAWER_SIZE_DEFAULT = 100;
const DRAWER_SIZE_MIN = 80;
const DRAWER_SIZE_MAX = 200;
const ARCHIVE_TITLE_MAX_CHARS = 12;
const TRANSLATE_ENDPOINT = '/api/translate';
const YOUDAO_ENDPOINT = '/api/youdao';
const JA_READING_ENDPOINT = '/api/ja-reading';
const JA_PHRASE_ENDPOINT = '/api/ja-phrase';
const SELECTION_ENDPOINT = '/api/selection';
const JA_TTS_SEGMENT_MAX_CHARS = 30;
const CLOUD_SYNC_DEBOUNCE_MS = 800;
const REFLECTION_SAVE_DEBOUNCE_MS = 500;
const WELCOME_FADE_OUT_MS = 180;
const WELCOME_SEEN_STORAGE_ID = 'reader-welcome-seen-v1';
const ONBOARDING_SEEN_STORAGE_ID = 'reader-onboarding-seen-v1';
const ASSISTANT_SYSTEM_PROMPT = 'You are a concise multilingual reading assistant. By default, reply in the same language as the user\'s latest message. If the user explicitly asks for a different response language, follow that instruction. Keep the main direction of your answers aligned with the provided reading context and the current user message. If the user asks what a concept in the article means, explain it clearly and accurately based on the reading content. If the user asks a conceptual question unrelated to the reading content, still answer it accurately and concisely. Output plain text only: do not use markdown, do not use any asterisks (*), and do not output garbled text or mojibake symbols. Use clean natural UTF-8 characters only. When the user indicates they finished reading, start a Feynman-style loop: ask for a key-point summary, request an example or analogy, point out gaps or misunderstandings, then provide 1-2 self-test questions and a brief recap.';
const LANGUAGE_LABELS = {
  en: '英语',
  zh: '中文',
  ja: '日语',
};

const I18N_TRANSLATIONS = {
  zh: {
    appTitle: '多语阅读助手',
    articlePlaceholder: '请先上传或粘贴英文 / 中文 / 日文文本，点击词语即可查看对应阅读语言的释义。',
    readingLanguage: '阅读语言',
    displayLanguage: '显示语言',
    english: '英语',
    chinese: '中文',
    japanese: '日语',
    bookTest: '书籍测试',
    clearMarks: '清除标记',
    clearCache: '清除缓存',
    loadText: '载入文本',
    textInputPlaceholder: '在此粘贴英文、中文或日文文章...',
    inputHint: '支持英文 / 中文 / 日文的纯文本文件或直接粘贴内容，系统会保留原有标点。',
    wordCollection: '生词集合',
    saveWords: '保存',
    savedLogNav: '生词日志',
    filterByDate: '按日期筛选',
    allDates: '全部日期',
    viewSavedLog: '查看日志',
    hideSavedLog: '隐藏日志',
    savedLogTitle: '已保存日志',
    savedWordsTab: '单词',
    allLanguagesTab: '全部',
    baseFormLabel: '原型',
    savedConversationsTab: '聊天记录',
    clearSavedLog: '清空全部',
    delete: '删除',
    noSavedWordsYet: '暂无已保存生词，点击保存后可再次查看',
    noSavedConversationsYet: '暂无聊天存档，点击存档后可再次查看',
    archiveSourceAI: 'AI结构化',
    archiveSourceLocal: '本地兜底',
    archiveDefaultTitle: '阅读随记',
    archiveDetailTitle: '聊天存档详情',
    archiveDetailSummary: '想法与回复总结',
    archiveDetailEvaluation: '中性客观评价',
    archiveDetailMessages: '完整聊天记录',
    archiveDetailReflection: '回顾感想',
    archiveDetailReflectionPlaceholder: '看完聊天记录后，写下你的回顾、收获或下一步计划...',
    archiveDetailReflectionConfirm: '确认并显示到右侧',
    archiveDetailReflectionPreviewTitle: '已确认感想',
    archiveDetailReflectionPreviewEmpty: '确认后会显示在这里。',
    archiveEmptyMessages: '暂无聊天内容。',
    archiveTurnsUnit: '轮',
    archiveRoleUser: '用户',
    archiveRoleAssistant: '助手',
    exportCsvExcel: '导出 CSV / Excel',
    downloadExcel: '下载 Excel (.xlsx)',
    downloadCsv: '下载 CSV (.csv)',
    noWordsYet: '尚未收集生词，点击文章中的单词后会自动记录。',
    aiAssistant: 'AI 阅读助手',
    aiReadingAssistant: 'AI 读书助手',
    chatPlaceholder: '对话内容会出现在这里。用自己的话复述、提问或让助手给出自测题。',
    clearChat: '清除对话',
    exportReport: '存档',
    popupSize: '弹窗大小',
    reportRemoved: '已移除本篇的对话报告。',
    capturedContext: '已捕获当前{lang}片段（长度 {len} 字），可直接与助手对话。',
    marksCleared: '已清除本篇文章的生词标记。',
    reportLoaded: '已载入本篇对话报告，可直接存档。',
    aiInputPlaceholder: '用自己的话复述，或向助手提问（Enter 发送，Shift+Enter 换行）',
    send: '发送',
    renameAssistant: '重命名助手',
    assistantName: '助手名称',
    assistantNamePlaceholder: '例如：阅读搭子',
    cancel: '取消',
    saveName: '保存名称',
    yourPersonality: '你的性格',
    personalityPlaceholder: '如：内向、喜欢安静思考',
    interests: '兴趣爱好',
    interestsPlaceholder: '如：科幻、商业、心理学',
    languageLevel: '语言等级',
    recentTopics: '近期关注的话题',
    topicsPlaceholder: '如：AI、可持续、创业',
    generateRecommendations: '生成推荐',
    cloudLogin: '注册 / 登录',
    cloudLogout: '退出',
    cloudGuest: '未登录',
    cloudSyncing: '云端同步中...',
    cloudSynced: '云端已同步',
    authModalTitle: '注册 / 登录',
    authModeLogin: '登录',
    authModeRegister: '注册',
    authUsername: '用户名',
    authUsernamePlaceholder: '请输入用户名',
    authPassword: '密码',
    authPasswordPlaceholder: '请输入密码（至少6位）',
    authSubmitLogin: '登录',
    authSubmitRegister: '注册',
    authHintLogin: '输入用户名和密码后登录。',
    authHintRegister: '创建一个用户名和密码即可注册。',
    cloudLoginSuccess: '登录成功，已完成云端同步。',
    cloudLoginFailed: '登录失败：{message}',
    cloudLogoutSuccess: '已退出登录，当前继续使用本地数据。',
    cloudLogoutFailed: '退出登录失败，请稍后重试。',
    restoreCachedConfirm: '检测到上次缓存的文本，是否恢复？',
    restoreCachedLoaded: '已从缓存恢复上次阅读文本。',
    restoreCachedSkipped: '已跳过恢复上次文本。',
    welcomeLine1: '欢迎来到多语阅读助手。',
    welcomeLine2: '让每一天的语言学习都有迹可循。',
    welcomeLine3: '让每一篇阅读都被温柔存档，最终沉淀成你脑海里的光。',
    welcomeTapHint: '点击继续',
    welcomeEnteringHint: '正在进入学习空间...',
    welcomeDoNotShowAgain: '不再显示',
    onboardingStepCounter: '步骤 {current} / {total}',
    onboardingSkip: '跳过',
    onboardingNext: '下一步',
    onboardingDone: '完成',
    onboardingLanguageTitle: '先选阅读语言',
    onboardingLanguageDesc: '这里决定你点词后默认显示哪种语言释义。',
    onboardingInputTitle: '把文本贴到这里',
    onboardingInputDesc: '粘贴文章后点击“载入文本”，系统会自动分词。',
    onboardingWordsTitle: '这里收集生词',
    onboardingWordsDesc: '点击文章中的词，这里会自动记录并可保存。',
    onboardingAssistantTitle: '这是 AI 助手入口',
    onboardingAssistantDesc: '点击右下角按钮，随时提问、复述和存档聊天。',
  },
  en: {
    appTitle: 'Multilingual Reading Assistant',
    articlePlaceholder: 'Please paste English / Chinese / Japanese text first. Click on words to see definitions.',
    readingLanguage: 'Reading Language',
    displayLanguage: 'Display Language',
    english: 'English',
    chinese: 'Chinese',
    japanese: 'Japanese',
    bookTest: 'Book Test',
    clearMarks: 'Clear Marks',
    clearCache: 'Clear Cache',
    loadText: 'Load Text',
    textInputPlaceholder: 'Paste English, Chinese or Japanese text here...',
    inputHint: 'Supports plain text files in English / Chinese / Japanese, or paste content directly.',
    wordCollection: 'Word Collection',
    saveWords: 'Save',
    savedLogNav: 'Word Log',
    filterByDate: 'Filter by Date',
    allDates: 'All Dates',
    viewSavedLog: 'View Log',
    hideSavedLog: 'Hide Log',
    savedLogTitle: 'Saved Log',
    savedWordsTab: 'Words',
    allLanguagesTab: 'All',
    baseFormLabel: 'Base Form',
    savedConversationsTab: 'Chats',
    clearSavedLog: 'Clear All',
    delete: 'Delete',
    noSavedWordsYet: 'No saved words yet. Click "Save" to store current words.',
    noSavedConversationsYet: 'No chat archives yet. Click "Archive" to store conversations.',
    archiveSourceAI: 'AI structured',
    archiveSourceLocal: 'Local fallback',
    archiveDefaultTitle: 'Reading Note',
    archiveDetailTitle: 'Chat Archive Detail',
    archiveDetailSummary: 'Summary of thoughts and replies',
    archiveDetailEvaluation: 'Neutral evaluation',
    archiveDetailMessages: 'Full chat messages',
    archiveDetailReflection: 'Reflection',
    archiveDetailReflectionPlaceholder: 'After reviewing the chat, write your thoughts, takeaways, or next steps...',
    archiveDetailReflectionConfirm: 'Confirm and show on right',
    archiveDetailReflectionPreviewTitle: 'Confirmed reflection',
    archiveDetailReflectionPreviewEmpty: 'Your confirmed reflection will appear here.',
    archiveEmptyMessages: 'No chat content.',
    archiveTurnsUnit: 'turns',
    archiveRoleUser: 'User',
    archiveRoleAssistant: 'Assistant',
    exportCsvExcel: 'Export CSV / Excel',
    downloadExcel: 'Download Excel (.xlsx)',
    downloadCsv: 'Download CSV (.csv)',
    noWordsYet: 'No words collected yet. Click on words in the article to record them.',
    aiAssistant: 'AI Reading Assistant',
    aiReadingAssistant: 'AI Reading Assistant',
    chatPlaceholder: 'Conversation will appear here. Summarize, ask questions, or request self-test questions.',
    clearChat: 'Clear Chat',
    exportReport: 'Archive',
    popupSize: 'Popup Size',
    reportRemoved: 'Report for this article has been removed.',
    capturedContext: 'Captured {lang} content ({len} chars). You can now chat with the assistant.',
    marksCleared: 'Word marks for this article have been cleared.',
    reportLoaded: 'Report loaded. Ready to archive.',
    aiInputPlaceholder: 'Summarize in your own words, or ask the assistant (Enter to send, Shift+Enter for new line)',
    send: 'Send',
    renameAssistant: 'Rename Assistant',
    assistantName: 'Assistant Name',
    assistantNamePlaceholder: 'e.g., Reading Buddy',
    cancel: 'Cancel',
    saveName: 'Save Name',
    yourPersonality: 'Your Personality',
    personalityPlaceholder: 'e.g., introverted, likes quiet thinking',
    interests: 'Interests',
    interestsPlaceholder: 'e.g., sci-fi, business, psychology',
    languageLevel: 'Language Level',
    recentTopics: 'Recent Topics',
    topicsPlaceholder: 'e.g., AI, sustainability, startups',
    generateRecommendations: 'Generate Recommendations',
    cloudLogin: 'Sign up / Login',
    cloudLogout: 'Logout',
    cloudGuest: 'Guest',
    cloudSyncing: 'Syncing...',
    cloudSynced: 'Synced',
    authModalTitle: 'Sign up / Login',
    authModeLogin: 'Login',
    authModeRegister: 'Sign up',
    authUsername: 'Username',
    authUsernamePlaceholder: 'Enter username',
    authPassword: 'Password',
    authPasswordPlaceholder: 'Enter password (min 6 chars)',
    authSubmitLogin: 'Login',
    authSubmitRegister: 'Sign up',
    authHintLogin: 'Enter username and password to login.',
    authHintRegister: 'Create a username and password to register.',
    cloudLoginSuccess: 'Login successful. Cloud sync completed.',
    cloudLoginFailed: 'Login failed: {message}',
    cloudLogoutSuccess: 'Logged out. Continuing with local data.',
    cloudLogoutFailed: 'Logout failed. Please try again.',
    restoreCachedConfirm: 'Cached text from your last session was found. Restore it?',
    restoreCachedLoaded: 'Restored the last reading text from cache.',
    restoreCachedSkipped: 'Skipped restoring cached text.',
    welcomeLine1: 'Welcome to the Multilingual Reading Assistant.',
    welcomeLine2: 'Let each day of language learning leave a visible trace.',
    welcomeLine3: 'Let every reading be gently archived into the light of your memory.',
    welcomeTapHint: 'Tap to continue',
    welcomeEnteringHint: 'Entering your learning space...',
    welcomeDoNotShowAgain: 'Do not show again',
    onboardingStepCounter: 'Step {current} / {total}',
    onboardingSkip: 'Skip',
    onboardingNext: 'Next',
    onboardingDone: 'Done',
    onboardingLanguageTitle: 'Choose reading language',
    onboardingLanguageDesc: 'This controls the default definition language when you click words.',
    onboardingInputTitle: 'Paste your text here',
    onboardingInputDesc: 'After pasting, click "Load Text" and the article becomes interactive.',
    onboardingWordsTitle: 'Word collection area',
    onboardingWordsDesc: 'Clicked words are auto-collected here and can be saved.',
    onboardingAssistantTitle: 'AI assistant entry',
    onboardingAssistantDesc: 'Tap the bottom-right button to ask, summarize, and archive chats.',
  },
  ja: {
    appTitle: '多言語読書アシスタント',
    articlePlaceholder: '英語・中国語・日本語のテキストを貼り付けてください。単語をクリックすると定義が表示されます。',
    readingLanguage: '読書言語',
    displayLanguage: '表示言語',
    english: '英語',
    chinese: '中国語',
    japanese: '日本語',
    bookTest: '書籍テスト',
    clearMarks: 'マーク消去',
    clearCache: 'キャッシュ消去',
    loadText: 'テキスト読込',
    textInputPlaceholder: '英語、中国語、日本語のテキストをここに貼り付けてください...',
    inputHint: '英語・中国語・日本語のテキストファイル、または直接貼り付けに対応しています。',
    wordCollection: '単語集',
    saveWords: '保存',
    savedLogNav: '単語ログ',
    filterByDate: '日付で絞り込み',
    allDates: 'すべての日付',
    viewSavedLog: 'ログを見る',
    hideSavedLog: 'ログを隠す',
    savedLogTitle: '保存ログ',
    savedWordsTab: '単語',
    allLanguagesTab: 'すべて',
    baseFormLabel: '原形',
    savedConversationsTab: 'チャット記録',
    clearSavedLog: 'すべて削除',
    delete: '削除',
    noSavedWordsYet: '保存済み単語はありません。「保存」を押すとここで確認できます。',
    noSavedConversationsYet: 'チャット保存はまだありません。「アーカイブ」で保存できます。',
    archiveSourceAI: 'AI構造化',
    archiveSourceLocal: 'ローカル補完',
    archiveDefaultTitle: '読書メモ',
    archiveDetailTitle: 'チャット保存詳細',
    archiveDetailSummary: '考えと返信の要約',
    archiveDetailEvaluation: '中立的な評価',
    archiveDetailMessages: 'チャット全文',
    archiveDetailReflection: '振り返りメモ',
    archiveDetailReflectionPlaceholder: 'チャットを振り返って、気づき・学び・次の行動を書いてください...',
    archiveDetailReflectionConfirm: '確定して右側に表示',
    archiveDetailReflectionPreviewTitle: '確定した振り返り',
    archiveDetailReflectionPreviewEmpty: '確定するとここに表示されます。',
    archiveEmptyMessages: 'チャット内容はありません。',
    archiveTurnsUnit: '往復',
    archiveRoleUser: 'ユーザー',
    archiveRoleAssistant: 'アシスタント',
    exportCsvExcel: 'CSV / Excel 出力',
    downloadExcel: 'Excel ダウンロード (.xlsx)',
    downloadCsv: 'CSV ダウンロード (.csv)',
    noWordsYet: 'まだ単語がありません。記事の単語をクリックして記録してください。',
    aiAssistant: 'AI 読書アシスタント',
    aiReadingAssistant: 'AI 読書アシスタント',
    chatPlaceholder: '会話内容がここに表示されます。要約したり、質問したり、自己テスト問題を依頼してください。',
    clearChat: '会話消去',
    exportReport: 'アーカイブ',
    popupSize: 'ポップアップサイズ',
    reportRemoved: 'この記事のレポートが削除されました。',
    capturedContext: '{lang}コンテンツをキャプチャしました（{len}文字）。アシスタントとチャットできます。',
    marksCleared: 'この記事の単語マークがクリアされました。',
    reportLoaded: 'レポートが読み込まれました。アーカイブ可能です。',
    aiInputPlaceholder: '自分の言葉で要約するか、アシスタントに質問してください（Enterで送信、Shift+Enterで改行）',
    send: '送信',
    renameAssistant: 'アシスタント名変更',
    assistantName: 'アシスタント名',
    assistantNamePlaceholder: '例：読書パートナー',
    cancel: 'キャンセル',
    saveName: '名前を保存',
    yourPersonality: 'あなたの性格',
    personalityPlaceholder: '例：内向的、静かに考えるのが好き',
    interests: '趣味・興味',
    interestsPlaceholder: '例：SF、ビジネス、心理学',
    languageLevel: '言語レベル',
    recentTopics: '最近の関心事',
    topicsPlaceholder: '例：AI、サステナビリティ、起業',
    generateRecommendations: 'おすすめ生成',
    cloudLogin: '登録 / ログイン',
    cloudLogout: 'ログアウト',
    cloudGuest: '未ログイン',
    cloudSyncing: '同期中...',
    cloudSynced: '同期済み',
    authModalTitle: '登録 / ログイン',
    authModeLogin: 'ログイン',
    authModeRegister: '登録',
    authUsername: 'ユーザー名',
    authUsernamePlaceholder: 'ユーザー名を入力',
    authPassword: 'パスワード',
    authPasswordPlaceholder: 'パスワードを入力（6文字以上）',
    authSubmitLogin: 'ログイン',
    authSubmitRegister: '登録',
    authHintLogin: 'ユーザー名とパスワードを入力してログインします。',
    authHintRegister: 'ユーザー名とパスワードだけで登録できます。',
    cloudLoginSuccess: 'ログイン成功、クラウド同期完了。',
    cloudLoginFailed: 'ログイン失敗：{message}',
    cloudLogoutSuccess: 'ログアウトしました。ローカルデータを使用します。',
    cloudLogoutFailed: 'ログアウトに失敗しました。再試行してください。',
    restoreCachedConfirm: '前回のキャッシュ済みテキストが見つかりました。復元しますか？',
    restoreCachedLoaded: '前回の読書テキストをキャッシュから復元しました。',
    restoreCachedSkipped: 'キャッシュの復元をスキップしました。',
    welcomeLine1: '多言語読書アシスタントへようこそ。',
    welcomeLine2: '毎日の語学学習を、見える軌跡に。',
    welcomeLine3: '読むたびの気づきをやさしく蓄え、記憶の中の光へ。',
    welcomeTapHint: 'タップして続行',
    welcomeEnteringHint: '学習スペースに入っています...',
    welcomeDoNotShowAgain: '今後は表示しない',
    onboardingStepCounter: 'ステップ {current} / {total}',
    onboardingSkip: 'スキップ',
    onboardingNext: '次へ',
    onboardingDone: '完了',
    onboardingLanguageTitle: '読書言語を選択',
    onboardingLanguageDesc: '単語クリック時に表示する既定の意味言語を決めます。',
    onboardingInputTitle: 'ここに本文を貼り付け',
    onboardingInputDesc: '貼り付け後に「テキスト読込」を押すと読み取りが始まります。',
    onboardingWordsTitle: '単語コレクション',
    onboardingWordsDesc: '記事内の単語をクリックするとここに自動記録されます。',
    onboardingAssistantTitle: 'AIアシスタント入口',
    onboardingAssistantDesc: '右下ボタンから質問・要約・アーカイブができます。',
  },
};

const state = {
  articleId: null,
  rawText: '',
  articleLanguage: 'en',
  tokens: [],
  clickedWords: new Map(),
  savedWordLog: new Map(),
  savedConversationLog: new Map(),
  savedLogDateFilter: '',
  savedLogTab: 'words',
  savedLogWordLanguageFilter: 'all',
  activeConversationArchive: null,
  appLabel: DEFAULT_APP_LABEL,
  bookRecs: null,
  bionicEnabled: false,
  language: 'en',
  displayLanguage: 'zh',
  audio: null,
  pronunciationAccent: 'us',
  assistant: {
    label: DEFAULT_ASSISTANT_LABEL,
    ...DEFAULT_ASSISTANT_CONFIG,
    messages: [],
    hintsConsumed: false,
    busy: false,
    archiving: false,
    articleContext: '',
    report: '',
  },
  auth: {
    user: null,
    syncing: false,
    mode: 'login',
  },
  welcome: {
    active: false,
    lineIndex: 0,
    lines: [],
    completed: false,
    resolver: null,
  },
  onboarding: {
    active: false,
    stepIndex: 0,
    steps: [],
  },
  translationCache: new Map(),
  japaneseReadingCache: new Map(),
  japanesePhraseCache: new Map(),
  selectionCache: new Map(),
  lastSelectionSignature: '',
  lastSelectionAt: 0,
  selectionLookupTimer: null,
  ttsVoicesReady: false,
};

const cloudSyncTimers = new Map();
const reflectionSaveTimers = new Map();
let cloudSyncInFlight = 0;
let activePronunciationRequestId = 0;
let assistantInputComposing = false;
let savedLogOpenAnimationTimer = null;
let clearCacheAnimationTimer = null;
let bookTestCloseTimer = null;
let bookTestOpenTimer = null;

const elements = {};
const tooltipState = {
  anchor: null,
  anchorRect: null,
  detail: null,
};

function cacheDom() {
  elements.welcomeOverlay = document.getElementById('welcomeOverlay');
  elements.welcomeLine = document.getElementById('welcomeLine');
  elements.welcomeHint = document.getElementById('welcomeHint');
  elements.welcomeSkipCheckbox = document.getElementById('welcomeSkipCheckbox');
  elements.appShell = document.querySelector('.app-shell');
  elements.fileInput = document.getElementById('fileInput');
  elements.pdfInput = document.getElementById('pdfInput');
  elements.languageSelect = document.getElementById('languageSelect');
  elements.displayLanguageSelect = document.getElementById('displayLanguageSelect');
  elements.clearCacheBtn = document.getElementById('clearCacheBtn');
  elements.textInput = document.getElementById('textInput');
  elements.loadTextBtn = document.getElementById('loadTextBtn');
  elements.bionicToggleBtn = document.getElementById('bionicToggleBtn');
  elements.pdfStatus = document.getElementById('pdfStatus');
  elements.articleContainer = document.getElementById('articleContainer');
  elements.wordList = document.getElementById('wordList');
  elements.savedWordList = document.getElementById('savedWordList');
  elements.savedConversationList = document.getElementById('savedConversationList');
  elements.conversationDetailModal = document.getElementById('conversationDetailModal');
  elements.conversationDetailCloseBtn = document.getElementById('conversationDetailCloseBtn');
  elements.conversationDetailHeadline = document.getElementById('conversationDetailHeadline');
  elements.conversationDetailMeta = document.getElementById('conversationDetailMeta');
  elements.conversationDetailSummary = document.getElementById('conversationDetailSummary');
  elements.conversationDetailEvaluation = document.getElementById('conversationDetailEvaluation');
  elements.conversationDetailMessagesPanel = document.getElementById('conversationDetailMessagesPanel');
  elements.conversationDetailMessages = document.getElementById('conversationDetailMessages');
  elements.conversationDetailReflection = document.getElementById('conversationDetailReflection');
  elements.conversationDetailReflectionConfirmBtn = document.getElementById('conversationDetailReflectionConfirmBtn');
  elements.conversationDetailReflectionPreview = document.getElementById('conversationDetailReflectionPreview');
  elements.exportBtn = document.getElementById('exportBtn');
  elements.savedLogToggleBtn = document.getElementById('savedLogToggleBtn');
  elements.savedLogWordsTab = document.getElementById('savedLogWordsTab');
  elements.savedLogConversationsTab = document.getElementById('savedLogConversationsTab');
  elements.savedLogWordLanguageToggle = document.getElementById('savedLogWordLanguageToggle') || elements.savedLogWordsTab;
  elements.savedLogWordLanguageTabs = document.getElementById('savedLogWordLanguageTabs');
  elements.savedLogDrawer = document.getElementById('savedLogDrawer');
  elements.savedLogBackdrop = document.getElementById('savedLogBackdrop');
  elements.savedLogCloseBtn = document.getElementById('savedLogCloseBtn');
  elements.savedLogDateBtn = document.getElementById('savedLogDateBtn');
  elements.savedLogDateInput = document.getElementById('savedLogDateInput');
  elements.savedLogDateLabel = document.getElementById('savedLogDateLabel');
  elements.clearSavedBtn = document.getElementById('clearSavedBtn');
  elements.exportStatus = document.getElementById('exportStatus');
  elements.appTitle = document.getElementById('appTitle');
  elements.authUserLabel = document.getElementById('authUserLabel');
  elements.authLoginBtn = document.getElementById('authLoginBtn');
  elements.authLogoutBtn = document.getElementById('authLogoutBtn');
  elements.authModal = document.getElementById('authModal');
  elements.authModalClose = document.getElementById('authModalClose');
  elements.authModalCancel = document.getElementById('authModalCancel');
  elements.authModalSubmit = document.getElementById('authModalSubmit');
  elements.authModeLoginBtn = document.getElementById('authModeLoginBtn');
  elements.authModeRegisterBtn = document.getElementById('authModeRegisterBtn');
  elements.authUsernameInput = document.getElementById('authUsernameInput');
  elements.authPasswordInput = document.getElementById('authPasswordInput');
  elements.authModalHint = document.getElementById('authModalHint');
  elements.clearConversationBtn = document.getElementById('clearConversationBtn');
  elements.exportReportBtn = document.getElementById('exportReportBtn');
  elements.reportStatus = document.getElementById('reportStatus');
  elements.bookTestBtn = document.getElementById('bookTestBtn');
  elements.bookTestModal = document.getElementById('bookTestModal');
  elements.bookTestClose = document.getElementById('bookTestClose');
  elements.bookTestCancel = document.getElementById('bookTestCancel');
  elements.bookTestSubmit = document.getElementById('bookTestSubmit');
  elements.bookPersonality = document.getElementById('bookPersonality');
  elements.bookInterests = document.getElementById('bookInterests');
  elements.bookLanguage = document.getElementById('bookLanguage');
  elements.bookLevel = document.getElementById('bookLevel');
  elements.bookTopic = document.getElementById('bookTopic');
  elements.bookTestStatus = document.getElementById('bookTestStatus');
  elements.bookTestResults = document.getElementById('bookTestResults');
  elements.tooltip = document.getElementById('tooltip');
  elements.tooltipContent = elements.tooltip?.querySelector('.tooltip-content');
  elements.tooltipWord = document.getElementById('tooltipWord');
  elements.tooltipBody = document.getElementById('tooltipBody');
  elements.playUkBtn = document.getElementById('playUkBtn');
  elements.playUsBtn = document.getElementById('playUsBtn');
  elements.closeTooltipBtn = document.getElementById('closeTooltipBtn');
  elements.aiToggleBtn = document.getElementById('aiToggleBtn');
  elements.aiCloseBtn = document.getElementById('aiCloseBtn');
  elements.assistantDrawer = document.getElementById('assistantDrawer');
  elements.aiMessages = document.getElementById('aiMessages');
  elements.aiUserInput = document.getElementById('aiUserInput');
  elements.aiSendBtn = document.getElementById('aiSendBtn');
  elements.aiStatus = document.getElementById('aiStatus');
  elements.drawerSizeControl = document.getElementById('drawerSizeControl');
  elements.drawerSizeValue = document.getElementById('drawerSizeValue');
  elements.aiSettingsBtn = document.getElementById('aiSettingsBtn');
  elements.aiSettingsPanel = document.getElementById('aiSettingsPanel');
  elements.renameAssistantBtnTop = document.getElementById('renameAssistantBtnTop');
  elements.renameAssistantBtn = document.getElementById('renameAssistantBtn');
  elements.assistantRenameModal = document.getElementById('assistantRenameModal');
  elements.assistantNameInput = document.getElementById('assistantNameInput');
  elements.renameModalClose = document.getElementById('renameModalClose');
  elements.renameModalCancel = document.getElementById('renameModalCancel');
  elements.renameModalSave = document.getElementById('renameModalSave');
  elements.renameModalTitle = document.querySelector('#assistantRenameModal .modal-header h3');
  elements.onboardingOverlay = document.getElementById('onboardingOverlay');
  elements.onboardingSpotlight = document.getElementById('onboardingSpotlight');
  elements.onboardingCard = document.getElementById('onboardingCard');
  elements.onboardingStep = document.getElementById('onboardingStep');
  elements.onboardingTitle = document.getElementById('onboardingTitle');
  elements.onboardingDescription = document.getElementById('onboardingDescription');
  elements.onboardingSkipBtn = document.getElementById('onboardingSkipBtn');
  elements.onboardingNextBtn = document.getElementById('onboardingNextBtn');
  if (elements.assistantDrawer) {
    elements.assistantDrawer.classList.remove('open');
    elements.assistantDrawer.setAttribute('aria-hidden', 'true');
  }
}

async function restoreCachedArticle() {
  const cached = loadLastArticle();
  if (!cached?.text) {
    return false;
  }
  const shouldRestore = window.confirm(t('restoreCachedConfirm'));
  if (!shouldRestore) {
    setExportStatus(t('restoreCachedSkipped'));
    return false;
  }
  if (cached.language) {
    setLanguage(cached.language, { skipRender: true, skipSave: true });
  }
  elements.textInput.value = cached.text || '';
  loadArticle(cached.text);
  setExportStatus(t('restoreCachedLoaded'));
  setAssistantStatus('');
  return true;
}

function applyDrawerSize(percent) {
  const rawValue = Number(percent);
  const clamped = Number.isFinite(rawValue)
    ? Math.min(Math.max(rawValue, DRAWER_SIZE_MIN), DRAWER_SIZE_MAX)
    : DRAWER_SIZE_DEFAULT;
  const scale = clamped / 100;
  if (elements.drawerSizeValue) {
    elements.drawerSizeValue.textContent = `${clamped}%`;
  }
  if (elements.drawerSizeControl) {
    elements.drawerSizeControl.value = String(clamped);
  }
  if (elements.assistantDrawer) {
    const width = Math.round(380 * scale);
    const maxHeightVh = 70 * scale;
    elements.assistantDrawer.style.setProperty('--drawer-width', `${width}px`);
    elements.assistantDrawer.style.setProperty('--drawer-max-height', `${maxHeightVh}vh`);
  }
  positionAssistantDrawer();
}

function applyBionicMarkup(node, word) {
  const clean = word || '';
  const len = clean.length;
  const prefixLength = Math.min(Math.max(1, Math.round(Math.min(Math.max(len * 0.6, 3), 4))), len);
  const prefix = clean.slice(0, prefixLength);
  const suffix = clean.slice(prefixLength);
  node.textContent = '';
  const strong = document.createElement('span');
  strong.className = 'bionic-prefix';
  strong.textContent = prefix;
  node.appendChild(strong);
  node.appendChild(document.createTextNode(suffix));
}

function renderAssistantLabel() {
  const label = state.assistant.label || DEFAULT_ASSISTANT_LABEL;
  const heading = elements.assistantDrawer?.querySelector('.assistant-header h3');
  if (heading) {
    heading.textContent = label;
  }
  if (elements.assistantNameInput && !elements.assistantNameInput.value) {
    elements.assistantNameInput.value = label;
  }
}

function renderAppLabel() {
  const label = state.appLabel || DEFAULT_APP_LABEL;
  if (elements.appTitle) {
    elements.appTitle.textContent = label;
  }
}

function setLanguage(language, { skipRender = false, skipSave = false } = {}) {
  const normalized = ['en', 'zh', 'ja'].includes(language) ? language : 'en';
  state.language = normalized;
  state.translationCache = new Map();
  state.japaneseReadingCache = new Map();
  state.japanesePhraseCache = new Map();
  state.selectionCache = new Map();
  state.lastSelectionSignature = '';
  state.lastSelectionAt = 0;
  if (elements.languageSelect) {
    elements.languageSelect.value = normalized;
  }
  if (!skipSave) {
    saveLanguagePreference(normalized);
  }
  updateBionicButton();
  hideTooltip();
  if (!skipRender && state.rawText) {
    renderArticle();
    markVisitedWords();
  }
}

function setDisplayLanguage(language) {
  const normalized = ['en', 'zh', 'ja'].includes(language) ? language : 'zh';
  state.displayLanguage = normalized;
  if (elements.displayLanguageSelect) {
    elements.displayLanguageSelect.value = normalized;
  }
  applyTranslations(normalized);
}

function applyTranslations(language) {
  const translations = I18N_TRANSLATIONS[language] || I18N_TRANSLATIONS.zh;
  
  // 翻译文本内容
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (translations[key]) {
      el.textContent = translations[key];
    }
  });
  
  // 翻译placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[key]) {
      el.placeholder = translations[key];
    }
  });
  syncAssistantInputPlaceholder();

  // 翻译title和无文字图标按钮的可访问标签
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (translations[key]) {
      el.title = translations[key];
      el.setAttribute('aria-label', translations[key]);
    }
  });
  
  // 更新HTML lang属性
  const langMap = { zh: 'zh-Hans', en: 'en', ja: 'ja' };
  document.documentElement.lang = langMap[language] || 'zh-Hans';
  
  // 更新页面标题
  const titles = {
    zh: '多语阅读助手',
    en: 'Multilingual Reading Assistant',
    ja: '多言語読書アシスタント',
  };
  document.title = titles[language] || titles.zh;
  
  // 重新渲染助手消息以更新占位符
  renderAssistantMessages();
  refreshSavedLogPanel();
  refreshConversationArchiveDetailView();
  renderAuthControls();
  renderWelcomeLine();
  renderOnboardingStep();
}

function syncAssistantInputPlaceholder() {
  if (!elements.aiUserInput) {
    return;
  }
  if (state.assistant.hintsConsumed) {
    elements.aiUserInput.placeholder = '';
    return;
  }
  elements.aiUserInput.placeholder = t('aiInputPlaceholder');
}

function t(key, replacements = {}) {
  const translations = I18N_TRANSLATIONS[state.displayLanguage] || I18N_TRANSLATIONS.zh;
  let text = translations[key] || I18N_TRANSLATIONS.zh[key] || key;
  Object.entries(replacements).forEach(([k, v]) => {
    text = text.replace(`{${k}}`, v);
  });
  return text;
}

function getLanguageLabel(language) {
  return LANGUAGE_LABELS[language] || LANGUAGE_LABELS.en;
}

function waitFor(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getWelcomeLines() {
  return [
    t('welcomeLine1'),
    t('welcomeLine2'),
    t('welcomeLine3'),
  ];
}

function renderWelcomeLine({ animate = false } = {}) {
  if (!elements.welcomeLine || !elements.welcomeHint || !state.welcome.active) {
    return;
  }
  const text = state.welcome.lines[state.welcome.lineIndex] || '';
  if (animate) {
    elements.welcomeLine.classList.remove('is-entering');
    void elements.welcomeLine.offsetWidth;
    elements.welcomeLine.classList.add('is-entering');
  }
  elements.welcomeLine.textContent = text;
  elements.welcomeHint.textContent = state.welcome.completed
    ? t('welcomeEnteringHint')
    : t('welcomeTapHint');
}

function showWelcomeOverlay() {
  if (!elements.welcomeOverlay) {
    return;
  }
  state.welcome.lines = getWelcomeLines();
  state.welcome.lineIndex = 0;
  state.welcome.completed = false;
  state.welcome.resolver = null;
  state.welcome.active = true;
  elements.welcomeOverlay.classList.remove('is-leaving');
  elements.welcomeOverlay.setAttribute('aria-hidden', 'false');
  if (elements.welcomeSkipCheckbox) {
    elements.welcomeSkipCheckbox.checked = hasSeenWelcome();
  }
  document.body.classList.add('welcome-open');
  renderWelcomeLine();
}

function waitForWelcomeSequence() {
  if (!elements.welcomeOverlay || !state.welcome.active) {
    return Promise.resolve();
  }
  if (state.welcome.completed) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    state.welcome.resolver = resolve;
  });
}

function completeWelcomeSequence() {
  if (state.welcome.completed) {
    return;
  }
  if (elements.welcomeSkipCheckbox) {
    setWelcomeSeen(Boolean(elements.welcomeSkipCheckbox.checked));
  }
  state.welcome.completed = true;
  renderWelcomeLine();
  const resolver = state.welcome.resolver;
  state.welcome.resolver = null;
  if (typeof resolver === 'function') {
    resolver();
  }
}

function advanceWelcomeSequence() {
  if (!state.welcome.active || state.welcome.completed) {
    return;
  }
  if (state.welcome.lineIndex < state.welcome.lines.length - 1) {
    state.welcome.lineIndex += 1;
    renderWelcomeLine({ animate: true });
    return;
  }
  completeWelcomeSequence();
}

async function hideWelcomeOverlay() {
  if (!elements.welcomeOverlay) {
    return;
  }
  state.welcome.active = false;
  elements.welcomeOverlay.classList.add('is-leaving');
  await waitFor(WELCOME_FADE_OUT_MS);
  elements.welcomeLine?.classList.remove('is-entering');
  elements.welcomeOverlay.classList.remove('is-leaving');
  elements.welcomeOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('welcome-open');
}

function hasSeenOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_STORAGE_ID) === '1';
  } catch {
    return false;
  }
}

function hasSeenWelcome() {
  try {
    return localStorage.getItem(WELCOME_SEEN_STORAGE_ID) === '1';
  } catch {
    return false;
  }
}

function setWelcomeSeen(seen) {
  try {
    if (seen) {
      localStorage.setItem(WELCOME_SEEN_STORAGE_ID, '1');
      return;
    }
    localStorage.removeItem(WELCOME_SEEN_STORAGE_ID);
  } catch {}
}

function markOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING_SEEN_STORAGE_ID, '1');
  } catch {}
}

function getOnboardingSteps() {
  return [
    {
      selector: '#languageSelect',
      titleKey: 'onboardingLanguageTitle',
      descKey: 'onboardingLanguageDesc',
    },
    {
      selector: '#textInput',
      titleKey: 'onboardingInputTitle',
      descKey: 'onboardingInputDesc',
    },
    {
      selector: '#wordList',
      titleKey: 'onboardingWordsTitle',
      descKey: 'onboardingWordsDesc',
    },
    {
      selector: '#aiToggleBtn',
      titleKey: 'onboardingAssistantTitle',
      descKey: 'onboardingAssistantDesc',
    },
  ];
}

function getOnboardingTargetRect(stepIndex) {
  const step = state.onboarding.steps[stepIndex];
  if (!step?.selector) {
    return null;
  }
  const target = document.querySelector(step.selector);
  if (!target || target.hidden) {
    return null;
  }
  const rect = target.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) {
    return null;
  }
  return rect;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function positionOnboardingCard(targetRect) {
  if (!elements.onboardingCard) {
    return;
  }
  const cardRect = elements.onboardingCard.getBoundingClientRect();
  const margin = 12;
  let left = targetRect.left;
  left = clamp(left, margin, window.innerWidth - cardRect.width - margin);
  let top = targetRect.bottom + margin;
  if (top + cardRect.height > window.innerHeight - margin) {
    top = targetRect.top - cardRect.height - margin;
  }
  top = clamp(top, margin, window.innerHeight - cardRect.height - margin);
  elements.onboardingCard.style.left = `${Math.round(left)}px`;
  elements.onboardingCard.style.top = `${Math.round(top)}px`;
}

function renderOnboardingStep() {
  if (!state.onboarding.active) {
    return;
  }
  let rect = getOnboardingTargetRect(state.onboarding.stepIndex);
  while (!rect && state.onboarding.stepIndex < state.onboarding.steps.length - 1) {
    state.onboarding.stepIndex += 1;
    rect = getOnboardingTargetRect(state.onboarding.stepIndex);
  }
  if (!rect) {
    finishOnboarding();
    return;
  }
  const step = state.onboarding.steps[state.onboarding.stepIndex];
  const inset = 8;
  const top = clamp(rect.top - inset, 8, window.innerHeight - 16);
  const left = clamp(rect.left - inset, 8, window.innerWidth - 16);
  const width = Math.min(rect.width + inset * 2, window.innerWidth - 16);
  const height = Math.min(rect.height + inset * 2, window.innerHeight - 16);
  if (elements.onboardingSpotlight) {
    elements.onboardingSpotlight.style.top = `${Math.round(top)}px`;
    elements.onboardingSpotlight.style.left = `${Math.round(left)}px`;
    elements.onboardingSpotlight.style.width = `${Math.round(width)}px`;
    elements.onboardingSpotlight.style.height = `${Math.round(height)}px`;
  }
  if (elements.onboardingTitle) {
    elements.onboardingTitle.textContent = t(step.titleKey);
  }
  if (elements.onboardingDescription) {
    elements.onboardingDescription.textContent = t(step.descKey);
  }
  if (elements.onboardingStep) {
    elements.onboardingStep.textContent = t('onboardingStepCounter', {
      current: String(state.onboarding.stepIndex + 1),
      total: String(state.onboarding.steps.length),
    });
  }
  const isLastStep = state.onboarding.stepIndex >= state.onboarding.steps.length - 1;
  if (elements.onboardingNextBtn) {
    elements.onboardingNextBtn.textContent = t(isLastStep ? 'onboardingDone' : 'onboardingNext');
  }
  if (elements.onboardingSkipBtn) {
    elements.onboardingSkipBtn.textContent = t('onboardingSkip');
  }
  window.requestAnimationFrame(() => positionOnboardingCard({ top, left, width, height, bottom: top + height }));
}

function finishOnboarding({ markSeen = true } = {}) {
  if (!state.onboarding.active) {
    return;
  }
  state.onboarding.active = false;
  if (elements.onboardingOverlay) {
    elements.onboardingOverlay.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('onboarding-open');
  if (markSeen) {
    markOnboardingSeen();
  }
}

function nextOnboardingStep() {
  if (!state.onboarding.active) {
    return;
  }
  if (state.onboarding.stepIndex >= state.onboarding.steps.length - 1) {
    finishOnboarding();
    return;
  }
  state.onboarding.stepIndex += 1;
  renderOnboardingStep();
}

function startOnboardingIfNeeded() {
  if (hasSeenOnboarding()) {
    return;
  }
  if (!elements.onboardingOverlay || !elements.onboardingCard) {
    return;
  }
  state.onboarding.steps = getOnboardingSteps();
  state.onboarding.stepIndex = 0;
  state.onboarding.active = true;
  elements.onboardingOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('onboarding-open');
  renderOnboardingStep();
}

function handleOnboardingViewportChange() {
  if (!state.onboarding.active) {
    return;
  }
  renderOnboardingStep();
}

function isCloudEnabled() {
  return Boolean(state.auth?.user?.id);
}

function beginCloudSync() {
  cloudSyncInFlight += 1;
  state.auth.syncing = cloudSyncInFlight > 0;
  renderAuthControls();
}

function endCloudSync() {
  cloudSyncInFlight = Math.max(0, cloudSyncInFlight - 1);
  state.auth.syncing = cloudSyncInFlight > 0;
  renderAuthControls();
}

function getPublicUserLabel() {
  const user = state.auth?.user;
  if (!user) {
    return '';
  }
  const username = String(user.username || '').trim();
  if (username) {
    return username;
  }
  const name = String(user.name || '').trim();
  if (name) {
    return name;
  }
  return String(user.email || '').trim();
}

function setAuthModalHint(message = '', { isError = false } = {}) {
  if (!elements.authModalHint) {
    return;
  }
  elements.authModalHint.textContent = message;
  elements.authModalHint.classList.toggle('error', Boolean(isError && message));
}

function setAuthMode(mode = 'login') {
  const normalized = mode === 'register' ? 'register' : 'login';
  state.auth.mode = normalized;
  if (elements.authModeLoginBtn) {
    elements.authModeLoginBtn.classList.toggle('active', normalized === 'login');
  }
  if (elements.authModeRegisterBtn) {
    elements.authModeRegisterBtn.classList.toggle('active', normalized === 'register');
  }
  if (elements.authPasswordInput) {
    elements.authPasswordInput.autocomplete = normalized === 'register' ? 'new-password' : 'current-password';
  }
  if (elements.authModalSubmit) {
    elements.authModalSubmit.textContent = normalized === 'register' ? t('authSubmitRegister') : t('authSubmitLogin');
  }
  setAuthModalHint(normalized === 'register' ? t('authHintRegister') : t('authHintLogin'));
}

function setAuthModalBusy(isBusy) {
  const disabled = Boolean(isBusy);
  if (elements.authModalSubmit) {
    elements.authModalSubmit.disabled = disabled;
  }
  if (elements.authModalClose) {
    elements.authModalClose.disabled = disabled;
  }
  if (elements.authModalCancel) {
    elements.authModalCancel.disabled = disabled;
  }
  if (elements.authModeLoginBtn) {
    elements.authModeLoginBtn.disabled = disabled;
  }
  if (elements.authModeRegisterBtn) {
    elements.authModeRegisterBtn.disabled = disabled;
  }
  if (elements.authUsernameInput) {
    elements.authUsernameInput.disabled = disabled;
  }
  if (elements.authPasswordInput) {
    elements.authPasswordInput.disabled = disabled;
  }
}

function openAuthModal(mode = 'login') {
  if (!elements.authModal) {
    return;
  }
  setAuthMode(mode);
  setAuthModalBusy(false);
  setAuthModalHint(mode === 'register' ? t('authHintRegister') : t('authHintLogin'));
  if (elements.authUsernameInput) {
    elements.authUsernameInput.value = '';
  }
  if (elements.authPasswordInput) {
    elements.authPasswordInput.value = '';
  }
  elements.authModal.setAttribute('aria-hidden', 'false');
  elements.authUsernameInput?.focus();
}

function closeAuthModal() {
  if (!elements.authModal) {
    return;
  }
  elements.authModal.setAttribute('aria-hidden', 'true');
  setAuthModalHint('');
  setAuthModalBusy(false);
}

function renderAuthControls() {
  if (elements.authLoginBtn) {
    elements.authLoginBtn.hidden = isCloudEnabled();
    elements.authLoginBtn.disabled = state.auth.syncing;
    elements.authLoginBtn.textContent = t('cloudLogin');
  }
  if (elements.authLogoutBtn) {
    elements.authLogoutBtn.hidden = !isCloudEnabled();
    elements.authLogoutBtn.disabled = state.auth.syncing;
    elements.authLogoutBtn.textContent = t('cloudLogout');
  }
  if (elements.authUserLabel) {
    const userLabel = getPublicUserLabel();
    const prefix = state.auth.syncing ? t('cloudSyncing') : '';
    elements.authUserLabel.textContent = [prefix, userLabel].filter(Boolean).join(' · ');
  }
  if (elements.authModal?.getAttribute('aria-hidden') === 'false') {
    setAuthMode(state.auth.mode);
  }
}

function getReflectionSaveKey(articleId, dateKey, archiveId) {
  return `${articleId || ''}::${dateKey || ''}::${archiveId || ''}`;
}

function normalizeTimestamp(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function mergeSavedWordLogs(localRaw, cloudRaw) {
  const local = normalizeSavedWordLogByDate(localRaw);
  const cloud = normalizeSavedWordLogByDate(cloudRaw);
  const merged = {};
  let localPreferred = false;
  const dateKeys = new Set([...Object.keys(local), ...Object.keys(cloud)]);

  dateKeys.forEach((dateKey) => {
    const localBucket = local[dateKey] || {};
    const cloudBucket = cloud[dateKey] || {};
    const nextBucket = {};
    const wordKeys = new Set([...Object.keys(localBucket), ...Object.keys(cloudBucket)]);

    wordKeys.forEach((wordKey) => {
      const localItem = localBucket[wordKey];
      const cloudItem = cloudBucket[wordKey];
      if (localItem && !cloudItem) {
        nextBucket[wordKey] = { ...localItem };
        localPreferred = true;
        return;
      }
      if (!localItem && cloudItem) {
        nextBucket[wordKey] = { ...cloudItem };
        return;
      }
      const localAt = normalizeTimestamp(localItem?.savedAt);
      const cloudAt = normalizeTimestamp(cloudItem?.savedAt);
      if (localAt >= cloudAt) {
        nextBucket[wordKey] = { ...localItem };
        if (localAt > cloudAt) {
          localPreferred = true;
        }
      } else {
        nextBucket[wordKey] = { ...cloudItem };
      }
    });

    if (Object.keys(nextBucket).length) {
      merged[dateKey] = nextBucket;
    }
  });

  return { merged, localPreferred };
}

function mergeConversationLogs(localRaw, cloudRaw) {
  const local = normalizeConversationLogByDate(localRaw);
  const cloud = normalizeConversationLogByDate(cloudRaw);
  const merged = {};
  let localPreferred = false;
  const dateKeys = new Set([...Object.keys(local), ...Object.keys(cloud)]);

  dateKeys.forEach((dateKey) => {
    const localBucket = local[dateKey] || {};
    const cloudBucket = cloud[dateKey] || {};
    const nextBucket = {};
    const archiveIds = new Set([...Object.keys(localBucket), ...Object.keys(cloudBucket)]);

    archiveIds.forEach((archiveId) => {
      const localItem = localBucket[archiveId];
      const cloudItem = cloudBucket[archiveId];
      if (localItem && !cloudItem) {
        nextBucket[archiveId] = { ...localItem };
        localPreferred = true;
        return;
      }
      if (!localItem && cloudItem) {
        nextBucket[archiveId] = { ...cloudItem };
        return;
      }
      const localAt = normalizeTimestamp(localItem?.savedAt);
      const cloudAt = normalizeTimestamp(cloudItem?.savedAt);
      if (localAt >= cloudAt) {
        nextBucket[archiveId] = { ...localItem };
        if (localAt > cloudAt) {
          localPreferred = true;
        }
      } else {
        nextBucket[archiveId] = { ...cloudItem };
      }
    });

    if (Object.keys(nextBucket).length) {
      merged[dateKey] = nextBucket;
    }
  });

  return { merged, localPreferred };
}

async function persistCloudArticleSync(articleId) {
  if (!isCloudEnabled() || !articleId) {
    return;
  }
  const savedWordLog = normalizeSavedWordLogByDate(loadSavedWordLog(articleId));
  const conversationLog = normalizeConversationLogByDate(loadConversationLog(articleId));
  beginCloudSync();
  try {
    await saveCloudArticleLog(articleId, savedWordLog, conversationLog);
  } catch (error) {
    console.warn('[Cloud] sync article log failed:', error);
  } finally {
    endCloudSync();
  }
}

function scheduleCloudArticleSync(articleId, { immediate = false } = {}) {
  if (!isCloudEnabled() || !articleId) {
    return;
  }
  const previousTimer = cloudSyncTimers.get(articleId);
  if (previousTimer) {
    clearTimeout(previousTimer);
    cloudSyncTimers.delete(articleId);
  }
  if (immediate) {
    void persistCloudArticleSync(articleId);
    return;
  }
  const timer = window.setTimeout(() => {
    cloudSyncTimers.delete(articleId);
    void persistCloudArticleSync(articleId);
  }, CLOUD_SYNC_DEBOUNCE_MS);
  cloudSyncTimers.set(articleId, timer);
}

function mergeArticleLogsAndPersist(articleId, cloudLog = {}, { refreshUI = true } = {}) {
  if (!articleId) {
    return false;
  }
  const localSavedWordLog = loadSavedWordLog(articleId);
  const localConversationLog = loadConversationLog(articleId);
  const {
    merged: mergedSavedWordLog,
    localPreferred: savedWordLocalPreferred,
  } = mergeSavedWordLogs(localSavedWordLog, cloudLog?.savedWordLog || {});
  const {
    merged: mergedConversationLog,
    localPreferred: conversationLocalPreferred,
  } = mergeConversationLogs(localConversationLog, cloudLog?.conversationLog || {});

  saveSavedWordLog(articleId, mergedSavedWordLog);
  saveConversationLog(articleId, mergedConversationLog);

  if (state.articleId === articleId) {
    state.savedWordLog = buildSavedWordLogMap(mergedSavedWordLog);
    state.savedConversationLog = buildConversationLogMap(mergedConversationLog);
    if (refreshUI) {
      refreshSavedLogPanel();
    }
  }

  if (!state.articleId && articleId === 'global-assistant') {
    state.savedConversationLog = buildConversationLogMap(mergedConversationLog);
    if (refreshUI) {
      refreshSavedLogPanel();
    }
  }

  if (savedWordLocalPreferred || conversationLocalPreferred) {
    scheduleCloudArticleSync(articleId);
  }

  return savedWordLocalPreferred || conversationLocalPreferred;
}

async function syncArticleFromCloud(articleId) {
  if (!isCloudEnabled() || !articleId) {
    return;
  }
  beginCloudSync();
  try {
    const cloudLog = await fetchCloudArticleLog(articleId);
    mergeArticleLogsAndPersist(articleId, cloudLog || {}, { refreshUI: true });
  } catch (error) {
    console.warn('[Cloud] sync article from cloud failed:', error);
  } finally {
    endCloudSync();
  }
}

async function bootstrapCloudLogs() {
  if (!isCloudEnabled()) {
    return;
  }
  beginCloudSync();
  try {
    const payload = await fetchCloudBootstrap();
    const cloudLogs = payload?.logs && typeof payload.logs === 'object' ? payload.logs : {};
    const localArticleIds = listSavedLogArticleIds();
    const articleIds = new Set([...localArticleIds, ...Object.keys(cloudLogs)]);
    articleIds.add('global-assistant');

    articleIds.forEach((articleId) => {
      mergeArticleLogsAndPersist(articleId, cloudLogs[articleId] || {}, { refreshUI: false });
    });

    if (state.articleId) {
      const currentCloudLog = cloudLogs[state.articleId] || {};
      mergeArticleLogsAndPersist(state.articleId, currentCloudLog, { refreshUI: false });
    }
    refreshSavedLogPanel();
  } catch (error) {
    console.warn('[Cloud] bootstrap failed:', error);
  } finally {
    endCloudSync();
  }
}

async function initializeCloudAuth() {
  renderAuthControls();
  beginCloudSync();
  try {
    const payload = await fetchCurrentUser();
    state.auth.user = payload?.authenticated ? payload.user : null;
  } catch (error) {
    console.warn('[Cloud] auth check failed:', error);
    state.auth.user = null;
  } finally {
    endCloudSync();
  }

  if (isCloudEnabled()) {
    await bootstrapCloudLogs();
  }
}

function normalizeAuthUsername(raw) {
  return String(raw || '').trim();
}

async function handleCloudAuthLogin() {
  openAuthModal('login');
}

async function handleAuthModalSubmit() {
  const mode = state.auth.mode === 'register' ? 'register' : 'login';
  const username = normalizeAuthUsername(elements.authUsernameInput?.value);
  const password = String(elements.authPasswordInput?.value || '');

  if (!username) {
    setAuthModalHint(t('authUsernamePlaceholder'), { isError: true });
    elements.authUsernameInput?.focus();
    return;
  }
  if (password.length < 6) {
    setAuthModalHint(t('authPasswordPlaceholder'), { isError: true });
    elements.authPasswordInput?.focus();
    return;
  }

  setAuthModalBusy(true);
  setAuthModalHint(t('cloudSyncing'));
  beginCloudSync();
  try {
    const payload = mode === 'register'
      ? await registerWithPassword(username, password)
      : await loginWithPassword(username, password);
    state.auth.user = payload?.user || null;
    closeAuthModal();
    renderAuthControls();
    await bootstrapCloudLogs();
    setExportStatus(t('cloudLoginSuccess'));
  } catch (error) {
    console.error('[Cloud] login failed:', error);
    const errorMessage = String(error?.message || 'Please try again.');
    setAuthModalHint(errorMessage, { isError: true });
    setExportStatus(t('cloudLoginFailed', { message: errorMessage }));
  } finally {
    endCloudSync();
    setAuthModalBusy(false);
  }
}

async function handleCloudAuthLogout() {
  beginCloudSync();
  try {
    await logoutSession();
    state.auth.user = null;
    setExportStatus(t('cloudLogoutSuccess'));
  } catch (error) {
    console.error('[Cloud] logout failed:', error);
    setExportStatus(t('cloudLogoutFailed'));
  } finally {
    endCloudSync();
  }
}

function detectTextLanguage(text) {
  if (!text) {
    return 'en';
  }
  const sample = text.slice(0, 2400);
  const zhMatches = sample.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const jaKanaMatches = sample.match(/[\u3040-\u30ff\u31f0-\u31ff]/g)?.length ?? 0;
  const enMatches = sample.match(/[A-Za-z]/g)?.length ?? 0;

  const jaScore = jaKanaMatches * 2 + zhMatches * 0.4;
  const zhScore = zhMatches + jaKanaMatches * 0.2;
  const enScore = enMatches * 1.2;

  const scores = [
    ['ja', jaScore],
    ['zh', zhScore],
    ['en', enScore],
  ].sort((a, b) => b[1] - a[1]);

  const [bestLang, bestScore] = scores[0];
  const totalSignals = zhMatches + jaKanaMatches + enMatches;

  if (bestLang === 'ja' && jaKanaMatches >= 4) {
    return 'ja';
  }
  if (bestLang === 'zh' && zhScore >= enScore * 1.2) {
    return 'zh';
  }
  if (bestScore < 6 && totalSignals < 24) {
    return 'en';
  }
  return bestLang;
}

function openRenameModal(context = 'assistant') {
  if (!elements.assistantRenameModal) {
    return;
  }
  const isApp = context === 'app';
  state.renameContext = isApp ? 'app' : 'assistant';
  const currentLabel = isApp ? (state.appLabel || DEFAULT_APP_LABEL) : (state.assistant.label || DEFAULT_ASSISTANT_LABEL);
  if (elements.renameModalTitle) {
    elements.renameModalTitle.textContent = isApp ? '重命名应用标题' : '重命名助手';
  }
  elements.assistantRenameModal.setAttribute('aria-hidden', 'false');
  elements.assistantNameInput.value = currentLabel;
  elements.assistantNameInput.focus();
  elements.assistantNameInput.select();
}

function closeRenameModal() {
  if (!elements.assistantRenameModal) {
    return;
  }
  elements.assistantRenameModal.setAttribute('aria-hidden', 'true');
}

function handleRenameAssistant() {
  if (!elements.assistantNameInput) {
    return;
  }
  const value = elements.assistantNameInput.value.trim();
  if (!value) {
    elements.assistantNameInput.focus();
    return;
  }
  if (state.renameContext === 'app') {
    state.appLabel = value;
    saveAppLabel(value);
    renderAppLabel();
  } else {
    state.assistant.label = value;
    saveAssistantLabel(value);
    renderAssistantLabel();
  }
  closeRenameModal();
}

async function initializeAppCore() {
  const savedLanguage = loadLanguagePreference();
  setLanguage(savedLanguage || state.language, { skipRender: true, skipSave: true });
  bindEvents();
  primeSpeechVoices();
  const savedLabel = loadAssistantLabel();
  if (savedLabel) {
    state.assistant.label = savedLabel;
  }
  const savedAppLabel = loadAppLabel();
  if (savedAppLabel) {
    state.appLabel = savedAppLabel;
  }
  renderAssistantMessages();
  syncAssistantInputPlaceholder();
  renderAssistantLabel();
  updateReportExportState();
  renderAppLabel();
  updateBionicButton();
  const globalConversationLog = normalizeConversationLogByDate(loadConversationLog('global-assistant'));
  state.savedConversationLog = buildConversationLogMap(globalConversationLog);
  await initializeCloudAuth();
  refreshSavedLogPanel();
  const restored = await restoreCachedArticle();
  if (!restored && DEFAULT_ASSISTANT_STATUS) {
    setAssistantStatus(DEFAULT_ASSISTANT_STATUS);
  }
  applyDrawerSize(elements.drawerSizeControl?.value ?? DRAWER_SIZE_DEFAULT);
  await preloadDictionary();
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.js';
  }
}

async function init() {
  cacheDom();
  const shouldShowWelcome = !hasSeenWelcome();
  if (shouldShowWelcome) {
    showWelcomeOverlay();
  } else if (elements.welcomeOverlay) {
    elements.welcomeOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('welcome-open');
  }
  const welcomePromise = shouldShowWelcome ? waitForWelcomeSequence() : Promise.resolve();
  const appReadyPromise = initializeAppCore().catch((error) => {
    console.error('[Init] failed:', error);
  });
  await Promise.all([welcomePromise, appReadyPromise]);
  if (shouldShowWelcome) {
    await hideWelcomeOverlay();
  }
  window.setTimeout(() => startOnboardingIfNeeded(), 120);
}

function bindEvents() {
  elements.loadTextBtn.addEventListener('click', () => {
    if (!elements.textInput.value.trim()) {
      elements.textInput.focus();
      return;
    }
    loadArticle(elements.textInput.value);
  });

  if (elements.clearCacheBtn) {
    elements.clearCacheBtn.addEventListener('click', () => handleClearAllCache());
  }

  if (elements.bionicToggleBtn) {
    elements.bionicToggleBtn.addEventListener('click', () => toggleBionicMode());
  }

  if (elements.displayLanguageSelect) {
    elements.displayLanguageSelect.addEventListener('change', (event) => {
      setDisplayLanguage(event.target.value);
    });
  }

  if (elements.languageSelect) {
    elements.languageSelect.addEventListener('change', (event) => {
      const nextLanguage = event.target.value;
      setLanguage(nextLanguage, { skipRender: true });
      if (state.rawText) {
        renderArticle();
        markVisitedWords();
      }
    });
  }

  if (elements.authLoginBtn) {
    elements.authLoginBtn.addEventListener('click', () => {
      void handleCloudAuthLogin();
    });
  }
  if (elements.authLogoutBtn) {
    elements.authLogoutBtn.addEventListener('click', () => {
      void handleCloudAuthLogout();
    });
  }
  if (elements.authModeLoginBtn) {
    elements.authModeLoginBtn.addEventListener('click', () => {
      setAuthMode('login');
    });
  }
  if (elements.authModeRegisterBtn) {
    elements.authModeRegisterBtn.addEventListener('click', () => {
      setAuthMode('register');
    });
  }
  if (elements.authModalSubmit) {
    elements.authModalSubmit.addEventListener('click', () => {
      void handleAuthModalSubmit();
    });
  }
  if (elements.authModalClose) {
    elements.authModalClose.addEventListener('click', () => {
      closeAuthModal();
    });
  }
  if (elements.authModalCancel) {
    elements.authModalCancel.addEventListener('click', () => {
      closeAuthModal();
    });
  }
  if (elements.authModal) {
    elements.authModal.addEventListener('click', (event) => {
      if (event.target === elements.authModal) {
        closeAuthModal();
      }
    });
  }
  if (elements.authUsernameInput) {
    elements.authUsernameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        elements.authPasswordInput?.focus();
      }
    });
  }
  if (elements.authPasswordInput) {
    elements.authPasswordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void handleAuthModalSubmit();
      }
    });
  }

  if (elements.onboardingNextBtn) {
    elements.onboardingNextBtn.addEventListener('click', () => nextOnboardingStep());
  }
  if (elements.onboardingSkipBtn) {
    elements.onboardingSkipBtn.addEventListener('click', () => finishOnboarding());
  }
  if (elements.onboardingOverlay) {
    elements.onboardingOverlay.addEventListener('click', (event) => {
      if (event.target === elements.onboardingOverlay) {
        finishOnboarding();
      }
    });
  }
  if (elements.welcomeOverlay) {
    elements.welcomeOverlay.addEventListener('click', (event) => {
      if (event.target.closest('.welcome-skip-control')) {
        return;
      }
      void advanceWelcomeSequence();
    });
  }

  if (elements.welcomeSkipCheckbox) {
    elements.welcomeSkipCheckbox.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    elements.welcomeSkipCheckbox.addEventListener('change', (event) => {
      setWelcomeSeen(Boolean(event.target.checked));
    });
  }

  elements.closeTooltipBtn.addEventListener('click', () => hideTooltip());
  document.addEventListener('keydown', (event) => {
    if (state.welcome.active) {
      if (event.target === elements.welcomeSkipCheckbox) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        void advanceWelcomeSequence();
      }
      return;
    }
    if (event.key === 'Escape') {
      if (state.onboarding.active) {
        finishOnboarding();
        return;
      }
      if (elements.authModal?.getAttribute('aria-hidden') === 'false') {
        closeAuthModal();
        return;
      }
      if (isConversationArchiveDetailOpen()) {
        closeConversationArchiveDetail();
        return;
      }
      hideTooltip();
      toggleSavedLogDrawer(false);
    }
  });

  window.addEventListener('scroll', handleTooltipReposition, { passive: true, capture: true });
  window.addEventListener('resize', handleTooltipReposition);
  window.addEventListener('scroll', handleOnboardingViewportChange, { passive: true, capture: true });
  window.addEventListener('resize', handleOnboardingViewportChange);
  document.addEventListener('scroll', handleTooltipReposition, { passive: true, capture: true });
  if (elements.articleContainer) {
    elements.articleContainer.addEventListener('scroll', handleTooltipReposition, { passive: true });
    elements.articleContainer.addEventListener('copy', handleArticleCopy);
    elements.articleContainer.addEventListener('mouseup', () => scheduleSelectionLookup());
    elements.articleContainer.addEventListener('touchend', () => scheduleSelectionLookup(), { passive: true });
  }
  if (elements.wordList) {
    elements.wordList.addEventListener('scroll', handleTooltipReposition, { passive: true });
    elements.wordList.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('button[data-remove-pending-word]');
      if (!deleteBtn) {
        return;
      }
      removePendingWord(deleteBtn.dataset.removePendingWord || '');
    });
  }
  const repositionDrawer = () => positionAssistantDrawer();
  window.addEventListener('scroll', repositionDrawer, { passive: true });
  window.addEventListener('resize', repositionDrawer);

  elements.tooltip.addEventListener('click', (event) => {
    if (event.target === elements.tooltip) {
      hideTooltip();
    }
  });

  elements.exportBtn.addEventListener('click', () => {
    if (!state.articleId) {
      setExportStatus('请先载入文章后再保存生词。');
      return;
    }
    if (getPendingWordEntries().length === 0) {
      setExportStatus('尚无生词可保存，请先在文章中点击单词。');
      return;
    }
    saveCurrentWordsToLog();
  });

  if (elements.savedLogToggleBtn) {
    elements.savedLogToggleBtn.addEventListener('click', () => {
      toggleSavedLogDrawer(true);
    });
  }

  if (elements.savedLogCloseBtn) {
    elements.savedLogCloseBtn.addEventListener('click', () => {
      toggleSavedLogDrawer(false);
    });
  }

  if (elements.savedLogBackdrop) {
    elements.savedLogBackdrop.addEventListener('click', () => {
      toggleSavedLogDrawer(false);
    });
  }

  if (elements.savedLogDateBtn) {
    elements.savedLogDateBtn.addEventListener('click', () => {
      if (state.savedLogDateFilter) {
        setSavedLogDateFilter('');
        refreshSavedLogPanel();
        return;
      }
      if (!elements.savedLogDateInput) {
        return;
      }
      if (typeof elements.savedLogDateInput.showPicker === 'function') {
        elements.savedLogDateInput.showPicker();
        return;
      }
      elements.savedLogDateInput.click();
    });
  }

  if (elements.savedLogDateInput) {
    elements.savedLogDateInput.addEventListener('change', (event) => {
      setSavedLogDateFilter(event.target.value || '');
      refreshSavedLogPanel();
    });
  }

  if (elements.clearSavedBtn) {
    elements.clearSavedBtn.addEventListener('click', () => {
      if (state.savedLogTab === 'conversations') {
        clearCurrentConversationLog();
      } else {
        clearCurrentSavedLog();
      }
    });
  }

  if (elements.savedLogWordsTab) {
    elements.savedLogWordsTab.addEventListener('click', (event) => {
      const rect = elements.savedLogWordsTab.getBoundingClientRect();
      const pointerX = Number(event.clientX);
      const isToggleClick = Number.isFinite(pointerX) && (rect.right - pointerX) <= 28;

      if (state.savedLogTab !== 'words') {
        setSavedLogTab('words');
      }

      if (isToggleClick) {
        event.stopPropagation();
        toggleSavedWordLanguageMenu();
        return;
      }

      toggleSavedWordLanguageMenu(false);
    });
  }

  if (elements.savedLogConversationsTab) {
    elements.savedLogConversationsTab.addEventListener('click', () => {
      toggleSavedWordLanguageMenu(false);
      setSavedLogTab('conversations');
    });
  }

  if (elements.savedLogWordLanguageToggle && elements.savedLogWordLanguageToggle !== elements.savedLogWordsTab) {
    elements.savedLogWordLanguageToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleSavedWordLanguageMenu();
    });
  }

  if (elements.savedLogWordLanguageTabs) {
    elements.savedLogWordLanguageTabs.addEventListener('click', (event) => {
      const tab = event.target.closest('button[data-word-language-filter]');
      if (!tab) {
        return;
      }
      setSavedLogWordLanguageFilter(tab.dataset.wordLanguageFilter || 'all');
      toggleSavedWordLanguageMenu(false);
      refreshSavedLogPanel();
    });
  }

  document.addEventListener('click', (event) => {
    if (elements.savedLogWordLanguageTabs?.hidden) {
      return;
    }
    if (event.target.closest('#savedLogWordsTab') || event.target.closest('#savedLogWordLanguageTabs')) {
      return;
    }
    toggleSavedWordLanguageMenu(false);
  });

  if (elements.savedWordList) {
    elements.savedWordList.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('button[data-remove-word]');
      if (!deleteBtn) {
        return;
      }
      removeSavedWord(deleteBtn.dataset.removeDate || '', deleteBtn.dataset.removeWord || '');
    });
  }

  if (elements.savedConversationList) {
    elements.savedConversationList.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('button[data-remove-conversation]');
      if (deleteBtn) {
        removeSavedConversation(deleteBtn.dataset.removeDate || '', deleteBtn.dataset.removeConversation || '');
        return;
      }
      const card = event.target.closest('[data-open-conversation]');
      if (!card) {
        return;
      }
      openConversationArchiveDetail(card.dataset.openDate || '', card.dataset.openConversation || '');
    });

    elements.savedConversationList.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      if (event.target.closest?.('button[data-remove-conversation]')) {
        return;
      }
      const card = event.target.closest?.('[data-open-conversation]');
      if (!card) {
        return;
      }
      event.preventDefault();
      openConversationArchiveDetail(card.dataset.openDate || '', card.dataset.openConversation || '');
    });
  }

  if (elements.conversationDetailCloseBtn) {
    elements.conversationDetailCloseBtn.addEventListener('click', () => {
      closeConversationArchiveDetail();
    });
  }

  if (elements.conversationDetailModal) {
    elements.conversationDetailModal.addEventListener('click', (event) => {
      if (event.target === elements.conversationDetailModal) {
        closeConversationArchiveDetail();
      }
    });
  }

  if (elements.conversationDetailReflection) {
    elements.conversationDetailReflection.addEventListener('input', (event) => {
      updateActiveConversationReflection(event.target.value || '');
    });
  }

  if (elements.conversationDetailReflectionConfirmBtn) {
    elements.conversationDetailReflectionConfirmBtn.addEventListener('click', () => {
      confirmActiveConversationReflection();
    });
  }

  bindSavedLogSwipeGesture();

  bindAssistantEvents();
}

function bindAssistantEvents() {
  if (elements.aiSendBtn) {
    elements.aiSendBtn.addEventListener('click', () => handleAssistantSend());
  }

  if (elements.aiUserInput) {
    elements.aiUserInput.addEventListener('compositionstart', () => {
      assistantInputComposing = true;
    });
    elements.aiUserInput.addEventListener('compositionend', () => {
      assistantInputComposing = false;
    });
    elements.aiUserInput.addEventListener('keydown', (event) => {
      const composing = assistantInputComposing || event.isComposing || event.keyCode === 229;
      if (composing) {
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleAssistantSend();
        elements.aiUserInput.style.height = '';
        elements.aiUserInput.style.overflowY = 'hidden';
      }
    });
    elements.aiUserInput.addEventListener('input', () => {
      const el = elements.aiUserInput;
      el.style.height = '';
      el.style.overflowY = 'hidden';
      el.style.height = el.scrollHeight + 'px';
      el.style.overflowY = el.scrollHeight > 180 ? 'auto' : 'hidden';
    });
  }

  if (elements.aiToggleBtn) {
    elements.aiToggleBtn.addEventListener('click', () => toggleAssistantDrawer());
  }

  if (elements.aiCloseBtn) {
    elements.aiCloseBtn.addEventListener('click', () => toggleAssistantDrawer(false));
  }

  if (elements.drawerSizeControl) {
    elements.drawerSizeControl.addEventListener('input', (event) => {
      applyDrawerSize(event.target.value);
    });
  }

  if (elements.aiSettingsBtn) {
    elements.aiSettingsBtn.addEventListener('click', () => toggleSettingsPanel());
  }

  initEmojiPicker();

  document.addEventListener('click', (event) => {
    if (
      elements.aiSettingsPanel &&
      !elements.aiSettingsPanel.hidden &&
      !elements.aiSettingsPanel.contains(event.target) &&
      event.target !== elements.aiSettingsBtn
    ) {
      elements.aiSettingsPanel.hidden = true;
    }
  });

  if (elements.renameAssistantBtn) {
    elements.renameAssistantBtn.addEventListener('click', () => openRenameModal('assistant'));
  }
  if (elements.renameAssistantBtnTop) {
    elements.renameAssistantBtnTop.addEventListener('click', () => openRenameModal('app'));
  }
  if (elements.renameModalClose) {
    elements.renameModalClose.addEventListener('click', () => closeRenameModal());
  }
  if (elements.renameModalCancel) {
    elements.renameModalCancel.addEventListener('click', () => closeRenameModal());
  }
  if (elements.renameModalSave) {
    elements.renameModalSave.addEventListener('click', () => handleRenameAssistant());
  }
  if (elements.assistantRenameModal) {
    elements.assistantRenameModal.addEventListener('click', (event) => {
      if (event.target === elements.assistantRenameModal) {
        closeRenameModal();
      }
    });
  }
  if (elements.assistantNameInput) {
    elements.assistantNameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleRenameAssistant();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRenameModal();
      }
    });
  }

  if (elements.clearConversationBtn) {
    elements.clearConversationBtn.addEventListener('click', () => handleClearConversation());
  }

  if (elements.exportReportBtn) {
    elements.exportReportBtn.addEventListener('click', () => exportConversationReport());
  }

  if (elements.bookTestBtn) {
    elements.bookTestBtn.addEventListener('click', () => openBookTestModal());
  }
  if (elements.bookTestClose) {
    elements.bookTestClose.addEventListener('click', () => closeBookTestModal());
  }
  if (elements.bookTestCancel) {
    elements.bookTestCancel.addEventListener('click', () => closeBookTestModal());
  }
  if (elements.bookTestSubmit) {
    elements.bookTestSubmit.addEventListener('click', () => handleBookTestSubmit());
  }
  if (elements.bookLanguage) {
    elements.bookLanguage.addEventListener('change', (event) => {
      updateBookLevelOptions(event.target.value);
    });
  }
  if (elements.bookTestModal) {
    elements.bookTestModal.addEventListener('click', (event) => {
      if (event.target === elements.bookTestModal) {
        closeBookTestModal();
      }
    });
  }

  if (elements.playUkBtn) {
    elements.playUkBtn.addEventListener('click', () => {
      state.pronunciationAccent = 'uk';
      if (tooltipState.detail) {
        playPronunciation(tooltipState.detail, 'uk');
      }
    });
  }
  if (elements.playUsBtn) {
    elements.playUsBtn.addEventListener('click', () => {
      if (tooltipState.detail) {
        const wordText = tooltipState.detail.requested || tooltipState.detail.word || '';
        const wordLanguage = normalizeWordLanguage(tooltipState.detail.language, wordText);
        if (wordLanguage === 'en') {
          state.pronunciationAccent = 'us';
          playPronunciation(tooltipState.detail, 'us');
        } else {
          playPronunciation(tooltipState.detail);
        }
      }
    });
  }
}

function playClearCacheAnimation() {
  if (clearCacheAnimationTimer) {
    window.clearTimeout(clearCacheAnimationTimer);
  }
  if (elements.appShell) {
    elements.appShell.classList.remove('cache-clearing');
    void elements.appShell.offsetWidth;
    elements.appShell.classList.add('cache-clearing');
  }
  if (elements.clearCacheBtn) {
    elements.clearCacheBtn.classList.remove('cache-clearing');
    void elements.clearCacheBtn.offsetWidth;
    elements.clearCacheBtn.classList.add('cache-clearing');
  }
  if (elements.exportStatus) {
    elements.exportStatus.classList.remove('cache-cleared-highlight');
    void elements.exportStatus.offsetWidth;
    elements.exportStatus.classList.add('cache-cleared-highlight');
  }
  clearCacheAnimationTimer = window.setTimeout(() => {
    elements.appShell?.classList.remove('cache-clearing');
    elements.clearCacheBtn?.classList.remove('cache-clearing');
    elements.exportStatus?.classList.remove('cache-cleared-highlight');
  }, 520);
}

function handleClearAllCache() {
  state.articleId = null;
  state.rawText = '';
  state.tokens = [];
  state.clickedWords = new Map();
  state.savedWordLog = new Map();
  state.savedConversationLog = buildConversationLogMap(
    normalizeConversationLogByDate(loadConversationLog('global-assistant')),
  );
  state.savedLogDateFilter = '';
  state.savedLogWordLanguageFilter = 'all';
  state.activeConversationArchive = null;
  closeConversationArchiveDetail();
  state.assistant.articleContext = '';
  state.assistant.report = '';
  state.assistant.messages = [];
  state.assistant.hintsConsumed = false;
  if (elements.textInput) {
    elements.textInput.value = '';
  }
  syncAssistantInputPlaceholder();
  hideTooltip();
  renderAssistantMessages();
  refreshWordList();
  refreshSavedLogPanel();
  updateReportExportState();
  setReportStatus('');
  setAssistantStatus('');
  renderArticle();
  setExportStatus('已清空当前载入文本，可重新粘贴新文本。');
  playClearCacheAnimation();
}

const BOOK_LEVEL_OPTIONS = {
  en: [
    { value: 'A1-A2', label: 'A1~A2（入门-初级）' },
    { value: 'B1-B2', label: 'B1~B2（中级-中高级）' },
    { value: 'C1-C2', label: 'C1~C2（高级-超高级）' },
    { value: 'Native', label: '母语' },
  ],
  zh: [
    { value: 'HSK1', label: 'HSK1' },
    { value: 'HSK2', label: 'HSK2' },
    { value: 'HSK3', label: 'HSK3' },
    { value: 'HSK4', label: 'HSK4' },
    { value: 'HSK5', label: 'HSK5' },
    { value: 'HSK6', label: 'HSK6' },
    { value: 'Native', label: '母语' },
  ],
  ja: [
    { value: 'N5-N4', label: 'N5~N4（入门-初级）' },
    { value: 'N3', label: 'N3（中级）' },
    { value: 'N2', label: 'N2（中高级）' },
    { value: 'N1', label: 'N1（高级）' },
    { value: 'Native', label: '母语' },
  ],
};

function updateBookLevelOptions(language) {
  if (!elements.bookLevel) return;
  const options = BOOK_LEVEL_OPTIONS[language] || BOOK_LEVEL_OPTIONS.en;
  elements.bookLevel.innerHTML = '';
  options.forEach((opt, index) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (index === Math.floor(options.length / 2)) {
      option.selected = true;
    }
    elements.bookLevel.appendChild(option);
  });
}

function openBookTestModal() {
  if (!elements.bookTestModal) {
    return;
  }
  if (bookTestOpenTimer) {
    window.clearTimeout(bookTestOpenTimer);
    bookTestOpenTimer = null;
  }
  if (bookTestCloseTimer) {
    window.clearTimeout(bookTestCloseTimer);
    bookTestCloseTimer = null;
  }
  elements.bookTestModal.classList.remove('book-test-opening');
  elements.bookTestModal.classList.remove('book-test-closing');
  elements.bookTestModal.setAttribute('aria-hidden', 'false');
  window.requestAnimationFrame(() => {
    if (!elements.bookTestModal || elements.bookTestModal.getAttribute('aria-hidden') === 'true') {
      return;
    }
    elements.bookTestModal.classList.add('book-test-opening');
    bookTestOpenTimer = window.setTimeout(() => {
      elements.bookTestModal?.classList.remove('book-test-opening');
      bookTestOpenTimer = null;
    }, 220);
  });
  setBookTestStatus('');
  renderBookResults();
  // 初始化语言等级选项
  const lang = elements.bookLanguage?.value || 'en';
  updateBookLevelOptions(lang);
  elements.bookPersonality?.focus();
}

function closeBookTestModal() {
  if (!elements.bookTestModal) {
    return;
  }
  if (elements.bookTestModal.getAttribute('aria-hidden') === 'true') {
    return;
  }
  if (bookTestOpenTimer) {
    window.clearTimeout(bookTestOpenTimer);
    bookTestOpenTimer = null;
  }
  elements.bookTestModal.classList.remove('book-test-opening');
  elements.bookTestModal.classList.add('book-test-closing');
  if (bookTestCloseTimer) {
    window.clearTimeout(bookTestCloseTimer);
  }
  bookTestCloseTimer = window.setTimeout(() => {
    elements.bookTestModal?.setAttribute('aria-hidden', 'true');
    elements.bookTestModal?.classList.remove('book-test-closing');
    bookTestCloseTimer = null;
  }, 160);
  setBookTestStatus('');
}

function setBookTestStatus(message) {
  if (!elements.bookTestStatus) {
    return;
  }
  elements.bookTestStatus.textContent = message;
}

function setBookTestBusy(isBusy) {
  if (elements.bookTestSubmit) {
    elements.bookTestSubmit.disabled = isBusy;
  }
  if (elements.bookTestClose) {
    elements.bookTestClose.disabled = isBusy;
  }
  if (elements.bookTestCancel) {
    elements.bookTestCancel.disabled = isBusy;
  }
}

const LEVEL_DESCRIPTIONS = {
  en: {
    'A1-A2': 'A1（入门级）能理解非常基本的短语和句子；A2（初级）能理解常用表达和简单日常沟通',
    'B1-B2': 'B1（中级）能理解工作、学校等熟悉事物；B2（中高级）能理解复杂文章，与母语人士流利沟通',
    'C1-C2': 'C1（高级）能理解长篇文章和隐含意义；C2（精通级）达到母语人士水平',
    'Native': '母语水平，可阅读任何难度的原版书籍',
  },
  zh: {
    'HSK1': 'HSK一级：能理解和使用非常简单的汉语词语和句子，词汇量约120个',
    'HSK2': 'HSK二级：能就常见话题进行简单直接的交流，词汇量约300个',
    'HSK3': 'HSK三级：能完成生活、学习、工作等方面的基本交际任务，词汇量约600个',
    'HSK4': 'HSK四级：能就较复杂的话题进行交流，表达比较规范得体，词汇量约1200个',
    'HSK5': 'HSK五级：能就较抽象或专业的话题进行讨论、评价和发表看法，词汇量约2500个',
    'HSK6': 'HSK六级：能自如地进行各种社会交际活动，接近母语者水平，词汇量5000个以上',
    'Native': '母语水平，可阅读任何难度的中文书籍',
  },
  ja: {
    'N5-N4': 'N5能理解基础课堂日语；N4能读懂简单汉字的句子，理解慢速会话',
    'N3': 'N3能理解日常生活中常用的会话和文章',
    'N2': 'N2能在广泛的日常场景中使用日语进行交流和理解',
    'N1': 'N1能理解报纸社论、评论等复杂文章，理解文章构成和表达意图',
    'Native': '母语水平，可阅读任何难度的日文书籍',
  },
};

function buildBookTestPrompt() {
  const personality = elements.bookPersonality?.value.trim() || '未填写';
  const interests = elements.bookInterests?.value.trim() || '未填写';
  const language = elements.bookLanguage?.value || 'en';
  const level = elements.bookLevel?.value || 'B1-B2';
  const topic = elements.bookTopic?.value.trim() || '未填写';
  
  const langNames = { en: '英文', zh: '中文', ja: '日文' };
  const langName = langNames[language] || '英文';
  const levelSystems = {
    en: 'CEFR等级',
    zh: 'HSK等级',
    ja: 'JLPT等级',
  };
  const levelSystem = levelSystems[language] || 'CEFR等级';
  const levelDesc = LEVEL_DESCRIPTIONS[language]?.[level] || '';
  
  return [
    `你是一名专业的${langName}阅读推荐顾问，请基于下面的用户画像推荐 3 本${langName}原版书籍或读物：`,
    `性格：${personality}`,
    `兴趣：${interests}`,
    `${levelSystem}：${level}`,
    `等级说明：${levelDesc}`,
    `近期关注话题：${topic}`,
    ``,
    `【重要】请严格按照用户的语言等级（${level}）推荐难度匹配的书籍：`,
    `- 书籍的词汇量、句子复杂度、内容深度必须符合${level}水平`,
    `- 不要推荐超出该等级阅读能力的书籍`,
    ``,
    `请严格按以下格式输出（每本书两行）：`,
    `1. 《书名》 - 作者名`,
    `难度：${level}，推荐理由：1-2句话`,
    ``,
    `要求：第一行只写书名和作者，不要加其他内容。推荐的书籍必须是${langName}原版，用中文回答。`
  ].join('\n');
}

function renderBookResults() {
  if (!elements.bookTestResults) {
    return;
  }
  if (!state.bookRecs) {
    elements.bookTestResults.innerHTML = '<p class="assistant-placeholder">填写信息并点击生成推荐，会在此显示3本书。</p>';
    return;
  }
  const fragment = document.createDocumentFragment();
  state.bookRecs.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'book-result-item';
    const title = document.createElement('h4');
    // 标题只显示书名和作者
    const cleanTitle = (item.title || '书名待补充').replace(/\*+/g, '');
    const authorPart = item.author ? ` - ${item.author}` : '';
    title.textContent = `${index + 1}. ${cleanTitle}${authorPart}`;
    const meta = document.createElement('p');
    meta.textContent = `难度：${item.level || '未标注'}`;
    const reason = document.createElement('p');
    reason.textContent = item.reason || '推荐理由待补充';
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(reason);
    fragment.appendChild(card);
  });
  elements.bookTestResults.innerHTML = '';
  elements.bookTestResults.appendChild(fragment);
}

function parseBookList(text) {
  if (!text) {
    return null;
  }
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  let current = null;

  const applyMeta = (target, line) => {
    if (!line) {
      return;
    }
    const authorMatch = line.match(/作者[:：]?\s*([^；;，·]+)/);
    // 扩展难度匹配，支持CEFR、HSK、JLPT等级
    const levelMatch = line.match(/难度[:：]?\s*([A-C][1-2][-~][A-C]?[1-2]?|HSK[1-6]|N[1-5][-~]?N?[1-5]?|初级|中级|高级|入门|中高级|超高级)/i)
      || line.match(/(A[1-2][-~]A?[1-2]?|B[1-2][-~]B?[1-2]?|C[1-2][-~]C?[1-2]?|HSK[1-6]|N[1-5][-~]N?[1-5]?|初级|中级|高级|入门|中高级|超高级)/i);
    const reasonPart = line.replace(authorMatch?.[0] || '', '')
      .replace(/难度[:：]?\s*[^\s，；;·]+/, '')
      .replace(/推荐理由[:：]?/, '')
      .trim();

    if (authorMatch && authorMatch[1]) {
      target.author = authorMatch[1].trim().replace(/\*+/g, '');
    }
    if (levelMatch && levelMatch[1]) {
      target.level = levelMatch[1].replace(/\*+/g, '');
    }
    if (reasonPart) {
      const cleanReason = reasonPart.replace(/\*+/g, '');
      target.reason = target.reason
        ? `${target.reason}；${cleanReason}`
        : cleanReason;
    }
  };

  lines.forEach((line) => {
    const headMatch = line.match(/^\d+[.\-、]\s*(.+)$/);
    const isNewItem = Boolean(headMatch) || (!current && line);

    if (isNewItem) {
      if (current) {
        items.push(current);
      }
      const rawTitle = headMatch ? headMatch[1] : line;
      // 去除标题中的星号，并提取书名和作者
      let cleanTitle = (rawTitle || '书名待补充').replace(/\*+/g, '');
      
      // 尝试从标题中提取作者（格式：《书名》 - 作者 或 《书名》/ 作者）
      const titleAuthorMatch = cleanTitle.match(/^(《[^》]+》|「[^」]+」|"[^"]+"|『[^』]+』|[^\/\-–—]+?)\s*[\/\-–—]\s*([^\/\-–—]+?)(?:\s*[\/\-–—]|$)/);
      let extractedAuthor = '';
      if (titleAuthorMatch) {
        cleanTitle = titleAuthorMatch[1].trim();
        extractedAuthor = titleAuthorMatch[2].trim().replace(/\*+/g, '');
      }
      
      current = {
        title: cleanTitle,
        author: extractedAuthor,
        level: '',
        reason: '',
      };
      applyMeta(current, line);
      return;
    }

    if (!current) {
      return;
    }
    applyMeta(current, line);
  });

  // fallback: if still 1项且包含明显分号分隔的多个书名，尝试再切
  if (items.length <= 1 && text.includes('；')) {
    const parts = text.split(/；+/).map((p) => p.trim()).filter(Boolean);
    parts.forEach((part) => {
      if (!part) return;
      const titleMatch = part.match(/《([^》]+)》|“([^”]+)”|\"([^\"]+)\"/);
      const title = titleMatch?.[1] || titleMatch?.[2] || titleMatch?.[3] || part;
      items.push({
        title,
        author: '',
        level: '',
        reason: part,
      });
    });
  }

  if (current) {
    items.push(current);
  }

  if (items.length === 0) {
    return null;
  }
  // 获取用户选择的等级作为默认值
  const defaultLevel = elements.bookLevel?.value || '';
  
  // 清理标题，只保留书名和作者
  const cleanBookTitle = (title) => {
    if (!title) return '书名待补充';
    // 去除星号
    let clean = title.replace(/\*+/g, '').trim();
    // 如果标题包含多个部分（用/或-分隔），只保留前两个（书名和作者）
    const parts = clean.split(/\s*[\/\-–—]\s*/);
    if (parts.length > 2) {
      clean = `${parts[0]} - ${parts[1]}`;
    }
    return clean;
  };
  
  const normalized = items.slice(0, 3).map((item) => ({
    ...item,
    title: cleanBookTitle(item.title),
    author: (item.author || '').replace(/\*+/g, '').trim(),
    reason: (item.reason || '推荐理由待补充').replace(/\*+/g, ''),
    level: item.level || defaultLevel || '未标注',
  }));
  return normalized;
}

async function handleBookTestSubmit() {
  if (!elements.bookTestSubmit) {
    return;
  }
  setBookTestStatus('生成中，请稍候...');
  setBookTestBusy(true);
  try {
    const prompt = buildBookTestPrompt();
    const payload = {
      model: state.assistant.model || DEFAULT_ASSISTANT_CONFIG.model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: '你是简洁的英文书籍推荐顾问，中文输出。' },
        { role: 'user', content: prompt },
      ],
    };
    const endpoint = state.assistant.proxyUrl || DEFAULT_ASSISTANT_CONFIG.proxyUrl;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const reply = data?.reply ?? data?.choices?.[0]?.message?.content ?? '';
    const parsed = parseBookList(reply);
    if (!parsed || parsed.length === 0) {
      setBookTestStatus('未解析到有效推荐，请重试或补充信息。');
      return;
    }
    state.bookRecs = parsed;
    renderBookResults();
    setBookTestStatus('已生成 3 本推荐书籍。');
  } catch (error) {
    console.error('[BookTest] failed:', error);
    setBookTestStatus('生成失败，请确认已运行后端代理并重试。');
  } finally {
    setBookTestBusy(false);
  }
}

function buildConversationReport(messages, { min = 200, max = 300 } = {}) {
  if (!messages || messages.length === 0) {
    return null;
  }
  const users = messages.filter((m) => m.role === 'user').map((m) => m.content.trim()).filter(Boolean);
  const assistants = messages.filter((m) => m.role === 'assistant').map((m) => m.content.trim()).filter(Boolean);

  const userSummary = users.slice(-4).join('；');
  const assistantSummary = assistants.slice(-4).join('；');
  const excerptPairs = messages.slice(-4).map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content.trim()}`);
  const excerpt = excerptPairs.join(' / ');

  let body = [
    `对话摘要：${userSummary || '用户围绕文章内容提出疑问、复述要点。'}`,
    `助手回复要点：${assistantSummary || '助手提供释义、例句和复述/自测建议。'}`,
    `对话摘录：${excerpt || '对话较短，暂无摘录。'}`,
    '后续建议：整理笔记、生词与错题，结合原文再做1-2个自测问题。'
  ].join(' ');

  if (body.length < min) {
    const filler = '（对话较短，可在此补充阅读心得或难点记录。）';
    while (body.length < min && body.length + filler.length <= max) {
      body += ` ${filler}`;
    }
    if (body.length < min) {
      body = `${body} ${filler}`.slice(0, max);
    }
  }
  if (body.length > max) {
    body = `${body.slice(0, max - 1)}…`;
  }

  return `对话内容总结\n\n${body}`;
}

function buildConversationDigest(messages, { maxTurns = 14, maxCharsPerTurn = 220 } = {}) {
  const normalized = (messages || [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && String(m?.content || '').trim())
    .slice(-maxTurns)
    .map((m) => {
      const role = m.role === 'user' ? '用户' : '助手';
      const content = String(m.content || '').replace(/\s+/g, ' ').trim();
      const clipped = content.length > maxCharsPerTurn
        ? `${content.slice(0, maxCharsPerTurn)}...`
        : content;
      return `${role}：${clipped}`;
    });
  return normalized.join('\n');
}

function parseStructuredSummaryReply(text) {
  if (!text) {
    return null;
  }
  const raw = String(text).trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || raw).trim();
  const attempts = [candidate];
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) {
    attempts.push(candidate.slice(start, end + 1));
  }
  for (const item of attempts) {
    try {
      return JSON.parse(item);
    } catch (error) {
      continue;
    }
  }
  return null;
}

function trimArchiveTitle(value, maxChars = ARCHIVE_TITLE_MAX_CHARS) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  const compact = raw
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/[“”"'`~!！?？,，.。:：;；、()（）\[\]{}]/g, '')
    .replace(/\s+/g, '');
  const chars = Array.from(compact);
  return chars.slice(0, maxChars).join('');
}

function buildArchiveTitleFromMessages(messages) {
  const latestUser = [...(messages || [])]
    .reverse()
    .find((m) => m?.role === 'user' && String(m?.content || '').trim());
  const candidate = trimArchiveTitle(latestUser?.content || '', ARCHIVE_TITLE_MAX_CHARS);
  if (candidate) {
    return candidate;
  }
  return trimArchiveTitle(t('archiveDefaultTitle'), ARCHIVE_TITLE_MAX_CHARS) || '阅读随记';
}

function buildLocalStructuredSummary(messages) {
  const users = messages.filter((m) => m.role === 'user').map((m) => m.content.trim()).filter(Boolean);
  const assistants = messages.filter((m) => m.role === 'assistant').map((m) => m.content.trim()).filter(Boolean);
  const userSummary = users.slice(-3).join('；') || '用户围绕文章内容进行了提问、复述与反思。';
  const assistantSummary = assistants.slice(-3).join('；') || '助手围绕阅读内容提供了解释、反馈与建议。';
  const neutral = messages.length >= 4
    ? '对话结构完整，问题与反馈基本对应；可继续补充具体例子与自测结果以增强可迁移性。'
    : '对话轮次较少，已形成初步理解；建议继续追问关键概念并补充一到两个应用场景。';

  return {
    title: buildArchiveTitleFromMessages(messages),
    userAssistantSummary: `用户想法：${userSummary} 助手回复：${assistantSummary}`,
    neutralEvaluation: neutral,
  };
}

function normalizeStructuredSummary(summary, messages) {
  const fallback = buildLocalStructuredSummary(messages);
  if (!summary || typeof summary !== 'object') {
    return fallback;
  }
  const userAssistantSummary = String(
    summary.userAssistantSummary
      || summary.summary
      || summary.user_summary
      || '',
  ).trim();
  const neutralEvaluation = String(
    summary.neutralEvaluation
      || summary.evaluation
      || summary.neutral_evaluation
      || '',
  ).trim();
  const title = trimArchiveTitle(
    summary.title
      || summary.headline
      || summary.topic
      || summary.label
      || '',
    ARCHIVE_TITLE_MAX_CHARS,
  );

  return {
    title: title || fallback.title,
    userAssistantSummary: userAssistantSummary || fallback.userAssistantSummary,
    neutralEvaluation: neutralEvaluation || fallback.neutralEvaluation,
  };
}

async function requestStructuredConversationSummary(messages) {
  const digest = buildConversationDigest(messages);
  if (!digest) {
    return null;
  }
  const payload = {
    model: state.assistant.model || DEFAULT_ASSISTANT_CONFIG.model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: [
          '你是阅读对话归档助手。',
          '你只能输出 JSON，不要输出任何解释或 Markdown。',
          'JSON 必须严格包含三个字段：',
          '{"title":"...","userAssistantSummary":"...","neutralEvaluation":"..."}',
          `title 必须是中文短标题，不超过${ARCHIVE_TITLE_MAX_CHARS}个汉字，语义完整、避免残句。`,
          '其余两项均为中文，客观、简洁，总字数控制在220字内。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `请基于以下对话生成结构化归档：\n${digest}`,
      },
    ],
  };

  const endpoint = state.assistant.proxyUrl || DEFAULT_ASSISTANT_CONFIG.proxyUrl;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  const reply = data?.reply ?? data?.choices?.[0]?.message?.content ?? '';
  return parseStructuredSummaryReply(reply);
}

function formatStructuredReport(summary, { source = 'ai' } = {}) {
  const sourceLabel = source === 'ai' ? 'DeepSeek 结构化生成' : '本地兜底生成';
  return [
    '阅读助手对话存档',
    `标题：${summary.title || trimArchiveTitle(t('archiveDefaultTitle'), ARCHIVE_TITLE_MAX_CHARS)}`,
    `生成方式：${sourceLabel}`,
    `存档时间：${new Date().toLocaleString()}`,
    '',
    '1) 你的想法与 AI 助手回复的总结',
    summary.userAssistantSummary,
    '',
    '2) 对话过程的中性、客观评价',
    summary.neutralEvaluation,
  ].join('\n');
}

function buildConversationArchiveId(messages) {
  const normalized = (messages || [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && String(m?.content || '').trim())
    .map((m) => `${m.role}:${String(m.content || '').trim()}`)
    .join('\n');
  return createHash(`conversation:${state.articleId || 'global'}:${normalized}`);
}

function getActiveConversationLogArticleId() {
  return state.articleId || 'global-assistant';
}

function archiveConversationReport(entry) {
  const articleId = getActiveConversationLogArticleId();
  const normalizedEntry = {
    ...entry,
    title: trimArchiveTitle(entry?.title || entry?.structured?.title || '', ARCHIVE_TITLE_MAX_CHARS)
      || trimArchiveTitle(t('archiveDefaultTitle'), ARCHIVE_TITLE_MAX_CHARS),
  };
  const store = loadConversationLog(articleId);
  const normalizedStore = (store && typeof store === 'object') ? { ...store } : {};
  const dateKey = normalizedEntry.dateKey;
  const dayBucket = (normalizedStore[dateKey] && typeof normalizedStore[dateKey] === 'object')
    ? { ...normalizedStore[dateKey] }
    : {};

  if (dayBucket[normalizedEntry.id]) {
    return { duplicate: true, articleId };
  }

  dayBucket[normalizedEntry.id] = normalizedEntry;
  normalizedStore[dateKey] = dayBucket;
  saveConversationLog(articleId, normalizedStore);
  scheduleCloudArticleSync(articleId);
  state.savedConversationLog = buildConversationLogMap(normalizedStore);
  setSavedLogDateFilter(normalizedEntry.dateKey);
  setSavedLogTab('conversations');
  toggleSavedLogDrawer(true);
  return { duplicate: false, articleId };
}

function handleClearConversation() {
  if (!state.assistant.messages.length) {
    setAssistantStatus('暂无对话可清除。');
    return;
  }
  state.assistant.messages = [];
  state.assistant.hintsConsumed = false;
  syncAssistantInputPlaceholder();
  renderAssistantMessages();
  updateReportExportState();
  setAssistantStatus('对话已清除。');
}

async function exportConversationReport() {
  const messages = state.assistant.messages
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && String(m?.content || '').trim());
  if (!messages.length) {
    setReportStatus('暂无可存档的对话内容。');
    return;
  }

  state.assistant.archiving = true;
  updateReportExportState();
  setReportStatus('正在生成结构化存档...');
  try {
    let summary = null;
    let source = 'ai';
    try {
      const parsed = await requestStructuredConversationSummary(messages);
      summary = normalizeStructuredSummary(parsed, messages);
    } catch (error) {
      console.warn('[Archive] structured summary failed, fallback to local:', error);
      summary = buildLocalStructuredSummary(messages);
      source = 'local';
    }

    const report = formatStructuredReport(summary, { source });
    state.assistant.report = report;
    saveConversationReport(state.articleId || 'global-assistant', report);

    const now = Date.now();
    const entry = {
      id: buildConversationArchiveId(messages),
      title: trimArchiveTitle(summary?.title, ARCHIVE_TITLE_MAX_CHARS) || buildArchiveTitleFromMessages(messages),
      savedAt: now,
      dateKey: getDateKeyFromTimestamp(now) || getTodayDateKey(),
      source,
      messageCount: messages.length,
      messages: messages.map((m) => ({ role: m.role, content: String(m.content || '').trim() })),
      structured: summary,
      report,
      reflection: '',
    };
    const { duplicate } = archiveConversationReport(entry);

    if (duplicate) {
      setReportStatus('该对话已存档（已去重）。');
    } else if (source === 'local') {
      setReportStatus('已存档（本地兜底已生效）。');
    } else {
      setReportStatus('已完成存档。');
    }
  } catch (error) {
    console.error('[Archive] export conversation failed:', error);
    setReportStatus('存档失败，请稍后重试。');
  } finally {
    state.assistant.archiving = false;
    updateReportExportState();
  }
}

function updateReportExportState() {
  if (!elements.exportReportBtn) {
    return;
  }
  elements.exportReportBtn.disabled = state.assistant.busy || state.assistant.archiving;
}

function loadArticle(text) {
  const normalizedText = text || '';
  state.rawText = normalizedText;
  state.articleLanguage = detectTextLanguage(normalizedText);
  state.articleId = createHash(normalizedText);

  const session = loadSession(state.articleId);
  const report = loadConversationReport(state.articleId);
  const savedLog = loadSavedWordLog(state.articleId);
  const conversationLog = loadConversationLog(state.articleId);

  state.assistant.articleContext = buildArticleSnippet(normalizedText);

  if (normalizedText.trim()) {
    saveLastArticle(state.articleId, normalizedText, state.language, {
      sourceLanguage: state.articleLanguage,
    });
  }

  if (session) {
    const entries = Object.entries(session).sort(
      (a, b) => (a[1]?.clickedAt ?? 0) - (b[1]?.clickedAt ?? 0),
    );
    state.clickedWords = new Map(entries);
  } else {
    state.clickedWords = new Map();
  }
  const normalizedSavedLog = normalizeSavedWordLogByDate(savedLog);
  state.savedWordLog = buildSavedWordLogMap(normalizedSavedLog);
  saveSavedWordLog(state.articleId, normalizedSavedLog);
  const normalizedConversationLog = normalizeConversationLogByDate(conversationLog);
  state.savedConversationLog = buildConversationLogMap(normalizedConversationLog);
  saveConversationLog(state.articleId, normalizedConversationLog);
  state.savedLogDateFilter = '';
  state.savedLogWordLanguageFilter = 'all';
  state.activeConversationArchive = null;
  closeConversationArchiveDetail();
  state.translationCache = new Map();
  state.japaneseReadingCache = new Map();
  state.japanesePhraseCache = new Map();
  state.selectionCache = new Map();
  state.lastSelectionSignature = '';
  state.lastSelectionAt = 0;
  state.assistant.report = report || '';
  state.assistant.messages = [];
  state.assistant.hintsConsumed = false;
  syncAssistantInputPlaceholder();
  setExportStatus('');
  const contentLabel = getLanguageLabel(state.articleLanguage);
  const statusText = t('capturedContext', { lang: contentLabel, len: state.assistant.articleContext.length });
  setAssistantStatus(statusText);
  updateBionicButton();
  if (report) {
    setReportStatus(t('reportLoaded'));
  } else {
    setReportStatus('');
  }
  updateReportExportState();
  renderAssistantMessages();
  renderArticle();
  refreshWordList();
  refreshSavedLogPanel();
  void syncArticleFromCloud(state.articleId);
}

async function handleFileUpload(file) {
  if (!file) {
    return;
  }
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    await parsePdfFile(file);
    return;
  }
  try {
    const text = await file.text();
    elements.textInput.value = text;
    loadArticle(text);
  } catch (error) {
    console.error('[Upload] parse file failed:', error);
    setPdfStatus('文件读取失败，请重试或使用其他文件。');
  }
}

async function parsePdfFile(file) {
  if (typeof window.pdfjsLib === 'undefined') {
    setPdfStatus('PDF 解析库未加载，请检查网络连接。');
    return;
  }
  try {
    setPdfStatus(`正在解析 ${file.name}...`);
    const buffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setPdfStatus(`解析第 ${pageNumber}/${pdf.numPages} 页...`);
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item?.str || '').join(' ');
      const normalized = cleanupPdfText(pageText);
      pages.push(`【Page ${pageNumber}】\n${normalized}`);
    }

    const finalText = pages.join('\n\n');
    elements.textInput.value = finalText;
    loadArticle(finalText);
    setPdfStatus(`解析完成，共 ${pdf.numPages} 页。`);
  } catch (error) {
    console.error('[PDF] parse error:', error);
    setPdfStatus('解析失败，请确认 PDF 未加密或损坏。');
  }
}

function cleanupPdfText(text) {
  if (!text) {
    return '';
  }
  return text
    .replace(/-\s+/g, '') // remove hyphen line breaks
    .replace(/\s+/g, ' ')
    .trim();
}

function buildArticleSnippet(text, maxChars = 1800) {
  if (!text) {
    return '';
  }
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars)}...`;
}

async function handleAssistantSend() {
  if (!elements.aiUserInput) {
    return;
  }
  if (state.assistant.busy) {
    setAssistantStatus('正在等待上一次回复，请稍候...');
    return;
  }
  const userInput = elements.aiUserInput.value.trim();
  if (!userInput) {
    elements.aiUserInput.focus();
    return;
  }

  const context = String(state.rawText || '').trim()
    || state.assistant.articleContext?.trim?.()
    || '';
  const messages = buildAssistantMessages(userInput, context);
  const payload = {
    model: state.assistant.model || DEFAULT_ASSISTANT_CONFIG.model,
    temperature: 0.7,
    messages,
  };

  if (!state.assistant.hintsConsumed) {
    state.assistant.hintsConsumed = true;
    syncAssistantInputPlaceholder();
  }

  state.assistant.messages.push({ role: 'user', content: userInput });
  renderAssistantMessages();
  updateReportExportState();
  elements.aiUserInput.value = '';
  elements.aiUserInput.focus();

  const endpoint = state.assistant.proxyUrl || DEFAULT_ASSISTANT_CONFIG.proxyUrl;

  const headers = {
    'Content-Type': 'application/json',
  };

  setAssistantStatus('通过后端代理请求...');
  state.assistant.busy = true;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    const reply = data?.reply
      ?? data?.choices?.[0]?.message?.content
      ?? '';
    const cleanReply = sanitizeAssistantReply(reply);
    if (cleanReply) {
      state.assistant.messages.push({ role: 'assistant', content: cleanReply });
      renderAssistantMessages();
      updateReportExportState();
      setAssistantStatus('已收到回复。');
    } else {
      setAssistantStatus('未收到模型回复，请稍后再试。');
    }
  } catch (error) {
    console.error('[Assistant] request failed:', error);
    setAssistantStatus('请求失败，请确认已启动本地后端并正确配置 .env。');
  } finally {
    state.assistant.busy = false;
    updateReportExportState();
  }
}

function buildAssistantMessages(userInput, context) {
  const messages = [
    { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
  ];
  if (context) {
    messages.push({ role: 'system', content: `Current reading context:\n${context}` });
  }
  messages.push({ role: 'user', content: userInput });
  return messages;
}

function sanitizeAssistantReply(raw) {
  return String(raw || '')
    .replace(/\*/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function renderAssistantMessages() {
  if (!elements.aiMessages) {
    return;
  }
  if (state.assistant.messages.length === 0) {
    if (state.assistant.hintsConsumed) {
      elements.aiMessages.innerHTML = '';
      return;
    }
    elements.aiMessages.innerHTML = `<p class="assistant-placeholder">${t('chatPlaceholder')}</p>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  state.assistant.messages.forEach((msg) => {
    const row = document.createElement('div');
    row.className = `assistant-row ${msg.role}`;
    const bubble = document.createElement('div');
    bubble.className = 'assistant-bubble';
    bubble.textContent = msg.content;
    row.appendChild(bubble);
    fragment.appendChild(row);
  });
  elements.aiMessages.innerHTML = '';
  elements.aiMessages.appendChild(fragment);
  elements.aiMessages.scrollTop = elements.aiMessages.scrollHeight;
}

function createHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // convert to 32bit integer
  }
  return `article-${Math.abs(hash)}`;
}

function renderArticle() {
  if (!state.rawText) {
    elements.articleContainer.classList.add('empty-state');
    elements.articleContainer.innerHTML = '<p>请先上传或粘贴英文 / 中文 / 日文文本，点击词语即可按阅读语言显示释义（英文内置词典）。</p>';
    return;
  }
  elements.articleContainer.classList.remove('empty-state');
  elements.articleContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const tokens = tokenize(state.rawText, state.articleLanguage);
  state.tokens = tokens;

  // 为ADHD模式计算每个句子中需要加深的词
  const bionicIndices = state.bionicEnabled ? computeBionicIndices(tokens) : new Set();

  tokens.forEach((token, index) => {
    if (token.type === 'word') {
      const span = document.createElement('span');
      span.className = 'word';
      span.dataset.word = token.value;
      span.dataset.tokenIndex = String(index);
      const isEnglish = isEnglishWord(token.value);
      if (isEnglish) {
        span.classList.add('en-word');
      }
      const shouldBionic = state.bionicEnabled && (isEnglish || bionicIndices.has(index));
      if (shouldBionic) {
        span.classList.add('bionic');
        if (isEnglish) {
          applyBionicMarkup(span, token.value);
        } else {
          applyBionicMarkupCJK(span, token.value);
        }
      } else {
        span.textContent = token.value;
      }
      span.addEventListener('click', () => handleWordClick(span, token.value, index));
      if (state.clickedWords.has(normalizeWordKey(token.value))) {
        span.classList.add('clicked');
      }
      fragment.appendChild(span);
    } else {
      // 处理换行符，保留原文格式
      const parts = token.value.split('\n');
      parts.forEach((part, i) => {
        if (part) {
          fragment.append(part);
        }
        if (i < parts.length - 1) {
          fragment.appendChild(document.createElement('br'));
        }
      });
    }
  });

  elements.articleContainer.appendChild(fragment);
}

function computeBionicIndices(tokens) {
  const indices = new Set();
  const sentenceEnders = /[。．.！!？?；;]/;
  let sentenceStart = 0;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // 检查是否是句子结束符
    if (token.type === 'separator' && sentenceEnders.test(token.value)) {
      // 收集这个句子中的所有词
      const wordIndices = [];
      for (let j = sentenceStart; j <= i; j++) {
        if (tokens[j].type === 'word' && !isEnglishWord(tokens[j].value)) {
          wordIndices.push(j);
        }
      }
      // 每个句子选择2-4个词加深（根据句子长度）
      const count = Math.min(Math.max(2, Math.floor(wordIndices.length * 0.3)), 4);
      // 均匀分布选择词
      if (wordIndices.length > 0) {
        const step = wordIndices.length / count;
        for (let k = 0; k < count && k < wordIndices.length; k++) {
          const idx = Math.floor(k * step);
          indices.add(wordIndices[idx]);
        }
      }
      sentenceStart = i + 1;
    }
  }
  
  // 处理最后一个没有句号结尾的句子
  const wordIndices = [];
  for (let j = sentenceStart; j < tokens.length; j++) {
    if (tokens[j].type === 'word' && !isEnglishWord(tokens[j].value)) {
      wordIndices.push(j);
    }
  }
  if (wordIndices.length > 0) {
    const count = Math.min(Math.max(2, Math.floor(wordIndices.length * 0.3)), 4);
    const step = wordIndices.length / count;
    for (let k = 0; k < count && k < wordIndices.length; k++) {
      const idx = Math.floor(k * step);
      indices.add(wordIndices[idx]);
    }
  }
  
  return indices;
}

function applyBionicMarkupCJK(node, word) {
  const clean = word || '';
  node.textContent = '';
  const strong = document.createElement('span');
  strong.className = 'bionic-prefix';
  strong.textContent = clean;
  node.appendChild(strong);
}

function tokenize(text, language = state.articleLanguage) {
  if (!text) {
    return [];
  }
  if (language === 'zh') {
    return tokenizeChinese(text);
  }
  if (language === 'ja') {
    return tokenizeJapanese(text);
  }
  return tokenizeEnglish(text);
}

function tokenizeEnglish(text) {
  const tokens = [];
  const regex = /[A-Za-z]+(?:'[A-Za-z]+)?(?:-[A-Za-z]+(?:'[A-Za-z]+)?)?|[^A-Za-z]+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    if (/^[A-Za-z]/.test(value)) {
      tokens.push({ type: 'word', value });
    } else {
      tokens.push({ type: 'separator', value });
    }
  }
  return tokens;
}

function tokenizeChinese(text) {
  const tokens = [];
  
  // 使用 Intl.Segmenter 进行智能中文分词
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('zh-Hans', { granularity: 'word' });
    for (const item of segmenter.segment(text)) {
      if (!item?.segment) {
        continue;
      }
      const segment = item.segment;
      // 只有2个字以上的中文词才作为可点击的词语（词语/成语）
      // 单个汉字作为普通文本显示
      const isChinese = /^[\u4e00-\u9fff]+$/.test(segment);
      const isWord = item.isWordLike && isChinese && segment.length >= 2;
      const isEnglish = isSingleWordSelection(segment, 'en');
      
      if (isWord || isEnglish) {
        tokens.push({ type: 'word', value: segment });
      } else {
        tokens.push({ type: 'separator', value: segment });
      }
    }
    if (tokens.length) {
      return tokens;
    }
  }

  // 降级方案：按标点符号分割，不识别词语
  const regex = /[A-Za-z]+(?:'[A-Za-z]+)?(?:-[A-Za-z]+(?:'[A-Za-z]+)?)?|[^\u4e00-\u9fffA-Za-z]+|[\u4e00-\u9fff]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    if (/^[A-Za-z]/.test(value)) {
      tokens.push({ type: 'word', value });
    } else {
      tokens.push({ type: 'separator', value });
    }
  }
  return tokens;
}

function tokenizeJapanese(text) {
  const tokens = [];
  
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
    for (const item of segmenter.segment(text)) {
      if (!item?.segment) {
        continue;
      }
      tokens.push({
        type: item.isWordLike ? 'word' : 'separator',
        value: item.segment,
      });
    }
    if (tokens.length) {
      return tokens;
    }
  }

  // 降级方案
  const regex = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+|[ぁ-ゟ゠-ヿー]+|[ァ-ンー]+|[A-Za-z]+(?:'[A-Za-z]+)?(?:-[A-Za-z]+(?:'[A-Za-z]+)?)?|[^A-Za-z\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaffぁ-ゟ゠-ヿーァ-ンー]+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    if (/^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaffぁ-ゟ゠-ヿーァ-ンー]/.test(value) || /^[A-Za-z]/.test(value)) {
      tokens.push({ type: 'word', value });
    } else {
      tokens.push({ type: 'separator', value });
    }
  }
  return tokens;
}

function isEnglishWord(word) {
  return /^[A-Za-z]/.test(word || '');
}

function detectWordLanguage(word, { articleLanguage = state.articleLanguage, readingLanguage = state.language } = {}) {
  const clean = String(word || '').trim();
  const fallback = ['ja', 'zh', 'en'].includes(articleLanguage)
    ? articleLanguage
    : (['ja', 'zh', 'en'].includes(readingLanguage) ? readingLanguage : 'en');

  if (!clean) {
    return fallback;
  }
  if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(clean)) {
    return 'ja';
  }
  if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(clean)) {
    if (articleLanguage === 'ja' || readingLanguage === 'ja') {
      return 'ja';
    }
    if (articleLanguage === 'zh' || readingLanguage === 'zh') {
      return 'zh';
    }
    return 'zh';
  }
  if (/[A-Za-z]/.test(clean)) {
    return 'en';
  }
  return fallback;
}

function normalizeWordLanguage(language, word = '') {
  if (language === 'zh' || language === 'en' || language === 'ja') {
    return language;
  }
  const rawWord = String(word || '').trim();
  return rawWord ? detectWordLanguage(rawWord) : 'en';
}

function restoreJapaneseMasuStem(stem) {
  const clean = String(stem || '').trim();
  if (!clean) {
    return '';
  }
  const godanMap = {
    い: 'う',
    き: 'く',
    ぎ: 'ぐ',
    し: 'す',
    ち: 'つ',
    に: 'ぬ',
    び: 'ぶ',
    み: 'む',
    り: 'る',
  };
  const last = clean.slice(-1);
  if (godanMap[last]) {
    return `${clean.slice(0, -1)}${godanMap[last]}`;
  }
  return `${clean}る`;
}

function inferJapaneseBaseForm(word) {
  const clean = String(word || '').trim();
  if (!clean) {
    return '';
  }

  const suruForms = new Set(['します', 'しました', 'しません', 'しませんでした', 'した', 'して', 'しない', 'しなかった']);
  if (suruForms.has(clean)) {
    return 'する';
  }

  const kuruForms = new Set(['来ます', '来ました', '来ません', '来ませんでした', '来た', '来て', '来ない', 'きます', 'きました', 'きません', 'きませんでした', 'きた', 'きて', 'こない']);
  if (kuruForms.has(clean)) {
    return '来る';
  }

  const politeSuffixes = ['ませんでした', 'ました', 'ません', 'ます'];
  for (const suffix of politeSuffixes) {
    if (clean.endsWith(suffix) && clean.length > suffix.length) {
      const stem = clean.slice(0, -suffix.length);
      return restoreJapaneseMasuStem(stem);
    }
  }

  return clean;
}

function normalizeWordKey(word) {
  if (!word) {
    return '';
  }
  return isEnglishWord(word) ? word.toLowerCase() : word;
}

function normalizeJapanesePhonetic(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  if (/^[\u3040-\u309fー\s]+$/.test(raw)) {
    return raw.replace(/\s+/g, ' ').trim();
  }
  if (/^[\u30a0-\u30ffー\s]+$/.test(raw)) {
    return raw
      .replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

function buildJapaneseReadingCacheKey(word, baseForm = '') {
  return `${normalizeWordKey(String(baseForm || '').trim() || String(word || '').trim())}__ja_reading`;
}

async function fetchJapaneseReading(word, baseForm = '') {
  const rawWord = String(word || '').trim();
  if (!rawWord) {
    return '';
  }
  const queryWord = String(baseForm || '').trim() || rawWord;
  const cacheKey = buildJapaneseReadingCacheKey(rawWord, queryWord);
  if (state.japaneseReadingCache.has(cacheKey)) {
    return state.japaneseReadingCache.get(cacheKey) || '';
  }

  const inlineReading = normalizeJapanesePhonetic(rawWord);
  if (inlineReading) {
    state.japaneseReadingCache.set(cacheKey, inlineReading);
    return inlineReading;
  }

  try {
    const res = await fetch(JA_READING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: queryWord }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    const hiragana = normalizeJapanesePhonetic(data?.hiragana || data?.katakana || '');
    const result = hiragana || '';
    state.japaneseReadingCache.set(cacheKey, result || null);
    return result;
  } catch (error) {
    console.warn('[JapaneseReading] request failed:', error);
    state.japaneseReadingCache.set(cacheKey, null);
    return '';
  }
}

function isJapanesePhraseBoundaryToken(token) {
  if (!token || token.type !== 'separator') {
    return false;
  }
  return /[\n。．.!！?？]/.test(String(token.value || ''));
}

function buildJapanesePhrasePayload(tokenIndex) {
  const index = Number(tokenIndex);
  if (!Number.isInteger(index) || index < 0 || index >= state.tokens.length) {
    return null;
  }
  const clicked = state.tokens[index];
  if (!clicked || clicked.type !== 'word') {
    return null;
  }

  let left = index;
  while (left > 0 && !isJapanesePhraseBoundaryToken(state.tokens[left - 1])) {
    left -= 1;
  }

  let right = index;
  while (right < state.tokens.length - 1 && !isJapanesePhraseBoundaryToken(state.tokens[right + 1])) {
    right += 1;
  }

  let q = '';
  let clickedStart = 0;
  let clickedEnd = 0;
  for (let i = left; i <= right; i += 1) {
    const value = String(state.tokens[i]?.value || '');
    if (i === index) {
      clickedStart = q.length;
      clickedEnd = clickedStart + value.length;
    }
    q += value;
  }

  if (!q.trim()) {
    return null;
  }
  return {
    q,
    clickedStart,
    clickedEnd,
  };
}

async function fetchJapanesePhrase(rawWord, tokenIndex, fallbackBaseForm = '') {
  const fallbackWord = String(rawWord || '').trim();
  const fallback = {
    surface: fallbackWord,
    baseForm: fallbackBaseForm || inferJapaneseBaseForm(fallbackWord),
    hiragana: '',
  };

  const payload = buildJapanesePhrasePayload(tokenIndex);
  if (!payload) {
    return fallback;
  }

  const cacheKey = `${payload.q}__${payload.clickedStart}-${payload.clickedEnd}`;
  if (state.japanesePhraseCache.has(cacheKey)) {
    return state.japanesePhraseCache.get(cacheKey) || fallback;
  }

  try {
    const res = await fetch(JA_PHRASE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    const surface = String(data?.surface || '').trim() || fallback.surface;
    const baseForm = String(data?.baseForm || '').trim() || inferJapaneseBaseForm(surface);
    const hiragana = normalizeJapanesePhonetic(data?.hiragana || data?.katakana || '');
    const result = { surface, baseForm, hiragana };
    state.japanesePhraseCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[JapanesePhrase] request failed:', error);
    state.japanesePhraseCache.set(cacheKey, null);
    return fallback;
  }
}

async function handleWordClick(node, rawWord, tokenIndex = -1, { anchorRect = null } = {}) {
  if (!state.articleId) {
    return;
  }

  let resolvedWord = String(rawWord || '').trim();
  const wordLanguage = detectWordLanguage(resolvedWord);
  let baseForm = wordLanguage === 'ja' ? inferJapaneseBaseForm(resolvedWord) : '';
  let resolvedPhonetics = '';

  if (wordLanguage === 'ja') {
    const phrase = await fetchJapanesePhrase(resolvedWord, tokenIndex, baseForm);
    resolvedWord = String(phrase?.surface || '').trim() || resolvedWord;
    baseForm = String(phrase?.baseForm || '').trim() || inferJapaneseBaseForm(resolvedWord);
    resolvedPhonetics = normalizeJapanesePhonetic(phrase?.hiragana || '');
  }

  const normalizedWord = normalizeWordKey(resolvedWord);
  const targetLanguage = resolveTargetLanguage(state.language, wordLanguage);
  const useDictionary = shouldUseDictionary(wordLanguage);
  const detail = useDictionary ? await lookupWord(resolvedWord) : null;
  const previous = state.clickedWords.get(normalizedWord);
  const record = detail
    ? {
        ...detail,
        clickedAt: previous?.clickedAt ?? Date.now(),
        savedInLog: false,
        savedAtLog: 0,
        language: 'en',
        baseForm: '',
      }
    : buildFallbackDetail(resolvedWord, previous, wordLanguage, useDictionary, targetLanguage, baseForm);

  if (wordLanguage === 'ja' && resolvedPhonetics) {
    record.phonetics = record.phonetics || resolvedPhonetics;
  }

  if (!isCollectibleWordDetail({
    ...record,
    word: resolvedWord,
    requested: resolvedWord,
    language: wordLanguage,
    mode: 'word',
    confidence: 1,
  })) {
    return;
  }

  state.clickedWords.set(normalizedWord, record);
  saveSession(state.articleId, Object.fromEntries(state.clickedWords));
  markVisitedWords();
  refreshWordList();
  showTooltip(node, record, { anchorRect });
  playPronunciation({
    ...record,
    language: wordLanguage,
    requested: resolvedWord,
    word: resolvedWord,
    baseForm: baseForm || record.baseForm || '',
    phonetics: record.phonetics || resolvedPhonetics || '',
  });

  if (wordLanguage === 'ja') {
    fetchJapaneseReading(resolvedWord, baseForm).then((reading) => {
      if (!reading) {
        return;
      }
      const current = state.clickedWords.get(normalizedWord);
      if (!current || current.phonetics) {
        return;
      }
      const next = {
        ...current,
        phonetics: reading,
      };
      state.clickedWords.set(normalizedWord, next);
      saveSession(state.articleId, Object.fromEntries(state.clickedWords));
      refreshWordList();
      if (tooltipState.detail && normalizeWordKey(tooltipState.detail.word) === normalizedWord) {
        showTooltip(tooltipState.anchor, next, { anchorRect: tooltipState.anchorRect || anchorRect });
      }
    });
  }

  if (shouldFetchTranslation(normalizedWord, targetLanguage, record, useDictionary)) {
    const fetchPromise = wordLanguage === 'ja'
      ? fetchYoudaoTranslation(resolvedWord, targetLanguage, baseForm).then((result) => {
          if (result) {
            return result;
          }
          const cacheKey = buildTranslationCacheKey(resolvedWord, targetLanguage);
          if (state.translationCache.get(cacheKey) === null) {
            state.translationCache.delete(cacheKey);
          }
          return fetchGroqTranslation(resolvedWord, wordLanguage, targetLanguage);
        })
      : fetchGroqTranslation(resolvedWord, wordLanguage, targetLanguage);
    fetchPromise.then((extra) => {
      if (!extra) {
        return;
      }
      const current = state.clickedWords.get(normalizedWord);
      if (!current) {
        return;
      }
      const merged = mergeTranslationDetail(current, extra, targetLanguage);
      state.clickedWords.set(normalizedWord, merged);
      saveSession(state.articleId, Object.fromEntries(state.clickedWords));
      refreshWordList();
      if (tooltipState.detail && normalizeWordKey(tooltipState.detail.word) === normalizedWord) {
        showTooltip(tooltipState.anchor, merged, { anchorRect: tooltipState.anchorRect || anchorRect });
      }
    });
  }
}

function shouldUseDictionary(language) {
  if (state.language !== 'zh') {
    return false;
  }
  return language === 'en';
}

function resolveTargetLanguage(readingLanguage, sourceLanguage = '') {
  if (sourceLanguage === 'ja') {
    return readingLanguage === 'en' ? 'en' : 'zh';
  }
  return readingLanguage;
}

function buildFallbackDetail(rawWord, previous, language, attemptedLookup, targetLanguage, baseForm = '') {
  return {
    word: rawWord,
    requested: rawWord,
    phonetics: '',
    meanings: [],
    derivatives: [],
    clickedAt: previous?.clickedAt ?? Date.now(),
    savedInLog: false,
    savedAtLog: 0,
    placeholder: true,
    language,
    baseForm: baseForm || previous?.baseForm || '',
  };
}

function buildTranslationCacheKey(word, targetLanguage) {
  return `${normalizeWordKey(word)}__${targetLanguage || state.language}`;
}

function shouldFetchTranslation(key, targetLanguage, detail, usedDictionary) {
  if (!state.articleId) {
    return false;
  }
  if (usedDictionary && detail && !detail.placeholder) {
    return false;
  }
  const cacheKey = buildTranslationCacheKey(key, targetLanguage);
  return !state.translationCache.has(cacheKey);
}

async function fetchGroqTranslation(word, sourceLanguage, targetLanguage = state.language) {
  const q = String(word || '').trim();
  if (!q) {
    return null;
  }
  const cacheKey = buildTranslationCacheKey(word, targetLanguage);
  if (state.translationCache.has(cacheKey)) {
    return state.translationCache.get(cacheKey) || null;
  }

  const payload = {
    text: q,
    sourceLanguage,
    targetLanguage,
  };

  try {
    const res = await fetch(TRANSLATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    const translation = data?.translation || data?.reply || '';
    const targetLabel = getLanguageLabel(targetLanguage);
    if (!translation) {
      state.translationCache.set(cacheKey, null);
      return null;
    }
    const detail = {
      word,
      phonetics: '',
      meanings: [
        {
          pos: targetLabel,
          zh: translation,
        },
      ],
      derivatives: [],
      targetLanguage,
      source: 'groq',
    };
    state.translationCache.set(cacheKey, detail);
    return detail;
  } catch (error) {
    console.warn('[Translate] request failed:', error);
    state.translationCache.set(cacheKey, null);
    return null;
  }
}

function mapToYoudaoLanguageCode(language) {
  if (language === 'en') {
    return 'en';
  }
  if (language === 'ja') {
    return 'ja';
  }
  return 'zh-CHS';
}

function buildYoudaoJapaneseSpeakUrl(word) {
  const q = String(word || '').trim();
  if (!q) {
    return '';
  }
  return `https://dict.youdao.com/dictvoice?le=jap&type=3&audio=${encodeURIComponent(q)}`;
}

async function fetchYoudaoTranslation(word, targetLanguage = 'zh', baseForm = '') {
  const rawWord = String(word || '').trim();
  if (!rawWord) {
    return null;
  }

  const primaryWord = String(baseForm || '').trim() || rawWord;
  const secondaryWord = rawWord;
  const cacheKey = buildTranslationCacheKey(word, targetLanguage);
  if (state.translationCache.has(cacheKey)) {
    return state.translationCache.get(cacheKey) || null;
  }

  const requestYoudao = async (queryWord) => {
    const res = await fetch(YOUDAO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: queryWord,
        from: 'ja',
        to: mapToYoudaoLanguageCode(targetLanguage),
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  };

  const buildMeanings = (data, targetLabel) => {
    const meanings = [];
    const explains = Array.isArray(data?.explains) ? data.explains : [];
    const translations = Array.isArray(data?.translation) ? data.translation : [];

    explains.forEach((item) => {
      const text = String(item || '').trim();
      if (text) {
        meanings.push({ pos: targetLabel, zh: text });
      }
    });

    if (!meanings.length) {
      translations.forEach((item) => {
        const text = String(item || '').trim();
        if (text) {
          meanings.push({ pos: targetLabel, zh: text });
        }
      });
    }

    return { meanings, translations };
  };

  try {
    const targetLabel = getLanguageLabel(targetLanguage);
    let usedWord = primaryWord;
    let data = await requestYoudao(primaryWord);
    let { meanings, translations } = buildMeanings(data, targetLabel);

    if (!meanings.length && secondaryWord && secondaryWord !== primaryWord) {
      usedWord = secondaryWord;
      data = await requestYoudao(secondaryWord);
      ({ meanings, translations } = buildMeanings(data, targetLabel));
    }

    if (!meanings.length) {
      state.translationCache.set(cacheKey, null);
      return null;
    }

    const detail = {
      word: rawWord,
      phonetics: normalizeJapanesePhonetic(data?.phonetic || ''),
      meanings,
      derivatives: [],
      targetLanguage,
      source: 'youdao',
      speakUrl: data?.speakUrl || buildYoudaoJapaneseSpeakUrl(usedWord),
      tSpeakUrl: data?.tSpeakUrl || '',
      translation: translations.join('；'),
      baseForm: primaryWord && primaryWord !== rawWord ? primaryWord : '',
    };

    state.translationCache.set(cacheKey, detail);
    return detail;
  } catch (error) {
    console.warn('[Youdao] request failed:', error);
    state.translationCache.set(cacheKey, null);
    return null;
  }
}

function mergeTranslationDetail(detail, translation, targetLanguage) {
  if (!translation) {
    return detail;
  }
  const targetLabel = getLanguageLabel(targetLanguage || translation.targetLanguage || 'zh');
  const baseMeanings = detail.meanings?.length
    ? detail.meanings.filter((m) => m.pos !== targetLabel)
    : [];
  const extra = (translation.meanings || []).map((m) => ({
    ...m,
    pos: m.pos || targetLabel,
  }));

  const mergedMeanings = [...baseMeanings, ...extra].filter((m) => m.zh);
  if (!mergedMeanings.length && translation.translation) {
    mergedMeanings.push({ pos: targetLabel, zh: translation.translation });
  }

  const phonetics = detail.phonetics || translation.phonetics || '';
  return {
    ...detail,
    phonetics,
    speakUrl: detail.speakUrl || translation.speakUrl || '',
    tSpeakUrl: detail.tSpeakUrl || translation.tSpeakUrl || '',
    baseForm: detail.baseForm || translation.baseForm || '',
    meanings: mergedMeanings,
    translation: true,
    placeholder: false,
  };
}

function markVisitedWords() {
  const spans = elements.articleContainer.querySelectorAll('span.word');
  spans.forEach((span) => {
    const word = normalizeWordKey(span.dataset.word);
    if (state.clickedWords.has(word)) {
      span.classList.add('clicked');
    } else {
      span.classList.remove('clicked');
    }
  });
}

function handleArticleCopy() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return;
  }
  const range = selection.getRangeAt(0);
  if (!elements.articleContainer.contains(range.commonAncestorContainer)) {
    return;
  }
  
  // 保存选区位置信息，在复制完成后再添加标记
  const savedRange = range.cloneRange();
  
  setTimeout(() => {
    const wrapper = document.createElement('mark');
    wrapper.className = 'copied-mark';
    
    try {
      savedRange.surroundContents(wrapper);
    } catch (e) {
      // 如果选区跨越多个节点，使用extractContents
      const fragment = savedRange.extractContents();
      wrapper.appendChild(fragment);
      savedRange.insertNode(wrapper);
    }
    
    window.getSelection().removeAllRanges();
  }, 0);
}

function clearCopyMarks() {
  const marks = elements.articleContainer.querySelectorAll('mark.copied-mark');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
}

function scheduleSelectionLookup() {
  if (!elements.articleContainer) {
    return;
  }
  if (state.selectionLookupTimer) {
    clearTimeout(state.selectionLookupTimer);
  }
  state.selectionLookupTimer = setTimeout(() => {
    state.selectionLookupTimer = null;
    handleArticleSelectionLookup();
  }, 40);
}

function getRangeOffsetsInContainer(range, container) {
  try {
    const startRange = document.createRange();
    startRange.selectNodeContents(container);
    startRange.setEnd(range.startContainer, range.startOffset);
    const start = startRange.toString().length;

    const endRange = document.createRange();
    endRange.selectNodeContents(container);
    endRange.setEnd(range.endContainer, range.endOffset);
    const end = endRange.toString().length;

    return {
      start: Math.max(0, start),
      end: Math.max(0, end),
    };
  } catch (error) {
    return { start: 0, end: 0 };
  }
}

function buildSelectionContextByOffset(start, end, radius = 80) {
  const text = String(state.rawText || '').trim();
  if (!text) {
    return '';
  }
  const from = Math.max(0, Math.min(start, text.length) - radius);
  const to = Math.min(text.length, Math.max(end, 0) + radius);
  return text.slice(from, to).replace(/\s+/g, ' ').trim();
}

function getArticleSelectionPayload() {
  if (!elements.articleContainer) {
    return null;
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!elements.articleContainer.contains(range.commonAncestorContainer)) {
    return null;
  }

  const raw = String(selection.toString() || '');
  const selectedText = raw.replace(/\s+/g, ' ').trim();
  if (!selectedText || selectedText.length < 2) {
    return null;
  }
  const language = detectWordLanguage(selectedText, {
    articleLanguage: state.articleLanguage,
    readingLanguage: state.language,
  });
  if (!['ja', 'en'].includes(language)) {
    return null;
  }
  if (language === 'en' && !/[A-Za-z]/.test(selectedText)) {
    return null;
  }
  if (language === 'ja' && !/[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(selectedText)) {
    return null;
  }

  const rect = range.getBoundingClientRect();
  if (!rect || (!rect.width && !rect.height)) {
    return null;
  }

  const offsets = getRangeOffsetsInContainer(range, elements.articleContainer);
  const start = Math.max(0, offsets.start);
  const end = Math.max(start + 1, offsets.end);

  return {
    selectedText,
    language,
    context: buildSelectionContextByOffset(start, end),
    anchorRect: {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    },
  };
}

function extractMeaningText(detail) {
  const first = detail?.meanings?.find((item) => String(item?.zh || '').trim());
  return String(first?.zh || '').trim();
}

function extractMeaningTextByLanguage(detail, language = 'zh') {
  const label = getLanguageLabel(language);
  const meanings = Array.isArray(detail?.meanings) ? detail.meanings : [];
  const preferred = meanings.find((item) => item?.pos === label && String(item?.zh || '').trim());
  if (preferred) {
    return String(preferred.zh || '').trim();
  }
  return extractMeaningText(detail);
}

function buildSelectionMeanings(zhText = '', enText = '', jaText = '') {
  const meanings = [];
  const zh = String(zhText || '').trim();
  const en = String(enText || '').trim();
  const ja = String(jaText || '').trim();
  if (zh) {
    meanings.push({ pos: getLanguageLabel('zh'), zh });
  }
  if (en) {
    meanings.push({ pos: getLanguageLabel('en'), zh: en });
  }
  if (ja) {
    meanings.push({ pos: getLanguageLabel('ja'), zh: ja });
  }
  return meanings;
}

function isSingleWordSelection(text, language = '') {
  const q = String(text || '').trim();
  if (!q) {
    return false;
  }
  if (language === 'en') {
    return /^[A-Za-z]+(?:'[A-Za-z]+)?(?:-[A-Za-z]+(?:'[A-Za-z]+)?)?$/.test(q);
  }
  if (language === 'ja') {
    if (/\s/.test(q)) {
      return false;
    }
    return !/[。．.!！?？,，、;；:\-–—]/.test(q);
  }
  return false;
}

function isRecognizableEnglishPhrase(text) {
  const q = String(text || '').replace(/\s+/g, ' ').trim();
  if (!q) {
    return false;
  }
  if (/[。．.!！?？,，、;；:：]/.test(q)) {
    return false;
  }
  if (/[^A-Za-z'\-\s]/.test(q)) {
    return false;
  }
  const parts = q.split(' ').filter(Boolean);
  if (parts.length < 2 || parts.length > 6) {
    return false;
  }
  return parts.every((part) => isSingleWordSelection(part, 'en'));
}

function isRecognizableCjkPhrase(text) {
  const compact = String(text || '').replace(/\s+/g, '').trim();
  if (!compact) {
    return false;
  }
  if (compact.length > 24) {
    return false;
  }
  if (!/[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(compact)) {
    return false;
  }
  return !/[。．.!！?？,，、;；:\-–—]/.test(compact);
}

function isCollectibleWordDetail(detail) {
  const rawWord = String(detail?.requested || detail?.word || '').replace(/\s+/g, ' ').trim();
  if (!rawWord) {
    return false;
  }
  const language = normalizeWordLanguage(detail?.language, rawWord);
  const mode = String(detail?.mode || '').trim() || (isSingleWordSelection(rawWord, language) ? 'word' : 'phrase');
  const confidence = Number(detail?.confidence);
  const hasConfidence = Number.isFinite(confidence);

  if (language === 'en') {
    if (isSingleWordSelection(rawWord, 'en')) {
      return true;
    }
    return mode === 'phrase'
      && isRecognizableEnglishPhrase(rawWord)
      && (!hasConfidence || confidence >= 0.45);
  }

  if (language === 'ja' || language === 'zh') {
    if (mode === 'word') {
      return isSingleWordSelection(rawWord, language) || isRecognizableCjkPhrase(rawWord);
    }
    return isRecognizableCjkPhrase(rawWord)
      && (!hasConfidence || confidence >= 0.45);
  }

  return mode === 'word';
}

async function fetchSelectionAnalysis(q, language = 'ja', context = '') {
  const text = String(q || '').trim();
  if (!text) {
    return null;
  }
  const normalizedLanguage = ['ja', 'en'].includes(language) ? language : detectWordLanguage(text);
  const normalizedContext = String(context || '').trim();
  const cacheKey = `${normalizedLanguage}__${text}__${normalizedContext}`;
  if (state.selectionCache.has(cacheKey)) {
    return state.selectionCache.get(cacheKey) || null;
  }

  try {
    const res = await fetch(SELECTION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, language: normalizedLanguage, context: normalizedContext }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    const resultLanguage = String(data?.language || normalizedLanguage || '').trim() || normalizedLanguage;
    const result = {
      surface: String(data?.surface || text).trim() || text,
      baseForm: String(data?.baseForm || '').trim(),
      language: resultLanguage,
      mode: String(data?.mode || '').trim() || (isSingleWordSelection(text, resultLanguage) ? 'word' : 'phrase'),
      phonetics: resultLanguage === 'ja'
        ? normalizeJapanesePhonetic(data?.hiragana || data?.katakana || '')
        : String(data?.phonetics || '').trim(),
      zh: String(data?.translations?.zh || data?.zh || '').trim(),
      en: String(data?.translations?.en || data?.en || '').trim(),
      ja: String(data?.translations?.ja || data?.ja || '').trim(),
      source: String(data?.source || 'local').trim() || 'local',
      confidence: Number(data?.confidence) || 0,
    };
    state.selectionCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[Selection] request failed:', error);
    state.selectionCache.set(cacheKey, null);
    return null;
  }
}

async function handleArticleSelectionLookup() {
  if (!state.articleId || !elements.articleContainer) {
    return;
  }
  const payload = getArticleSelectionPayload();
  if (!payload) {
    return;
  }

  const now = Date.now();
  const signature = `${payload.selectedText}__${payload.context}`;
  if (state.lastSelectionSignature === signature && now - state.lastSelectionAt < 800) {
    return;
  }
  state.lastSelectionSignature = signature;
  state.lastSelectionAt = now;

  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    selection.removeAllRanges();
  }

  if (isSingleWordSelection(payload.selectedText, payload.language)) {
    await handleWordClick(null, payload.selectedText, -1, { anchorRect: payload.anchorRect });
    const langLabel = getLanguageLabel(payload.language || detectWordLanguage(payload.selectedText));
    setAssistantStatus(`已按单词模式处理拖选${langLabel}内容。`);
    return;
  }

  const selectionResult = await fetchSelectionAnalysis(payload.selectedText, payload.language, payload.context);
  let resolvedWord = String(selectionResult?.surface || payload.selectedText || '').trim();
  if (!resolvedWord) {
    return;
  }

  const sourceLanguage = selectionResult?.language || payload.language;
  const selectionMode = String(selectionResult?.mode || '').trim() || (isSingleWordSelection(resolvedWord, sourceLanguage) ? 'word' : 'phrase');
  const baseForm = sourceLanguage === 'ja'
    ? (String(selectionResult?.baseForm || '').trim() || inferJapaneseBaseForm(resolvedWord))
    : (String(selectionResult?.baseForm || '').trim() || resolvedWord.toLowerCase());
  let phonetics = String(selectionResult?.phonetics || '').trim();

  let zhText = String(selectionResult?.zh || '').trim();
  let enText = String(selectionResult?.en || '').trim();
  let jaText = String(selectionResult?.ja || '').trim();

  if (sourceLanguage === 'ja') {
    if (!zhText || !enText || !jaText) {
      const [zhDetail, enDetail, jaDetail] = await Promise.all([
        zhText ? Promise.resolve(null) : fetchYoudaoTranslation(resolvedWord, 'zh', baseForm),
        enText ? Promise.resolve(null) : fetchGroqTranslation(resolvedWord, 'ja', 'en'),
        jaText ? Promise.resolve(null) : fetchGroqTranslation(resolvedWord, 'ja', 'ja'),
      ]);
      if (!zhText) {
        zhText = extractMeaningText(zhDetail);
      }
      if (!enText) {
        enText = extractMeaningText(enDetail);
      }
      if (!jaText) {
        jaText = extractMeaningText(jaDetail);
      }
    }
  } else if (sourceLanguage === 'en') {
    const dictionaryDetail = await lookupWord(resolvedWord);
    if (!phonetics) {
      phonetics = String(dictionaryDetail?.phonetics || '').trim();
    }
    if (!zhText) {
      zhText = extractMeaningTextByLanguage(dictionaryDetail, 'zh');
    }
    if (!zhText || !enText || !jaText) {
      const [zhDetail, enDetail, jaDetail] = await Promise.all([
        zhText ? Promise.resolve(null) : fetchGroqTranslation(resolvedWord, 'en', 'zh'),
        enText ? Promise.resolve(null) : fetchGroqTranslation(resolvedWord, 'en', 'en'),
        jaText ? Promise.resolve(null) : fetchGroqTranslation(resolvedWord, 'en', 'ja'),
      ]);
      if (!zhText) {
        zhText = extractMeaningText(zhDetail);
      }
      if (!enText) {
        enText = extractMeaningText(enDetail);
      }
      if (!jaText) {
        jaText = extractMeaningText(jaDetail);
      }
    }
  }

  const normalizedWord = normalizeWordKey(resolvedWord);
  const previous = state.clickedWords.get(normalizedWord);
  const meanings = buildSelectionMeanings(zhText, enText, jaText);
  const detail = {
    word: resolvedWord,
    requested: resolvedWord,
    phonetics,
    meanings,
    derivatives: [],
    clickedAt: previous?.clickedAt ?? Date.now(),
    savedInLog: false,
    savedAtLog: 0,
    placeholder: meanings.length === 0,
    language: sourceLanguage,
    mode: selectionMode,
    baseForm,
    source: selectionResult?.source || 'selection',
    confidence: Number(selectionResult?.confidence) || 0,
  };

  const isCollectible = isCollectibleWordDetail(detail);
  if (isCollectible) {
    state.clickedWords.set(normalizedWord, detail);
    saveSession(state.articleId, Object.fromEntries(state.clickedWords));
    refreshWordList();
  }
  showTooltip(null, detail, { anchorRect: payload.anchorRect });
  if (selectionMode === 'word') {
    playPronunciation(detail);
  }

  const langLabel = getLanguageLabel(sourceLanguage);
  if (!isCollectible) {
    setAssistantStatus(`已识别拖选${langLabel}内容并完成翻译（未加入生词集合）。`);
    return;
  }
  if (selectionMode === 'word') {
    setAssistantStatus(`已识别拖选${langLabel}单词（${resolvedWord.length}字），并返回中英日释义。`);
  } else {
    setAssistantStatus(`已识别拖选${langLabel}片段（${resolvedWord.length}字），可点发音按钮播放（含中英日注释）。`);
  }
}

function getPendingWordEntries() {
  return Array.from(state.clickedWords.entries()).filter(([, detail]) => !detail?.savedInLog && isCollectibleWordDetail(detail));
}

function refreshWordList() {
  const pendingEntries = getPendingWordEntries();
  if (pendingEntries.length === 0) {
    elements.wordList.classList.add('empty-state');
    elements.wordList.innerHTML = '<p>尚未收集生词/词语，点击文章中的单词或词语后会自动记录并显示释义。</p>';
    setExportStatus('');
    return;
  }
  elements.wordList.classList.remove('empty-state');
  const fragment = document.createDocumentFragment();
  const entries = pendingEntries.sort(
    (a, b) => (a[1]?.clickedAt ?? 0) - (b[1]?.clickedAt ?? 0),
  );
  entries.forEach(([word, detail]) => {
    const card = document.createElement('article');
    card.className = 'word-card';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'word-remove-btn';
    deleteBtn.type = 'button';
    deleteBtn.dataset.removePendingWord = word;
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', t('delete'));
    card.appendChild(deleteBtn);

    const header = document.createElement('div');
    header.className = 'word-card-header';
    const title = document.createElement('h3');
    title.textContent = detail.requested || detail.word || word;

    const phonetic = document.createElement('span');
    phonetic.textContent = detail.phonetics || '';

    header.appendChild(title);
    header.appendChild(phonetic);

    const { pos, meaning } = pickMeaningForCurrentLanguage(detail);

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = [pos, meaning].filter(Boolean).join(' · ');

    card.appendChild(header);
    if (badge.textContent) {
      card.appendChild(badge);
    }

    fragment.appendChild(card);
  });

  elements.wordList.innerHTML = '';
  elements.wordList.appendChild(fragment);
}

function buildSavedWordLogMap(rawLogByDate) {
  const dateEntries = Object.entries(rawLogByDate || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const map = new Map();
  dateEntries.forEach(([dateKey, dayLog]) => {
    const wordEntries = Object.entries(dayLog || {}).sort(
      (a, b) => (a[1]?.savedAt ?? 0) - (b[1]?.savedAt ?? 0),
    );
    map.set(dateKey, new Map(wordEntries));
  });
  return map;
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

function isSavedWordEntry(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return typeof value.word === 'string'
    || typeof value.meaning === 'string'
    || typeof value.pos === 'string'
    || typeof value.savedAt === 'number'
    || typeof value.language === 'string';
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayDateKey() {
  return formatDateKey(new Date());
}

function getDateKeyFromTimestamp(timestamp) {
  const num = Number(timestamp);
  if (!Number.isFinite(num)) {
    return '';
  }
  const date = new Date(num);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return formatDateKey(date);
}

function normalizeSavedWordLogByDate(rawLog) {
  const normalized = {};
  const source = rawLog && typeof rawLog === 'object' ? rawLog : {};

  Object.entries(source).forEach(([key, value]) => {
    if (isDateKey(key) && value && typeof value === 'object' && !Array.isArray(value)) {
      const dayBucket = {};
      Object.entries(value).forEach(([wordKey, item]) => {
        if (!isSavedWordEntry(item)) {
          return;
        }
        dayBucket[wordKey] = {
          word: item.word || wordKey,
          pos: item.pos || '',
          meaning: item.meaning || '',
          language: normalizeWordLanguage(item.language, item.word || wordKey),
          savedAt: Number(item.savedAt) || Date.now(),
        };
      });
      if (Object.keys(dayBucket).length) {
        normalized[key] = dayBucket;
      }
      return;
    }

    if (!isSavedWordEntry(value)) {
      return;
    }
    const dateKey = getDateKeyFromTimestamp(value.savedAt) || getTodayDateKey();
    if (!normalized[dateKey]) {
      normalized[dateKey] = {};
    }
    normalized[dateKey][key] = {
      word: value.word || key,
      pos: value.pos || '',
      meaning: value.meaning || '',
      language: normalizeWordLanguage(value.language, value.word || key),
      savedAt: Number(value.savedAt) || Date.now(),
    };
  });

  return normalized;
}

function mapToSavedWordLogObject(savedMap) {
  const payload = {};
  Array.from(savedMap.entries()).forEach(([dateKey, dayMap]) => {
    const dayPayload = {};
    Array.from(dayMap.entries()).forEach(([wordKey, item]) => {
      dayPayload[wordKey] = {
        word: item.word || wordKey,
        pos: item.pos || '',
        meaning: item.meaning || '',
        language: normalizeWordLanguage(item.language, item.word || wordKey),
        savedAt: Number(item.savedAt) || Date.now(),
      };
    });
    if (Object.keys(dayPayload).length) {
      payload[dateKey] = dayPayload;
    }
  });
  return payload;
}

function buildConversationLogMap(rawLogByDate) {
  const dateEntries = Object.entries(rawLogByDate || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const map = new Map();
  dateEntries.forEach(([dateKey, dayLog]) => {
    const itemEntries = Object.entries(dayLog || {}).sort(
      (a, b) => (a[1]?.savedAt ?? 0) - (b[1]?.savedAt ?? 0),
    );
    map.set(dateKey, new Map(itemEntries));
  });
  return map;
}

function normalizeConversationLogByDate(rawLog) {
  const normalized = {};
  const source = rawLog && typeof rawLog === 'object' ? rawLog : {};

  Object.entries(source).forEach(([key, value]) => {
    if (isDateKey(key) && value && typeof value === 'object' && !Array.isArray(value)) {
      const dayBucket = {};
      Object.entries(value).forEach(([archiveId, item]) => {
        if (!item || typeof item !== 'object') {
          return;
        }
        const savedAt = Number(item.savedAt) || Date.now();
        dayBucket[archiveId] = {
          id: item.id || archiveId,
          title: trimArchiveTitle(item.title || item?.structured?.title || '', ARCHIVE_TITLE_MAX_CHARS)
            || buildArchiveTitleFromMessages(Array.isArray(item.messages) ? item.messages : [])
            || trimArchiveTitle(t('archiveDefaultTitle'), ARCHIVE_TITLE_MAX_CHARS),
          savedAt,
          dateKey: key,
          source: item.source || 'local',
          messageCount: Number(item.messageCount) || 0,
          messages: Array.isArray(item.messages) ? item.messages : [],
          structured: item.structured || null,
          report: String(item.report || ''),
          reflection: String(item.reflection || ''),
        };
      });
      if (Object.keys(dayBucket).length) {
        normalized[key] = dayBucket;
      }
      return;
    }

    if (!value || typeof value !== 'object') {
      return;
    }
    const savedAt = Number(value.savedAt) || Date.now();
    const dateKey = getDateKeyFromTimestamp(savedAt) || getTodayDateKey();
    if (!normalized[dateKey]) {
      normalized[dateKey] = {};
    }
    normalized[dateKey][key] = {
      id: value.id || key,
      title: trimArchiveTitle(value.title || value?.structured?.title || '', ARCHIVE_TITLE_MAX_CHARS)
        || buildArchiveTitleFromMessages(Array.isArray(value.messages) ? value.messages : [])
        || trimArchiveTitle(t('archiveDefaultTitle'), ARCHIVE_TITLE_MAX_CHARS),
      savedAt,
      dateKey,
      source: value.source || 'local',
      messageCount: Number(value.messageCount) || 0,
      messages: Array.isArray(value.messages) ? value.messages : [],
      structured: value.structured || null,
      report: String(value.report || ''),
      reflection: String(value.reflection || ''),
    };
  });

  return normalized;
}

function mapToConversationLogObject(conversationMap) {
  const payload = {};
  Array.from(conversationMap.entries()).forEach(([dateKey, dayMap]) => {
    const dayPayload = {};
    Array.from(dayMap.entries()).forEach(([archiveId, item]) => {
      dayPayload[archiveId] = {
        id: item.id || archiveId,
        title: trimArchiveTitle(item.title || item?.structured?.title || '', ARCHIVE_TITLE_MAX_CHARS)
          || buildArchiveTitleFromMessages(Array.isArray(item.messages) ? item.messages : [])
          || trimArchiveTitle(t('archiveDefaultTitle'), ARCHIVE_TITLE_MAX_CHARS),
        savedAt: Number(item.savedAt) || Date.now(),
        dateKey,
        source: item.source || 'local',
        messageCount: Number(item.messageCount) || 0,
        messages: Array.isArray(item.messages) ? item.messages : [],
        structured: item.structured || null,
        report: String(item.report || ''),
        reflection: String(item.reflection || ''),
      };
    });
    if (Object.keys(dayPayload).length) {
      payload[dateKey] = dayPayload;
    }
  });
  return payload;
}

function pickMeaningForCurrentLanguage(detail) {
  const meanings = detail?.meanings || [];
  if (!meanings.length) {
    return { pos: '', meaning: '' };
  }
  const targetLabel = getLanguageLabel(state.language);
  const preferred = meanings.find((item) => item?.zh && item?.pos === targetLabel);
  const fallback = meanings.find((item) => item?.zh);
  const selected = preferred || fallback;
  return {
    pos: selected?.pos || '',
    meaning: (selected?.zh || '').replace(/\n+/g, '；'),
  };
}

function saveCurrentWordsToLog() {
  if (!state.articleId) {
    return;
  }

  const pendingEntries = getPendingWordEntries();
  if (pendingEntries.length === 0) {
    setExportStatus('当前没有待保存生词。');
    return;
  }

  const stored = normalizeSavedWordLogByDate(loadSavedWordLog(state.articleId));
  const merged = { ...stored };
  const dateKey = getTodayDateKey();
  const dayBucket = { ...(merged[dateKey] || {}) };
  const now = Date.now();

  pendingEntries.forEach(([, detail]) => {
    const rawWord = (detail?.requested || detail?.word || '').trim();
    if (!rawWord) {
      return;
    }
    const key = normalizeWordKey(rawWord);
    const wordLanguage = normalizeWordLanguage(detail?.language, rawWord);
    const { pos, meaning } = pickMeaningForCurrentLanguage(detail);
    dayBucket[key] = {
      word: rawWord,
      pos,
      meaning,
      language: wordLanguage,
      savedAt: now,
    };
  });

  merged[dateKey] = dayBucket;

  saveSavedWordLog(state.articleId, merged);
  scheduleCloudArticleSync(state.articleId);
  pendingEntries.forEach(([wordKey, detail]) => {
    state.clickedWords.set(wordKey, {
      ...detail,
      savedInLog: true,
      savedAtLog: now,
    });
  });
  saveSession(state.articleId, Object.fromEntries(state.clickedWords));
  state.savedWordLog = buildSavedWordLogMap(merged);
  if (state.savedLogDateFilter) {
    setSavedLogDateFilter(dateKey);
  }
  refreshWordList();
  refreshSavedLogPanel();
  setExportStatus('已保存到本篇生词日志，并自动清空当前生词集合。');
}

function setSavedLogDateFilter(dateKey) {
  state.savedLogDateFilter = isDateKey(dateKey) ? dateKey : '';
  if (elements.savedLogDateInput) {
    elements.savedLogDateInput.value = state.savedLogDateFilter;
  }
  if (elements.savedLogDateLabel) {
    elements.savedLogDateLabel.textContent = state.savedLogDateFilter || t('allDates');
  }
}

function setSavedLogTab(tab) {
  const nextTab = tab === 'conversations' ? 'conversations' : 'words';
  state.savedLogTab = nextTab;
  if (nextTab === 'conversations') {
    toggleSavedWordLanguageMenu(false);
  }
  refreshSavedLogPanel();
}

function setSavedLogWordLanguageFilter(language) {
  const next = ['all', 'zh', 'en', 'ja'].includes(language) ? language : 'all';
  state.savedLogWordLanguageFilter = next;
  updateSavedWordLanguageTabs();
}

function getSavedWordLanguageFilterLabel(language) {
  switch (language) {
    case 'zh':
      return t('chinese');
    case 'en':
      return t('english');
    case 'ja':
      return t('japanese');
    default:
      return t('allLanguagesTab');
  }
}

function toggleSavedWordLanguageMenu(force) {
  const toggleButton = elements.savedLogWordLanguageToggle || elements.savedLogWordsTab;
  if (!elements.savedLogWordLanguageTabs || !toggleButton) {
    return;
  }
  if (state.savedLogTab === 'conversations') {
    elements.savedLogWordLanguageTabs.hidden = true;
    toggleButton.setAttribute('aria-expanded', 'false');
    return;
  }
  const isOpen = !elements.savedLogWordLanguageTabs.hidden;
  const willOpen = typeof force === 'boolean' ? force : !isOpen;
  elements.savedLogWordLanguageTabs.hidden = !willOpen;
  toggleButton.setAttribute('aria-expanded', String(willOpen));
}

function updateSavedWordLanguageTabs() {
  const toggleButton = elements.savedLogWordLanguageToggle || elements.savedLogWordsTab;
  if (!elements.savedLogWordLanguageTabs || !toggleButton) {
    return;
  }
  const hasIndependentToggle = toggleButton !== elements.savedLogWordsTab;
  const isWords = state.savedLogTab !== 'conversations';
  if (hasIndependentToggle) {
    toggleButton.hidden = !isWords;
  }
  if (!isWords) {
    elements.savedLogWordLanguageTabs.hidden = true;
    toggleButton.setAttribute('aria-expanded', 'false');
  }
  if (hasIndependentToggle) {
    toggleButton.textContent = getSavedWordLanguageFilterLabel(state.savedLogWordLanguageFilter);
  }
  const buttons = elements.savedLogWordLanguageTabs.querySelectorAll('button[data-word-language-filter]');
  buttons.forEach((button) => {
    const key = button.dataset.wordLanguageFilter || 'all';
    button.classList.toggle('active', key === state.savedLogWordLanguageFilter);
  });
}

function getFilteredLogDateKeys(logMap) {
  const dateKeys = Array.from(logMap.keys()).sort((a, b) => b.localeCompare(a));
  return state.savedLogDateFilter
    ? dateKeys.filter((dateKey) => dateKey === state.savedLogDateFilter)
    : dateKeys;
}

function refreshSavedLogPanel() {
  const isWords = state.savedLogTab !== 'conversations';
  if (elements.savedLogWordsTab) {
    elements.savedLogWordsTab.classList.toggle('active', isWords);
  }
  if (elements.savedLogConversationsTab) {
    elements.savedLogConversationsTab.classList.toggle('active', !isWords);
  }
  if (elements.savedWordList) {
    elements.savedWordList.hidden = !isWords;
  }
  if (elements.savedConversationList) {
    elements.savedConversationList.hidden = isWords;
  }
  updateSavedWordLanguageTabs();
  if (isWords) {
    refreshSavedWordLog();
  } else {
    refreshSavedConversationLog();
  }
}

function refreshSavedWordLog() {
  if (!elements.savedWordList) {
    return;
  }

  setSavedLogDateFilter(state.savedLogDateFilter);
  const filteredDateKeys = getFilteredLogDateKeys(state.savedWordLog);
  const languageFilter = state.savedLogWordLanguageFilter;

  const fragment = document.createDocumentFragment();
  let hasVisibleEntries = false;

  filteredDateKeys.forEach((dateKey) => {
    const dayMap = state.savedWordLog.get(dateKey);
    const entries = Array.from(dayMap?.entries() || []).sort(
      (a, b) => (b[1]?.savedAt ?? 0) - (a[1]?.savedAt ?? 0),
    );

    const visibleEntries = entries.filter(([, item]) => {
      const itemLanguage = normalizeWordLanguage(item?.language, item?.word || '');
      return languageFilter === 'all' || itemLanguage === languageFilter;
    });

    if (!visibleEntries.length) {
      return;
    }

    hasVisibleEntries = true;

    const dateSection = document.createElement('section');
    dateSection.className = 'saved-log-date-section';

    const heading = document.createElement('h4');
    heading.className = 'saved-log-date-heading';
    heading.textContent = dateKey;
    dateSection.appendChild(heading);

    visibleEntries.forEach(([wordKey, item]) => {
      const card = document.createElement('article');
      card.className = 'word-card saved-word-card';

      const header = document.createElement('div');
      header.className = 'word-card-header';

      const title = document.createElement('h3');
      title.textContent = item.word || wordKey;

      const deleteBtn = createSavedLogDeleteButton();
      deleteBtn.dataset.removeDate = dateKey;
      deleteBtn.dataset.removeWord = wordKey;

      header.appendChild(title);
      header.appendChild(deleteBtn);

      const meaning = document.createElement('p');
      meaning.textContent = item.meaning || '—';

      card.appendChild(header);
      card.appendChild(meaning);

      dateSection.appendChild(card);
    });

    fragment.appendChild(dateSection);
  });

  if (!hasVisibleEntries) {
    elements.savedWordList.classList.add('empty-state');
    elements.savedWordList.innerHTML = `<p>${t('noSavedWordsYet')}</p>`;
    return;
  }

  elements.savedWordList.classList.remove('empty-state');
  elements.savedWordList.innerHTML = '';
  elements.savedWordList.appendChild(fragment);
}

function getConversationSourceLabel(source) {
  return source === 'ai' ? t('archiveSourceAI') : t('archiveSourceLocal');
}

function createSavedLogDeleteButton() {
  const deleteBtn = document.createElement('button');
  const deleteLabel = t('delete');
  deleteBtn.className = 'saved-word-delete';
  deleteBtn.type = 'button';
  deleteBtn.textContent = '×';
  deleteBtn.setAttribute('aria-label', deleteLabel);
  deleteBtn.title = deleteLabel;
  return deleteBtn;
}

function getConversationPreview(entry) {
  if (entry?.structured?.userAssistantSummary) {
    return String(entry.structured.userAssistantSummary).trim();
  }
  if (entry?.report) {
    const lines = String(entry.report).split('\n').map((line) => line.trim()).filter(Boolean);
    return lines.slice(0, 2).join(' ');
  }
  return '—';
}

function refreshSavedConversationLog() {
  if (!elements.savedConversationList) {
    return;
  }

  setSavedLogDateFilter(state.savedLogDateFilter);
  const filteredDateKeys = getFilteredLogDateKeys(state.savedConversationLog);

  if (!filteredDateKeys.length) {
    elements.savedConversationList.classList.add('empty-state');
    elements.savedConversationList.innerHTML = `<p>${t('noSavedConversationsYet')}</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  filteredDateKeys.forEach((dateKey) => {
    const dateSection = document.createElement('section');
    dateSection.className = 'saved-log-date-section';

    const heading = document.createElement('h4');
    heading.className = 'saved-log-date-heading';
    heading.textContent = dateKey;
    dateSection.appendChild(heading);

    const dayMap = state.savedConversationLog.get(dateKey);
    const entries = Array.from(dayMap?.entries() || []).sort(
      (a, b) => (b[1]?.savedAt ?? 0) - (a[1]?.savedAt ?? 0),
    );

    entries.forEach(([archiveId, entry]) => {
      const card = document.createElement('article');
      card.className = 'word-card saved-conversation-card';
      card.dataset.openConversation = archiveId;
      card.dataset.openDate = dateKey;
      card.setAttribute('role', 'button');
      card.tabIndex = 0;

      const header = document.createElement('div');
      header.className = 'word-card-header';

      const title = document.createElement('h3');
      const time = entry?.savedAt ? new Date(entry.savedAt).toLocaleTimeString() : '--:--';
      title.textContent = trimArchiveTitle(entry?.title || '', ARCHIVE_TITLE_MAX_CHARS) || `存档${time}`;

      const deleteBtn = createSavedLogDeleteButton();
      deleteBtn.dataset.removeDate = dateKey;
      deleteBtn.dataset.removeConversation = archiveId;

      header.appendChild(title);
      header.appendChild(deleteBtn);

      const meta = document.createElement('p');
      meta.className = 'conversation-card-meta';
      meta.textContent = time;

      const preview = document.createElement('p');
      preview.className = 'conversation-card-preview';
      preview.textContent = getConversationPreview(entry);

      card.appendChild(header);
      card.appendChild(meta);
      if (preview.textContent) {
        card.appendChild(preview);
      }

      dateSection.appendChild(card);
    });

    fragment.appendChild(dateSection);
  });

  elements.savedConversationList.classList.remove('empty-state');
  elements.savedConversationList.innerHTML = '';
  elements.savedConversationList.appendChild(fragment);
  elements.savedConversationList.scrollTop = 0;
}

function getConversationArchiveEntry(dateKey, archiveId) {
  const dayMap = state.savedConversationLog.get(dateKey);
  if (!dayMap) {
    return null;
  }
  return dayMap.get(archiveId) || null;
}

function renderConversationArchiveMessages(messages) {
  if (!elements.conversationDetailMessages) {
    return;
  }
  const list = Array.isArray(messages)
    ? messages.filter((m) => (m?.role === 'user' || m?.role === 'assistant') && String(m?.content || '').trim())
    : [];
  if (!list.length) {
    elements.conversationDetailMessages.innerHTML = `<p class="conversation-detail-empty">${t('archiveEmptyMessages')}</p>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  list.forEach((item) => {
    const card = document.createElement('article');
    card.className = `conversation-detail-item ${item.role === 'user' ? 'is-user' : 'is-assistant'}`;

    const role = document.createElement('p');
    role.className = 'conversation-detail-role';
    role.textContent = getConversationArchiveRoleLabel(item.role);

    const content = document.createElement('p');
    content.className = 'conversation-detail-content';
    content.textContent = String(item.content || '').trim();

    card.appendChild(role);
    card.appendChild(content);
    fragment.appendChild(card);
  });

  elements.conversationDetailMessages.innerHTML = '';
  elements.conversationDetailMessages.appendChild(fragment);
}

function getConversationArchiveRoleLabel(role) {
  const normalizedRole = role === 'assistant' ? 'assistant' : 'user';
  if (normalizedRole === 'user') {
    if (!isCloudEnabled()) {
      return t('archiveRoleUser');
    }
    const userLabel = getPublicUserLabel();
    return userLabel || t('archiveRoleUser');
  }

  if (!isCloudEnabled()) {
    return t('archiveRoleAssistant');
  }

  const assistantLabel = String(state.assistant?.label || '').trim();
  if (!assistantLabel || assistantLabel === DEFAULT_ASSISTANT_LABEL) {
    return t('archiveRoleAssistant');
  }
  return assistantLabel;
}

function renderConversationArchiveDetail(entry) {
  if (!entry) {
    return;
  }
  const title = trimArchiveTitle(entry.title || entry?.structured?.title || '', ARCHIVE_TITLE_MAX_CHARS)
    || trimArchiveTitle(t('archiveDefaultTitle'), ARCHIVE_TITLE_MAX_CHARS);
  const savedTime = entry?.savedAt ? new Date(entry.savedAt).toLocaleString() : '--';
  const turns = Number(entry?.messageCount) || 0;

  if (elements.conversationDetailHeadline) {
    elements.conversationDetailHeadline.textContent = title;
  }
  if (elements.conversationDetailMeta) {
    elements.conversationDetailMeta.textContent = `${savedTime} · ${getConversationSourceLabel(entry?.source)} · ${turns} ${t('archiveTurnsUnit')}`;
  }
  if (elements.conversationDetailSummary) {
    elements.conversationDetailSummary.textContent = String(
      entry?.structured?.userAssistantSummary || getConversationPreview(entry) || '—',
    );
  }
  if (elements.conversationDetailEvaluation) {
    elements.conversationDetailEvaluation.textContent = String(
      entry?.structured?.neutralEvaluation || '—',
    );
  }
  if (elements.conversationDetailMessagesPanel) {
    elements.conversationDetailMessagesPanel.removeAttribute('open');
  }
  if (elements.conversationDetailReflection) {
    elements.conversationDetailReflection.value = String(entry?.reflection || '');
  }
  renderConversationReflectionPreview(String(entry?.reflection || ''));
  renderConversationArchiveMessages(entry?.messages || []);
}

function renderConversationReflectionPreview(value = '') {
  if (!elements.conversationDetailReflectionPreview) {
    return;
  }
  const reflection = String(value || '').trim();
  if (!reflection) {
    elements.conversationDetailReflectionPreview.textContent = t('archiveDetailReflectionPreviewEmpty');
    elements.conversationDetailReflectionPreview.classList.add('is-empty');
    return;
  }
  elements.conversationDetailReflectionPreview.textContent = String(value || '');
  elements.conversationDetailReflectionPreview.classList.remove('is-empty');
}

function confirmActiveConversationReflection() {
  if (!elements.conversationDetailReflection) {
    return;
  }
  const reflection = elements.conversationDetailReflection.value || '';
  updateActiveConversationReflection(reflection);
  renderConversationReflectionPreview(reflection);
}

function updateActiveConversationReflection(value) {
  if (!state.activeConversationArchive) {
    return;
  }
  const articleId = getActiveConversationLogArticleId();
  const { dateKey, archiveId } = state.activeConversationArchive;
  const dayMap = state.savedConversationLog.get(dateKey);
  if (!dayMap) {
    return;
  }
  const entry = dayMap.get(archiveId);
  if (!entry) {
    return;
  }

  const reflection = String(value || '');
  if (String(entry.reflection || '') === reflection) {
    return;
  }

  dayMap.set(archiveId, {
    ...entry,
    reflection,
  });
  state.savedConversationLog.set(dateKey, dayMap);

  const timerKey = getReflectionSaveKey(articleId, dateKey, archiveId);
  const previousTimer = reflectionSaveTimers.get(timerKey);
  if (previousTimer) {
    clearTimeout(previousTimer);
  }

  const timer = window.setTimeout(() => {
    reflectionSaveTimers.delete(timerKey);
    saveConversationLog(articleId, mapToConversationLogObject(state.savedConversationLog));
    scheduleCloudArticleSync(articleId);
  }, REFLECTION_SAVE_DEBOUNCE_MS);

  reflectionSaveTimers.set(timerKey, timer);
}

function refreshConversationArchiveDetailView() {
  if (!state.activeConversationArchive || !isConversationArchiveDetailOpen()) {
    return;
  }
  const { dateKey, archiveId } = state.activeConversationArchive;
  const entry = getConversationArchiveEntry(dateKey, archiveId);
  if (!entry) {
    closeConversationArchiveDetail();
    return;
  }
  renderConversationArchiveDetail(entry);
}

function isConversationArchiveDetailOpen() {
  return Boolean(elements.conversationDetailModal)
    && elements.conversationDetailModal.getAttribute('aria-hidden') === 'false';
}

function openConversationArchiveDetail(dateKey, archiveId) {
  if (!dateKey || !archiveId || !elements.conversationDetailModal) {
    return;
  }
  const entry = getConversationArchiveEntry(dateKey, archiveId);
  if (!entry) {
    return;
  }
  state.activeConversationArchive = { dateKey, archiveId };
  renderConversationArchiveDetail(entry);
  elements.conversationDetailModal.setAttribute('aria-hidden', 'false');
  elements.conversationDetailModal.classList.add('open');
  document.body.classList.add('conversation-detail-open');
}

function closeConversationArchiveDetail() {
  if (!elements.conversationDetailModal) {
    return;
  }
  elements.conversationDetailModal.setAttribute('aria-hidden', 'true');
  elements.conversationDetailModal.classList.remove('open');
  document.body.classList.remove('conversation-detail-open');
  state.activeConversationArchive = null;
}

function toggleSavedLogDrawer(force) {
  if (!elements.savedLogDrawer || !elements.savedLogBackdrop) {
    return;
  }
  const willOpen = typeof force === 'boolean'
    ? force
    : !elements.savedLogDrawer.classList.contains('open');
  elements.savedLogDrawer.classList.toggle('open', willOpen);
  elements.savedLogDrawer.setAttribute('aria-hidden', String(!willOpen));
  elements.savedLogBackdrop.classList.toggle('open', willOpen);
  elements.savedLogBackdrop.setAttribute('aria-hidden', String(!willOpen));
  document.body.classList.toggle('saved-log-open', willOpen);
  if (!willOpen) {
    toggleSavedWordLanguageMenu(false);
  }
  if (willOpen) {
    refreshSavedLogPanel();
    if (state.savedLogTab === 'conversations') {
      elements.savedConversationList?.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      elements.savedWordList?.scrollTo({ top: 0, behavior: 'auto' });
    }
    if (savedLogOpenAnimationTimer) {
      window.clearTimeout(savedLogOpenAnimationTimer);
    }
    elements.savedLogDrawer.classList.remove('saved-log-reveal');
    window.requestAnimationFrame(() => {
      elements.savedLogDrawer?.classList.add('saved-log-reveal');
      savedLogOpenAnimationTimer = window.setTimeout(() => {
        elements.savedLogDrawer?.classList.remove('saved-log-reveal');
        savedLogOpenAnimationTimer = null;
      }, 360);
    });
  } else {
    elements.savedLogDrawer.classList.remove('saved-log-reveal');
  }
}

function bindSavedLogSwipeGesture() {
  if (!elements.savedLogDrawer) {
    return;
  }
  let startX = 0;
  let startY = 0;

  document.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) {
      return;
    }
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  document.addEventListener('touchend', (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) {
      return;
    }
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }
    const isOpen = elements.savedLogDrawer.classList.contains('open');
    if (deltaX < -70 && !isOpen) {
      toggleSavedLogDrawer(true);
      return;
    }
    if (deltaX > 70 && isOpen) {
      toggleSavedLogDrawer(false);
    }
  }, { passive: true });
}

function removeSavedWord(dateKey, wordKey) {
  if (!state.articleId || !dateKey || !wordKey) {
    return;
  }
  const dayMap = state.savedWordLog.get(dateKey);
  if (!dayMap || !dayMap.has(wordKey)) {
    return;
  }

  dayMap.delete(wordKey);
  if (dayMap.size === 0) {
    state.savedWordLog.delete(dateKey);
  } else {
    state.savedWordLog.set(dateKey, dayMap);
  }

  saveSavedWordLog(state.articleId, mapToSavedWordLogObject(state.savedWordLog));
  scheduleCloudArticleSync(state.articleId);
  refreshSavedLogPanel();
  setExportStatus('已删除该条生词日志。');
}

function removePendingWord(wordKey) {
  if (!state.articleId || !wordKey || !state.clickedWords.has(wordKey)) {
    return;
  }
  state.clickedWords.delete(wordKey);
  saveSession(state.articleId, Object.fromEntries(state.clickedWords));
  markVisitedWords();
  refreshWordList();

  const activeWordKey = normalizeWordKey(tooltipState.detail?.word || '');
  if (activeWordKey && activeWordKey === wordKey) {
    hideTooltip();
  }
}

function clearCurrentSavedLog() {
  if (!state.articleId) {
    return;
  }
  state.savedWordLog = new Map();
  state.savedLogDateFilter = '';
  setSavedLogWordLanguageFilter('all');
  clearSavedWordLog(state.articleId);
  scheduleCloudArticleSync(state.articleId);
  refreshSavedLogPanel();
  setExportStatus('已清空本篇生词日志。');
}

function removeSavedConversation(dateKey, archiveId) {
  if (!dateKey || !archiveId) {
    return;
  }
  const articleId = getActiveConversationLogArticleId();
  const dayMap = state.savedConversationLog.get(dateKey);
  if (!dayMap || !dayMap.has(archiveId)) {
    return;
  }

  dayMap.delete(archiveId);
  if (dayMap.size === 0) {
    state.savedConversationLog.delete(dateKey);
  } else {
    state.savedConversationLog.set(dateKey, dayMap);
  }

  saveConversationLog(articleId, mapToConversationLogObject(state.savedConversationLog));
  scheduleCloudArticleSync(articleId);
  if (state.activeConversationArchive?.dateKey === dateKey && state.activeConversationArchive?.archiveId === archiveId) {
    closeConversationArchiveDetail();
  }
  refreshSavedLogPanel();
  setExportStatus('已删除该条聊天存档。');
}

function clearCurrentConversationLog() {
  const articleId = getActiveConversationLogArticleId();
  state.savedConversationLog = new Map();
  state.savedLogDateFilter = '';
  saveConversationLog(articleId, {});
  scheduleCloudArticleSync(articleId);
  closeConversationArchiveDetail();
  refreshSavedLogPanel();
  setExportStatus('已清空本篇聊天存档。');
}

function showTooltip(anchor, detail, { anchorRect = null } = {}) {
  tooltipState.anchor = anchor || null;
  if (anchorRect) {
    tooltipState.anchorRect = {
      left: Number(anchorRect.left) || 0,
      top: Number(anchorRect.top) || 0,
      right: Number(anchorRect.right) || 0,
      bottom: Number(anchorRect.bottom) || 0,
      width: Number(anchorRect.width) || 0,
      height: Number(anchorRect.height) || 0,
    };
  } else if (anchor && typeof anchor.getBoundingClientRect === 'function') {
    const rect = anchor.getBoundingClientRect();
    tooltipState.anchorRect = {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  } else {
    tooltipState.anchorRect = null;
  }
  tooltipState.detail = detail;
  elements.tooltip.classList.add('active');
  elements.tooltip.setAttribute('aria-hidden', 'false');
  if (!elements.tooltipContent) {
    return;
  }
  elements.tooltipContent.style.top = '0px';
  elements.tooltipContent.style.left = '0px';

  // 多语言朗读：英文显示英/美；中文/日语显示通用“读”按钮
  const wordText = detail.requested || detail.word || anchor?.dataset?.word || '';
  const wordLanguage = normalizeWordLanguage(detail.language, wordText);
  const showEnglishPronunciation = wordLanguage === 'en';
  const showGeneralPronunciation = ['zh', 'ja'].includes(wordLanguage);
  if (elements.playUkBtn) {
    if (showEnglishPronunciation) {
      elements.playUkBtn.style.display = '';
      elements.playUkBtn.textContent = '英';
      elements.playUkBtn.title = '英式发音';
      elements.playUkBtn.setAttribute('aria-label', '英式发音');
    } else {
      elements.playUkBtn.style.display = 'none';
    }
  }
  if (elements.playUsBtn) {
    if (showEnglishPronunciation || showGeneralPronunciation) {
      elements.playUsBtn.style.display = '';
      if (showEnglishPronunciation) {
        elements.playUsBtn.textContent = '美';
        elements.playUsBtn.title = '美式发音';
        elements.playUsBtn.setAttribute('aria-label', '美式发音');
      } else {
        const label = getLanguageLabel(wordLanguage);
        elements.playUsBtn.textContent = '读';
        elements.playUsBtn.title = `${label}发音`;
        elements.playUsBtn.setAttribute('aria-label', `${label}发音`);
      }
    } else {
      elements.playUsBtn.style.display = 'none';
    }
  }

  elements.tooltipWord.textContent = wordText;
  const body = document.createElement('div');

  if (detail.phonetics) {
    const phonetic = document.createElement('div');
    phonetic.className = 'phonetic';
    phonetic.textContent = detail.phonetics;
    body.appendChild(phonetic);
  }

  const baseForm = getDisplayBaseForm(detail);
  if (baseForm) {
    const base = document.createElement('div');
    base.className = 'phonetic';
    base.textContent = `${t('baseFormLabel')}：${baseForm}`;
    body.appendChild(base);
  }

  if (detail.meanings?.length) {
    detail.meanings.forEach((meaning) => {
      const block = document.createElement('div');
      block.className = 'meaning';
      const heading = document.createElement('strong');
      heading.textContent = formatMeaningText(meaning);
      block.appendChild(heading);
      body.appendChild(block);
    });
  }

  if (detail.derivatives?.length) {
    const derivatives = document.createElement('div');
    derivatives.className = 'derivatives';
    detail.derivatives.forEach((item) => {
      const span = document.createElement('span');
      span.className = 'derivative-item';
      span.textContent = formatDerivative(item);
      derivatives.appendChild(span);
    });
    body.appendChild(derivatives);
  }
  elements.tooltipBody.innerHTML = '';
  elements.tooltipBody.appendChild(body);

  positionTooltip();
}

function hideTooltip() {
  elements.tooltip.classList.remove('active');
  elements.tooltip.setAttribute('aria-hidden', 'true');
  tooltipState.anchor = null;
  tooltipState.anchorRect = null;
  tooltipState.detail = null;
}

function formatDerivative(item) {
  const marker = item.deMarker ? `（${item.deMarker}）` : '';
  const pos = item.pos ? `，${item.pos}` : '';
  return `${item.word} · ${item.zh}${marker}${pos}`;
}

function formatMeaningText(meaning) {
  if (!meaning) {
    return '';
  }
  const zh = (meaning.zh || '').replace(/\n+/g, '；');
  if (meaning.pos) {
    return `${meaning.pos} · ${zh}`.trim();
  }
  return zh;
}

function getDisplayBaseForm(detail) {
  const base = String(detail?.baseForm || '').trim();
  const raw = String(detail?.requested || detail?.word || '').trim();
  if (!base || !raw || base === raw) {
    return '';
  }
  return base;
}

function ensureSpeechVoicesLoaded(timeoutMs = 700) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve(false);
  }
  const synth = window.speechSynthesis;
  const voices = synth.getVoices() || [];
  if (voices.length) {
    state.ttsVoicesReady = true;
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (loaded) => {
      if (settled) {
        return;
      }
      settled = true;
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      state.ttsVoicesReady = Boolean(loaded);
      resolve(Boolean(loaded));
    };
    const onVoicesChanged = () => {
      const nextVoices = synth.getVoices() || [];
      if (nextVoices.length) {
        finish(true);
      }
    };
    synth.addEventListener('voiceschanged', onVoicesChanged);
    setTimeout(() => {
      const nextVoices = synth.getVoices() || [];
      finish(nextVoices.length > 0);
    }, Math.max(0, Number(timeoutMs) || 0));
  });
}

function primeSpeechVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  try {
    window.speechSynthesis.getVoices();
    ensureSpeechVoicesLoaded(1200).catch(() => {});
  } catch (error) {
    console.warn('[Audio] speech voice warmup failed:', error);
  }
}

function pickSpeechVoice(language = 'en', accent = 'us') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) {
    return null;
  }

  const langPriorities = language === 'en'
    ? (accent === 'uk' ? ['en-GB', 'en-AU', 'en-IE', 'en-US'] : ['en-US', 'en-GB', 'en-AU', 'en-IE'])
    : (language === 'ja' ? ['ja-JP', 'ja'] : ['zh-CN', 'zh-TW', 'zh']);

  const voiceHints = language === 'en'
    ? (accent === 'uk'
      ? ['google uk english', 'microsoft libby', 'serena', 'karen', 'daniel']
      : ['samantha', 'alex', 'google us english', 'microsoft aria', 'jenny', 'zira'])
    : [];

  let best = null;
  let bestScore = -Infinity;
  voices.forEach((voice) => {
    const lang = String(voice?.lang || '').toLowerCase();
    const name = String(voice?.name || '').toLowerCase();
    let score = 0;

    langPriorities.forEach((prefix, idx) => {
      if (lang.startsWith(prefix.toLowerCase())) {
        score += 90 - idx * 12;
      }
    });
    voiceHints.forEach((hint, idx) => {
      if (name.includes(hint)) {
        score += 35 - idx * 4;
      }
    });
    if (voice?.localService) {
      score += 6;
    }
    if (/compact|espeak|robot/.test(name)) {
      score -= 15;
    }

    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  });

  return best;
}

function startPronunciationRequest() {
  activePronunciationRequestId += 1;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (state.audio) {
    state.audio.pause();
    state.audio.currentTime = 0;
  }
  return activePronunciationRequestId;
}

function isLatestPronunciationRequest(requestId) {
  return Number(requestId) === Number(activePronunciationRequestId);
}

function splitJapaneseSpeechSegments(text, maxChars = JA_TTS_SEGMENT_MAX_CHARS) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    return [];
  }

  const sentenceLikeParts = clean.match(/[^。．.!！?？；;]+[。．.!！?？；;]?/g) || [clean];
  const safeMax = Math.max(8, Number(maxChars) || JA_TTS_SEGMENT_MAX_CHARS);
  const segments = [];

  sentenceLikeParts.forEach((part) => {
    const item = String(part || '').trim();
    if (!item) {
      return;
    }
    if (item.length <= safeMax) {
      segments.push(item);
      return;
    }
    for (let i = 0; i < item.length; i += safeMax) {
      const chunk = item.slice(i, i + safeMax).trim();
      if (chunk) {
        segments.push(chunk);
      }
    }
  });

  return segments;
}

async function playAudioSource(source, { waitForEnd = false, requestId = 0 } = {}) {
  if (!source || !isLatestPronunciationRequest(requestId)) {
    return false;
  }

  if (!state.audio) {
    state.audio = new Audio();
  }
  const audio = state.audio;

  if (!waitForEnd) {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = source;
      await audio.play();
      return isLatestPronunciationRequest(requestId);
    } catch (error) {
      console.warn('[Audio] play failed:', error);
      return false;
    }
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) {
        return;
      }
      settled = true;
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('abort', onAbort);
      resolve(Boolean(ok) && isLatestPronunciationRequest(requestId));
    };
    const onEnded = () => finish(true);
    const onError = () => finish(false);
    const onAbort = () => finish(false);

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = source;
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.addEventListener('abort', onAbort);
      audio.play().then(() => {
        if (!isLatestPronunciationRequest(requestId)) {
          finish(false);
        }
      }).catch((error) => {
        console.warn('[Audio] play failed:', error);
        finish(false);
      });
    } catch (error) {
      console.warn('[Audio] play failed:', error);
      finish(false);
    }
  });
}

async function playAudioSourceWithFetchFallback(source, { waitForEnd = false, requestId = 0 } = {}) {
  const played = await playAudioSource(source, { waitForEnd, requestId });
  if (played || !isLatestPronunciationRequest(requestId)) {
    return played;
  }

  try {
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await playAudioSource(objectUrl, { waitForEnd, requestId });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    console.warn('[Audio] fetch fallback failed:', error);
    return false;
  }
}

async function playJapaneseSegmentsByUrl(text, requestId, maxChars = JA_TTS_SEGMENT_MAX_CHARS) {
  const segments = splitJapaneseSpeechSegments(text, maxChars);
  if (!segments.length) {
    return false;
  }

  let playedAny = false;
  for (let i = 0; i < segments.length; i += 1) {
    if (!isLatestPronunciationRequest(requestId)) {
      return playedAny;
    }
    const segment = segments[i];
    const segmentUrl = buildYoudaoJapaneseSpeakUrl(segment);
    const ok = await playAudioSourceWithFetchFallback(segmentUrl, { waitForEnd: true, requestId });
    if (ok) {
      playedAny = true;
    }
  }

  return playedAny;
}

function playPronunciation(detail, accentOverride = '') {
  if (!detail) {
    return;
  }
  const targetWord = detail.requested || detail.word;
  if (!targetWord) {
    return;
  }
  const wordLanguage = normalizeWordLanguage(detail.language, targetWord);
  const playbackWord = targetWord;
  const fallbackSpeechText = wordLanguage === 'ja'
    ? (String(detail.phonetics || '').trim() || playbackWord)
    : targetWord;
  const accent = wordLanguage === 'en' ? (accentOverride || state.pronunciationAccent || 'us') : 'us';
  const requestId = startPronunciationRequest();
  const isEnglish = wordLanguage === 'en';
  const isEnglishSentence = isEnglish && /\s|[,.!?;:]/.test(String(targetWord || '').trim());
  const shouldSegmentJapanese = wordLanguage === 'ja' && splitJapaneseSpeechSegments(playbackWord, JA_TTS_SEGMENT_MAX_CHARS).length > 1;
  const allowSpeechFallback = true;
  const url = isEnglish
    ? (isEnglishSentence ? '' : buildDictVoiceUrl(targetWord, accent))
    : (wordLanguage === 'ja'
      ? buildYoudaoJapaneseSpeakUrl(playbackWord)
      : (detail.speakUrl || detail.tSpeakUrl || ''));

  const playBySpeechSynthesis = async () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }
    try {
      if (!isLatestPronunciationRequest(requestId)) {
        return false;
      }
      if (!state.ttsVoicesReady) {
        await ensureSpeechVoicesLoaded(700);
      }
      if (!isLatestPronunciationRequest(requestId)) {
        return false;
      }
      const utterance = new SpeechSynthesisUtterance(fallbackSpeechText);
      const voice = pickSpeechVoice(wordLanguage, accent);
      utterance.lang = voice?.lang || (wordLanguage === 'ja' ? 'ja-JP' : (wordLanguage === 'zh' ? 'zh-CN' : 'en-US'));
      if (voice) {
        utterance.voice = voice;
      }
      if (wordLanguage === 'en') {
        utterance.rate = isEnglishSentence ? 0.94 : 0.98;
        utterance.pitch = 1;
      }
      if (!isLatestPronunciationRequest(requestId)) {
        return false;
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.warn('[Audio] speech synthesis failed:', error);
      return false;
    }
  };

  if (isEnglishSentence) {
    playBySpeechSynthesis().then((ok) => {
      if (!ok) {
        console.warn('[Audio] no playable speech voice for', targetWord);
      }
    });
    return;
  }

  if (shouldSegmentJapanese) {
    playJapaneseSegmentsByUrl(playbackWord, requestId, JA_TTS_SEGMENT_MAX_CHARS).then((ok) => {
      if (!ok) {
        if (allowSpeechFallback) {
          playBySpeechSynthesis().then((speechOk) => {
            if (!speechOk) {
              console.warn('[Audio] no playable speech voice for', targetWord);
            }
          });
        } else {
          console.warn('[Audio] no playable japanese segment for', targetWord);
        }
      }
    });
    return;
  }

  if (!url) {
    if (!allowSpeechFallback) {
      console.warn('[Audio] no playable url for', targetWord);
      return;
    }
    playBySpeechSynthesis().then((ok) => {
      if (!ok) {
        console.warn('[Audio] no playable url for', targetWord);
      }
    });
    return;
  }

  playAudioSourceWithFetchFallback(url, { waitForEnd: false, requestId }).then((ok) => {
    if (ok) {
      return;
    }
    if (allowSpeechFallback) {
      playBySpeechSynthesis().then((speechOk) => {
        if (!speechOk) {
          console.warn('[Audio] no playable speech voice for', targetWord);
        }
      });
    } else {
      console.warn('[Audio] no playable url for', targetWord);
    }
  }).catch((error) => {
    console.warn('[Audio] play failed:', error);
    if (allowSpeechFallback) {
      playBySpeechSynthesis().then((speechOk) => {
        if (!speechOk) {
          console.warn('[Audio] no playable speech voice for', targetWord);
        }
      });
    } else {
      console.warn('[Audio] no playable url for', targetWord);
    }
  });
}

function buildDictVoiceUrl(word, accent = 'us') {
  const type = accent === 'uk' ? 1 : 2;
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
}

function toggleBionicMode() {
  state.bionicEnabled = !state.bionicEnabled;
  renderArticle();
  markVisitedWords();
  updateBionicButton();
}

function updateBionicButton() {
  if (!elements.bionicToggleBtn) {
    return;
  }
  elements.bionicToggleBtn.textContent = '👁';
  elements.bionicToggleBtn.classList.toggle('active', state.bionicEnabled);
}

function setExportStatus(message) {
  if (!elements.exportStatus) {
    return;
  }
  elements.exportStatus.textContent = message;
}

function setAssistantStatus(message) {
  if (!elements.aiStatus) {
    return;
  }
  elements.aiStatus.textContent = message;
}

function setReportStatus(message) {
  if (!elements.reportStatus) {
    return;
  }
  elements.reportStatus.textContent = message;
}

function positionTooltip() {
  if (!elements.tooltipContent || !elements.tooltip.classList.contains('active')) {
    return;
  }
  if (!tooltipState.anchorRect) {
    return;
  }
  if (tooltipState.anchor && !document.body.contains(tooltipState.anchor)) {
    hideTooltip();
    return;
  }
  const rect = tooltipState.anchorRect;
  const { offsetWidth, offsetHeight } = elements.tooltipContent;

  let left = rect.left;
  let top = rect.bottom + 12;

  const viewportRight = window.innerWidth;
  const viewportBottom = window.innerHeight;

  if (left + offsetWidth > viewportRight - 12) {
    left = viewportRight - offsetWidth - 12;
  }
  if (left < 12) {
    left = 12;
  }

  if (top + offsetHeight > viewportBottom - 12) {
    top = rect.top - offsetHeight - 12;
  }
  if (top < 12) {
    top = 12;
  }

  elements.tooltipContent.style.top = `${top}px`;
  elements.tooltipContent.style.left = `${left}px`;
}

function handleTooltipReposition() {
  positionTooltip();
}

function toggleSettingsPanel(force) {
  if (!elements.aiSettingsPanel) {
    return;
  }
  const willShow = typeof force === 'boolean'
    ? force
    : elements.aiSettingsPanel.hidden;
  elements.aiSettingsPanel.hidden = !willShow;
}

function initEmojiPicker() {
  const EMOJI_KEY = 'reader-assistant-emoji';
  const avatar = document.getElementById('assistantAvatar');
  const fab = document.getElementById('aiToggleBtn');
  const picker = document.getElementById('emojiPicker');
  const toggle = document.getElementById('emojiToggle');
  const fabWrap = toggle?.closest('.assistant-fab-wrap');
  if (!fab || !picker || !toggle) return;

  const emojiButtons = Array.from(picker.querySelectorAll('.emoji-pick'));
  const pageSize = Math.max(1, Math.ceil(emojiButtons.length / 2));
  const totalPages = Math.max(1, Math.ceil(emojiButtons.length / pageSize));
  let currentPage = 0;

  function renderEmojiPage(pageIndex) {
    currentPage = pageIndex;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    const visibleCount = Math.max(1, Math.min(pageSize, emojiButtons.length - start));
    let visibleIndex = 0;
    emojiButtons.forEach((button, index) => {
      const isVisible = index >= start && index < end;
      button.classList.toggle('is-hidden', !isVisible);
      if (isVisible) {
        button.style.setProperty('--visible-index', String(visibleIndex));
        button.style.setProperty('--visible-count', String(visibleCount));
        visibleIndex += 1;
      } else {
        button.style.removeProperty('--visible-index');
        button.style.removeProperty('--visible-count');
      }
    });
  }

  function closePicker() {
    if (fabWrap) {
      fabWrap.classList.remove('emoji-toggle-selecting');
    }
    picker.classList.remove('open');
    toggle.classList.remove('open');
    renderEmojiPage(0);
  }

  renderEmojiPage(0);

  const saved = localStorage.getItem(EMOJI_KEY);
  if (saved) {
    if (avatar) avatar.textContent = saved;
    fab.textContent = saved;
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = picker.classList.contains('open');
    if (!isOpen) {
      if (fabWrap) {
        fabWrap.classList.add('emoji-toggle-selecting');
      }
      renderEmojiPage(0);
      picker.classList.add('open');
      toggle.classList.add('open');
      return;
    }

    if (currentPage < totalPages - 1) {
      renderEmojiPage(currentPage + 1);
      return;
    }

    closePicker();
  });

  picker.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-pick');
    if (!btn) return;
    e.stopPropagation();
    const emoji = btn.dataset.emoji;
    fab.textContent = emoji;
    if (avatar) avatar.textContent = emoji;
    localStorage.setItem(EMOJI_KEY, emoji);
    closePicker();
  });

  document.addEventListener('click', () => {
    closePicker();
  });
}

function toggleAssistantDrawer(force) {
  if (!elements.assistantDrawer) {
    return;
  }
  const willOpen = typeof force === 'boolean'
    ? force
    : !elements.assistantDrawer.classList.contains('open');

  if (willOpen) {
    positionAssistantDrawer();
  }
  elements.assistantDrawer.classList.toggle('open', willOpen);
  elements.assistantDrawer.setAttribute('aria-hidden', String(!willOpen));
}

function positionAssistantDrawer() {
  if (!elements.assistantDrawer) {
    return;
  }
  const drawerGap = 8;
  const fabRect = elements.aiToggleBtn?.getBoundingClientRect();

  const drawerRect = elements.assistantDrawer.getBoundingClientRect();
  const width = elements.assistantDrawer.offsetWidth || drawerRect.width || 340;
  const height = elements.assistantDrawer.offsetHeight || drawerRect.height || 260;

  let left = window.innerWidth - width - 16;
  let top = window.innerHeight - height - 24;

  if (fabRect) {
    left = fabRect.right - width;
    top = fabRect.top - height - drawerGap;
  }

  const margin = 12;
  const minLeft = margin;
  const maxLeft = window.innerWidth - width - margin;
  const minTop = margin;
  const maxTop = window.innerHeight - height - margin;

  left = Math.min(Math.max(left, minLeft), maxLeft);
  top = Math.min(Math.max(top, minTop), maxTop);

  elements.assistantDrawer.style.setProperty('--drawer-left', `${left}px`);
  elements.assistantDrawer.style.setProperty('--drawer-top', `${top}px`);
}

function setPdfStatus(message) {
  if (!elements.pdfStatus) {
    return;
  }
  elements.pdfStatus.textContent = message;
}

window.addEventListener('DOMContentLoaded', init);
