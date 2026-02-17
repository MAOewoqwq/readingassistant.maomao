import crypto from 'crypto';

export function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeEmail(email) {
  return normalizeIdentifier(email);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export function hashPassword(password) {
  const plain = String(password || '');
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

export function verifyPassword(password, storedHash) {
  const plain = String(password || '');
  const raw = String(storedHash || '');
  const [salt, encoded] = raw.split(':');
  if (!salt || !encoded) {
    return false;
  }
  const digest = crypto.scryptSync(plain, salt, 64).toString('hex');
  const expected = Buffer.from(encoded, 'hex');
  const actual = Buffer.from(digest, 'hex');
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}
