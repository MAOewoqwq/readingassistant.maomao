import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';
import { hashToken, normalizeEmail } from './authUtil.js';

function toJSON(value) {
  return JSON.stringify(value && typeof value === 'object' ? value : {});
}

function parseJSON(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

export function createSQLStore(rootDir) {
  const dataDir = path.join(rootDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'reader-app.sqlite');
  const db = new DatabaseSync(dbPath);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS user_article_logs (
      user_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      saved_words_json TEXT NOT NULL DEFAULT '{}',
      conversation_logs_json TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, article_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_article_logs_user_updated
    ON user_article_logs(user_id, updated_at DESC);
  `);

  function cleanupExpiredSessions() {
    const now = Date.now();
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  }

  function createUser({ email, name = '', passwordHash }) {
    const normalizedEmail = normalizeEmail(email);
    const now = Date.now();
    const user = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: String(name || '').trim(),
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.email,
      user.name,
      user.passwordHash,
      user.createdAt,
      user.updatedAt,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  function getUserByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    return db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) || null;
  }

  function getUserById(userId) {
    if (!userId) {
      return null;
    }
    return db.prepare('SELECT * FROM users WHERE id = ?').get(String(userId)) || null;
  }

  function createSession(userId, ttlMs) {
    cleanupExpiredSessions();
    const now = Date.now();
    const expiresAt = now + Math.max(60_000, Number(ttlMs) || 0);
    const token = crypto.randomBytes(32).toString('base64url');
    const session = {
      id: crypto.randomUUID(),
      userId: String(userId),
      tokenHash: hashToken(token),
      expiresAt,
      createdAt: now,
    };
    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(session.id, session.userId, session.tokenHash, session.expiresAt, session.createdAt);
    return { token, expiresAt };
  }

  function revokeSession(token) {
    if (!token) {
      return;
    }
    const tokenHash = hashToken(token);
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }

  function findSessionUser(token) {
    if (!token) {
      return null;
    }
    cleanupExpiredSessions();
    const tokenHash = hashToken(token);
    const now = Date.now();
    const row = db.prepare(`
      SELECT s.id AS session_id, s.expires_at, u.id, u.email, u.name, u.created_at, u.updated_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?
      LIMIT 1
    `).get(tokenHash, now);
    if (!row) {
      return null;
    }
    return {
      sessionId: row.session_id,
      sessionExpiresAt: row.expires_at,
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    };
  }

  function upsertArticleLog(userId, articleId, savedWordLog, conversationLog) {
    const normalizedArticleId = String(articleId || '').trim();
    if (!userId || !normalizedArticleId) {
      return;
    }

    const now = Date.now();
    db.prepare(`
      INSERT INTO user_article_logs (
        user_id, article_id, saved_words_json, conversation_logs_json, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, article_id)
      DO UPDATE SET
        saved_words_json = excluded.saved_words_json,
        conversation_logs_json = excluded.conversation_logs_json,
        updated_at = excluded.updated_at
    `).run(
      String(userId),
      normalizedArticleId,
      toJSON(savedWordLog),
      toJSON(conversationLog),
      now,
    );
  }

  function getArticleLog(userId, articleId) {
    const normalizedArticleId = String(articleId || '').trim();
    if (!userId || !normalizedArticleId) {
      return null;
    }
    const row = db.prepare(`
      SELECT article_id, saved_words_json, conversation_logs_json, updated_at
      FROM user_article_logs
      WHERE user_id = ? AND article_id = ?
      LIMIT 1
    `).get(String(userId), normalizedArticleId);

    if (!row) {
      return null;
    }

    return {
      articleId: row.article_id,
      savedWordLog: parseJSON(row.saved_words_json),
      conversationLog: parseJSON(row.conversation_logs_json),
      updatedAt: row.updated_at,
    };
  }

  function getAllArticleLogs(userId) {
    if (!userId) {
      return {};
    }
    const rows = db.prepare(`
      SELECT article_id, saved_words_json, conversation_logs_json, updated_at
      FROM user_article_logs
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(String(userId));

    return rows.reduce((acc, row) => {
      acc[row.article_id] = {
        savedWordLog: parseJSON(row.saved_words_json),
        conversationLog: parseJSON(row.conversation_logs_json),
        updatedAt: row.updated_at,
      };
      return acc;
    }, {});
  }

  return {
    dbPath,
    createUser,
    getUserByEmail,
    getUserById,
    createSession,
    revokeSession,
    findSessionUser,
    upsertArticleLog,
    getArticleLog,
    getAllArticleLogs,
  };
}
