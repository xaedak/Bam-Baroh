import crypto from 'crypto';
import { db } from './db.js';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function isValidUsername(name) {
  return USERNAME_RE.test(String(name || ''));
}

export function isValidPassword(pw) {
  return typeof pw === 'string' && pw.length >= 6 && pw.length <= 100;
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function createAccount(username, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const stmt = db.prepare(
    `INSERT INTO accounts (username, password_hash, salt, xp, wins, matches, accuracy, speed, created_at)
     VALUES (?, ?, ?, 0, 0, 0, 0, 0, ?)`
  );
  stmt.run(username, hash, salt, Date.now());
}

export function verifyLogin(username, password) {
  const row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username);
  if (!row) return false;
  const attempt = hashPassword(password, row.salt);
  const a = Buffer.from(attempt, 'hex');
  const b = Buffer.from(row.password_hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function accountExists(username) {
  return !!db.prepare('SELECT 1 FROM accounts WHERE username = ?').get(username);
}

export function createSession(username) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)').run(
    token,
    username,
    Date.now()
  );
  return token;
}

export function getSessionUsername(token) {
  if (!token) return null;
  const row = db.prepare('SELECT username FROM sessions WHERE token = ?').get(token);
  return row?.username ?? null;
}

export function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/** Express middleware: reads Bearer token, attaches req.username if valid. */
export function authMiddleware(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  req.username = getSessionUsername(token);
  req.token = token;
  next();
}
