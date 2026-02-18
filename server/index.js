import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import kuromoji from 'kuromoji';
import { fileURLToPath } from 'url';
import { createSQLStore } from './sqlStore.js';
import { hashPassword, normalizeIdentifier, verifyPassword } from './authUtil.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

loadEnv(envPath);

const PORT = Number(process.env.PORT || 3000);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const YOUDAO_BASE_URL = (process.env.YOUDAO_BASE_URL || 'https://openapi.youdao.com/api').trim().replace(/\/+$/, '');
const YOUDAO_API_ID = (process.env.YOUDAO_API_ID || '').trim();
const YOUDAO_API_KEY = (process.env.YOUDAO_API_KEY || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const GROQ_BASE_URL = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
const GROQ_MODEL = (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
const SELECTION_GROQ_MODEL = (process.env.SELECTION_GROQ_MODEL || GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
const DEEPSEEK_SELECTION_MODEL = (process.env.DEEPSEEK_SELECTION_MODEL || 'deepseek-chat').trim();
const KUROMOJI_DICT_PATH = path.join(rootDir, 'node_modules', 'kuromoji', 'dict');
const SESSION_COOKIE_NAME = 'reader_session';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 30);

const sqlStore = createSQLStore(rootDir);

let japaneseTokenizerPromise = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/assistant') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res);
    }
    if (req.method === 'POST') {
      return handleAssistantProxy(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }
  if (url.pathname === '/api/youdao') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res);
    }
    if (req.method === 'POST') {
      return handleYoudaoProxy(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/translate') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res);
    }
    if (req.method === 'POST') {
      return handleTranslateProxy(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/ja-reading') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res);
    }
    if (req.method === 'POST') {
      return handleJapaneseReadingProxy(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/ja-phrase') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res);
    }
    if (req.method === 'POST') {
      return handleJapanesePhraseProxy(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/ja-selection') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res);
    }
    if (req.method === 'POST') {
      return handleSelectionProxy(req, res, { forcedLanguage: 'ja' });
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/selection') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res);
    }
    if (req.method === 'POST') {
      return handleSelectionProxy(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/auth/register') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res, 'POST, OPTIONS');
    }
    if (req.method === 'POST') {
      return handleAuthRegister(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/auth/login') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res, 'POST, OPTIONS');
    }
    if (req.method === 'POST') {
      return handleAuthLogin(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/auth/logout') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res, 'POST, OPTIONS');
    }
    if (req.method === 'POST') {
      return handleAuthLogout(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/auth/me') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res, 'GET, OPTIONS');
    }
    if (req.method === 'GET') {
      return handleAuthMe(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/sync/bootstrap') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res, 'GET, OPTIONS');
    }
    if (req.method === 'GET') {
      return handleSyncBootstrap(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (url.pathname === '/api/sync/article-log') {
    if (req.method === 'OPTIONS') {
      return sendOptions(res, 'GET, POST, OPTIONS');
    }
    if (req.method === 'GET') {
      return handleSyncArticleLogGet(req, res, url);
    }
    if (req.method === 'POST') {
      return handleSyncArticleLogSave(req, res);
    }
    return sendJSON(res, 405, { error: 'Method Not Allowed' });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }
  serveStatic(url.pathname, res, req.method === 'HEAD');
});

let hasRetriedPort = false;

server.on('error', (error) => {
  if (!hasRetriedPort && ['EADDRINUSE', 'EACCES', 'EPERM'].includes(error.code)) {
    hasRetriedPort = true;
    console.warn(`[Server] Port ${PORT} unavailable (${error.code}). Trying a random available port...`);
    server.listen(0);
    return;
  }
  console.error('[Server] Failed to start server:', error);
  process.exit(1);
});

server.on('listening', () => {
  const addressInfo = server.address();
  const actualPort = typeof addressInfo === 'object' && addressInfo ? addressInfo.port : PORT;
  console.log(`[Server] running at http://localhost:${actualPort}`);
  console.log(`[Server] SQL store: ${sqlStore.dbPath}`);
  if (!DEEPSEEK_API_KEY) {
    console.warn('[Server] DEEPSEEK_API_KEY is missing. Set it in .env to enable /api/assistant and primary /api/translate.');
  }
  if (!GROQ_API_KEY) {
    console.warn('[Server] GROQ_API_KEY is missing. Groq fallback for /api/translate and /api/selection is disabled.');
  }
  if (!GROQ_API_KEY && !DEEPSEEK_API_KEY) {
    console.warn('[Server] GROQ_API_KEY and DEEPSEEK_API_KEY are both missing. /api/translate is unavailable and /api/selection will only return local analysis.');
  }
});

server.listen(PORT);

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const [rawKey, ...rest] = trimmed.split('=');
    const key = rawKey?.trim();
    if (!key) {
      return;
    }
    const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  });
}

function sendOptions(res, methods = 'POST, OPTIONS') {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
  });
  res.end();
}

function sendJSON(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  const raw = String(req.headers.cookie || '');
  if (!raw) {
    return {};
  }
  return raw.split(';').reduce((acc, item) => {
    const index = item.indexOf('=');
    if (index < 0) {
      return acc;
    }
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function buildSessionCookie(token, maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000)) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(String(token || ''))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Number(maxAgeSeconds) || 0)}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function toPublicUser(user) {
  if (!user) {
    return null;
  }
  const username = String(user.username || user.name || user.email || '').trim();
  return {
    id: String(user.id || ''),
    email: String(user.email || ''),
    username,
    name: String(user.name || ''),
    createdAt: Number(user.createdAt || user.created_at || Date.now()),
    updatedAt: Number(user.updatedAt || user.updated_at || Date.now()),
  };
}

function isValidUsername(username) {
  const value = String(username || '').trim();
  return value.length > 0;
}

function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', (error) => reject(error));
  });
}

function getAuthenticatedSession(req) {
  const cookies = parseCookies(req);
  const token = String(cookies[SESSION_COOKIE_NAME] || '').trim();
  if (!token) {
    return null;
  }
  return sqlStore.findSessionUser(token);
}

function requireAuth(req, res) {
  const session = getAuthenticatedSession(req);
  if (!session?.user?.id) {
    sendJSON(res, 401, { error: 'Unauthorized' });
    return null;
  }
  return session;
}

async function handleAuthRegister(req, res) {
  let payload = {};
  try {
    payload = await readJSONBody(req);
  } catch (error) {
    return sendJSON(res, 400, { error: error.message || 'Invalid JSON payload' });
  }

  const rawUsername = String(payload.username || payload.email || '').trim();
  const username = normalizeIdentifier(rawUsername);
  const password = String(payload.password || '');

  if (!isValidUsername(rawUsername)) {
    return sendJSON(res, 400, { error: 'Username is required' });
  }
  if (password.length < 6) {
    return sendJSON(res, 400, { error: 'Password must be at least 6 characters' });
  }
  if (sqlStore.getUserByEmail(username)) {
    return sendJSON(res, 409, { error: 'Username already registered' });
  }

  try {
    const passwordHash = hashPassword(password);
    const user = sqlStore.createUser({ email: username, name: rawUsername, passwordHash });
    const session = sqlStore.createSession(user.id, SESSION_TTL_MS);
    const cookie = buildSessionCookie(session.token);
    return sendJSON(res, 200, {
      ok: true,
      authenticated: true,
      user: toPublicUser(user),
    }, { 'Set-Cookie': cookie });
  } catch (error) {
    console.error('[Auth] register failed:', error);
    return sendJSON(res, 500, { error: 'Failed to register' });
  }
}

async function handleAuthLogin(req, res) {
  let payload = {};
  try {
    payload = await readJSONBody(req);
  } catch (error) {
    return sendJSON(res, 400, { error: error.message || 'Invalid JSON payload' });
  }

  const rawUsername = String(payload.username || payload.email || '').trim();
  const username = normalizeIdentifier(rawUsername);
  const password = String(payload.password || '');
  if (!isValidUsername(rawUsername) || !password) {
    return sendJSON(res, 400, { error: 'Missing username or password' });
  }

  const userRow = sqlStore.getUserByEmail(username);
  if (!userRow || !verifyPassword(password, userRow.password_hash)) {
    return sendJSON(res, 401, { error: 'Invalid username or password' });
  }

  try {
    const session = sqlStore.createSession(userRow.id, SESSION_TTL_MS);
    const cookie = buildSessionCookie(session.token);
    return sendJSON(res, 200, {
      ok: true,
      authenticated: true,
      user: toPublicUser(userRow),
    }, { 'Set-Cookie': cookie });
  } catch (error) {
    console.error('[Auth] login failed:', error);
    return sendJSON(res, 500, { error: 'Failed to login' });
  }
}

function handleAuthLogout(req, res) {
  const cookies = parseCookies(req);
  const token = String(cookies[SESSION_COOKIE_NAME] || '').trim();
  if (token) {
    sqlStore.revokeSession(token);
  }
  return sendJSON(res, 200, {
    ok: true,
    authenticated: false,
  }, { 'Set-Cookie': buildSessionCookie('', 0) });
}

function handleAuthMe(req, res) {
  const session = getAuthenticatedSession(req);
  if (!session?.user) {
    return sendJSON(res, 200, {
      authenticated: false,
      user: null,
    });
  }
  return sendJSON(res, 200, {
    authenticated: true,
    user: toPublicUser(session.user),
  });
}

function handleSyncBootstrap(req, res) {
  const session = requireAuth(req, res);
  if (!session) {
    return;
  }
  const logs = sqlStore.getAllArticleLogs(session.user.id);
  return sendJSON(res, 200, { logs });
}

function handleSyncArticleLogGet(req, res, url) {
  const session = requireAuth(req, res);
  if (!session) {
    return;
  }
  const articleId = String(url.searchParams.get('articleId') || '').trim();
  if (!articleId) {
    return sendJSON(res, 400, { error: 'Missing articleId' });
  }
  const row = sqlStore.getArticleLog(session.user.id, articleId);
  return sendJSON(res, 200, {
    articleId,
    savedWordLog: row?.savedWordLog || {},
    conversationLog: row?.conversationLog || {},
    updatedAt: row?.updatedAt || 0,
  });
}

async function handleSyncArticleLogSave(req, res) {
  const session = requireAuth(req, res);
  if (!session) {
    return;
  }

  let payload = {};
  try {
    payload = await readJSONBody(req);
  } catch (error) {
    return sendJSON(res, 400, { error: error.message || 'Invalid JSON payload' });
  }

  const articleId = String(payload.articleId || '').trim();
  if (!articleId) {
    return sendJSON(res, 400, { error: 'Missing articleId' });
  }

  const savedWordLog = payload.savedWordLog && typeof payload.savedWordLog === 'object'
    ? payload.savedWordLog
    : {};
  const conversationLog = payload.conversationLog && typeof payload.conversationLog === 'object'
    ? payload.conversationLog
    : {};

  try {
    sqlStore.upsertArticleLog(session.user.id, articleId, savedWordLog, conversationLog);
    return sendJSON(res, 200, { ok: true, articleId });
  } catch (error) {
    console.error('[Sync] save article log failed:', error);
    return sendJSON(res, 500, { error: 'Failed to save article log' });
  }
}

function serveStatic(requestPath, res, headOnly = false) {
  let resolvedPath = requestPath === '/' ? '/index.html' : requestPath;
  resolvedPath = path.normalize(resolvedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(rootDir, resolvedPath);

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    if (headOnly) {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

function handleAssistantProxy(req, res) {
  if (!DEEPSEEK_API_KEY) {
    return sendJSON(res, 500, { error: 'Missing DEEPSEEK_API_KEY in .env' });
  }
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', async () => {
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
      return sendJSON(res, 400, { error: 'Invalid JSON payload' });
    }

    const { model = 'deepseek-chat', messages = [], temperature = 0.7 } = payload;
    const upstreamUrl = `${DEEPSEEK_BASE_URL}/v1/chat/completions`;

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({ model, messages, temperature }),
      });
      const text = await upstreamRes.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (error) {
        json = { raw: text };
      }

      if (!upstreamRes.ok) {
        return sendJSON(res, upstreamRes.status, { error: 'Upstream error', detail: json });
      }

      const reply = json?.choices?.[0]?.message?.content ?? '';
      return sendJSON(res, 200, { reply, upstream: json });
    } catch (error) {
      console.error('[Server] DeepSeek request failed:', error);
      return sendJSON(res, 502, { error: 'Request to DeepSeek failed' });
    }
  });
}

function handleYoudaoProxy(req, res) {
  if (!YOUDAO_API_ID || !YOUDAO_API_KEY) {
    return sendJSON(res, 500, { error: 'Missing YOUDAO_API_ID or YOUDAO_API_KEY in .env' });
  }
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', async () => {
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
      return sendJSON(res, 400, { error: 'Invalid JSON payload' });
    }
    const q = String(payload.q || '').trim();
    const from = payload.from || 'auto';
    const to = payload.to || 'zh-CHS';
    if (!q) {
      return sendJSON(res, 400, { error: 'Missing q' });
    }
    const salt = String(Date.now());
    const curtime = String(Math.floor(Date.now() / 1000));
    const signStr = `${YOUDAO_API_ID}${truncateQuery(q)}${salt}${curtime}${YOUDAO_API_KEY}`;
    const sign = crypto.createHash('sha256').update(signStr).digest('hex');

    const params = new URLSearchParams({
      q,
      from,
      to,
      appKey: YOUDAO_API_ID,
      salt,
      sign,
      signType: 'v3',
      curtime,
    });

    try {
      const upstreamRes = await fetch(YOUDAO_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const text = await upstreamRes.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (error) {
        json = { raw: text };
      }

      if (!upstreamRes.ok || json.errorCode !== '0') {
        return sendJSON(res, upstreamRes.status || 500, { error: 'Upstream error', detail: json });
      }

      const basic = json.basic || {};
      const result = {
        query: json.query,
        l: json.l || '',
        translation: json.translation || [],
        phonetic: basic['us-phonetic'] || basic['uk-phonetic'] || basic.phonetic || '',
        explains: basic.explains || [],
        web: json.web || [],
        speakUrl: json.speakUrl || '',
        tSpeakUrl: json.tSpeakUrl || '',
      };

      return sendJSON(res, 200, result);
    } catch (error) {
      console.error('[Server] Youdao request failed:', error);
      return sendJSON(res, 502, { error: 'Request to Youdao failed' });
    }
  });
}

function handleTranslateProxy(req, res) {
  if (!GROQ_API_KEY && !DEEPSEEK_API_KEY) {
    return sendJSON(res, 500, { error: 'Missing GROQ_API_KEY and DEEPSEEK_API_KEY in .env' });
  }

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', async () => {
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
      return sendJSON(res, 400, { error: 'Invalid JSON payload' });
    }

    const text = String(payload.text || payload.q || '').trim();
    const targetLanguage = String(payload.targetLanguage || 'zh').trim().toLowerCase();
    const sourceLanguage = String(payload.sourceLanguage || 'auto').trim().toLowerCase();

    if (!text) {
      return sendJSON(res, 400, { error: 'Missing text' });
    }

    try {
      const normalizedTarget = ['zh', 'en', 'ja'].includes(targetLanguage) ? targetLanguage : 'zh';
      const translation = await requestModelTranslationText(text, normalizedTarget, sourceLanguage);
      if (!translation) {
        return sendJSON(res, 502, { error: 'Translation upstream unavailable' });
      }
      return sendJSON(res, 200, { translation });
    } catch (error) {
      console.error('[Server] Translate proxy failed:', error);
      return sendJSON(res, 502, { error: 'Request to translation provider failed' });
    }
  });
}

function handleJapaneseReadingProxy(req, res) {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', async () => {
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
      return sendJSON(res, 400, { error: 'Invalid JSON payload' });
    }

    const q = String(payload.q || '').trim();
    if (!q) {
      return sendJSON(res, 400, { error: 'Missing q' });
    }

    try {
      const tokenizer = await getJapaneseTokenizer();
      const tokens = tokenizer.tokenize(q);
      const reading = buildJapaneseReading(tokens, q);
      return sendJSON(res, 200, {
        query: q,
        hiragana: reading.hiragana,
        katakana: reading.katakana,
      });
    } catch (error) {
      console.error('[Server] Japanese reading failed:', error);
      return sendJSON(res, 502, { error: 'Request to Japanese reading service failed' });
    }
  });
}

function handleJapanesePhraseProxy(req, res) {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', async () => {
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
      return sendJSON(res, 400, { error: 'Invalid JSON payload' });
    }

    const q = String(payload.q || '').trim();
    const clickedStart = Number(payload.clickedStart);
    const clickedEnd = Number(payload.clickedEnd);

    if (!q) {
      return sendJSON(res, 400, { error: 'Missing q' });
    }
    if (!Number.isFinite(clickedStart) || !Number.isFinite(clickedEnd)) {
      return sendJSON(res, 400, { error: 'Missing clickedStart/clickedEnd' });
    }

    try {
      const tokenizer = await getJapaneseTokenizer();
      const tokens = tokenizer.tokenize(q);
      const clickedIndex = findClickedTokenIndex(tokens, clickedStart, clickedEnd);
      if (clickedIndex < 0) {
        const fallbackReading = buildJapaneseReading(tokens, q);
        return sendJSON(res, 200, {
          query: q,
          surface: q,
          baseForm: q,
          hiragana: fallbackReading.hiragana,
          katakana: fallbackReading.katakana,
        });
      }

      const phraseRange = detectJapaneseVerbPhrase(tokens, clickedIndex);
      const selected = tokens.slice(phraseRange.start, phraseRange.end + 1);
      const surface = selected.map((item) => String(item?.surface_form || '')).join('') || q;
      const reading = buildJapaneseReading(selected, surface);
      const baseForm = buildJapanesePhraseBaseForm(selected, surface, tokenizer);

      return sendJSON(res, 200, {
        query: q,
        surface,
        baseForm,
        hiragana: reading.hiragana,
        katakana: reading.katakana,
      });
    } catch (error) {
      console.error('[Server] Japanese phrase failed:', error);
      return sendJSON(res, 502, { error: 'Request to Japanese phrase service failed' });
    }
  });
}

function handleSelectionProxy(req, res, { forcedLanguage = '' } = {}) {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', async () => {
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
      return sendJSON(res, 400, { error: 'Invalid JSON payload' });
    }

    const q = normalizeSelectionText(payload.q || payload.text || '');
    const context = String(payload.context || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    const requestedLanguage = String(payload.language || forcedLanguage || '').trim().toLowerCase();
    const language = ['ja', 'en', 'zh'].includes(requestedLanguage)
      ? requestedLanguage
      : detectSelectionLanguage(q);

    if (!q) {
      return sendJSON(res, 400, { error: 'Missing q' });
    }
    if (!['ja', 'en', 'zh'].includes(language)) {
      return sendJSON(res, 400, { error: 'Unsupported language, expected ja, en or zh' });
    }

    try {
      const tokenizer = language === 'ja' ? await getJapaneseTokenizer() : null;
      const local = language === 'ja'
        ? analyzeJapaneseSelectionLocally(q, tokenizer)
        : (language === 'en' ? analyzeEnglishSelectionLocally(q) : analyzeChineseSelectionLocally(q));
      const mode = isSingleWordSelection(q, language) ? 'word' : 'phrase';
      let result = {
        query: q,
        mode,
        language,
        surface: local.surface,
        baseForm: local.baseForm,
        hiragana: local.hiragana,
        katakana: local.katakana,
        phonetics: local.phonetics || '',
        translations: {
          zh: '',
          en: '',
          ja: '',
        },
        confidence: local.confidence,
        source: 'local',
      };

      if (mode !== 'word' && language !== 'zh') {
        const llmSelection = await requestSelectionByLLM(q, context, language, local);
        if (llmSelection) {
          result = mergeSelectionResult(result, llmSelection);
        }
      }

      if (!result.translations.zh) {
        result.translations.zh = await requestModelTranslationText(result.surface || q, 'zh', language);
      }
      if (!result.translations.en) {
        result.translations.en = await requestModelTranslationText(result.surface || q, 'en', language);
      }
      if (!result.translations.ja) {
        result.translations.ja = await requestModelTranslationText(result.surface || q, 'ja', language);
      }

      return sendJSON(res, 200, result);
    } catch (error) {
      console.error('[Server] Selection failed:', error);
      return sendJSON(res, 502, { error: 'Request to selection service failed' });
    }
  });
}

function normalizeSelectionText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.slice(0, 300);
}

function detectSelectionLanguage(text) {
  const q = String(text || '').trim();
  if (!q) {
    return '';
  }
  if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(q)) {
    return 'ja';
  }
  if (/[A-Za-z]/.test(q)) {
    return 'en';
  }
  if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(q)) {
    return 'zh';
  }
  return '';
}

function isSingleWordSelection(text, language = 'ja') {
  const q = normalizeSelectionText(text);
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
  if (language === 'zh') {
    if (/\s/.test(q)) {
      return false;
    }
    if (!/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(q)) {
      return false;
    }
    if (/[。．.!！?？,，、;；:\-–—]/.test(q)) {
      return false;
    }
    return q.length <= 6;
  }
  return false;
}

function analyzeJapaneseSelectionLocally(q, tokenizer) {
  const tokens = tokenizer.tokenize(q);
  const surface = tokens.map((item) => String(item?.surface_form || '')).join('') || q;
  const reading = buildJapaneseReading(tokens, surface);
  const baseForm = buildJapanesePhraseBaseForm(tokens, surface, tokenizer) || surface;

  let confidence = 0.62;
  if (tokens.length === 1) {
    confidence = 0.92;
  } else if (q.length <= 16 && !/[。．.!！?？]/.test(q)) {
    confidence = 0.82;
  } else if (q.length <= 40) {
    confidence = 0.72;
  }
  if (/(性|化|力|感|度|率|的|的に)$/.test(surface)) {
    confidence = Math.min(0.95, confidence + 0.08);
  }

  return {
    surface,
    baseForm,
    hiragana: reading.hiragana,
    katakana: reading.katakana,
    phonetics: '',
    confidence,
  };
}

function analyzeEnglishSelectionLocally(q) {
  const surface = normalizeSelectionText(q);
  const normalized = surface.replace(/\s+/g, ' ').trim();
  const isSingleWord = isSingleWordSelection(normalized, 'en');
  const baseForm = isSingleWord
    ? inferEnglishBaseForm(normalized.toLowerCase())
    : normalized;

  let confidence = 0.65;
  if (isSingleWord) {
    confidence = 0.92;
  } else if (normalized.length <= 60) {
    confidence = 0.8;
  } else if (normalized.length <= 180) {
    confidence = 0.72;
  }

  return {
    surface: normalized,
    baseForm,
    hiragana: '',
    katakana: '',
    phonetics: '',
    confidence,
  };
}

function analyzeChineseSelectionLocally(q) {
  const surface = normalizeSelectionText(q);
  const compact = surface.replace(/\s+/g, '');
  const isSingleWord = isSingleWordSelection(compact, 'zh');
  let confidence = 0.72;
  if (isSingleWord) {
    confidence = 0.9;
  } else if (compact.length <= 20) {
    confidence = 0.82;
  } else if (compact.length <= 120) {
    confidence = 0.74;
  }

  return {
    surface,
    baseForm: compact || surface,
    hiragana: '',
    katakana: '',
    phonetics: '',
    confidence,
  };
}

function inferEnglishBaseForm(word) {
  const w = String(word || '').trim().toLowerCase();
  if (!w) {
    return '';
  }
  if (w.endsWith("'s") && w.length > 2) {
    return w.slice(0, -2);
  }
  if (w.endsWith('ies') && w.length > 4) {
    return `${w.slice(0, -3)}y`;
  }
  if (w.endsWith('ing') && w.length > 5) {
    const stem = w.slice(0, -3);
    if (/(.)\1$/.test(stem)) {
      return stem.slice(0, -1);
    }
    return stem;
  }
  if (w.endsWith('ed') && w.length > 4) {
    const stem = w.slice(0, -2);
    if (/(.)\1$/.test(stem)) {
      return stem.slice(0, -1);
    }
    return stem;
  }
  if (w.endsWith('es') && /(ses|xes|zes|ches|shes)$/.test(w) && w.length > 4) {
    return w.slice(0, -2);
  }
  if (w.endsWith('s') && w.length > 3) {
    return w.slice(0, -1);
  }
  return w;
}

async function requestSelectionByLLM(q, context = '', language = 'ja', local = null) {
  const deepSeekResult = await requestDeepSeekSelection(q, context, language, local);
  if (deepSeekResult) {
    return deepSeekResult;
  }
  return requestGroqSelection(q, context, language, local);
}

async function requestGroqSelection(q, context = '', language = 'ja', local = null) {
  if (!GROQ_API_KEY) {
    return null;
  }

  const messages = buildSelectionModelMessages(q, context, language, local);
  const upstreamUrl = `${GROQ_BASE_URL}/chat/completions`;
  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: SELECTION_GROQ_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 280,
      }),
    });

    const text = await upstreamRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (error) {
      json = { raw: text };
    }

    if (!upstreamRes.ok) {
      console.warn('[Server] Groq selection upstream error:', json);
      return null;
    }

    const reply = json?.choices?.[0]?.message?.content ?? '';
    return normalizeSelectionModelReply(reply, language, 'groq');
  } catch (error) {
    console.warn('[Server] Groq selection request failed:', error);
    return null;
  }
}

async function requestDeepSeekSelection(q, context = '', language = 'ja', local = null) {
  if (!DEEPSEEK_API_KEY) {
    return null;
  }

  const messages = buildSelectionModelMessages(q, context, language, local);
  const upstreamUrl = `${DEEPSEEK_BASE_URL}/v1/chat/completions`;
  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_SELECTION_MODEL,
        messages,
        temperature: 0.2,
      }),
    });

    const text = await upstreamRes.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (error) {
      json = { raw: text };
    }

    if (!upstreamRes.ok) {
      console.warn('[Server] DeepSeek selection upstream error:', json);
      return null;
    }

    const reply = json?.choices?.[0]?.message?.content ?? '';
    return normalizeSelectionModelReply(reply, language, 'deepseek');
  } catch (error) {
    console.warn('[Server] DeepSeek selection request failed:', error);
    return null;
  }
}

function buildSelectionModelMessages(q, context = '', language = 'ja', local = null) {
  const hint = local
    ? `本地候选：${JSON.stringify({
        surface: local.surface,
        baseForm: local.baseForm,
        hiragana: local.hiragana,
        phonetics: local.phonetics || '',
      })}`
    : '';

  return [
    {
      role: 'system',
      content: [
        language === 'ja' ? '你是日语拖选识别引擎。' : '你是英语拖选识别引擎。',
        '只输出 JSON，不要输出解释和 markdown。',
        'JSON 结构必须是：',
        '{"surface":"...","baseForm":"...","hiragana":"...","phonetics":"...","translations":{"zh":"...","en":"...","ja":"..."},"confidence":0.0}',
        language === 'ja'
          ? '要求：surface 为完整词组/短语；baseForm 是词典原型；hiragana 仅平假名；zh/en/ja 要简洁自然。'
          : '要求：surface 为完整词组/短语；baseForm 为词形还原后的基础形式；phonetics 可填写简洁音标；zh/en/ja 要简洁自然。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `拖选文本：${q}\n上下文：${context || '（无）'}\n${hint}`,
    },
  ];
}

function normalizeSelectionModelReply(reply, language = 'ja', source = 'model') {
  const parsed = parseJSONFromText(reply);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const translations = parsed.translations && typeof parsed.translations === 'object'
    ? parsed.translations
    : {};
  const confidence = Number(parsed.confidence);

  return {
    language,
    surface: String(parsed.surface || '').trim(),
    baseForm: String(parsed.baseForm || '').trim(),
    hiragana: katakanaToHiragana(String(parsed.hiragana || '')).trim(),
    phonetics: String(parsed.phonetics || '').trim(),
    translations: {
      zh: String(translations.zh || parsed.zh || '').trim(),
      en: String(translations.en || parsed.en || '').trim(),
      ja: String(translations.ja || parsed.ja || '').trim(),
    },
    confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0,
    source,
  };
}

function parseJSONFromText(rawText) {
  const raw = String(rawText || '').trim();
  if (!raw) {
    return null;
  }

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

function mergeSelectionResult(base, extra) {
  return {
    ...base,
    language: extra.language || base.language,
    surface: extra.surface || base.surface,
    baseForm: extra.baseForm || base.baseForm,
    hiragana: extra.hiragana || base.hiragana,
    katakana: extra.katakana || base.katakana,
    phonetics: extra.phonetics || base.phonetics || '',
    translations: {
      zh: extra?.translations?.zh || base?.translations?.zh || '',
      en: extra?.translations?.en || base?.translations?.en || '',
      ja: extra?.translations?.ja || base?.translations?.ja || '',
    },
    confidence: Number.isFinite(extra.confidence) && extra.confidence > 0
      ? extra.confidence
      : base.confidence,
    source: extra.source || base.source || 'local',
  };
}

async function requestModelTranslationText(text, targetLanguage = 'zh', sourceLanguage = 'ja') {
  const q = String(text || '').trim();
  if (!q) {
    return '';
  }
  const normalizedTarget = String(targetLanguage || 'zh').trim().toLowerCase();
  const normalizedSource = String(sourceLanguage || '').trim().toLowerCase();
  if (normalizedSource && normalizedSource === normalizedTarget) {
    return q;
  }
  const deepSeekText = await requestDeepSeekTranslationText(text, targetLanguage, sourceLanguage);
  if (deepSeekText) {
    return deepSeekText;
  }
  return requestGroqTranslationText(text, targetLanguage, sourceLanguage);
}

async function requestGroqTranslationText(text, targetLanguage = 'zh', sourceLanguage = 'ja') {
  if (!GROQ_API_KEY) {
    return '';
  }
  const q = String(text || '').trim();
  if (!q) {
    return '';
  }

  const clippedText = q.length > 180 ? `${q.slice(0, 180)}...` : q;
  const normalizedTarget = String(targetLanguage || 'zh').trim().toLowerCase();
  const isEnglish = normalizedTarget === 'en';
  const isJapanese = normalizedTarget === 'ja';
  const sourceLabel = sourceLanguage === 'ja' ? 'Japanese' : (sourceLanguage === 'en' ? 'English' : sourceLanguage);
  let systemPrompt;
  let userPrompt;
  if (isEnglish) {
    systemPrompt = `You are a concise translator. Translate ${sourceLabel} text into natural English in one sentence.`;
    userPrompt = `Translate to English: ${clippedText}`;
  } else if (isJapanese) {
    const sourceLabelJa = sourceLanguage === 'ja' ? '日本語' : (sourceLanguage === 'en' ? '英語' : sourceLanguage);
    systemPrompt = `あなたは簡潔な翻訳アシスタントです。${sourceLabelJa}の内容を自然な日本語に翻訳し、訳文のみを返してください。`;
    userPrompt = `日本語に翻訳してください：${clippedText}`;
  } else {
    systemPrompt = `你是简洁的翻译助手。请把${sourceLanguage === 'ja' ? '日语' : (sourceLanguage === 'en' ? '英语' : sourceLanguage)}内容翻译成自然中文，只输出译文。`;
    userPrompt = `请翻译为中文：${clippedText}`;
  }

  const upstreamUrl = `${GROQ_BASE_URL}/chat/completions`;
  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 180,
      }),
    });

    const textBody = await upstreamRes.text();
    let json;
    try {
      json = JSON.parse(textBody);
    } catch (error) {
      json = { raw: textBody };
    }

    if (!upstreamRes.ok) {
      console.warn('[Server] Groq fallback translation upstream error:', json);
      return '';
    }

    return String(json?.choices?.[0]?.message?.content || '').trim();
  } catch (error) {
    console.warn('[Server] Groq fallback translation request failed:', error);
    return '';
  }
}

async function requestDeepSeekTranslationText(text, targetLanguage = 'zh', sourceLanguage = 'ja') {
  if (!DEEPSEEK_API_KEY) {
    return '';
  }

  const q = String(text || '').trim();
  if (!q) {
    return '';
  }

  const clippedText = q.length > 220 ? `${q.slice(0, 220)}...` : q;
  const normalizedTarget = String(targetLanguage || 'zh').trim().toLowerCase();
  const isEnglish = normalizedTarget === 'en';
  const isJapanese = normalizedTarget === 'ja';
  const sourceLabel = sourceLanguage === 'ja' ? 'Japanese' : (sourceLanguage === 'en' ? 'English' : sourceLanguage);
  let systemPrompt;
  let userPrompt;
  if (isEnglish) {
    systemPrompt = `You are a concise translator. Translate ${sourceLabel} text into natural English in one sentence.`;
    userPrompt = `Translate to English: ${clippedText}`;
  } else if (isJapanese) {
    const sourceLabelJa = sourceLanguage === 'ja' ? '日本語' : (sourceLanguage === 'en' ? '英語' : sourceLanguage);
    systemPrompt = `あなたは簡潔な翻訳アシスタントです。${sourceLabelJa}の内容を自然な日本語に翻訳し、訳文のみを返してください。`;
    userPrompt = `日本語に翻訳してください：${clippedText}`;
  } else {
    systemPrompt = `你是简洁的翻译助手。请把${sourceLanguage === 'ja' ? '日语' : (sourceLanguage === 'en' ? '英语' : sourceLanguage)}内容翻译成自然中文，只输出译文。`;
    userPrompt = `请翻译为中文：${clippedText}`;
  }

  const upstreamUrl = `${DEEPSEEK_BASE_URL}/v1/chat/completions`;
  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_SELECTION_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    const textBody = await upstreamRes.text();
    let json;
    try {
      json = JSON.parse(textBody);
    } catch (error) {
      json = { raw: textBody };
    }

    if (!upstreamRes.ok) {
      console.warn('[Server] DeepSeek translation upstream error:', json);
      return '';
    }

    return String(json?.choices?.[0]?.message?.content || '').trim();
  } catch (error) {
    console.warn('[Server] DeepSeek translation request failed:', error);
    return '';
  }
}

function getJapaneseTokenizer() {
  if (japaneseTokenizerPromise) {
    return japaneseTokenizerPromise;
  }
  japaneseTokenizerPromise = new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: KUROMOJI_DICT_PATH }).build((error, tokenizer) => {
      if (error) {
        japaneseTokenizerPromise = null;
        reject(error);
        return;
      }
      resolve(tokenizer);
    });
  });
  return japaneseTokenizerPromise;
}

function getTokenStart(token) {
  return Math.max(Number(token?.word_position || 1) - 1, 0);
}

function getTokenEnd(token) {
  const start = getTokenStart(token);
  const surface = String(token?.surface_form || '');
  return start + surface.length;
}

function findClickedTokenIndex(tokens, clickedStart, clickedEnd) {
  const start = Math.max(0, Math.floor(clickedStart));
  const end = Math.max(start + 1, Math.floor(clickedEnd));
  return tokens.findIndex((token) => {
    const tokenStart = getTokenStart(token);
    const tokenEnd = getTokenEnd(token);
    return tokenEnd > start && tokenStart < end;
  });
}

function isSahenNoun(token) {
  return token?.pos === '名詞' && token?.pos_detail_1 === 'サ変接続';
}

function isSuruToken(token) {
  const surface = String(token?.surface_form || '');
  const base = String(token?.basic_form || '');
  if (base === 'する' || base === 'できる') {
    return true;
  }
  return ['する', 'し', 'して', 'した', 'しろ', 'せよ', 'せ', 'され', 'させ', 'できる', 'でき', 'できて', 'できた'].includes(surface);
}

function isVerbPhraseStart(tokens, index) {
  const current = tokens[index];
  const next = tokens[index + 1];
  if (!current) {
    return false;
  }
  if (current.pos === '動詞') {
    return true;
  }
  return isSahenNoun(current) && !!next && isSuruToken(next);
}

function canJoinVerbPhraseToken(token, previousToken) {
  if (!token) {
    return false;
  }

  const surface = String(token.surface_form || '');
  const base = String(token.basic_form || '');
  const prevSurface = String(previousToken?.surface_form || '');

  if (token.pos === '助動詞') {
    return true;
  }
  if (token.pos === '助詞' && ['て', 'で'].includes(surface)) {
    return true;
  }
  if (token.pos === '動詞') {
    if (token.pos_detail_1 === '接尾') {
      return true;
    }
    if (token.pos_detail_1 === '非自立') {
      return true;
    }
    if (['いる', 'ある', 'いく', 'くる', 'おく', 'みる', 'しまう'].includes(base)) {
      return true;
    }
    if (isSuruToken(token)) {
      return true;
    }
    if (['て', 'で'].includes(prevSurface)) {
      return true;
    }
  }
  return false;
}

function detectJapaneseVerbPhrase(tokens, clickedIndex) {
  const ranges = [];

  for (let i = 0; i < tokens.length; i += 1) {
    if (!isVerbPhraseStart(tokens, i)) {
      continue;
    }
    let end = i;
    while (end + 1 < tokens.length && canJoinVerbPhraseToken(tokens[end + 1], tokens[end])) {
      end += 1;
    }
    ranges.push({ start: i, end });
  }

  const containing = ranges
    .filter((range) => range.start <= clickedIndex && clickedIndex <= range.end)
    .sort((a, b) => (b.end - b.start) - (a.end - a.start));

  if (containing.length) {
    return containing[0];
  }
  return { start: clickedIndex, end: clickedIndex };
}

function buildJapanesePhraseBaseForm(tokens, fallbackSurface = '', tokenizer = null) {
  if (!tokens.length) {
    return fallbackSurface;
  }

  const first = tokens[0];
  if (isSahenNoun(first) && tokens.slice(1).some((item) => isSuruToken(item))) {
    return `${String(first.surface_form || '').trim()}する`;
  }

  const firstVerb = tokens.find((item) => item?.pos === '動詞');
  const base = String(firstVerb?.basic_form || '').trim();
  if (base && base !== '*') {
    return normalizeJapaneseVerbBase(base, tokenizer);
  }

  return fallbackSurface || tokens.map((item) => String(item?.surface_form || '')).join('');
}

function normalizeJapaneseVerbBase(base, tokenizer = null) {
  const clean = String(base || '').trim();
  if (!clean) {
    return '';
  }

  const godanEToU = {
    け: 'く',
    げ: 'ぐ',
    せ: 'す',
    て: 'つ',
    ね: 'ぬ',
    べ: 'ぶ',
    め: 'む',
    れ: 'る',
    え: 'う',
  };

  const match = clean.match(/^(.*)([けげせてねべめれえ])る$/);
  if (match) {
    const candidate = `${match[1]}${godanEToU[match[2]]}`;
    if (isValidJapaneseVerbBase(candidate, tokenizer)) {
      return candidate;
    }
  }

  return clean;
}

function isValidJapaneseVerbBase(candidate, tokenizer = null) {
  const clean = String(candidate || '').trim();
  if (!clean || !tokenizer) {
    return false;
  }
  const tokens = tokenizer.tokenize(clean);
  if (!tokens.length) {
    return false;
  }
  const head = tokens[0];
  return head?.pos === '動詞' && (head?.basic_form === clean || head?.surface_form === clean);
}

function katakanaToHiragana(text = '') {
  return String(text || '').replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function hiraganaToKatakana(text = '') {
  return String(text || '').replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

function buildJapaneseReading(tokens = [], fallback = '') {
  const hiraParts = [];
  const kataParts = [];

  tokens.forEach((token) => {
    const surface = String(token?.surface_form || '');
    const reading = String(token?.reading || '').trim();
    if (reading && reading !== '*') {
      kataParts.push(reading);
      hiraParts.push(katakanaToHiragana(reading));
      return;
    }
    if (/^[\u3040-\u309fー]+$/.test(surface)) {
      hiraParts.push(surface);
      kataParts.push(hiraganaToKatakana(surface));
      return;
    }
    if (/^[\u30a0-\u30ffー]+$/.test(surface)) {
      kataParts.push(surface);
      hiraParts.push(katakanaToHiragana(surface));
      return;
    }
    hiraParts.push(surface);
    kataParts.push(surface);
  });

  const hiragana = hiraParts.join('').trim() || katakanaToHiragana(fallback);
  const katakana = kataParts.join('').trim() || hiraganaToKatakana(hiragana);
  return { hiragana, katakana };
}

function truncateQuery(q) {
  if (!q) return '';
  const len = q.length;
  if (len <= 20) {
    return q;
  }
  return `${q.slice(0, 10)}${len}${q.slice(-10)}`;
}
