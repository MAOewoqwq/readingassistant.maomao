const STORAGE_KEY = 'reader-word-sessions';
const LAST_ARTICLE_KEY = 'reader-last-article';
const ASSISTANT_LABEL_KEY = 'reader-assistant-label';
const APP_LABEL_KEY = 'reader-app-label';
const REPORT_KEY = 'assistant-reports';
const LANGUAGE_KEY = 'reader-language';
const SAVED_WORD_LOG_KEY = 'reader-saved-word-logs';
const CONVERSATION_LOG_KEY = 'assistant-conversation-logs';

function setItemIfChanged(key, nextValue) {
  try {
    const previous = window.localStorage.getItem(key);
    if (previous === nextValue) {
      return;
    }
    window.localStorage.setItem(key, nextValue);
  } catch (error) {
    console.warn('[Storage] set item error:', error);
  }
}

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[Storage] read error:', error);
    return {};
  }
}

function writeStorage(data) {
  try {
    setItemIfChanged(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[Storage] write error:', error);
  }
}

export function loadSession(articleId) {
  const store = readStorage();
  return store[articleId] ?? null;
}

export function saveSession(articleId, payload) {
  const store = readStorage();
  store[articleId] = payload;
  writeStorage(store);
}

export function clearSession(articleId) {
  const store = readStorage();
  if (store[articleId]) {
    delete store[articleId];
    writeStorage(store);
  }
}

export function clearAllSessions() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LAST_ARTICLE_KEY);
    window.localStorage.removeItem(REPORT_KEY);
    window.localStorage.removeItem(SAVED_WORD_LOG_KEY);
    window.localStorage.removeItem(CONVERSATION_LOG_KEY);
  } catch (error) {
    console.warn('[Storage] clear all error:', error);
  }
}

export function saveLastArticle(articleId, text, language, extra = {}) {
  if (!articleId || !text) {
    return;
  }
  const payload = {
    articleId,
    text,
    savedAt: Date.now(),
  };
  if (language) {
    payload.language = language;
  }
  if (extra.displayText) {
    payload.displayText = extra.displayText;
  }
  if (extra.sourceText) {
    payload.sourceText = extra.sourceText;
  }
  if (extra.sourceLanguage) {
    payload.sourceLanguage = extra.sourceLanguage;
  }
  if (extra.contentLanguage) {
    payload.contentLanguage = extra.contentLanguage;
  }
  if (typeof extra.translated === 'boolean') {
    payload.translated = extra.translated;
  }
  try {
    window.localStorage.setItem(LAST_ARTICLE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[Storage] save last article error:', error);
  }
}

export function loadLastArticle() {
  try {
    const raw = window.localStorage.getItem(LAST_ARTICLE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.articleId || !parsed?.text) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[Storage] load last article error:', error);
    return null;
  }
}

export function saveAssistantLabel(label) {
  if (!label) {
    return;
  }
  try {
    window.localStorage.setItem(ASSISTANT_LABEL_KEY, label);
  } catch (error) {
    console.warn('[Storage] save assistant label error:', error);
  }
}

export function loadAssistantLabel() {
  try {
    return window.localStorage.getItem(ASSISTANT_LABEL_KEY) || null;
  } catch (error) {
    console.warn('[Storage] load assistant label error:', error);
    return null;
  }
}

export function saveAppLabel(label) {
  if (!label) {
    return;
  }
  try {
    window.localStorage.setItem(APP_LABEL_KEY, label);
  } catch (error) {
    console.warn('[Storage] save app label error:', error);
  }
}

export function loadAppLabel() {
  try {
    return window.localStorage.getItem(APP_LABEL_KEY) || null;
  } catch (error) {
    console.warn('[Storage] load app label error:', error);
    return null;
  }
}

export function saveLanguagePreference(language) {
  if (!language) {
    return;
  }
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.warn('[Storage] save language error:', error);
  }
}

export function loadLanguagePreference() {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY) || null;
  } catch (error) {
    console.warn('[Storage] load language error:', error);
    return null;
  }
}

function readReports() {
  try {
    const raw = window.localStorage.getItem(REPORT_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[Storage] read reports error:', error);
    return {};
  }
}

function writeReports(data) {
  try {
    setItemIfChanged(REPORT_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[Storage] write reports error:', error);
  }
}

export function saveConversationReport(articleId, report) {
  if (!articleId || !report) {
    return;
  }
  const store = readReports();
  store[articleId] = {
    report,
    savedAt: Date.now(),
  };
  writeReports(store);
}

export function loadConversationReport(articleId) {
  if (!articleId) {
    return null;
  }
  const store = readReports();
  return store[articleId]?.report ?? null;
}

export function clearConversationReport(articleId) {
  if (!articleId) {
    return;
  }
  const store = readReports();
  if (store[articleId]) {
    delete store[articleId];
    writeReports(store);
  }
}

function readSavedWordLogs() {
  try {
    const raw = window.localStorage.getItem(SAVED_WORD_LOG_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[Storage] read saved word logs error:', error);
    return {};
  }
}

function writeSavedWordLogs(data) {
  try {
    setItemIfChanged(SAVED_WORD_LOG_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[Storage] write saved word logs error:', error);
  }
}

export function loadSavedWordLog(articleId) {
  if (!articleId) {
    return {};
  }
  const store = readSavedWordLogs();
  return store[articleId] ?? {};
}

export function saveSavedWordLog(articleId, payload) {
  if (!articleId || !payload || typeof payload !== 'object') {
    return;
  }
  const store = readSavedWordLogs();
  store[articleId] = payload;
  writeSavedWordLogs(store);
}

export function deleteSavedWordLogEntry(articleId, wordKey) {
  if (!articleId || !wordKey) {
    return;
  }
  const store = readSavedWordLogs();
  const articleLog = store[articleId];
  if (!articleLog || !articleLog[wordKey]) {
    return;
  }
  delete articleLog[wordKey];
  store[articleId] = articleLog;
  writeSavedWordLogs(store);
}

export function clearSavedWordLog(articleId) {
  if (!articleId) {
    return;
  }
  const store = readSavedWordLogs();
  if (!store[articleId]) {
    return;
  }
  delete store[articleId];
  writeSavedWordLogs(store);
}

function readConversationLogs() {
  try {
    const raw = window.localStorage.getItem(CONVERSATION_LOG_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[Storage] read conversation logs error:', error);
    return {};
  }
}

function writeConversationLogs(data) {
  try {
    setItemIfChanged(CONVERSATION_LOG_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[Storage] write conversation logs error:', error);
  }
}

export function loadConversationLog(articleId) {
  if (!articleId) {
    return {};
  }
  const store = readConversationLogs();
  return store[articleId] ?? {};
}

export function saveConversationLog(articleId, payload) {
  if (!articleId || !payload || typeof payload !== 'object') {
    return;
  }
  const store = readConversationLogs();
  store[articleId] = payload;
  writeConversationLogs(store);
}

export function listSavedLogArticleIds() {
  const words = readSavedWordLogs();
  const conversations = readConversationLogs();
  return Array.from(new Set([
    ...Object.keys(words || {}),
    ...Object.keys(conversations || {}),
  ])).filter(Boolean);
}
